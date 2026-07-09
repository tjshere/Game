import { test } from "node:test";
import assert from "node:assert/strict";
import { maxHit, hitChance, rollHit, xpForDamage, ATTACK_SPEED_TICKS } from "../js/combat.js";

test("maxHit scales with level and weapon power", () => {
    assert.equal(maxHit(1, 1), 2);
    assert.ok(maxHit(50, 8) > maxHit(50, 1));
    assert.ok(maxHit(99, 8) > maxHit(1, 8));
});
test("hitChance is a probability and monotonic", () => {
    for (const [a, p, d] of [[1,1,1],[50,4,10],[99,8,99]]) {
        const c = hitChance(a, p, d);
        assert.ok(c > 0 && c < 1, `chance ${c}`);
    }
    assert.ok(hitChance(50, 4, 5) > hitChance(10, 4, 5), "higher level hits more");
    assert.ok(hitChance(50, 4, 50) < hitChance(50, 4, 5), "higher defence dodges more");
});
test("rollHit: rng=0.99,0.5 lands a mid hit; rng high on accuracy misses", () => {
    const seq = (vals) => { let i = 0; return () => vals[i++]; };
    // first rng call = accuracy check (< chance hits), second = damage roll
    const dmg = rollHit({ level: 50, power: 4 }, { defence: 5 }, false, seq([0.0, 0.5]));
    assert.equal(dmg, Math.floor(0.5 * (maxHit(50, 4) + 1))); // mid roll of 0..maxHit inclusive
    const miss = rollHit({ level: 50, power: 4 }, { defence: 5 }, false, seq([0.999999, 0.5]));
    assert.equal(miss, 0);
});
test("weakness bonus multiplies damage by 1.25 floored", () => {
    const seq = (vals) => { let i = 0; return () => vals[i++]; };
    const base = rollHit({ level: 40, power: 8 }, { defence: 1 }, false, seq([0.0, 0.9]));
    const boosted = rollHit({ level: 40, power: 8 }, { defence: 1 }, true, seq([0.0, 0.9]));
    assert.equal(boosted, Math.floor(base * 1.25));
});
test("xp split follows stance", () => {
    assert.deepEqual(xpForDamage(6, "aggressive"), { classXp: 60, defXp: 0, hpXp: 24 });
    assert.deepEqual(xpForDamage(6, "defensive"),  { classXp: 0, defXp: 60, hpXp: 24 });
    assert.deepEqual(xpForDamage(0, "aggressive"), { classXp: 0, defXp: 0, hpXp: 0 });
});
test("attack speed is 2 ticks", () => assert.equal(ATTACK_SPEED_TICKS, 2));
