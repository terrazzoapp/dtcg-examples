import fs from "node:fs/promises";
import { colorToken, dimensionToken } from "./lib.js";

const TOKENS_RAW = "https://raw.githubusercontent.com/adobe/spectrum-css/refs/heads/main/tokens/dist/json/tokens.json";
const cwd = new URL("../adobe-spectrum/", import.meta.url);

main();

async function main() {
  /** @type Record<string, { prep: string; ref: string; value?: string; [key: string]: { value: string } | undefined; }> */
  const src = await fetch(TOKENS_RAW).then((res) => res.json());

  const files = {
    "base.tokens.json": { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" },
    "theme-light.tokens.json": { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" },
    "theme-dark.tokens.json": { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" },
    "size-desktop.tokens.json": { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" },
    "size-mobile.tokens.json": { $schema: "https://www.designtokens.org/schemas/2025.10/format.json" },
  };

  for (const [name, token] of Object.entries(src)) {
    for (const mode of Object.keys(token)) {
      switch (mode) {
        case "ref":
        case "prop": {
          // noop
          break;
        }
        case "value": {
          files["base.tokens.json"][name] = parseValue(name, token.value, token.ref);
          break;
        }
        case "dark":
        case "light": {
          files[`theme-${mode}.tokens.json`][name] = parseValue(name, token[mode].value, token.ref);
          break;
        }
        case "desktop":
        case "mobile": {
          files[`size-${mode}.tokens.json`][name] = parseValue(name, token[mode].value, token.ref);
          break;
        }
        default: {
          throw new Error(`Unhandled mode: ${mode}`);
        }
      }
    }
  }

  await Promise.all(Object.entries(files).map(([filename, contents]) => fs.writeFile(new URL(filename, cwd), JSON.stringify(contents, undefined, 2))));
}

/**
 * Add token to set
 * @param {string} name
 * @param {string} value
 * @param {string | undefined} ref
 */
function parseValue(name, value, ref) {
  const alias = ref?.startsWith("var(") ? ref.replace(/^var\(--spectrum-/, "{").replace(/\)$/, "}") : undefined;

  // 1. color
  if (typeof value === "string" && /^rgb\([^)]+\)$/.test(value)) {
    return { $type: "color", $value: alias || colorToken(value).$value };
  }
  // 2. dimension
  if (/^[0-9]+(\.?[0-9]+)?[a-z]+$/.test(value)) {
    return { $type: "dimension", $value: alias || dimensionToken(value).$value };
  }
  // 3. fontWeight / number
  if (String(Number(value)) === value) {
    if (name.includes("font-weight")) {
      return {
        $type: "fontWeight",
        $value: alias || Number(value),
      };
    }
    return {
      $type: "number",
      $value: alias || Number(value),
    };
  } // 4. string
  return {
    $type: "string",
    $value: alias || value,
  };
}
