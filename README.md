# Audio Visualiser

A real-time audio-reactive 3D visualiser built with Three.js. Listens to microphone or system audio and drives shaders, particles, and post-processing with the frequency data.

## Features

- **Audio input** — choose between microphone or system/tab audio at launch
- **Particle sphere** — 5000 particles distributed on a sphere, expanding with bass and rippling with noise
- **Mouse interaction** — hold and drag to pull particles toward the cursor
- **GLB mesh shaders** — two custom Blender models with GLSL shaders driven by bass and mid frequencies
- **Background sphere** — animated SDF pattern shader with palette colouring reacting to bass
- **Bloom post-processing** — UnrealBloom strength driven by overall audio energy
- **Fullscreen** — double-click (desktop) or double-tap (mobile) to toggle
- **Mobile support** — touch events, system audio hidden on mobile

## Stack

- [Three.js](https://threejs.org/) — 3D rendering, shaders, post-processing
- Web Audio API — microphone and system audio capture + FFT analysis
- Vite — dev server and bundler

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser, choose an audio source and allow access when prompted.

## How it works

On launch the overlay asks for an audio source:
- **Microphone** — captures live mic input via `getUserMedia`
- **System Audio** — captures browser tab audio via `getDisplayMedia` (Chrome: select a tab and tick "Share tab audio")

The Web Audio `AnalyserNode` runs an FFT on the stream every frame, outputting 1024 frequency bins (0–255). These are averaged into bass (bins 0–7) and mid (bins 8–63) values, lag-smoothed, and passed as uniforms into the shaders.

## Controls

| Action | Result |
|---|---|
| Click + drag | Pull particles toward cursor |
| Double-click / double-tap | Toggle fullscreen |
| Scroll / pinch | Zoom |
| Click + drag (orbit) | Rotate camera |
