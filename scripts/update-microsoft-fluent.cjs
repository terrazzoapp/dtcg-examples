const fluent = require("@fluentui/theme");
const fs = require("node:fs/promises");
const { colorToken, dimensionToken, shadowToken, typographyToken } = require("./lib");

main();

async function main() {
  const base = fluent.createTheme();

  const inverted = fluent.createTheme({ isInverted: true });

  const files = {
    "palette.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      palette: Object.fromEntries(Object.entries(base.palette).map(([name, value]) => [name, value.includes("px") ? shadowToken(value) : colorToken(value)])),
    },
    "effects.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      effects: Object.fromEntries(Object.entries(base.effects).map(([name, value]) => [name, name.includes("elevation") ? shadowToken(value) : dimensionToken(value)])),
    },
    "fonts.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      fonts: Object.fromEntries(Object.entries(base.fonts).map(([name, value]) => [name, typographyToken(value)])),
    },
    "spacing.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      spacing: Object.fromEntries(Object.entries(base.spacing).map(([name, value]) => [name, dimensionToken(value)])),
    },
    "theme-default.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      semanticColors: Object.fromEntries(Object.entries(base.semanticColors).map(([name, value]) => [name, value.includes("px") ? shadowToken(value) : colorToken(value)])),
    },
    "theme-inverted.tokens.json": {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      semanticColors: Object.fromEntries(Object.entries(inverted.semanticColors).map(([name, value]) => [name, value.includes("px") ? shadowToken(value) : colorToken(value)])),
    },
  };

  const cwd = new URL("../microsoft-fluent/", `file://${__dirname}/`);
  await Promise.all(
    Object.entries(files).map(async ([basename, contents]) => {
      const filename = new URL(basename, cwd);
      await fs.mkdir(new URL(".", filename), { recursive: true });
      await fs.writeFile(filename, JSON.stringify(contents, undefined, 2));
    }),
  );
}
