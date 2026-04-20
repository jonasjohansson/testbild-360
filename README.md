# testbild-360

Fulldome test pattern generator — azimuthal equidistant (fisheye) polar grid with curved typography on arcs.

Browser-first, no build step. Canvas rendering, PNG export at dome-native resolutions (512 → 8192). Transparent background by default.

Live: **https://testbild-360.jonasjohansson.se**

## Controls

- **Output** — resolution (512/1024/2048/4096/8192), FOV (180° / 220° domemaster)
- **Dome grid** — arc major/minor step in °, spoke major/minor count, optional labelled section wedges
- **Overlays** — point spreads, grid labels, degree ticks, line thickness, line colour, transparent / solid background
- **Typography** — any number of curved text items; each has font (OffBit / OPSPastPerfect / etc.), elevation, azimuth, size, letter spacing, flip (reverses reading direction)

## Conventions

- Elevation is measured from horizon: 0° = dome edge, 90° = zenith.
- Azimuth 0° sits at the bottom of the image (audience-front) and increases counter-clockwise on screen.
- Default mapping is angular equidistant (r = f·θ) — what most fulldome content uses.

## Foundations

Design follows [Paul Bourke's fulldome conventions](https://paulbourke.net/dome/) — azimuthal equidistant default, polar-grid test pattern ingredients, and the note that fisheye is a *projection*, not a "distortion."

## Fonts

OffBit (Regular / Bold / 101 / Dot / Bar) and OPSPastPerfect are included locally under `fonts/` — sourced from the [domedreaming-generator](https://github.com/jonasjohansson/domedreaming-generator) repo.
