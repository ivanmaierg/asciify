export type BitDepth = 8 | 16 | 32
export type AudioSampleRate = 11025 | 22050 | 44100

export interface AudioProcessorConfig {
  videoUrl: string
  trimStart: number
  trimEnd: number
  bitDepth: BitDepth
  sampleRate: AudioSampleRate
}

export async function processAudio(config: AudioProcessorConfig): Promise<Blob> {
  const { videoUrl, trimStart, trimEnd, bitDepth, sampleRate } = config

  // Fetch video as ArrayBuffer
  const response = await fetch(videoUrl)
  const arrayBuffer = await response.arrayBuffer()

  // Decode audio
  const audioCtx = new AudioContext({ sampleRate: 44100 })
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    await audioCtx.close()
  }

  // Extract trimmed segment
  const startSample = Math.floor(trimStart * audioBuffer.sampleRate)
  const endSample = Math.floor(trimEnd * audioBuffer.sampleRate)
  const segmentLength = endSample - startSample
  const channels = audioBuffer.numberOfChannels

  // Get channel data for the trimmed segment
  const channelData: Float32Array[] = []
  for (let ch = 0; ch < channels; ch++) {
    const full = audioBuffer.getChannelData(ch)
    channelData.push(full.slice(startSample, endSample))
  }

  // Resample if needed
  const resampledData = resample(channelData, audioBuffer.sampleRate, sampleRate)

  // Apply bitcrusher
  const crushedData = bitcrush(resampledData, bitDepth)

  // Encode as WAV
  return encodeWAV(crushedData, sampleRate, channels, bitDepth)
}

function resample(
  channelData: Float32Array[],
  fromRate: number,
  toRate: number,
): Float32Array[] {
  if (fromRate === toRate) return channelData

  const ratio = fromRate / toRate
  const newLength = Math.floor(channelData[0].length / ratio)

  return channelData.map((data) => {
    const resampled = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
      // Simple nearest-neighbor resampling (intentionally lo-fi)
      const srcIndex = Math.floor(i * ratio)
      resampled[i] = data[Math.min(srcIndex, data.length - 1)]
    }
    return resampled
  })
}

function bitcrush(channelData: Float32Array[], bitDepth: BitDepth): Float32Array[] {
  if (bitDepth === 32) return channelData // No crushing for 32-bit

  const levels = Math.pow(2, bitDepth - 1)

  return channelData.map((data) => {
    const crushed = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      // Quantize to N-bit levels
      crushed[i] = Math.round(data[i] * levels) / levels
    }
    return crushed
  })
}

function encodeWAV(
  channelData: Float32Array[],
  sampleRate: number,
  numChannels: number,
  bitDepth: BitDepth,
): Blob {
  const bytesPerSample = bitDepth === 8 ? 1 : bitDepth === 16 ? 2 : 4
  const numSamples = channelData[0].length
  const dataSize = numSamples * numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true) // PCM=1, Float=3
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true) // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true) // block align
  view.setUint16(34, bitDepth, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write interleaved samples
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = channelData[ch][i] || 0

      if (bitDepth === 8) {
        // 8-bit WAV is unsigned
        view.setUint8(offset, Math.max(0, Math.min(255, Math.round((sample + 1) * 127.5))))
        offset += 1
      } else if (bitDepth === 16) {
        view.setInt16(offset, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true)
        offset += 2
      } else {
        view.setFloat32(offset, sample, true)
        offset += 4
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

export async function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}
