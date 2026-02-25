import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const sourceRoot = path.join(repoRoot, "Shared", "Resources");
const targetRoot = path.join(repoRoot, "BabySmash.Web", "public", "assets");

copyDirectory(path.join(sourceRoot, "Sounds"), path.join(targetRoot, "sounds"));
copyDirectory(path.join(sourceRoot, "Strings"), path.join(targetRoot, "strings"));
copyFile(path.join(sourceRoot, "Words.txt"), path.join(targetRoot, "Words.txt"));

console.log("Synced shared resources into BabySmash.Web/public/assets");

function copyDirectory(sourceDirectory, targetDirectory) {
  fs.mkdirSync(targetDirectory, { recursive: true });

  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}
