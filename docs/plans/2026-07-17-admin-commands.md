# Admin Accounts & Commands Implementation Plan

> Execute task-by-task; steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Database-flagged admin accounts get an in-game RS-style command line (Enter → `::maxstats`, `::heal`); everyone else sees nothing.

**Architecture:** `profiles.is_admin` (settable only via the Supabase dashboard — no update policy exists on profiles) → fetched at login via a new `fetchProfile()` → gates a command-bar overlay wired in `login.js`. Commands live in a pure, unit-tested `js/commands.js` that mutates player state; persistence rides the existing autosave/cloud-push cycle.

**Tech Stack:** Vanilla JS ES modules, `node --test`, Supabase REST (existing `account.js` request helper). No new dependencies.

Spec: `docs/specs/2026-07-17-admin-commands-design.md`

## Global Constraints

- Plain descriptive commit messages; no attribution trailers, no tooling mentions in any committed file.
- **All git commands are run by TJ.** Steps present the exact commands for him (with the `!` prefix for running in-chat); never execute them for him without an explicit one-time grant.
- Zero dependencies, no build step. House style: 4-space indent, double quotes, injected I/O.
- Rules from the spec, exact values: commands are `::maxstats` (all five stats to level 99 XP, HP refilled) and `::heal` (HP refilled); unknown input → "Unknown command."; profile fetch failure → treated as not-admin (fail closed); command-bar keystrokes must not leak to game handlers but must still count as idle-tracker activity.
- Local serving for manual checks: `python3 -m http.server` from the repo root.

---

### Task 1: Command engine

**Files:**
- Create: `js/commands.js`
- Test: `tests/commands.test.js`

**Interfaces:**
- Consumes: `xpForLevel`, `MAX_LEVEL` from `js/xp.js`; `maxHp` from `js/entities.js`.
- Produces: `runCommand(state, text) -> { ok: boolean, message: string }`. Accepts the game state object (mutates `state.player`) and the raw typed string.

- [ ] **Step 1: Write the failing tests**

Create `tests/commands.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCommand } from "../js/commands.js";
import { createPlayer, statLevel, maxHp } from "../js/entities.js";

const freshState = () => ({ player: createPlayer() });

test("::maxstats sets every stat to 99 and refills hp", () => {
    const state = freshState();
    const r = runCommand(state, "::maxstats");
    assert.equal(r.ok, true);
    assert.match(r.message, /99/);
    for (const stat of ["melee", "ranged", "magic", "defence", "hitpoints"]) {
        assert.equal(statLevel(state.player, stat), 99, stat);
    }
    assert.equal(state.player.hp, maxHp(state.player));
});

test("::heal refills hp and touches nothing else", () => {
    const state = freshState();
    state.player.hp = 1;
    const before = JSON.stringify(state.player.stats);
    const r = runCommand(state, "::heal");
    assert.equal(r.ok, true);
    assert.equal(state.player.hp, maxHp(state.player));
    assert.equal(JSON.stringify(state.player.stats), before);
});

test("parsing is case-insensitive and whitespace-tolerant", () => {
    const state = freshState();
    state.player.hp = 1;
    assert.equal(runCommand(state, "  ::HeAl  ").ok, true);
    assert.equal(state.player.hp, maxHp(state.player));
});

test("unknown or malformed input is rejected without changes", () => {
    const state = freshState();
    const snapshot = JSON.stringify(state.player);
    for (const text of ["::nope", "maxstats", "hello there", "::", ""]) {
        const r = runCommand(state, text);
        assert.equal(r.ok, false, text);
        assert.equal(r.message, "Unknown command.");
    }
    assert.equal(JSON.stringify(state.player), snapshot);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `js/commands.js`.

- [ ] **Step 3: Implement**

Create `js/commands.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: TJ commits**

```
! git add js/commands.js tests/commands.test.js
! git commit -m "Add admin command engine"
```

---

### Task 2: fetchProfile on the account client

**Files:**
- Modify: `js/account.js` (add one method to the returned object, after `logOut`)
- Test: `tests/account.test.js` (append tests)

**Interfaces:**
- Consumes: the existing private `request()` helper and `session` in `js/account.js`.
- Produces: `account.fetchProfile() -> Promise<{ username, is_admin } | null>` — the logged-in user's profile row, or null on no-row/any failure (fail closed).

- [ ] **Step 1: Write the failing tests**

Append to `tests/account.test.js`:

```js
test("fetchProfile returns the logged-in user's row", async () => {
    const log = [];
    const row = { match: "/rest/v1/profiles", reply: () => reply(200, [{ username: "Zezima", is_admin: true }]) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, row], log) });
    await account.logIn("Zezima", "longenough");
    assert.deepEqual(await account.fetchProfile(), { username: "Zezima", is_admin: true });
    const call = log.find((c) => c.url.includes("/rest/v1/profiles"));
    assert.ok(call.url.includes("user_id=eq.u1"));
    assert.equal(call.opts.headers.Authorization, "Bearer tok-1");
});

test("fetchProfile fails closed: empty result or network error give null", async () => {
    const empty = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, { match: "/rest/v1/profiles", reply: () => reply(200, []) }]) });
    await empty.logIn("Zezima", "longenough");
    assert.equal(await empty.fetchProfile(), null);

    const dead = createAccount({ url: URL, anonKey: "anon", fetchFn: async (u) => { if (u.includes("token")) return reply(200, { access_token: "tok-1", user: { id: "u1" } }); throw new TypeError("offline"); } });
    await dead.logIn("Zezima", "longenough");
    assert.equal(await dead.fetchProfile(), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `account.fetchProfile is not a function`.

- [ ] **Step 3: Implement**

In `js/account.js`, add after the `logOut()` method:

```js
        // The logged-in user's profile row, or null on any failure (fail closed:
        // callers treat null as not-admin).
        async fetchProfile() {
            try {
                const r = await request(`/rest/v1/profiles?select=username,is_admin&user_id=eq.${session.userId}`);
                return r.ok && Array.isArray(r.json) && r.json.length ? r.json[0] : null;
            } catch {
                return null;
            }
        },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: TJ commits**

```
! git add js/account.js tests/account.test.js
! git commit -m "Fetch the player's profile after login"
```

---

### Task 3: Schema column + command bar UI

**Files:**
- Modify: `db/schema.sql` (profiles table + a migration note)
- Modify: `index.html` (command bar markup)
- Modify: `styles.css` (command bar styles, appended before the context-menu block)
- Modify: `js/login.js` (fetch profile at login, wire the bar for admins, idle listeners to capture phase)

**Interfaces:**
- Consumes: `runCommand` (Task 1), `account.fetchProfile` (Task 2), `toast` from `js/ui.js`, existing `enterGame(state)` internals in `js/login.js`.
- Produces: the finished feature; `enterGame(state, profile)` becomes the internal signature.

- [ ] **Step 1: Add the column to `db/schema.sql`**

In the `create table public.profiles` block, add one line after `username_lower text not null unique,`:

```sql
    is_admin boolean not null default false,
```

And append at the end of the file:

```sql
-- Migration for databases created before is_admin existed:
--   alter table public.profiles add column is_admin boolean not null default false;
-- Grant admin to one account (dashboard SQL editor only; no client path exists):
--   update public.profiles set is_admin = true where username_lower = '<name>';
```

- [ ] **Step 2: Add the command bar to `index.html`**

Immediately after the `<div id="toasts"></div>` line:

```html
<div id="command-bar" hidden><input id="command-input" placeholder="::command" spellcheck="false" autocomplete="off"></div>
```

- [ ] **Step 3: Style it — append to `styles.css` just above the `/* Login screen */` block**

```css
/* Admin command bar */
#command-bar { position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
    width: 420px; max-width: 90vw; background: #1a1510; border: 2px solid #d8b25a;
    padding: 6px; z-index: 150; }
#command-bar[hidden] { display: none; }
#command-bar input { width: 100%; padding: 6px 8px; background: #141a14; color: #d8b25a;
    border: none; outline: none; font-family: inherit; font-size: 14px; }
```

- [ ] **Step 4: Wire it in `js/login.js`**

Add to the imports:

```js
import { runCommand } from "./commands.js";
import { toast } from "./ui.js";
```

Change `enterGame(state)` to `enterGame(state, profile)` and add at the end of the function body:

```js
    if (profile?.is_admin) initCommandBar();
```

Change the idle listener registration inside `enterGame` to capture phase (third argument `true`), so typing in the command bar still counts as activity:

```js
    for (const ev of ["pointerdown", "keydown", "wheel"]) {
        document.addEventListener(ev, () => idle.touch(Date.now()), true);
    }
```

Add the function (below `enterGame`):

```js
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
            toast(runCommand(game.state, input.value).message);
            input.value = "";
            bar.hidden = true;
        }
    });
    input.addEventListener("blur", () => { input.value = ""; bar.hidden = true; });
}
```

Update both `enterGame(...)` call sites in `submit()` to pass the profile, fetched right after auth succeeds:

```js
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
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (UI wiring has no unit tests; covered next task).

- [ ] **Step 6: Manual smoke check (non-admin path)**

Serve locally, log in with any non-admin account: pressing Enter in-game must do nothing, and no `#command-bar` should ever become visible. Browser console must stay clean.

- [ ] **Step 7: TJ commits**

```
! git add db/schema.sql index.html styles.css js/login.js
! git commit -m "Add admin-only command bar"
```

---

### Task 4: Verification, live migration, ship

**Files:**
- No code changes expected; fixes loop back into the task that owns the file.

- [ ] **Step 1: Headless verification**

Full suite (`npm test`, expect all pass) plus a browser pass with the existing Playwright setup (see `.claude/skills/verify/SKILL.md`, local-only file): as a non-admin account, Enter does nothing; flag the test account admin (Step 2's SQL against it), re-login, Enter opens the bar, `::heal` toasts "Healed.", `::maxstats` sets the HUD stats to 99, `::nope` toasts "Unknown command.", Esc closes, and the maxed stats survive a logout/login round trip (cloud save).

- [ ] **Step 2: TJ runs the live migration (Supabase SQL editor)**

```sql
alter table public.profiles add column is_admin boolean not null default false;
```

- [ ] **Step 3: TJ pushes**

```
! git push origin main
```

- [ ] **Step 4: TJ claims his account and crowns it**

1. On the live site: New User → pick the username (first signup ever — anything is free).
2. In the Supabase SQL editor, with the chosen name lowercased:

```sql
update public.profiles set is_admin = true where username_lower = '<his name, lowercase>';
```

3. Log back in on the live site → Enter → `::maxstats`.

- [ ] **Step 5: Confirm on the live site**

Stats read 99 in the HUD; a second (non-admin) account still gets nothing from Enter.
