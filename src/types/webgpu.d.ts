// Minimal WebGPU type declarations for ASCIIfy
// Only the interfaces we actually use

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>
  getPreferredCanvasFormat(): string
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance'
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>
}

interface GPUDeviceDescriptor {
  requiredFeatures?: string[]
  requiredLimits?: Record<string, number>
}

interface GPUDevice {
  queue: GPUQueue
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup
  createCommandEncoder(): GPUCommandEncoder
  destroy(): void
}

interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, offset: number, data: ArrayBuffer | ArrayBufferView): void
  writeTexture(destination: GPUTexelCopyTextureInfo, data: ArrayBuffer | ArrayBufferView, dataLayout: GPUTexelCopyBufferLayout, size: GPUExtent3D): void
  submit(commandBuffers: GPUCommandBuffer[]): void
}

interface GPUBuffer {
  size: number
  destroy(): void
}

interface GPUBufferDescriptor {
  size: number
  usage: number
  mappedAtCreation?: boolean
}

interface GPUTexture {
  createView(): GPUTextureView
  destroy(): void
}

interface GPUTextureView {}

interface GPUTextureDescriptor {
  size: GPUExtent3D
  format: string
  usage: number
}

type GPUExtent3D = [number, number, number?] | { width: number; height: number; depthOrArrayLayers?: number }

interface GPUSampler {}

interface GPUSamplerDescriptor {
  magFilter?: string
  minFilter?: string
}

interface GPUShaderModule {}

interface GPUShaderModuleDescriptor {
  code: string
}

interface GPUBindGroupLayout {}

interface GPUBindGroupLayoutDescriptor {
  entries: GPUBindGroupLayoutEntry[]
}

interface GPUBindGroupLayoutEntry {
  binding: number
  visibility: number
  buffer?: { type?: string }
  texture?: { sampleType?: string }
  sampler?: { type?: string }
  storageTexture?: { access?: string; format?: string }
}

interface GPUPipelineLayout {}

interface GPUPipelineLayoutDescriptor {
  bindGroupLayouts: GPUBindGroupLayout[]
}

interface GPURenderPipeline {}

interface GPURenderPipelineDescriptor {
  layout: GPUPipelineLayout | 'auto'
  vertex: { module: GPUShaderModule; entryPoint: string }
  fragment: { module: GPUShaderModule; entryPoint: string; targets: { format: string }[] }
  primitive?: { topology?: string }
}

interface GPUBindGroup {}

interface GPUBindGroupDescriptor {
  layout: GPUBindGroupLayout
  entries: GPUBindGroupEntry[]
}

interface GPUBindGroupEntry {
  binding: number
  resource: GPUTextureView | GPUSampler | { buffer: GPUBuffer; offset?: number; size?: number }
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder
  finish(): GPUCommandBuffer
}

interface GPURenderPassDescriptor {
  colorAttachments: GPURenderPassColorAttachment[]
}

interface GPURenderPassColorAttachment {
  view: GPUTextureView
  loadOp: string
  storeOp: string
  clearValue?: { r: number; g: number; b: number; a: number }
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup): void
  draw(vertexCount: number): void
  end(): void
}

interface GPUCommandBuffer {}

interface GPUTexelCopyTextureInfo {
  texture: GPUTexture
}

interface GPUTexelCopyBufferLayout {
  bytesPerRow: number
  rowsPerImage?: number
}

interface GPUCanvasContext {
  configure(configuration: GPUCanvasConfiguration): void
  getCurrentTexture(): GPUTexture
}

interface GPUCanvasConfiguration {
  device: GPUDevice
  format: string
  alphaMode?: string
}

// Buffer usage flags
declare const GPUBufferUsage: {
  STORAGE: number
  COPY_DST: number
  UNIFORM: number
}

// Texture usage flags
declare const GPUTextureUsage: {
  TEXTURE_BINDING: number
  COPY_DST: number
  RENDER_ATTACHMENT: number
}

// Shader stage flags
declare const GPUShaderStage: {
  VERTEX: number
  FRAGMENT: number
  COMPUTE: number
}

// Extend Navigator
interface Navigator {
  gpu?: GPU
}

// Extend HTMLCanvasElement
interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null
}
