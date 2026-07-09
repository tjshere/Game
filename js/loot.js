import { DROP_TABLES } from "./drops.js";

function rollInRange([min, max], rng) {
    return min + Math.floor(rng() * (max - min + 1));
}

export function ensureTargets(lootState, monsterType, rng) {
    const table = DROP_TABLES[monsterType];
    const kills = lootState.killCounts[monsterType] || 0;
    for (const w of table.weapons) {
        const key = `${monsterType}:${w.item}`;
        if (lootState.dropTargets[key] == null) {
            lootState.dropTargets[key] = kills + rollInRange(w.range, rng);
        }
    }
}

export function resolveKill(lootState, monsterType, rng) {
    const table = DROP_TABLES[monsterType];
    ensureTargets(lootState, monsterType, rng);
    const kills = (lootState.killCounts[monsterType] || 0) + 1;
    lootState.killCounts[monsterType] = kills;

    const drops = [{ item: "coins", qty: rollInRange(table.coins, rng) }];
    if (rng() < table.food.chance) drops.push({ item: table.food.item, qty: 1 });
    for (const w of table.weapons) {
        const key = `${monsterType}:${w.item}`;
        if (lootState.dropTargets[key] === kills) {
            drops.push({ item: w.item, qty: 1 });
            lootState.dropTargets[key] = kills + rollInRange(w.range, rng);
        }
    }
    return drops;
}
