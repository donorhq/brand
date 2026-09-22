/**
 * Every constant the identity is made of, and nothing that draws.
 *
 * They live apart from the generator so that anything wanting to check them does not have to
 * import a headless browser to do it. The product repository's test reads this file directly to
 * assert that the palette and the drop it ships still match the ones drawn here.
 */

/** The three colours, and the only three. A country does not get its own. */
export const PALETTE = {
  /** The mark, and every filled surface it sits on. */
  red: "#B5121B",
  /** The mark on red, and the highlight inside it on white. */
  white: "#FFFFFF",
  /** Text, never the mark. The word needs it on a white ground, where white would vanish. */
  ink: "#1C2128",
};

/** Every measurement, in one place, so two brands cannot come out at different sizes. */
export const SIZES = {
  /** The square logo, which is also what an avatar is uploaded from. */
  logo: 1000,
  /** How much of the logo's height the drop covers. Below about 0.6 it stops reading at 20px. */
  logoCoverage: 0.72,
  /** The bare mark's height. Its width follows from the shape's proportions. */
  mark: 560,
  banner: {
    width: 1280,
    height: 320,
    /** The height of the drop itself, not of the 64 unit box it is drawn in. */
    mark: 166,
    /** The word's size, in CSS pixels. */
    word: 104,
    /** Between the drop and the first letter. */
    gap: 44,
    /**
     * Rendered at twice the layout size, because a banner is the one thing here that a reader
     * sees at full width on a retina screen. The others are shown small or scaled down.
     */
    scale: 2,
  },
  /**
   * The picture a chat shows under a shared link: the banner's drop and word, centred on the
   * 1200 by 630 that WhatsApp, Viber, Telegram and Facebook all crop to. A banner sent instead is
   * four times as wide as it is tall, and they cut its sides off.
   */
  card: {
    width: 1200,
    height: 630,
    mark: 220,
    word: 138,
    gap: 58,
    /** At its own size: a chat shows it smaller than this, never larger. */
    scale: 1,
  },
};

/** The drop: one path, one highlight, and where the drawn shape sits inside its box. */
export const MARK = {
  path: "M32 4c9 14 20 24 20 36a20 20 0 1 1-40 0C12 28 23 18 32 4z",
  /** The small light circle, which is what stops the drop reading as a leaf. */
  highlight: { cx: 24, cy: 42, r: 4 },
  /** The drawn shape's extent inside the 64 unit box. See the note at the top of the file. */
  bounds: { x: 12, y: 4, width: 40, height: 56 },
};
