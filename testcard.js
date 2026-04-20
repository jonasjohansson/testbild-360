import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const MONO = "ui-monospace, 'SF Mono', 'Fira Code', monospace";
const FONT_CHOICES = {
  "OffBit":          "'OffBit', monospace",
  "OffBit-101":      "'OffBit-101', monospace",
  "OffBit-Dot":      "'OffBit-Dot', monospace",
  "OffBit-Bar":      "'OffBit-Bar', monospace",
  "OPSPastPerfect":  "'OPSPastPerfect', serif",
  "Monospace":       MONO,
};
const FONT_NAMES = Object.keys(FONT_CHOICES);
const labelFontCss = () => FONT_CHOICES.OffBit;

// ── State ───────────────────────────────────────────────────────────────────
const GENERATORS = ["Dome", "Equirectangular", "Cylindrical"];
const CONVERTERS = ["fish2sphere", "sphere2fish", "fish2cube", "cube2fish"];
const MODES = [...GENERATORS, ...CONVERTERS];

const output = {
  generator: "Dome",
  resolution: 2048,
  fov: 180,
};

const inputState = {
  fov: 180,
  status: "No image loaded",
  imageData: null,
  imageW: 0,
  imageH: 0,
};

const dome = {
  arcMajorStep: 20,
  arcMinorStep: 10,
  spokeMajorCount: 10,
  spokeMinorCount: 0,
  sections: 0,
  sectionNumbers: true,
};

const equirect = {
  latMajorStep: 15,
  latMinorStep: 5,
  lonMajorStep: 30,
  lonMinorStep: 10,
};

const cylinder = {
  vFov: 120,
  latMajorStep: 15,
  latMinorStep: 5,
  lonMajorStep: 30,
  lonMinorStep: 10,
};

const overlays = {
  points: false,
  gridLabels: false,
  lineColor: "#ffffff",
  background: "#000000",
  transparentBg: true,
  lineWidthMul: 2.0,
};

const texts = [
  { text: "Dome Dreaming",          elevation: 43,   azimuth: 0, size: 128, flip: false, fontFamily: "OffBit",         letterSpacing: 0 },
  { text: "Fulldome Film Festival", elevation: 32.5, azimuth: 0, size: 96,  flip: false, fontFamily: "OPSPastPerfect", letterSpacing: 0 },
];

// Dome render state
let cx, cy, R, halfFov, lineUnit;
const zToR = (z) => (z / halfFov) * R;
const azToXY = (rr, Adeg) => {
  const a = (Adeg * Math.PI) / 180;
  return [cx + rr * Math.sin(a), cy + rr * Math.cos(a)];
};

// ── Dispatcher ──────────────────────────────────────────────────────────────
function render() {
  switch (output.generator) {
    case "Dome":            renderDome(); break;
    case "Equirectangular": renderEquirect(); break;
    case "Cylindrical":     renderCylindrical(); break;
    case "fish2sphere":     runConverter(convertFishToSphere); break;
    case "sphere2fish":     runConverter(convertSphereToFish); break;
    case "fish2cube":       runConverter(convertFishToCube); break;
    case "cube2fish":       runConverter(convertCubeToFish); break;
  }
  fitCanvas();
}

function paintBackground(W, H) {
  if (overlays.transparentBg) {
    ctx.clearRect(0, 0, W, H);
  } else {
    ctx.fillStyle = overlays.background;
    ctx.fillRect(0, 0, W, H);
  }
}

function gridLineWidth() {
  return Math.max(0.5, lineUnit * overlays.lineWidthMul);
}

// ── Dome renderer ───────────────────────────────────────────────────────────
function renderDome() {
  const size = output.resolution;
  canvas.width = size; canvas.height = size;
  cx = size / 2; cy = size / 2;
  R = (size / 2) * 0.93;
  halfFov = output.fov / 2;
  lineUnit = Math.max(1, Math.round(size / 1024));

  paintBackground(size, size);

  drawArcs();
  drawSpokes();
  drawSections();
  drawHorizon();
  drawZenithDot();
  if (overlays.gridLabels) drawDomeLabels();
  if (overlays.points) drawPoints();
  drawTypographyDome();
}

function drawArcs() {
  const { arcMajorStep: maj, arcMinorStep: min } = dome;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();
  if (min > 0) {
    ctx.globalAlpha = 0.25;
    for (let E = 0; E < 90; E += min) {
      if (Math.abs(E % maj) < 1e-6) continue;
      const z = 90 - E;
      if (z > halfFov) continue;
      ctx.beginPath(); ctx.arc(cx, cy, zToR(z), 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let E = 0; E <= 90; E += maj) {
    const z = 90 - E;
    if (z > halfFov) continue;
    ctx.beginPath(); ctx.arc(cx, cy, zToR(z), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSpokes() {
  const { spokeMajorCount: majN, spokeMinorCount: minN } = dome;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();
  const majStep = 360 / majN;
  if (minN > 0) {
    const minStep = 360 / minN;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < minN; i++) {
      const A = i * minStep;
      if (Math.abs(((A % majStep) + majStep) % majStep) < 1e-6) continue;
      const [x, y] = azToXY(R, A);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < majN; i++) {
    const A = i * majStep;
    const [x, y] = azToXY(R, A);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSections() {
  const count = dome.sections;
  if (count <= 0) return;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();
  ctx.globalAlpha = 0.95;
  const step = 360 / count;
  for (let i = 0; i < count; i++) {
    const A = i * step;
    const [x, y] = azToXY(R, A);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
  }
  if (dome.sectionNumbers) {
    const baseFont = Math.max(12, Math.round(canvas.width / 80));
    ctx.font = `bold ${baseFont}px ${labelFontCss()}`;
    ctx.fillStyle = overlays.lineColor;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < count; i++) {
      const A = i * step + step / 2;
      const [x, y] = azToXY(R * 0.93, A);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((-A * Math.PI) / 180 + Math.PI);
      ctx.fillText(String(i + 1), 0, 0);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHorizon() {
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
}

function drawZenithDot() {
  ctx.fillStyle = overlays.lineColor;
  ctx.beginPath(); ctx.arc(cx, cy, gridLineWidth() * 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawDomeLabels() {
  const size = canvas.width;
  const baseFont = Math.max(10, Math.round(size / 120));
  ctx.font = `${baseFont}px ${labelFontCss()}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  const cardinals = [
    { A: 0,   rot: 0 },
    { A: 90,  rot: -Math.PI / 2 },
    { A: 180, rot: Math.PI },
    { A: 270, rot: Math.PI / 2 },
  ];
  for (const { A, rot } of cardinals) {
    for (let E = dome.arcMajorStep; E < 90; E += dome.arcMajorStep) {
      const z = 90 - E;
      if (z > halfFov) continue;
      const [x, y] = azToXY(zToR(z), A);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      if (!overlays.transparentBg) {
        ctx.fillStyle = overlays.background; ctx.globalAlpha = 0.75;
        ctx.fillRect(-baseFont * 0.95, -baseFont * 0.6, baseFont * 1.9, baseFont * 1.2);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = overlays.lineColor;
      ctx.fillText(String(E), 0, 0);
      ctx.restore();
    }
  }

  const labelR = R + baseFont * 1.2;
  const spokes = dome.spokeMajorCount;
  const azStep = 360 / spokes;
  // Cap total labels at ~36 so dense spoke counts don't cram the rim.
  const skip = Math.max(1, Math.ceil(spokes / 36));
  ctx.fillStyle = overlays.lineColor;
  for (let i = 0; i < spokes; i += skip) {
    const A = i * azStep;
    const [x, y] = azToXY(labelR, A);
    ctx.save(); ctx.translate(x, y); ctx.rotate((-A * Math.PI) / 180);
    const label = Number.isInteger(A) ? String(A) : (Math.round(A * 10) / 10).toString();
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

function drawPoints() {
  const size = canvas.width;
  const clusterR = zToR(30);
  const cardinalAz = [0, 90, 180, 270];
  const spacing = Math.max(10, size / 120);
  ctx.fillStyle = overlays.lineColor;
  for (const A of cardinalAz) {
    const a = (A * Math.PI) / 180;
    const [cx0, cy0] = azToXY(clusterR, A);
    const tx = Math.cos(a); const ty = -Math.sin(a);
    for (let p = 1; p <= 4; p++) {
      const offset = (p - 2.5) * spacing;
      ctx.fillRect(cx0 + tx * offset - p / 2, cy0 + ty * offset - p / 2, p, p);
    }
  }
}

function drawTypographyDome() {
  for (const t of texts) drawArcText(t);
}

function drawArcText({ text, elevation, azimuth, size, flip, fontFamily, letterSpacing = 0 }) {
  const z = 90 - elevation;
  if (z > halfFov || z < 0) return;
  const r = zToR(z);
  if (r <= 2 || !text) return;

  const fam = FONT_CHOICES[fontFamily] || FONT_CHOICES.OffBit;
  ctx.font = `${size}px ${fam}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = overlays.lineColor;

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  // Advance = glyph width + tracking; total excludes the trailing advance past the final glyph.
  const advances = widths.map((w, i) => (i < widths.length - 1 ? w + letterSpacing : w));
  const total = advances.reduce((s, a) => s + a, 0);
  const totalAngDeg = (total / r) * (180 / Math.PI);
  const dir = flip ? -1 : 1;
  let cursorDeg = azimuth - (dir * totalAngDeg) / 2;

  for (let i = 0; i < chars.length; i++) {
    const glyphAng = (widths[i] / r) * (180 / Math.PI);
    const advAng   = (advances[i] / r) * (180 / Math.PI);
    const Adeg = cursorDeg + (dir * glyphAng) / 2;
    const Arad = (Adeg * Math.PI) / 180;
    const x = cx + r * Math.sin(Arad);
    const y = cy + r * Math.cos(Arad);
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(-Arad + (flip ? Math.PI : 0));
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    cursorDeg += dir * advAng;
  }
}

// ── Equirectangular renderer ────────────────────────────────────────────────
function renderEquirect() {
  const W = output.resolution;
  const H = output.resolution / 2;
  canvas.width = W; canvas.height = H;
  lineUnit = Math.max(1, Math.round(W / 2048));

  paintBackground(W, H);

  drawLatLonGrid(W, H, equirect,
    (lat) => ((90 - lat) / 180) * H,
    (lon) => (lon / 360) * W);

  for (const t of texts) drawStraightText(t, (t.azimuth / 360) * W, ((90 - t.elevation) / 180) * H);
}

// ── Cylindrical renderer ────────────────────────────────────────────────────
function renderCylindrical() {
  const W = output.resolution;
  const vFov = cylinder.vFov;
  const halfV = (vFov * Math.PI) / 360;
  const H = Math.max(64, Math.round((Math.tan(halfV) * W) / Math.PI));
  canvas.width = W; canvas.height = H;
  lineUnit = Math.max(1, Math.round(W / 2048));

  paintBackground(W, H);

  const yScale = H / 2 / Math.tan(halfV);
  const yOf = (lat) => H / 2 - Math.tan((lat * Math.PI) / 180) * yScale;
  const xOf = (lon) => (lon / 360) * W;

  drawLatLonGrid(W, H, cylinder, yOf, xOf);

  for (const t of texts) drawStraightText(t, xOf(t.azimuth), yOf(t.elevation));
}

// Straight text helper for equirect / cylindrical — supports letterSpacing
// by laying out each character manually (ctx.letterSpacing isn't everywhere yet).
function drawStraightText(t, cxPos, cyPos) {
  if (!t.text) return;
  const fam = FONT_CHOICES[t.fontFamily] || FONT_CHOICES.OffBit;
  ctx.font = `${t.size}px ${fam}`;
  ctx.fillStyle = overlays.lineColor;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const chars = [...t.text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const ls = t.letterSpacing || 0;
  const total = widths.reduce((s, w) => s + w, 0) + ls * Math.max(0, chars.length - 1);
  let x = cxPos - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, cyPos);
    x += widths[i] + ls;
  }
}

function drawLatLonGrid(W, H, params, yOf, xOf) {
  const { latMajorStep: latMaj, latMinorStep: latMin,
          lonMajorStep: lonMaj, lonMinorStep: lonMin } = params;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();

  if (lonMin > 0) {
    ctx.globalAlpha = 0.25;
    for (let lon = 0; lon <= 360; lon += lonMin) {
      if (Math.abs(lon % lonMaj) < 1e-6) continue;
      const x = xOf(lon);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let lon = 0; lon <= 360; lon += lonMaj) {
    const x = xOf(lon);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  if (latMin > 0) {
    ctx.globalAlpha = 0.25;
    for (let lat = -90; lat <= 90; lat += latMin) {
      if (Math.abs(lat % latMaj) < 1e-6) continue;
      const y = yOf(lat);
      if (y < 0 || y > H) continue;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let lat = -90; lat <= 90; lat += latMaj) {
    const y = yOf(lat);
    if (y < 0 || y > H) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.lineWidth = gridLineWidth();
  ctx.beginPath(); ctx.moveTo(0, yOf(0)); ctx.lineTo(W, yOf(0)); ctx.stroke();
  ctx.strokeRect(gridLineWidth() / 2, gridLineWidth() / 2, W - gridLineWidth(), H - gridLineWidth());

  if (overlays.gridLabels) {
    const baseFont = Math.max(10, Math.round(W / 180));
    ctx.fillStyle = overlays.lineColor;
    ctx.font = `${baseFont}px ${labelFontCss()}`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let lon = 0; lon < 360; lon += lonMaj) {
      ctx.fillText(`${lon}°`, xOf(lon), baseFont * 0.5);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let lat = -90; lat <= 90; lat += latMaj) {
      const y = yOf(lat);
      if (y < 0 || y > H) continue;
      ctx.fillText(`${lat}°`, baseFont * 0.5, y);
    }
  }
}

// ── Canvas fit ──────────────────────────────────────────────────────────────
function fitCanvas() {
  const aspect = canvas.width / canvas.height;
  const pad = 16;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2;
  let w = maxW; let h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
window.addEventListener("resize", fitCanvas);

// ── Converter infrastructure ────────────────────────────────────────────────
function loadImage(file) {
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const tmp = document.createElement("canvas");
    tmp.width = img.width; tmp.height = img.height;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(img, 0, 0);
    inputState.imageData = tctx.getImageData(0, 0, img.width, img.height);
    inputState.imageW = img.width;
    inputState.imageH = img.height;
    inputState.status = `${img.width} × ${img.height}`;
    statusCtrl.updateDisplay();
    URL.revokeObjectURL(img.src);
    render();
  };
  img.onerror = () => { inputState.status = "Load failed"; statusCtrl.updateDisplay(); };
  img.src = URL.createObjectURL(file);
}

document.addEventListener("dragover", (e) => { e.preventDefault(); });
document.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) loadImage(f);
});

function showPlaceholder(msg) {
  canvas.width = 1024; canvas.height = 512;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `bold 28px ${labelFontCss()}`;
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = `18px ${labelFontCss()}`;
  ctx.globalAlpha = 0.6;
  ctx.fillText("drop an image anywhere · or use Input → Load image", canvas.width / 2, canvas.height / 2 + 20);
  ctx.globalAlpha = 1;
}

function runConverter(fn) {
  if (!inputState.imageData) {
    const need = (output.generator === "fish2sphere" || output.generator === "fish2cube")
      ? "Load a fisheye image"
      : output.generator === "sphere2fish"
      ? "Load an equirect image"
      : "Load a cube-strip image (6 faces horizontally)";
    showPlaceholder(need);
    return;
  }
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width || 512, canvas.height || 512);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 32px ${labelFontCss()}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("Rendering…", (canvas.width || 512) / 2, (canvas.height || 512) / 2);
  fitCanvas();
  setTimeout(() => { fn(); fitCanvas(); }, 30);
}

function sampleBilinear(data, W, H, fx, fy, wrapX = false) {
  if (wrapX) fx = ((fx % W) + W) % W;
  else if (fx < 0 || fx > W - 1) return [0, 0, 0, 0];
  if (fy < 0 || fy > H - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  let x1 = x0 + 1; let y1 = y0 + 1;
  if (wrapX) x1 = x1 % W; else x1 = Math.min(x1, W - 1);
  y1 = Math.min(y1, H - 1);
  const dx = fx - x0; const dy = fy - y0;
  const i00 = (y0 * W + x0) * 4;
  const i10 = (y0 * W + x1) * 4;
  const i01 = (y1 * W + x0) * 4;
  const i11 = (y1 * W + x1) * 4;
  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;
  return [
    data[i00]     * w00 + data[i10]     * w10 + data[i01]     * w01 + data[i11]     * w11,
    data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11,
    data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11,
    data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11,
  ];
}

// ── Converters ──────────────────────────────────────────────────────────────
function convertFishToSphere() {
  const W = output.resolution;
  const H = W / 2;
  canvas.width = W; canvas.height = H;
  const src = inputState.imageData.data;
  const sW = inputState.imageW; const sH = inputState.imageH;
  const srcCx = sW / 2; const srcCy = sH / 2;
  const srcR = Math.min(sW, sH) / 2;
  const halfFovIn = (inputState.fov / 2) * Math.PI / 180;
  const out = ctx.createImageData(W, H);
  const od = out.data;

  for (let y = 0; y < H; y++) {
    const lat = Math.PI / 2 - (y + 0.5) / H * Math.PI;
    const sinLat = Math.sin(lat); const cosLat = Math.cos(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x + 0.5) / W * 2 * Math.PI;
      const dx = cosLat * Math.sin(lon);
      const dy = sinLat;
      const dz = cosLat * Math.cos(lon);
      const phi = Math.acos(Math.max(-1, Math.min(1, dy)));
      const i4 = (y * W + x) * 4;
      if (phi > halfFovIn) { od[i4]=0; od[i4+1]=0; od[i4+2]=0; od[i4+3]=0; continue; }
      const theta = Math.atan2(dz, dx);
      const rN = phi / halfFovIn;
      const c = sampleBilinear(src, sW, sH, srcCx + rN * srcR * Math.cos(theta), srcCy + rN * srcR * Math.sin(theta));
      od[i4] = c[0]; od[i4+1] = c[1]; od[i4+2] = c[2]; od[i4+3] = c[3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

function convertSphereToFish() {
  const S = output.resolution;
  canvas.width = S; canvas.height = S;
  const src = inputState.imageData.data;
  const sW = inputState.imageW; const sH = inputState.imageH;
  const cxo = S / 2; const cyo = S / 2;
  const Ro = S / 2;
  const halfFovOut = (output.fov / 2) * Math.PI / 180;
  const out = ctx.createImageData(S, S);
  const od = out.data;

  for (let y = 0; y < S; y++) {
    const j = (y + 0.5 - cyo) / Ro;
    for (let x = 0; x < S; x++) {
      const i = (x + 0.5 - cxo) / Ro;
      const rN = Math.sqrt(i * i + j * j);
      const i4 = (y * S + x) * 4;
      if (rN > 1) { od[i4]=0; od[i4+1]=0; od[i4+2]=0; od[i4+3]=0; continue; }
      const phi = rN * halfFovOut;
      const theta = Math.atan2(j, i);
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const lat = Math.asin(Math.max(-1, Math.min(1, dy)));
      const lon = Math.atan2(dx, dz);
      const sx = (((lon / (2 * Math.PI)) + 1) % 1) * sW;
      const sy = ((Math.PI / 2 - lat) / Math.PI) * sH;
      const c = sampleBilinear(src, sW, sH, sx, sy, true);
      od[i4] = c[0]; od[i4+1] = c[1]; od[i4+2] = c[2]; od[i4+3] = c[3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

function sampleCubeStrip(data, sW, sH, dx, dy, dz) {
  const faceSize = sH;
  const absX = Math.abs(dx); const absY = Math.abs(dy); const absZ = Math.abs(dz);
  let face, uc, vc, ma;
  if (absZ >= absX && absZ >= absY) {
    ma = absZ;
    if (dz > 0) { face = 4; uc = dx;  vc = -dy; }
    else        { face = 5; uc = -dx; vc = -dy; }
  } else if (absY >= absX) {
    ma = absY;
    if (dy > 0) { face = 2; uc = dx;  vc = dz; }
    else        { face = 3; uc = dx;  vc = -dz; }
  } else {
    ma = absX;
    if (dx > 0) { face = 0; uc = -dz; vc = -dy; }
    else        { face = 1; uc = dz;  vc = -dy; }
  }
  const u = 0.5 * (uc / ma + 1);
  const v = 0.5 * (vc / ma + 1);
  return sampleBilinear(data, sW, sH, face * faceSize + u * faceSize, v * faceSize);
}

function convertCubeToFish() {
  const S = output.resolution;
  canvas.width = S; canvas.height = S;
  const src = inputState.imageData.data;
  const sW = inputState.imageW; const sH = inputState.imageH;
  const cxo = S / 2; const cyo = S / 2;
  const Ro = S / 2;
  const halfFovOut = (output.fov / 2) * Math.PI / 180;
  const out = ctx.createImageData(S, S);
  const od = out.data;

  for (let y = 0; y < S; y++) {
    const j = (y + 0.5 - cyo) / Ro;
    for (let x = 0; x < S; x++) {
      const i = (x + 0.5 - cxo) / Ro;
      const rN = Math.sqrt(i * i + j * j);
      const i4 = (y * S + x) * 4;
      if (rN > 1) { od[i4]=0; od[i4+1]=0; od[i4+2]=0; od[i4+3]=0; continue; }
      const phi = rN * halfFovOut;
      const theta = Math.atan2(j, i);
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const c = sampleCubeStrip(src, sW, sH, dx, dy, dz);
      od[i4] = c[0]; od[i4+1] = c[1]; od[i4+2] = c[2]; od[i4+3] = c[3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

function convertFishToCube() {
  const faceSize = output.resolution;
  const W = faceSize * 6; const H = faceSize;
  canvas.width = W; canvas.height = H;
  const src = inputState.imageData.data;
  const sW = inputState.imageW; const sH = inputState.imageH;
  const srcCx = sW / 2; const srcCy = sH / 2;
  const srcR = Math.min(sW, sH) / 2;
  const halfFovIn = (inputState.fov / 2) * Math.PI / 180;
  const out = ctx.createImageData(W, H);
  const od = out.data;

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H * 2 - 1;
    for (let x = 0; x < W; x++) {
      const face = Math.floor(x / faceSize);
      const u = ((x + 0.5 - face * faceSize) / faceSize) * 2 - 1;
      let dx, dy, dz;
      switch (face) {
        case 0: dx =  1; dy = -v; dz = -u; break;
        case 1: dx = -1; dy = -v; dz =  u; break;
        case 2: dx =  u; dy =  1; dz =  v; break;
        case 3: dx =  u; dy = -1; dz = -v; break;
        case 4: dx =  u; dy = -v; dz =  1; break;
        case 5: dx = -u; dy = -v; dz = -1; break;
      }
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len; dy /= len; dz /= len;
      const phi = Math.acos(Math.max(-1, Math.min(1, dy)));
      const i4 = (y * W + x) * 4;
      if (phi > halfFovIn) { od[i4]=0; od[i4+1]=0; od[i4+2]=0; od[i4+3]=0; continue; }
      const theta = Math.atan2(dz, dx);
      const rN = phi / halfFovIn;
      const c = sampleBilinear(src, sW, sH, srcCx + rN * srcR * Math.cos(theta), srcCy + rN * srcR * Math.sin(theta));
      od[i4] = c[0]; od[i4+1] = c[1]; od[i4+2] = c[2]; od[i4+3] = c[3];
    }
  }
  ctx.putImageData(out, 0, 0);

  if (overlays.gridLabels) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, Math.round(faceSize / 512));
    for (let f = 1; f < 6; f++) {
      ctx.beginPath(); ctx.moveTo(f * faceSize, 0); ctx.lineTo(f * faceSize, H); ctx.stroke();
    }
    const names = ["+X (right)", "-X (left)", "+Y (top)", "-Y (bottom)", "+Z (front)", "-Z (back)"];
    const fnt = Math.max(12, Math.round(faceSize / 28));
    ctx.font = `${fnt}px ${labelFontCss()}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let f = 0; f < 6; f++) ctx.fillText(names[f], f * faceSize + faceSize / 2, fnt * 0.5);
  }
}

// ── Export ──────────────────────────────────────────────────────────────────
function downloadPNG() {
  render();
  setTimeout(() => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `testbild-360-${output.generator.toLowerCase()}-${canvas.width}x${canvas.height}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }, CONVERTERS.includes(output.generator) ? 80 : 0);
}

// ── lil-gui ─────────────────────────────────────────────────────────────────
const gui = new GUI({ title: "Testbild 360" });

const outputFolder = gui.addFolder("Output");
outputFolder.add(output, "generator", MODES).name("Generator").onChange(() => { updateVisibility(); render(); });
outputFolder.add(output, "resolution", [512, 1024, 2048, 4096, 8192]).name("Resolution").onChange(render);
const fovCtrl = outputFolder.add(output, "fov", [180, 220]).name("Output FOV (°)").onChange(render);

const inputFolder = gui.addFolder("Input");
inputFolder.add({
  load() {
    const f = document.createElement("input");
    f.type = "file"; f.accept = "image/*";
    f.onchange = (e) => loadImage(e.target.files[0]);
    f.click();
  },
}, "load").name("Load image…");
const statusCtrl = inputFolder.add(inputState, "status").name("Source").disable();
const inputFovCtrl = inputFolder.add(inputState, "fov", [180, 220]).name("Input FOV (°)").onChange(render);

const domeFolder = gui.addFolder("Dome grid");
domeFolder.add(dome, "arcMajorStep", 1, 45, 1).name("Arc major step °").onChange(render);
domeFolder.add(dome, "arcMinorStep", 0, 45, 1).name("Arc minor step °").onChange(render);
domeFolder.add(dome, "spokeMajorCount", 1, 360, 1).name("Spoke major count").onChange(render);
domeFolder.add(dome, "spokeMinorCount", 0, 720, 1).name("Spoke minor count").onChange(render);
domeFolder.add(dome, "sections", 0, 36, 1).name("Sections (wedges)").onChange(render);
domeFolder.add(dome, "sectionNumbers").name("Section numbers").onChange(render);

const equirectFolder = gui.addFolder("Equirect grid");
equirectFolder.add(equirect, "latMajorStep", 1, 90, 1).name("Lat major step °").onChange(render);
equirectFolder.add(equirect, "latMinorStep", 0, 45, 1).name("Lat minor step °").onChange(render);
equirectFolder.add(equirect, "lonMajorStep", 1, 180, 1).name("Lon major step °").onChange(render);
equirectFolder.add(equirect, "lonMinorStep", 0, 60, 1).name("Lon minor step °").onChange(render);

const cylinderFolder = gui.addFolder("Cylindrical grid");
cylinderFolder.add(cylinder, "vFov", 30, 170, 1).name("Vertical FOV °").onChange(render);
cylinderFolder.add(cylinder, "latMajorStep", 1, 90, 1).name("Lat major step °").onChange(render);
cylinderFolder.add(cylinder, "latMinorStep", 0, 45, 1).name("Lat minor step °").onChange(render);
cylinderFolder.add(cylinder, "lonMajorStep", 1, 180, 1).name("Lon major step °").onChange(render);
cylinderFolder.add(cylinder, "lonMinorStep", 0, 60, 1).name("Lon minor step °").onChange(render);

const overlaysFolder = gui.addFolder("Overlays");
const pointsCtrl = overlaysFolder.add(overlays, "points").name("Point spreads").onChange(render);
overlaysFolder.add(overlays, "gridLabels").name("Grid labels").onChange(render);
overlaysFolder.add(overlays, "lineWidthMul", 0.25, 5, 0.25).name("Line thickness").onChange(render);
overlaysFolder.addColor(overlays, "lineColor").name("Line colour").onChange(render);
overlaysFolder.add(overlays, "transparentBg").name("Transparent bg").onChange(render);
overlaysFolder.addColor(overlays, "background").name("Background").onChange(render);

const typoFolder = gui.addFolder("Typography");
const textFolders = [];
function createTextFolder(item) {
  const folder = typoFolder.addFolder(`${textFolders.length + 1}. ${item.text.slice(0, 18)}`);
  folder.add(item, "text").name("Text").onChange((v) => {
    folder.title(`${texts.indexOf(item) + 1}. ${v.slice(0, 18)}`);
    render();
  });
  folder.add(item, "fontFamily", FONT_NAMES).name("Font").onChange(render);
  folder.add(item, "elevation", -90, 90, 0.5).name("Elev/Lat °").onChange(render);
  folder.add(item, "azimuth", 0, 360, 0.5).name("Azim/Lon °").onChange(render);
  folder.add(item, "size", 8, 512, 1).name("Size px").onChange(render);
  folder.add(item, "letterSpacing", -40, 200, 1).name("Letter spacing px").onChange(render);
  folder.add(item, "flip").name("Flip (dome only)").onChange(render);
  folder.add({
    remove() {
      const i = texts.indexOf(item);
      if (i >= 0) texts.splice(i, 1);
      folder.destroy();
      textFolders.splice(textFolders.indexOf(folder), 1);
      render();
    },
  }, "remove").name("− Remove");
  textFolders.push(folder);
}
typoFolder.add({
  add() {
    const item = { text: "TEXT", elevation: 25, azimuth: 0, size: 64, flip: false, fontFamily: "OffBit", letterSpacing: 0 };
    texts.push(item);
    createTextFolder(item);
    render();
  },
}, "add").name("+ Add Text");
for (const t of texts) createTextFolder(t);

gui.add({ exportPNG: downloadPNG }, "exportPNG").name("Export PNG");

function updateVisibility() {
  const g = output.generator;
  const isDome = g === "Dome";
  const isEqui = g === "Equirectangular";
  const isCyl  = g === "Cylindrical";
  const isConv = CONVERTERS.includes(g);
  const outputFisheye = isDome || g === "sphere2fish" || g === "cube2fish";
  const inputFisheye  = g === "fish2sphere" || g === "fish2cube";

  domeFolder.show(isDome);
  equirectFolder.show(isEqui);
  cylinderFolder.show(isCyl);
  inputFolder.show(isConv);
  inputFovCtrl.show(inputFisheye);
  fovCtrl.show(outputFisheye);
  overlaysFolder.show(!isConv);
  pointsCtrl.show(isDome);
  typoFolder.show(!isConv);
}
updateVisibility();

// Web fonts aren't fetched until something uses them. Canvas references don't
// trigger loading on their own, so explicitly warm every @font-face before the
// first render — otherwise the canvas falls back to a system font until the
// user changes something in the GUI.
const FONTS_TO_WARM = ["OffBit", "OffBit-101", "OffBit-Dot", "OffBit-Bar", "OPSPastPerfect"];
Promise.all(
  FONTS_TO_WARM.flatMap((f) => [
    document.fonts.load(`16px "${f}"`),
    document.fonts.load(`bold 16px "${f}"`),
  ]),
).then(render, render);
