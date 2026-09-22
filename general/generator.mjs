/**
 * The DonorHQ identity as drawing functions, so every brand under it comes out of one place.
 *
 * A country brand differs from the house brand in exactly one thing: the word it carries. The
 * drop, the red, the typeface and every measurement are shared, which is the point of a house
 * identity and the reason this file exists rather than a folder of hand-drawn files per country.
 * A country passes a string; it draws nothing itself, so it cannot ship a different red or a
 * differently sized logo by accident.
 *
 * The output is PNG, and the word is live text right up until the moment it is rasterised. That
 * ordering is the whole design. An SVG loaded through an <img> tag cannot fetch a webfont, and
 * IBM Plex Sans is installed on nobody's machine, so shipping SVG means either a wordmark that
 * renders as Segoe UI on Windows and DejaVu on Linux, or one frozen into outlines that no longer
 * has any connection to the word that produced it. Rasterising here, with the font loaded from
 * fonts/, means the string in a country's file really is what gets drawn: change it and the
 * pictures change.
 *
 * The banner is laid out in HTML rather than SVG because SVG has no layout. Centring a mark and a
 * word beside each other in SVG needs the word's width, which SVG cannot measure, so it used to
 * be estimated from per-glyph averages. Flexbox does it exactly and for nothing.
 *
 * The drop is not centred inside its own box: it runs from x 12 to x 52 and y 4 to y 60 in a 64
 * unit square, so it is taller than it is wide and sits off to one side. Anything centring it
 * must centre MARK.bounds and not the box, or it lands low and to the right.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { missingGlyphs } from "./coverage.mjs";
import { MARK, PALETTE, SIZES } from "./tokens.mjs";

export { MARK, PALETTE, SIZES } from "./tokens.mjs";

/**
 * `import.meta.dirname`, not a URL. Deriving a path from `import.meta.url` leaves it URL-encoded,
 * so a checkout in a folder with a space in its name looks for `dir%20with%20space/fonts/...` and
 * fails, and on Windows it also comes back with a leading slash before the drive letter.
 */
const here = import.meta.dirname;
/** The typeface, embedded rather than fetched, so a render does not depend on a network or a machine. */
const FONT_FILE = join(here, "..", "fonts", "IBMPlexSans-SemiBold.ttf");
const FONT = readFileSync(FONT_FILE).toString("base64");

/**
 * The drop as SVG markup, cropped to the drawn shape so it carries no padding. This is not written
 * to disk: it is what the pages below are built from, and everything shipped is rasterised. One
 * format means one thing to keep in step and one place to look.
 *
 * @param {object} o
 * @param {boolean} o.white   the white form, for dark or red backgrounds
 * @param {number} [o.height] a height in pixels; omitted, the SVG has no intrinsic size
 * @returns {string}
 */
export function markSvg({ white, height }) {
  const { bounds, path, highlight } = MARK;
  const width = height ? Math.round((bounds.width / bounds.height) * height) : undefined;
  const size = height ? ` width="${width}" height="${height}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">` +
    `<path d="${path}" fill="${white ? PALETTE.white : PALETTE.red}"/>` +
    `<circle cx="${highlight.cx}" cy="${highlight.cy}" r="${highlight.r}" fill="${white ? PALETTE.red : PALETTE.white}"/>` +
    `</svg>`
  );
}

/**
 * The square logo: the drop on a filled tile, covering enough of it to survive the 20 pixels an
 * avatar gets in a list. It carries no word, so it is the same picture for every brand.
 *
 * @param {object} o
 * @param {boolean} o.onRed  the red tile, which is the primary form
 * @returns {string} an HTML document
 */
function logoHtml({ onRed }) {
  const S = SIZES.logo;
  const height = Math.round(S * SIZES.logoCoverage);
  return page(
    `<div style="width:${S}px;height:${S}px;background:${onRed ? PALETTE.red : PALETTE.white};display:flex;align-items:center;justify-content:center">
       ${markSvg({ white: onRed, height })}
     </div>`,
  );
}

/**
 * The drop alone on nothing, at the shared mark size.
 *
 * @param {object} o
 * @param {boolean} o.white  the white form, for dark or red backgrounds
 * @returns {string} an HTML document
 */
function markHtml({ white }) {
  return page(markSvg({ white, height: SIZES.mark }));
}

/**
 * The banner: the drop and the word, centred together on a filled ground.
 *
 * Two grounds, because a reader's theme decides what sits behind it and a banner has to contrast
 * with the page rather than with itself. Neither is transparent: a transparent banner takes on
 * whatever is behind it, which is the one thing that cannot be predicted.
 *
 * The link card is the same drawing at the card's measurements, so a shared link shows the banner
 * a reader already knows rather than a second design.
 *
 * @param {object} o
 * @param {string} o.text    the brand's word, drawn as written
 * @param {boolean} o.onRed  the red ground, for light pages
 * @param {typeof SIZES.banner | typeof SIZES.card} [o.size]  the banner's measurements, or the card's
 * @returns {string} an HTML document
 */
function bannerHtml({ text, onRed, size = SIZES.banner }) {
  const b = size;
  return page(
    `<div style="width:${b.width}px;height:${b.height}px;background:${onRed ? PALETTE.red : PALETTE.white};display:flex;align-items:center;justify-content:center;gap:${b.gap}px">
       ${markSvg({ white: onRed, height: b.mark })}
       <span style="font:600 ${b.word}px Plex;line-height:1;color:${onRed ? PALETTE.white : PALETTE.ink}">${escape(text)}</span>
     </div>`,
  );
}

/** One colour on the specimen: the block, its name, its value and what it is for. */
function swatch(name, value, note, border) {
  return `
    <div style="flex:1">
      <div style="height:132px;background:${value};border-radius:6px${border ? `;box-shadow:inset 0 0 0 1px ${PALETTE.ink}22` : ""}"></div>
      <div style="margin-top:14px;font-size:22px;color:${PALETTE.ink}">${name}</div>
      <div style="margin-top:4px;font-size:20px;color:${PALETTE.red}">${value}</div>
      <div style="margin-top:8px;font-size:15px;color:${PALETTE.ink};opacity:.55;line-height:1.45">${note}</div>
    </div>`;
}

/** A section label on the specimen. */
function heading(words) {
  return `<div style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:${PALETTE.ink};opacity:.45;margin:0 0 20px">${words}</div>`;
}

/** A line of the type specimen, at a size. */
function row(size, words, opacity = 1) {
  return `<div style="font-size:${size}px;line-height:1.25;color:${PALETTE.ink};opacity:${opacity};margin-bottom:12px">${words}</div>`;
}

/**
 * The specimen: the colours as they actually are, and the typeface actually set.
 *
 * A palette written as three hex codes in a table asks the reader to imagine it, and a typeface
 * named but never shown is an assertion rather than a specimen. Both alphabets are here because
 * the font's Cyrillic coverage is the thing that went wrong once, and a claim about coverage is
 * worth less than thirty letters on a page.
 *
 * Every brand gets one, and they differ in exactly the way the brands do: the word. The palette
 * and the alphabets are the same on all of them, which is the point rather than a duplication.
 *
 * @param {string} text  the brand's word, shown in the header and set large below
 * @returns {string} an HTML document
 */
function specimenHtml(text) {
  return page(`<div style="width:1280px;background:${PALETTE.white};padding:72px;box-sizing:border-box;font-family:Plex;font-weight:600">
    <div style="display:flex;align-items:center;gap:22px">
      ${markSvg({ white: false, height: 58 })}
      <div style="font-size:40px;color:${PALETTE.ink}">${escape(text)}</div>
    </div>
    <div style="margin-top:14px;font-size:19px;color:${PALETTE.ink};opacity:.55">The mark, the colours and the typeface.</div>

    <div style="margin-top:64px">
      ${heading("Colours")}
      <div style="display:flex;gap:28px">
        ${swatch("Red", PALETTE.red, "The mark, and every filled surface it sits on.", false)}
        ${swatch("White", PALETTE.white, "The mark on red, and the highlight inside it on white.", true)}
        ${swatch("Ink", PALETTE.ink, "Text, never the mark.", false)}
      </div>
    </div>

    <div style="margin-top:64px">
      ${heading("IBM Plex Sans SemiBold")}
      ${row(58, escape(text))}
      ${row(26, "Where and when you can donate blood.", 0.75)}
      <div style="margin-top:36px">
        ${row(25, "ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ", 0.85)}
        ${row(25, "abcčćdđefghijklmnoprsštuvzž", 0.85)}
        ${row(25, "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ", 0.85)}
        ${row(25, "абвгдђежзијклљмнњопрстћуфхцчџш", 0.85)}
        ${row(25, "0123456789 .,:;!?()[]-/&@%", 0.85)}
      </div>
    </div>
  </div>`);
}

/**
 * Wraps markup in a document with the typeface embedded and every browser margin removed, so a
 * screenshot is exactly the element and nothing else.
 *
 * @param {string} body
 * @returns {string}
 */
function page(body) {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Plex;font-weight:600;src:url(data:font/ttf;base64,${FONT}) format("truetype")}
html,body{margin:0;padding:0}
svg{display:block}
</style>${body}`;
}

/** @param {string} value @returns {string} */
function escape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Draws the forms that carry no word: the logo tiles and the bare marks.
 *
 * They are drawn once for the whole repository rather than with each brand, because they are
 * identical in every one of them. Three copies of a file that cannot differ are three chances for
 * them to differ anyway, and a mark that is not the same mark everywhere is not a house identity.
 *
 * @param {object} o
 * @param {string} o.out  the directory to write into, absolute
 * @returns {Promise<string[]>} the file names written
 */
export async function writeMarks({ out }) {
  return draw(out, [
    ["logo-red.png", logoHtml({ onRed: true }), SIZES.logo, SIZES.logo, 1],
    ["logo-white.png", logoHtml({ onRed: false }), SIZES.logo, SIZES.logo, 1],
    ["mark-red.png", markHtml({ white: false }), markWidth(), SIZES.mark, 1],
    ["mark-white.png", markHtml({ white: true }), markWidth(), SIZES.mark, 1],
  ]);
}

/**
 * Draws everything that carries a brand's word: the two banners, the two link cards and the
 * specimen.
 *
 * This is what a brand's own script calls, and the only reason a brand needs a script at all. The
 * word-free forms are not here, because they are not a brand's to vary.
 *
 * The names follow one rule: the suffix is the colour the file is mostly made of. `mark-red` is a
 * red drop, `logo-red` is a red tile with a white drop on it. Naming them for the background
 * instead reads well until it does not, because a red tile is happy on a light page and on a dark
 * one, so `logo-light` would be a lie half the time.
 *
 * @param {object} o
 * @param {string} o.text  the brand's word. This is the only thing that varies between brands, and
 *                         it is drawn rather than described, so changing it changes the pictures.
 *                         Throws if the typeface cannot draw one of its characters.
 * @param {string} o.out   the directory to write into. Pass an absolute path built from
 *                         `import.meta.dirname`, not a relative one: a relative path resolves
 *                         against whatever directory Node was started in, so running a brand's
 *                         script from the repository root would quietly write its assets there.
 * @returns {Promise<string[]>} the file names written, in the order they were written
 */
export async function writeSet({ text, out }) {
  /**
   * Checked before anything is drawn, because a missing glyph is not an error anywhere else in
   * this pipeline. The browser renders the font's empty box, the screenshot succeeds, and a brand
   * that looks finished is a row of rectangles. That has already happened once.
   */
  const missing = missingGlyphs(text, FONT_FILE);
  if (missing.length > 0) {
    throw new Error(
      `the typeface has no glyph for ${missing.map((c) => `"${c}"`).join(", ")}, so "${text}" would be drawn as empty boxes`,
    );
  }

  const b = SIZES.banner;
  const c = SIZES.card;
  return draw(out, [
    ["banner-red.png", bannerHtml({ text, onRed: true }), b.width, b.height, b.scale],
    ["banner-white.png", bannerHtml({ text, onRed: false }), b.width, b.height, b.scale],
    ["card-red.png", bannerHtml({ text, onRed: true, size: c }), c.width, c.height, c.scale],
    ["card-white.png", bannerHtml({ text, onRed: false, size: c }), c.width, c.height, c.scale],
    /** Its height follows its content, which is why it is the one drawing screenshotted full page. */
    ["specimen.png", specimenHtml(text), 1280, 800, 2, true],
  ]);
}

/**
 * Rasterises a list of pages into a directory, one browser for the lot.
 *
 * @param {string} out  the directory to write into, absolute
 * @param {[string, string, number, number, number, boolean?][]} drawings
 *   the file name, the page, its width and height in CSS pixels, how many device pixels per one of
 *   those, and whether the shot follows the content's height rather than the box
 * @returns {Promise<string[]>} the file names written
 */
async function draw(out, drawings) {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const [name, html, width, height, scale, full] of drawings) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: scale,
      });
      const tab = await context.newPage();
      await tab.setContent(html, { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      writeFileSync(
        join(out, name),
        await tab.screenshot({ type: "png", omitBackground: !full, fullPage: Boolean(full) }),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return drawings.map(([name]) => name);
}

/** The bare mark's width, which follows from the drawn shape's proportions. @returns {number} */
function markWidth() {
  return Math.round((MARK.bounds.width / MARK.bounds.height) * SIZES.mark);
}
