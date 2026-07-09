# Game (working title) — v1 Design

**Date:** 2026-07-08
**Status:** Approved

## Vision

A single-player browser game with the bones of a 2007-era MMO: click a tile to
walk there, click a monster to fight it, watch hitsplats and XP drops, chase
RNG loot, and work up to slaying the one boss that rules the map. Top-down
pixel art, saves in the browser, playable at a public URL.

The game is an original work *inspired by the mechanics* of old-school MMOs.
Mechanics are not copyrightable; expression is. Therefore: no Jagex names
(game, world, monster, item, or lore names), no ripped art, audio, or code,
anywhere in this repo. All names are original; all art is CC0 or handmade.

## Where it lives

- **Repo:** `tjshere/Game` (public). Name is a placeholder until the game is named.
- **Hosting:** GitHub Pages from `main`. No build step — `index.html` runs as-is.
- **Stack:** Plain HTML, CSS, JavaScript (ES modules), Canvas 2D. Zero dependencies.
- **Portfolio hook:** clicking the avatar in the header of the portfolio site
  opens the game in a new tab. A subtle hover wiggle hints that it's clickable.
  (This is a one-line-ish change in the portfolio repo, done last.)

## The world

- One handcrafted map, ~40×40 tiles, defined as a 2D array in `world.js` —
  editing the world means editing text.
- Layout: a safe **spawn clearing** (with the class stone and respawn point),
  open **fields** holding two regular monster types, and a **boss lair** at the
  far end.
- Camera follows the player. Tiles are pixel art from a CC0 pack (Kenney) to
  start; swappable later.
- Movement: click-to-move with BFS pathfinding around blocked tiles.

## Classes & stats

Three classes, chosen at the **class stone** in the clearing, switchable
anytime for free:

| Class  | Weapon        | Attack range |
|--------|---------------|--------------|
| Melee  | 2H greatsword | adjacent     |
| Ranged | 2H bow        | ~5 tiles     |
| Magic  | 2H staff      | ~4 tiles     |

- Each class has its **own weapon slot**. Switching class wields the best
  weapon you own for that class. You start with a free starter weapon per class.
- **Five stats**, each on a 1–99 XP curve: **Melee, Ranged, Magic**
  (trained by fighting in that class), **Hitpoints** (always trains), and
  **Defence** (trained via a defensive stance toggle instead of class XP).
- **Stance toggle:** aggressive (XP → class stat) or defensive (XP → Defence).
- Each regular monster is **weak to one class** (takes bonus damage from it),
  so switching classes matters.

## Combat

- **600ms game ticks** — the deliberate old-school rhythm. All actions
  (movement steps, attacks, regen) resolve on ticks.
- Click a monster → path into range → auto-exchange of hits until one side dies
  or the player walks away.
- Damage is an RNG roll from 0 to max hit; max hit scales with the relevant
  class stat and weapon tier. Defence reduces the chance of being hit.
- **Hitsplats:** red for damage, blue for a zero. Floating **XP drops** on each
  hit. **Level-up flash** with a message.
- Monsters drop **coins and food** on death and respawn on a timer. Food heals
  a fixed amount when eaten (one inventory click).
- **Death:** respawn at the clearing, keep everything (v1 is gentle).
- **Boss:** one lair monster, tuned so a fresh character cannot survive it —
  you must level and stockpile food first. Beating it shows a **victory
  screen**. Its orange weapon drops are the completionist chase.

## Loot & the RNG drop system

- **`drops.js` is the drop-rate control panel** — a plain config file listing,
  per monster: item, and a kill-count range. Example entry, expressed in
  gameplay terms: *orange greatsword — boss — range 1–55*.
- **Pre-rolled targets:** the first time the player fights a monster type, the
  game secretly rolls each of its drop ranges (e.g. lands on 23 → that item is
  **guaranteed on kill #23** of that monster). Rolls persist in the save. After
  an item drops, its range re-rolls, so duplicates remain possible but paced.
- **Rarity colors:** gray → green → blue → purple → **orange** (best).
- **v1 weapon ladder per class:** starter (free) → field tier (drops from
  regular monsters) → **orange tier** (drops from the boss).
- Coins and food drop normally (simple per-kill chances, also in `drops.js`).
- Coins have no sink in v1 (shops are v2); they accumulate as a score.

## UI

- Canvas viewport plus a compact HUD: HP bar, class/stance selector, stat
  panel with levels and XP progress, grid inventory (24 slots), and the
  per-class weapon display.
- Victory screen after the boss; small toast messages for drops and level-ups.

## Save system

- Autosave to `localStorage` (stats, inventory, weapons, coins, kill counts,
  pre-rolled drop targets, position). A "reset save" button hides in settings.

## Code structure

Small ES modules, one job each:

| File             | Job                                        |
|------------------|--------------------------------------------|
| `main.js`        | game loop, tick scheduler, input           |
| `world.js`       | map data + collision                       |
| `pathfinding.js` | BFS pathing                                |
| `entities.js`    | player + monster definitions and state     |
| `combat.js`      | damage rolls, XP awards, death, respawn    |
| `drops.js`       | drop tables (the designer-facing config)   |
| `loot.js`        | pre-roll logic, drop resolution            |
| `render.js`      | canvas drawing, camera, hitsplats, XP drops|
| `ui.js`          | HUD, inventory, panels, victory screen     |
| `save.js`        | localStorage load/save                     |
| `xp.js`          | XP curve + level math (pure functions)     |

Combat math, the XP curve, and loot pre-rolling are pure functions so balance
can be tested in Node without a browser.

## Testing

- Unit tests (plain Node `assert`, no framework) for `xp.js`, damage math, and
  the pre-roll loot logic.
- Manual playtest checklist for v1: full loop from fresh save → level up →
  field weapon drop → boss kill → orange drop → victory screen; save survives
  refresh; all three classes playable.

## Explicitly deferred to v2+

Armor slots, shops/coin sinks, skilling (gathering/crafting), quests, more
zones, sound, mobile controls, a real game name.
