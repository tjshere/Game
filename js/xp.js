// XP curve: cumulative points formula, levels 1-99.
export const MAX_LEVEL = 99;

const TOTAL_XP = [0, 0]; // TOTAL_XP[level] = xp at which that level is reached
{
    let points = 0;
    for (let level = 1; level < MAX_LEVEL; level++) {
        points += Math.floor(level + 300 * Math.pow(2, level / 7));
        TOTAL_XP[level + 1] = Math.floor(points / 4);
    }
}

export function xpForLevel(level) {
    return TOTAL_XP[Math.max(1, Math.min(MAX_LEVEL, level))];
}

export function levelForXp(xp) {
    let level = 1;
    while (level < MAX_LEVEL && xp >= TOTAL_XP[level + 1]) level++;
    return level;
}

export function progress(xp) {
    const level = levelForXp(xp);
    if (level === MAX_LEVEL) return { level, into: 0, needed: 1 };
    return { level, into: xp - TOTAL_XP[level], needed: TOTAL_XP[level + 1] - TOTAL_XP[level] };
}
