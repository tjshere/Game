export const PALETTE = {
    ".": null,
    "g": "#3f6b35", "G": "#487a3c", "d": "#35592d",
    "p": "#8a7a55", "P": "#9c8b62",
    "w": "#27506e", "W": "#356e94",
    "t": "#2c4a26", "T": "#1f3a1c", "b": "#5c4327",
    "r": "#6e6a60", "R": "#8a857a", "k": "#4a463e",
    "s": "#b8a76a", "S": "#d8b25a",
    "f": "#caa06a", "F": "#e0b57e",
    "m": "#7a4a2a", "c": "#caa832", "C": "#e8cc55",
    "x": "#3a3325", "h": "#8a2f2a", "H": "#b8443c",
    "u": "#5a8ab0", "U": "#7fb0d8",
    "o": "#f39c2b", "e": "#e8e4d8", "n": "#222222",
    "v": "#6b4b8a", "V": "#8a68b0",
};

export const SPRITES = {
    grass:  ["gggggggg","ggGggggg","gggggggg","gggggGgg","gGgggggg","gggggggg","ggggGggg","gggggggg"],
    grass2: ["gggggggg","gggggdgg","gGgggggg","gggggggg","ggdggggg","gggggGgg","gggggggg","gdgggggg"],
    path:   ["pppppppp","ppPppppp","pppppppp","ppppppPp","pPpppppp","pppppppp","pppPpppp","pppppppp"],
    water:  ["wwwwwwww","wwWwwwww","wwwwwwww","wwwwwWww","wWwwwwww","wwwwwwww","wwwWwwww","wwwwwwww"],
    tree:   ["..tTTt..","tTTTTTt.","TTtTTTTt","tTTTTTTt",".tTTTTt.","..tTTt..","...bb...","...bb..."],
    rock:   ["........",".rrRRr..","rRRRRRr.","rRRkRRRr","rRkkkRRr",".rRRRRr.","..rrrr..","........"],
    stone:  ["...SS...","..sSSs..",".sSCCSs.",".sSCCSs.","..sSSs..","..sSSs..",".ssSSss.","xxxxxxxx"],
    playerMelee:  ["..FFF...","..FnF...","..sss...",".sSSSs.e",".sSSs..e","..ss...e","..x.x..e","..x.x..."],
    playerRanged: ["..FFF...","..FnF...","..ttt...",".tsTst.b",".tsTt..b","..tt...b","..x.x..b","..x.x..."],
    playerMagic:  ["..FFF...","..FnF...","..vvv...",".vVVVv.s",".vVVv..s","..vv...C","..x.x..s","..x.x..."],
    mireRat:      ["........","........",".mm.....","mmmm..m.","mmmmmmm.",".mnmmm..","..m..m..","........"],
    bogling:      ["..tt....",".tGGt...",".GnGn...",".GGGG...","tGGGGt..",".GGGG...",".t..t...","........"],
    ashenWarden:  [".kRRRk..","kRhhhRk.","RhHnHhR.","RhhhhhR.","kRhhhRk.",".kRRRk..",".k.k.k..",".k.k.k.."],
    iconSword: ["......e.",".....ee.","....ee..","...ee...","..ee....",".xe.....","xx......","x......."],
    iconBow:   ["..bb....",".b..b...","b....b..","b....be.","b....b..",".b..b...","..bb....","........"],
    iconStaff: [".....CC.",".....CC.","....s...","...s....","..s.....",".s......","s.......","........"],
    iconCoins: ["........","..cCc...",".cCCCc..","..cCc...","...cCc..","..cCCCc.","...cCc..","........"],
    iconPerch: ["........","..ffF...",".fFFFf..","fFFFFff.",".fFFFf..","..ffF...","........","........"],
    iconLoaf:  ["........","........",".mffm...","mfFFfm..","mfFFfm..",".mmmm...","........","........"],
};

export function spriteSize(name) {
    const rows = SPRITES[name];
    return { w: rows[0].length, h: rows.length };
}

export function drawSprite(ctx, name, x, y, scale) {
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
