import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src =
  "C:/Users/SablineKoster/.cursor/projects/d-Projects-ImTryingToDesign-site-source/assets/c__Users_SablineKoster_AppData_Roaming_Cursor_User_workspaceStorage_45039a535ef36df0b2871e3d2928b455_images_itd-icon-df4392e8-f088-4cf5-8197-38df7dc00de6.png";

mkdirSync(join(root, "artifacts"), { recursive: true });
mkdirSync(join(root, "public"), { recursive: true });
if (!existsSync(src)) {
  console.error("missing icon source", src);
  process.exit(1);
}

copyFileSync(src, join(root, "artifacts", "itd-mark-source.png"));
for (const name of ["mark.png", "favicon.png", "favicon-32.png", "favicon-180.png"]) {
  copyFileSync(src, join(root, "public", name));
}
console.log("ok");
