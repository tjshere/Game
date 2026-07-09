import { isBlocked } from "./world.js";

const DIRS = [ [0,-1], [0,1], [-1,0], [1,0] ];

export function findPath(map, from, to) {
    if (from.x === to.x && from.y === to.y) return [];
    if (isBlocked(map, to.x, to.y)) return null;
    const key = (x, y) => y * map.width + x;
    const prev = new Map([[key(from.x, from.y), null]]);
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        for (const [dx, dy] of DIRS) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (isBlocked(map, nx, ny) || prev.has(key(nx, ny))) continue;
            prev.set(key(nx, ny), cur);
            if (nx === to.x && ny === to.y) {
                const path = [{ x: nx, y: ny }];
                let p = cur;
                while (p && !(p.x === from.x && p.y === from.y)) { path.push(p); p = prev.get(key(p.x, p.y)); }
                return path.reverse();
            }
            queue.push({ x: nx, y: ny });
        }
    }
    return null;
}

export function findPathAdjacent(map, from, to) {
    let best = null;
    for (const [dx, dy] of DIRS) {
        const t = { x: to.x + dx, y: to.y + dy };
        if (isBlocked(map, t.x, t.y)) continue;
        const p = findPath(map, from, t);
        if (p && (!best || p.length < best.length)) best = p;
    }
    return best;
}
