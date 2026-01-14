import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { glob } from "tinyglobby";
import { normalizeDir } from "./lib.js";

main();

async function main() {
  spawnSync("pnpm", ["exec", "degit", "primer/primitives/src/tokens", "github-primer", "--force"]);
  const cwd = new URL("../github-primer/", import.meta.url);

  // before generation, delete generated files so they don’t break the parser or cause an infinite loop
  const genFiles = await glob("**/*.tokens.json", { absolute: true, cwd });
  for (const file of genFiles) {
    await fs.unlink(file);
  }

  await normalizeDir(cwd);
}
