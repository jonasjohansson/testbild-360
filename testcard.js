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
const output = {
  resolution: 2048,
  fov: 180,
};

const dome = {
  arcMajorStep: 20,
  arcMinorStep: 10,
  spokeMajorCount: 18,
  spokeMinorCount: 0,
  sections: 0,
  sectionNumbers: true,
};

const overlays = {
  points: false,
  gridLabels: false,
  degreeTicks: true,
  lineColor: "#ffffff",
  background: "#000000",
  transparentBg: true,
  lineWidthMul: 2.0,
};

const texts = [
  { text: "Dome Dreaming",          elevation: 43,   azimuth: 0, size: 128, flip: false, fontFamily: "OffBit",         letterSpacing: 0 },
  { text: "Fulldome Film Festival", elevation: 32.5, azimuth: 0, size: 96,  flip: false, fontFamily: "OPSPastPerfect", letterSpacing: 0 },
];

// Render state (set per render)
let cx, cy, R, halfFov, lineUnit;
const zToR = (z) => (z / halfFov) * R;
const azToXY = (rr, Adeg) => {
  const a = (Adeg * Math.PI) / 180;
  return [cx + rr * Math.sin(a), cy + rr * Math.cos(a)];
};

function paintBackground(W, H) {
  if (overlays.transparentBg) ctx.clearRect(0, 0, W, H);
  else { ctx.fillStyle = overlays.background; ctx.fillRect(0, 0, W, H); }
}

function gridLineWidth() {
  return Math.max(0.5, lineUnit * overlays.lineWidthMul);
}

// ── Renderer ────────────────────────────────────────────────────────────────
function render() {
  const size = output.resolution;
  canvas.width = size; canvas.height = size;
  cx = size / 2; cy = size / 2;
  halfFov = output.fov / 2;
  lineUnit = Math.max(1, Math.round(size / 1024));
  // Inset so the horizon ring's stroke fits inside the canvas.
  R = size / 2 - Math.ceil(gridLineWidth() / 2);

  paintBackground(size, size);

  drawArcs();
  drawSpokes();
  drawSections();
  drawHorizon();
  if (overlays.degreeTicks) drawDegreeTicks();
  drawZenithDot();
  if (overlays.gridLabels) drawDomeLabels();
  if (overlays.points) drawPoints();
  for (const t of texts) drawArcText(t);

  fitCanvas();
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

function drawDegreeTicks() {
  const size = canvas.width;
  const tick1  = size / 400;
  const tick5  = size / 200;
  const tick10 = size / 100;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = gridLineWidth();
  for (let A = 0; A < 360; A += 1) {
    const len = A % 10 === 0 ? tick10 : A % 5 === 0 ? tick5 : tick1;
    const [x1, y1] = azToXY(R, A);
    const [x2, y2] = azToXY(R - len, A);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
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

  // Elevation labels on 4 cardinal axes — tops toward center
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

  // Azimuth labels inside the polar circle, tops toward the rim
  const tickAllowance = overlays.degreeTicks ? size / 100 : 0;
  const labelR = R - tickAllowance - baseFont * 1.2;
  const spokes = dome.spokeMajorCount;
  const azStep = 360 / spokes;
  const skip = Math.max(1, Math.ceil(spokes / 36));
  ctx.fillStyle = overlays.lineColor;
  for (let i = 0; i < spokes; i += skip) {
    const A = i * azStep;
    const [x, y] = azToXY(labelR, A);
    ctx.save(); ctx.translate(x, y); ctx.rotate((-A * Math.PI) / 180 + Math.PI);
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

// ── Export ──────────────────────────────────────────────────────────────────
function downloadPNG() {
  render();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testbild-360-dome-${canvas.width}x${canvas.height}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

// ── lil-gui ─────────────────────────────────────────────────────────────────
const gui = new GUI({ title: "Testbild 360" });

const outputFolder = gui.addFolder("Output");
outputFolder.add(output, "resolution", [512, 1024, 2048, 4096, 8192]).name("Resolution").onChange(render);
outputFolder.add(output, "fov", [180, 220]).name("FOV (°)").onChange(render);

const domeFolder = gui.addFolder("Dome grid");
domeFolder.add(dome, "arcMajorStep", 1, 45, 1).name("Arc major step °").onChange(render);
domeFolder.add(dome, "arcMinorStep", 0, 45, 1).name("Arc minor step °").onChange(render);
domeFolder.add(dome, "spokeMajorCount", 1, 360, 1).name("Spoke major count").onChange(render);
domeFolder.add(dome, "spokeMinorCount", 0, 720, 1).name("Spoke minor count").onChange(render);
domeFolder.add(dome, "sections", 0, 36, 1).name("Sections (wedges)").onChange(render);
domeFolder.add(dome, "sectionNumbers").name("Section numbers").onChange(render);

const overlaysFolder = gui.addFolder("Overlays");
overlaysFolder.add(overlays, "points").name("Point spreads").onChange(render);
overlaysFolder.add(overlays, "gridLabels").name("Grid labels").onChange(render);
overlaysFolder.add(overlays, "degreeTicks").name("Degree ticks").onChange(render);
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
  folder.add(item, "elevation", -90, 90, 0.5).name("Elevation °").onChange(render);
  folder.add(item, "azimuth", 0, 360, 0.5).name("Azimuth °").onChange(render);
  folder.add(item, "size", 8, 512, 1).name("Size px").onChange(render);
  folder.add(item, "letterSpacing", -40, 200, 1).name("Letter spacing px").onChange(render);
  folder.add(item, "flip").name("Flip").onChange(render);
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

// ── Boot: warm web fonts before first render ────────────────────────────────
const FONTS_TO_WARM = ["OffBit", "OffBit-101", "OffBit-Dot", "OffBit-Bar", "OPSPastPerfect"];
Promise.all(
  FONTS_TO_WARM.flatMap((f) => [
    document.fonts.load(`16px "${f}"`),
    document.fonts.load(`bold 16px "${f}"`),
  ]),
).then(render, render);
