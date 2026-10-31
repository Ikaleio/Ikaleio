import opentype from "opentype.js";
import { theme, type Mode } from "./theme";

const width = 880;
const height = 220;
const center = width / 2;

const displayName = "Ikaleio";
const roleEn = "Student / Indie Developer / Former OIer";
const roleZh = "学生 / 独立开发者 / 前信息学竞赛生";
const sansStack = `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, "Segoe UI", sans-serif`;

// Below this rendered width the 20px role line would drop under 11px on screen.
const narrowBreakpoint = 520;

const nameBaseline = 101;
const roleEnBaseline = 135;
const roleZhBaseline = 161;

const fontPath = Bun.resolveSync("@fontsource/noto-serif-sc/files/noto-serif-sc-latin-700-normal.woff", import.meta.dir);
const font = opentype.parse(await Bun.file(fontPath).arrayBuffer());

function outlineName(x: number): opentype.Path {
  const fontSize = 60;
  const letterSpacing = -1.5;
  const scale = fontSize / font.unitsPerEm;
  const path = new opentype.Path();
  let pen = x;
  let previous: opentype.Glyph | undefined;
  for (const glyph of font.stringToGlyphs(displayName)) {
    if (previous) pen += font.getKerningValue(previous, glyph) * scale + letterSpacing;
    path.extend(glyph.getPath(pen, nameBaseline, fontSize));
    pen += (glyph.advanceWidth ?? 0) * scale;
    previous = glyph;
  }
  return path;
}

// Measured at y = nameBaseline, so y1 and y2 are absolute.
const measured = outlineName(0).getBoundingBox();
const nameWidth = measured.x2 - measured.x1;
const nameLeft = center - nameWidth / 2;
const namePath = outlineName(nameLeft - measured.x1)
  .commands.map((command) => {
    // opentype.js 2.0.0's toPathData writes NaN into some curves, and getPath drops Z, so serialize here.
    if (command.type === "Z") return "";
    const control = command.type === "Q" ? `${command.x1.toFixed(2)} ${command.y1.toFixed(2)} ` : "";
    return `${command.type === "M" ? "Z" : ""}${command.type}${control}${command.x.toFixed(2)} ${command.y.toFixed(2)}`;
  })
  .join("")
  .slice(1)
  .concat("Z");

function mix(from: string, to: string, amount: number): string {
  const channels = [1, 3, 5].map((i) => {
    const start = parseInt(from.slice(i, i + 2), 16);
    const end = parseInt(to.slice(i, i + 2), 16);
    return Math.round(start * (1 - amount) + end * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

// 0 behind the text, 1 at the corners; the floor stays under a quarter of peak opacity.
function fieldIntensity(x: number, y: number): number {
  const edge = Math.cbrt(Math.abs((x - center) / center) ** 3 + Math.abs((y - height / 2) / (height / 2)) ** 3);
  return 0.15 + 0.85 * smoothstep(0.62, 1.1, edge);
}

// The one soft primary region, at most 25% mix.
function tintAmount(x: number, y: number): number {
  return 0.25 * Math.exp(-(((x - 720) / 170) ** 2 + ((y - 190) / 110) ** 2));
}

const bayer = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const opacitySteps = 6;
const tintSteps = 4;

function dotField(mode: Mode): string {
  const { foreground, primary } = theme[mode];
  const peak = mode === "light" ? 0.22 : 0.34;
  const buckets = new Map<string, { opacity: number; tint: number; d: string; lastX: number; lastY: number }>();

  for (let row = 0; row < height / 4; row++) {
    for (let column = 0; column < width / 4; column++) {
      const x = column * 4 + 1;
      const y = row * 4 + 2;
      const intensity = fieldIntensity(x + 1, y);
      if (intensity < (bayer[row % 4]![column % 4]! + 0.5) / 16) continue;

      const opacity = Math.max(1, Math.floor(intensity * opacitySteps));
      const tint = Math.floor((tintAmount(x + 1, y) / 0.25) * tintSteps);
      const key = `${opacity}-${tint}`;
      const bucket = buckets.get(key) ?? { opacity, tint, d: "", lastX: 0, lastY: -1 };
      // Each dot is a 2-wide, 2-thick stroke segment, which keeps the file small.
      bucket.d += bucket.lastY === y ? `m${x - bucket.lastX} 0h2` : `M${x} ${y}h2`;
      bucket.lastX = x + 2;
      bucket.lastY = y;
      buckets.set(key, bucket);
    }
  }

  return [...buckets.values()]
    .map((bucket) => {
      const stroke = mix(foreground, primary, (bucket.tint / tintSteps) * 0.25);
      const opacity = ((bucket.opacity / opacitySteps) * peak).toFixed(3);
      return `<path stroke="${stroke}" stroke-opacity="${opacity}" d="${bucket.d}"/>`;
    })
    .join("");
}

export function banner(mode: Mode): string {
  const { background, foreground, mutedForeground, border, primary } = theme[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
<title id="title">${displayName}. ${roleEn}. ${roleZh}</title>
<style>
.role{font-family:${sansStack};font-weight:500;fill:${mutedForeground};stroke:${background};stroke-width:4px;stroke-linejoin:round;paint-order:stroke;text-anchor:middle}
.role-en{font-size:20px}
.role-zh{font-size:18px}
.shimmer{animation:shimmer 6s linear infinite}
@keyframes shimmer{to{transform:translateX(${(-nameWidth).toFixed(2)}px)}}
@media (prefers-reduced-motion:reduce){.shimmer{animation:none}}
@media (max-width:${narrowBreakpoint}px){
.field{opacity:.4}
.name{transform:translateY(-11px)}
.role-en{font-size:32px;transform:translateY(-1px)}
.role-zh{font-size:28px;transform:translateY(9.5px)}
}
</style>
<defs>
<clipPath id="surface"><rect width="${width}" height="${height}" rx="12"/></clipPath>
<clipPath id="name-outline"><path d="${namePath}"/></clipPath>
<linearGradient id="name-gradient">
<stop offset="0" stop-color="${foreground}"/>
<stop offset=".25" stop-color="${primary}"/>
<stop offset=".5" stop-color="${foreground}"/>
<stop offset=".75" stop-color="${primary}"/>
<stop offset="1" stop-color="${foreground}"/>
</linearGradient>
</defs>
<rect width="${width}" height="${height}" rx="12" fill="${background}"/>
<g class="field" clip-path="url(#surface)" fill="none" stroke-width="2">${dotField(mode)}</g>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="none" stroke="${border}"/>
<g class="name">
<path d="${namePath}" fill="${background}" stroke="${background}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"/>
<g clip-path="url(#name-outline)"><rect class="shimmer" x="${nameLeft.toFixed(2)}" y="${measured.y1.toFixed(2)}" width="${(nameWidth * 2).toFixed(2)}" height="${(measured.y2 - measured.y1).toFixed(2)}" fill="url(#name-gradient)"/></g>
</g>
<text class="role role-en" x="${center}" y="${roleEnBaseline}">${roleEn}</text>
<text class="role role-zh" x="${center}" y="${roleZhBaseline}">${roleZh}</text>
</svg>
`;
}
