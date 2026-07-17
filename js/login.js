import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createAccount, AccountError } from "./account.js";
import { validateUsername, validatePassword } from "./auth-rules.js";
import { createIdleTracker, IDLE_LOGOUT_MS } from "./idle.js";
import { startGame, rehydrate } from "./main.js";
import { serialize, deserialize, load, SAVE_KEY } from "./save.js";
import { runCommand } from "./commands.js";
import { toast } from "./ui.js";

const el = (id) => document.getElementById(id);
const LOGOUT_MESSAGE_KEY = "stonewake-logout-message";
const ADOPTED_KEY = "stonewake-save-adopted"; // set once any account owns this browser's local save

const account = createAccount({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    // keepalive lets the final save push finish while the page is unloading
    fetchFn: (url, opts) => fetch(url, { ...opts, keepalive: true }),
});

let mode = "existing";
let game = null;

function setMode(next) {
    mode = next;
    el("tab-existing").classList.toggle("active", mode === "existing");
    el("tab-new").classList.toggle("active", mode === "new");
    el("login-confirm-row").hidden = mode === "existing";
    el("login-submit").textContent = mode === "existing" ? "Log in" : "Create account";
    el("login-status").textContent = "";
}

function toSaveObj(state) { return JSON.parse(serialize(state)); }

async function pushCurrentSave() {
    if (game) await account.pushSave(toSaveObj(game.state));
}

async function logout(message) {
    await pushCurrentSave();
    await account.logOut();
    if (message) sessionStorage.setItem(LOGOUT_MESSAGE_KEY, message);
    location.reload(); // sessions are memory-only: reload lands on the login screen
}

function enterGame(state, profile) {
    game = startGame(state, {
        onCloudPush: (s) => { account.pushSave(toSaveObj(s)); },
        onReset: async () => {
            await account.deleteSave();
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        },
    });
    el("login-screen").hidden = true;
    el("logout").addEventListener("click", () => logout());

    const idle = createIdleTracker(IDLE_LOGOUT_MS, () => logout("You have been logged out due to inactivity."));
    idle.touch(Date.now());
    for (const ev of ["pointerdown", "keydown", "wheel"]) {
        document.addEventListener(ev, () => idle.touch(Date.now()), true);
    }
    setInterval(() => idle.tick(Date.now()), 1000);
    window.addEventListener("pagehide", () => { pushCurrentSave(); });

    if (profile?.is_admin) initCommandBar();
}

function initCommandBar() {
    const bar = el("command-bar");
    const input = el("command-input");
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && bar.hidden) {
            e.preventDefault();
            bar.hidden = false;
            input.focus();
        }
    });
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
            input.value = "";
            bar.hidden = true;
        } else if (e.key === "Enter") {
            const result = runCommand(game.state, input.value);
            toast(result.message);
            if (result.ok) pushCurrentSave(); // admin effects persist immediately
            input.value = "";
            bar.hidden = true;
        }
    });
    input.addEventListener("blur", () => { input.value = ""; bar.hidden = true; });
}

async function submit() {
    const username = el("login-username").value;
    const password = el("login-password").value;
    const status = el("login-status");
    const problem = validateUsername(username) ??
        (mode === "new" ? validatePassword(password) : null) ??
        (mode === "new" && password !== el("login-confirm").value ? "Passwords do not match." : null);
    if (problem) { status.textContent = problem; return; }

    el("login-submit").disabled = true;
    status.textContent = mode === "new" ? "Creating account..." : "Logging in...";
    try {
        if (mode === "new") {
            await account.signUp(username, password);
            const profile = await account.fetchProfile();
            // Adopt pre-account progress in this browser, once ever.
            const preAccount = localStorage.getItem(ADOPTED_KEY) ? null : load(localStorage);
            localStorage.setItem(ADOPTED_KEY, "1");
            const state = rehydrate(preAccount);
            await account.pushSave(toSaveObj(state));
            enterGame(state, profile);
        } else {
            await account.logIn(username, password);
            const profile = await account.fetchProfile();
            const saved = await account.fetchSave();
            localStorage.setItem(ADOPTED_KEY, "1");
            enterGame(rehydrate(saved ? deserialize(JSON.stringify(saved)) : null), profile);
        }
    } catch (err) {
        status.textContent = err instanceof AccountError ? err.message : "Something went wrong — try again.";
        el("login-submit").disabled = false;
    }
}

el("tab-existing").addEventListener("click", () => setMode("existing"));
el("tab-new").addEventListener("click", () => setMode("new"));
el("login-form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });

const pending = sessionStorage.getItem(LOGOUT_MESSAGE_KEY);
if (pending) {
    sessionStorage.removeItem(LOGOUT_MESSAGE_KEY);
    el("login-status").textContent = pending;
}
