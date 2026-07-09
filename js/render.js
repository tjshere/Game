import { drawSprite } from "./sprites.js";
import { tileSprite } from "./world.js";
import { MONSTERS, CLASSES } from "./entities.js";

export const TILE_PX = 32;
export const PIXEL_SCALE = 4;

const PLAYER_SPRITE = { melee: "playerMelee", ranged: "playerRanged", magic: "playerMagic" };

export function createRenderer(canvas, map) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const viewW = Math.floor(canvas.width / TILE_PX);
    const viewH = Math.floor(canvas.height / TILE_PX);

    function camera(state) {
        const cx = Math.max(0, Math.min(map.width - viewW, state.player.x - Math.floor(viewW / 2)));
        const cy = Math.max(0, Math.min(map.height - viewH, state.player.y - Math.floor(viewH / 2)));
        return { cx, cy };
    }

    function drawBar(px, py, fraction) {
        ctx.fillStyle = "#401515";
        ctx.fillRect(px, py - 6, TILE_PX, 4);
        ctx.fillStyle = "#2e8b2e";
        ctx.fillRect(px, py - 6, Math.max(0, TILE_PX * fraction), 4);
    }

    return {
        screenToTile(state, clientX, clientY) {
            const r = canvas.getBoundingClientRect();
            const { cx, cy } = camera(state);
            const scaleX = canvas.width / r.width, scaleY = canvas.height / r.height;
            return {
                x: cx + Math.floor(((clientX - r.left) * scaleX) / TILE_PX),
                y: cy + Math.floor(((clientY - r.top) * scaleY) / TILE_PX),
            };
        },
        draw(state, effects) {
            const { cx, cy } = camera(state);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let y = cy; y < cy + viewH && y < map.height; y++) {
                for (let x = cx; x < cx + viewW && x < map.width; x++) {
                    drawSprite(ctx, tileSprite(map.tiles[y][x], x, y), (x - cx) * TILE_PX, (y - cy) * TILE_PX, PIXEL_SCALE);
                }
            }
            for (const m of state.monsters) {
                if (m.respawnIn > 0) continue;
                const px = (m.x - cx) * TILE_PX, py = (m.y - cy) * TILE_PX;
                drawSprite(ctx, MONSTERS[m.type].sprite, px, py, PIXEL_SCALE);
                if (m.hp < MONSTERS[m.type].hp) drawBar(px, py, m.hp / MONSTERS[m.type].hp);
            }
            const p = state.player;
            drawSprite(ctx, PLAYER_SPRITE[p.klass], (p.x - cx) * TILE_PX, (p.y - cy) * TILE_PX, PIXEL_SCALE);

            ctx.font = "bold 14px monospace";
            ctx.textAlign = "center";
            for (const h of effects.hitsplats) {
                const px = (h.x - cx) * TILE_PX + TILE_PX / 2, py = (h.y - cy) * TILE_PX + TILE_PX / 2;
                ctx.fillStyle = h.amount > 0 ? "#b8443c" : "#356e94";
                ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.fillText(String(h.amount), px, py + 5);
            }
            ctx.fillStyle = "#d8b25a";
            for (const d of effects.xpDrops) {
                const px = (d.x - cx) * TILE_PX + TILE_PX / 2;
                const py = (d.y - cy) * TILE_PX - (5 - d.ttl) * 8;
                ctx.fillText(d.text, px, py);
            }
        },
    };
}
