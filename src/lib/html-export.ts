import type { ExportLoop, ColorMode } from '@/lib/constants'

interface ExportOptions {
  frames: string[]
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
  colorData?: string[]
}

export function generateExportHtml(options: ExportOptions): string {
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
  } = options

  const framesJson = JSON.stringify(frames)
  const loopJson = JSON.stringify(loop)

  const controlsHtml = showControls
    ? `<div id="ctrls" style="display:flex;align-items:center;gap:8px;margin-top:8px;font-family:sans-serif;font-size:12px;color:${fgColor}">
    <button id="pp" onclick="togglePlay()" style="background:none;border:1px solid ${fgColor};color:${fgColor};padding:4px 12px;cursor:pointer;border-radius:4px">Pause</button>
    <input id="sb" type="range" min="0" max="${frames.length - 1}" value="0" style="flex:1" oninput="seekTo(+this.value)">
    <span id="fi">0/${frames.length}</span>
  </div>`
    : ''

  const controlsJs = showControls
    ? `
    var pp=document.getElementById('pp'),sb=document.getElementById('sb'),fi=document.getElementById('fi');
    function updateControls(){if(sb)sb.value=frame;if(fi)fi.textContent=frame+'/'+F.length;}
    function togglePlay(){if(playing){playing=false;pp.textContent='Play';}else{playing=true;pp.textContent='Pause';run();}}
    function seekTo(f){frame=f;render();updateControls();}`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ASCII Animation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${bgColor};display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:16px}
canvas{display:block;max-width:100%}
</style>
</head>
<body>
<canvas id="c" width="${canvasWidth}" height="${canvasHeight}"></canvas>
${controlsHtml}
<script>
(function(){
var F=${framesJson};
var D=function(s){return s.replace(/~(\\d+)~(.)/g,function(_,n,c){var r='';for(var i=0;i<+n;i++)r+=c;return r;});};
var canvas=document.getElementById('c');
var ctx=canvas.getContext('2d');
var fps=${fps};
var loopMode=${loopJson};
var frame=0;
var playCount=0;
var playing=true;
var timer=null;

ctx.font='${fontSize}px ${fontFamily}, monospace';
ctx.textBaseline='top';

function render(){
  var text=D(F[frame]);
  ctx.fillStyle='${bgColor}';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='${fgColor}';
  var lines=text.split('\\n');
  for(var i=0;i<lines.length;i++){
    ctx.fillText(lines[i],0,i*${lineHeight});
  }
}

function run(){
  if(!playing)return;
  render();
  ${showControls ? 'updateControls();' : ''}
  frame++;
  if(frame>=F.length){
    frame=0;
    playCount++;
    if(loopMode==='once'||(typeof loopMode==='number'&&playCount>=loopMode)){
      playing=false;
      ${showControls ? "if(pp)pp.textContent='Play';" : ''}
      return;
    }
  }
  timer=setTimeout(run,1000/fps);
}
${controlsJs}
${autoplay ? 'run();' : "playing=false;canvas.onclick=function(){playing=true;run();canvas.onclick=null;};"}
})();
</script>
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
