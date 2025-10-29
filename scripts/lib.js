import {
  A98RGB,
  ColorSpace,
  HSL,
  HWB,
  LCH,
  Lab,
  OKLCH,
  OKLab,
  parse,
  P3,
  ProPhoto,
  REC_2020,
  XYZ_D50,
  XYZ_D65,
  sRGB,
  sRGB_Linear,
} from "colorjs.io/fn";
import json5 from "json5";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { glob } from "tinyglobby";

ColorSpace.register(A98RGB);
ColorSpace.register(HSL);
ColorSpace.register(HWB);
ColorSpace.register(LCH);
ColorSpace.register(Lab);
ColorSpace.register(OKLCH);
ColorSpace.register(OKLab);
ColorSpace.register(P3);
ColorSpace.register(ProPhoto);
ColorSpace.register(REC_2020);
ColorSpace.register(XYZ_D50);
ColorSpace.register(XYZ_D65);
ColorSpace.register(sRGB);
ColorSpace.register(sRGB_Linear);

/**
 * Load JSON, including support for JSON5
 * @param {URL} filepath
 */
export async function loadJson(filepath) {
  const src = await fs.readFile(filepath);
  return filepath.href.endsWith(".json5") ? json5.parse(src) : JSON.parse(src);
}

/**
 * Normalize dir
 * @param {URL} dir
 */
export async function normalizeDir(filepath) {
  const files = await glob("**/*", {
    absolute: true,
    cwd: new URL("../github-primer/", import.meta.url),
  });
  await Promise.all(
    files.map(async (file) => normalize(new URL(`file://${file}`))),
  );
}

/**
 * Normalize JSON
 * @param {URL} filepath
 */
export async function normalize(filepath) {
  const tokens = await loadJson(filepath);

  let $type;
  function walk(node, path = []) {
    if (
      !node ||
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "boolean"
    ) {
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], [...path, i]);
      }
      return;
    }

    if (node.$type) {
      $type = node.$type;
    }
    if (node.$value) {
      node.$value = normalizeValue($type, node.$value);
      return;
    }

    const keys = Object.keys(node);
    for (const key of keys) {
      walk(node[key], [...path, key]);
    }
  }
  walk(tokens);

  await fs.writeFile(
    fileURLToPath(filepath).replace(/\.json5$/, ".json"),
    JSON.stringify(tokens, undefined, 2),
  );
}

/**
 * Normalize a value
 * @param {string} $type
 * @param {any} $value
 */
function normalizeValue($type, $value) {
  switch ($type) {
    case "color": {
      // non-parseable string
      if (typeof $value === "string" && $value.startsWith("{")) {
        return $value;
      }

      const color = parse($value);
      return {
        colorSpace: color.space,
        components: color.coords,
        alpha: color.alpha,
        hex: typeof $value === "string" && isHex($value) ? $value : undefined,
      };
    }
    case "fontFamily": {
      return Array.isArray($value) ? $value : [$value];
    }
    default: {
      return $value;
    }
  }
}

function isHex(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
}
