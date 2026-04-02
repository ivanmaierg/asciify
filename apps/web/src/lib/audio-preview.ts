import type { BitDepth, AudioSampleRate } from '@/lib/audio-processor'

let audioCtx: AudioContext | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let crusherNode: AudioWorkletNode | ScriptProcessorNode | null = null
let lowPassNode: BiquadFilterNode | null = null
let waveshaperNode: WaveShaperNode | null = null
let gainNode: GainNode | null = null
let muteGainNode: GainNode | null = null
let connectedVideo: HTMLVideoElement | null = null
let workletLoaded = false

const CRUSHER_PROCESSOR = `
class BitCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 16, minValue: 1, maxValue: 32 },
      { name: 'rateFactor', defaultValue: 1, minValue: 0.1, maxValue: 1 },
    ];
  }
  constructor() { super(); this._held = 0; this._counter = 0; }
  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) return true;
    const bits = params.bitDepth[0] || 16;
    const rateFactor = params.rateFactor[0] || 1;
    const levels = Math.pow(2, bits - 1);
    const step = Math.max(1, Math.round(1 / rateFactor));
    for (let ch = 0; ch < input.length; ch++) {
      const inp = input[ch];
      const out = output[ch];
      for (let i = 0; i < inp.length; i++) {
        if (this._counter % step === 0) {
          this._held = Math.round(inp[i] * levels) / levels;
        }
        out[i] = this._held;
        this._counter++;
      }
    }
    return true;
  }
}
registerProcessor('bitcrusher', BitCrusherProcessor);
`

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100
  const curve = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    if (amount === 0) {
      curve[i] = x
    } else {
      const k = (amount * 2) / (1 - amount)
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
    }
  }
  return curve
}

async function ensureAudioContext(): Promise<AudioContext> {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }
  if (!workletLoaded) {
    const blob = new Blob([CRUSHER_PROCESSOR], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    try {
      await audioCtx.audioWorklet.addModule(url)
      workletLoaded = true
    } catch {
      // Fall back to ScriptProcessorNode
    }
    URL.revokeObjectURL(url)
  }
  return audioCtx
}

export interface AudioPreviewParams {
  bitDepth: BitDepth
  sampleRate: AudioSampleRate
  lowPass: number     // Hz cutoff, 0 = off
  distortion: number  // 0-100
}

export async function connectAudioPreview(
  video: HTMLVideoElement,
  params: AudioPreviewParams,
): Promise<void> {
  const ctx = await ensureAudioContext()

  // If same video, just update params
  if (connectedVideo === video && sourceNode) {
    updateParams(ctx, params)
    return
  }

  // New video — set up chain
  if (connectedVideo !== video) {
    teardownChain()
    connectedVideo = video
  }

  if (!sourceNode) {
    video.muted = false
    sourceNode = ctx.createMediaElementSource(video)
  }

  // Build chain: source → crusher → lowpass → waveshaper → gain → destination
  buildChain(ctx, params)
}

function buildChain(ctx: AudioContext, params: AudioPreviewParams): void {
  if (!sourceNode) return

  // Crusher
  const rateFactor = params.sampleRate / 44100
  if (workletLoaded) {
    const workletNode = new AudioWorkletNode(ctx, 'bitcrusher')
    workletNode.parameters.get('bitDepth')!.value = params.bitDepth
    workletNode.parameters.get('rateFactor')!.value = rateFactor
    crusherNode = workletNode
  } else {
    crusherNode = createScriptCrusher(ctx, params.bitDepth, rateFactor)
  }

  // Low-pass filter
  lowPassNode = ctx.createBiquadFilter()
  lowPassNode.type = 'lowpass'
  lowPassNode.frequency.value = params.lowPass > 0 ? params.lowPass : 22050
  lowPassNode.Q.value = 1

  // Waveshaper (distortion)
  waveshaperNode = ctx.createWaveShaper()
  waveshaperNode.curve = makeDistortionCurve(params.distortion / 100) as Float32Array<ArrayBuffer>
  waveshaperNode.oversample = '4x'

  // Gain (compensate for volume loss)
  gainNode = ctx.createGain()
  gainNode.gain.value = 1.0 + params.distortion * 0.005

  // Connect chain
  sourceNode.connect(crusherNode)
  crusherNode.connect(lowPassNode)
  lowPassNode.connect(waveshaperNode)
  waveshaperNode.connect(gainNode)
  gainNode.connect(ctx.destination)
}

function updateParams(ctx: AudioContext, params: AudioPreviewParams): void {
  const rateFactor = params.sampleRate / 44100

  // Update crusher
  if (crusherNode && 'parameters' in crusherNode) {
    const worklet = crusherNode as AudioWorkletNode
    worklet.parameters.get('bitDepth')!.value = params.bitDepth
    worklet.parameters.get('rateFactor')!.value = rateFactor
  } else if (crusherNode && sourceNode) {
    // ScriptProcessor — must rebuild the chain
    teardownChain()
    buildChain(ctx, params)
    return
  }

  // Update low-pass
  if (lowPassNode) {
    lowPassNode.frequency.value = params.lowPass > 0 ? params.lowPass : 22050
  }

  // Update distortion
  if (waveshaperNode) {
    waveshaperNode.curve = makeDistortionCurve(params.distortion / 100) as Float32Array<ArrayBuffer>
  }

  // Update gain
  if (gainNode) {
    gainNode.gain.value = 1.0 + params.distortion * 0.005
  }
}

function createScriptCrusher(
  ctx: AudioContext,
  bitDepth: BitDepth,
  rateFactor: number,
): ScriptProcessorNode {
  const processor = ctx.createScriptProcessor(4096, 2, 2)
  const levels = Math.pow(2, bitDepth - 1)
  const step = Math.max(1, Math.round(1 / rateFactor))
  let held = 0
  let counter = 0
  processor.onaudioprocess = (e) => {
    for (let ch = 0; ch < e.outputBuffer.numberOfChannels; ch++) {
      const input = e.inputBuffer.getChannelData(ch)
      const output = e.outputBuffer.getChannelData(ch)
      for (let i = 0; i < input.length; i++) {
        if (counter % step === 0) {
          held = Math.round(input[i] * levels) / levels
        }
        output[i] = held
        counter++
      }
    }
  }
  return processor
}

function teardownChain(): void {
  try { sourceNode?.disconnect() } catch { /* ok */ }
  try { crusherNode?.disconnect() } catch { /* ok */ }
  try { lowPassNode?.disconnect() } catch { /* ok */ }
  try { waveshaperNode?.disconnect() } catch { /* ok */ }
  try { gainNode?.disconnect() } catch { /* ok */ }
  try { muteGainNode?.disconnect() } catch { /* ok */ }
  crusherNode = null
  lowPassNode = null
  waveshaperNode = null
  gainNode = null
  muteGainNode = null
}

export function disconnectAudioPreview(): void {
  teardownChain()
  // Route source to silent gain (audio is captured by createMediaElementSource)
  if (sourceNode && audioCtx) {
    muteGainNode = audioCtx.createGain()
    muteGainNode.gain.value = 0
    sourceNode.connect(muteGainNode)
    muteGainNode.connect(audioCtx.destination)
  }
}

export function destroyAudioPreview(): void {
  teardownChain()
  if (sourceNode) {
    try { sourceNode.disconnect() } catch { /* ok */ }
    sourceNode = null
  }
  connectedVideo = null
  if (audioCtx) {
    audioCtx.close().catch(() => {})
    audioCtx = null
    workletLoaded = false
  }
}
