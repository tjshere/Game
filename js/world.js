// The world is text. Edit these strings to edit the map.
// G grass · P path · W water · T tree · R rock wall · C class stone
// Rows are written as 4 × 10-char segments so miscounts can't slip in.
export const MAP_TEXT = [
    "WWWWWWWWWW" + "WWWWWWWWWW" + "WWWWWWWWWW" + "WWWWWWWWWW",
    "WTTGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGTTW",
    "WTGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGTW",
    "WGGGGGGGCG" + "GGGGGGGGGG" + "GGGGTGGGGG" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGTGGGGGGW",
    "WGGGGGGGGG" + "GGGPPPPPPP" + "PPPPPPPPPP" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WTGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGTGGG" + "GGGGGGGGTW",
    "WTTGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGTTW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGTGGGGGGG" + "GGGGTGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WTGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGTW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGTGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGPGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGTGGGGGG" + "GGGGGGGGTG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGWWGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGWWGGG" + "GGGGWWGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGWWGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRRRRRR" + "RRRRRRRRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGTGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGGGTGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGRGGGGG" + "GGGGGGGRGW",
    "WGGTGGGGGG" + "GGGGGGGGGG" + "GGGGRRRRRR" + "RRRRRRRRGW",
    "WGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGW",
    "WTTGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGGGG" + "GGGGGGGTTW",
    "WWWWWWWWWW" + "WWWWWWWWWW" + "WWWWWWWWWW" + "WWWWWWWWWW",
];

export const PLAYER_SPAWN = { x: 6, y: 5 };
export const CLASS_STONE = { x: 8, y: 3 };
export const MONSTER_SPAWNS = [
    { type: "mireRat", x: 24, y: 4 }, { type: "mireRat", x: 28, y: 7 },
    { type: "mireRat", x: 31, y: 10 }, { type: "mireRat", x: 25, y: 12 },
    { type: "bogling", x: 9, y: 25 }, { type: "bogling", x: 16, y: 24 },
    { type: "bogling", x: 12, y: 28 },
    { type: "ashenWarden", x: 31, y: 31 },
];

export function parseMap(rows) {
    return { width: rows[0].length, height: rows.length, tiles: rows.map((r) => r.split("")) };
}

export function isBlocked(map, x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
    return "WTRC".includes(map.tiles[y][x]);
}

export function tileSprite(ch, x, y) {
    if (ch === "G") return (x * 7 + y * 13) % 5 === 0 ? "grass2" : "grass";
    return { P: "path", W: "water", T: "tree", R: "rock", C: "stone" }[ch];
}
