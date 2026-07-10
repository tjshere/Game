export const PALETTE = {
    ".": null,
    // Greens (terrain)
    "g": "#3f6b35", "G": "#487a3c", "d": "#35592d", "D": "#2d4d26",
    // Path / dirt
    "p": "#8a7a55", "P": "#9c8b62", "q": "#7a6a48",
    // Water
    "w": "#27506e", "W": "#356e94", "y": "#1e4460", "Y": "#4080aa",
    // Tree
    "t": "#2c4a26", "T": "#1f3a1c", "b": "#5c4327", "B": "#4a3520",
    // Rock
    "r": "#6e6a60", "R": "#8a857a", "k": "#4a463e", "K": "#5c584f",
    // Stone (class stone)
    "s": "#b8a76a", "S": "#d8b25a",
    // Skin
    "f": "#caa06a", "F": "#e0b57e", "A": "#b8905a",
    // Brown / leather
    "m": "#7a4a2a", "M": "#624020",
    // Gold / coins
    "c": "#caa832", "C": "#e8cc55",
    // Dark / shadow
    "x": "#3a3325", "X": "#2a2418",
    // Red / combat
    "h": "#8a2f2a", "H": "#b8443c", "j": "#6e2420",
    // Blue / water accent
    "u": "#5a8ab0", "U": "#7fb0d8",
    // Orange
    "o": "#f39c2b", "O": "#e08020",
    // White / highlight
    "e": "#e8e4d8", "E": "#d0ccc0",
    // Black / eyes
    "n": "#222222", "N": "#111111",
    // Purple / magic
    "v": "#6b4b8a", "V": "#8a68b0", "Z": "#553a72",
    // Pale green (bogling highlight)
    "L": "#5aaa4a",
    // Light blue (ice / magic particles)
    "I": "#a0d4e8",
};

export const SPRITES = {
    // ── TERRAIN 16×16 ──────────────────────────────────────────
    grass: [
        "ggggggGggggggggg",
        "gggGggggggggdggg",
        "ggggggggGggggggg",
        "gggggdggggggggGg",
        "ggGggggggggggggg",
        "ggggggggdggggggg",
        "gggggGggggggGggg",
        "gggggggggggggggg",
        "gdggggggggGggggg",
        "ggggggGggggggggg",
        "gggggggggggdgggg",
        "ggGggggggggggggg",
        "ggggggggGgggggGg",
        "gggdgggggggggggg",
        "ggggggggggGggggg",
        "ggggGgggggggggdg",
    ],
    grass2: [
        "ggdggggggggggggg",
        "gggggGggggdggggg",
        "ggggggggggggggDg",
        "gGggggdggggggggg",
        "ggggggggggGggggg",
        "gggdgggggggggDgg",
        "ggggggGggggggggg",
        "gggggggggdgggggg",
        "ggGgggggggggdggg",
        "gggggdgggggggggg",
        "ggggggggGgdggggg",
        "gDgggggggggggggg",
        "ggggdgggggGggggg",
        "gggggggDgggggggg",
        "ggGggggggggdgggg",
        "gggggggggggggGgg",
    ],
    path: [
        "ppPppppqpppppppp",
        "pppppppppppPpppp",
        "ppppqppppppppppp",
        "pPpppppppqppppPp",
        "ppppppPppppppppp",
        "pppppppppppPpppp",
        "ppqppppppppppppp",
        "ppppPppppppqpppp",
        "ppppppppPppppppp",
        "pppqppppppppPppp",
        "pppppppppppppppp",
        "pPppppppqppppppp",
        "ppppppPppppppppp",
        "pppppppppPpqpppp",
        "ppppqppppppppPpp",
        "pppppppppppppppp",
    ],
    water: [
        "wwwwywwwwwwwwwww",
        "wwwwwwwWwwwwywww",
        "wwWwwwwwwwwwwwww",
        "wwwwwwwwywwwwwww",
        "wwwywwwwwwWwwwww",
        "wwwwwwWwwwwwwyww",
        "wWwwwwwwwwwwwwww",
        "wwwwwywwwWwwwwww",
        "wwwwwwwwwwwwYwww",
        "wwYwwwwwwwwwwwww",
        "wwwwwwywwWwwwwww",
        "wwwwwwwwwwwwwwww",
        "wwwWwwwwwwywwwww",
        "wwwwwwwwwwwwwWww",
        "wywwwwWwwwwwwwww",
        "wwwwwwwwwywwwwww",
    ],
    tree: [
        "......tTTt......",
        "....tTTTTTt.....",
        "...TTtTTTTTt....",
        "..tTTTTTTTTTt...",
        ".tTTtTTTTTTTTt..",
        ".TTTTTTtTTTTTt..",
        "tTTTTTTTTTtTTt..",
        ".tTTTTTTTTTTt...",
        "..tTTtTTTTTt....",
        "...tTTTTTTt.....",
        "....tTTTt.......",
        ".....tTt........",
        "......bb........",
        "......bb........",
        "......bb........",
        "......bb........",
    ],
    rock: [
        "................",
        "....rRRRRr......",
        "..rRRRRRRRRr....",
        ".rRRKRRRRRRRr...",
        "rRRkkkRRRRRRRr..",
        "rRkkkkRRRKRRRr..",
        "rRRkkkRRRRRRRr..",
        ".rRRKRRRRRRRr...",
        ".rRRRRRkkkRRr...",
        "rRRRRRkkkkRRRr..",
        "rRRKRRRkkkRRRr..",
        ".rRRRRRRKRRRr...",
        "..rRRRRRRRRr....",
        "...rRRRRRr......",
        "....rrrr........",
        "................",
    ],
    stone: [
        "......SSSS......",
        ".....SCCCS......",
        "....sSCCCSs.....",
        "....sSCCCSs.....",
        "....sSSSSSs.....",
        "....sSSSSSs.....",
        "...ssSSSSSSs....",
        "...ssSSSSSss....",
        "...ssSSSSSss....",
        "...ssSSSSSSs....",
        "..sssSSSSSSss...",
        "..sssSSSSSsss...",
        "..sssSSSSSsss...",
        "..ssssSSSssss...",
        ".xxxxxSSSxxxxx..",
        "xxxxxxxxxxxxxxxx",
    ],

    // ── PLAYER CHARACTERS 16×16 ────────────────────────────────
    playerMelee: [
        "................",
        ".....FFFF.......",
        "....FFFFFF......",
        "....FnFFnF......",
        "....AFFFFF......",
        ".....AFFA.......",
        "....sssss.......",
        "...sSSSSSs......",
        "...sSSSSsse.....",
        "...sSSSSSse.....",
        "...sSSSSSse.....",
        "....sSSss..e....",
        "....ssss...e....",
        "....xx.xx..e....",
        "....xx.xx.......",
        "....xx.xx.......",
    ],
    playerRanged: [
        "................",
        ".....FFFF.......",
        "....FFFFFF......",
        "....FnFFnF......",
        "....AFFFFF......",
        ".....AFFA.......",
        "....ttttt.......",
        "...tGsTGst......",
        "...tsGTGstb.....",
        "...tGsTGst.b....",
        "...tsGTGst.b....",
        "....tGGts..b....",
        "....tttt...b....",
        "....xx.xx.......",
        "....xx.xx.......",
        "....xx.xx.......",
    ],
    playerMagic: [
        "................",
        ".....FFFF.......",
        "....FFFFFF......",
        "....FnFFnF......",
        "....AFFFFF......",
        ".....AFFA.......",
        "....vvvvv.......",
        "...vVVVVVv......",
        "...vVVVVVvs.....",
        "...vVVVVVvs.....",
        "...vVVVVVvs.....",
        "....vVVvv..C....",
        "....vvvv...s....",
        "....xx.xx..s....",
        "....xx.xx.......",
        "....xx.xx.......",
    ],

    // ── MONSTERS 16×16 ─────────────────────────────────────────
    mireRat: [
        "................",
        "................",
        "................",
        "................",
        "....mm..........",
        "...mmmm.........",
        "..mmmmmm..m.....",
        "..mmmmmmmmm.....",
        ".mmmmmmmmmm.....",
        ".mmnmmmmmm......",
        "..mmmmmmm.......",
        "..mm..mm........",
        "...m...m........",
        "................",
        "................",
        "................",
    ],
    bogling: [
        "................",
        "....tt..........",
        "...tGGt.........",
        "..tGGGGt........",
        "..GGnGGn........",
        "..tGGGGt........",
        "..GGGGGG........",
        ".tGGGGGGt.......",
        ".tGGLGGGt.......",
        "..GGGGGG........",
        "..tGGGGt........",
        "...tGGt.........",
        "...t..t.........",
        "...t..t.........",
        "................",
        "................",
    ],
    ashenWarden: [
        "................",
        "..kkRRRRkk......",
        ".kRRhhhRRk......",
        ".kRhhhhhRk......",
        "kRhHHnHHhRk.....",
        "kRhHhhhHhRk.....",
        ".kRhhhhhRk......",
        ".kkRhhhRkk......",
        "..kRRRRRk.......",
        "..kkRRRkk.......",
        "...kRRRk........",
        "...k.k.k........",
        "..k..k..k.......",
        "..k..k..k.......",
        "..k..k..k.......",
        "................",
    ],

    // ── UI ICONS 16×16 ─────────────────────────────────────────
    iconSword: [
        "................",
        "..........eee...",
        ".........eee....",
        "........eee.....",
        ".......eee......",
        "......eee.......",
        ".....eee........",
        "....eee.........",
        "...eee..........",
        "..xee...........",
        ".xxe............",
        "xxx.............",
        "xx..............",
        "x...............",
        "................",
        "................",
    ],
    iconBow: [
        "................",
        ".....bbb........",
        "...bb...bb......",
        "..b.......b.....",
        "..b.......be....",
        ".b........be....",
        ".b........be....",
        ".b........be....",
        ".b........be....",
        ".b........be....",
        "..b.......be....",
        "..b.......b.....",
        "...bb...bb......",
        ".....bbb........",
        "................",
        "................",
    ],
    iconStaff: [
        "................",
        ".........CCC....",
        ".........CCC....",
        "........sss.....",
        ".......ss.......",
        "......ss........",
        ".....ss.........",
        "....ss..........",
        "...ss...........",
        "..ss............",
        ".ss.............",
        "ss..............",
        "s...............",
        "................",
        "................",
        "................",
    ],
    iconCoins: [
        "................",
        "................",
        ".....cCc........",
        "....cCCCc.......",
        "....cCCCc.......",
        ".....cCc........",
        "......cCc.......",
        ".....cCCCc......",
        ".....cCCCc......",
        "......cCc.......",
        ".......cCc......",
        "......cCCCc.....",
        "......cCCCc.....",
        ".......cCc......",
        "................",
        "................",
    ],
    iconPerch: [
        "................",
        "................",
        "................",
        ".....ffFF.......",
        "...ffFFFFf......",
        "..fFFFFFFFf.....",
        ".fFFFFFFFFff....",
        "fFFFFFFFFFFf....",
        ".fFFFFFFFFff....",
        "..fFFFFFFFf.....",
        "...ffFFFFf......",
        ".....ffFF.......",
        "................",
        "................",
        "................",
        "................",
    ],
    iconLoaf: [
        "................",
        "................",
        "................",
        "................",
        "....mfffm.......",
        "...mfFFFFm......",
        "..mfFFFFFfm.....",
        "..mfFFFFFfm.....",
        "..mmfFFFfmm.....",
        "...mmmmmm.......",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    iconMeat: [
        "................",
        "................",
        "................",
        ".....hHh........",
        "....hHHHh.......",
        "...hHHHHHh......",
        "..hHHHHHHhh.....",
        "..hHhHHHHHh.....",
        "...hhHHHHh......",
        "....hhhHh.......",
        ".....hhh........",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
};

// Cache for pre-rendered sprites (offscreen canvases)
const spriteCache = new Map();

export function spriteSize(name) {
    const rows = SPRITES[name];
    return { w: rows[0].length, h: rows.length };
}

function getCachedSprite(name, scale) {
    const key = `${name}:${scale}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const rows = SPRITES[name];
    const w = rows[0].length * scale;
    const h = rows.length * scale;
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");
    for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < rows[ry].length; rx++) {
            const color = PALETTE[rows[ry][rx]];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(rx * scale, ry * scale, scale, scale);
        }
    }
    spriteCache.set(key, offscreen);
    return offscreen;
}

export function drawSprite(ctx, name, x, y, scale) {
    // Use cached offscreen canvas for performance
    if (typeof document !== "undefined") {
        const cached = getCachedSprite(name, scale);
        ctx.drawImage(cached, x, y);
    } else {
        // Fallback for non-browser (tests)
        const rows = SPRITES[name];
        for (let ry = 0; ry < rows.length; ry++) {
            for (let rx = 0; rx < rows[ry].length; rx++) {
                const color = PALETTE[rows[ry][rx]];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
            }
        }
    }
}
