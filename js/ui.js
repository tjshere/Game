import { CLASSES, WEAPONS, FOODS, bestWeapon, statLevel, maxHp } from "./entities.js";
import { progress } from "./xp.js";
import { drawSprite } from "./sprites-hd.js";

const STATS = ["melee", "ranged", "magic", "defence", "hitpoints"];

function el(id) { return document.getElementById(id); }

export function toast(html) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    el("toasts").appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function iconCanvas(sprite) {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    drawSprite(c.getContext("2d"), sprite, 0, 0, 2);
    return c;
}

function showModal(html, buttons) {
    const modal = el("modal");
    modal.innerHTML = html;
    for (const [label, fn] of buttons) {
        const b = document.createElement("button");
        b.textContent = label;
        b.addEventListener("click", () => { el("modal-backdrop").hidden = true; if (fn) fn(); });
        modal.appendChild(b);
    }
    el("modal-backdrop").hidden = false;
}

export function initUi(game, { onReset }) {
    const player = () => game.state.player;

    function refresh() {
        const p = player();
        el("hp-fill").style.width = `${(100 * p.hp) / maxHp(p)}%`;
        el("hp-text").textContent = `${p.hp}/${maxHp(p)}`;
        el("coins").textContent = p.coins;

        const t = game.targetMonster;
        el("combat-info").textContent = t ? "In combat" : "";

        el("stats").innerHTML = STATS.map((s) => {
            const pr = progress(p.stats[s].xp);
            return `<div class="stat">${s} <b>${pr.level}</b><div class="bar"><i style="width:${(100 * pr.into) / pr.needed}%"></i></div></div>`;
        }).join("");

        const inv = el("inventory");
        inv.innerHTML = "";
        for (let i = 0; i < 24; i++) {
            const slot = document.createElement("div");
            slot.className = "slot";
            const entry = p.inventory[i];
            if (entry) {
                const food = FOODS[entry.item];
                slot.title = `${food.name} (heals ${food.heals})`;
                slot.appendChild(iconCanvas(food.icon));
                slot.addEventListener("click", () => {
                    p.inventory.splice(i, 1);
                    p.hp = Math.min(maxHp(p), p.hp + food.heals);
                    toast(`Ate ${food.name} (+${food.heals} HP)`);
                });
            }
            inv.appendChild(slot);
        }
    }

    function renderClassPanel() {
        const panel = el("class-panel");
        panel.innerHTML = "";
        for (const [name, k] of Object.entries(CLASSES)) {
            const b = document.createElement("button");
            const w = WEAPONS[bestWeapon(player(), name)];
            b.innerHTML = `${name}<br><span class="rarity-${w.rarity}">${w.name}</span>`;
            const isActive = player().klass === name;
            b.className = isActive ? "active" : "";
            if (!isActive) {
                b.addEventListener("click", () => {
                    player().klass = name;
                    toast(`You are now ${name}. Wielding ${WEAPONS[bestWeapon(player(), name)].name}.`);
                    renderClassPanel();
                });
            }
            panel.appendChild(b);
        }
        const stance = document.createElement("button");
        stance.textContent = `Stance: ${player().stance}`;
        stance.addEventListener("click", () => {
            player().stance = player().stance === "aggressive" ? "defensive" : "aggressive";
            renderClassPanel();
        });
        panel.appendChild(stance);
    }

    game.hooks.onReachStone = () => {
        showModal("<h2>Class Stone</h2><p>Choose your discipline. Your best weapon for it is wielded.</p>",
            Object.keys(CLASSES).map((name) => [name, () => {
                player().klass = name;
                toast(`You are now ${name}. Wielding ${WEAPONS[bestWeapon(player(), name)].name}.`);
                renderClassPanel();
            }]));
    };

    el("reset-save").addEventListener("click", () => {
        showModal("<h2>Reset save?</h2><p>All progress will be lost.</p>", [["Reset", onReset], ["Cancel", null]]);
    });

    game.hooks.onTick.push(refresh);
    refresh();
    renderClassPanel();

    return {
        onLoot(drops, monsterName) {
            for (const d of drops) {
                if (d.item === "coins") continue;
                const w = WEAPONS[d.item];
                if (w) toast(`${monsterName} dropped <b class="rarity-${w.rarity}">${w.name}</b>!`);
            }
            renderClassPanel();
        },
        onXp() {},
        onPlayerDeath() { toast("You died. The clearing welcomes you back."); },
        onLevelUp(stat, level) { toast(`Level up! ${stat} is now <b>${level}</b>.`); },
        onBossKill() {
            showModal("<h2>The Ashen Warden falls.</h2><p>The valley is quiet. You did it.</p><p>(It respawns, if you're chasing its orange weapons.)</p>", [["Glorious", null]]);
        },
    };
}
