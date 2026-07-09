import { test } from "node:test";
import assert from "node:assert/strict";
import { MAP_TEXT, parseMap, isBlocked, PLAYER_SPAWN, CLASS_STONE, MONSTER_SPAWNS } from "../js/world.js";

test("map is exactly 40x40 with a known legend", () => {
    assert.equal(MAP_TEXT.length, 40);
    for (const row of MAP_TEXT) {
        assert.equal(row.length, 40);
        for (const ch of row) assert.ok("GPWTRC".includes(ch), `unknown tile '${ch}'`);
    }
});
test("map border is all water", () => {
    const m = parseMap(MAP_TEXT);
    for (let i = 0; i < 40; i++) {
        assert.equal(m.tiles[0][i], "W"); assert.equal(m.tiles[39][i], "W");
        assert.equal(m.tiles[i][0], "W"); assert.equal(m.tiles[i][39], "W");
    }
});
test("blocking rules", () => {
    const m = parseMap(["GWT", "RCP", "GGG"]);
    assert.equal(isBlocked(m, 0, 0), false); // grass
    assert.equal(isBlocked(m, 1, 0), true);  // water
    assert.equal(isBlocked(m, 2, 0), true);  // tree
    assert.equal(isBlocked(m, 0, 1), true);  // rock
    assert.equal(isBlocked(m, 1, 1), true);  // class stone
    assert.equal(isBlocked(m, 2, 1), false); // path
    assert.equal(isBlocked(m, -1, 0), true); // out of bounds
    assert.equal(isBlocked(m, 0, 3), true);  // out of bounds
});
test("spawns sit on walkable tiles", () => {
    const m = parseMap(MAP_TEXT);
    assert.equal(isBlocked(m, PLAYER_SPAWN.x, PLAYER_SPAWN.y), false);
    for (const s of MONSTER_SPAWNS) assert.equal(isBlocked(m, s.x, s.y), false, `${s.type} at ${s.x},${s.y}`);
});
test("class stone is where we say it is", () => {
    const m = parseMap(MAP_TEXT);
    assert.equal(m.tiles[CLASS_STONE.y][CLASS_STONE.x], "C");
});
