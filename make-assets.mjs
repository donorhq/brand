/**
 * Draws everything: the shared marks, the house brand, then each country that has a script.
 *
 *     pnpm assets:all
 *
 * Countries are found rather than listed, so adding one is adding a folder and nothing else. A
 * list here would be a second place to remember, and the failure when somebody forgot would be
 * silent: the new brand simply never gets drawn.
 *
 * A folder without a make-assets.mjs is skipped and named, because that is far more likely to be
 * a country somebody started and left half-added than a deliberate empty directory.
 *
 * This walks the folders with Node rather than a shell glob so it behaves the same everywhere,
 * and imports each script rather than spawning it, so one browser launch failure stops the run
 * with a real stack instead of an exit code.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const here = import.meta.dirname;
const countries = join(here, "countries");

/**
 * The shared marks first, then the house brand, then the countries. A country is a variation on
 * the house brand, and both are variations on the mark, so that is the order they read in.
 */
const scripts = [join(here, "marks", "make-assets.mjs"), join(here, "general", "make-assets.mjs")];
const skipped = [];

if (existsSync(countries)) {
  for (const entry of readdirSync(countries, { withFileTypes: true }).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory()) continue;
    const script = join(countries, entry.name, "make-assets.mjs");
    if (existsSync(script)) scripts.push(script);
    else skipped.push(entry.name);
  }
}

for (const script of scripts) await import(pathToFileURL(script).href);

if (skipped.length > 0) {
  console.warn(`no make-assets.mjs, so nothing drawn: ${skipped.join(", ")}`);
}
