# RS-Authenticity UI Implementation Plan

> Execute task-by-task; steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chatbox, fill-screen viewport with wheel zoom, yellow/red click markers, top-left hover text, and tall RS-proportioned sprites — per `docs/specs/2026-07-17-rs-authenticity-ui-design.md`.

**Architecture:** A shared pure `js/inspect.js` identifies what's on a tile (hover, click markers, and the context menu all consume it). `js/chat.js` owns the always-visible chatbox; `toast()` becomes a chat line so every call site migrates for free. The renderer gains zoom state (variable tile size), bottom-anchored y-sorted entity drawing, click-marker and hover-text painting; `main.js` gains resize/wheel/mousemove wiring.

**Tech Stack:** Vanilla JS ES modules, `node --test`, Canvas 2D. No new dependencies.

## Global Constraints

- Plain descriptive commit messages; no attribution trailers, no tooling mentions in committed files.
- **All git commands are run by TJ** (grants are per-request). Three commit gates: after Task 3, after Task 6, after Task 8.
- House style: 4-space indent, double quotes, injected I/O, pure logic in own modules.
- Exact values from the spec: chat log cap 100 lines; zoom steps 16/32/64 px per tile (default 32); click markers live 600 ms (yellow `#e8e13a`, red `#c03a2e`); hover text top-left, action in white, name in the entry color; player sprites 16×24, mireRat 16×12, bogling 16×20, ashenWarden 24×32; entities bottom-center anchored and y-sorted ascending.
- Do not push until the Task 8 verification passes (Pages deploys `main`).

---

### Task 1: Shared tile inspection (`inspect.js`)

**Files:**
- Create: `js/inspect.js`
- Modify: `js/context-menu.js` (headers from `describeTile`)
- Test: `tests/inspect.test.js`

**Interfaces:**
- Consumes: `MONSTERS`, `FOODS`, `WEAPONS` from `js/entities.js`; `CLASS_STONE` from `js/world.js`; the `game` object shape (`game.state.monsters`, `game.state.groundItems`, `game._map.tiles`).
- Produces: `describeTile(game, t) -> { name, action, color } | null` and `clickKind(game, t) -> "red" | "yellow"`. Precedence: live monster > class stone > ground item (topmost) > tree/rock > null. `clickKind` is red exactly when the action is Attack/Use/Take.

- [ ] **Step 1: Write the failing tests**

Create `tests/inspect.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeTile, clickKind } from "../js/inspect.js";
import { CLASS_STONE } from "../js/world.js";

function fakeGame({ monsters = [], groundItems = [], tiles = [] } = {}) {
    return { state: { monsters, groundItems }, _map: { tiles } };
}

test("live monster: Attack name (level), boss included", () => {
    const g = fakeGame({ monsters: [{ type: "mireRat", x: 3, y: 4, respawnIn: 0 }] });
    assert.deepEqual(describeTile(g, { x: 3, y: 4 }),
        { name: "Mire Rat (level 2)", action: "Attack", color: "#f39c2b" });
    const b = fakeGame({ monsters: [{ type: "ashenWarden", x: 1, y: 1, respawnIn: 0 }] });
    assert.equal(describeTile(b, { x: 1, y: 1 }).name, "Ashen Warden (level 30)");
});

test("respawning monsters are invisible to inspection", () => {
    const g = fakeGame({ monsters: [{ type: "mireRat", x: 3, y: 4, respawnIn: 5 }] });
    assert.equal(describeTile(g, { x: 3, y: 4 }), null);
});

test("monster wins over a ground item on the same tile", () => {
    const g = fakeGame({
        monsters: [{ type: "bogling", x: 2, y: 2, respawnIn: 0 }],
        groundItems: [{ item: "roastPerch", x: 2, y: 2 }],
    });
    assert.equal(describeTile(g, { x: 2, y: 2 }).action, "Attack");
});

test("class stone", () => {
    const g = fakeGame();
    assert.deepEqual(describeTile(g, { x: CLASS_STONE.x, y: CLASS_STONE.y }),
        { name: "Class Stone", action: "Use", color: "#d8b25a" });
});

test("ground items: coins with qty, food green, weapon by rarity", () => {
    const at = (item, extra = {}) => describeTile(
        fakeGame({ groundItems: [{ item, x: 0, y: 0, ...extra }] }), { x: 0, y: 0 });
    assert.deepEqual(at("coins", { qty: 40 }), { name: "Coins (40)", action: "Take", color: "#d8b25a" });
    assert.deepEqual(at("roastPerch"), { name: "Roast Perch", action: "Take", color: "#2e8b2e" });
    assert.deepEqual(at("emberbrandGreatsword"),
        { name: "Emberbrand Greatsword", action: "Take", color: "#f39c2b" });
    assert.equal(at("wornBow").color, "#9aa0a6");
});

test("tree and rock examine; empty ground is null", () => {
    const g = fakeGame({ tiles: [["T", "R", "."]] });
    assert.deepEqual(describeTile(g, { x: 0, y: 0 }), { name: "Tree", action: "Examine", color: "#3f6b35" });
    assert.deepEqual(describeTile(g, { x: 1, y: 0 }), { name: "Rock", action: "Examine", color: "#8a857a" });
    assert.equal(describeTile(g, { x: 2, y: 0 }), null);
    assert.equal(describeTile(g, { x: 99, y: 99 }), null); // out of bounds
});

test("clickKind: red for interactables, yellow otherwise", () => {
    const m = fakeGame({ monsters: [{ type: "mireRat", x: 0, y: 0, respawnIn: 0 }], tiles: [[".", "T"]] });
    assert.equal(clickKind(m, { x: 0, y: 0 }), "red");
    assert.equal(clickKind(m, { x: 1, y: 0 }), "yellow"); // tree: Examine -> yellow walk feedback
    assert.equal(clickKind(fakeGame(), { x: CLASS_STONE.x, y: CLASS_STONE.y }), "red");
    assert.equal(clickKind(fakeGame({ groundItems: [{ item: "coins", qty: 1, x: 0, y: 0 }] }), { x: 0, y: 0 }), "red");
    assert.equal(clickKind(fakeGame(), { x: 5, y: 5 }), "yellow");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` — expected: FAIL, cannot find module `js/inspect.js`.

- [ ] **Step 3: Implement `js/inspect.js`**

```js
import { MONSTERS, FOODS, WEAPONS } from "./entities.js";
import { CLASS_STONE } from "./world.js";

const RARITY_COLORS = { gray: "#9aa0a6", blue: "#4f9dde", orange: "#f39c2b" };

export function describeTile(game, t) {
    const monster = game.state.monsters.find((m) => m.respawnIn <= 0 && m.x === t.x && m.y === t.y);
    if (monster) {
        const def = MONSTERS[monster.type];
        return { name: `${def.name} (level ${def.level})`, action: "Attack", color: "#f39c2b" };
    }
    if (t.x === CLASS_STONE.x && t.y === CLASS_STONE.y) {
        return { name: "Class Stone", action: "Use", color: "#d8b25a" };
    }
    const g = (game.state.groundItems || []).find((i) => i.x === t.x && i.y === t.y);
    if (g) {
        if (g.item === "coins") return { name: `Coins (${g.qty})`, action: "Take", color: "#d8b25a" };
        if (FOODS[g.item]) return { name: FOODS[g.item].name, action: "Take", color: "#2e8b2e" };
        const w = WEAPONS[g.item];
        return { name: w.name, action: "Take", color: RARITY_COLORS[w.rarity] };
    }
    const tile = game._map.tiles[t.y]?.[t.x];
    if (tile === "T") return { name: "Tree", action: "Examine", color: "#3f6b35" };
    if (tile === "R") return { name: "Rock", action: "Examine", color: "#8a857a" };
    return null;
}

export function clickKind(game, t) {
    const d = describeTile(game, t);
    return d && d.action !== "Examine" ? "red" : "yellow";
}
```

- [ ] **Step 4: Refactor `js/context-menu.js` headers onto `describeTile`**

Add to imports: `import { describeTile } from "./inspect.js";`
In `initContextMenu`'s contextmenu handler, replace each hand-built header line with the shared description (menu structure and all actions stay identical):

- Monster block: replace `entries.push({ label: def.name, color: "#f39c2b" });` with

```js
            const desc = describeTile(game, t);
            entries.push({ label: desc.name, color: desc.color });
```

- Class stone block: replace `entries.push({ label: "Class Stone", color: "#d8b25a" });` with the same two lines (the stone branch only runs when no monster matched, so `describeTile` returns the stone).
- Ground-items block: keep the existing per-item loop untouched (the menu lists every item on the tile; `describeTile` reports only the top one).
- Tree/rock blocks: replace their `entries.push({ label: ..., color: ... });` header lines with `describeTile` results the same way, guarding with `if (desc)`.

- [ ] **Step 5: Run tests** — `npm test`, expected: all PASS.

---

### Task 2: Chatbox (`chat.js`, markup, toast migration)

**Files:**
- Create: `js/chat.js`
- Modify: `index.html` (chatbox markup in a new play column; delete `#toasts` and `#command-bar`)
- Modify: `js/ui.js` (`toast` delegates to `addLine`; remove toast DOM code)
- Modify: `js/context-menu.js` (examine actions use `addLine` instead of hand-built toast DOM)
- Modify: `js/login.js` (chat input wiring replaces `initCommandBar`)
- Modify: `styles.css` (chatbox styles; delete toast + command-bar styles)
- Test: `tests/chat.test.js`

**Interfaces:**
- Consumes: `runCommand` (existing), `profile` from login flow.
- Produces: `initChat(logEl, inputEl)`, `addLine(html, color?)`, `onSubmit(fn)`, `escapeHtml(s)`, `MAX_LINES = 100` from `js/chat.js`. `toast(html)` keeps its signature everywhere.

- [ ] **Step 1: Write the failing tests**

Create `tests/chat.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, initChat, escapeHtml, MAX_LINES } from "../js/chat.js";

function fakeLog() {
    const children = [];
    const log = {
        children,
        appendChild(c) { c._parent = log; children.push(c); },
        get firstChild() { return children[0] ?? null; },
        scrollTop: 0, clientHeight: 100, scrollHeight: 100,
    };
    return log;
}
globalThis.document = {
    createElement: () => {
        const el = { style: {}, className: "", innerHTML: "" };
        el.remove = () => {
            const i = el._parent.children.indexOf(el);
            if (i >= 0) el._parent.children.splice(i, 1);
        };
        return el;
    },
};

test("escapeHtml neutralizes markup", () => {
    assert.equal(escapeHtml(`<b onclick="x">&'`), "&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;");
});

test("log is capped at MAX_LINES", () => {
    const log = fakeLog();
    const input = { addEventListener() {} };
    initChat(log, input);
    for (let i = 0; i < MAX_LINES + 25; i++) addLine(`line ${i}`);
    assert.equal(log.children.length, MAX_LINES);
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test`, FAIL: cannot find `js/chat.js`.

- [ ] **Step 3: Implement `js/chat.js`**

```js
export const MAX_LINES = 100;

let logEl = null;
let inputEl = null;
let submitHandler = null;

export function initChat(log, input) {
    logEl = log;
    inputEl = input;
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
            input.blur();
        } else if (e.key === "Enter") {
            const text = input.value.trim();
            input.value = "";
            if (!text) { input.blur(); return; }
            if (submitHandler) submitHandler(text);
        }
    });
}

export function onSubmit(fn) { submitHandler = fn; }

export function addLine(html, color) {
    if (!logEl) return;
    const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 4;
    const line = document.createElement("div");
    line.className = "chat-line";
    if (color) line.style.color = color;
    line.innerHTML = html;
    logEl.appendChild(line);
    while (logEl.children.length > MAX_LINES) logEl.firstChild.remove();
    if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}

export function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}
```

- [ ] **Step 4: Run tests** — `npm test`, expected PASS.

- [ ] **Step 5: Markup — `index.html`**

Replace the current `#game` block's children with a play column (canvas keeps its id; width/height attributes stay as fallbacks and are overwritten at runtime):

```html
<div id="game">
    <div id="play-column">
        <canvas id="canvas" width="800" height="608"></canvas>
        <div id="chatbox">
            <div id="chat-log"></div>
            <input id="chat-entry" placeholder="Press Enter to chat" spellcheck="false" autocomplete="off" maxlength="120">
        </div>
    </div>
    <aside id="hud">
        ...existing hud children unchanged...
    </aside>
</div>
```

Delete the `<div id="toasts"></div>` line and the entire `#command-bar` line.

- [ ] **Step 6: `js/ui.js` — toast becomes a chat line**

Replace the `toast` function body (and delete nothing else):

```js
import { addLine } from "./chat.js";

export function toast(html) { addLine(html); }
```

(Remove the old DOM-building body and the now-unused `el("toasts")` usage inside it.)

- [ ] **Step 7: `js/context-menu.js` — examine actions post to chat**

Add `import { addLine } from "./chat.js";` and replace each of the four hand-built toast blocks (monster/stone/tree/rock examine actions) with a single call, e.g. the monster one becomes:

```js
            entries.push({ label: "Examine", action: () => {
                addLine(`Level ${def.level} ${def.name}. HP: ${monster.hp}/${def.hp}.`);
            }});
```

and the stone/tree/rock examines become `addLine("An ancient stone of power. Use it to change your class.")`, `addLine("A sturdy tree. It blocks your path.")`, `addLine("A weathered rock wall. You can't pass through.")` respectively.

- [ ] **Step 8: `js/login.js` — chat input replaces the command bar**

Remove the whole `initCommandBar` function and its `if (profile?.is_admin) initCommandBar();` call. Add to imports:

```js
import { initChat, addLine, onSubmit, escapeHtml } from "./chat.js";
```

In `enterGame(state, profile)`, add (where `initCommandBar` used to be called — runs for everyone now):

```js
    initChat(el("chat-log"), el("chat-entry"));
    addLine("Welcome to Stonewake.");
    onSubmit((text) => {
        if (text.startsWith("::")) {
            if (profile?.is_admin) {
                const result = runCommand(game.state, text);
                addLine(result.message, "#d8b25a");
                if (result.ok) pushCurrentSave(); // admin effects persist immediately
            }
            return; // non-admin :: input is silently ignored
        }
        addLine(`<b>${escapeHtml(profile?.username ?? "You")}:</b> ${escapeHtml(text)}`, "#7fb0d8");
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && document.activeElement !== el("chat-entry")) {
            e.preventDefault();
            el("chat-entry").focus();
        }
    });
```

`runCommand` and `toast` imports: `runCommand` stays; the `toast` import can be dropped if no longer referenced in `login.js`.

- [ ] **Step 9: `styles.css` — swap toast/command-bar styles for chatbox**

Delete the `#toasts`, `.toast`, `@keyframes toast-fade`, and all `#command-bar*` rules. Add (before the context-menu block):

```css
/* Chatbox */
#chatbox { height: 160px; background: #241f14; border: 2px solid #3a3325; border-top: none;
    display: flex; flex-direction: column; }
#chat-log { flex: 1; overflow-y: auto; padding: 6px 8px; font-size: 13px; }
.chat-line { line-height: 1.5; }
#chat-entry { border: none; border-top: 2px solid #3a3325; background: #1a1510; color: #e8e4d8;
    padding: 6px 8px; font-family: inherit; font-size: 13px; outline: none; }
```

- [ ] **Step 10: Run tests** — `npm test`, expected PASS (toast callers unchanged).

---

### Task 3: Fill-screen layout + canvas resize — **commit gate 1**

**Files:**
- Modify: `styles.css` (full-viewport layout)
- Modify: `js/main.js` (canvas backing-store resize)

**Interfaces:**
- Consumes: the play-column markup from Task 2.
- Produces: a canvas whose `width/height` track its on-screen size; the renderer must re-apply `imageSmoothingEnabled` after resize (a canvas resize resets context state) — Task 4 moves that flag into `draw()`.

- [ ] **Step 1: Layout styles**

In `styles.css` replace the current `body` and `#game` rules with:

```css
html, body { height: 100%; }
body { background: #141a14; color: #e8e4d8; font-family: "Courier New", monospace; margin: 0; padding: 0; }
#game { display: flex; height: 100vh; min-width: 640px; min-height: 400px; }
#play-column { flex: 1; display: flex; flex-direction: column; min-width: 0; }
#canvas { image-rendering: pixelated; border: 3px solid #3a3325; background: #000;
    flex: 1; width: 100%; min-height: 0; }
```

and change the `#hud` rule to include scrolling: `#hud { width: 260px; padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }` (drop the old `max-width: 100%` on canvas if present).

- [ ] **Step 2: Backing-store resize in `js/main.js` (inside `startGame`, after `canvas` is obtained)**

```js
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
```

- [ ] **Step 3: Manual check** — serve, log in: game fills the window minus sidebar, chatbox sits under the canvas, messages (welcome line, eating, loot) appear in chat, no toasts anywhere, Enter focuses chat, typed text echoes as `Name: text`, `::heal` works for the admin account. Resize the window: canvas follows.

- [ ] **Step 4: TJ commits (gate 1)**

```
! git add js/inspect.js js/chat.js js/context-menu.js js/ui.js js/login.js js/main.js index.html styles.css tests/inspect.test.js tests/chat.test.js
! git commit -m "Add chatbox and fill-screen layout"
```

---

### Task 4: Wheel zoom

**Files:**
- Modify: `js/render.js` (tilePx state, `clampZoom`, `zoom()`, per-frame viewport)
- Modify: `js/main.js` (wheel wiring)
- Test: `tests/render-helpers.test.js`

**Interfaces:**
- Consumes: canvas sized by Task 3.
- Produces: `clampZoom(tilePx, delta) -> 16|32|64` exported from `js/render.js`; renderer method `zoom(delta)`; all drawing/`screenToTile` math uses live `tilePx` (sprite scale = `tilePx / 16`).

- [ ] **Step 1: Failing tests** — create `tests/render-helpers.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampZoom } from "../js/render.js";

test("zoom doubles and halves between 16 and 64", () => {
    assert.equal(clampZoom(32, +1), 64);
    assert.equal(clampZoom(64, +1), 64);
    assert.equal(clampZoom(32, -1), 16);
    assert.equal(clampZoom(16, -1), 16);
    assert.equal(clampZoom(16, +1), 32);
});
```

Run `npm test` — FAIL: `clampZoom` not exported.

- [ ] **Step 2: Renderer changes in `js/render.js`**

Replace the module constants and `createRenderer` internals:

```js
export const MIN_TILE_PX = 16;
export const MAX_TILE_PX = 64;

export function clampZoom(tilePx, delta) {
    const next = delta > 0 ? tilePx * 2 : tilePx / 2;
    return Math.max(MIN_TILE_PX, Math.min(MAX_TILE_PX, next));
}
```

Inside `createRenderer`: delete the fixed `viewW/viewH` lines; add `let tilePx = 32;` and compute per call:

```js
    function view() {
        return { viewW: Math.ceil(canvas.width / tilePx), viewH: Math.ceil(canvas.height / tilePx) };
    }
    function camera(state) {
        const { viewW, viewH } = view();
        const cx = Math.max(0, Math.min(map.width - viewW, state.player.x - Math.floor(viewW / 2)));
        const cy = Math.max(0, Math.min(map.height - viewH, state.player.y - Math.floor(viewH / 2)));
        return { cx, cy };
    }
```

Every `TILE_PX` inside the renderer becomes `tilePx`; every `PIXEL_SCALE` becomes `tilePx / 16`; `drawBar` width uses `tilePx`. At the top of `draw()`, re-apply `ctx.imageSmoothingEnabled = false;` (resize resets it), and add the method to the returned object:

```js
        zoom(delta) { tilePx = clampZoom(tilePx, delta); },
```

`screenToTile` divides by `tilePx` instead of `TILE_PX`. Remove the old `TILE_PX`/`PIXEL_SCALE` exports and fix the one other importer (none exist today — verify with a grep for `TILE_PX` outside `render.js`).

- [ ] **Step 3: Wheel wiring in `js/main.js` (inside `startGame`)**

```js
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        renderer.zoom(e.deltaY < 0 ? +1 : -1);
    }, { passive: false });
```

- [ ] **Step 4: Run tests + manual check** — `npm test` PASS; in the browser, wheel zooms 16→32→64 crisply, clicks still land on the right tiles at every zoom.

---

### Task 5: Click markers

**Files:**
- Modify: `js/main.js` (push markers on click)
- Modify: `js/render.js` (draw + expire markers)

**Interfaces:**
- Consumes: `clickKind` from `js/inspect.js` (Task 1).
- Produces: `game.effects.clicks: [{ x, y, kind, bornAt }]`; renderer owns expiry (>600 ms dropped each frame).

- [ ] **Step 1: `js/main.js`** — add `import { clickKind } from "./inspect.js";`; in `startGame` add `clicks: []` to the `effects` object; at the top of the canvas click handler (right after `const t = renderer.screenToTile(...)`):

```js
        game.effects.clicks.push({ x: t.x, y: t.y, kind: clickKind(game, t), bornAt: performance.now() });
```

- [ ] **Step 2: `js/render.js`** — in `draw(state, effects)`, after entities and before hitsplats:

```js
            const now = performance.now();
            effects.clicks = effects.clicks.filter((c) => now - c.bornAt < 600);
            for (const c of effects.clicks) {
                const age = (now - c.bornAt) / 600;
                const r = Math.max(1, 14 * (1 - age)) * (tilePx / 32);
                const px = (c.x - cx) * tilePx + tilePx / 2;
                const py = (c.y - cy) * tilePx + tilePx / 2;
                ctx.strokeStyle = c.kind === "red" ? "#c03a2e" : "#e8e13a";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
                ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
                ctx.stroke();
            }
```

- [ ] **Step 3: Manual check** — ground click: yellow shrinking X; monster/stone/item click: red X; markers vanish in ~half a second; `npm test` still PASS.

---

### Task 6: Hover text — **commit gate 2**

**Files:**
- Modify: `js/main.js` (mousemove wiring)
- Modify: `js/render.js` (`setHover`, top-left text painting)

**Interfaces:**
- Consumes: `describeTile` (Task 1), `isBlocked` (already imported in `main.js`).
- Produces: renderer method `setHover(desc | null)` where desc is `{ name, action, color }`; `{ name: "", action: "Walk here", color: "#e8e4d8" }` is passed for walkable empty ground; null clears.

- [ ] **Step 1: `js/main.js`** — add `import { describeTile } from "./inspect.js";` (merge with the Task 5 import) and, in `startGame`:

```js
    canvas.addEventListener("mousemove", (e) => {
        const t = renderer.screenToTile(game.state, e.clientX, e.clientY);
        if (t.x < 0 || t.y < 0 || t.x >= map.width || t.y >= map.height) { renderer.setHover(null); return; }
        const desc = describeTile(game, t);
        renderer.setHover(desc ?? (!isBlocked(map, t.x, t.y)
            ? { name: "", action: "Walk here", color: "#e8e4d8" } : null));
    });
    canvas.addEventListener("mouseleave", () => renderer.setHover(null));
```

- [ ] **Step 2: `js/render.js`** — add `let hover = null;` in `createRenderer`, method `setHover(desc) { hover = desc; },` and at the end of `draw()`:

```js
            if (hover) {
                ctx.font = "bold 14px monospace";
                ctx.textAlign = "left";
                const actionText = hover.name ? `${hover.action} ` : hover.action;
                ctx.fillStyle = "rgba(0,0,0,.55)";
                const w = ctx.measureText(actionText + hover.name).width;
                ctx.fillRect(6, 6, w + 12, 22);
                ctx.fillStyle = "#e8e4d8";
                ctx.fillText(actionText, 12, 22);
                if (hover.name) {
                    ctx.fillStyle = hover.color;
                    ctx.fillText(hover.name, 12 + ctx.measureText(actionText).width, 22);
                }
            }
```

- [ ] **Step 3: Manual check** — hovering monster shows `Attack Mire Rat (level 2)` (name orange), stone `Use Class Stone`, item `Take Roast Perch`, tree `Examine Tree`, open ground `Walk here`, off-map nothing. `npm test` PASS.

- [ ] **Step 4: TJ commits (gate 2)**

```
! git add js/render.js js/main.js tests/render-helpers.test.js
! git commit -m "Add wheel zoom, click markers and hover text"
```

---

### Task 7: RS-scale sprites

**Files:**
- Modify: `js/sprites-hd.js` (replace `playerMelee`, `playerRanged`, `playerMagic`, `mireRat`, `bogling`, `ashenWarden` pixel maps)
- Modify: `js/render.js` (bottom-anchored, y-sorted entity drawing; bars/hitsplats anchored to sprite tops)
- Modify: `tests/sprites-hd.test.js` (update any size assertions)

**Interfaces:**
- Consumes: `spriteSize(name) -> { w, h }` (existing).
- Produces: entity sprites at spec sizes (players 16×24, mireRat 16×12, bogling 16×20, ashenWarden 24×32); renderer helper `drawEntity(name, tx, ty) -> { px, py, w, h }` used for player and monsters.

- [ ] **Step 1: Renderer entity drawing (`js/render.js`)**

Replace the monster loop + player draw with bottom-anchored, y-sorted drawing:

```js
            const scale = tilePx / 16;
            function drawEntity(name, tx, ty) {
                const { w, h } = spriteSize(name);
                const px = (tx - cx) * tilePx + (tilePx - w * scale) / 2;
                const py = (ty - cy) * tilePx + tilePx - h * scale;
                drawSprite(ctx, name, px, py, scale);
                return { px, py, w: w * scale, h: h * scale };
            }
            const entities = [
                ...state.monsters.filter((m) => m.respawnIn <= 0).map((m) => ({ kind: "monster", m, y: m.y })),
                { kind: "player", y: state.player.y },
            ].sort((a, b) => a.y - b.y);
            for (const e of entities) {
                if (e.kind === "monster") {
                    const def = MONSTERS[e.m.type];
                    const box = drawEntity(def.sprite, e.m.x, e.m.y);
                    if (e.m.hp < def.hp) drawBar(box.px, box.py, e.m.hp / def.hp, box.w);
                } else {
                    drawEntity(PLAYER_SPRITE[state.player.klass], state.player.x, state.player.y);
                }
            }
```

`drawBar` gains a width parameter: `function drawBar(px, py, fraction, w)` using `w` instead of `TILE_PX`. `spriteSize` joins the import from `./sprites-hd.js`. (Hitsplats stay tile-centered — they read fine over tall sprites.)

- [ ] **Step 2: Author the six sprites in `js/sprites-hd.js`**

Replace the six pixel maps with tall RS-proportioned versions at the spec sizes, drawn with the existing palette. Draft maps are provided below as the starting point; **this step is explicitly iterative** — render, screenshot, adjust until they read RS-like (small head ~1/4 height, long torso, class weapon visible; Warden looming). The drafts (16 chars wide × 24 rows for players — melee shown; ranged swaps sword rows for a bow held left; magic for a staff with a purple tip):

```
playerMelee (16×24): rows 0-5 head (skin f/F outline x), 6-14 torso in leather m/M
with skin arms, sword (e/E blade, c hilt) held vertical on the right from rows
5-16, 15-20 legs in dark m/x, 21-23 feet/shadow X. Example rows:
"......ffff......"   (head top)
".....fFFFFf....."
".....fFnFnf....."   (eyes)
".....fFFFFf....."
"......ffff.....e"   (blade tip, right edge)
".....mmmmmm...eE"
"....mMmmmmMf..eE"   (shoulders + arm)
"....fMmmmmMf..eE"
"....fMmmmmMf..eE"
"....fMmmmmM...cE"   (hilt)
"....mMmmmmM...c."
".....mmmmm......"
".....mMMmm......"
".....mm.mm......"
".....mm.mm......"   (legs begin)
".....xm.mx......"
".....xm.mx......"
".....xm.mx......"
".....xm.mx......"
"....xxm.mxx....."
"....XX...XX....."
"....XX...XX....."
"...XXX...XXX...."
"................"
```

(The other five are authored the same way at their spec sizes; the plan
executor draws them during this step and iterates visually — acceptance is the
Step 4 screenshot review, not pixel-exact maps in this document.)

- [ ] **Step 3: Update `tests/sprites-hd.test.js`** — any assertions pinning the six sprites to 16×16 change to the new `{ w, h }` values; every sprite row-length consistency test must still pass.

- [ ] **Step 4: Visual iteration** — serve, screenshot at 32px and 64px zoom, compare silhouettes against RS proportions; iterate maps until the player reads ~1.5 tiles tall, rat low, Warden huge. `npm test` PASS.

---

### Task 8: Full verification + ship — **commit gate 3**

- [ ] **Step 1: Headless pass at 1920×1080** — layout fills the window; chat receives welcome/eat/loot lines and echoes typed text; `::heal` via chat as admin; zoom 16/32/64 all render and click-target correctly; yellow X on ground / red X on monster; hover text for monster/stone/item/tree/ground; tall sprites bottom-anchored (player overlaps the tile above), Warden visibly boss-sized; zero console errors; 70+ tests green.

- [ ] **Step 2: TJ commits and ships (gate 3)**

```
! git add js/sprites-hd.js js/render.js tests/sprites-hd.test.js
! git commit -m "Redraw characters at RS scale with anchored rendering"
! git push origin main
```

- [ ] **Step 3: Live check** — after Pages deploys, one login on the production URL confirming layout, chat, zoom, markers, hover, sprites.
