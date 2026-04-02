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
  crt?: CrtOptions
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
    audioDataUrl,
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
    window.togglePlay=function(){if(playing){playing=false;pp.textContent='Play';${audioDataUrl ? "if(aud)aud.pause();" : ''}}else{playing=true;pp.textContent='Pause';${audioDataUrl ? "if(aud)aud.play();" : ''}run();}};
    window.seekTo=function(f){frame=f;buildCache(f);render();updateControls();${audioDataUrl ? "if(aud)aud.currentTime=f/fps;" : ''}};`
    : ''

  const crt = options.crt
  const crtCss = crt?.enabled ? generateCrtCss(crt) : ''
  const crtHtml = crt?.enabled ? generateCrtHtml(crt) : ''
  const wrapStart = crt?.enabled ? '<div class="crt-wrap">' : ''
  const wrapEnd = crt?.enabled ? `${crtHtml}</div>` : ''

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
<script>
(function(){
var F=${framesJson};
${audioDataUrl ? 'var aud=document.getElementById("aud");var fps=' + fps + ';' : ''}
var D=function(s){return s.replace(/~(\\d+)~(.)/g,function(_,n,c){var r='';for(var i=0;i<+n;i++)r+=c;return r;});};
var canvas=document.getElementById('c');
var ctx=canvas.getContext('2d');
var fps=${fps};
var loopMode=${loopJson};
var frame=0;
var playCount=0;
var playing=true;
var cache=null;
var cacheFrame=-1;

ctx.font='${fontSize}px ${fontFamily}, monospace';
ctx.textBaseline='top';

function buildCache(target){
  // Find nearest keyframe at or before target
  var kf=0;
  for(var i=target;i>=0;i--){if(typeof F[i]==='string'){kf=i;break;}}
  cache=D(F[kf]).split('');
  cacheFrame=kf;
  // Apply deltas forward
  for(var i=kf+1;i<=target;i++){
    var d=F[i];
    if(typeof d==='string'){cache=D(d).split('');cacheFrame=i;continue;}
    for(var j=0;j<d.length;j++){
      var p=d[j][0],s=d[j][1];
      for(var k=0;k<s.length;k++)cache[p+k]=s[k];
    }
    cacheFrame=i;
  }
}

function getFrameText(idx){
  if(cache===null||idx===0||cacheFrame!==idx-1){buildCache(idx);return cache.join('');}
  var f=F[idx];
  if(typeof f==='string'){cache=D(f).split('');cacheFrame=idx;return cache.join('');}
  for(var j=0;j<f.length;j++){
    var p=f[j][0],s=f[j][1];
    for(var k=0;k<s.length;k++)cache[p+k]=s[k];
  }
  cacheFrame=idx;
  return cache.join('');
}

function render(){
  var text=getFrameText(frame);
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
    cache=null;cacheFrame=-1;
    if(loopMode==='once'||(typeof loopMode==='number'&&playCount>=loopMode)){
      playing=false;
      ${audioDataUrl ? "if(aud)aud.pause();" : ''}
      ${showControls ? "if(pp)pp.textContent='Play';" : ''}
      return;
    }
  }
  setTimeout(run,1000/fps);
}
${controlsJs}
${autoplay ? `${audioDataUrl ? "if(aud)aud.play();" : ''}run();` : `playing=false;canvas.onclick=function(){playing=true;${audioDataUrl ? "if(aud)aud.play();" : ''}run();canvas.onclick=null;};`}
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
