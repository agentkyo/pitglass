// The channel registry: every value a game can publish, under one name for all games.
// A widget is bound to a channel id, so a layout built for one game keeps working in another
// wherever the channel exists. Units here are the canonical ones; the client converts for display.

export type ChannelKind = 'num' | 'bool' | 'text'
export type ChannelGroup = 'drive' | 'engine' | 'race' | 'truck' | 'lights' | 'flight' | 'autopilot' | 'info'
export type Value = number | boolean | string | null
export type Frame = Record<string, Value>

export interface ChannelDef {
  id: string
  kind: ChannelKind
  group: ChannelGroup
  en: string
  pt: string
  /** canonical unit: km/h, km, L, °C, bar, rpm, %, ft, kt, fpm, ° */
  unit?: string
  min?: number
  max?: number
  /** channel that holds the live maximum (rpm -> rpmMax) */
  maxFrom?: string
  /** decimals shown by default */
  dec?: number
  /** value is 0..1 and reads better as a percentage */
  pct?: boolean
}

const n = (id: string, group: ChannelGroup, en: string, pt: string, extra: Partial<ChannelDef> = {}): ChannelDef => ({ id, kind: 'num', group, en, pt, ...extra })
const b = (id: string, group: ChannelGroup, en: string, pt: string): ChannelDef => ({ id, kind: 'bool', group, en, pt })
const t = (id: string, group: ChannelGroup, en: string, pt: string): ChannelDef => ({ id, kind: 'text', group, en, pt })

export const CHANNELS: ChannelDef[] = [
  // --- driving
  n('speed', 'drive', 'Speed', 'Velocidade', { unit: 'km/h', min: 0, max: 300 }),
  n('rpm', 'drive', 'RPM', 'RPM', { unit: 'rpm', min: 0, max: 8000, maxFrom: 'rpmMax' }),
  n('rpmMax', 'drive', 'RPM limit', 'Limite de RPM', { unit: 'rpm' }),
  n('rpmPct', 'drive', 'RPM (fraction)', 'RPM (fração)', { min: 0, max: 1, pct: true }),
  t('gear', 'drive', 'Gear', 'Marcha'),
  n('throttle', 'drive', 'Throttle', 'Acelerador', { min: 0, max: 1, pct: true }),
  n('brake', 'drive', 'Brake', 'Freio', { min: 0, max: 1, pct: true }),
  n('clutch', 'drive', 'Clutch', 'Embreagem', { min: 0, max: 1, pct: true }),
  n('steer', 'drive', 'Steering', 'Direção', { min: -1, max: 1, dec: 2 }),
  b('handbrake', 'drive', 'Handbrake', 'Freio de mão'),
  b('shiftLight', 'drive', 'Shift light', 'Luz de troca'),
  b('abs', 'drive', 'ABS active', 'ABS atuando'),
  b('tc', 'drive', 'Traction control active', 'Controle de tração atuando'),
  b('pitLimiter', 'drive', 'Pit limiter', 'Limitador de box'),
  // --- engine and fluids
  n('fuel', 'engine', 'Fuel', 'Combustível', { unit: 'L', min: 0, max: 100, maxFrom: 'fuelMax', dec: 1 }),
  n('fuelMax', 'engine', 'Tank size', 'Tanque', { unit: 'L' }),
  n('fuelPct', 'engine', 'Fuel level', 'Nível de combustível', { min: 0, max: 1, pct: true }),
  n('fuelRange', 'engine', 'Range', 'Autonomia', { unit: 'km', min: 0, max: 2000 }),
  n('waterTemp', 'engine', 'Water temp', 'Temp. da água', { unit: '°C', min: 40, max: 130 }),
  n('oilTemp', 'engine', 'Oil temp', 'Temp. do óleo', { unit: '°C', min: 40, max: 150 }),
  n('turbo', 'engine', 'Boost', 'Turbo', { unit: 'bar', min: 0, max: 2, dec: 2 }),
  n('fuelAvg', 'engine', 'Average consumption', 'Consumo médio', { unit: 'L/100km', min: 0, max: 60, dec: 1 }),
  n('oilPressure', 'engine', 'Oil pressure', 'Pressão do óleo', { unit: 'bar', min: 0, max: 8, dec: 1 }),
  n('battery', 'engine', 'Battery', 'Bateria', { unit: 'V', min: 0, max: 32, dec: 1 }),
  n('odometer', 'engine', 'Odometer', 'Hodômetro', { unit: 'km', dec: 0 }),
  b('fuelWarn', 'engine', 'Low fuel', 'Combustível baixo'),
  b('oilWarn', 'engine', 'Oil warning', 'Alerta de óleo'),
  b('batteryWarn', 'engine', 'Battery warning', 'Alerta de bateria'),
  // --- race session
  n('position', 'race', 'Position', 'Posição', { min: 1, max: 40 }),
  n('lap', 'race', 'Lap', 'Volta', { min: 0, max: 99 }),
  n('lapsTotal', 'race', 'Total laps', 'Total de voltas'),
  t('lapCurrent', 'race', 'Current lap', 'Volta atual'),
  t('lapLast', 'race', 'Last lap', 'Última volta'),
  t('lapBest', 'race', 'Best lap', 'Melhor volta'),
  n('sector', 'race', 'Sector', 'Setor', { min: 1, max: 3 }),
  n('lapProgress', 'race', 'Lap progress', 'Progresso da volta', { min: 0, max: 1, pct: true }),
  b('inPit', 'race', 'In pit lane', 'No pit lane'),
  n('brakeBias', 'race', 'Brake bias', 'Balanço de freio', { unit: '%', min: 40, max: 80, dec: 1 }),
  n('airTemp', 'race', 'Air temp', 'Temp. do ar', { unit: '°C' }),
  n('roadTemp', 'race', 'Track temp', 'Temp. da pista', { unit: '°C' }),
  n('tyreFL', 'race', 'Tyre FL', 'Pneu DE', { unit: '°C', min: 40, max: 120 }),
  n('tyreFR', 'race', 'Tyre FR', 'Pneu DD', { unit: '°C', min: 40, max: 120 }),
  n('tyreRL', 'race', 'Tyre RL', 'Pneu TE', { unit: '°C', min: 40, max: 120 }),
  n('tyreRR', 'race', 'Tyre RR', 'Pneu TD', { unit: '°C', min: 40, max: 120 }),
  // --- trucks and buses
  n('cruise', 'truck', 'Cruise control', 'Piloto automático', { unit: 'km/h', min: 0, max: 130 }),
  b('cruiseOn', 'truck', 'Cruise control on', 'Piloto automático ligado'),
  n('speedLimit', 'truck', 'Speed limit', 'Limite da via', { unit: 'km/h', min: 0, max: 130 }),
  b('overLimit', 'truck', 'Over the limit', 'Acima do limite'),
  n('retarder', 'truck', 'Retarder', 'Retarder', { min: 0, max: 4, maxFrom: 'retarderMax' }),
  n('retarderMax', 'truck', 'Retarder steps', 'Estágios do retarder'),
  b('engineBrake', 'truck', 'Engine brake', 'Freio motor'),
  n('adblue', 'truck', 'AdBlue', 'AdBlue', { unit: 'L', dec: 0 }),
  n('airPressure', 'truck', 'Brake air pressure', 'Pressão de ar dos freios', { unit: 'bar', min: 0, max: 12, dec: 1 }),
  n('brakeTemp', 'truck', 'Brake temperature', 'Temperatura dos freios', { unit: '°C', min: 0, max: 400 }),
  b('airWarn', 'truck', 'Air pressure warning', 'Alerta de pressão de ar'),
  n('truckDamage', 'truck', 'Vehicle damage', 'Dano do veículo', { min: 0, max: 1, pct: true }),
  n('cargoDamage', 'truck', 'Cargo damage', 'Dano da carga', { min: 0, max: 1, pct: true }),
  b('trailer', 'truck', 'Trailer attached', 'Carreta engatada'),
  b('onJob', 'truck', 'On a job', 'Em entrega'),
  t('cargo', 'truck', 'Cargo', 'Carga'),
  t('origin', 'truck', 'Origin', 'Origem'),
  t('destination', 'truck', 'Destination', 'Destino'),
  n('jobDistance', 'truck', 'Job distance', 'Distância da entrega', { unit: 'km' }),
  n('navDistance', 'truck', 'Route distance', 'Distância da rota', { unit: 'km' }),
  t('navTime', 'truck', 'Route time', 'Tempo da rota'),
  t('deadline', 'truck', 'Time left', 'Prazo restante'),
  t('restStop', 'truck', 'Next rest', 'Próximo descanso'),
  t('gameClock', 'truck', 'Game time', 'Hora do jogo'),
  n('income', 'truck', 'Income', 'Pagamento', { dec: 0 }),
  // --- lights
  b('blinkL', 'lights', 'Left indicator', 'Seta esquerda'),
  b('blinkR', 'lights', 'Right indicator', 'Seta direita'),
  b('hazard', 'lights', 'Hazard lights', 'Pisca-alerta'),
  b('lowBeam', 'lights', 'Low beam', 'Farol baixo'),
  b('highBeam', 'lights', 'High beam', 'Farol alto'),
  b('parkLights', 'lights', 'Parking lights', 'Lanternas'),
  b('beacon', 'lights', 'Beacon', 'Giroflex'),
  b('wipers', 'lights', 'Wipers', 'Limpadores'),
  // --- flight
  n('altitude', 'flight', 'Altitude', 'Altitude', { unit: 'ft', min: 0, max: 45000 }),
  n('ias', 'flight', 'Airspeed', 'Velocidade indicada', { unit: 'kt', min: 0, max: 400 }),
  n('groundSpeed', 'flight', 'Ground speed', 'Velocidade no solo', { unit: 'kt', min: 0, max: 600 }),
  n('vs', 'flight', 'Vertical speed', 'Razão de subida', { unit: 'fpm', min: -3000, max: 3000 }),
  n('heading', 'flight', 'Heading', 'Proa', { unit: '°', min: 0, max: 360 }),
  n('pitch', 'flight', 'Pitch', 'Arfagem', { unit: '°', min: -90, max: 90, dec: 1 }),
  n('bank', 'flight', 'Bank', 'Inclinação', { unit: '°', min: -180, max: 180, dec: 1 }),
  n('lat', 'flight', 'Latitude', 'Latitude', { dec: 4 }),
  n('lon', 'flight', 'Longitude', 'Longitude', { dec: 4 }),
  n('flaps', 'flight', 'Flaps', 'Flaps', { min: 0, max: 4 }),
  b('gearDown', 'flight', 'Gear down', 'Trem baixado'),
  b('onGround', 'flight', 'On ground', 'No solo'),
  n('spoilers', 'flight', 'Spoilers', 'Spoilers', { min: 0, max: 1, pct: true }),
  n('baro', 'flight', 'Altimeter setting', 'Ajuste do altímetro', { unit: 'inHg', dec: 2 }),
  n('com1', 'flight', 'COM1', 'COM1', { unit: 'MHz', dec: 3 }),
  n('windDir', 'flight', 'Wind direction', 'Direção do vento', { unit: '°' }),
  n('windSpeed', 'flight', 'Wind speed', 'Velocidade do vento', { unit: 'kt' }),
  n('wpDistance', 'flight', 'Next waypoint', 'Próximo waypoint', { unit: 'NM', dec: 1 }),
  t('wpEte', 'flight', 'Time to waypoint', 'Tempo até o waypoint'),
  b('lightLanding', 'flight', 'Landing lights', 'Luz de pouso'),
  b('lightTaxi', 'flight', 'Taxi lights', 'Luz de táxi'),
  b('lightNav', 'flight', 'Nav lights', 'Luz de navegação'),
  b('lightStrobe', 'flight', 'Strobes', 'Strobe'),
  // --- autopilot
  b('apMaster', 'autopilot', 'Autopilot', 'Piloto automático'),
  b('apHdg', 'autopilot', 'Heading hold', 'Manter proa'),
  n('apHdgSel', 'autopilot', 'Selected heading', 'Proa selecionada', { unit: '°' }),
  b('apAlt', 'autopilot', 'Altitude hold', 'Manter altitude'),
  n('apAltSel', 'autopilot', 'Selected altitude', 'Altitude selecionada', { unit: 'ft' }),
  b('apVs', 'autopilot', 'Vertical speed hold', 'Manter razão'),
  n('apVsSel', 'autopilot', 'Selected vertical speed', 'Razão selecionada', { unit: 'fpm' }),
  b('apNav', 'autopilot', 'NAV hold', 'Modo NAV'),
  b('apApr', 'autopilot', 'Approach hold', 'Modo aproximação'),
  // --- info
  t('game', 'info', 'Game', 'Jogo'),
  t('vehicle', 'info', 'Vehicle', 'Veículo'),
  t('track', 'info', 'Track', 'Pista'),
  b('paused', 'info', 'Paused', 'Pausado'),
  n('posX', 'info', 'World position X', 'Posição X no mundo', { unit: 'm', dec: 0 }),
  n('posZ', 'info', 'World position Z', 'Posição Z no mundo', { unit: 'm', dec: 0 })
]

export const CHANNEL: Record<string, ChannelDef> = Object.fromEntries(CHANNELS.map((c) => [c.id, c]))

export const GROUP_NAMES: Record<ChannelGroup, { en: string; pt: string }> = {
  drive: { en: 'Driving', pt: 'Pilotagem' },
  engine: { en: 'Engine', pt: 'Motor' },
  race: { en: 'Race', pt: 'Corrida' },
  truck: { en: 'Truck & bus', pt: 'Caminhão e ônibus' },
  lights: { en: 'Lights', pt: 'Luzes' },
  flight: { en: 'Flight', pt: 'Voo' },
  autopilot: { en: 'Autopilot', pt: 'Piloto automático' },
  info: { en: 'Info', pt: 'Informações' }
}

/** Games PitGlass reads. `kind` picks the default layout family. */
export const GAMES: Record<string, { name: string; kind: 'car' | 'truck' | 'plane' }> = {
  ac: { name: 'Assetto Corsa', kind: 'car' },
  acevo: { name: 'Assetto Corsa EVO', kind: 'car' },
  ets2: { name: 'Euro Truck Simulator 2', kind: 'truck' },
  ats: { name: 'American Truck Simulator', kind: 'truck' },
  beamng: { name: 'BeamNG.drive', kind: 'car' },
  motortown: { name: 'Motor Town', kind: 'truck' },
  msfs: { name: 'Microsoft Flight Simulator', kind: 'plane' }
}

export const fmtLap = (ms: number): string => {
  if (!(ms > 0) || ms >= 999_999_999) return '-:--.---'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}.${String(Math.floor(ms % 1000)).padStart(3, '0')}`
}

/** minutes -> "6h05" (negative: "-0h12") */
export const fmtDuration = (min: number): string => {
  const a = Math.abs(Math.round(min))
  return `${min < 0 ? '-' : ''}${Math.floor(a / 60)}h${String(a % 60).padStart(2, '0')}`
}

/** Values derived the same way for every game, so sources only publish what they read. */
export function derive(f: Frame): Frame {
  const num = (k: string) => (typeof f[k] === 'number' ? (f[k] as number) : null)
  const rpm = num('rpm')
  const rpmMax = num('rpmMax')
  if (f.rpmPct == null && rpm != null && rpmMax != null && rpmMax > 0) f.rpmPct = Math.min(1, Math.max(0, rpm / rpmMax))
  const fuel = num('fuel')
  const fuelMax = num('fuelMax')
  if (f.fuelPct == null && fuel != null && fuelMax != null && fuelMax > 0) f.fuelPct = Math.min(1, Math.max(0, fuel / fuelMax))
  const pct = num('rpmPct')
  if (f.shiftLight == null && pct != null) f.shiftLight = pct >= 0.94
  const speed = num('speed')
  const limit = num('speedLimit')
  if (f.overLimit == null && speed != null && limit != null) f.overLimit = limit > 0 && speed > limit + 3
  return f
}
