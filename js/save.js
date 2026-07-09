export const SAVE_KEY = "game-save-v1";
const VERSION = 1;

export function serialize(state) {
    return JSON.stringify({ v: VERSION, state });
}

export function deserialize(str) {
    if (!str) return null;
    try {
        const parsed = JSON.parse(str);
        if (parsed.v !== VERSION || !parsed.state) return null;
        return parsed.state;
    } catch {
        return null;
    }
}

export function save(state, storage) {
    storage.setItem(SAVE_KEY, serialize(state));
}

export function load(storage) {
    return deserialize(storage.getItem(SAVE_KEY));
}
