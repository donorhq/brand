/**
 * Whether the typeface can actually draw a word.
 *
 * This exists because of a mistake that cost nothing to make and would have shipped silently. The
 * TTF Google Fonts hands out through its older API is a Latin subset: 270 glyphs and no Cyrillic.
 * Drawing "Давалац" with it produced seven empty boxes, no warning, no error, and a brand that
 * looked finished until somebody opened the file.
 *
 * A browser cannot be asked this. It answers every "can you render this" question yes, because it
 * will happily fall back to another font, or to the font's own empty box, rather than fail. So the
 * font's character map is read here instead, which is the only place that actually knows.
 *
 * Only the lookup matters, not the glyphs: a code point either maps to something or it maps to
 * glyph zero, which is the box. Both subtable formats that modern fonts use are handled, format 12
 * for fonts with characters beyond the basic plane and format 4 for the rest.
 */
import { readFileSync } from "node:fs";

/**
 * The characters of `text` that the font at `path` has no glyph for.
 *
 * @param {string} text  the word to check, as it will be drawn
 * @param {string} path  a TrueType or OpenType file
 * @returns {string[]} the missing characters, each once, in the order they first appear
 */
export function missingGlyphs(text, path) {
  const font = readFileSync(path);
  const lookup = characterMap(font);
  const missing = [];
  for (const character of text) {
    const code = character.codePointAt(0);
    if (code === undefined || character === " ") continue;
    if (!lookup(code) && !missing.includes(character)) missing.push(character);
  }
  return missing;
}

/**
 * Finds the font's best Unicode character map and returns a lookup into it.
 *
 * @param {Buffer} font
 * @returns {(code: number) => boolean} whether a code point maps to a glyph
 */
function characterMap(font) {
  const tables = font.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < tables; i += 1) {
    const record = 12 + i * 16;
    if (font.toString("ascii", record, record + 4) === "cmap") cmap = font.readUInt32BE(record + 8);
  }
  if (!cmap) throw new Error("the font has no cmap table");

  /** Prefer a full Unicode subtable; fall back to the basic-plane one every font carries. */
  let best = 0;
  let bestFormat = -1;
  const subtables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i += 1) {
    const record = cmap + 4 + i * 8;
    const platform = font.readUInt16BE(record);
    const encoding = font.readUInt16BE(record + 2);
    const offset = cmap + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (unicode && (format === 12 || format === 4) && format > bestFormat) {
      best = offset;
      bestFormat = format;
    }
  }
  if (!best) throw new Error("the font has no Unicode character map");

  return bestFormat === 12 ? groups(font, best) : segments(font, best);
}

/** Format 12: a flat list of start, end and first glyph, three 32 bit numbers each. */
function groups(font, offset) {
  const count = font.readUInt32BE(offset + 12);
  const ranges = [];
  for (let i = 0; i < count; i += 1) {
    const at = offset + 16 + i * 12;
    ranges.push([font.readUInt32BE(at), font.readUInt32BE(at + 4), font.readUInt32BE(at + 8)]);
  }
  return (code) =>
    ranges.some(
      ([start, end, glyph]) => code >= start && code <= end && glyph + (code - start) > 0,
    );
}

/** Format 4: parallel arrays of segments, with an indirection that most segments do not use. */
function segments(font, offset) {
  const segments2 = font.readUInt16BE(offset + 6);
  const count = segments2 / 2;
  const endAt = offset + 14;
  const startAt = endAt + segments2 + 2;
  const deltaAt = startAt + segments2;
  const rangeAt = deltaAt + segments2;

  return (code) => {
    if (code > 0xffff) return false;
    for (let i = 0; i < count; i += 1) {
      if (font.readUInt16BE(endAt + i * 2) < code) continue;
      if (font.readUInt16BE(startAt + i * 2) > code) return false;
      const delta = font.readInt16BE(deltaAt + i * 2);
      const range = font.readUInt16BE(rangeAt + i * 2);
      if (range === 0) return ((code + delta) & 0xffff) !== 0;
      const at = rangeAt + i * 2 + range + (code - font.readUInt16BE(startAt + i * 2)) * 2;
      const glyph = font.readUInt16BE(at);
      return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
    }
    return false;
  };
}
