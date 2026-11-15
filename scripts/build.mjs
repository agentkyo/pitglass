// Builds the dashboard page into dist/web. The server itself needs no build: Node runs the
// TypeScript sources directly.
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist', 'web')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

await build({
  entryPoints: [path.join(root, 'web', 'src', 'main.ts')],
  outfile: path.join(out, 'app.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  // old Android phones make great dashboards: keep the output readable by 2018 browsers
  target: 'es2018',
  logLevel: 'warning'
})
for (const f of ['index.html', 'manifest.webmanifest', 'icon.svg']) fs.copyFileSync(path.join(root, 'web', f), path.join(out, f))
fs.copyFileSync(path.join(root, 'web', 'style.css'), path.join(out, 'app.css'))
console.log(`built ${path.relative(root, out)}`)
