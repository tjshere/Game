import { test } from "node:test";
import assert from "node:assert/strict";
import { serialize, deserialize, save, load, SAVE_KEY } from "../js/save.js";
import { createPlayer } from "../js/entities.js";

const fakeStorage = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

test("round trip preserves the whole state", () => {
    const state = {
        player: { ...createPlayer(), x: 12, y: 30, coins: 250, klass: "magic" },
        lootState: { killCounts: { mireRat: 7 }, dropTargets: { "mireRat:adeptsStaff": 9 } },
        bossDefeated: true, tick: 4200,
    };
    state.player.inventory.push({ item: "roastPerch" });
    const back = deserialize(serialize(state));
    assert.deepEqual(back, state);
});
test("deserialize rejects garbage and wrong versions", () => {
    assert.equal(deserialize("not json"), null);
    assert.equal(deserialize(null), null);
    assert.equal(deserialize(JSON.stringify({ v: 999 })), null);
});
test("save/load through a storage object", () => {
    const storage = fakeStorage();
    assert.equal(load(storage), null);
    const state = { player: createPlayer(), lootState: { killCounts: {}, dropTargets: {} }, bossDefeated: false, tick: 0 };
    save(state, storage);
    assert.ok(storage.getItem(SAVE_KEY));
    assert.deepEqual(load(storage), state);
});
