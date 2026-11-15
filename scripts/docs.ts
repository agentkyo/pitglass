// Regenerates the widget and channel tables in docs/LAYOUTS.md from the code: node scripts/docs.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHANNELS, GROUP_NAMES, type ChannelGroup } from '../src/shared/channels.ts'
import { WIDGETS } from '../web/src/widgets.ts'

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'LAYOUTS.md')
const between = (text: string, tag: string, body: string) => {
  const a = `<!-- ${tag}:start -->`
  const b = `<!-- ${tag}:end -->`
  const i = text.indexOf(a)
  const j = text.indexOf(b)
  if (i < 0 || j < i) throw new Error(`markers for ${tag} not found`)
  return `${text.slice(0, i + a.length)}\n${body}\n${text.slice(j)}`
}

const KIND = { num: 'a number', bool: 'on/off', text: 'text', any: 'any channel' }
const widgets = [
  '| `type` | What it is | Channel | Properties (`p`) |',
  '| --- | --- | --- | --- |',
  ...WIDGETS.map((w) => `| \`${w.type}\` | ${w.name[0]} | ${w.ch ? KIND[w.ch] : 'none'} | ${w.props.map((p) => `\`${p.key}\` ${p.label[0].toLowerCase()}${p.options ? ` (${p.options.filter(Boolean).join(', ')})` : ''}`).join('; ') || 'none'} |`)
].join('\n')

const channels = (Object.keys(GROUP_NAMES) as ChannelGroup[])
  .map((g) =>
    [
      `### ${GROUP_NAMES[g].en}`,
      '',
      '| Channel | Meaning | Type | Unit |',
      '| --- | --- | --- | --- |',
      ...CHANNELS.filter((c) => c.group === g).map((c) => `| \`${c.id}\` | ${c.en} | ${c.kind === 'num' ? (c.pct ? 'number, 0 to 1' : 'number') : c.kind === 'bool' ? 'on/off' : 'text'} | ${c.unit ?? ''} |`)
    ].join('\n')
  )
  .join('\n\n')

let text = fs.readFileSync(file, 'utf8')
text = between(text, 'widgets', widgets)
text = between(text, 'channels', channels)
fs.writeFileSync(file, text)
console.log(`${WIDGETS.length} widgets and ${CHANNELS.length} channels written to docs/LAYOUTS.md`)
