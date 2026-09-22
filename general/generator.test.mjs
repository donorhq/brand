/**
 * Tests for the parts of the generator that are not a picture.
 *
 * What a drawing looks like is settled by looking at it, and no assertion replaces that. What can
 * be asserted is the contract around it: that the constants are the shape everything assumes, and
 * that a word the typeface cannot draw is refused before anything is created rather than after.
 *
 * Nothing here launches a browser. The guard runs before the launch, which is the property being
 * tested, so a test that needed one would be testing the wrong thing.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { MARK, PALETTE, SIZES } from "./tokens.mjs";
import { writeSet } from "./generator.mjs";

test("there are three colours and they are written one way", () => {
  assert.deepEqual(Object.keys(PALETTE), ["red", "white", "ink"]);
  for (const value of Object.values(PALETTE)) {
    assert.match(value, /^#[0-9A-F]{6}$/, `${value} should be six upper case digits`);
  }
});

test("the drawn shape sits inside the box it is drawn in", () => {
  const { bounds } = MARK;
  assert.ok(bounds.width > 0 && bounds.height > 0);
  assert.ok(bounds.x >= 0 && bounds.y >= 0);
  assert.ok(bounds.x + bounds.width <= 64, "wider than its own box");
  assert.ok(bounds.y + bounds.height <= 64, "taller than its own box");
  assert.ok(bounds.height > bounds.width, "the drop is taller than it is wide");
});

test("the highlight is inside the drop rather than beside it", () => {
  const { highlight, bounds } = MARK;
  assert.ok(highlight.cx - highlight.r >= bounds.x);
  assert.ok(highlight.cx + highlight.r <= bounds.x + bounds.width);
  assert.ok(highlight.cy - highlight.r >= bounds.y);
  assert.ok(highlight.cy + highlight.r <= bounds.y + bounds.height);
});

test("the logo covers enough of its tile to survive an avatar", () => {
  assert.ok(SIZES.logoCoverage > 0.6 && SIZES.logoCoverage <= 1);
});

test("the link card is the size chats crop a shared link's picture to", () => {
  assert.equal(SIZES.card.width, 1200);
  assert.equal(SIZES.card.height, 630);
  assert.ok(SIZES.card.mark < SIZES.card.height, "the drop fits the card's height");
});

test("a word the typeface cannot draw is refused", async () => {
  await assert.rejects(
    () => writeSet({ text: "日本語", out: join(tmpdir(), "brand-never-written") }),
    /no glyph for "日", "本", "語"/,
  );
});

test("and refused before anything is created, so nothing is left half made", async () => {
  const out = join(tmpdir(), `brand-refused-${Date.now()}`);
  await assert.rejects(() => writeSet({ text: "語", out }));
  assert.equal(existsSync(out), false, "the output directory should not exist");
});
