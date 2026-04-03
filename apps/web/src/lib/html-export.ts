import type { ColorMode, EncodedFrame } from '@asciify/encoder'
import type { ExportLoop } from '@/lib/constants'
import { generateCrtCss, generateCrtHtml } from '@/components/preview/crt-overlay'

interface CrtOptions {
  enabled: boolean
  vignette: number
  roundedCorners: number
  scanlines: number
  curvature: number
}

interface ExportOptions {
  frames: EncodedFrame[]
  fps: number
  loop: ExportLoop
  autoplay: boolean
  canvasWidth: number
  canvasHeight: number
  fgColor: string
  bgColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  showControls: boolean
  colorMode: ColorMode
  audioDataUrl: string | null
  columns: number
  crt?: CrtOptions
}

let _playerBundleCache: string | null = null

async function getPlayerBundle(): Promise<string> {
  if (_playerBundleCache) return _playerBundleCache
  const res = await fetch('/player-bundle.js')
  if (!res.ok) throw new Error('Failed to load player bundle for export')
  _playerBundleCache = await res.text()
  return _playerBundleCache
}

export async function generateExportHtml(options: ExportOptions): Promise<string> {
  const {
    frames,
    fps,
    loop,
    autoplay,
    canvasWidth,
    canvasHeight,
    fgColor,
    bgColor,
    fontFamily,
    fontSize,
    lineHeight,
    showControls,
    audioDataUrl,
    colorMode,
    columns,
  } = options

  const playerBundleJs = await getPlayerBundle()

  const framesJson = JSON.stringify(frames)
  const loopJson = JSON.stringify(loop)
  const duration = frames.length / fps

  const controlsHtml = showControls
    ? `<div id="ctrls" style="display:flex;align-items:center;gap:8px;margin-top:8px;font-family:sans-serif;font-size:12px;color:${fgColor}">
    <button id="pp" style="background:none;border:1px solid ${fgColor};color:${fgColor};padding:4px 12px;cursor:pointer;border-radius:4px">${autoplay ? 'Pause' : 'Play'}</button>
    <input id="sb" type="range" min="0" max="${frames.length - 1}" value="0" style="flex:1">
    <span id="fi">0/${frames.length}</span>
  </div>`
    : ''

  const controlsBootstrapJs = showControls
    ? `
        var pp = document.getElementById('pp');
        var sb = document.getElementById('sb');
        var fi = document.getElementById('fi');
        if (pp) pp.onclick = function() {
          if (player.isPlaying) { player.pause(); pp.textContent = 'Play'; }
          else { player.play(); pp.textContent = 'Pause'; }
        };
        player.addEventListener('timeupdate', function(e) {
          var pct = player.currentTime / player.duration;
          if (sb) sb.value = Math.round(pct * ${frames.length - 1});
          if (fi) fi.textContent = Math.round(pct * ${frames.length}) + '/${frames.length}';
        });
        if (sb) sb.oninput = function() {
          player.seekTo(+this.value / ${fps});
        };`
    : ''

  const audioBootstrapJs = audioDataUrl
    ? `
        var aud = document.getElementById('aud');
        if (aud) {
          player.addEventListener('timeupdate', function() { aud.currentTime = player.currentTime; });
          player.ready.then(function() { if (${autoplay}) aud.play(); });
        }`
    : ''

  const crt = options.crt
  const crtCss = crt?.enabled ? generateCrtCss(crt) : ''
  const crtHtml = crt?.enabled ? generateCrtHtml(crt) : ''
  const wrapStart = crt?.enabled ? '<div class="crt-wrap">' : ''
  const wrapEnd = crt?.enabled ? `${crtHtml}</div>` : ''

  const bootstrapScript = `<script>
(function(){
  var data = {
    version: 1,
    metadata: {
      columns: ${columns},
      rows: 0,
      fps: ${fps},
      duration: ${duration},
      frameCount: ${frames.length},
      colorMode: ${JSON.stringify(colorMode)},
      charset: ''
    },
    frames: ${framesJson}
  };
  var canvas = document.getElementById('c');
  var player = new Asciify.AsciiPlayer(canvas, data, {
    fps: ${fps},
    loop: ${loopJson},
    autoplay: ${autoplay},
    font: '${fontSize}px ${fontFamily}, monospace',
    fgColor: '${fgColor}',
    bgColor: '${bgColor}',
    mode: 'grid'
  });
  player.ready.then(function() {
    ${controlsBootstrapJs}
    ${audioBootstrapJs}
  });
})();
<\/script>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ASCII Animation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${bgColor};display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:16px}
canvas{display:block;max-width:100%}
${crtCss}
</style>
</head>
<body>
${wrapStart}<canvas id="c" width="${canvasWidth}" height="${canvasHeight}"></canvas>${wrapEnd}
${audioDataUrl ? `<audio id="aud" src="${audioDataUrl}" preload="auto"></audio>` : ''}
${controlsHtml}
<script>${playerBundleJs}<\/script>
${bootstrapScript}
</body>
</html>`
}

export function downloadHtml(html: string, filename: string = 'ascii-animation.html') {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
