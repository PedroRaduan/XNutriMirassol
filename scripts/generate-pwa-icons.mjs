import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.resolve("public");
const apps = ["admin", "pdv"];
const sizes = [180, 192, 512];

for (const app of apps) {
  const source = await readFile(path.join(publicDirectory, `xnutri-${app}-icon.svg`));

  for (const size of sizes) {
    await sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(publicDirectory, `xnutri-${app}-${size}.png`));
  }
}

console.log("Ícones PWA gerados para Administração e PDV.");
