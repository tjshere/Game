# Class switching anywhere, inventory context menu, deploy — design

Date: 2026-07-14. Approved by TJ in session.

## Scope

1. **Class switching anywhere.** Sidebar class buttons switch `player.klass`
   immediately (toast + panel re-render). The class stone modal remains as a
   second path. One shared `switchClass(name)` in `ui.js` backs both.
2. **Inventory right-click menu: Eat / Drop / Examine.**
   - New `js/inventory.js` with pure functions:
     - `eatAt(player, i)` — removes food at slot `i`, heals up to `maxHp`,
       returns the food def (or null if bad index). Left-click keeps using it.
     - `dropAt(state, i)` — removes item at slot `i`, pushes
       `{ item, x, y, tick }` onto `state.groundItems` at the player's tile,
       returns the food def (or null). Dropped items behave like monster loot:
       rendered on the ground, picked up by walking over them, despawn after
       200 ticks.
   - `js/context-menu.js` exports its menu builder (`showMenu(x, y, entries)`
     and `closeMenu()`) for reuse; canvas behavior unchanged.
   - `js/ui.js` attaches `contextmenu` on filled inventory slots showing:
     item name header, Eat, Drop, Examine (flavor text toast).
   - `js/entities.js`: each food gains an `examine` string.
3. **Deploy (plan Tasks 12–13 of `docs/plans/2026-07-08-game-v1.md`,
   followed as written).** Push to GitHub, enable Pages via API with the
   keychain credential, verify https://tjshere.github.io/Game/ loads, then
   the portfolio avatar easter egg in `~/code/final-portfolio`.

## Testing

- `tests/inventory.test.js`: eat heals but caps at max HP; eat/drop remove
  the right slot; drop lands at the player tile with the current tick;
  out-of-range or empty index is a safe no-op.
- Existing suite stays green. DOM menu and deploy verified by manual
  playtest per the plan's checklist.

## Out of scope

Weapon selection within a class (auto-wield strongest stays), armor, shops,
other v2 items.
