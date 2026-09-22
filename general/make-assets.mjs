/**
 * Draws the DonorHQ house brand.
 *
 * This is the identity every country brand inherits from.
 *
 *     node make-assets.mjs
 *
 * Run it from anywhere. It overwrites everything in the assets/ folder beside this file and
 * writes nothing anywhere else.
 */
import { join } from "node:path";
import { writeSet } from "./generator.mjs";

/** The word, drawn as written. Change it and the pictures change. */
const TEXT = "DonorHQ";

const written = await writeSet({ text: TEXT, out: join(import.meta.dirname, "assets") });
console.log(`${TEXT}: ${written.join(", ")}`);
