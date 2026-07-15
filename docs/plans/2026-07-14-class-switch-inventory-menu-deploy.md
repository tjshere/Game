# Class Switch Anywhere + Inventory Context Menu + Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sidebar class buttons switch class anywhere, inventory items get a right-click Eat/Drop/Examine menu, then the game ships to GitHub Pages with the portfolio easter egg.

**Architecture:** Pure inventory logic goes in a new `js/inventory.js` (Node-tested); DOM wiring stays thin in `js/ui.js`, reusing the menu builder extracted from `js/context-menu.js`. Deploy follows Tasks 12–13 of `docs/plans/2026-07-08-game-v1.md` verbatim.

**Tech Stack:** Vanilla JS ES modules, `node --test`, GitHub Pages.

## Global Constraints

- No frameworks, no dependencies; plain ES modules.
- Tests are `node --test` with `node:assert/strict` (`npm test`).
- No Jagex/RuneScape names anywhere.
- Commits: plain descriptive messages, no AI attribution.

---

### Task 1: `js/inventory.js` — pure eat/drop functions

**Files:**
- Create: `js/inventory.js`
- Test: `tests/inventory.test.js`

**Interfaces:**
- Consumes: `FOODS`, `maxHp`, `createPlayer` from `js/entities.js`.
- Produces: `eatAt(player, i) -> food def | null`, `dropAt(state, i) -> food def | null`. Task 3's UI calls both.

- [ ] **Step 1: Write the failing test** — `tests/inventory.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlayer, maxHp, FOODS } from "../js/entities.js";
import { eatAt, dropAt } from "../js/inventory.js";

function stateWith(items) {
    const player = createPlayer();
    player.x = 4; player.y = 9;
    player.inventory = items.map((item) => ({ item }));
    return { player, groundItems: [], tick: 42 };
}

test("eatAt heals, caps at max hp, removes the right slot", () => {
    const { player } = stateWith(["roastPerch", "emberLoaf"]);
    player.hp = 3;
    const food = eatAt(player, 0);
    assert.equal(food, FOODS.roastPerch);
    assert.equal(player.hp, 8);
    assert.deepEqual(player.inventory, [{ item: "emberLoaf" }]);
    player.hp = maxHp(player) - 1;
    eatAt(player, 0); // emberLoaf heals 12 → caps at max
    assert.equal(player.hp, maxHp(player));
    assert.equal(player.inventory.length, 0);
});
test("eatAt on an empty slot is a no-op", () => {
    const { player } = stateWith([]);
    player.hp = 5;
    assert.equal(eatAt(player, 0), null);
    assert.equal(player.hp, 5);
});
test("dropAt puts the item at the player's tile with the current tick", () => {
    const s = stateWith(["roastPerch"]);
    const food = dropAt(s, 0);
    assert.equal(food, FOODS.roastPerch);
    assert.equal(s.player.inventory.length, 0);
    assert.deepEqual(s.groundItems, [{ item: "roastPerch", x: 4, y: 9, tick: 42 }]);
});
test("dropAt with a bad index is a no-op", () => {
    const s = stateWith(["roastPerch"]);
    assert.equal(dropAt(s, 5), null);
    assert.equal(s.groundItems.length, 0);
    assert.equal(s.player.inventory.length, 1);
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL (`Cannot find module '../js/inventory.js'`).

- [ ] **Step 3: Implement `js/inventory.js`:**

```js
import { FOODS, maxHp } from "./entities.js";

// Eat the food in slot i. Returns the food def, or null if the slot is empty.
export function eatAt(player, i) {
    const entry = player.inventory[i];
    if (!entry) return null;
    const food = FOODS[entry.item];
    player.inventory.splice(i, 1);
    player.hp = Math.min(maxHp(player), player.hp + food.heals);
    return food;
}

// Drop the item in slot i at the player's feet; it joins groundItems and
// despawns on the same 200-tick timer as monster loot. Returns the food def.
export function dropAt(state, i) {
    const entry = state.player.inventory[i];
    if (!entry) return null;
    state.player.inventory.splice(i, 1);
    state.groundItems.push({ item: entry.item, x: state.player.x, y: state.player.y, tick: state.tick });
    return FOODS[entry.item];
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test` → 43 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add js/inventory.js tests/inventory.test.js
git commit -m "Add pure eat/drop inventory functions"
```

---

### Task 2: Class switching anywhere (`js/ui.js`)

**Files:**
- Modify: `js/ui.js:73-107` (renderClassPanel + onReachStone)

**Interfaces:**
- Produces: internal `switchClass(name)` shared by sidebar buttons and the stone modal. No exports change.

- [ ] **Step 1: Add `switchClass` and wire the buttons.** In `initUi`, insert above `renderClassPanel`:

```js
    function switchClass(name) {
        player().klass = name;
        toast(`You are now ${name}. Wielding ${WEAPONS[bestWeapon(player(), name)].name}.`);
        renderClassPanel();
    }
```

In `renderClassPanel`, replace:

```js
            b.className = player().klass === name ? "active" : "";
            b.title = "Switch at the class stone";
            b.disabled = true;
```

with:

```js
            const isActive = player().klass === name;
            b.className = isActive ? "active" : "";
            if (!isActive) b.addEventListener("click", () => switchClass(name));
```

In `game.hooks.onReachStone`, replace the button callback body:

```js
            Object.keys(CLASSES).map((name) => [name, () => switchClass(name)]));
```

- [ ] **Step 2: Verify** — `npm test` still green; manual: serve, click a sidebar class button → toast, highlight moves, player sprite recolors, attacks use the new class.

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "Allow class switching from the sidebar; stone modal shares the same path"
```

---

### Task 3: Inventory right-click menu (Eat / Drop / Examine)

**Files:**
- Modify: `js/context-menu.js` (extract `showMenu`/`closeMenu` to module scope, export)
- Modify: `js/ui.js` (slot `contextmenu` handler; left-click uses `eatAt`)
- Modify: `js/entities.js:23-27` (food `examine` strings)

**Interfaces:**
- Consumes: `eatAt`/`dropAt` from Task 1.
- Produces: `showMenu(x, y, entries)` and `closeMenu()` exported from `js/context-menu.js`; `entries` = `[{ label, color?, action? }]`, no `action` = header row.

- [ ] **Step 1: Extract the menu builder.** In `js/context-menu.js`, move `menu`, `close`, and `show` from inside `initContextMenu` to module scope and export them renamed (`closeMenu`, `showMenu`); `initContextMenu` keeps only the canvas `contextmenu` listener (calling `showMenu`) and the two document close listeners (calling `closeMenu`). Do NOT register document listeners at module scope (the module must stay importable in Node).

- [ ] **Step 2: Food examine text.** In `js/entities.js` FOODS:

```js
export const FOODS = {
    rawMeat:    { name: "Raw Meat",    heals: 3,  icon: "iconMeat",  examine: "Best cooked. Beggars can't be choosers." },
    roastPerch: { name: "Roast Perch", heals: 5,  icon: "iconPerch", examine: "A river perch, roasted golden." },
    emberLoaf:  { name: "Ember Loaf",  heals: 12, icon: "iconLoaf",  examine: "Warm bread with a molten crumb." },
};
```

- [ ] **Step 3: Wire the slots.** In `js/ui.js` import `eatAt`, `dropAt` from `./inventory.js` and `showMenu` from `./context-menu.js`. Replace the slot click handler block with:

```js
                slot.addEventListener("click", () => {
                    const f = eatAt(p, i);
                    if (f) toast(`Ate ${f.name} (+${f.heals} HP)`);
                });
                slot.addEventListener("contextmenu", (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation(); // keep the document-level closer from eating this menu
                    showMenu(ev.clientX, ev.clientY, [
                        { label: food.name, color: "#2e8b2e" },
                        { label: "Eat", action: () => { const f = eatAt(p, i); if (f) toast(`Ate ${f.name} (+${f.heals} HP)`); } },
                        { label: "Drop", action: () => { const f = dropAt(game.state, i); if (f) toast(`Dropped ${f.name}.`); } },
                        { label: "Examine", action: () => toast(food.examine) },
                    ]);
                });
```

- [ ] **Step 4: Verify** — `npm test` green; manual: right-click a food slot → menu; Eat heals, Drop puts the icon on your tile (walk off then back on to re-collect), Examine toasts; left-click still eats; canvas right-click menus still work.

- [ ] **Step 5: Commit**

```bash
git add js/context-menu.js js/ui.js js/entities.js
git commit -m "Add inventory right-click menu: eat, drop, examine"
```

---

### Task 4: Deploy to GitHub Pages

Follow `docs/plans/2026-07-08-game-v1.md` Task 12 exactly: `git push origin main`, enable Pages via the GitHub API using the keychain credential (never print the token), then poll `https://tjshere.github.io/Game/` until it returns 200 and playtest the full loop.

---

### Task 5: Portfolio avatar easter egg

Follow `docs/plans/2026-07-08-game-v1.md` Task 13 exactly in `/Users/tj/code/final-portfolio`: avatar becomes a link to the game with the hover wiggle, name link unchanged, mirror `.wordmark` anchor styles onto `.wordmark-name`, verify locally, commit and push that repo.
