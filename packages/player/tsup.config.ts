import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'Asciify',
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: ['@chenglou/pretext'],
  external: ['@asciify/encoder'],
})
