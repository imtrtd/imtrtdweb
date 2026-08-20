import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src =
  "C:/Users/SablineKoster/.cursor/projects/d-Projects-ImTryingToDesign-site-source/assets/c__Users_SablineKoster_AppData_Roaming_Cursor_User_workspaceStorage_45039a535ef36df0b2871e3d2928b455_images_________________-80a1dc73-ec7d-4388-93d3-5eeeb539d13d.png";

mkdirSync(join(root, "artifacts"), { recursive: true });
mkdirSync(join(root, "public"), { recursive: true });

for (const dest of ["artifacts/original-logo.png", "public/logo.png", "public/favicon.png"]) {
  copyFileSync(src, join(root, dest));
}

console.log("copied variant-1 PNG to artifacts/ and public/");
