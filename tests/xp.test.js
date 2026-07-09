import { test } from "node:test";
import assert from "node:assert/strict";
import { xpForLevel, levelForXp, progress, MAX_LEVEL } from "../js/xp.js";

test("level 1 requires 0 xp", () => assert.equal(xpForLevel(1), 0));
test("level 2 requires 83 xp", () => assert.equal(xpForLevel(2), 83));
test("curve is strictly increasing to 99", () => {
    for (let l = 2; l <= MAX_LEVEL; l++) assert.ok(xpForLevel(l) > xpForLevel(l - 1));
});
test("levelForXp inverts xpForLevel", () => {
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(82), 1);
    assert.equal(levelForXp(83), 2);
    for (let l = 1; l <= MAX_LEVEL; l++) assert.equal(levelForXp(xpForLevel(l)), l);
});
test("level caps at 99", () => assert.equal(levelForXp(xpForLevel(99) * 10), 99));
test("progress reports xp into current level", () => {
    const p = progress(100);
    assert.equal(p.level, 2);
    assert.equal(p.into, 100 - 83);
    assert.equal(p.needed, xpForLevel(3) - xpForLevel(2));
});
