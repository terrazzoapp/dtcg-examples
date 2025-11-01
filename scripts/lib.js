import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { A98RGB, ColorSpace, HSL, HWB, Lab, LCH, OKLab, OKLCH, P3, ProPhoto, parse, REC_2020, sRGB, sRGB_Linear, XYZ_D50, XYZ_D65 } from "colorjs.io/fn";
import json5 from "json5";
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
  await Promise.all(files.map(async (file) => normalize(new URL(`file://${file}`))));
}

/**
 * Normalize JSON
 * @param {URL} filepath
 */
export async function normalize(filepath) {
  const tokens = await loadJson(filepath);

  let $type;
  function walk(node, path = []) {
    if (!node || typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
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

  await fs.writeFile(fileURLToPath(filepath).replace(/\.json5$/, ".tokens.json"), JSON.stringify(tokens, undefined, 2));
}

/**
 * Normalize a value
 * @param {string} $type
 * @param {any} $value
 */
function normalizeValue($type, $value) {
  switch ($type) {
    case "color": {
      return colorToken($value).$value;
    }
    case "fontFamily": {
      return Array.isArray($value) ? $value : [$value];
    }
    default: {
      return $value;
    }
  }
}

/** @param {string} */
export function colorToken($value) {
  if (typeof $value === "string" && $value.startsWith("{")) {
    return { $type: "color", $value };
  }

  const color = parse($value);
  return {
    $type: "color",
    $value: {
      colorSpace: color.space,
      components: color.coords,
      alpha: color.alpha,
      hex: typeof $value === "string" && isHex($value) ? $value : undefined,
    },
  };
}

/** @param {number|string} */
export function dimensionToken($value) {
  if (typeof $value === "number") {
    return { $type: "dimension", $value: { value: $value, unit: "px" } };
  }
  const number = Number.parseFloat($value);
  return {
    $type: "dimension",
    $value: {
      value: number,
      unit: $value.replace(number, ""),
    },
  };
}

/** @param {number|string} */
export function numberToken($value) {
  return { $type: "number", $value: typeof $value === "string" ? Number.parseFloat($value) : $value };
}

/** @param {string} */
export function shadowToken($value) {
  if (typeof $value !== "string") {
    throw new Error(`shadowToken: can’t parse ${$value}`);
  }
  return {
    $type: "dimension",
    $value: $value
      .split("),")
      .filter(Boolean)
      .map((str) => {
        const color = `${str})`.match(/rgba\([^)]+\)/)?.[0];
        const parts = `${str})`.replace(color, "").trim().split(" ");
        return {
          offsetX: dimensionToken(parts[0] || 0).$value,
          offsetY: dimensionToken(parts[1] || 0).$value,
          spread: dimensionToken(parts[2] || 0).$value,
          blur: dimensionToken(parts[2] || 0).$value,
          color: colorToken(color || "#000").$value,
        };
      }),
  };
}

/** @param {object} */
export function typographyToken({ fontSize, ...$value }) {
  return {
    $type: "typography",
    $value: {
      fontFamily: ["system-ui", "sans-serif"],
      fontSize: fontSize ? dimensionToken(fontSize).$value : { value: 1, unit: "rem" },
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1,
      ...$value,
    },
  };
}

function isHex(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
}
