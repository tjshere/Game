import { MONSTERS, CLASSES, WEAPONS, FOODS, bestWeapon, statLevel, maxHp, INVENTORY_SIZE } from "./entities.js";
import { rollHit, xpForDamage, ATTACK_SPEED_TICKS } from "./combat.js";
import { ensureTargets, resolveKill } from "./loot.js";
import { findPathAdjacent } from "./pathfinding.js";
import { PLAYER_SPAWN } from "./world.js";

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const rng = Math.random;

export function attachCombat(game, map, deps) {
    game.hooks.onClickMonster = (monster) => {
        game.targetMonster = monster;
        game.path = [];
        ensureTargets(game.state.lootState, monster.type, rng);
    };

    function awardXp(player, damage) {
        const gains = xpForDamage(damage, player.stance);
        const classStat = CLASSES[player.klass].stat;
        const touched = [[classStat, gains.classXp], ["defence", gains.defXp], ["hitpoints", gains.hpXp]];
        for (const [stat, xp] of touched) {
            if (!xp) continue;
            const before = statLevel(player, stat);
            player.stats[stat].xp += xp;
            const after = statLevel(player, stat);
            if (after > before) deps.onLevelUp(stat, after);
        }
        deps.onXp(gains);
    }

    function playerAttack(player, monster) {
        const def = MONSTERS[monster.type];
        const weapon = WEAPONS[bestWeapon(player, player.klass)];
        const level = statLevel(player, CLASSES[player.klass].stat);
        const dmg = rollHit({ level, power: weapon.power }, { defence: def.defence }, def.weakTo === player.klass, rng);
        monster.hp -= dmg;
        monster.targetPlayer = true;
        game.effects.hitsplats.push({ x: monster.x, y: monster.y, amount: dmg, ttl: 2 });
        if (dmg > 0) {
            awardXp(player, dmg);
            game.effects.xpDrops.push({ x: player.x, y: player.y, text: `+${dmg * 10}xp`, ttl: 5 });
        }
        if (monster.hp <= 0) killMonster(player, monster);
    }

    function killMonster(player, monster) {
        const def = MONSTERS[monster.type];
        const drops = resolveKill(game.state.lootState, monster.type, rng);
        for (const d of drops) {
            if (d.item === "coins") player.coins += d.qty;
            else if (FOODS[d.item]) {
                if (player.inventory.length < INVENTORY_SIZE) player.inventory.push({ item: d.item });
            } else if (WEAPONS[d.item]) {
                player.ownedWeapons[WEAPONS[d.item].klass].push(d.item);
            }
        }
        deps.onLoot(drops, def.name);
        monster.respawnIn = def.respawnTicks;
        monster.targetPlayer = false;
        game.targetMonster = null;
        if (monster.type === "ashenWarden" && !game.state.bossDefeated) {
            game.state.bossDefeated = true;
            deps.onBossKill();
        }
    }

    game.hooks.onTick.push(() => {
        const s = game.state;
        const player = s.player;

        // 1. player engagement
        const t = game.targetMonster;
        if (t && t.respawnIn <= 0) {
            if (cheb(player, t) > CLASSES[player.klass].range) {
                const p = findPathAdjacent(map, player, t);
                if (p && p.length) { player.x = p[0].x; player.y = p[0].y; }
            } else if (game.attackCooldown <= 0) {
                playerAttack(player, t);
                game.attackCooldown = ATTACK_SPEED_TICKS;
            }
        }
        if (game.attackCooldown > 0) game.attackCooldown--;

        // 2. monster turns
        for (const m of s.monsters) {
            if (m.respawnIn > 0) {
                if (--m.respawnIn === 0) { m.hp = MONSTERS[m.type].hp; m.x = m.homeX; m.y = m.homeY; m.targetPlayer = false; }
                continue;
            }
            const def = MONSTERS[m.type];
            if (def.aggroRadius > 0 && cheb(m, player) <= def.aggroRadius) m.targetPlayer = true;
            if (!m.targetPlayer) continue;
            if (cheb(m, player) > 12) { m.targetPlayer = false; continue; } // leash
            if (cheb(m, player) > 1) {
                const p = findPathAdjacent(map, m, player);
                if (p && p.length) { m.x = p[0].x; m.y = p[0].y; }
            } else if (m.attackCooldown <= 0) {
                const dmg = rollHit({ level: def.level, power: def.power }, { defence: statLevel(player, "defence") }, false, rng);
                player.hp -= dmg;
                game.effects.hitsplats.push({ x: player.x, y: player.y, amount: dmg, ttl: 2 });
                m.attackCooldown = ATTACK_SPEED_TICKS;
            }
            if (m.attackCooldown > 0) m.attackCooldown--;
        }

        // 3. player death
        if (player.hp <= 0) {
            player.x = PLAYER_SPAWN.x; player.y = PLAYER_SPAWN.y;
            player.hp = maxHp(player);
            game.targetMonster = null;
            game.path = [];
            for (const m of s.monsters) m.targetPlayer = false;
            deps.onPlayerDeath();
        }
    });
}
