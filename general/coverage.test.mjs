/**
 * Tests for the glyph check.
 *
 * This is the one piece here with real logic rather than geometry, and it is the guard everything
 * else trusts: if it is wrong, a brand ships as a row of empty boxes exactly as it did before the
 * check existed. A broken guard fails the same way the bug it catches fails, which is silently.
 *
 * Both fonts this repository has ever used carry only a format 4 character map, so the format 12
 * branch would never run against them and could be wrong for years. The synthetic fonts below are
 * there for that reason: they are the smallest files the parser will accept, built to exercise one
 * branch each.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { missingGlyphs } from "./coverage.mjs";

const FONT = join(import.meta.dirname, "..", "fonts", "IBMPlexSans-SemiBold.ttf");

test("the shipped font covers Serbian in both scripts", () => {
  assert.deepEqual(missingGlyphs("АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ", FONT), []);
  assert.deepEqual(missingGlyphs("абвгдђежзијклљмнњопрстћуфхцчџш", FONT), []);
  assert.deepEqual(missingGlyphs("ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ", FONT), []);
  assert.deepEqual(missingGlyphs("abcčćdđefghijklmnoprsštuvzž", FONT), []);
  assert.deepEqual(missingGlyphs("Davalac Давалац DonorHQ", FONT), []);
});

test("the shipped font reports what it cannot draw", () => {
  assert.deepEqual(missingGlyphs("日本語", FONT), ["日", "本", "語"]);
  assert.deepEqual(missingGlyphs("Davalac 日", FONT), ["日"]);
});

test("a missing character is reported once, in the order it first appears", () => {
  assert.deepEqual(missingGlyphs("語日語本語", FONT), ["語", "日", "本"]);
});

test("spaces are not characters the font has to draw", () => {
  assert.deepEqual(missingGlyphs("   ", FONT), []);
});

test("a format 4 map is read", () => {
  const font = write(format4());
  assert.deepEqual(missingGlyphs("ABZ", font), []);
  assert.deepEqual(missingGlyphs("aAb", font), ["a", "b"]);
});

test("a format 12 map is read, which no font here has", () => {
  const font = write(format12());
  assert.deepEqual(missingGlyphs("ABZ", font), []);
  assert.deepEqual(missingGlyphs("aAb", font), ["a", "b"]);
});

test("a font with no character map is an error rather than a wrong answer", () => {
  assert.throws(() => missingGlyphs("A", write(Buffer.alloc(0))), /cmap/);
});

/**
 * Writes a font to a temporary file and returns its path.
 *
 * @param {Buffer} cmap  the cmap table's contents, or an empty buffer for a font without one
 * @returns {string}
 */
function write(cmap) {
  const tables = cmap.length > 0 ? 1 : 0;
  const header = Buffer.alloc(12 + tables * 16);
  header.writeUInt32BE(0x00010000, 0);
  header.writeUInt16BE(tables, 4);
  if (tables) {
    header.write("cmap", 12, "ascii");
    header.writeUInt32BE(header.length, 20);
    header.writeUInt32BE(cmap.length, 24);
  }
  const path = join(mkdtempSync(join(tmpdir(), "brand-")), "font.ttf");
  writeFileSync(path, Buffer.concat([header, cmap]));
  return path;
}

/** A cmap holding one format 4 subtable covering A to Z, and the terminator every font carries. */
function format4() {
  const segments = 2;
  const sub = Buffer.alloc(16 + segments * 8);
  sub.writeUInt16BE(4, 0);
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(segments * 2, 6);
  const end = 14;
  const start = end + segments * 2 + 2;
  const delta = start + segments * 2;
  sub.writeUInt16BE(0x5a, end);
  sub.writeUInt16BE(0xffff, end + 2);
  sub.writeUInt16BE(0x41, start);
  sub.writeUInt16BE(0xffff, start + 2);
  sub.writeInt16BE(-0x40, delta);
  sub.writeInt16BE(1, delta + 2);
  return wrap(sub);
}

/** The same coverage, expressed the way a font with characters beyond the basic plane would. */
function format12() {
  const sub = Buffer.alloc(16 + 12);
  sub.writeUInt16BE(12, 0);
  sub.writeUInt32BE(sub.length, 4);
  sub.writeUInt32BE(1, 12);
  sub.writeUInt32BE(0x41, 16);
  sub.writeUInt32BE(0x5a, 20);
  sub.writeUInt32BE(1, 24);
  return wrap(sub, 3, 10);
}

/** @param {Buffer} sub @param {number} platform @param {number} encoding @returns {Buffer} */
function wrap(sub, platform = 3, encoding = 1) {
  const head = Buffer.alloc(12);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(1, 2);
  head.writeUInt16BE(platform, 4);
  head.writeUInt16BE(encoding, 6);
  head.writeUInt32BE(head.length, 8);
  return Buffer.concat([head, sub]);
}
