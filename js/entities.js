import { xpForLevel, levelForXp } from "./xp.js";

export const INVENTORY_SIZE = 24;

export const CLASSES = {
    melee:  { stat: "melee",  range: 1, starter: "wornGreatsword", icon: "iconSword" },
    ranged: { stat: "ranged", range: 5, starter: "wornBow",        icon: "iconBow" },
    magic:  { stat: "magic",  range: 4, starter: "wornStaff",      icon: "iconStaff" },
};

export const WEAPONS = {
    wornGreatsword:       { name: "Worn Greatsword",       klass: "melee",  power: 1, rarity: "gray" },
    soldiersGreatsword:   { name: "Soldier's Greatsword",  klass: "melee",  power: 4, rarity: "blue" },
    emberbrandGreatsword: { name: "Emberbrand Greatsword", klass: "melee",  power: 8, rarity: "orange" },
    wornBow:              { name: "Worn Bow",              klass: "ranged", power: 1, rarity: "gray" },
    huntersBow:           { name: "Hunter's Bow",          klass: "ranged", power: 4, rarity: "blue" },
    galewingBow:          { name: "Galewing Bow",          klass: "ranged", power: 8, rarity: "orange" },
    wornStaff:            { name: "Worn Staff",            klass: "magic",  power: 1, rarity: "gray" },
    adeptsStaff:          { name: "Adept's Staff",         klass: "magic",  power: 4, rarity: "blue" },
    stormcallerStaff:     { name: "Stormcaller Staff",     klass: "magic",  power: 8, rarity: "orange" },
};

export const FOODS = {
    roastPerch: { name: "Roast Perch", heals: 5,  icon: "iconPerch" },
    emberLoaf:  { name: "Ember Loaf",  heals: 12, icon: "iconLoaf" },
};

export const MONSTERS = {
    mireRat:     { name: "Mire Rat",     hp: 10,  level: 2,  power: 1,  defence: 1,  weakTo: "melee", respawnTicks: 10,  aggroRadius: 0, sprite: "mireRat" },
    bogling:     { name: "Bogling",      hp: 25,  level: 8,  power: 3,  defence: 5,  weakTo: "magic", respawnTicks: 15,  aggroRadius: 0, sprite: "bogling" },
    ashenWarden: { name: "Ashen Warden", hp: 150, level: 40, power: 10, defence: 15, weakTo: null,    respawnTicks: 100, aggroRadius: 4, sprite: "ashenWarden" },
};

export function createPlayer() {
    return {
        x: 0, y: 0, // main.js sets spawn
        klass: "melee",
        stance: "aggressive",
        stats: {
            melee: { xp: 0 }, ranged: { xp: 0 }, magic: { xp: 0 },
            defence: { xp: 0 }, hitpoints: { xp: xpForLevel(10) },
        },
        hp: 10,
        ownedWeapons: { melee: ["wornGreatsword"], ranged: ["wornBow"], magic: ["wornStaff"] },
        inventory: [], // [{item:"roastPerch"}] foods; coins tracked separately
        coins: 0,
    };
}

export function statLevel(player, stat) { return levelForXp(player.stats[stat].xp); }
export function maxHp(player) { return statLevel(player, "hitpoints"); }

export function bestWeapon(player, klass) {
    return player.ownedWeapons[klass].reduce((best, id) =>
        WEAPONS[id].power > WEAPONS[best].power ? id : best);
}

export function createMonster(type, x, y) {
    return { type, x, y, homeX: x, homeY: y, hp: MONSTERS[type].hp, respawnIn: 0, targetPlayer: false, attackCooldown: 0 };
}
