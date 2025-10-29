import { spawnSync } from "node:child_process";
import { normalizeDir } from "./lib.js";

const ROOT_DIR = new URL("..", import.meta.url);

main();

async function main() {
  spawnSync("pnpm", [
    "exec",
    "degit",
    "primer/primitives/src/tokens",
    "github-primer",
    "--force",
  ]);

  await normalizeDir(new URL("../github-primer/", import.meta.url));
}
