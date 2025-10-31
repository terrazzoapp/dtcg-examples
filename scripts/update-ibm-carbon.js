import { colors, hoverColors } from "@carbon/colors";
import layout from "@carbon/layout";
import { styles } from "@carbon/type";
import fs from "node:fs/promises";
import { typographyToken } from "./lib.js";

main();

async function main() {
  console.log({ layout });

  const cwd = new URL("../ibm-carbon/", import.meta.url);
  await Promise.all([
    fs.writeFile(new URL("colors.json", cwd), JSON.stringify({ color: { ...colors, ...hoverColors } }, undefined, 2)),
    fs.writeFile(new URL("layout.json", cwd), JSON.stringify({ layout }, undefined, 2)),
    fs.writeFile(new URL("typography.json", cwd), JSON.stringify({ type: Object.fromEntries(Object.entries(styles).map(([name, value]) => [name, typographyToken(value)])) })),
  ]);
}
