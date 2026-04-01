// Inline Web Worker for ASCII conversion
// This file is converted to a Blob URL and run in a Worker context

const WORKER_CODE = `
self.onmessage = function(e) {
  var d = e.data;
  var result = convertFrame(d.pixels, d.width, d.height, d.columns, d.charset, d.brightnessThreshold, d.contrastBoost, d.colorMode);
  self.postMessage({ id: d.id, result: result });
};

function convertFrame(pixels, width, height, columns, charset, brightnessThreshold, contrastBoost, colorMode) {
  var cellWidth = width / columns;
  var rows = Math.max(1, Math.round((height / cellWidth) * 0.5));
  var cellHeight = height / rows;
  var invertBrightness = colorMode === 'inverted';
  var charCount = charset.length;
  var cells = [];
  var lines = [];

  for (var row = 0; row < rows; row++) {
    var rowCells = [];
    var line = '';
    var y0 = Math.floor(row * cellHeight);
    var y1 = Math.min(Math.floor((row + 1) * cellHeight), height);

    for (var col = 0; col < columns; col++) {
      var x0 = Math.floor(col * cellWidth);
      var x1 = Math.min(Math.floor((col + 1) * cellWidth), width);
      var totalR = 0, totalG = 0, totalB = 0, pixelCount = 0;

      for (var y = y0; y < y1; y++) {
        var rowOffset = y * width;
        for (var x = x0; x < x1; x++) {
          var i = (rowOffset + x) * 4;
          totalR += pixels[i];
          totalG += pixels[i + 1];
          totalB += pixels[i + 2];
          pixelCount++;
        }
      }

      if (pixelCount === 0) pixelCount = 1;
      var avgR = totalR / pixelCount;
      var avgG = totalG / pixelCount;
      var avgB = totalB / pixelCount;
      var brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

      if (brightness < brightnessThreshold) brightness = 0;
      var contrastFactor = contrastBoost / 100;
      brightness = ((brightness / 255 - 0.5) * contrastFactor + 0.5) * 255;
      brightness = Math.max(0, Math.min(255, brightness));
      if (invertBrightness) brightness = 255 - brightness;

      var charIndex = Math.min(charCount - 1, Math.floor((brightness / 255) * (charCount - 1)));
      var ch = charset[charIndex];

      rowCells.push({ char: ch, r: avgR, g: avgG, b: avgB, brightness: brightness });
      line += ch;
    }
    cells.push(rowCells);
    lines.push(line);
  }
  return { text: lines.join('\\n'), cells: cells };
}
`

import type { AsciiFrame } from '@/lib/ascii-engine'
import type { ColorMode } from '@/lib/constants'

let worker: Worker | null = null
let workerUrl: string | null = null
let nextId = 0
const pending = new Map<number, (result: AsciiFrame) => void>()

function getWorker(): Worker {
  if (worker) return worker

  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
  workerUrl = URL.createObjectURL(blob)
  worker = new Worker(workerUrl)

  worker.onmessage = (e: MessageEvent<{ id: number; result: AsciiFrame }>) => {
    const resolve = pending.get(e.data.id)
    if (resolve) {
      pending.delete(e.data.id)
      resolve(e.data.result)
    }
  }

  return worker
}

export function convertFrameInWorker(
  imageData: ImageData,
  columns: number,
  charset: string,
  brightnessThreshold: number,
  contrastBoost: number,
  colorMode: ColorMode,
): Promise<AsciiFrame> {
  return new Promise((resolve) => {
    const w = getWorker()
    const id = nextId++
    pending.set(id, resolve)

    // Copy pixel data to transfer
    const pixels = new Uint8ClampedArray(imageData.data)

    w.postMessage(
      {
        id,
        pixels,
        width: imageData.width,
        height: imageData.height,
        columns,
        charset,
        brightnessThreshold,
        contrastBoost,
        colorMode,
      },
      [pixels.buffer] as unknown as Transferable[],
    )
  })
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl)
    workerUrl = null
  }
  pending.clear()
}
