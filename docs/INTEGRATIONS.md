# Integrations

PitGlass is a telemetry hub: it reads the game once and gives the same values to every screen and to any tool that asks. This page is for people who want to plug something into it.

## Ports

| Port | Protocol | Bound to | What |
| --- | --- | --- | --- |
| 47830 | HTTP + WebSocket | all interfaces | dashboard page, API, telemetry stream |
| 47831 | UDP | 127.0.0.1 | drive feed in (steering, pedals, gear from a wheel app) |
| 4444 | UDP | 127.0.0.1 | BeamNG OutGauge in |
| 33330 | UDP | 127.0.0.1 | Motor Town telemetry in |

Change the HTTP port with `--port`.

## Who may call the API

- **From the PC itself** (`localhost`): everything, no key. The `Host` header must be `localhost` or `127.0.0.1`, and a write that carries an `Origin` header must come from the PitGlass page.
- **From the local network**: only with the pairing key, as `?k=<key>` or the header `x-pitglass-key`. A paired device can read and can call `/api/action`; it cannot change layouts or settings.

The key is in `%APPDATA%\PitGlass\config.json` and in the address shown by the control panel.

## Reading telemetry

```
GET http://localhost:47830/api/telemetry
```

```json
{ "game": "ets2", "data": { "speed": 84, "rpm": 1180, "gear": "12", "fuel": 612, "blinkL": true, "destination": "Praha" } }
```

`game` is `null` when nothing is running. `data` holds the channels the current game publishes: see the channel list in [LAYOUTS.md](LAYOUTS.md#channels). Units are always the canonical ones (km/h, litres, °C, bar; aviation channels in ft, kt, fpm).

For live data, open the WebSocket instead of polling:

```
ws://localhost:47830/ws
```

Messages are JSON, one object each:

| `t` | Fields | Meaning |
| --- | --- | --- |
| `full` | `game`, `d` | every channel. Sent on connect and when the game changes. |
| `diff` | `d` | only the channels that changed since the last message (about 30 per second). A channel that disappeared comes as `null`. |
| `state` | `state` | games detected, companion apps, settings |
| `layouts` | | a layout was saved or deleted: reload `/api/layouts` |

Keep an object, replace it on `full`, merge into it on `diff`.

Other read endpoints: `GET /api/state`, `GET /api/layouts`.

## Sending the drive feed (any wheel app)

Games without telemetry can still show steering, pedals and gear if a wheel app sends what it reads from the device. Send one UDP datagram per update to `127.0.0.1:47831`, JSON:

```json
{ "steer": -0.12, "throttle": 0.8, "brake": 0, "clutch": 0, "gear": "3" }
```

`steer` is -1 (left) to 1 (right), pedals 0 to 1, `gear` is a string or `null`. This is the format MyWheel already sends to IAmPcGamer on port 47821, so pointing a second copy of that feed at 47831 is all it takes. When a game is sending telemetry, the feed only fills the channels the game leaves out; with no game, it shows as the game `wheel` and opens the *Wheel inputs* layout.

## BeamNG and Motor Town: one listener per port

These games send UDP to a single address, and a UDP port has one owner. If another app (FreeDock, SimHub…) is already listening on 4444 or 33330, PitGlass shows the game as *port in use by another app* and keeps retrying, so it takes over as soon as the port is free. Until the feed can be shared, choose which app gets it by closing the other one, or by pointing the game at a different port for the other app.

Assetto Corsa, ETS2/ATS and Flight Simulator do not have this limit: shared memory and SimConnect accept any number of readers, so PitGlass and FreeDock read them side by side.

## Actions (dashboard buttons)

```
POST /api/action
{ "app": "msfs", "action": "event", "arg": "AP_MASTER" }
```

Nothing outside this table is accepted:

| app | action | arg | Does |
| --- | --- | --- | --- |
| `msfs` | `event` | one of the events below | fires a sim event |
| `freedock` | `page` | page id | shows that page on the deck |
| `freedock` | `notify` | message | shows a notification on the deck |
| `ambibox` | `flash` | `#rrggbb` | short pulse on the LED strip |
| `ambibox` | `fx` | `1` or `0` | game effects on or off |
| `iampcgamer` | `capture` | | takes a screenshot |
| `iampcgamer` | `overlay` | | toggles the overlay |
| `iampcgamer` | `tip` | title | shows a tip on the overlay |

Flight Simulator events: `AP_MASTER`, `AP_PANEL_HEADING_HOLD`, `AP_PANEL_ALTITUDE_HOLD`, `AP_PANEL_VS_HOLD`, `AP_NAV1_HOLD`, `AP_APR_HOLD`, `HEADING_BUG_INC`, `HEADING_BUG_DEC`, `AP_ALT_VAR_INC`, `AP_ALT_VAR_DEC`, `AP_VS_VAR_INC`, `AP_VS_VAR_DEC`, `GEAR_TOGGLE`, `FLAPS_INCR`, `FLAPS_DECR`, `PARKING_BRAKES`, `LANDING_LIGHTS_TOGGLE`, `TOGGLE_TAXI_LIGHTS`, `TOGGLE_NAV_LIGHTS`, `STROBES_TOGGLE`, `TOGGLE_BEACON_LIGHTS`, `KOHLSMAN_INC`, `KOHLSMAN_DEC`, `BAROMETRIC`.

## Companion apps

PitGlass reaches each one through that app's own local channel, and works the same when they are closed.

| App | Channel PitGlass uses |
| --- | --- |
| FreeDock | HTTP `127.0.0.1:47810` (`/info`, `/page`, `/notify`) |
| Ambibox LED | UDP `127.0.0.1:47811`, JSON `{cmd: status \| fx \| layer}` |
| IAmPcGamer | HTTP `127.0.0.1:47820` (`/status`, `/capture`, `/overlay`, `/tip`) |
| MyWheel | seen through IAmPcGamer's device list; drive feed on UDP 47831 |

## Adding a game

A game is a `Source` in `src/server/sources`:

```ts
export interface Source {
  id: string
  poll(now: number): Frame | null   // null while the game is not sending anything
  status(): SourceStatus
  stop(): void
}
```

`poll` is called about 30 times a second and returns a flat object of channel values with `game` set to the game id. Publish what the game gives you in canonical units; `derive()` in `src/shared/channels.ts` fills `rpmPct`, `fuelPct`, `shiftLight` and `overLimit` for every game. Register the source in `src/server/main.ts`, add the game to `GAMES` and to `DEFAULT_LAYOUT`, and write a decoder test with a synthetic buffer in `src/server/pitglass.test.ts`.
