# Layouts

A layout is one JSON file: a grid, a color theme and one or more pages of widgets. The editor in the control panel writes these files for you; this page documents the format for people who prefer a text editor, or who want to generate layouts.

User layouts are stored in `%APPDATA%\PitGlass\layouts\<id>.json` (`~/.config/pitglass/layouts` elsewhere). The built-in ones are in [`src/shared/layouts.ts`](../src/shared/layouts.ts).

## Format

```json
{
  "pitglass": 1,
  "id": "my-truck",
  "name": "My truck",
  "author": "you",
  "kind": "truck",
  "cols": 24,
  "rows": 12,
  "theme": { "bg": "#05070a", "panel": "#0f141b", "text": "#f1f5f9", "dim": "#7c8a9c", "accent": "#fbbf24" },
  "pages": [
    {
      "name": "Drive",
      "widgets": [
        { "id": "a", "type": "value", "x": 0, "y": 0, "w": 9, "h": 6, "ch": "speed", "p": { "warn": "overLimit" } },
        { "id": "b", "type": "lamp", "x": 9, "y": 0, "w": 3, "h": 2, "ch": "blinkL", "p": { "icon": "left", "color": "#22c55e" } }
      ]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `pitglass` | format version, always `1` |
| `id` | lowercase letters, digits and `-`, up to 48 characters. It is the file name. |
| `kind` | `car`, `truck`, `plane` or `any`: which games the layout was drawn for. Used for the preview data. |
| `cols`, `rows` | size of the grid (4 to 64 columns, 2 to 64 rows). The grid stretches to fill the screen, so 24 x 12 gives square cells on a 2:1 phone. |
| `theme` | five colors as `#rrggbb`: background, panels, text, labels and accent. Two optional fields set the look, see below. |
| `pages` | 1 to 12 pages. Swipe on the phone to change page. |

Each widget has a position and size in grid cells (`x`, `y`, `w`, `h`), a `type`, usually a channel `ch`, and optional properties in `p`. Widgets should not overlap.

A label or text that starts with `@` is translated by PitGlass (`@fuel`, `@destination`, `@cargo`, `@origin`, `@track`, `@trailer`, `@vehicle`, `@wind`, `@waiting`). Anything else is shown as written.

Which layout opens for which game is a setting in the control panel, not part of the layout. To open one layout on a screen whatever the game, add it to the address: `http://<pc>:47830/?layout=truck-classic&page=2`.

### Look

| `theme` field | Values |
| --- | --- |
| `font` | `sans` (default), `condensed`, `mono`, `serif`. Only fonts already on the device are used, so the phone needs no internet. |
| `style` | `flat` (default): filled panels. `outline`: black boxes with a thin frame, in the widget's own color when it has one. `bezel`: shaded panels, and dials become round instruments with a chrome ring. `bare`: no panels at all. |

The colors do the rest: a cream `panel` with dark `text` and the `serif` font gives a 1960s instrument; green `text` on black with `mono` gives a 1980s digital dash.

## Widgets

<!-- widgets:start -->
| `type` | What it is | Channel | Properties (`p`) |
| --- | --- | --- | --- |
| `value` | Number | any channel | `label` label; `color` color; `dec` decimals; `warnAbove` alert above; `warnBelow` alert below; `warn` alert when on |
| `digits` | Segment display | any channel | `label` label; `color` color; `digits` digits; `dec` decimals; `plain` no label |
| `gear` | Gear | text | `color` color |
| `rpm` | Shift lights | a number | `segments` segments; `from` starts at (0-1) |
| `tach` | Bar tachometer | a number | `color` color; `segments` segments; `redFrom` red zone from (0-1); `curve` rising curve; `max` maximum |
| `bar` | Bar | a number | `label` label; `color` color; `dir` direction (h, v); `min` minimum; `max` maximum; `center` grows from the center |
| `gauge` | Gauge | a number | `label` label; `color` color; `min` minimum; `max` maximum; `redFrom` red zone from (0-1); `dec` decimals |
| `dial` | Analog dial | a number | `label` label; `color` needle color; `min` minimum; `max` maximum; `step` number every; `redFrom` red zone from (0-1); `sweep` sweep in degrees; `marks` own marks (e,½,f); `digital` show the number too |
| `lamp` | Indicator light | on/off | `label` label; `icon` icon (left, right, high, low, park, hazard, beacon, wiper, cruise, fuel, warn, bolt, plane, camera, layers, arrow, dot); `color` color; `invert` lit when off |
| `text` | Text | any channel | `label` label; `text` fixed text; `color` color; `dimText` dim; `bare` no panel |
| `clock` | Clock | none | `seconds` seconds; `date` date; `color` color |
| `tyres` | Tyre temperatures | none | none |
| `limit` | Speed limit sign | a number | none |
| `attitude` | Artificial horizon | none | `round` round instrument |
| `altimeter` | Altimeter | a number | none |
| `rose` | Heading indicator | a number | none |
| `compass` | Heading tape | a number | `span` degrees visible |
| `map` | Moving map | none | `zoom` zoom (3-16); `light` light map; `rotate` heading up (map turns); `icon` marker (auto, plane, arrow) |
| `track` | Track map | none | `color` color; `line` track color; `range` follow the vehicle: radius in m (0 = whole track) |
| `button` | Button | on/off | `label` label; `icon` icon (left, right, high, low, park, hazard, beacon, wiper, cruise, fuel, warn, bolt, plane, camera, layers, arrow, dot); `color` color; `app` sends to (msfs, freedock, ambibox, iampcgamer); `action` action (event, page, notify, flash, fx, capture, overlay, tip); `arg` parameter |
<!-- widgets:end -->

Icons for `lamp` and `button`: `left`, `right`, `high`, `low`, `park`, `hazard`, `beacon`, `wiper`, `cruise`, `fuel`, `warn`, `bolt`, `plane`, `camera`, `layers`, `dot`.

Notes on the instruments:

- `dial` builds its scale from the range: a number every 1, 2 or 5 units, and long numbers drop a factor (7000 rpm reads `7` under `×1000`). `step` is in the unit shown on screen. `marks` replaces the numbers with your own, evenly spaced: `E,½,F` for fuel, `C,,H` for temperature.
- `digits` shows letters as far as seven segments allow, so a gear reads `n` or `r`. Set `digits` to the longest value you expect (`6` for a lap time).
- `tach` and `dial` follow the car's rev limit when the game reports one.

A `button` with a channel lights up while that channel is on, so it doubles as an indicator (the autopilot page uses this). What a button may send is listed in [INTEGRATIONS.md](INTEGRATIONS.md#actions-dashboard-buttons).

## Maps and a second screen

Every screen keeps its own layout choice (tap the screen, pick one in the toolbar), so a tablet can show a map while the phone shows the dashboard. Three built-in layouts are made for that:

- **Track map** (`map-track`): the `track` widget draws the circuit and where you are on it. In Assetto Corsa it uses the game's own drawing of the track; in any game that publishes a position, the map draws itself as you drive (a lap is enough). Set `range` to follow the vehicle with a fixed radius instead of fitting the whole track.
- **Truck GPS** (`map-truck`): the `map` widget with `rotate` on, so the map turns with the truck, plus speed limit, route distance and time. ETS2 and ATS positions are placed on the real map of Europe / North America: right region and cities, not the exact road (the game world is about 1:19). A second page shows the overview, north up.
- **Moving map** (`map-flight`): the aircraft on the real map, for Flight Simulator.

The real map is OpenStreetMap and needs internet on the screen that shows it. Other cars on the track are not shown: Assetto Corsa only publishes the player's position.

## Channels

A channel is one value with the same name in every game. A layout made for one game keeps working in another wherever the channel exists; a channel the game does not publish shows as `–`.

Values are stored in the units below. With imperial units selected, the page converts km/h, km, litres, °C and bar for display.

<!-- channels:start -->
### Driving

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `speed` | Speed | number | km/h |
| `rpm` | RPM | number | rpm |
| `rpmMax` | RPM limit | number | rpm |
| `rpmPct` | RPM (fraction) | number, 0 to 1 |  |
| `gear` | Gear | text |  |
| `throttle` | Throttle | number, 0 to 1 |  |
| `brake` | Brake | number, 0 to 1 |  |
| `clutch` | Clutch | number, 0 to 1 |  |
| `steer` | Steering | number |  |
| `handbrake` | Handbrake | on/off |  |
| `shiftLight` | Shift light | on/off |  |
| `abs` | ABS active | on/off |  |
| `tc` | Traction control active | on/off |  |
| `pitLimiter` | Pit limiter | on/off |  |

### Engine

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `fuel` | Fuel | number | L |
| `fuelMax` | Tank size | number | L |
| `fuelPct` | Fuel level | number, 0 to 1 |  |
| `fuelRange` | Range | number | km |
| `waterTemp` | Water temp | number | °C |
| `oilTemp` | Oil temp | number | °C |
| `turbo` | Boost | number | bar |
| `fuelWarn` | Low fuel | on/off |  |
| `oilWarn` | Oil warning | on/off |  |
| `batteryWarn` | Battery warning | on/off |  |

### Race

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `position` | Position | number |  |
| `lap` | Lap | number |  |
| `lapsTotal` | Total laps | number |  |
| `lapCurrent` | Current lap | text |  |
| `lapLast` | Last lap | text |  |
| `lapBest` | Best lap | text |  |
| `sector` | Sector | number |  |
| `lapProgress` | Lap progress | number, 0 to 1 |  |
| `inPit` | In pit lane | on/off |  |
| `brakeBias` | Brake bias | number | % |
| `airTemp` | Air temp | number | °C |
| `roadTemp` | Track temp | number | °C |
| `tyreFL` | Tyre FL | number | °C |
| `tyreFR` | Tyre FR | number | °C |
| `tyreRL` | Tyre RL | number | °C |
| `tyreRR` | Tyre RR | number | °C |

### Truck & bus

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `cruise` | Cruise control | number | km/h |
| `cruiseOn` | Cruise control on | on/off |  |
| `speedLimit` | Speed limit | number | km/h |
| `overLimit` | Over the limit | on/off |  |
| `retarder` | Retarder | number |  |
| `retarderMax` | Retarder steps | number |  |
| `engineBrake` | Engine brake | on/off |  |
| `adblue` | AdBlue | number | L |
| `airWarn` | Air pressure warning | on/off |  |
| `truckDamage` | Vehicle damage | number, 0 to 1 |  |
| `cargoDamage` | Cargo damage | number, 0 to 1 |  |
| `trailer` | Trailer attached | on/off |  |
| `onJob` | On a job | on/off |  |
| `cargo` | Cargo | text |  |
| `origin` | Origin | text |  |
| `destination` | Destination | text |  |
| `jobDistance` | Job distance | number | km |
| `navDistance` | Route distance | number | km |
| `navTime` | Route time | text |  |
| `deadline` | Time left | text |  |
| `restStop` | Next rest | text |  |
| `gameClock` | Game time | text |  |
| `income` | Income | number |  |

### Lights

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `blinkL` | Left indicator | on/off |  |
| `blinkR` | Right indicator | on/off |  |
| `hazard` | Hazard lights | on/off |  |
| `lowBeam` | Low beam | on/off |  |
| `highBeam` | High beam | on/off |  |
| `parkLights` | Parking lights | on/off |  |
| `beacon` | Beacon | on/off |  |
| `wipers` | Wipers | on/off |  |

### Flight

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `altitude` | Altitude | number | ft |
| `ias` | Airspeed | number | kt |
| `groundSpeed` | Ground speed | number | kt |
| `vs` | Vertical speed | number | fpm |
| `heading` | Heading | number | ° |
| `pitch` | Pitch | number | ° |
| `bank` | Bank | number | ° |
| `lat` | Latitude | number |  |
| `lon` | Longitude | number |  |
| `flaps` | Flaps | number |  |
| `gearDown` | Gear down | on/off |  |
| `onGround` | On ground | on/off |  |
| `spoilers` | Spoilers | number, 0 to 1 |  |
| `baro` | Altimeter setting | number | inHg |
| `com1` | COM1 | number | MHz |
| `windDir` | Wind direction | number | ° |
| `windSpeed` | Wind speed | number | kt |
| `wpDistance` | Next waypoint | number | NM |
| `wpEte` | Time to waypoint | text |  |
| `lightLanding` | Landing lights | on/off |  |
| `lightTaxi` | Taxi lights | on/off |  |
| `lightNav` | Nav lights | on/off |  |
| `lightStrobe` | Strobes | on/off |  |

### Autopilot

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `apMaster` | Autopilot | on/off |  |
| `apHdg` | Heading hold | on/off |  |
| `apHdgSel` | Selected heading | number | ° |
| `apAlt` | Altitude hold | on/off |  |
| `apAltSel` | Selected altitude | number | ft |
| `apVs` | Vertical speed hold | on/off |  |
| `apVsSel` | Selected vertical speed | number | fpm |
| `apNav` | NAV hold | on/off |  |
| `apApr` | Approach hold | on/off |  |

### Info

| Channel | Meaning | Type | Unit |
| --- | --- | --- | --- |
| `game` | Game | text |  |
| `vehicle` | Vehicle | text |  |
| `track` | Track | text |  |
| `paused` | Paused | on/off |  |
| `posX` | World position X | number | m |
| `posZ` | World position Z | number | m |
<!-- channels:end -->

## Sharing

**Export** in the control panel saves a `.pitglass.json` file; **Import** loads one. To offer a layout to everyone, add the file to the [`layouts/`](../layouts) folder with a pull request.
