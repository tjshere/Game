import { MONSTERS, FOODS, WEAPONS } from "./entities.js";
import { CLASS_STONE } from "./world.js";

export function initContextMenu(canvas, renderer, game) {
    let menu = null;

    function close() {
        if (menu) { menu.remove(); menu = null; }
    }

    function show(x, y, entries) {
        close();
        menu = document.createElement("div");
        menu.className = "ctx-menu";
        menu.style.left = x + "px";
        menu.style.top = y + "px";
        for (const entry of entries) {
            const row = document.createElement("div");
            row.className = "ctx-row";
            if (entry.color) row.style.color = entry.color;
            row.textContent = entry.label;
            if (entry.action) {
                row.addEventListener("click", (e) => {
                    e.stopPropagation();
                    close();
                    entry.action();
                });
            } else {
                row.classList.add("ctx-header");
            }
            menu.appendChild(row);
        }
        document.body.appendChild(menu);
        // keep menu on screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + "px";
        if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + "px";
    }

    canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const t = renderer.screenToTile(game.state, e.clientX, e.clientY);
        const entries = [];

        // Check for monster
        const monster = game.state.monsters.find(m => m.respawnIn <= 0 && m.x === t.x && m.y === t.y);
        if (monster) {
            const def = MONSTERS[monster.type];
            entries.push({ label: def.name, color: "#f39c2b" });
            entries.push({ label: "Attack", action: () => {
                if (game.hooks.onClickMonster) game.hooks.onClickMonster(monster);
            }});
            entries.push({ label: "Examine", action: () => {
                const el = document.getElementById("toasts");
                const toast = document.createElement("div");
                toast.className = "toast";
                toast.innerHTML = `Level ${def.level} ${def.name}. HP: ${monster.hp}/${def.hp}.`;
                el.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }});
        }

        // Check for class stone
        if (t.x === CLASS_STONE.x && t.y === CLASS_STONE.y) {
            entries.push({ label: "Class Stone", color: "#d8b25a" });
            entries.push({ label: "Use", action: () => {
                const { findPathAdjacent } = game._pathfinding;
                const map = game._map;
                game.path = findPathAdjacent(map, game.state.player, t) || [];
                game.pendingStone = true;
            }});
            entries.push({ label: "Examine", action: () => {
                const el = document.getElementById("toasts");
                const toast = document.createElement("div");
                toast.className = "toast";
                toast.innerHTML = "An ancient stone of power. Use it to change your class.";
                el.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }});
        }

        // Check for ground items
        const groundItems = (game.state.groundItems || []).filter(g => g.x === t.x && g.y === t.y);
        if (groundItems.length > 0) {
            for (const g of groundItems) {
                let name = g.item;
                let color = "#e8e4d8";
                if (g.item === "coins") {
                    name = `Coins (${g.qty})`;
                    color = "#d8b25a";
                } else if (FOODS[g.item]) {
                    name = FOODS[g.item].name;
                    color = "#2e8b2e";
                } else if (WEAPONS[g.item]) {
                    const w = WEAPONS[g.item];
                    name = w.name;
                    const rarityColors = { gray: "#9aa0a6", blue: "#4f9dde", orange: "#f39c2b" };
                    color = rarityColors[w.rarity] || color;
                }
                entries.push({ label: name, color });
                entries.push({ label: "Take", action: () => {
                    const { findPath } = game._pathfinding;
                    const map = game._map;
                    game.path = findPath(map, game.state.player, t) || [];
                }});
            }
        }

        // Check for tree
        if (game._map.tiles[t.y] && game._map.tiles[t.y][t.x] === "T") {
            entries.push({ label: "Tree", color: "#3f6b35" });
            entries.push({ label: "Examine", action: () => {
                const el = document.getElementById("toasts");
                const toast = document.createElement("div");
                toast.className = "toast";
                toast.innerHTML = "A sturdy tree. It blocks your path.";
                el.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }});
        }

        // Check for rock
        if (game._map.tiles[t.y] && game._map.tiles[t.y][t.x] === "R") {
            entries.push({ label: "Rock", color: "#8a857a" });
            entries.push({ label: "Examine", action: () => {
                const el = document.getElementById("toasts");
                const toast = document.createElement("div");
                toast.className = "toast";
                toast.innerHTML = "A weathered rock wall. You can't pass through.";
                el.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }});
        }

        if (entries.length > 0) {
            show(e.clientX, e.clientY, entries);
        }
    });

    document.addEventListener("click", close);
    document.addEventListener("contextmenu", (e) => {
        if (e.target !== canvas) close();
    });

    return { close };
}
