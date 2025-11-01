import { colors, hoverColors } from "@carbon/colors";
import layout from "@carbon/layout";
import { styles } from "@carbon/type";
import fs from "node:fs/promises";
import { colorToken, dimensionToken, numberToken, typographyToken } from "./lib.js";

main();

async function main() {
  const cwd = new URL("../ibm-carbon/", import.meta.url);
  await Promise.all([
    fs.writeFile(
      new URL("colors.tokens.json", cwd),
      JSON.stringify(
        {
          color: {
            black: colorMap(colors.black),
            blackHover: colorToken(hoverColors.blackHover),
            blue: colorMap(colors.blue),
            blueHover: colorMap(hoverColors.blueHover),
            coolGray: colorMap(colors.coolGray),
            coolGrayHover: colorMap(hoverColors.coolGrayHover),
            cyan: colorMap(colors.cyan),
            cyanHover: colorMap(hoverColors.cyanHover),
            gray: colorMap(colors.gray),
            grayHover: colorMap(hoverColors.grayHover),
            green: colorMap(colors.green),
            greenHover: colorMap(hoverColors.greenHover),
            magenta: colorMap(colors.magenta),
            magentaHover: colorMap(hoverColors.magentaHover),
            orange: colorMap(colors.orange),
            orangeHover: colorMap(hoverColors.orangeHover),
            purple: colorMap(colors.purple),
            purpleHover: colorMap(hoverColors.purpleHover),
            red: colorMap(colors.red),
            redHover: colorMap(hoverColors.redHover),
            teal: colorMap(colors.teal),
            tealHover: colorMap(hoverColors.tealHover),
            warmGray: colorMap(colors.warmGray),
            warmGrayHover: colorMap(hoverColors.warmGrayHover),
            white: colorMap(colors.white),
            whiteHover: colorToken(hoverColors.whiteHover),
            yellow: colorMap(colors.yellow),
            yellowHover: colorMap(hoverColors.yellowHover),
          },
        },
        undefined,
        2,
      ),
    ),
    fs.writeFile(
      new URL("layout.tokens.json", cwd),
      JSON.stringify(
        {
          layout: {
            baseFontSize: numberToken(layout.baseFontSize),
            breakpoints: Object.fromEntries(Object.entries(layout.breakpoints).map(([key, group]) => [key, { width: dimensionToken(group.width), columns: numberToken(group.columns), margin: dimensionToken(group.margin) }])),
            container: Object.fromEntries(layout.container.map((value, i) => [zeroPad(i), dimensionToken(value)])),
            fluidSpacing: Object.fromEntries(layout.fluidSpacing.map((value, i) => [zeroPad(i), dimensionToken(value)])),
            iconSize: Object.fromEntries(layout.iconSize.map((value, i) => [zeroPad(i), dimensionToken(value)])),
            layout: Object.fromEntries(layout.layout.map((value, i) => [zeroPad(i), dimensionToken(value)])),
            miniUnit: dimensionToken(layout.miniUnit),
            sizes: Object.fromEntries(Object.entries(layout.sizes).map(([name, value]) => [name, dimensionToken(value)])),
            spacing: Object.fromEntries(layout.spacing.map((value, i) => [zeroPad(i), dimensionToken(value)])),
          },
        },
        undefined,
        2,
      ),
    ),
    fs.writeFile(new URL("typography.tokens.json", cwd), JSON.stringify({ type: Object.fromEntries(Object.entries(styles).map(([name, { breakpoints, ...value }]) => [name, typographyToken(value)])), undefined }, undefined, 2)),
    ...["lg", "xlg", "max"].map((size) =>
      fs.writeFile(
        new URL(`typography-${size}.tokens.json`, cwd),
        JSON.stringify(
          {
            type: Object.fromEntries(
              Object.entries(styles)
                .filter(([_name, value]) => value.breakpoints?.[size])
                .map(([name, { breakpoints, ...value }]) => [name, typographyToken({ ...value, ...breakpoints[size] })]),
            ),
            undefined,
          },
          undefined,
          2,
        ),
      ),
    ),
  ]);
}

function zeroPad(i) {
  return i < 9 ? `0${i + 1}` : `${i + 1}`;
}

function colorMap(map) {
  return Object.fromEntries(Object.entries(map).map(([name, value]) => [name, colorToken(value)]));
}
