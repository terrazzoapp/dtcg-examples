import { defineConfig, parse } from "@terrazzo/parser";
import fs from "node:fs/promises";

const ROOT_DIR = new URL("..", import.meta.url);

main();

// This takes the normalizations from Terrazzo and rewrites them to the same file.
// This is only done was a means of making copy + paste easier.
async function main() {
  const dir = await fs.readdir(ROOT_DIR, { withFileTypes: true });
  for (const file of dir) {
    if (!file.name.endsWith(".json") || ["package.json"].includes(file.name)) {
      continue;
    }

    const filename = new URL(file.name, ROOT_DIR);
    const src = await fs.readFile(filename, "utf8");

    // normalize
    const config = defineConfig({}, { cwd: import.meta.url });
    const { tokens } = await parse([{ filename, src }], { config });

    // update old values with normalized ones
    const json = JSON.parse(src);
    for (const [id, token] of Object.entries(tokens)) {
      const path = id.split(".");
      let node = json;
      for (const segment of path) {
        if (!node[segment]) {
          throw new Error(`No key "${segment}" found for ${id}`);
        }
        node = node[segment];
      }
      if (typeof node.$value === 'string' && node.$value[0] === '{') {
        continue;
      }
      node.$value = token.$value;
      for (const [modeName, modeValue] of Object.entries(token.mode)) {
        if (modeName === "." || (typeof modeValue.$value === 'string' && modeValue.$value[0] === '{')) {
          continue;
        }
        node.$extensions.mode[modeName] = modeValue.$value;
      }
    }

    // write back to file
    await fs.writeFile(filename, JSON.stringify(json, undefined, 2));
  }
}
