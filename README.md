# testbild-360

Test patterns and projection conversion for fulldome, equirectangular, and panoramic imaging.

Browser-first. No build step. Canvas rendering, PNG export at dome-native resolutions (1024 → 8192).

Foundations: [Paul Bourke's dome work](https://paulbourke.net/dome/) — the canonical reference for fisheye math, warp meshes, and fulldome test patterns.

## Scope

Open `index.html`. Single-page tool, lil-gui controls, canvas render.

### Current
- Dome (azimuthal equidistant fisheye) test pattern — polar grid, elevation rings, azimuth spokes, sweet-spot band, greyscale ramp, point spreads, curved typography on arcs.

### Planned (roadmap panel in GUI)
- Equirectangular (2:1) test pattern
- Cylindrical panorama test pattern
- Converters: `fish2sphere`, `sphere2fish`, `cube ↔ fisheye`

Naming matches Bourke's CLI convention so the tools interoperate with the existing fulldome ecosystem (VLC-warp, warpplayer, Vuo).

## Fisheye mappings

Default is **angular equidistant** (r = f·θ) — what most fulldome content uses. Other supported mappings:
- Equisolid (r = 2f·sin(θ/2))
- Orthographic (r = f·sin(θ)) — capped at 180° FOV
- Stereographic (r = 2f·tan(θ/2))

## Conventions

- Fisheye output is **square**, centered, equidistant unless specified otherwise.
- Elevation is measured from horizon (0° = dome edge, 90° = zenith).
- Azimuth 0° sits at the bottom of the image (audience-front) and increases counter-clockwise on screen.
- Fisheye/equirect/cube are **projections**, not "distortions" (per Bourke).

## Test pattern contents (Bourke spec)

- Polar grid: 2-px white lines on black
- Elevation rings every 10° (0–90°)
- Azimuth spokes every 10°
- 255-step greyscale ramp (banding test)
- Point spreads 1–4 px (star quality)
- Small text at consistent pixel size across resolutions (legibility test)
- Sweet-spot band highlight (30–45° elevation)

**Rotating-movie test protocol:** export the pattern, encode as a slow 360° rotation (60 s). Motion reveals codec/scaler aliasing that static tests hide.

## Status

v0.1 — dome test pattern generator.
