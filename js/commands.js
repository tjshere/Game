import { xpForLevel, MAX_LEVEL } from "./xp.js";
import { maxHp } from "./entities.js";

const COMMANDS = {
    maxstats(state) {
        for (const stat of Object.keys(state.player.stats)) {
            state.player.stats[stat].xp = xpForLevel(MAX_LEVEL);
        }
        state.player.hp = maxHp(state.player);
        return `All stats set to ${MAX_LEVEL}.`;
    },
    heal(state) {
        state.player.hp = maxHp(state.player);
        return "Healed.";
    },
};

export function runCommand(state, text) {
    const m = /^::\s*(\S+)/.exec(text.trim());
    const cmd = m && COMMANDS[m[1].toLowerCase()];
    if (!cmd) return { ok: false, message: "Unknown command." };
    return { ok: true, message: cmd(state) };
}
