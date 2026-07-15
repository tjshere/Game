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
