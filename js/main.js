import { MAP_TEXT, parseMap, PLAYER_SPAWN, CLASS_STONE, MONSTER_SPAWNS, isBlocked } from "./world.js";
import { findPath, findPathAdjacent } from "./pathfinding.js";
import { createPlayer, createMonster, maxHp, FOODS, WEAPONS, INVENTORY_SIZE } from "./entities.js";
import { createRenderer } from "./render.js";
import { save, load, SAVE_KEY } from "./save.js";
import { attachCombat } from "./engage.js";
import { initUi } from "./ui.js";
import { initContextMenu } from "./context-menu.js";

export const TICK_MS = 600;
const map = parseMap(MAP_TEXT);

function freshState() {
    const player = createPlayer();
    player.x = PLAYER_SPAWN.x; player.y = PLAYER_SPAWN.y;
    return {
        player,
        monsters: MONSTER_SPAWNS.map((s) => createMonster(s.type, s.x, s.y)),
        lootState: { killCounts: {}, dropTargets: {} },
        bossDefeated: false,
        groundItems: [],
        tick: 0,
    };
}

function loadState() {
    const saved = load(localStorage);
    if (!saved) return freshState();
    if (!saved.groundItems) saved.groundItems = [];
    // monsters are not saved; rebuild them fresh
    return { ...saved, monsters: MONSTER_SPAWNS.map((s) => createMonster(s.type, s.x, s.y)) };
}

export const game = {
    state: loadState(),
    effects: { hitsplats: [], xpDrops: [] },
    path: [],            // pending movement steps
    targetMonster: null, // monster instance the player is engaging
    pendingStone: false, // walk-then-open class modal
    attackCooldown: 0,
    hooks: { onTick: [], onClickMonster: null, onReachStone: null }, // Task 10/11 attach here
};

const uiCallbacks = initUi(game, {
    onReset: () => { localStorage.removeItem(SAVE_KEY); location.reload(); },
});
attachCombat(game, map, uiCallbacks);

const canvas = document.getElementById("canvas");
const renderer = createRenderer(canvas, map);
game._map = map;
game._pathfinding = { findPath, findPathAdjacent };

canvas.addEventListener("click", (e) => {
    const t = renderer.screenToTile(game.state, e.clientX, e.clientY);
    const monster = game.state.monsters.find((m) => m.respawnIn <= 0 && m.x === t.x && m.y === t.y);
    game.targetMonster = null;
    game.pendingStone = false;
    if (monster && game.hooks.onClickMonster) {
        game.hooks.onClickMonster(monster);
    } else if (t.x === CLASS_STONE.x && t.y === CLASS_STONE.y) {
        game.path = findPathAdjacent(map, game.state.player, t) || [];
        game.pendingStone = true;
    } else {
        const groundItem = game.state.groundItems.find(g => g.x === t.x && g.y === t.y);
        if (groundItem || !isBlocked(map, t.x, t.y)) {
            game.path = findPath(map, game.state.player, t) || [];
        }
    }
});

function pickupItems(state) {
    const p = state.player;
    const atPlayer = state.groundItems.filter(g => g.x === p.x && g.y === p.y);
    for (const g of atPlayer) {
        if (g.item === "coins") p.coins += g.qty;
        else if (FOODS[g.item]) {
            if (p.inventory.length < INVENTORY_SIZE) p.inventory.push({ item: g.item });
        } else if (WEAPONS[g.item]) {
            p.ownedWeapons[WEAPONS[g.item].klass].push(g.item);
        }
    }
    state.groundItems = state.groundItems.filter(g => !(g.x === p.x && g.y === p.y));
}
initContextMenu(canvas, renderer, game);

function tick() {
    const s = game.state;
    s.tick++;
    if (game.path.length) {
        const step = game.path.shift();
        s.player.x = step.x; s.player.y = step.y;
        if (!game.path.length && game.pendingStone && game.hooks.onReachStone) {
            game.pendingStone = false;
            game.hooks.onReachStone();
        }
    }
    pickupItems(s);
    s.groundItems = s.groundItems.filter(g => s.tick - g.tick < 200);
    for (const fn of game.hooks.onTick) fn(); // combat/AI (Task 10), UI refresh (Task 11)
    // passive regen out of combat
    if (s.tick % 10 === 0 && !game.targetMonster && s.player.hp < maxHp(s.player)) s.player.hp++;
    // effect timers
    for (const list of [game.effects.hitsplats, game.effects.xpDrops]) {
        for (const e of list) e.ttl--;
        list.splice(0, list.length, ...list.filter((e) => e.ttl > 0));
    }
    if (s.tick % 10 === 0) save(s, localStorage);
}

let last = performance.now(), acc = 0;
function frame(now) {
    acc += now - last; last = now;
    while (acc >= TICK_MS) { acc -= TICK_MS; tick(); }
    renderer.draw(game.state, game.effects);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export { map, renderer };
window.__state = game.state;
