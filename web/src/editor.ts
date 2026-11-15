// Visual layout editor: drag widgets on the grid, pull the corner to resize, edit properties.
import { CHANNEL, CHANNELS, GROUP_NAMES, type ChannelGroup, type Frame } from '../../src/shared/channels.ts'
import { FONTS, STYLES, type Layout, type Widget } from '../../src/shared/types.ts'
import { el, net, pick, t } from './core.ts'
import { duplicate } from './home.ts'
import { SAMPLE, Stage } from './stage.ts'
import { WIDGET, WIDGETS, type PropDef } from './widgets.ts'

const RATIOS: [string, number][] = [['2:1 (18:9)', 2], ['16:9', 16 / 9], ['20:9', 20 / 9], ['16:10', 1.6], ['4:3', 4 / 3]]
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export function mountEditor(root: HTMLElement, id: string): () => void {
  const source = net.layouts.find((l) => l.id === id)
  const view = el('div', 'editor')
  root.appendChild(view)
  if (!source) {
    location.hash = '#/home'
    return () => root.removeChild(view)
  }
  const layout: Layout = JSON.parse(JSON.stringify(source))
  const readonly = !!source.builtin
  let page = 0
  let sel: Widget | null = null
  let dirty = false
  let stage: Stage | null = null
  let preview = 'sample'
  let ratio = 2
  let raf = 0

  // ------------------------------------------------------------ skeleton
  const top = el('div', 'top')
  const back = el('button', 'btn', `← ${t('back')}`)
  const name = el('input', 'name')
  name.value = layout.name
  name.disabled = readonly
  const status = el('span', 'status')
  const save = el('button', 'btn primary', readonly ? t('duplicate') : t('save'))
  top.appendChild(back)
  top.appendChild(name)
  top.appendChild(status)
  top.appendChild(save)
  const left = el('aside', 'side')
  const mid = el('main')
  const frame = el('div', 'frame')
  const host = el('div', 'host')
  const hits = el('div', 'hits')
  frame.appendChild(host)
  frame.appendChild(hits)
  mid.appendChild(frame)
  const right = el('aside', 'side')
  view.appendChild(top)
  view.appendChild(left)
  view.appendChild(mid)
  view.appendChild(right)

  const touch = () => {
    if (readonly) return
    dirty = true
    status.textContent = t('unsaved')
    status.className = 'status warn'
  }
  status.textContent = readonly ? t('readonly') : ''

  const data = (): Frame => (preview === 'live' && net.game ? net.frame : SAMPLE[preview === 'sample' ? layout.kind : preview] || SAMPLE.car)

  // ------------------------------------------------------------ stage + hit boxes
  const fitFrame = () => {
    const W = mid.clientWidth - 32
    const H = mid.clientHeight - 32
    const w = Math.max(200, Math.min(W, H * ratio))
    frame.style.width = `${w}px`
    frame.style.height = `${w / ratio}px`
    if (stage) stage.resize()
  }

  const drawStage = () => {
    if (stage) stage.destroy()
    stage = new Stage(host, layout, page, { edit: true, act() {} })
    stage.update(data())
    hits.innerHTML = ''
    hits.style.backgroundSize = `${100 / layout.cols}% ${100 / layout.rows}%`
    for (const w of layout.pages[page].widgets) {
      const h = el('div', `hit${w === sel ? ' sel' : ''}`)
      h.style.left = `${(w.x / layout.cols) * 100}%`
      h.style.top = `${(w.y / layout.rows) * 100}%`
      h.style.width = `${(w.w / layout.cols) * 100}%`
      h.style.height = `${(w.h / layout.rows) * 100}%`
      const grip = el('i', 'grip')
      h.appendChild(grip)
      h.addEventListener('pointerdown', (e) => startDrag(e, w, h, e.target === grip))
      hits.appendChild(h)
    }
  }

  function startDrag(e: PointerEvent, w: Widget, box: HTMLElement, resize: boolean) {
    e.preventDefault()
    if (sel !== w) {
      sel = w
      drawProps()
      hits.querySelectorAll('.hit').forEach((x) => x.classList.toggle('sel', x === box))
    }
    if (readonly) return
    const cw = frame.clientWidth / layout.cols
    const ch = frame.clientHeight / layout.rows
    const start = { x: e.clientX, y: e.clientY, wx: w.x, wy: w.y, ww: w.w, wh: w.h }
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = Math.round((ev.clientX - start.x) / cw)
      const dy = Math.round((ev.clientY - start.y) / ch)
      if (resize) {
        w.w = clamp(start.ww + dx, 1, layout.cols - w.x)
        w.h = clamp(start.wh + dy, 1, layout.rows - w.y)
      } else {
        w.x = clamp(start.wx + dx, 0, layout.cols - w.w)
        w.y = clamp(start.wy + dy, 0, layout.rows - w.h)
      }
      box.style.left = `${(w.x / layout.cols) * 100}%`
      box.style.top = `${(w.y / layout.rows) * 100}%`
      box.style.width = `${(w.w / layout.cols) * 100}%`
      box.style.height = `${(w.h / layout.rows) * 100}%`
      moved = moved || w.x !== start.wx || w.y !== start.wy || w.w !== start.ww || w.h !== start.wh
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved) {
        touch()
        drawStage()
        drawProps()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ------------------------------------------------------------ left: pages, palette, layout
  const group = (parent: HTMLElement, title: string) => {
    const g = el('div', 'group')
    g.appendChild(el('h3', '', title))
    parent.appendChild(g)
    return g
  }
  const field = (parent: HTMLElement, label: string, control: HTMLElement) => {
    const r = el('label', 'field')
    r.appendChild(el('span', '', label))
    r.appendChild(control)
    parent.appendChild(r)
    return control
  }
  const input = (type: string, value: string, onChange: (v: string) => void) => {
    const i = el('input')
    i.type = type
    i.value = value
    i.disabled = readonly
    i.oninput = () => onChange(i.value)
    return i
  }
  const choice = (options: [string, string][], value: string, onChange: (v: string) => void, lock = readonly) => {
    const s = el('select')
    for (const [v, label] of options) s.appendChild(new Option(label, v))
    s.value = value
    s.disabled = lock
    s.onchange = () => onChange(s.value)
    return s
  }

  const drawLeft = () => {
    left.innerHTML = ''
    const pg = group(left, t('pages'))
    const tabs = el('div', 'tabs')
    layout.pages.forEach((p, i) => {
      const b = el('button', `tab${i === page ? ' on' : ''}`, p.name || String(i + 1))
      b.onclick = () => {
        page = i
        sel = null
        redraw()
      }
      tabs.appendChild(b)
    })
    if (!readonly && layout.pages.length < 12) {
      const add = el('button', 'tab', t('addPage'))
      add.onclick = () => {
        layout.pages.push({ name: String(layout.pages.length + 1), widgets: [] })
        page = layout.pages.length - 1
        sel = null
        touch()
        redraw()
      }
      tabs.appendChild(add)
    }
    pg.appendChild(tabs)
    field(pg, t('pageName'), input('text', layout.pages[page].name, (v) => {
      layout.pages[page].name = v.slice(0, 30)
      touch()
      const tab = tabs.children[page] as HTMLElement
      if (tab) tab.textContent = v || String(page + 1)
    }))
    if (!readonly && layout.pages.length > 1) {
      const del = el('button', 'btn danger', t('delPage'))
      del.onclick = () => {
        layout.pages.splice(page, 1)
        page = Math.max(0, page - 1)
        sel = null
        touch()
        redraw()
      }
      pg.appendChild(del)
    }

    if (!readonly) {
      const pal = group(left, t('addWidget'))
      const list = el('div', 'palette')
      for (const def of WIDGETS) {
        const b = el('button', 'btn', pick(def.name))
        b.onclick = () => {
          const w: Widget = {
            id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, type: def.type, x: 0, y: 0,
            w: Math.min(def.w, layout.cols), h: Math.min(def.h, layout.rows), ch: def.defCh, p: {}
          }
          layout.pages[page].widgets.push(w)
          sel = w
          touch()
          redraw()
        }
        list.appendChild(b)
      }
      pal.appendChild(list)
    }

    const lp = group(left, t('layoutProps'))
    field(lp, t('kind'), choice([['car', t('k_car')], ['truck', t('k_truck')], ['plane', t('k_plane')], ['any', t('k_any')]], layout.kind, (v) => {
      layout.kind = v as Layout['kind']
      touch()
      drawStage()
    }))
    const size = el('div', 'pairin')
    const dims = (key: 'cols' | 'rows', lo: number) => {
      const i = input('number', String(layout[key]), (v) => {
        const n = clamp(Math.round(Number(v)) || lo, lo, 64)
        // the grid cannot shrink past a widget that is already placed
        const need = Math.max(lo, ...layout.pages.map((p) => Math.max(0, ...p.widgets.map((w) => (key === 'cols' ? w.x + w.w : w.y + w.h)))))
        layout[key] = Math.max(n, need)
        touch()
        drawStage()
      })
      i.min = String(lo)
      i.max = '64'
      size.appendChild(i)
    }
    dims('cols', 4)
    dims('rows', 2)
    field(lp, t('grid'), size)
    const colors = el('div', 'swatches')
    for (const k of ['bg', 'panel', 'text', 'dim', 'accent'] as const) {
      const c = input('color', layout.theme[k].slice(0, 7), (v) => {
        layout.theme[k] = v
        touch()
        drawStage()
      })
      c.title = t(`c_${k}`)
      colors.appendChild(c)
    }
    field(lp, t('colors'), colors)
    field(lp, t('font'), choice(FONTS.map((f): [string, string] => [f, t(`f_${f}`)]), layout.theme.font || 'sans', (v) => {
      layout.theme.font = v as Layout['theme']['font']
      touch()
      drawStage()
    }))
    field(lp, t('pstyle'), choice(STYLES.map((s): [string, string] => [s, t(`s_${s}`)]), layout.theme.style || 'flat', (v) => {
      layout.theme.style = v as Layout['theme']['style']
      touch()
      drawStage()
    }))

    const pv = group(left, t('preview'))
    pv.appendChild(choice([['sample', t('demo')], ['live', t('live')], ['car', t('d_car')], ['truck', t('d_truck')], ['plane', t('d_plane')]], preview, (v) => {
      preview = v
      drawStage()
    }, false))
    pv.appendChild(choice(RATIOS.map(([n, r]): [string, string] => [String(r), n]), String(ratio), (v) => {
      ratio = Number(v)
      fitFrame()
    }, false))
  }

  // ------------------------------------------------------------ right: widget properties
  const drawProps = () => {
    right.innerHTML = ''
    const g = group(right, t('widget'))
    if (!sel) {
      g.appendChild(el('p', 'hint', t('noSel')))
      return
    }
    const w = sel
    const def = WIDGET[w.type]
    g.appendChild(el('b', 'wname', def ? pick(def.name) : w.type))
    const set = (key: string, v: string | number | boolean | undefined) => {
      w.p = w.p || {}
      if (v === undefined || v === '') delete w.p[key]
      else w.p[key] = v
      touch()
      drawStage()
    }
    const channelSelect = (kind: 'num' | 'bool' | 'text' | 'any', value: string, onChange: (v: string) => void) => {
      const s = el('select')
      s.appendChild(new Option(t('none'), ''))
      for (const gid of Object.keys(GROUP_NAMES) as ChannelGroup[]) {
        const items = CHANNELS.filter((c) => c.group === gid && (kind === 'any' || c.kind === kind))
        if (!items.length) continue
        const og = document.createElement('optgroup')
        og.label = pick(GROUP_NAMES[gid])
        for (const c of items) og.appendChild(new Option(`${pick(c)}${c.unit ? ` (${c.unit})` : ''}`, c.id))
        s.appendChild(og)
      }
      s.value = value
      s.disabled = readonly
      s.onchange = () => onChange(s.value)
      return s
    }
    if (def && def.ch)
      field(g, t('channel'), channelSelect(def.ch, w.ch || '', (v) => {
        w.ch = v || undefined
        touch()
        drawStage()
      }))
    const p = w.p || {}
    for (const d of (def ? def.props : []) as PropDef[]) {
      const cur = p[d.key]
      const label = pick(d.label)
      if (d.type === 'bool') {
        const c = input('checkbox', '', () => set(d.key, c.checked || undefined))
        c.checked = cur === true
        c.onchange = () => set(d.key, c.checked || undefined)
        field(g, label, c)
      } else if (d.type === 'select') field(g, label, choice((d.options || []).map((o): [string, string] => [o, o || t('none')]), typeof cur === 'string' ? cur : '', (v) => set(d.key, v)))
      else if (d.type === 'channel') field(g, label, channelSelect('bool', typeof cur === 'string' ? cur : '', (v) => set(d.key, v)))
      else if (d.type === 'number') field(g, label, input('number', typeof cur === 'number' ? String(cur) : '', (v) => set(d.key, v === '' || isNaN(Number(v)) ? undefined : Number(v)))).setAttribute('step', 'any')
      else if (d.type === 'color') {
        const wrap = el('div', 'pairin')
        const c = input('color', typeof cur === 'string' && cur ? cur.slice(0, 7) : '#ffffff', (v) => set(d.key, v))
        const clear = el('button', 'btn', '×')
        clear.disabled = readonly
        clear.onclick = () => {
          set(d.key, undefined)
          drawProps()
        }
        wrap.appendChild(c)
        wrap.appendChild(clear)
        field(g, label, wrap)
      } else field(g, label, input('text', typeof cur === 'string' ? cur : '', (v) => set(d.key, v.slice(0, 200))))
    }
    const pos = el('div', 'pairin four')
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      const i = input('number', String(w[k]), (v) => {
        const n = Math.round(Number(v))
        if (isNaN(n)) return
        if (k === 'x') w.x = clamp(n, 0, layout.cols - w.w)
        else if (k === 'y') w.y = clamp(n, 0, layout.rows - w.h)
        else if (k === 'w') w.w = clamp(n, 1, layout.cols - w.x)
        else w.h = clamp(n, 1, layout.rows - w.y)
        touch()
        drawStage()
      })
      i.title = k
      pos.appendChild(i)
    }
    field(g, 'x · y · w · h', pos)
    if (readonly) return
    const dup = el('button', 'btn', t('dupWidget'))
    dup.onclick = () => {
      const c: Widget = JSON.parse(JSON.stringify(w))
      c.id = `w${Date.now().toString(36)}`
      c.x = clamp(w.x + 1, 0, layout.cols - c.w)
      c.y = clamp(w.y + 1, 0, layout.rows - c.h)
      layout.pages[page].widgets.push(c)
      sel = c
      touch()
      redraw()
    }
    const del = el('button', 'btn danger', t('delWidget'))
    del.onclick = removeSel
    const btns = el('div', 'btns')
    btns.appendChild(dup)
    btns.appendChild(del)
    g.appendChild(btns)
  }

  function removeSel() {
    if (!sel || readonly) return
    const list = layout.pages[page].widgets
    list.splice(list.indexOf(sel), 1)
    sel = null
    touch()
    redraw()
  }

  const redraw = () => {
    drawLeft()
    drawStage()
    drawProps()
  }

  // ------------------------------------------------------------ actions
  name.oninput = () => {
    layout.name = name.value.slice(0, 60)
    touch()
  }
  save.onclick = async () => {
    try {
      if (readonly) {
        const c = await duplicate(source)
        location.hash = `#/edit/${c.id}`
        return
      }
      await net.api('PUT', '/api/layouts', layout)
      dirty = false
      status.textContent = t('saved')
      status.className = 'status ok'
    } catch (e) {
      status.textContent = e instanceof Error ? e.message : 'error'
      status.className = 'status warn'
    }
  }
  back.onclick = () => {
    if (!dirty || confirm(t('leave'))) location.hash = '#/home'
  }
  hits.addEventListener('pointerdown', (e) => {
    if (e.target !== hits) return
    sel = null
    drawStage()
    drawProps()
  })
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save.click()
      return
    }
    if (!sel || readonly) return
    if (e.key === 'Delete' || e.key === 'Backspace') return removeSel()
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const d = step[e.key]
    if (!d) return
    e.preventDefault()
    sel.x = clamp(sel.x + d[0], 0, layout.cols - sel.w)
    sel.y = clamp(sel.y + d[1], 0, layout.rows - sel.h)
    touch()
    drawStage()
    drawProps()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', fitFrame)
  const guard = (e: BeforeUnloadEvent) => {
    if (dirty) e.preventDefault()
  }
  window.addEventListener('beforeunload', guard)

  let lastRev = -1
  let lastTick = 0
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (!stage || (preview === 'live' ? net.rev === lastRev : now - lastTick < 1000)) return
    lastRev = net.rev
    lastTick = now
    stage.update(data())
  }

  redraw()
  fitFrame()
  raf = requestAnimationFrame(loop)
  void CHANNEL
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', fitFrame)
    window.removeEventListener('beforeunload', guard)
    if (stage) stage.destroy()
    root.removeChild(view)
  }
}
