import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const BANNER_SRC =
  "C:/Users/SablineKoster/.cursor/projects/d-Projects-ImTryingToDesign-site-source/assets/c__Users_SablineKoster_AppData_Roaming_Cursor_User_workspaceStorage_45039a535ef36df0b2871e3d2928b455_images_itd-logo-46679832-54d1-43c2-882d-187c33ecde7f.png";
const ICON_SRC =
  "C:/Users/SablineKoster/.cursor/projects/d-Projects-ImTryingToDesign-site-source/assets/c__Users_SablineKoster_AppData_Roaming_Cursor_User_workspaceStorage_45039a535ef36df0b2871e3d2928b455_images_itd-icon-df4392e8-f088-4cf5-8197-38df7dc00de6.png";

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function isLime(r: number, g: number, b: number) {
  if (g < 160 || b > 140 || r < 80 || g < r || g - b < 50) return false;
  if (r > 230 && g > 230 && b > 180) return false;
  return true;
}

function decodePng(buf: Buffer) {
  const magic = [...buf.subarray(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error(`not a PNG magic=${magic} len=${buf.length}`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error("unsupported PNG compression/filter/interlace");
      }
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height) throw new Error("missing IHDR");
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG mode depth=${bitDepth} type=${colorType}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idats));
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);
  let src = 0;
  let prev: Buffer | null = null;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = raw.subarray(src, src + stride);
    src += stride;
    const recon = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? recon[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let pr = 0;
      if (filter === 1) pr = a;
      else if (filter === 2) pr = b;
      else if (filter === 3) pr = (a + b) >> 1;
      else if (filter === 4) pr = paeth(a, b, c);
      else if (filter !== 0) throw new Error(`bad filter ${filter}`);
      recon[i] = (x + pr) & 255;
    }
    for (let x = 0; x < width; x++) {
      const di = (y * width + x) * 4;
      const si = x * bpp;
      rgba[di] = recon[si];
      rgba[di + 1] = recon[si + 1];
      rgba[di + 2] = recon[si + 2];
      rgba[di + 3] = bpp === 4 ? recon[si + 3] : 255;
    }
    prev = recon;
  }
  return { width, height, colorType, rgba };
}

function chunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width: number, height: number, rgba: Buffer) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = 0;
    rgba.copy(raw, o + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([PNG_SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function cropBox(rgba: Buffer, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const split = Math.floor(width * 0.45);
  const counts = new Map<string, number>();
  let limeCount = 0;
  let leftLime = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (!isLime(r, g, b)) continue;
      limeCount++;
      const key = `${r},${g},${b}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (x >= split) continue;
      leftLime++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("no left lime pixels");
  const pad = 2;
  let left = Math.max(0, minX - pad);
  let top = Math.max(0, minY - pad);
  let right = Math.min(width, maxX + 1 + pad);
  let bottom = Math.min(height, maxY + 1 + pad);
  let cw = right - left;
  let ch = bottom - top;
  if (Math.abs(cw - ch) <= Math.max(8, Math.floor(Math.max(cw, ch) * 0.12))) {
    const side = Math.max(cw, ch);
    left = Math.max(0, left - Math.floor((side - cw) / 2));
    right = Math.min(width, left + side);
    left = Math.max(0, right - side);
    top = Math.max(0, top - Math.floor((side - ch) / 2));
    bottom = Math.min(height, top + side);
    top = Math.max(0, bottom - side);
    cw = right - left;
    ch = bottom - top;
  }
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const src = ((top + y) * width + left) * 4;
    rgba.copy(crop, y * cw * 4, src, src + cw * 4);
  }
  let lime: [number, number, number] = [216, 255, 0];
  let best = 0;
  for (const [key, n] of counts) {
    if (n > best) {
      best = n;
      const [r, g, b] = key.split(",").map(Number);
      lime = [r, g, b];
    }
  }
  return { left, top, right, bottom, cw, ch, crop, lime, limeCount, leftLime };
}

function toSquare(src: Buffer, sw: number, sh: number, bg: [number, number, number]) {
  if (sw === sh) return { data: src, size: sw };
  const size = Math.max(sw, sh);
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    out[o] = bg[0];
    out[o + 1] = bg[1];
    out[o + 2] = bg[2];
    out[o + 3] = 255;
  }
  const ox = Math.floor((size - sw) / 2);
  const oy = Math.floor((size - sh) / 2);
  for (let y = 0; y < sh; y++) {
    src.copy(out, ((oy + y) * size + ox) * 4, y * sw * 4, y * sw * 4 + sw * 4);
  }
  return { data: out, size };
}

function isBackdrop(r: number, g: number, b: number, a: number) {
  if (a < 10) return true;
  return r < 28 && g < 28 && b < 28;
}

function knockoutAndCropIcon(rgba: Buffer, width: number, height: number) {
  const out = Buffer.from(rgba);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let lime: [number, number, number] = [216, 255, 0];
  let best = 0;
  const counts = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const a = out[i + 3];
      if (isBackdrop(r, g, b, a)) {
        out[i + 3] = 0;
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (isLime(r, g, b)) {
        const key = `${r},${g},${b}`;
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        if (n > best) {
          best = n;
          lime = [r, g, b];
        }
      }
    }
  }
  if (maxX < 0) throw new Error("no mark pixels");
  const pad = Math.max(2, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width, maxX + 1 + pad);
  const bottom = Math.min(height, maxY + 1 + pad);
  const cw = right - left;
  const ch = bottom - top;
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    out.copy(crop, y * cw * 4, ((top + y) * width + left) * 4, ((top + y) * width + left) * 4 + cw * 4);
  }
  const size = Math.max(cw, ch);
  const square = Buffer.alloc(size * size * 4);
  const ox = Math.floor((size - cw) / 2);
  const oy = Math.floor((size - ch) / 2);
  for (let y = 0; y < ch; y++) {
    crop.copy(square, ((oy + y) * size + ox) * 4, y * cw * 4, y * cw * 4 + cw * 4);
  }
  return { left, top, right, bottom, cw, ch, size, square, lime };
}

function writeFaviconSvg(path: string, lime: [number, number, number]) {
  const hex = `#${lime.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  writeFileSync(
    path,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="I/TD">
  <path fill="${hex}" d="M0 0h46L64 18v46H18L0 46z"/>
  <text x="32" y="39" text-anchor="middle" fill="#050505" font-family="Arial Black, Arial, sans-serif" font-size="15" font-weight="900">I/TD</text>
</svg>
`,
  );
}

export function resolveIconSrc(root: string) {
  const local = join(root, "artifacts", "itd-mark-source.png");
  if (existsSync(ICON_SRC)) return ICON_SRC;
  if (existsSync(local)) return local;
  return "";
}

function syncIconMark(root: string) {
  const iconSrc = resolveIconSrc(root);
  if (!iconSrc) return false;
  mkdirSync(join(root, "artifacts"), { recursive: true });
  mkdirSync(join(root, "public"), { recursive: true });

  const markDst = join(root, "public", "mark.png");
  const favDst = join(root, "public", "favicon.png");
  const fav32 = join(root, "public", "favicon-32.png");
  const fav180 = join(root, "public", "favicon-180.png");
  const favSvg = join(root, "public", "favicon.svg");
  const favSrcDst = join(root, "artifacts", "favicon-source.png");
  const iconCopy = join(root, "artifacts", "itd-mark-source.png");
  const reportPath = join(root, "artifacts", "logo-crop-report.txt");
  const srcBytes = statSync(iconSrc).size;

  const already =
    existsSync(markDst) &&
    existsSync(favDst) &&
    existsSync(reportPath) &&
    readFileSync(reportPath, "utf8").includes(`ICON_SRC=${iconSrc}`) &&
    readFileSync(reportPath, "utf8").includes(`ICON_BYTES=${srcBytes}`);
  if (already) return true;

  if (iconSrc !== iconCopy) copyFileSync(iconSrc, iconCopy);
  copyFileSync(iconSrc, markDst);
  copyFileSync(iconSrc, favDst);
  copyFileSync(iconSrc, fav32);
  copyFileSync(iconSrc, fav180);
  copyFileSync(iconSrc, favSrcDst);
  writeFaviconSvg(favSvg, [212, 255, 0]);
  writeFileSync(
    reportPath,
    [
      `ICON_SRC=${iconSrc}`,
      `ICON_BYTES=${srcBytes}`,
      "CROPPER=icon-copy",
      `OUT_MARK=${markDst}`,
      `OUT_FAVICON=${favDst}`,
      `OUT_FAVICON_32=${fav32}`,
      `OUT_FAVICON_180=${fav180}`,
      `OUT_FAVICON_SVG=${favSvg}`,
      "",
    ].join("\n"),
  );
  return true;
}

function resize(src: Buffer, sw: number, sh: number, dw: number, dh: number) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = ((y + 0.5) * sh) / dh - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = ((x + 0.5) * sw) / dw - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = sx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = src[(y0 * sw + x0) * 4 + c];
        const p10 = src[(y0 * sw + x1) * 4 + c];
        const p01 = src[(y1 * sw + x0) * 4 + c];
        const p11 = src[(y1 * sw + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        out[o + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return out;
}

function cropJpegWithDrawing(paths: {
  origDst: string;
  logoDst: string;
  favSrcDst: string;
  favDst: string;
  fav32: string;
  fav180: string;
  reportPath: string;
  srcBytes: number;
}) {
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$src = ${JSON.stringify(BANNER_SRC)}
$artOrig = ${JSON.stringify(paths.origDst)}
$logo = ${JSON.stringify(paths.logoDst)}
$favSrc = ${JSON.stringify(paths.favSrcDst)}
$fav = ${JSON.stringify(paths.favDst)}
$fav32 = ${JSON.stringify(paths.fav32)}
$fav180 = ${JSON.stringify(paths.fav180)}
$report = ${JSON.stringify(paths.reportPath)}
Copy-Item -LiteralPath $src -Destination $artOrig -Force
Copy-Item -LiteralPath $src -Destination $logo -Force
$img = [System.Drawing.Image]::FromFile($src)
$w = $img.Width; $h = $img.Height
$bmp = New-Object System.Drawing.Bitmap $img
$img.Dispose()
function Test-Lime([int]$r,[int]$g,[int]$b) {
  if ($g -lt 160 -or $b -gt 140 -or $r -lt 80 -or $g -lt $r -or ($g - $b) -lt 50) { return $false }
  if ($r -gt 230 -and $g -gt 230 -and $b -gt 180) { return $false }
  return $true
}
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
$limeCount = 0; $leftLime = 0
$split = [int]($w * 0.45)
$counts = @{}
$domR=216; $domG=255; $domB=0; $domN=0
for ($y=0; $y -lt $h; $y++) {
  for ($x=0; $x -lt $w; $x++) {
    $c = $bmp.GetPixel($x,$y)
    if (-not (Test-Lime $c.R $c.G $c.B)) { continue }
    $limeCount++
    $key = '{0},{1},{2}' -f $c.R,$c.G,$c.B
    if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
    if ($counts[$key] -gt $domN) { $domN = $counts[$key]; $domR=$c.R; $domG=$c.G; $domB=$c.B }
    if ($x -ge $split) { continue }
    $leftLime++
    if ($x -lt $minX) { $minX = $x }
    if ($y -lt $minY) { $minY = $y }
    if ($x -gt $maxX) { $maxX = $x }
    if ($y -gt $maxY) { $maxY = $y }
  }
}
if ($maxX -lt 0) { $bmp.Dispose(); throw 'no left lime pixels' }
$pad = 2
$left = [Math]::Max(0, $minX - $pad)
$top = [Math]::Max(0, $minY - $pad)
$right = [Math]::Min($w, $maxX + 1 + $pad)
$bottom = [Math]::Min($h, $maxY + 1 + $pad)
$cw = $right - $left; $ch = $bottom - $top
if ([Math]::Abs($cw - $ch) -le [Math]::Max(8, [int]([Math]::Max($cw,$ch)*0.12))) {
  $side = [Math]::Max($cw,$ch)
  $left = [Math]::Max(0, $left - [int](($side-$cw)/2))
  $right = [Math]::Min($w, $left + $side)
  $left = [Math]::Max(0, $right - $side)
  $top = [Math]::Max(0, $top - [int](($side-$ch)/2))
  $bottom = [Math]::Min($h, $top + $side)
  $top = [Math]::Max(0, $bottom - $side)
  $cw = $right - $left; $ch = $bottom - $top
}
$rect = New-Object System.Drawing.Rectangle $left,$top,$cw,$ch
$crop = $bmp.Clone($rect, $bmp.PixelFormat)
$side = [Math]::Max($cw,$ch)
$favBmp = New-Object System.Drawing.Bitmap $side,$side
$g = [System.Drawing.Graphics]::FromImage($favBmp)
$g.Clear([System.Drawing.Color]::FromArgb($domR,$domG,$domB))
$g.DrawImage($crop, [int](($side-$cw)/2), [int](($side-$ch)/2), $cw, $ch)
$g.Dispose()
$crop.Save($favSrc, [System.Drawing.Imaging.ImageFormat]::Png)
$favBmp.Save($fav, [System.Drawing.Imaging.ImageFormat]::Png)
function Save-Size($srcBmp, $path, $size) {
  $b = New-Object System.Drawing.Bitmap $size,$size
  $gg = [System.Drawing.Graphics]::FromImage($b)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.DrawImage($srcBmp, 0, 0, $size, $size)
  $gg.Dispose()
  $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
Save-Size $favBmp $fav32 32
Save-Size $favBmp $fav180 180
$crop.Dispose(); $favBmp.Dispose(); $bmp.Dispose()
$hex = '#{0:X2}{1:X2}{2:X2}' -f $domR,$domG,$domB
@(
  "ORIGINAL_WIDTH=$w",
  "ORIGINAL_HEIGHT=$h",
  "ORIGINAL_MODE=JPEG",
  "CROP_BOX=($left, $top, $right, $bottom)",
  "CROP_WIDTH=$cw",
  "CROP_HEIGHT=$ch",
  ("FAVICON_SIZE=" + $side + "x" + $side),
  "LIME_HEX=$hex",
  "LIME_RGB=($domR, $domG, $domB)",
  "LIME_PIXEL_COUNT=$limeCount",
  "LEFT_LIME_PIXEL_COUNT=$leftLime",
  "SRC=$src",
  "OUT_ORIGINAL=$artOrig",
  "OUT_LOGO=$logo",
  "OUT_FAVICON_SOURCE=$favSrc",
  "OUT_FAVICON=$fav",
  "OUT_FAVICON_32=$fav32",
  "OUT_FAVICON_180=$fav180",
  "ORIG_BYTES=${paths.srcBytes}",
  "CROPPER=System.Drawing"
) | Set-Content -LiteralPath $report -Encoding ASCII
`;
  execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    timeout: 120000,
    windowsHide: true,
  });
}

function sameSize(path: string, bytes: number) {
  return existsSync(path) && statSync(path).size === bytes;
}

export function syncBrandAssets(root: string) {
  try {
    syncBrandAssetsUnsafe(root);
  } catch (error) {
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(
      join(root, "artifacts", "logo-crop-report.txt"),
      `ERROR=${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
  }
}

function syncBrandAssetsUnsafe(root: string) {
  const iconReady = syncIconMark(root);

  if (!existsSync(BANNER_SRC)) {
    if (!iconReady) writeFileSync(join(root, "artifacts", "logo-crop-report.txt"), `MISSING_SOURCE=${BANNER_SRC}\n`);
    return;
  }

  mkdirSync(join(root, "artifacts"), { recursive: true });
  mkdirSync(join(root, "public"), { recursive: true });

  const origDst = join(root, "artifacts", "original-logo.png");
  const logoDst = join(root, "public", "logo.png");
  const srcBytes = statSync(BANNER_SRC).size;

  if (iconReady) {
    if (!sameSize(origDst, srcBytes) || !sameSize(logoDst, srcBytes)) {
      copyFileSync(BANNER_SRC, origDst);
      copyFileSync(BANNER_SRC, logoDst);
    }
    return;
  }

  const favSrcDst = join(root, "artifacts", "favicon-source.png");
  const favDst = join(root, "public", "favicon.png");
  const fav32 = join(root, "public", "favicon-32.png");
  const fav180 = join(root, "public", "favicon-180.png");
  const reportPath = join(root, "artifacts", "logo-crop-report.txt");

  const reportHasCrop = existsSync(reportPath) && readFileSync(reportPath, "utf8").includes("CROP_BOX=");
  if (sameSize(origDst, srcBytes) && sameSize(logoDst, srcBytes) && existsSync(favSrcDst) && reportHasCrop) return;

  copyFileSync(BANNER_SRC, origDst);
  copyFileSync(BANNER_SRC, logoDst);

  const py = join(root, "artifacts", "_crop_logo.py");
  const pyErrors: string[] = [];
  if (existsSync(py)) {
    for (const [cmd, args] of [
      ["python", [py]],
      ["py", ["-3", py]],
    ] as const) {
      try {
        execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
        if (existsSync(reportPath) && readFileSync(reportPath, "utf8").includes("CROP_BOX=")) return;
      } catch (error) {
        pyErrors.push(`${cmd}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  try {
    cropJpegWithDrawing({ origDst, logoDst, favSrcDst, favDst, fav32, fav180, reportPath, srcBytes });
    if (existsSync(reportPath) && readFileSync(reportPath, "utf8").includes("CROP_BOX=")) return;
  } catch (error) {
    pyErrors.push(`drawing: ${error instanceof Error ? error.message : String(error)}`);
  }

  let decoded;
  try {
    decoded = decodePng(readFileSync(BANNER_SRC));
  } catch (error) {
    if (existsSync(ICON_SRC)) {
      copyFileSync(ICON_SRC, favSrcDst);
      copyFileSync(ICON_SRC, favDst);
      copyFileSync(ICON_SRC, fav32);
      copyFileSync(ICON_SRC, fav180);
    }
    const head = readFileSync(BANNER_SRC).subarray(0, 16);
    const magic = [...head].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    writeFileSync(
      reportPath,
      [
        `DECODE_ERROR=${error instanceof Error ? error.message : String(error)}`,
        `MAGIC=${magic}`,
        `SRC=${BANNER_SRC}`,
        `OUT_ORIGINAL=${origDst}`,
        `OUT_LOGO=${logoDst}`,
        `FAVICON_FALLBACK=${ICON_SRC}`,
        `PY_ERRORS=${pyErrors.join(" | ")}`,
        `ORIG_BYTES=${srcBytes}`,
        "",
      ].join("\n"),
    );
    return;
  }
  const box = cropBox(decoded.rgba, decoded.width, decoded.height);
  const square = toSquare(box.crop, box.cw, box.ch, box.lime);
  writeFileSync(favSrcDst, encodePng(box.cw, box.ch, box.crop));
  writeFileSync(favDst, encodePng(square.size, square.size, square.data));
  writeFileSync(fav32, encodePng(32, 32, resize(square.data, square.size, square.size, 32, 32)));
  writeFileSync(fav180, encodePng(180, 180, resize(square.data, square.size, square.size, 180, 180)));

  const report = [
    `ORIGINAL_WIDTH=${decoded.width}`,
    `ORIGINAL_HEIGHT=${decoded.height}`,
    `ORIGINAL_MODE=${decoded.colorType === 6 ? "RGBA" : "RGB"}`,
    `CROP_BOX=(${box.left}, ${box.top}, ${box.right}, ${box.bottom})`,
    `CROP_WIDTH=${box.cw}`,
    `CROP_HEIGHT=${box.ch}`,
    `FAVICON_SIZE=${square.size}x${square.size}`,
    `LIME_HEX=#${box.lime.map((n) => n.toString(16).padStart(2, "0")).join("")}`,
    `LIME_RGB=(${box.lime.join(", ")})`,
    `LIME_PIXEL_COUNT=${box.limeCount}`,
    `LEFT_LIME_PIXEL_COUNT=${box.leftLime}`,
    `SRC=${BANNER_SRC}`,
    `OUT_ORIGINAL=${origDst}`,
    `OUT_LOGO=${logoDst}`,
    `OUT_FAVICON_SOURCE=${favSrcDst}`,
    `OUT_FAVICON=${favDst}`,
    `OUT_FAVICON_32=${fav32}`,
    `OUT_FAVICON_180=${fav180}`,
    `ORIG_BYTES=${srcBytes}`,
    "",
  ].join("\n");
  writeFileSync(reportPath, report);
}
