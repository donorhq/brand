/**
 * Draws the Serbian brand.
 *
 * Serbia's app is called Davalac, and that word is the only thing that differs from the house
 * brand: the drop, the red, the typeface and every measurement come from the generator.
 *
 * It is drawn twice, because Serbian is written in two scripts and both are in daily use. The
 * app authors its Serbian in Cyrillic and generates the Latin, so the same order holds here:
 * Cyrillic is the real one and Latin is the transliteration. Which one a given surface wants
 * depends on the surface, not on a preference, so both are built and neither is a fallback.
 *
 *     node make-assets.mjs
 *
 * Run it from anywhere. It overwrites everything in the assets/ folders beside this file and
 * writes nothing anywhere else.
 */
import { join } from "node:path";
import { writeSet } from "../../general/generator.mjs";

/** The word in each script, and the folder each set is written to. Change these and the pictures change. */
const SCRIPTS = {
  cyrl: "Давалац",
  lat: "Davalac",
};

for (const [folder, text] of Object.entries(SCRIPTS)) {
  const written = await writeSet({ text, out: join(import.meta.dirname, "assets", folder) });
  console.log(`${text} (${folder}): ${written.join(", ")}`);
}
