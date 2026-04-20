import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const FONT = "ui-monospace, 'SF Mono', 'Fira Code', monospace";

// ── State ───────────────────────────────────────────────────────────────────
const output = {
  resolution: 2048,
  fov: 180,
};

const grid = {
  arcMajorStep: 10,
  arcMinorStep: 5,
  spokeMajorCount: 36,
  spokeMinorCount: 72,
  sections: 0,
};

const overlays = {
  sweetSpot: true,
  ramp: false,
  points: false,
  gridLabels: true,
  lineColor: "#ffffff",
  background: "#000000",
};

// Typography items: each is { text, elevation, azimuth, size, flip }
const texts = [
  { text: "WELCOME TO THE DOME", elevation: 30, azimuth: 0, size: 64, flip: false },
];

// ── Render state (set per render) ───────────────────────────────────────────
let cx, cy, R, halfFov, lineUnit;

const zToR = (z) => (z / halfFov) * R;
const azToXY = (rr, Adeg) => {
  const a = (Adeg * Math.PI) / 180;
  return [cx + rr * Math.sin(a), cy + rr * Math.cos(a)];
};

// ── Rendering ───────────────────────────────────────────────────────────────
function render() {
  const size = output.resolution;
  canvas.width = size;
  canvas.height = size;
  cx = size / 2;
  cy = size / 2;
  R = (size / 2) * 0.985;
  halfFov = output.fov / 2;
  lineUnit = Math.max(1, Math.round(size / 1024));

  ctx.fillStyle = overlays.background;
  ctx.fillRect(0, 0, size, size);

  drawSweetSpot();
  drawArcs();
  drawSpokes();
  drawSections();
  drawHorizon();
  drawZenithDot();
  if (overlays.gridLabels) drawGridLabels();
  if (overlays.ramp) drawRamp();
  if (overlays.points) drawPoints();
  drawTypography();
  drawSignature();
}

function drawSweetSpot() {
  if (!overlays.sweetSpot) return;
  const rInner = zToR(90 - 45);
  const rOuter = zToR(90 - 30);
  ctx.fillStyle = "rgba(80, 180, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.strokeStyle = "rgba(80, 180, 255, 0.85)";
  ctx.lineWidth = lineUnit * 1.5;
  ctx.setLineDash([lineUnit * 6, lineUnit * 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, zToR(60), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArcs() {
  const { arcMajorStep: maj, arcMinorStep: min } = grid;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = lineUnit;
  if (min > 0) {
    ctx.globalAlpha = 0.25;
    for (let E = 0; E < 90; E += min) {
      if (Math.abs(E % maj) < 1e-6) continue;
      const z = 90 - E;
      if (z > halfFov) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, zToR(z), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let E = 0; E <= 90; E += maj) {
    const z = 90 - E;
    if (z > halfFov) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, zToR(z), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSpokes() {
  const { spokeMajorCount: majN, spokeMinorCount: minN } = grid;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = lineUnit;
  const majStep = 360 / majN;
  if (minN > 0) {
    const minStep = 360 / minN;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < minN; i++) {
      const A = i * minStep;
      if (Math.abs(((A % majStep) + majStep) % majStep) < 1e-6) continue;
      const [x, y] = azToXY(R, A);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < majN; i++) {
    const A = i * majStep;
    const [x, y] = azToXY(R, A);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSections() {
  const count = grid.sections;
  if (count <= 0) return;
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = lineUnit * 2.5;
  ctx.globalAlpha = 0.95;
  const step = 360 / count;
  for (let i = 0; i < count; i++) {
    const A = i * step;
    const [x, y] = azToXY(R, A);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  const baseFont = Math.max(12, Math.round(canvas.width / 80));
  ctx.font = `bold ${baseFont}px ${FONT}`;
  ctx.fillStyle = overlays.lineColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < count; i++) {
    const A = i * step + step / 2;
    const [x, y] = azToXY(R * 0.93, A);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-A * Math.PI) / 180 + Math.PI);
    ctx.fillText(String(i + 1), 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawHorizon() {
  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = lineUnit * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

function drawZenithDot() {
  ctx.fillStyle = overlays.lineColor;
  ctx.beginPath();
  ctx.arc(cx, cy, lineUnit * 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGridLabels() {
  const size = canvas.width;
  const baseFont = Math.max(10, Math.round(size / 120));
  ctx.font = `${baseFont}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cardinals = [
    { A: 0, rot: 0 },
    { A: 90, rot: Math.PI / 2 },
    { A: 180, rot: Math.PI },
    { A: 270, rot: -Math.PI / 2 },
  ];
  for (const { A, rot } of cardinals) {
    for (let E = grid.arcMajorStep; E < 90; E += grid.arcMajorStep) {
      const z = 90 - E;
      if (z > halfFov) continue;
      const [x, y] = azToXY(zToR(z), A);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = overlays.background;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-baseFont * 0.95, -baseFont * 0.6, baseFont * 1.9, baseFont * 1.2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = overlays.lineColor;
      ctx.fillText(String(E), 0, 0);
      ctx.restore();
    }
  }

  const labelR = R + baseFont * 1.2;
  const azStep = Math.max(10, Math.round(360 / grid.spokeMajorCount));
  ctx.fillStyle = overlays.lineColor;
  for (let A = 0; A < 360; A += azStep) {
    const [x, y] = azToXY(labelR, A);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((A * Math.PI) / 180);
    ctx.fillText(String(A), 0, 0);
    ctx.restore();
  }
}

function drawRamp() {
  const size = canvas.width;
  const rampA = 45;
  const rampInnerR = zToR(80);
  const rampOuterR = zToR(10);
  const rampWidth = size * 0.025;
  const steps = 256;
  const a = (rampA * Math.PI) / 180;
  const perpX = Math.cos(a);
  const perpY = -Math.sin(a);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const t2 = (i + 1) / (steps - 1);
    const rr = rampInnerR + (rampOuterR - rampInnerR) * t;
    const rrNext = rampInnerR + (rampOuterR - rampInnerR) * t2;
    const [x1, y1] = azToXY(rr, rampA);
    const [x2, y2] = azToXY(rrNext, rampA);
    const v = Math.round(t * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.moveTo(x1 - (perpX * rampWidth) / 2, y1 - (perpY * rampWidth) / 2);
    ctx.lineTo(x1 + (perpX * rampWidth) / 2, y1 + (perpY * rampWidth) / 2);
    ctx.lineTo(x2 + (perpX * rampWidth) / 2, y2 + (perpY * rampWidth) / 2);
    ctx.lineTo(x2 - (perpX * rampWidth) / 2, y2 - (perpY * rampWidth) / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPoints() {
  const size = canvas.width;
  const clusterAz = [135, 225, 315];
  const clusterR = zToR(30);
  ctx.fillStyle = overlays.lineColor;
  for (const A of clusterAz) {
    const [cx0, cy0] = azToXY(clusterR, A);
    const spacing = size / 85;
    for (let p = 1; p <= 4; p++) {
      const px = cx0 + (p - 2.5) * spacing;
      const py = cy0;
      ctx.fillRect(px - p / 2, py - p / 2, p, p);
    }
  }
}

function drawTypography() {
  for (const t of texts) drawArcText(t);
}

function drawArcText({ text, elevation, azimuth, size, flip }) {
  const z = 90 - elevation;
  if (z > halfFov || z < 0) return;
  const r = zToR(z);
  if (r <= 2 || !text) return;

  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = overlays.lineColor;

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0);
  const totalAngDeg = (total / r) * (180 / Math.PI);

  const dir = flip ? -1 : 1;
  let cursorDeg = azimuth - (dir * totalAngDeg) / 2;

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    const charAng = (w / r) * (180 / Math.PI);
    const Adeg = cursorDeg + (dir * charAng) / 2;
    const Arad = (Adeg * Math.PI) / 180;
    const x = cx + r * Math.sin(Arad);
    const y = cy + r * Math.cos(Arad);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Arad + (flip ? Math.PI : 0));
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    cursorDeg += dir * charAng;
  }
}

function drawSignature() {
  if (!overlays.gridLabels) return;
  const size = canvas.width;
  const sigFont = Math.max(10, Math.round(size / 140));
  ctx.font = `${sigFont}px ${FONT}`;
  ctx.fillStyle = overlays.lineColor;
  ctx.globalAlpha = 0.5;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    `testbild-360 · ${size}×${size} · fov ${output.fov}° · azimuthal equidistant`,
    cx,
    size - sigFont * 0.6,
  );
  ctx.globalAlpha = 1;
}

// ── Export ──────────────────────────────────────────────────────────────────
function downloadPNG() {
  render();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dome-testpattern-${output.resolution}-fov${output.fov}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

// ── lil-gui ─────────────────────────────────────────────────────────────────
const gui = new GUI({ title: "Testbild 360" });

const outputFolder = gui.addFolder("Output");
outputFolder.add(output, "resolution", [1024, 2048, 4096, 8192]).name("Resolution").onChange(render);
outputFolder.add(output, "fov", [180, 220]).name("FOV (aperture °)").onChange(render);

const gridFolder = gui.addFolder("Grid");
gridFolder.add(grid, "arcMajorStep", 1, 45, 1).name("Arc major step °").onChange(render);
gridFolder.add(grid, "arcMinorStep", 0, 45, 1).name("Arc minor step °").onChange(render);
gridFolder.add(grid, "spokeMajorCount", 1, 360, 1).name("Spoke major count").onChange(render);
gridFolder.add(grid, "spokeMinorCount", 0, 720, 1).name("Spoke minor count").onChange(render);
gridFolder.add(grid, "sections", 0, 36, 1).name("Sections (wedges)").onChange(render);

const overlaysFolder = gui.addFolder("Overlays");
overlaysFolder.add(overlays, "sweetSpot").name("Sweet-spot (30–45°)").onChange(render);
overlaysFolder.add(overlays, "ramp").name("Greyscale ramp").onChange(render);
overlaysFolder.add(overlays, "points").name("Point spreads").onChange(render);
overlaysFolder.add(overlays, "gridLabels").name("Grid labels").onChange(render);
overlaysFolder.addColor(overlays, "lineColor").name("Line colour").onChange(render);
overlaysFolder.addColor(overlays, "background").name("Background").onChange(render);

// Typography folder with dynamic add/remove
const typoFolder = gui.addFolder("Typography");
const textFolders = [];

function createTextFolder(item) {
  const folder = typoFolder.addFolder(`${textFolders.length + 1}. ${item.text.slice(0, 18)}`);
  folder
    .add(item, "text")
    .name("Text")
    .onChange((v) => {
      folder.title(`${texts.indexOf(item) + 1}. ${v.slice(0, 18)}`);
      render();
    });
  folder.add(item, "elevation", 0, 90, 0.5).name("Elevation °").onChange(render);
  folder.add(item, "azimuth", 0, 360, 0.5).name("Azimuth °").onChange(render);
  folder.add(item, "size", 8, 256, 1).name("Size px").onChange(render);
  folder.add(item, "flip").name("Flip").onChange(render);
  folder.add(
    {
      remove() {
        const i = texts.indexOf(item);
        if (i >= 0) texts.splice(i, 1);
        folder.destroy();
        textFolders.splice(textFolders.indexOf(folder), 1);
        render();
      },
    },
    "remove",
  ).name("− Remove");
  textFolders.push(folder);
}

typoFolder.add(
  {
    add() {
      const item = { text: "TEXT", elevation: 30, azimuth: 0, size: 48, flip: false };
      texts.push(item);
      createTextFolder(item);
      render();
    },
  },
  "add",
).name("+ Add Text");

// Seed UI for initial text items
for (const t of texts) createTextFolder(t);

// Export
gui.add({ exportPNG: downloadPNG }, "exportPNG").name("Export PNG");

// Roadmap placeholders — other generators/converters planned
const roadmap = gui.addFolder("Roadmap (planned)");
roadmap.add({ info: "equirectangular test pattern" }, "info").disable();
roadmap.add({ info: "cylindrical panorama" }, "info").disable();
roadmap.add({ info: "fish2sphere  (fisheye → equirect)" }, "info").disable();
roadmap.add({ info: "sphere2fish  (equirect → fisheye)" }, "info").disable();
roadmap.add({ info: "cube ↔ fisheye" }, "info").disable();
roadmap.close();

render();
