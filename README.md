# ASCIIfy

Convert any video to animated ASCII art. Export a self-contained file that runs anywhere — no dependencies, no server, no player app.

## What it does

ASCIIfy turns video into animated ASCII art and exports portable artifacts: a single file you can drop into any website, share on Discord, open from a USB drive, or embed in a portfolio.

### Export formats

- **Self-contained HTML** — one `.html` file with an embedded canvas player. Works offline, forever, in any browser.
- **Web Component** — a single `.js` file usable in React, Vue, Svelte, plain HTML, WordPress, etc.
- **ES Module** — importable JavaScript module for programmatic use.
- **MP4 / WebM** — traditional video output via ffmpeg.wasm.
- **GIF** — animated GIF export.

## Tech stack

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [Tailwind CSS](https://tailwindcss.com) 4
- [shadcn/ui](https://ui.shadcn.com)
- [@chenglou/pretext](https://github.com/chenglou/pretext) — ASCII rendering
- [ffmpeg.wasm](https://github.com/nicedayfor/FFmpeg.wasm) — client-side video processing
- [Zustand](https://zustand.docs.pmnd.rs) — state management

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## License

Private.
