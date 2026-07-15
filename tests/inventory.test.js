import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlayer, maxHp, FOODS } from "../js/entities.js";
import { eatAt, dropAt } from "../js/inventory.js";

function stateWith(items) {
    const player = createPlayer();
    player.x = 4; player.y = 9;
    player.inventory = items.map((item) => ({ item }));
    return { player, groundItems: [], tick: 42 };
}

test("eatAt heals, caps at max hp, removes the right slot", () => {
    const { player } = stateWith(["roastPerch", "emberLoaf"]);
    player.hp = 3;
    const food = eatAt(player, 0);
    assert.equal(food, FOODS.roastPerch);
    assert.equal(player.hp, 8);
    assert.deepEqual(player.inventory, [{ item: "emberLoaf" }]);
    player.hp = maxHp(player) - 1;
    eatAt(player, 0); // emberLoaf heals 12 → caps at max
    assert.equal(player.hp, maxHp(player));
    assert.equal(player.inventory.length, 0);
});
test("eatAt on an empty slot is a no-op", () => {
    const { player } = stateWith([]);
    player.hp = 5;
    assert.equal(eatAt(player, 0), null);
    assert.equal(player.hp, 5);
});
test("dropAt puts the item at the player's tile with the current tick", () => {
    const s = stateWith(["roastPerch"]);
    const food = dropAt(s, 0);
    assert.equal(food, FOODS.roastPerch);
    assert.equal(s.player.inventory.length, 0);
    assert.deepEqual(s.groundItems, [{ item: "roastPerch", x: 4, y: 9, tick: 42 }]);
});
test("dropAt with a bad index is a no-op", () => {
    const s = stateWith(["roastPerch"]);
    assert.equal(dropAt(s, 5), null);
    assert.equal(s.groundItems.length, 0);
    assert.equal(s.player.inventory.length, 1);
});
