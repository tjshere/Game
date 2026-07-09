import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMap } from "../js/world.js";
import { findPath, findPathAdjacent } from "../js/pathfinding.js";

const m = parseMap([
    "GGGGG",
    "GTTTG",
    "GGGTG",
    "TGGGG",
    "GGGGG",
]);

test("straight path", () => {
    const p = findPath(m, { x: 0, y: 0 }, { x: 4, y: 0 });
    assert.deepEqual(p, [{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0}]);
});
test("routes around walls", () => {
    const p = findPath(m, { x: 0, y: 0 }, { x: 1, y: 2 });
    assert.ok(p.length >= 3);
    assert.deepEqual(p[p.length - 1], { x: 1, y: 2 });
    for (const step of p) assert.notEqual(m.tiles[step.y][step.x], "T");
});
test("unreachable returns null", () => {
    const boxed = parseMap(["GTG", "TTG", "GGG"]);
    assert.equal(findPath(boxed, { x: 0, y: 0 }, { x: 2, y: 2 }), null);
});
test("already there returns empty path", () => {
    assert.deepEqual(findPath(m, { x: 1, y: 0 }, { x: 1, y: 0 }), []);
});
test("adjacent pathing stops next to a blocked target", () => {
    const p = findPathAdjacent(m, { x: 0, y: 0 }, { x: 2, y: 1 }); // tree tile
    const last = p[p.length - 1];
    const dist = Math.abs(last.x - 2) + Math.abs(last.y - 1);
    assert.equal(dist, 1);
});
