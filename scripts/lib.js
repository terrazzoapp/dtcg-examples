import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { A98RGB, ColorSpace, HSL, HWB, Lab, LCH, OKLab, OKLCH, P3, ProPhoto, parse, REC_2020, serialize, sRGB, sRGB_Linear, XYZ_D50, XYZ_D65 } from "colorjs.io/fn";
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
  try {
    const result = filepath.href.endsWith(".json5") ? json5.parse(src) : JSON.parse(src);
    return result && typeof result === "object"
      ? {
          $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
          ...result,
        }
      : result;
  } catch (err) {
    throw new Error(`Unexpected error reading ${filepath.href}: ${err}`);
  }
}

/**
 * Normalize dir
 * @param {URL} dir
 */
export async function normalizeDir(filepath) {
  const files = await glob("**/*.{json,json5}", {
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
    case "border": {
      return borderToken($value).$value;
    }
    case "color": {
      return colorToken($value).$value;
    }
    case "fontFamily": {
      return Array.isArray($value) ? $value : [$value];
    }
    case "dimension": {
      return dimensionToken($value).$value;
    }
    case "duration": {
      return durationToken($value).$value;
    }
    case "shadow": {
      return shadowToken($value).$value;
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
  try {
    if (typeof $value === "object" && "components" in $value) {
      return {
        $type: "color",
        $value: {
          colorSpace: $value.colorSpace || "srgb",
          components: $value.components,
          alpha: $value.alpha,
          hex: $value.hex,
        },
      };
    }
    const color = parse($value);
    return {
      $type: "color",
      $value: {
        colorSpace: color.spaceId,
        components: color.coords,
        alpha: color.alpha,
        hex: serialize({ ...color, alpha: 1 }, { format: "hex" }),
      },
    };
  } catch (err) {
    console.log({ $value });
    throw err;
  }
}

/** @param {number|string} */
export function dimensionToken($value) {
  if (typeof $value === "string") {
    if ($value.startsWith("{")) {
      return { $type: "dimension", $value };
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
  return { $type: "dimension", $value: { value: $value ?? 0, unit: "px" } };
}

/** @param {number|string} */
export function durationToken($value) {
  if (typeof $value === "string") {
    if ($value.startsWith("{")) {
      return { $type: "dimension", $value };
    }
    const number = Number.parseFloat($value);
    return {
      $type: "duration",
      $value: {
        value: number,
        unit: $value.replace(number, ""),
      },
    };
  }
  return { $type: "duration", $value: { value: $value ?? 0, unit: "ms" } };
}

/** @param {any} */
export function borderToken($value) {
  return {
    $type: "border",
    $value:
      typeof $value === "string"
        ? $value
        : {
            color: colorToken($value.color).$value,
            style: $value.style,
            width: dimensionToken($value.width).$value,
          },
  };
}

/** @param {number|string} */
export function numberToken($value) {
  return { $type: "number", $value: typeof $value === "string" ? Number.parseFloat($value) : $value };
}

/** @param {any} */
export function shadowToken($value) {
  if ($value === "string") {
    if ($value.startsWith("{")) {
      return { $type: "shadow", $value };
    }
    return {
      $type: "shadow",
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
  return {
    $type: "shadow",
    $value: (Array.isArray($value) ? $value : [$value]).map((layer) => ({
      color: colorToken(layer.color ?? "#000").$value,
      offsetX: dimensionToken(layer.offsetX).$value,
      offsetY: dimensionToken(layer.offsetY).$value,
      blur: dimensionToken(layer.blur).$value,
      spread: dimensionToken(layer.spread).$value,
      inset: layer.inset,
    })),
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
