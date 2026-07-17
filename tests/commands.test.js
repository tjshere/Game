import { test } from "node:test";
import assert from "node:assert/strict";
import { runCommand } from "../js/commands.js";
import { createPlayer, statLevel, maxHp } from "../js/entities.js";

const freshState = () => ({ player: createPlayer() });

test("::maxstats sets every stat to 99 and refills hp", () => {
    const state = freshState();
    const r = runCommand(state, "::maxstats");
    assert.equal(r.ok, true);
    assert.match(r.message, /99/);
    for (const stat of ["melee", "ranged", "magic", "defence", "hitpoints"]) {
        assert.equal(statLevel(state.player, stat), 99, stat);
    }
    assert.equal(state.player.hp, maxHp(state.player));
});

test("::heal refills hp and touches nothing else", () => {
    const state = freshState();
    state.player.hp = 1;
    const before = JSON.stringify(state.player.stats);
    const r = runCommand(state, "::heal");
    assert.equal(r.ok, true);
    assert.equal(state.player.hp, maxHp(state.player));
    assert.equal(JSON.stringify(state.player.stats), before);
});

test("parsing is case-insensitive and whitespace-tolerant", () => {
    const state = freshState();
    state.player.hp = 1;
    assert.equal(runCommand(state, "  ::HeAl  ").ok, true);
    assert.equal(state.player.hp, maxHp(state.player));
});

test("unknown or malformed input is rejected without changes", () => {
    const state = freshState();
    const snapshot = JSON.stringify(state.player);
    for (const text of ["::nope", "maxstats", "hello there", "::", ""]) {
        const r = runCommand(state, text);
        assert.equal(r.ok, false, text);
        assert.equal(r.message, "Unknown command.");
    }
    assert.equal(JSON.stringify(state.player), snapshot);
});
