import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASSES, WEAPONS, FOODS, MONSTERS, createPlayer, createMonster,
         statLevel, maxHp, bestWeapon, INVENTORY_SIZE } from "../js/entities.js";

test("three classes with 2H starter weapons of their own class", () => {
    for (const [name, k] of Object.entries(CLASSES)) {
        assert.ok(WEAPONS[k.starter], `${name} starter exists`);
        assert.equal(WEAPONS[k.starter].klass, name);
    }
    assert.equal(CLASSES.melee.range, 1);
    assert.ok(CLASSES.ranged.range > CLASSES.magic.range);
});
test("each class has a gray starter, blue field tier, orange boss tier", () => {
    for (const klass of Object.keys(CLASSES)) {
        const tiers = Object.values(WEAPONS).filter((w) => w.klass === klass).map((w) => w.rarity).sort();
        assert.deepEqual(tiers, ["blue", "gray", "orange"]);
    }
});
test("fresh player: level 1 combat stats, hitpoints 10, starter weapons owned", () => {
    const p = createPlayer();
    assert.equal(statLevel(p, "melee"), 1);
    assert.equal(statLevel(p, "hitpoints"), 10);
    assert.equal(maxHp(p), 10);
    assert.equal(p.hp, 10);
    assert.equal(p.klass, "melee");
    assert.equal(p.stance, "aggressive");
    assert.deepEqual(p.ownedWeapons.melee, ["wornGreatsword"]);
    assert.equal(p.inventory.length, 0);
    assert.equal(INVENTORY_SIZE, 24);
});
test("bestWeapon picks highest power owned for that class", () => {
    const p = createPlayer();
    p.ownedWeapons.melee.push("emberbrandGreatsword", "soldiersGreatsword");
    assert.equal(bestWeapon(p, "melee"), "emberbrandGreatsword");
    assert.equal(bestWeapon(p, "ranged"), "wornBow");
});
test("monsters: two regulars each weak to a class, boss weak to none", () => {
    assert.equal(MONSTERS.mireRat.weakTo, "melee");
    assert.equal(MONSTERS.bogling.weakTo, "magic");
    assert.equal(MONSTERS.ashenWarden.weakTo, null);
    assert.ok(MONSTERS.ashenWarden.hp >= 100);
});
test("createMonster instance", () => {
    const m = createMonster("mireRat", 3, 4);
    assert.equal(m.type, "mireRat");
    assert.equal(m.hp, MONSTERS.mireRat.hp);
    assert.deepEqual([m.x, m.y], [3, 4]);
    assert.deepEqual([m.homeX, m.homeY], [3, 4]);
    assert.equal(m.respawnIn, 0);
    assert.equal(m.targetPlayer, false);
});
