// ── DROP RATE CONTROL PANEL ──────────────────────────────────────
// coins: [min,max] every kill.  food: per-kill chance.
// weapons: pre-rolled — on first fight the game secretly rolls a
// number in `range`; the item is GUARANTEED on that kill count,
// then the range re-rolls. Edit freely; saves keep rolled targets.
export const DROP_TABLES = {
    mireRat: {
        coins: [1, 8],
        food: { item: "roastPerch", chance: 1 / 3 },
        weapons: [
            { item: "soldiersGreatsword", range: [5, 25] },
            { item: "adeptsStaff",        range: [5, 25] },
        ],
    },
    bogling: {
        coins: [5, 20],
        food: { item: "emberLoaf", chance: 1 / 3 },
        weapons: [
            { item: "huntersBow", range: [5, 25] },
        ],
    },
    ashenWarden: {
        coins: [100, 400],
        food: { item: "emberLoaf", chance: 1 },
        weapons: [
            { item: "emberbrandGreatsword", range: [1, 55] },
            { item: "galewingBow",          range: [1, 55] },
            { item: "stormcallerStaff",     range: [1, 55] },
        ],
    },
};
