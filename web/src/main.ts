// Entry point: connect, then show the view the address asks for.
//   #/dash        the dashboard (what the phone shows)
//   #/home        control panel (this PC only)
//   #/edit/<id>   layout editor
import { el, net, setPrefs, t } from './core.ts'
import { mountDash } from './dash.ts'
import { mountEditor } from './editor.ts'
import { mountHome } from './home.ts'

const root = document.getElementById('app')!
let unmount: (() => void) | null = null
let current = ''

function route() {
  // the PC gets the address for the phone in its state; a phone does not, and only sees the dashboard
  const local = !!(net.state && net.state.phoneUrl)
  let hash = location.hash.replace(/^#\/?/, '')
  if (!hash) hash = local ? 'home' : 'dash'
  if (!local && hash !== 'dash') hash = 'dash'
  if (hash === current) return
  current = hash
  if (unmount) unmount()
  root.innerHTML = ''
  document.body.className = hash === 'dash' ? 'is-dash' : ''
  if (hash === 'home') unmount = mountHome(root)
  else if (hash.startsWith('edit/')) unmount = mountEditor(root, decodeURIComponent(hash.slice(5)))
  else unmount = mountDash(root, local)
}

async function boot() {
  await net.start()
  const cfg = net.state ? net.state.config : null
  setPrefs(cfg ? cfg.lang : '', cfg ? cfg.units : 'metric')
  if (!net.state && net.denied) {
    root.appendChild(el('div', 'fatal', t('nokey')))
    return
  }
  window.addEventListener('hashchange', route)
  // the first state may arrive after a server restart: route again when it does
  const off = net.on('state', () => {
    if (!current) route()
    else off()
  })
  route()
}

void boot()
