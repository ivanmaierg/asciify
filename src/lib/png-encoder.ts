// Minimal APNG encoder — zero dependencies, uses browser CompressionStream

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}

function crc32(buf: Uint8Array, start = 0, end = buf.length): number {
  let crc = 0xffffffff
  for (let i = start; i < end; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(data as unknown as Uint8Array<ArrayBuffer>)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

function writeU32BE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, false)
}

function writeU16BE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, false)
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  writeU32BE(view, 0, data.length)
  // Type bytes
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i)
  chunk.set(data, 8)
  // CRC over type + data
  const crcVal = crc32(chunk, 4, 8 + data.length)
  writeU32BE(view, 8 + data.length, crcVal)
  return chunk
}

function applyPNGFilter(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData
  const rowBytes = width * 4
  const filtered = new Uint8Array(height * (1 + rowBytes))
  for (let y = 0; y < height; y++) {
    const outOffset = y * (1 + rowBytes)
    filtered[outOffset] = 0 // filter type None
    const srcOffset = y * rowBytes
    for (let x = 0; x < rowBytes; x++) {
      filtered[outOffset + 1 + x] = data[srcOffset + x]
    }
  }
  return filtered
}

export async function encodeAPNG(
  frames: ImageData[],
  fps: number,
  loopCount: number, // 0 = infinite
  onProgress?: (progress: number) => void,
): Promise<Uint8Array> {
  if (frames.length === 0) throw new Error('No frames to encode')

  const width = frames[0].width
  const height = frames[0].height
  const chunks: Uint8Array[] = []

  // PNG signature
  chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))

  // IHDR
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  writeU32BE(ihdrView, 0, width)
  writeU32BE(ihdrView, 4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  chunks.push(createChunk('IHDR', ihdr))

  // acTL (animation control)
  const actl = new Uint8Array(8)
  const actlView = new DataView(actl.buffer)
  writeU32BE(actlView, 0, frames.length) // num_frames
  writeU32BE(actlView, 4, loopCount) // num_plays
  chunks.push(createChunk('acTL', actl))

  let seqNum = 0

  for (let i = 0; i < frames.length; i++) {
    // fcTL (frame control)
    const fctl = new Uint8Array(26)
    const fctlView = new DataView(fctl.buffer)
    writeU32BE(fctlView, 0, seqNum++) // sequence_number
    writeU32BE(fctlView, 4, width) // width
    writeU32BE(fctlView, 8, height) // height
    writeU32BE(fctlView, 12, 0) // x_offset
    writeU32BE(fctlView, 16, 0) // y_offset
    writeU16BE(fctlView, 20, 1) // delay_num
    writeU16BE(fctlView, 22, fps) // delay_den
    fctl[24] = 0 // dispose_op: none
    fctl[25] = 0 // blend_op: source
    chunks.push(createChunk('fcTL', fctl))

    // Encode frame pixel data
    const filtered = applyPNGFilter(frames[i])
    const compressed = await deflate(filtered)

    if (i === 0) {
      // First frame uses IDAT (backward compatible)
      chunks.push(createChunk('IDAT', compressed))
    } else {
      // Subsequent frames use fdAT (with sequence number prefix)
      const fdat = new Uint8Array(4 + compressed.length)
      const fdatView = new DataView(fdat.buffer)
      writeU32BE(fdatView, 0, seqNum++)
      fdat.set(compressed, 4)
      chunks.push(createChunk('fdAT', fdat))
    }

    onProgress?.(i / frames.length)
  }

  // IEND
  chunks.push(createChunk('IEND', new Uint8Array(0)))

  // Concatenate all chunks
  const totalSize = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}
