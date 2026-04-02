import type { AsciiFrame, ColorMode } from '@asciify/encoder'
import { deltaEncode } from '@asciify/encoder'
import type { ExportLoop } from '@/lib/constants'
import { createGlyphAtlas } from '@/lib/glyph-atlas'
import { generateCrtCss, generateCrtHtml } from '@/components/preview/crt-overlay'

export interface WebGPUExportOptions {
  frames: AsciiFrame[]
  rows: number
  columns: number
  fps: number
  loop: ExportLoop
  autoplay: boolean
  canvasWidth: number
  fontFamily: string
  fontSize: number
  fgColor: string
  bgColor: string
  colorMode: ColorMode
  showControls: boolean
  audioDataUrl: string | null
  crt?: {
    enabled: boolean
    vignette: number
    roundedCorners: number
    scanlines: number
    curvature: number
  }
}

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function hexToRgb255(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function packFrameCells(
  frame: AsciiFrame,
  columns: number,
  rows: number,
  charToIndex: Map<string, number>,
): Uint32Array {
  const data = new Uint32Array(columns * rows)
  for (let row = 0; row < frame.cells.length && row < rows; row++) {
    for (let col = 0; col < frame.cells[row].length && col < columns; col++) {
      const cell = frame.cells[row][col]
      const ci = charToIndex.get(cell.char) ?? 0
      data[row * columns + col] =
        ci | ((cell.r & 0xff) << 8) | ((cell.g & 0xff) << 16) | ((cell.b & 0xff) << 24)
    }
  }
  return data
}

function uint32ArrayToBase64(arr: Uint32Array): string {
  const bytes = new Uint8Array(arr.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function generateWebGPUExportHtml(options: WebGPUExportOptions): string {
  const {
    frames,
    rows,
    columns,
    fps,
    loop,
    autoplay,
    fontFamily,
    fontSize,
    fgColor,
    bgColor,
    colorMode,
    showControls,
  } = options

  const charset = buildCharset(frames)
  const atlas = createGlyphAtlas(charset, fontFamily, fontSize)
  const atlasDataUrl = atlas.canvas.toDataURL('image/png')
  const charToIndex = atlas.charToIndex

  // Delta encode text frames (for Canvas2D fallback and monochrome WebGPU)
  const keyframeInterval = fps * 2
  const { frames: encodedFrames } = deltaEncode(
    frames.map((f) => f.text),
    keyframeInterval,
  )

  // For colored mode, pack per-cell binary data (charIndex + RGB per cell)
  const isColored = colorMode === 'colored'
  const isMonoscale = colorMode === 'monoscale'
  let packedFramesB64: string[] | null = null
  if (isColored || isMonoscale) {
    packedFramesB64 = frames.map((f) =>
      uint32ArrayToBase64(packFrameCells(f, columns, rows, charToIndex)),
    )
  }

  const framesJson = JSON.stringify(encodedFrames)
  const loopJson = JSON.stringify(loop)
  const [bgR, bgG, bgB] = hexToRgb01(bgColor)
  const [fgR, fgG, fgB] = hexToRgb01(fgColor)
  const [fgR255, fgG255, fgB255] = hexToRgb255(fgColor)
  const colorModeNum = isColored ? 1 : colorMode === 'inverted' ? 2 : isMonoscale ? 3 : 0
  const lineHeight = Math.ceil(fontSize * 1.2)
  const canvasW = Math.ceil(atlas.charWidth * columns)
  const canvasH = rows * lineHeight

  const controlsHtml = showControls
    ? `<div id="ctrls" style="display:flex;align-items:center;gap:8px;margin-top:8px;font-family:sans-serif;font-size:12px;color:${fgColor}">
    <button id="pp" onclick="togglePlay()" style="background:none;border:1px solid ${fgColor};color:${fgColor};padding:4px 12px;cursor:pointer;border-radius:4px">${autoplay ? 'Pause' : 'Play'}</button>
    <input id="sb" type="range" min="0" max="${encodedFrames.length - 1}" value="0" style="flex:1" oninput="seekTo(+this.value)">
    <span id="fi">0/${encodedFrames.length}</span>
  </div>`
    : ''

  // Packed binary frames for colored mode (base64 array)
  const packedDataVar = isColored
    ? `var PF=${JSON.stringify(packedFramesB64)};
function b64toU32(b){var s=atob(b),n=s.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=s.charCodeAt(i);return new Uint32Array(u.buffer);}
`
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
${options.crt?.enabled ? generateCrtCss(options.crt) : ''}
</style>
</head>
<body>
${options.crt?.enabled ? '<div class="crt-wrap">' : ''}<canvas id="c" width="${canvasW}" height="${canvasH}"></canvas>${options.crt?.enabled ? generateCrtHtml(options.crt) + '</div>' : ''}
${options.audioDataUrl ? `<audio id="aud" src="${options.audioDataUrl}" preload="auto"></audio>` : ''}
${controlsHtml}
<script>
(function(){
var F=${framesJson};
var COLS=${columns},ROWS=${rows},FPS=${fps},LOOP=${loopJson};
var CHARSET=${JSON.stringify(charset)};
var CMAP={};for(var i=0;i<CHARSET.length;i++)CMAP[CHARSET[i]]=i;
var FG255=[${fgR255},${fgG255},${fgB255}];
var CM=${colorModeNum};
${packedDataVar}
var D=function(s){return s.replace(/~(\\d+)~(.)/g,function(_,n,c){var r='';for(var i=0;i<+n;i++)r+=c;return r;});};
var cache=null,cacheFrame=-1;
function buildCache(t){var kf=0;for(var i=t;i>=0;i--){if(typeof F[i]==='string'){kf=i;break;}}cache=D(F[kf]).split('');cacheFrame=kf;for(var i=kf+1;i<=t;i++){var d=F[i];if(typeof d==='string'){cache=D(d).split('');cacheFrame=i;continue;}for(var j=0;j<d.length;j++){var p=d[j][0],s=d[j][1];for(var k=0;k<s.length;k++)cache[p+k]=s[k];}cacheFrame=i;}}
function getFrame(idx){if(cache===null||idx===0||cacheFrame!==idx-1){buildCache(idx);return cache.join('');}var f=F[idx];if(typeof f==='string'){cache=D(f).split('');cacheFrame=idx;return cache.join('');}for(var j=0;j<f.length;j++){var p=f[j][0],s=f[j][1];for(var k=0;k<s.length;k++)cache[p+k]=s[k];}cacheFrame=idx;return cache.join('');}

var frame=0,playCount=0,playing=${autoplay},renderFrame=null;
${options.audioDataUrl ? 'var aud=document.getElementById("aud");' : ''}

${showControls ? `
var pp=document.getElementById('pp'),sb=document.getElementById('sb'),fi=document.getElementById('fi');
function updateControls(){if(sb)sb.value=frame;if(fi)fi.textContent=frame+'/'+F.length;}
window.togglePlay=function(){if(playing){playing=false;if(pp)pp.textContent='Play';${options.audioDataUrl ? "if(aud)aud.pause();" : ''}}else{playing=true;if(pp)pp.textContent='Pause';${options.audioDataUrl ? "if(aud)aud.play();" : ''}run();}};
window.seekTo=function(f){frame=f;if(renderFrame)renderFrame();${showControls ? 'updateControls();' : ''}${options.audioDataUrl ? "if(aud)aud.currentTime=f/FPS;" : ''}};
` : ''}

function run(){
  if(!playing)return;
  if(renderFrame)renderFrame();
  ${showControls ? 'updateControls();' : ''}
  frame++;
  if(frame>=F.length){frame=0;playCount++;cache=null;cacheFrame=-1;
    if(LOOP==='once'||(typeof LOOP==='number'&&playCount>=LOOP)){playing=false;${options.audioDataUrl ? "if(aud)aud.pause();" : ''}${showControls ? "if(pp)pp.textContent='Play';" : ''}return;}
  }
  setTimeout(run,1000/FPS);
}

function initCanvas2D(){
  var c=document.getElementById('c');
  var ctx=c.getContext('2d');
  ctx.font='${fontSize}px ${fontFamily}, monospace';
  ctx.textBaseline='top';
  ${isColored ? `
  var cw=ctx.measureText('M').width;
  renderFrame=function(){
    ctx.fillStyle='${bgColor}';ctx.fillRect(0,0,c.width,c.height);
    if(typeof PF!=='undefined'&&PF[frame]){
      var d=b64toU32(PF[frame]);
      for(var r=0;r<ROWS;r++){for(var co=0;co<COLS;co++){
        var pk=d[r*COLS+co];var ch=CHARSET[pk&0xFF]||' ';
        if(ch===' ')continue;
        var cr=(pk>>8)&0xFF,cg=(pk>>16)&0xFF,cb=(pk>>24)&0xFF;
        ctx.fillStyle='rgb('+cr+','+cg+','+cb+')';
        ctx.fillText(ch,co*cw,r*${lineHeight});
      }}
    }
  };` : isMonoscale ? `
  var cw=ctx.measureText('M').width;
  renderFrame=function(){
    ctx.fillStyle='${bgColor}';ctx.fillRect(0,0,c.width,c.height);
    if(typeof PF!=='undefined'&&PF[frame]){
      var d=b64toU32(PF[frame]);
      for(var r=0;r<ROWS;r++){for(var co=0;co<COLS;co++){
        var pk=d[r*COLS+co];var ch=CHARSET[pk&0xFF]||' ';
        if(ch===' ')continue;
        var cr=(pk>>8)&0xFF,cg=(pk>>16)&0xFF,cb=(pk>>24)&0xFF;
        var lm=Math.round(0.299*cr+0.587*cg+0.114*cb);
        ctx.fillStyle='rgb('+lm+','+lm+','+lm+')';
        ctx.fillText(ch,co*cw,r*${lineHeight});
      }}
    }
  };` : `
  renderFrame=function(){
    var text=getFrame(frame);
    ctx.fillStyle='${bgColor}';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='${fgColor}';
    var lines=text.split('\\n');
    for(var i=0;i<lines.length;i++)ctx.fillText(lines[i],0,i*${lineHeight});
  };`}
  renderFrame();
  if(playing){${options.audioDataUrl ? "if(aud)aud.play();" : ''}run();}
}

async function initWebGPU(){
  if(!navigator.gpu)throw new Error('no gpu');
  var adapter=await navigator.gpu.requestAdapter();
  if(!adapter)throw new Error('no adapter');
  var device=await adapter.requestDevice();
  var fmt=navigator.gpu.getPreferredCanvasFormat();
  var c=document.getElementById('c');
  var gpuCtx=c.getContext('webgpu');
  if(!gpuCtx)throw new Error('no webgpu context');
  gpuCtx.configure({device:device,format:fmt,alphaMode:'opaque'});

  var img=new Image();img.src="${atlasDataUrl}";
  await new Promise(function(r){img.onload=r;img.onerror=function(){throw new Error('atlas');};});
  var ac=document.createElement('canvas');ac.width=img.width;ac.height=img.height;
  var actx=ac.getContext('2d');actx.drawImage(img,0,0);
  var atlasData=actx.getImageData(0,0,ac.width,ac.height);

  var atlasTex=device.createTexture({size:[ac.width,ac.height],format:'rgba8unorm',usage:0x04|0x02});
  device.queue.writeTexture({texture:atlasTex},atlasData.data,{bytesPerRow:ac.width*4},[ac.width,ac.height]);
  var cellBuf=device.createBuffer({size:COLS*ROWS*4,usage:0x80|0x08});
  var uBuf=device.createBuffer({size:80,usage:0x40|0x08});

  var ud=new ArrayBuffer(80);var u32v=new Uint32Array(ud);var f32v=new Float32Array(ud);
  u32v[0]=COLS;u32v[1]=ROWS;u32v[2]=${atlas.atlasColumns};u32v[3]=${atlas.atlasRows};
  f32v[4]=${atlas.charWidth};f32v[5]=${atlas.charHeight};f32v[6]=${atlas.canvas.width};f32v[7]=${atlas.canvas.height};
  f32v[8]=${bgR};f32v[9]=${bgG};f32v[10]=${bgB};
  f32v[11]=${fgR};f32v[12]=${fgG};f32v[13]=${fgB};
  u32v[14]=${colorModeNum};u32v[15]=0;
  device.queue.writeBuffer(uBuf,0,ud);

  var vs=device.createShaderModule({code:
    '@vertex fn main(@builtin(vertex_index) vi:u32)->@builtin(position) vec4<f32>{'+
    'var p=array<vec2<f32>,3>(vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));'+
    'return vec4(p[vi],0.0,1.0);}'
  });
  var fs=device.createShaderModule({code:
    'struct P{gC:u32,gR:u32,aC:u32,aR:u32,cW:f32,cH:f32,aW:f32,aH:f32,bR:f32,bG:f32,bB:f32,fR:f32,fG:f32,fB:f32,cm:u32,pd:u32};'+
    '@group(0)@binding(0)var<storage,read>cells:array<u32>;'+
    '@group(0)@binding(1)var<uniform>p:P;'+
    '@group(0)@binding(2)var t:texture_2d<f32>;'+
    '@fragment fn main(@builtin(position)fc:vec4<f32>)->@location(0)vec4<f32>{'+
    'let cW=f32(p.gC)*p.cW;let cH=f32(p.gR)*p.cH;'+
    'let uv=fc.xy/vec2(cW,cH);'+
    'let bg=vec4(p.bR,p.bG,p.bB,1.0);'+
    'if(uv.x>1.0||uv.y>1.0){return bg;}'+
    'let gx=min(u32(uv.x*f32(p.gC)),p.gC-1u);'+
    'let gy=min(u32(uv.y*f32(p.gR)),p.gR-1u);'+
    'let ci=gy*p.gC+gx;'+
    'if(ci>=arrayLength(&cells)){return bg;}'+
    'let pk=cells[ci];let ch=pk&0xFFu;'+
    'let r=f32((pk>>8u)&0xFFu)/255.0;let g=f32((pk>>16u)&0xFFu)/255.0;let b=f32((pk>>24u)&0xFFu)/255.0;'+
    'let cuv=fract(uv*vec2(f32(p.gC),f32(p.gR)));'+
    'let ac2=ch%p.aC;let ar=ch/p.aC;'+
    'let tx=u32((f32(ac2)+cuv.x)*p.cW);let ty=u32((f32(ar)+cuv.y)*p.cH);'+
    'let gl=textureLoad(t,vec2(tx,ty),0);let a=gl.r;'+
    'var col=vec3(p.fR,p.fG,p.fB);'+
    'if(p.cm==1u){col=vec3(r,g,b);}else if(p.cm==3u){let lm=0.299*r+0.587*g+0.114*b;col=vec3(lm,lm,lm);}'+
    'return vec4(mix(vec3(p.bR,p.bG,p.bB),col,a),1.0);}'
  });

  var bgl=device.createBindGroupLayout({entries:[
    {binding:0,visibility:0x02,buffer:{type:'read-only-storage'}},
    {binding:1,visibility:0x02,buffer:{type:'uniform'}},
    {binding:2,visibility:0x02,texture:{sampleType:'float'}}
  ]});
  var pipe=device.createRenderPipeline({
    layout:device.createPipelineLayout({bindGroupLayouts:[bgl]}),
    vertex:{module:vs,entryPoint:'main'},
    fragment:{module:fs,entryPoint:'main',targets:[{format:fmt}]},
    primitive:{topology:'triangle-list'}
  });
  var bg=device.createBindGroup({layout:bgl,entries:[
    {binding:0,resource:{buffer:cellBuf}},{binding:1,resource:{buffer:uBuf}},
    {binding:2,resource:atlasTex.createView()}
  ]});

  renderFrame=function(){
    try{
      var data;
      ${isColored ? `
      // Colored mode: use pre-packed binary cell data with per-cell RGB
      if(typeof PF!=='undefined'&&PF[frame]){
        data=b64toU32(PF[frame]);
      }else{` : '{'}
        // Monochrome/inverted: pack from text with uniform foreground color
        var text=getFrame(frame);var lines=text.split('\\n');
        data=new Uint32Array(COLS*ROWS);
        for(var r=0;r<lines.length&&r<ROWS;r++){
          for(var co=0;co<lines[r].length&&co<COLS;co++){
            var ch=lines[r][co];var ci2=CMAP[ch]||0;
            data[r*COLS+co]=ci2|(FG255[0]<<8)|(FG255[1]<<16)|(FG255[2]<<24);
          }
        }
      }
      device.queue.writeBuffer(cellBuf,0,data.buffer);
      var tv=gpuCtx.getCurrentTexture().createView();
      var enc=device.createCommandEncoder();
      var pass=enc.beginRenderPass({colorAttachments:[{view:tv,loadOp:'clear',storeOp:'store',clearValue:{r:${bgR},g:${bgG},b:${bgB},a:1}}]});
      pass.setPipeline(pipe);pass.setBindGroup(0,bg);pass.draw(3);pass.end();
      device.queue.submit([enc.finish()]);
    }catch(e){console.error('WebGPU render failed:',e);initCanvas2D();}
  };
  renderFrame();
  if(playing){${options.audioDataUrl ? "if(aud)aud.play();" : ''}run();}
}

if(navigator.gpu){initWebGPU().catch(function(e){console.warn('WebGPU failed, using Canvas2D:',e);initCanvas2D();});}
else{initCanvas2D();}
})();
</script>
</body>
</html>`
}

function buildCharset(frames: AsciiFrame[]): string {
  const chars = new Set<string>()
  chars.add(' ')
  for (const frame of frames) {
    for (const row of frame.cells) {
      for (const cell of row) {
        chars.add(cell.char)
      }
    }
  }
  return Array.from(chars).join('')
}
