import { test } from "node:test";
import assert from "node:assert/strict";
import { SPRITES, PALETTE, spriteSize } from "../js/sprites-hd.js";

const REQUIRED = ["grass","grass2","path","water","tree","rock","stone",
    "playerMelee","playerRanged","playerMagic","mireRat","bogling","ashenWarden",
    "iconSword","iconBow","iconStaff","iconCoins","iconPerch","iconLoaf"];

test("all required sprites exist", () => {
    for (const name of REQUIRED) assert.ok(SPRITES[name], `missing sprite ${name}`);
});
test("every sprite is a rectangular grid of known palette chars", () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
        const w = rows[0].length;
        for (const row of rows) {
            assert.equal(row.length, w, `${name} row width mismatch`);
            for (const ch of row) assert.ok(ch in PALETTE, `${name} unknown char '${ch}'`);
        }
        const size = spriteSize(name);
        assert.deepEqual(size, { w, h: rows.length });
    }
});
