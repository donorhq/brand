/**
 * Draws the forms that carry no word: the two logo tiles and the two bare marks.
 *
 * They live here rather than in each brand's folder because they are identical in all of them. The
 * logo is the drop on a filled tile and the mark is the drop alone; neither has ever seen a word,
 * so neither is a country's to vary. Three copies of a file that cannot differ are three chances
 * for them to differ anyway.
 *
 *     node make-assets.mjs
 *
 * Run it from anywhere. It overwrites everything in this folder and writes nothing anywhere else.
 */
import { writeMarks } from "../general/generator.mjs";

const written = await writeMarks({ out: import.meta.dirname });
console.log(`marks: ${written.join(", ")}`);
