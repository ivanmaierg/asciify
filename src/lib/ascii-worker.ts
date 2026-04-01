// Inline Web Worker for ASCII conversion
// This file is converted to a Blob URL and run in a Worker context

const WORKER_CODE = `
var BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];
var SOBEL_X = [[-1,0,1],[-2,0,2],[-1,0,1]];
var SOBEL_Y = [[-1,-2,-1],[0,0,0],[1,2,1]];

self.onmessage = function(e) {
  var d = e.data;
  var result = convertFrame(d.pixels, d.width, d.height, d.columns, d.charset, d.brightnessThreshold, d.contrastBoost, d.colorMode, d.gamma, d.edgeDetection, d.ditherMode, d.invertCharset);
  self.postMessage({ id: d.id, result: result });
};

function convertFrame(pixels, width, height, columns, charset, brightnessThreshold, contrastBoost, colorMode, gamma, edgeDetection, ditherMode, invertCharset) {
  var cellWidth = width / columns;
  var rows = Math.max(1, Math.round((height / cellWidth) * 0.5));
  var cellHeight = height / rows;
  var invertBrightness = colorMode === 'inverted';
  var charCount = charset.length;

  // Pass 1: Sample pixels, compute brightness grid
  var brightnessGrid = [];
  var rgbGrid = [];

  for (var row = 0; row < rows; row++) {
    var rowBrightness = [];
    var rowRgb = [];
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

      if (gamma !== 1.0) {
        brightness = Math.pow(brightness / 255, gamma) * 255;
      }

      rowBrightness.push(brightness);
      rowRgb.push({ r: avgR, g: avgG, b: avgB });
    }
    brightnessGrid.push(rowBrightness);
    rgbGrid.push(rowRgb);
  }

  // Pass 2: Edge detection (Sobel)
  if (edgeDetection > 0) {
    var strength = edgeDetection / 100;
    var edgeGrid = [];
    for (var row = 0; row < rows; row++) {
      var rowEdge = [];
      for (var col = 0; col < columns; col++) {
        var gx = 0, gy = 0;
        for (var ky = -1; ky <= 1; ky++) {
          for (var kx = -1; kx <= 1; kx++) {
            var r = Math.max(0, Math.min(rows - 1, row + ky));
            var c = Math.max(0, Math.min(columns - 1, col + kx));
            var val = brightnessGrid[r][c];
            gx += val * SOBEL_X[ky + 1][kx + 1];
            gy += val * SOBEL_Y[ky + 1][kx + 1];
          }
        }
        var magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        rowEdge.push(magnitude);
      }
      edgeGrid.push(rowEdge);
    }
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < columns; col++) {
        brightnessGrid[row][col] = brightnessGrid[row][col] * (1 - strength) + edgeGrid[row][col] * strength;
      }
    }
  }

  // Pass 3: Dithering
  if (ditherMode === 'floyd-steinberg') {
    var levels = charCount;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < columns; col++) {
        var old = brightnessGrid[row][col];
        var quantized = Math.round((old / 255) * (levels - 1)) * (255 / (levels - 1));
        var error = old - quantized;
        brightnessGrid[row][col] = quantized;
        if (col + 1 < columns) brightnessGrid[row][col + 1] += error * (7 / 16);
        if (row + 1 < rows) {
          if (col - 1 >= 0) brightnessGrid[row + 1][col - 1] += error * (3 / 16);
          brightnessGrid[row + 1][col] += error * (5 / 16);
          if (col + 1 < columns) brightnessGrid[row + 1][col + 1] += error * (1 / 16);
        }
      }
    }
  } else if (ditherMode === 'ordered') {
    var levels = charCount;
    var step = levels > 1 ? 255 / (levels - 1) : 255;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < columns; col++) {
        var threshold = (BAYER_4X4[row % 4][col % 4] / 16.0 - 0.5) * step;
        brightnessGrid[row][col] += threshold;
      }
    }
  }

  // Pass 4: Map to characters
  var cells = [];
  var lines = [];

  for (var row = 0; row < rows; row++) {
    var rowCells = [];
    var line = '';
    for (var col = 0; col < columns; col++) {
      var brightness = Math.max(0, Math.min(255, brightnessGrid[row][col]));
      var charIndex = Math.min(charCount - 1, Math.floor((brightness / 255) * (charCount - 1)));
      if (invertCharset) charIndex = charCount - 1 - charIndex;
      var ch = charset[charIndex];
      var rgb = rgbGrid[row][col];
      rowCells.push({ char: ch, r: rgb.r, g: rgb.g, b: rgb.b, brightness: brightness });
      line += ch;
    }
    cells.push(rowCells);
    lines.push(line);
  }
  return { text: lines.join('\\n'), cells: cells };
}
`

import type { AsciiFrame } from '@/lib/ascii-engine'
import type { ColorMode, DitherMode } from '@/lib/constants'

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
  gamma: number,
  edgeDetection: number,
  ditherMode: DitherMode,
  invertCharset: boolean,
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
        gamma,
        edgeDetection,
        ditherMode,
        invertCharset,
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
