# Stonewake: RS-authenticity UI overhaul — design

Date: 2026-07-17

## Goal

Make moment-to-moment play look and feel like old-school RuneScape: an
always-visible chatbox, a viewport that fills a PC screen with mouse-wheel
zoom, yellow/red click markers, hover text identifying everything, and tall
RS-proportioned character/monster sprites. No gameplay-rule changes.

## Decisions (settled with TJ)

- All game messages move to the chatbox; toasts are removed entirely.
- The chat input is visible to everyone; plain text echoes locally as
  `Name: text` (the plumbing future multiplayer chat will reuse). Admin `::`
  commands run from the chat input; the separate `#command-bar` is deleted.
  Non-admins typing `::anything` are silently ignored.
- Hover feedback is OSRS-style top-left viewport text, not a cursor tooltip.
- Zoom is the mouse wheel. Characters get tall RS-proportioned sprites; the
  Ashen Warden becomes visually boss-sized. Terrain sprites stay as-is.

## Layout (fill the PC)

The page becomes a full-viewport frame (body margin/padding 0, no outer
centering): a game column (canvas on top, chatbox docked below, RS-style)
filling all space left of the existing 260px sidebar. The canvas backing
store is sized to its on-screen pixel size on load and on window resize
(`canvas.width/height = clientWidth/clientHeight`, snapped to integers);
the renderer derives its tile viewport from canvas size every frame, so
resize needs no other plumbing. The login screen overlay is unchanged.

## Chatbox

- Markup: `#chatbox` under the canvas — `#chat-log` (scrollable message
  list, ~160px tall) + `#chat-entry` (single-line input, always visible).
- New `js/chat.js`:
  - `initChat(el)` — binds the log/input elements.
  - `addLine(html, color?)` — appends a line, trims the log to the newest
    100 lines, autoscrolls (unless the user has scrolled up).
  - `onSubmit(handler)` — called with the typed string on Enter.
- `ui.js`'s exported `toast(html)` becomes a thin wrapper over
  `addLine(html)` so all existing call sites (ui.js, engage/loot callbacks,
  context-menu examines, login.js) keep working; the `#toasts` div, toast
  CSS, and toast animation are deleted. Examine text, loot, level-ups,
  death, eating — all land in chat.
- Input behavior (wired in `login.js` where the command bar used to be):
  Enter (while the input is unfocused and the game is running) focuses the
  chat input; Esc blurs it. Submitting text:
  - starts with `::` and profile.is_admin → `runCommand`, result message
    `addLine`d in yellow (`#d8b25a`); a successful command still pushes the
    cloud save immediately.
  - starts with `::` and not admin → ignored silently.
  - plain text → `addLine("<b>Name:</b> text", "#7fb0d8")` (username from the
    profile fetched at login; HTML-escaped).
  - empty → just blurs.
  Chat-input keystrokes must not reach game handlers; idle listeners are
  capture-phase (already) so typing counts as activity.

## Zoom

- `render.js`: `TILE_PX` becomes renderer state `tilePx` (default 32,
  clamped 16–64, wheel steps ×2 per notch: 16, 32, 64 — chunky like OSRS).
  Renderer exposes `zoom(delta)`; `main.js` wires `wheel` on the canvas
  (preventDefault) → `renderer.zoom(e.deltaY < 0 ? +1 : -1)`.
- `viewW/viewH` and `screenToTile` derive from current `tilePx` and canvas
  size per call (already parameterized by division — no formula changes).
- `PIXEL_SCALE` derives from `tilePx / 16` so sprites scale with zoom.
- Pure helper `clampZoom(current, delta) -> newTilePx` unit-tested.

## Click markers

- `game.effects.clicks = [{ x, y, kind: "yellow" | "red", bornAt }]` with
  `bornAt = performance.now()`; the renderer animates from age and drops
  entries older than 600 ms — no game-tick coupling, smooth shrink.
- Classification in a pure function (new `js/inspect.js`, see Hover):
  `clickKind(game, t) -> "red" | "yellow"` — red when the tile holds a live
  monster, the class stone, or a ground item; yellow otherwise. The canvas
  click handler in `main.js` pushes a marker on every left click.
- Renderer draws a 4-spoke X centered on the tile, shrinking from ~14px to
  0 over its 600 ms life; yellow `#e8e13a`, red `#c03a2e` (RS colors).

## Hover text + shared tile inspection

- New `js/inspect.js` (pure, unit-tested):
  - `describeTile(game, t) -> { name, action, color } | null` — precedence:
    live monster → `{ name: "Mire Rat (level 2)", action: "Attack",
    color: "#f39c2b" }` (boss included, same path); class stone →
    `{ name: "Class Stone", action: "Use", color: "#d8b25a" }`; ground item
    (top item) → `{ name: "Roast Perch", action: "Take", color: by rarity/
    type }`; tree/rock → `{ name: "Tree"/"Rock", action: "Examine" }`;
    walkable ground → null.
  - `clickKind(game, t)` as above (red iff monster/stone/ground item).
- `context-menu.js` is refactored to build its header rows from
  `describeTile` (its five duplicated identification blocks collapse;
  examine texts stay where they are).
- Hover: `mousemove` on the canvas (throttled to animation frames) →
  `screenToTile` → `describeTile` → renderer draws top-left viewport text:
  `Attack Mire Rat (level 2)` with the action in white and the name in the
  entry's color, OSRS-style; `Walk here` in white for null. Nothing on
  monsters that are respawning.

## RS-scale sprites

- Authored in the existing pixel-map format (`sprites-hd.js` supports any
  dimensions via `spriteSize`):
  - `playerMelee/Ranged/Magic`: 16×24 (32×48 on screen at default zoom) —
    RS proportions (small head, long torso), each visibly holding its
    class weapon.
  - `mireRat`: stays low — 16×12, long body.
  - `bogling`: 16×20 hunched.
  - `ashenWarden`: 24×32 (48×64 on screen) — boss presence.
- Renderer entity drawing becomes bottom-center anchored: draw at
  `px + (TILE - w)/2, py + TILE - h` so feet sit on the tile and bodies
  rise over the tile behind. Entities (monsters + player) draw y-sorted
  ascending so southern sprites overlap northern ones (RS depth).
- Health bars and hitsplats anchor to the sprite's head
  (`py + TILE - spriteHeight`) instead of the tile top.
- Terrain (trees, rocks, stone) unchanged in this pass.

## Error handling

- Chat log capped at 100 lines; user-typed text is HTML-escaped before
  `addLine` (game-internal messages keep using HTML, e.g. rarity colors).
- Zoom clamped; wheel outside the canvas untouched (page has no scroll).
- Hover with no map tile under the cursor (letterboxed edges when the map
  is smaller than the viewport at min zoom) → no text; `screenToTile`
  results outside map bounds are ignored everywhere they're consumed.
- Resize to tiny windows: canvas has a min size (640×400); below that the
  layout scrolls rather than collapsing.

## Testing

- `tests/inspect.test.js` — `describeTile` precedence (monster over ground
  item on same tile), boss naming, respawning monsters excluded, stone,
  items with rarity colors, tree/rock, empty ground null; `clickKind` red/
  yellow matrix.
- `tests/chat.test.js` — line capping at 100, HTML escaping of user text.
- `tests/render-helpers.test.js` — `clampZoom` bounds and steps; click-
  marker expiry helper if extracted.
- Existing 67 tests keep passing (toast() call sites unchanged in
  signature).
- Headless browser pass: layout fills 1920×1080, chatbox visible with
  messages flowing, wheel zoom changes visible tile size, yellow/red
  markers appear on the right targets, hover text correct over monster/
  stone/item/ground, tall sprites render bottom-anchored, admin `::heal`
  via chat input works, non-admin plain chat echoes.

## Out of scope

Multiplayer chat transport, minimap, terrain sprite rework, sound, mobile
layout, any combat/loot/save changes.
