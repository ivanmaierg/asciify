import type { AsciiCell } from '@asciify/encoder'
import { createGlyphAtlas, type GlyphAtlas } from '@/lib/glyph-atlas'

const VERTEX_SHADER = `
@vertex
fn main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> {
  // Fullscreen triangle (3 vertices cover the screen)
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  return vec4<f32>(pos[vi], 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
struct Params {
  gridCols: u32,
  gridRows: u32,
  atlasCols: u32,
  atlasRows: u32,
  cellW: f32,
  cellH: f32,
  atlasW: f32,
  atlasH: f32,
  bgR: f32, bgG: f32, bgB: f32,
  fgR: f32, fgG: f32, fgB: f32,
  colorMode: u32,
  _pad: u32,
};

@group(0) @binding(0) var<storage, read> cells: array<u32>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var atlasTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let canvasW = f32(params.gridCols) * params.cellW;
  let canvasH = f32(params.gridRows) * params.cellH;
  let uv = fragCoord.xy / vec2<f32>(canvasW, canvasH);
  let bgCol = vec4<f32>(params.bgR, params.bgG, params.bgB, 1.0);

  if (uv.x > 1.0 || uv.y > 1.0) {
    return bgCol;
  }

  let gridX = min(u32(uv.x * f32(params.gridCols)), params.gridCols - 1u);
  let gridY = min(u32(uv.y * f32(params.gridRows)), params.gridRows - 1u);
  let cellIdx = gridY * params.gridCols + gridX;

  if (cellIdx >= arrayLength(&cells)) {
    return bgCol;
  }

  let packed = cells[cellIdx];
  let charIndex = packed & 0xFFu;
  let r = f32((packed >> 8u) & 0xFFu) / 255.0;
  let g = f32((packed >> 16u) & 0xFFu) / 255.0;
  let b = f32((packed >> 24u) & 0xFFu) / 255.0;

  let cellUV = fract(uv * vec2<f32>(f32(params.gridCols), f32(params.gridRows)));

  let atlasCol = charIndex % params.atlasCols;
  let atlasRow = charIndex / params.atlasCols;
  let tx = u32((f32(atlasCol) + cellUV.x) * params.cellW);
  let ty = u32((f32(atlasRow) + cellUV.y) * params.cellH);
  let glyph = textureLoad(atlasTex, vec2<u32>(tx, ty), 0);
  let alpha = glyph.r;

  var color = vec3<f32>(params.fgR, params.fgG, params.fgB);
  if (params.colorMode == 1u) {
    color = vec3<f32>(r, g, b);
  } else if (params.colorMode == 3u) {
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;
    color = vec3<f32>(lum, lum, lum);
  }

  let bg = vec3<f32>(params.bgR, params.bgG, params.bgB);
  return vec4<f32>(mix(bg, color, alpha), 1.0);
}
`

export interface WebGPURendererConfig {
  canvas: HTMLCanvasElement
  gridColumns: number
  gridRows: number
  charset: string
  fontFamily: string
  fontSize: number
  bgColor: [number, number, number]
  fgColor: [number, number, number]
  colorMode: number // 0=mono, 1=colored, 2=inverted, 3=monoscale
}

export class WebGPURenderer {
  private device!: GPUDevice
  private context!: GPUCanvasContext
  private pipeline!: GPURenderPipeline
  private bindGroup!: GPUBindGroup
  private cellBuffer!: GPUBuffer
  private uniformBuffer!: GPUBuffer
  private atlas!: GlyphAtlas
  private gridColumns: number
  private gridRows: number
  private destroyed = false

  private constructor() {
    this.gridColumns = 0
    this.gridRows = 0
  }

  static async isAvailable(): Promise<boolean> {
    if (!navigator.gpu) return false
    try {
      const adapter = await navigator.gpu.requestAdapter()
      return adapter !== null
    } catch {
      return false
    }
  }

  static async create(config: WebGPURendererConfig): Promise<WebGPURenderer> {
    const renderer = new WebGPURenderer()
    await renderer.init(config)
    return renderer
  }

  private async init(config: WebGPURendererConfig): Promise<void> {
    const adapter = await navigator.gpu!.requestAdapter()
    if (!adapter) throw new Error('No GPU adapter')
    this.device = await adapter.requestDevice()

    this.gridColumns = config.gridColumns
    this.gridRows = config.gridRows

    // Create glyph atlas
    this.atlas = createGlyphAtlas(config.charset, config.fontFamily, config.fontSize)

    // Size canvas to grid
    config.canvas.width = this.atlas.charWidth * config.gridColumns
    config.canvas.height = this.atlas.charHeight * config.gridRows

    // Configure context
    const preferredFormat = navigator.gpu!.getPreferredCanvasFormat()
    this.context = config.canvas.getContext('webgpu')!
    this.context.configure({
      device: this.device,
      format: preferredFormat,
      alphaMode: 'opaque',
    })

    // Create cell storage buffer
    const cellCount = config.gridColumns * config.gridRows
    this.cellBuffer = this.device.createBuffer({
      size: cellCount * 4,
      usage: 0x80 | 0x08, // STORAGE | COPY_DST
    })

    // Create uniform buffer (16 floats = 64 bytes, padded to 80 for alignment)
    this.uniformBuffer = this.device.createBuffer({
      size: 80,
      usage: 0x40 | 0x08, // UNIFORM | COPY_DST
    })
    this.writeUniforms(config)

    // Upload atlas texture
    const atlasTexture = this.device.createTexture({
      size: [this.atlas.canvas.width, this.atlas.canvas.height],
      format: 'rgba8unorm',
      usage: 0x04 | 0x02, // TEXTURE_BINDING | COPY_DST
    })

    // Get atlas pixel data
    const actx = this.atlas.canvas.getContext('2d')!
    const atlasImageData = actx.getImageData(0, 0, this.atlas.canvas.width, this.atlas.canvas.height)
    this.device.queue.writeTexture(
      { texture: atlasTexture },
      atlasImageData.data,
      { bytesPerRow: this.atlas.canvas.width * 4 },
      [this.atlas.canvas.width, this.atlas.canvas.height],
    )

    // Create shaders
    const vertModule = this.device.createShaderModule({ code: VERTEX_SHADER })
    const fragModule = this.device.createShaderModule({ code: FRAGMENT_SHADER })

    // Bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: 0x02, buffer: { type: 'read-only-storage' } }, // FRAGMENT
        { binding: 1, visibility: 0x02, buffer: { type: 'uniform' } },
        { binding: 2, visibility: 0x02, texture: { sampleType: 'float' } },
      ],
    })

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    })

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: vertModule, entryPoint: 'main' },
      fragment: {
        module: fragModule,
        entryPoint: 'main',
        targets: [{ format: preferredFormat }],
      },
      primitive: { topology: 'triangle-list' },
    })

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cellBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
        { binding: 2, resource: atlasTexture.createView() },
      ],
    })
  }

  private writeUniforms(config: {
    gridColumns: number
    gridRows: number
    bgColor: [number, number, number]
    fgColor: [number, number, number]
    colorMode: number
  }): void {
    // Struct layout (std140-ish, but WGSL uses its own rules):
    // u32 gridCols, u32 gridRows, u32 atlasCols, u32 atlasRows  (16 bytes)
    // f32 cellW, f32 cellH, f32 atlasW, f32 atlasH              (16 bytes)
    // f32 bgR, f32 bgG, f32 bgB, f32 fgR                        (16 bytes)
    // f32 fgG, f32 fgB, u32 colorMode, u32 _pad                 (16 bytes)
    // Total: 64 bytes
    const data = new ArrayBuffer(80)
    const u32 = new Uint32Array(data)
    const f32 = new Float32Array(data)

    u32[0] = config.gridColumns
    u32[1] = config.gridRows
    u32[2] = this.atlas.atlasColumns
    u32[3] = this.atlas.atlasRows
    f32[4] = this.atlas.charWidth
    f32[5] = this.atlas.charHeight
    f32[6] = this.atlas.canvas.width
    f32[7] = this.atlas.canvas.height
    f32[8] = config.bgColor[0]
    f32[9] = config.bgColor[1]
    f32[10] = config.bgColor[2]
    f32[11] = config.fgColor[0]
    f32[12] = config.fgColor[1]
    f32[13] = config.fgColor[2]
    u32[14] = config.colorMode
    u32[15] = 0

    this.device.queue.writeBuffer(this.uniformBuffer, 0, data)
  }

  updateFrame(cells: AsciiCell[][]): void {
    if (this.destroyed) return
    const data = new Uint32Array(this.gridColumns * this.gridRows)
    for (let row = 0; row < cells.length && row < this.gridRows; row++) {
      for (let col = 0; col < cells[row].length && col < this.gridColumns; col++) {
        const cell = cells[row][col]
        const ci = this.atlas.charToIndex.get(cell.char) ?? 0
        data[row * this.gridColumns + col] =
          ci | ((cell.r & 0xff) << 8) | ((cell.g & 0xff) << 16) | ((cell.b & 0xff) << 24)
      }
    }
    this.device.queue.writeBuffer(this.cellBuffer, 0, data.buffer as ArrayBuffer)
  }

  updateColors(
    bgColor: [number, number, number],
    fgColor: [number, number, number],
    colorMode: number,
  ): void {
    if (this.destroyed) return
    this.writeUniforms({
      gridColumns: this.gridColumns,
      gridRows: this.gridRows,
      bgColor,
      fgColor,
      colorMode,
    })
  }

  render(): void {
    if (this.destroyed) return
    const textureView = this.context.getCurrentTexture().createView()
    const encoder = this.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    })

    pass.setPipeline(this.pipeline)
    pass.setBindGroup(0, this.bindGroup)
    pass.draw(3)
    pass.end()

    this.device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.destroyed = true
    this.cellBuffer?.destroy()
    this.uniformBuffer?.destroy()
    this.device?.destroy()
  }
}
