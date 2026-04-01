import type { BitDepth, AudioSampleRate } from '@/lib/audio-processor'

let audioCtx: AudioContext | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let crusherNode: AudioWorkletNode | ScriptProcessorNode | null = null
let connectedVideo: HTMLVideoElement | null = null

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

let workletLoaded = false

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
      // AudioWorklet may not be supported from blob URLs in some browsers
      // Fall back to ScriptProcessorNode below
    }
    URL.revokeObjectURL(url)
  }
  return audioCtx
}

export async function connectAudioPreview(
  video: HTMLVideoElement,
  bitDepth: BitDepth,
  sampleRate: AudioSampleRate,
): Promise<void> {
  const ctx = await ensureAudioContext()

  // Only create source node once per video element
  if (connectedVideo !== video) {
    disconnectAudioPreview()
    sourceNode = ctx.createMediaElementSource(video)
    connectedVideo = video
    // Mute the video's direct output since we're routing through Web Audio
    video.muted = false
  }

  // Remove old crusher
  if (crusherNode) {
    sourceNode!.disconnect()
    crusherNode.disconnect()
    crusherNode = null
  }

  const rateFactor = sampleRate / 44100

  if (workletLoaded) {
    // Use AudioWorklet (preferred — runs on audio thread)
    const workletNode = new AudioWorkletNode(ctx, 'bitcrusher')
    workletNode.parameters.get('bitDepth')!.value = bitDepth
    workletNode.parameters.get('rateFactor')!.value = rateFactor
    crusherNode = workletNode
  } else {
    // Fallback: ScriptProcessorNode (deprecated but universal)
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
    crusherNode = processor
  }

  sourceNode!.connect(crusherNode)
  crusherNode.connect(ctx.destination)
}

export function disconnectAudioPreview(): void {
  if (sourceNode) {
    sourceNode.disconnect()
  }
  if (crusherNode) {
    crusherNode.disconnect()
    crusherNode = null
  }
  if (connectedVideo) {
    connectedVideo = null
  }
  sourceNode = null
}

export function bypassAudioPreview(): void {
  // Connect source directly to destination (no processing)
  if (sourceNode && audioCtx) {
    if (crusherNode) {
      sourceNode.disconnect()
      crusherNode.disconnect()
      crusherNode = null
    }
    sourceNode.connect(audioCtx.destination)
  }
}
