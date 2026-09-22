/**
 * Adds a country: makes its folder, writes its script, registers it, and draws its assets.
 *
 *     pnpm country serbia Davalac
 *     pnpm country serbia cyrl=Давалац lat=Davalac
 *
 * The first form draws one set. The second draws one per script, into its own folder, for a
 * country written in more than one alphabet. Serbia is the reason that exists: Cyrillic and Latin
 * are both in daily use there and neither is a fallback for the other.
 *
 * It refuses rather than overwrites. Re-adding a country that already exists is far more likely to
 * be a typo in the name than an intention to discard what is there, and the recovery from a
 * refusal is cheap while the recovery from an overwrite is not.
 *
 * It also checks the typeface can draw the word before it creates anything, so a country is never
 * left half-made. That check is the whole reason this is a script rather than three shell
 * commands: a missing glyph fails nowhere else, it just draws an empty box.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { missingGlyphs } from "./general/coverage.mjs";

const here = import.meta.dirname;
const font = join(here, "fonts", "IBMPlexSans-SemiBold.ttf");
const USAGE = `usage: pnpm country <country> <word>
       pnpm country <country> <script>=<word> [<script>=<word> ...]

  pnpm country serbia Davalac
  pnpm country serbia cyrl=Давалац lat=Davalac`;

/**
 * Asks for what was not passed.
 *
 * package.json cannot declare that this script takes arguments: npm's scripts field is a plain
 * command string with no schema, no validation and no help, and npm appends whatever follows the
 * `--` without looking at it. So if anything is going to ask, it has to be this file.
 *
 * Only when someone is actually there to answer. Without a terminal, a prompt is a hang rather
 * than a question, so a non-interactive run gets the usage and a non-zero exit as before.
 *
 * @returns {Promise<string[]>} the same shape argv would have had
 */
async function ask() {
  if (!process.stdin.isTTY) stop(USAGE);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = (await rl.question("Country folder name, lower case (serbia): ")).trim();
    const words = (
      await rl.question("Word to draw (Davalac), or one per script (cyrl=Давалац lat=Davalac): ")
    ).trim();
    return [name, ...words.split(/\s+/).filter(Boolean)];
  } finally {
    rl.close();
  }
}
const given = process.argv.slice(2);
const [country, ...words] = given.length > 0 ? given : await ask();

if (!country || words.length === 0) stop(USAGE);
if (!/^[a-z][a-z0-9-]*$/.test(country))
  stop(`"${country}" is not a folder name: lower case, digits and hyphens, starting with a letter`);

const folder = join(here, "countries", country);
if (existsSync(folder)) stop(`countries/${country} already exists. Edit it, or remove it first`);

/** Either one word, or a script name for each: the shape of the argument decides which. */
const scripts = words.map((word) => {
  const at = word.indexOf("=");
  return at === -1
    ? { name: null, text: word }
    : { name: word.slice(0, at), text: word.slice(at + 1) };
});
if (scripts.some((s) => s.name) && scripts.some((s) => !s.name)) {
  stop("either give one word, or give every word a script name");
}
if (scripts.length > 1 && scripts.some((s) => !s.name))
  stop("more than one word needs script names");

for (const { name, text } of scripts) {
  if (name !== null && !/^[a-z][a-z0-9-]*$/.test(name)) stop(`"${name}" is not a folder name`);
  const missing = missingGlyphs(text, font);
  if (missing.length > 0) {
    stop(
      `the typeface has no glyph for ${missing.map((c) => `"${c}"`).join(", ")}, so "${text}" would be drawn as empty boxes`,
    );
  }
}

mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, "make-assets.mjs"), scripts[0].name ? manyScripts() : oneScript());
register();

console.log(`countries/${country} created`);
await import(pathToFileURL(join(folder, "make-assets.mjs")).href);

/** @returns {string} a script for a country written one way */
function oneScript() {
  return `/**
 * Draws the ${title(country)} brand.
 *
 * The word is the only thing that differs from the house brand: the drop, the red, the typeface
 * and every measurement come from the generator. Change it and the pictures change.
 *
 *     node make-assets.mjs
 *
 * Run it from anywhere. It overwrites everything in the assets/ folder beside this file and
 * writes nothing anywhere else.
 */
import { join } from "node:path";
import { writeSet } from "../../general/generator.mjs";

const TEXT = ${JSON.stringify(scripts[0].text)};

const written = await writeSet({ text: TEXT, out: join(import.meta.dirname, "assets") });
console.log(\`\${TEXT}: \${written.join(", ")}\`);
`;
}

/** @returns {string} a script for a country written in more than one alphabet */
function manyScripts() {
  const entries = scripts.map(({ name, text }) => `  ${name}: ${JSON.stringify(text)},`).join("\n");
  return `/**
 * Draws the ${title(country)} brand, once per script.
 *
 * The words are the only thing that differs from the house brand: the drop, the red, the typeface
 * and every measurement come from the generator. Neither script is a fallback for the other, so
 * both are built and each gets its own folder.
 *
 *     node make-assets.mjs
 *
 * Run it from anywhere. It overwrites everything in the assets/ folders beside this file and
 * writes nothing anywhere else.
 */
import { join } from "node:path";
import { writeSet } from "../../general/generator.mjs";

const SCRIPTS = {
${entries}
};

for (const [folder, text] of Object.entries(SCRIPTS)) {
  const written = await writeSet({ text, out: join(import.meta.dirname, "assets", folder) });
  console.log(\`\${text} (\${folder}): \${written.join(", ")}\`);
}
`;
}

/**
 * Adds the country's own package script. `pnpm assets:all` finds the folder without this, so it is
 * convenience rather than a registration, but leaving it out would make the list look like a
 * complete one with a gap in it.
 */
function register() {
  const path = join(here, "package.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const name = `assets:${country}`;
  if (manifest.scripts[name]) return;

  /**
   * Rebuilt by walking what is there, not from a list of the scripts this file knows about. An
   * earlier version kept a whitelist and silently dropped every script added to the repository
   * afterwards, which is how `test`, `lint` and `format` disappeared the first time a country was
   * added after they existed.
   */
  const entries = Object.entries(manifest.scripts);
  const last = entries.findLastIndex(([key]) => key.startsWith("assets:"));
  const at = last === -1 ? entries.length : last + 1;
  manifest.scripts = Object.fromEntries([
    ...entries.slice(0, at),
    [name, `node countries/${country}/make-assets.mjs`],
    ...entries.slice(at),
  ]);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** @param {string} value @returns {string} */
function title(value) {
  return value.replace(
    /(^|-)([a-z])/g,
    (_, lead, letter) => (lead ? " " : "") + letter.toUpperCase(),
  );
}

/** @param {string} message @returns {never} */
function stop(message) {
  console.error(message);
  process.exit(1);
}
