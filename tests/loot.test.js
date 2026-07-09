import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureTargets, resolveKill } from "../js/loot.js";
import { DROP_TABLES } from "../js/drops.js";

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const fresh = () => ({ killCounts: {}, dropTargets: {} });

test("ensureTargets pre-rolls one target per weapon within range", () => {
    const s = fresh();
    ensureTargets(s, "mireRat", () => 0.0); // rolls minimum of each range
    assert.equal(s.dropTargets["mireRat:soldiersGreatsword"], 5);
    assert.equal(s.dropTargets["mireRat:adeptsStaff"], 5);
    ensureTargets(s, "mireRat", () => 0.99); // must NOT re-roll existing targets
    assert.equal(s.dropTargets["mireRat:soldiersGreatsword"], 5);
});
test("weapon drops exactly on its pre-rolled kill, then re-rolls forward", () => {
    const s = fresh();
    // rng always 0 → weapon targets roll range minimum (5), coins roll min, food chance 0 < 1/3 → drops
    const rng = () => 0.0;
    ensureTargets(s, "mireRat", rng);
    let weaponDrops = [];
    for (let kill = 1; kill <= 10; kill++) {
        const drops = resolveKill(s, "mireRat", rng);
        for (const d of drops) if (!["coins", "roastPerch"].includes(d.item)) weaponDrops.push({ kill, item: d.item });
    }
    // both weapons target kill 5; both drop there; re-rolled to 5+5=10, drop again at 10
    assert.deepEqual(weaponDrops.map((d) => d.kill), [5, 5, 10, 10]);
    assert.equal(s.killCounts.mireRat, 10);
});
test("coins quantity comes from the table range", () => {
    const s = fresh();
    ensureTargets(s, "bogling", () => 0.999999);
    const drops = resolveKill(s, "bogling", () => 0.999999);
    const coins = drops.find((d) => d.item === "coins");
    assert.equal(coins.qty, DROP_TABLES.bogling.coins[1]); // max roll
});
test("food respects its chance", () => {
    const s = fresh();
    ensureTargets(s, "bogling", () => 0.999999);
    const noFood = resolveKill(s, "bogling", () => 0.999999); // 0.99 > 1/3 → no food... but boss food chance is 1
    assert.ok(!noFood.find((d) => d.item === "emberLoaf"));
    const s2 = fresh();
    ensureTargets(s2, "ashenWarden", () => 0.999999);
    const bossDrops = resolveKill(s2, "ashenWarden", () => 0.999999);
    assert.ok(bossDrops.find((d) => d.item === "emberLoaf")); // chance 1 always drops
});
