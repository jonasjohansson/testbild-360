import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const FONT = "ui-monospace, 'SF Mono', 'Fira Code', monospace";

// ── State ───────────────────────────────────────────────────────────────────
const output = {
  generator: "Dome",          // "Dome" | "Equirectangular"
  resolution: 2048,
  fov: 180,                   // dome only
};

const dome = {
  arcMajorStep: 10,
  arcMinorStep: 5,
  spokeMajorCount: 36,
  spokeMinorCount: 72,
  sections: 0,
};

const equirect = {
  latMajorStep: 15,
  latMinorStep: 5,
  lonMajorStep: 30,
  lonMinorStep: 10,
};

const overlays = {
  sweetSpot: true,      // dome
  points: false,        // dome
  gridLabels: true,
  lineColor: "#ffffff",
  background: "#000000",
};

// Typography items — shared between generators.
// Dome: uses (elevation, azimuth, flip) — curved along arcs.
// Equirect: uses (elevation→latitude, azimuth→longitude) — straight, horizontal.
const texts = [
  { text: "WELCOME TO THE DOME", elevation: 30, azimuth: 0, size: 64, flip: false },
];

// ── Render helpers (dome) ───────────────────────────────────────────────────
let cx, cy, R, halfFov, lineUnit;
const zToR = (z) => (z / halfFov) * R;
const azToXY = (rr, Adeg) => {
  const a = (Adeg * Math.PI) / 180;
  return [cx + rr * Math.sin(a), cy + rr * Math.cos(a)];
};

// ── Render dispatcher ───────────────────────────────────────────────────────
function render() {
  if (output.generator === "Equirectangular") renderEquirect();
  else renderDome();
  fitCanvas();
}

// ── Dome renderer ───────────────────────────────────────────────────────────
function renderDome() {
  const size = output.resolution;
  canvas.width = size;
  canvas.height = size;
  cx = size / 2;
  cy = size / 2;
  R = (size / 2) * 0.93;
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
  if (overlays.gridLabels) drawDomeLabels();
  if (overlays.points) drawPoints();
  drawTypographyDome();
  drawSignature(`${size}×${size} · fov ${output.fov}° · azimuthal equidistant`);
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
  const { arcMajorStep: maj, arcMinorStep: min } = dome;
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
  const { spokeMajorCount: majN, spokeMinorCount: minN } = dome;
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
  const count = dome.sections;
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

function drawDomeLabels() {
  const size = canvas.width;
  const baseFont = Math.max(10, Math.round(size / 120));
  ctx.font = `${baseFont}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Elevation labels on 4 cardinal axes — tops face center (read right-side-up from inside dome)
  const cardinals = [
    { A: 0, rot: 0 },
    { A: 90, rot: -Math.PI / 2 },
    { A: 180, rot: Math.PI },
    { A: 270, rot: Math.PI / 2 },
  ];
  for (const { A, rot } of cardinals) {
    for (let E = dome.arcMajorStep; E < 90; E += dome.arcMajorStep) {
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

  // Azimuth labels just outside the horizon ring — tops toward center
  const labelR = R + baseFont * 1.2;
  const azStep = Math.max(10, Math.round(360 / dome.spokeMajorCount));
  ctx.fillStyle = overlays.lineColor;
  for (let A = 0; A < 360; A += azStep) {
    const [x, y] = azToXY(labelR, A);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-A * Math.PI) / 180);
    ctx.fillText(String(A), 0, 0);
    ctx.restore();
  }
}

function drawPoints() {
  // 1/2/3/4-px clusters at each cardinal on the 60° elevation ring,
  // laid out tangent to the ring so the row reads naturally per direction.
  const size = canvas.width;
  const clusterR = zToR(30); // 60° elevation from horizon
  const cardinalAz = [0, 90, 180, 270];
  const spacing = Math.max(10, size / 120);
  ctx.fillStyle = overlays.lineColor;
  for (const A of cardinalAz) {
    const a = (A * Math.PI) / 180;
    const [cx0, cy0] = azToXY(clusterR, A);
    // tangent direction perpendicular to the radius
    const tx = Math.cos(a);
    const ty = -Math.sin(a);
    for (let p = 1; p <= 4; p++) {
      const offset = (p - 2.5) * spacing;
      const px = cx0 + tx * offset;
      const py = cy0 + ty * offset;
      ctx.fillRect(px - p / 2, py - p / 2, p, p);
    }
  }
}

function drawTypographyDome() {
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

// ── Equirectangular renderer ────────────────────────────────────────────────
function renderEquirect() {
  const W = output.resolution;
  const H = output.resolution / 2;
  canvas.width = W;
  canvas.height = H;
  const lu = Math.max(1, Math.round(W / 2048));

  ctx.fillStyle = overlays.background;
  ctx.fillRect(0, 0, W, H);

  const { latMajorStep: latMaj, latMinorStep: latMin,
          lonMajorStep: lonMaj, lonMinorStep: lonMin } = equirect;

  const xOf = (lon) => (lon / 360) * W;
  const yOf = (lat) => ((90 - lat) / 180) * H;

  ctx.strokeStyle = overlays.lineColor;
  ctx.lineWidth = lu;

  // minor meridians
  if (lonMin > 0) {
    ctx.globalAlpha = 0.25;
    for (let lon = 0; lon <= 360; lon += lonMin) {
      if (Math.abs(lon % lonMaj) < 1e-6) continue;
      const x = xOf(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.stroke();
    }
  }
  // major meridians
  ctx.globalAlpha = 0.9;
  for (let lon = 0; lon <= 360; lon += lonMaj) {
    const x = xOf(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }
  // minor parallels
  if (latMin > 0) {
    ctx.globalAlpha = 0.25;
    for (let lat = -90; lat <= 90; lat += latMin) {
      if (Math.abs(lat % latMaj) < 1e-6) continue;
      const y = yOf(lat);
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  // major parallels
  ctx.globalAlpha = 0.9;
  for (let lat = -90; lat <= 90; lat += latMaj) {
    const y = yOf(lat);
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // equator bold
  ctx.lineWidth = lu * 2;
  ctx.beginPath();
  ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
  ctx.stroke();

  // border
  ctx.strokeRect(lu / 2, lu / 2, W - lu, H - lu);

  // labels
  if (overlays.gridLabels) {
    const baseFont = Math.max(10, Math.round(W / 180));
    ctx.fillStyle = overlays.lineColor;
    ctx.font = `${baseFont}px ${FONT}`;

    // longitude labels at top
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let lon = 0; lon <= 360; lon += lonMaj) {
      if (lon === 360) continue;
      ctx.fillText(`${lon}°`, xOf(lon), baseFont * 0.5);
    }
    // latitude labels at left
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let lat = -90; lat <= 90; lat += latMaj) {
      ctx.fillText(`${lat}°`, baseFont * 0.5, yOf(lat));
    }
  }

  // typography — straight, centered at (lat, lon) from azimuth/elevation fields
  for (const t of texts) {
    if (!t.text) continue;
    ctx.font = `${t.size}px ${FONT}`;
    ctx.fillStyle = overlays.lineColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.text, xOf(t.azimuth), yOf(t.elevation));
  }

  drawSignature(`${W}×${H} · equirectangular 2:1`);
}

// ── Shared signature (footer) ───────────────────────────────────────────────
function drawSignature(label) {
  if (!overlays.gridLabels) return;
  const W = canvas.width;
  const H = canvas.height;
  const sigFont = Math.max(10, Math.round(W / 180));
  ctx.font = `${sigFont}px ${FONT}`;
  ctx.fillStyle = overlays.lineColor;
  ctx.globalAlpha = 0.5;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`testbild-360 · ${label}`, W / 2, H - sigFont * 0.6);
  ctx.globalAlpha = 1;
}

// ── Canvas fit (keeps aspect correct for dome vs equirect) ──────────────────
function fitCanvas() {
  const aspect = canvas.width / canvas.height;
  const pad = 16;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2;
  let w = maxW;
  let h = w / aspect;
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
    const kind = output.generator === "Equirectangular" ? "equirect" : "dome";
    const suffix = output.generator === "Equirectangular"
      ? `${output.resolution}x${output.resolution / 2}`
      : `${output.resolution}-fov${output.fov}`;
    a.download = `testbild-360-${kind}-${suffix}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

// ── lil-gui ─────────────────────────────────────────────────────────────────
const gui = new GUI({ title: "Testbild 360" });

// Output
const outputFolder = gui.addFolder("Output");
outputFolder
  .add(output, "generator", ["Dome", "Equirectangular"])
  .name("Generator")
  .onChange(() => { updateVisibility(); render(); });
outputFolder.add(output, "resolution", [1024, 2048, 4096, 8192]).name("Resolution").onChange(render);
const fovCtrl = outputFolder.add(output, "fov", [180, 220]).name("FOV (aperture °)").onChange(render);

// Dome grid
const domeFolder = gui.addFolder("Dome grid");
domeFolder.add(dome, "arcMajorStep", 1, 45, 1).name("Arc major step °").onChange(render);
domeFolder.add(dome, "arcMinorStep", 0, 45, 1).name("Arc minor step °").onChange(render);
domeFolder.add(dome, "spokeMajorCount", 1, 360, 1).name("Spoke major count").onChange(render);
domeFolder.add(dome, "spokeMinorCount", 0, 720, 1).name("Spoke minor count").onChange(render);
domeFolder.add(dome, "sections", 0, 36, 1).name("Sections (wedges)").onChange(render);

// Equirect grid
const equirectFolder = gui.addFolder("Equirect grid");
equirectFolder.add(equirect, "latMajorStep", 1, 90, 1).name("Lat major step °").onChange(render);
equirectFolder.add(equirect, "latMinorStep", 0, 45, 1).name("Lat minor step °").onChange(render);
equirectFolder.add(equirect, "lonMajorStep", 1, 180, 1).name("Lon major step °").onChange(render);
equirectFolder.add(equirect, "lonMinorStep", 0, 60, 1).name("Lon minor step °").onChange(render);

// Overlays
const overlaysFolder = gui.addFolder("Overlays");
const sweetCtrl = overlaysFolder.add(overlays, "sweetSpot").name("Sweet-spot (30–45°)").onChange(render);
const pointsCtrl = overlaysFolder.add(overlays, "points").name("Point spreads").onChange(render);
overlaysFolder.add(overlays, "gridLabels").name("Grid labels").onChange(render);
overlaysFolder.addColor(overlays, "lineColor").name("Line colour").onChange(render);
overlaysFolder.addColor(overlays, "background").name("Background").onChange(render);

// Typography
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
  folder.add(item, "elevation", -90, 90, 0.5).name("Elev/Lat °").onChange(render);
  folder.add(item, "azimuth", 0, 360, 0.5).name("Azim/Lon °").onChange(render);
  folder.add(item, "size", 8, 256, 1).name("Size px").onChange(render);
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
    const item = { text: "TEXT", elevation: 30, azimuth: 0, size: 48, flip: false };
    texts.push(item);
    createTextFolder(item);
    render();
  },
}, "add").name("+ Add Text");
for (const t of texts) createTextFolder(t);

// Export
gui.add({ exportPNG: downloadPNG }, "exportPNG").name("Export PNG");

// Roadmap
const roadmap = gui.addFolder("Roadmap (planned)");
roadmap.add({ info: "cylindrical panorama" }, "info").disable();
roadmap.add({ info: "fish2sphere  (fisheye → equirect)" }, "info").disable();
roadmap.add({ info: "sphere2fish  (equirect → fisheye)" }, "info").disable();
roadmap.add({ info: "cube ↔ fisheye" }, "info").disable();
roadmap.close();

// Show/hide generator-specific folders & overlays
function updateVisibility() {
  const isDome = output.generator === "Dome";
  domeFolder.show(isDome);
  equirectFolder.show(!isDome);
  fovCtrl.show(isDome);
  sweetCtrl.show(isDome);
  pointsCtrl.show(isDome);
}
updateVisibility();
render();
