export const WEAKNESS_BONUS = 1.25;
export const ATTACK_SPEED_TICKS = 2;

export function maxHit(level, power) {
    return Math.floor(1 + level / 4 + power);
}

export function hitChance(attLevel, attPower, defLevel) {
    const att = attLevel + attPower * 2 + 8;
    const def = defLevel + 8;
    return att > def ? 1 - (def + 2) / (2 * (att + 1)) : att / (2 * (def + 1));
}

export function rollHit(attacker, defender, weakBonus, rng) {
    if (rng() >= hitChance(attacker.level, attacker.power, defender.defence)) return 0;
    let dmg = Math.floor(rng() * (maxHit(attacker.level, attacker.power) + 1));
    if (weakBonus) dmg = Math.floor(dmg * WEAKNESS_BONUS);
    return dmg;
}

export function xpForDamage(damage, stance) {
    const main = damage * 10;
    return {
        classXp: stance === "aggressive" ? main : 0,
        defXp: stance === "defensive" ? main : 0,
        hpXp: damage * 4,
    };
}
