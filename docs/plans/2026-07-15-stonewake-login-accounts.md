# Stonewake Login & Accounts Implementation Plan

> Execute task-by-task; steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the game to Stonewake and gate it behind an old-school login screen with Supabase-backed accounts: globally unique usernames (≤12 chars), passwords ≥8 chars, cloud saves, 366 s idle logout.

**Architecture:** The client stays a zero-dependency static site (GitHub Pages). A hand-rolled `account.js` talks straight to Supabase's auth/REST HTTP endpoints with an injected `fetch`; Postgres tables `profiles` (unique username registry) and `saves` (one jsonb save per account) sit behind row-level security. `main.js` is refactored so the game boots via `startGame(state, callbacks)` called by the login flow.

**Tech Stack:** Vanilla JS ES modules, `node --test`, Supabase (auth + PostgREST), no build step, no npm dependencies.

Spec: `docs/specs/2026-07-15-stonewake-login-accounts-design.md`

## Global Constraints

- **Plain descriptive commit messages.** No attribution trailers, no "generated with" lines, no tooling mentions in any committed file. This is a hard project rule.
- **Do NOT `git push` until Task 8 is fully verified.** GitHub Pages deploys `main` automatically; intermediate pushes would break the live game. Commit locally after every task; push once, at the end of Task 8.
- Zero dependencies, no build step. Vanilla ES modules only.
- House style: 4-space indent, double quotes, dependency injection for I/O (see `js/save.js` taking `storage`), tests in `tests/*.test.js` using `node:test` + `assert/strict`.
- Run tests with `npm test` (Node 20+).
- Manual serving for checks: `python3 -m http.server` from the repo root, open `http://localhost:8000`.
- Rules (exact values): username 1–12 chars, charset `A-Za-z0-9_` and space, no leading/trailing space, case-insensitively unique. Password ≥8 chars. Idle logout after 366 000 ms (6 min 6 s). Synthetic email domain: `stonewake.invalid` (spaces in usernames become hyphens — hyphen is outside the username charset, so no collisions).

---

### Task 1: Rename the game to Stonewake

**Files:**
- Modify: `index.html:6` (the `<title>`)
- Modify: `README.md:1-4`

**Interfaces:**
- Consumes: nothing
- Produces: nothing code-visible; copy only

- [ ] **Step 1: Update the page title**

In `index.html`, change:

```html
<title>Game (working title)</title>
```

to:

```html
<title>Stonewake</title>
```

- [ ] **Step 2: Update the README heading and intro**

In `README.md`, change the first two paragraphs from:

```markdown
# Game (working title)

A single-player browser game with old-school MMO bones. Plain HTML/CSS/JS,
Canvas 2D, zero dependencies. Open `index.html` via any static server.
```

to:

```markdown
# Stonewake

A single-player browser game with old-school MMO bones. Plain HTML/CSS/JS,
Canvas 2D, zero dependencies. Open `index.html` via any static server.
```

- [ ] **Step 3: Run tests (nothing should break)**

Run: `npm test`
Expected: all existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add index.html README.md
git commit -m "Rename the game to Stonewake"
```

---

### Task 2: Username/password validation rules

**Files:**
- Create: `js/auth-rules.js`
- Test: `tests/auth-rules.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `validateUsername(name) -> string|null` (message or null when valid), `validatePassword(password) -> string|null`, `usernameToEmail(username) -> string`, constants `USERNAME_MAX = 12`, `PASSWORD_MIN = 8`, `EMAIL_DOMAIN = "stonewake.invalid"`.

- [ ] **Step 1: Write the failing tests**

Create `tests/auth-rules.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUsername, validatePassword, usernameToEmail, USERNAME_MAX, PASSWORD_MIN } from "../js/auth-rules.js";

test("valid usernames pass", () => {
    for (const name of ["Zezima", "a", "old man 99", "TJ_the_1st", "twelve chars"]) {
        assert.equal(validateUsername(name), null, name);
    }
});

test("invalid usernames are rejected with a message", () => {
    assert.match(validateUsername(""), /enter a username/i);
    assert.match(validateUsername("thirteen chars"), /12 characters/);
    assert.match(validateUsername(" padded "), /start or end/i);
    assert.match(validateUsername("bad-hyphen"), /letters, numbers/i);
    assert.match(validateUsername("no.dots!"), /letters, numbers/i);
});

test("rule constants match the spec", () => {
    assert.equal(USERNAME_MAX, 12);
    assert.equal(PASSWORD_MIN, 8);
});

test("password must be at least 8 characters", () => {
    assert.equal(validatePassword("12345678"), null);
    assert.match(validatePassword("1234567"), /at least 8/);
    assert.match(validatePassword(""), /at least 8/);
});

test("usernames map to unique synthetic emails", () => {
    assert.equal(usernameToEmail("Zezima"), "zezima@stonewake.invalid");
    assert.equal(usernameToEmail("old man 99"), "old-man-99@stonewake.invalid");
    // space -> hyphen must not collide with underscore
    assert.notEqual(usernameToEmail("a_b"), usernameToEmail("a b"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `js/auth-rules.js`.

- [ ] **Step 3: Implement**

Create `js/auth-rules.js`:

```js
export const USERNAME_MAX = 12;
export const PASSWORD_MIN = 8;
export const EMAIL_DOMAIN = "stonewake.invalid";

export function validateUsername(name) {
    if (typeof name !== "string" || name.length === 0) return "Enter a username.";
    if (name.length > USERNAME_MAX) return `Username must be ${USERNAME_MAX} characters or fewer.`;
    if (name !== name.trim()) return "Username cannot start or end with a space.";
    if (!/^[A-Za-z0-9_ ]+$/.test(name)) return "Letters, numbers, spaces and underscores only.";
    return null;
}

export function validatePassword(password) {
    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
        return `Password must be at least ${PASSWORD_MIN} characters.`;
    }
    return null;
}

// Supabase auth is email-keyed; usernames become synthetic addresses the player
// never sees. Spaces become hyphens (outside the username charset, so injective).
export function usernameToEmail(username) {
    return `${username.toLowerCase().replaceAll(" ", "-")}@${EMAIL_DOMAIN}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add js/auth-rules.js tests/auth-rules.test.js
git commit -m "Add username and password validation rules"
```

---

### Task 3: Idle logout tracker

**Files:**
- Create: `js/idle.js`
- Test: `tests/idle.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `createIdleTracker(timeoutMs, onIdle) -> { touch(now), tick(now) }` (pure, caller supplies timestamps), constant `IDLE_LOGOUT_MS = 366_000`.

- [ ] **Step 1: Write the failing tests**

Create `tests/idle.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createIdleTracker, IDLE_LOGOUT_MS } from "../js/idle.js";

test("IDLE_LOGOUT_MS is 6 minutes 6 seconds", () => {
    assert.equal(IDLE_LOGOUT_MS, 366000);
});

test("fires once when the timeout elapses", () => {
    let calls = 0;
    const t = createIdleTracker(1000, () => calls++);
    t.touch(0);
    t.tick(999);
    assert.equal(calls, 0);
    t.tick(1000);
    assert.equal(calls, 1);
    t.tick(5000); // must not fire again without a touch
    assert.equal(calls, 1);
});

test("touch resets the countdown and re-arms after firing", () => {
    let calls = 0;
    const t = createIdleTracker(1000, () => calls++);
    t.touch(0);
    t.touch(900);
    t.tick(1500);
    assert.equal(calls, 0); // 600 ms since last touch
    t.tick(1900);
    assert.equal(calls, 1);
    t.touch(2000);
    t.tick(3000);
    assert.equal(calls, 2); // re-armed by touch
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `js/idle.js`.

- [ ] **Step 3: Implement**

Create `js/idle.js`:

```js
export const IDLE_LOGOUT_MS = 366_000; // 6 minutes 6 seconds

export function createIdleTracker(timeoutMs, onIdle) {
    let last = 0;
    let fired = false;
    return {
        touch(now) { last = now; fired = false; },
        tick(now) {
            if (!fired && now - last >= timeoutMs) {
                fired = true;
                onIdle();
            }
        },
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/idle.js tests/idle.test.js
git commit -m "Add idle logout tracker"
```

---

### Task 4: Supabase account client

**Files:**
- Create: `js/config.js`
- Create: `js/account.js`
- Test: `tests/account.test.js`

**Interfaces:**
- Consumes: `usernameToEmail` from `js/auth-rules.js` (Task 2).
- Produces: `createAccount({ url, anonKey, fetchFn }) -> account`, `class AccountError extends Error`. The account object: `session` getter (`{ accessToken, userId, username } | null`), `signUp(username, password)`, `logIn(username, password)` (both resolve to the session or throw `AccountError`), `logOut()`, `fetchSave() -> object|null` (the stored `{ v, state }` save object), `pushSave(saveObj) -> boolean` (best-effort, never throws), `deleteSave()`. `js/config.js` exports `SUPABASE_URL`, `SUPABASE_ANON_KEY` (placeholders until Task 8).

- [ ] **Step 1: Create the config placeholder**

Create `js/config.js`:

```js
// Supabase project settings. Both values are public by design — the anon key
// ships to every browser; row-level security is the actual boundary.
// Placeholders until the project exists (see db/schema.sql header for setup).
export const SUPABASE_URL = "https://PROJECT_REF.supabase.co";
export const SUPABASE_ANON_KEY = "PASTE_ANON_KEY";
```

- [ ] **Step 2: Write the failing tests**

Create `tests/account.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccount, AccountError } from "../js/account.js";

const URL = "https://x.supabase.co";
const reply = (status, body) => ({ ok: status < 300, status, json: async () => body });

// Routes: [{ match, method?, reply: (url, opts) => response }]
function fakeFetch(routes, log = []) {
    return async (url, opts = {}) => {
        log.push({ url, opts });
        for (const r of routes) {
            if (url.includes(r.match) && (r.method ?? "GET") === (opts.method ?? "GET")) {
                return r.reply(url, opts);
            }
        }
        throw new Error(`unrouted request: ${opts.method ?? "GET"} ${url}`);
    };
}

const AVAILABLE = { match: "/rest/v1/profiles", reply: () => reply(200, []) };
const SIGNUP_OK = { match: "/auth/v1/signup", method: "POST", reply: () => reply(200, { id: "u1" }) };
const TOKEN_OK = {
    match: "/auth/v1/token", method: "POST",
    reply: () => reply(200, { access_token: "tok-1", user: { id: "u1" } }),
};

test("signUp synthesizes the email, sends the username as metadata, and logs in", async () => {
    const log = [];
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([AVAILABLE, SIGNUP_OK, TOKEN_OK], log) });
    const session = await account.signUp("Old Man 99", "longenough");
    assert.equal(session.accessToken, "tok-1");
    assert.equal(session.userId, "u1");
    assert.equal(session.username, "Old Man 99");
    const signup = log.find((c) => c.url.includes("/auth/v1/signup"));
    const body = JSON.parse(signup.opts.body);
    assert.equal(body.email, "old-man-99@stonewake.invalid");
    assert.equal(body.data.username, "Old Man 99");
    assert.equal(signup.opts.headers.apikey, "anon");
});

test("signUp rejects a taken username via the availability check", async () => {
    const taken = { match: "/rest/v1/profiles", reply: () => reply(200, [{ user_id: "someone" }]) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([taken]) });
    await assert.rejects(() => account.signUp("Zezima", "longenough"),
        (e) => e instanceof AccountError && /taken/.test(e.message));
});

test("signUp maps a signup race (500 from the profile trigger) to 'taken'", async () => {
    const conflict = { match: "/auth/v1/signup", method: "POST", reply: () => reply(500, { msg: "Database error saving new user" }) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([AVAILABLE, conflict]) });
    await assert.rejects(() => account.signUp("Zezima", "longenough"),
        (e) => e instanceof AccountError && /taken/.test(e.message));
});

test("logIn stores the session; bad credentials get a friendly message", async () => {
    const bad = { match: "/auth/v1/token", method: "POST", reply: () => reply(400, { error_description: "Invalid login credentials" }) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([bad]) });
    await assert.rejects(() => account.logIn("Zezima", "wrongpassword"),
        (e) => e instanceof AccountError && /invalid username or password/i.test(e.message));
    assert.equal(account.session, null);
});

test("network failure becomes a connection message", async () => {
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: async () => { throw new TypeError("fetch failed"); } });
    await assert.rejects(() => account.logIn("Zezima", "longenough"),
        (e) => e instanceof AccountError && /unable to connect/i.test(e.message));
});

test("fetchSave returns the stored object, or null when the account has none", async () => {
    const row = { match: "/rest/v1/saves", reply: () => reply(200, [{ data: { v: 1, state: { tick: 7 } } }]) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, row]) });
    await account.logIn("Zezima", "longenough");
    assert.deepEqual(await account.fetchSave(), { v: 1, state: { tick: 7 } });

    const empty = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, { match: "/rest/v1/saves", reply: () => reply(200, []) }]) });
    await empty.logIn("Zezima", "longenough");
    assert.equal(await empty.fetchSave(), null);
});

test("pushSave upserts with the session token and reports success", async () => {
    const log = [];
    const upsert = { match: "/rest/v1/saves", method: "POST", reply: () => reply(201, null) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, upsert], log) });
    await account.logIn("Zezima", "longenough");
    assert.equal(await account.pushSave({ v: 1, state: { tick: 9 } }), true);
    const push = log.find((c) => c.url.includes("/rest/v1/saves"));
    assert.equal(push.opts.headers.Prefer, "resolution=merge-duplicates");
    assert.equal(push.opts.headers.Authorization, "Bearer tok-1");
    assert.deepEqual(JSON.parse(push.opts.body), [{ user_id: "u1", data: { v: 1, state: { tick: 9 } } }]);
});

test("pushSave never throws — failures return false", async () => {
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, { match: "/rest/v1/saves", method: "POST", reply: () => reply(503, null) }]) });
    await account.logIn("Zezima", "longenough");
    assert.equal(await account.pushSave({ v: 1, state: {} }), false);

    const dead = createAccount({ url: URL, anonKey: "anon", fetchFn: async (u, o) => { if (u.includes("token")) return TOKEN_OK.reply(); throw new TypeError("offline"); } });
    await dead.logIn("Zezima", "longenough");
    assert.equal(await dead.pushSave({ v: 1, state: {} }), false);
});

test("logOut clears the session even if the server call fails", async () => {
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, { match: "/auth/v1/logout", method: "POST", reply: () => { throw new TypeError("offline"); } }]) });
    await account.logIn("Zezima", "longenough");
    await account.logOut();
    assert.equal(account.session, null);
});

test("deleteSave targets the logged-in user's row", async () => {
    const log = [];
    const del = { match: "/rest/v1/saves", method: "DELETE", reply: () => reply(204, null) };
    const account = createAccount({ url: URL, anonKey: "anon", fetchFn: fakeFetch([TOKEN_OK, del], log) });
    await account.logIn("Zezima", "longenough");
    await account.deleteSave();
    const call = log.find((c) => (c.opts.method ?? "GET") === "DELETE");
    assert.ok(call.url.includes("user_id=eq.u1"));
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `js/account.js`.

- [ ] **Step 4: Implement**

Create `js/account.js`:

```js
import { usernameToEmail } from "./auth-rules.js";

export class AccountError extends Error {}

const CONNECT_MSG = "Unable to connect — try again.";

export function createAccount({ url, anonKey, fetchFn }) {
    let session = null;

    async function request(path, { method = "GET", body, headers = {}, useSession = true } = {}) {
        let res;
        try {
            res = await fetchFn(url + path, {
                method,
                headers: {
                    apikey: anonKey,
                    Authorization: `Bearer ${useSession && session ? session.accessToken : anonKey}`,
                    "Content-Type": "application/json",
                    ...headers,
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch {
            throw new AccountError(CONNECT_MSG);
        }
        let json = null;
        try { json = await res.json(); } catch { /* empty body */ }
        return { ok: res.ok, status: res.status, json };
    }

    async function usernameTaken(username) {
        const q = encodeURIComponent(username.toLowerCase());
        const r = await request(`/rest/v1/profiles?select=user_id&username_lower=eq.${q}`, { useSession: false });
        return r.ok && Array.isArray(r.json) && r.json.length > 0;
    }

    return {
        get session() { return session; },

        async signUp(username, password) {
            if (await usernameTaken(username)) throw new AccountError("That username is taken.");
            const r = await request("/auth/v1/signup", {
                method: "POST",
                useSession: false,
                body: { email: usernameToEmail(username), password, data: { username } },
            });
            if (!r.ok) {
                const msg = r.json?.msg ?? r.json?.message ?? "";
                // A losing signup race surfaces as a DB error from the profile
                // trigger's unique constraint, or as an already-registered email.
                if (r.status === 500 || /already|exists|registered/i.test(msg)) {
                    throw new AccountError("That username is taken.");
                }
                throw new AccountError("Could not create the account — try again.");
            }
            return this.logIn(username, password);
        },

        async logIn(username, password) {
            const r = await request("/auth/v1/token?grant_type=password", {
                method: "POST",
                useSession: false,
                body: { email: usernameToEmail(username), password },
            });
            if (!r.ok || !r.json?.access_token) {
                if (r.status === 400 || r.status === 401) throw new AccountError("Invalid username or password.");
                throw new AccountError(CONNECT_MSG);
            }
            session = { accessToken: r.json.access_token, userId: r.json.user.id, username };
            return session;
        },

        async logOut() {
            if (!session) return;
            try { await request("/auth/v1/logout", { method: "POST" }); } catch { /* best effort */ }
            session = null;
        },

        // Resolves to the stored { v, state } object, or null if none exists.
        async fetchSave() {
            const r = await request("/rest/v1/saves?select=data");
            if (!r.ok) throw new AccountError(CONNECT_MSG);
            return r.json.length ? r.json[0].data : null;
        },

        // Best effort: true on success, false on any failure. Never throws.
        async pushSave(saveObj) {
            try {
                const r = await request("/rest/v1/saves", {
                    method: "POST",
                    headers: { Prefer: "resolution=merge-duplicates" },
                    body: [{ user_id: session.userId, data: saveObj }],
                });
                return r.ok;
            } catch {
                return false;
            }
        },

        async deleteSave() {
            await request(`/rest/v1/saves?user_id=eq.${session.userId}`, { method: "DELETE" });
        },
    };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/account.js tests/account.test.js
git commit -m "Add account client for signup, login and cloud saves"
```

---

### Task 5: Database schema

**Files:**
- Create: `db/schema.sql`

**Interfaces:**
- Consumes: username charset/length rules from Task 2 (mirrored as a check constraint).
- Produces: tables `public.profiles` (`user_id`, `username`, `username_lower` unique) and `public.saves` (`user_id`, `data` jsonb, `updated_at`), signup trigger, RLS policies. `account.js` (Task 4) relies on: `profiles` selectable by anon with `username_lower=eq.` filters; `saves` select/insert/update/delete restricted to the owner.

- [ ] **Step 1: Write the schema**

Create `db/schema.sql`:

```sql
-- Stonewake database schema.
-- One-time setup: paste this whole file into the Supabase SQL editor and run it.
-- Also required in the dashboard (Authentication -> Sign In / Providers -> Email):
--   * disable "Confirm email" (accounts use synthetic addresses)
--   * set minimum password length to 8

-- The global username registry. Uniqueness of username_lower is what makes
-- duplicate names impossible; a signup race loses with a constraint error.
create table public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    username text not null
        check (username ~ '^[A-Za-z0-9_ ]{1,12}$' and username = btrim(username)),
    username_lower text not null unique,
    created_at timestamptz not null default now()
);

-- One save per account. data holds the game's versioned { v, state } JSON.
create table public.saves (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null,
    updated_at timestamptz not null default now()
);

-- Signup sends the display username in metadata; this trigger materializes the
-- profile row, so clients never write profiles directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (user_id, username, username_lower)
    values (new.id, new.raw_user_meta_data ->> 'username', lower(new.raw_user_meta_data ->> 'username'));
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger saves_touch_updated_at
    before update on public.saves
    for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- Usernames are public (login-screen availability checks read them while
-- logged out); rows are only ever created by the signup trigger.
create policy "profiles are readable by everyone" on public.profiles
    for select using (true);

create policy "players read their own save" on public.saves
    for select using (auth.uid() = user_id);
create policy "players create their own save" on public.saves
    for insert with check (auth.uid() = user_id);
create policy "players update their own save" on public.saves
    for update using (auth.uid() = user_id);
create policy "players delete their own save" on public.saves
    for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Sanity-check against the client**

No automated test (nothing local runs Postgres). Read `js/account.js` and confirm each endpoint it calls has a matching table/policy: availability check (anon select on profiles), `fetchSave` (owner select), `pushSave` (owner insert + update via upsert), `deleteSave` (owner delete). Confirm the check constraint matches `validateUsername` in `js/auth-rules.js` (1–12, `[A-Za-z0-9_ ]`, trimmed).

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "Add database schema for profiles and saves"
```

---

### Task 6: Boot the game through startGame

**Files:**
- Modify: `js/main.js` (whole file — full listing below)
- Create: `js/boot.js` (temporary shim, deleted in Task 7)
- Modify: `index.html:24` (script tag)

**Interfaces:**
- Consumes: everything `main.js` already imports (unchanged).
- Produces: `startGame(initialState, { onCloudPush, onReset } = {}) -> game`, `freshState() -> state`, `rehydrate(saved) -> state` (null-safe: rebuilds monsters, defaults missing fields, falls back to `freshState()`), `TICK_MS`. Importing `main.js` no longer boots the game or touches the DOM. `onCloudPush(state)` is called every 50 ticks (30 s). `onReset()` replaces the reset-save behavior when provided.

- [ ] **Step 1: Rewrite `js/main.js`**

Replace the entire file with:

```js
import { MAP_TEXT, parseMap, PLAYER_SPAWN, CLASS_STONE, MONSTER_SPAWNS, isBlocked } from "./world.js";
import { findPath, findPathAdjacent } from "./pathfinding.js";
import { createPlayer, createMonster, maxHp, FOODS, WEAPONS, INVENTORY_SIZE } from "./entities.js";
import { createRenderer } from "./render.js";
import { save, SAVE_KEY } from "./save.js";
import { attachCombat } from "./engage.js";
import { initUi } from "./ui.js";
import { initContextMenu } from "./context-menu.js";

export const TICK_MS = 600;
const CLOUD_PUSH_TICKS = 50; // 30 s at 600 ms per tick

export function freshState() {
    const player = createPlayer();
    player.x = PLAYER_SPAWN.x; player.y = PLAYER_SPAWN.y;
    return {
        player,
        monsters: MONSTER_SPAWNS.map((s) => createMonster(s.type, s.x, s.y)),
        lootState: { killCounts: {}, dropTargets: {} },
        bossDefeated: false,
        groundItems: [],
        tick: 0,
    };
}

export function rehydrate(saved) {
    if (!saved) return freshState();
    if (!saved.groundItems) saved.groundItems = [];
    // monsters are not saved; rebuild them fresh
    return { ...saved, monsters: MONSTER_SPAWNS.map((s) => createMonster(s.type, s.x, s.y)) };
}

function pickupItems(state) {
    const p = state.player;
    const atPlayer = state.groundItems.filter(g => g.x === p.x && g.y === p.y);
    for (const g of atPlayer) {
        if (g.item === "coins") p.coins += g.qty;
        else if (FOODS[g.item]) {
            if (p.inventory.length < INVENTORY_SIZE) p.inventory.push({ item: g.item });
        } else if (WEAPONS[g.item]) {
            p.ownedWeapons[WEAPONS[g.item].klass].push(g.item);
        }
    }
    state.groundItems = state.groundItems.filter(g => !(g.x === p.x && g.y === p.y));
}

export function startGame(initialState, { onCloudPush, onReset } = {}) {
    const map = parseMap(MAP_TEXT);
    const game = {
        state: initialState,
        effects: { hitsplats: [], xpDrops: [] },
        path: [],            // pending movement steps
        targetMonster: null, // monster instance the player is engaging
        pendingStone: false, // walk-then-open class modal
        attackCooldown: 0,
        hooks: { onTick: [], onClickMonster: null, onReachStone: null },
    };

    const uiCallbacks = initUi(game, {
        onReset: onReset ?? (() => { localStorage.removeItem(SAVE_KEY); location.reload(); }),
    });
    attachCombat(game, map, uiCallbacks);

    const canvas = document.getElementById("canvas");
    const renderer = createRenderer(canvas, map);
    game._map = map;
    game._pathfinding = { findPath, findPathAdjacent };

    canvas.addEventListener("click", (e) => {
        const t = renderer.screenToTile(game.state, e.clientX, e.clientY);
        const monster = game.state.monsters.find((m) => m.respawnIn <= 0 && m.x === t.x && m.y === t.y);
        game.targetMonster = null;
        game.pendingStone = false;
        if (monster && game.hooks.onClickMonster) {
            game.hooks.onClickMonster(monster);
        } else if (t.x === CLASS_STONE.x && t.y === CLASS_STONE.y) {
            game.path = findPathAdjacent(map, game.state.player, t) || [];
            game.pendingStone = true;
        } else {
            const groundItem = game.state.groundItems.find(g => g.x === t.x && g.y === t.y);
            if (groundItem || !isBlocked(map, t.x, t.y)) {
                game.path = findPath(map, game.state.player, t) || [];
            }
        }
    });

    initContextMenu(canvas, renderer, game);

    function tick() {
        const s = game.state;
        s.tick++;
        if (game.path.length) {
            const step = game.path.shift();
            s.player.x = step.x; s.player.y = step.y;
            if (!game.path.length && game.pendingStone && game.hooks.onReachStone) {
                game.pendingStone = false;
                game.hooks.onReachStone();
            }
        }
        pickupItems(s);
        s.groundItems = s.groundItems.filter(g => s.tick - g.tick < 200);
        for (const fn of game.hooks.onTick) fn(); // combat/AI, UI refresh
        // passive regen out of combat
        if (s.tick % 10 === 0 && !game.targetMonster && s.player.hp < maxHp(s.player)) s.player.hp++;
        // effect timers
        for (const list of [game.effects.hitsplats, game.effects.xpDrops]) {
            for (const e of list) e.ttl--;
            list.splice(0, list.length, ...list.filter((e) => e.ttl > 0));
        }
        if (s.tick % 10 === 0) save(s, localStorage);
        if (s.tick % CLOUD_PUSH_TICKS === 0 && onCloudPush) onCloudPush(s);
    }

    let last = performance.now(), acc = 0;
    function frame(now) {
        acc += now - last; last = now;
        while (acc >= TICK_MS) { acc -= TICK_MS; tick(); }
        renderer.draw(game.state, game.effects);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.__state = game.state;
    return game;
}
```

- [ ] **Step 2: Create the temporary boot shim**

Create `js/boot.js`:

```js
// Temporary boot: preserves pre-account behavior until the login screen lands.
import { startGame, rehydrate } from "./main.js";
import { load } from "./save.js";

startGame(rehydrate(load(localStorage)));
```

- [ ] **Step 3: Point `index.html` at the shim**

Change:

```html
<script type="module" src="js/main.js"></script>
```

to:

```html
<script type="module" src="js/boot.js"></script>
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (no test imports `main.js`).

- [ ] **Step 5: Manual check — the game still works**

Run: `python3 -m http.server` and open `http://localhost:8000`.
Expected: game boots exactly as before — existing save loads, movement, combat, inventory, class panel, reset-save all work. Check the browser console for errors.

- [ ] **Step 6: Commit**

```bash
git add js/main.js js/boot.js index.html
git commit -m "Boot the game through an explicit startGame entry point"
```

---

### Task 7: Login screen

**Files:**
- Modify: `index.html` (login overlay markup, logout button, script tag)
- Modify: `styles.css` (login screen + logout styles, appended)
- Create: `js/login.js`
- Delete: `js/boot.js`

**Interfaces:**
- Consumes: `createAccount`/`AccountError` (Task 4), `validateUsername`/`validatePassword` (Task 2), `createIdleTracker`/`IDLE_LOGOUT_MS` (Task 3), `startGame`/`rehydrate` (Task 6), `serialize`/`deserialize`/`load`/`SAVE_KEY` from `js/save.js`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` (Task 4).
- Produces: the page entry point. No exports.

- [ ] **Step 1: Add the login overlay and logout button to `index.html`**

Immediately after `<body>`, add:

```html
<div id="login-screen">
    <div id="login-logo">STONEWAKE</div>
    <div id="login-box">
        <div id="login-tabs">
            <button id="tab-existing" type="button" class="active">Existing User</button>
            <button id="tab-new" type="button">New User</button>
        </div>
        <form id="login-form">
            <label>Username
                <input id="login-username" maxlength="12" autocomplete="username" spellcheck="false">
            </label>
            <label>Password
                <input id="login-password" type="password" autocomplete="current-password">
            </label>
            <label id="login-confirm-row" hidden>Confirm password
                <input id="login-confirm" type="password" autocomplete="new-password">
            </label>
            <div id="login-status" role="status"></div>
            <button id="login-submit" type="submit">Log in</button>
        </form>
    </div>
</div>
```

After the `<button id="reset-save" ...>` line inside the HUD, add:

```html
<button id="logout" type="button">Log out</button>
```

Change the script tag from `js/boot.js` to:

```html
<script type="module" src="js/login.js"></script>
```

- [ ] **Step 2: Delete the shim**

```bash
git rm js/boot.js
```

- [ ] **Step 3: Append login styles to `styles.css`**

```css
/* Login screen */
#login-screen { position: fixed; inset: 0; z-index: 200; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 28px;
    background: radial-gradient(ellipse at 50% 30%, #232b1c 0%, #141a14 65%, #0c0f0c 100%); }
#login-screen[hidden] { display: none; }
#login-logo { font-size: 56px; font-weight: bold; letter-spacing: 10px; color: #d8b25a;
    text-shadow: 0 3px 0 #3a3325, 0 0 24px rgba(216, 178, 90, .35); }
#login-box { width: 320px; background: #241f14; border: 3px solid #3a3325; padding: 16px; }
#login-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
#login-tabs button { flex: 1; padding: 6px 4px; background: #141a14; color: #e8e4d8;
    border: 2px solid #3a3325; cursor: pointer; font-family: inherit; }
#login-tabs button.active { border-color: #d8b25a; color: #d8b25a; }
#login-form { display: flex; flex-direction: column; gap: 10px; }
#login-form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
#login-form input { padding: 6px 8px; background: #141a14; color: #e8e4d8;
    border: 2px solid #3a3325; font-family: inherit; }
#login-form input:focus { outline: none; border-color: #d8b25a; }
#login-status { min-height: 18px; font-size: 13px; color: #d86a5a; }
#login-submit { padding: 8px; background: #2a2418; color: #d8b25a; border: 2px solid #d8b25a;
    cursor: pointer; font-family: inherit; font-weight: bold; }
#logout { background: #241f14; color: #e8e4d8; border: 2px solid #3a3325; padding: 6px;
    cursor: pointer; font-family: inherit; }
```

- [ ] **Step 4: Create `js/login.js`**

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createAccount, AccountError } from "./account.js";
import { validateUsername, validatePassword } from "./auth-rules.js";
import { createIdleTracker, IDLE_LOGOUT_MS } from "./idle.js";
import { startGame, rehydrate } from "./main.js";
import { serialize, deserialize, load, SAVE_KEY } from "./save.js";

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

function enterGame(state) {
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
        document.addEventListener(ev, () => idle.touch(Date.now()));
    }
    setInterval(() => idle.tick(Date.now()), 1000);
    window.addEventListener("pagehide", () => { pushCurrentSave(); });
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
            // Adopt pre-account progress in this browser, once ever.
            const preAccount = localStorage.getItem(ADOPTED_KEY) ? null : load(localStorage);
            localStorage.setItem(ADOPTED_KEY, "1");
            const state = rehydrate(preAccount);
            await account.pushSave(toSaveObj(state));
            enterGame(state);
        } else {
            await account.logIn(username, password);
            const saved = await account.fetchSave();
            localStorage.setItem(ADOPTED_KEY, "1");
            enterGame(rehydrate(saved ? deserialize(JSON.stringify(saved)) : null));
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
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual check (no backend yet)**

Run: `python3 -m http.server`, open `http://localhost:8000`. Expected:
- Login screen covers the page: STONEWAKE logo, tabs, form. No console errors.
- Tab toggle: "New User" reveals the confirm field and relabels the button "Create account".
- Validation messages appear inline: empty username; 13-char username (typing is capped at 12 by `maxlength`, so paste one); `bad-hyphen`; on New User, a 7-char password and mismatched confirm.
- Submitting valid input shows "Unable to connect — try again." (placeholder config) and re-enables the button.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css js/login.js
git commit -m "Add login screen with account-backed cloud saves"
```

---

### Task 8: Supabase project, config, end-to-end verification, deploy

**Files:**
- Modify: `js/config.js` (real URL + anon key)
- Modify: `docs/specs/2026-07-15-stonewake-login-accounts-design.md` only if reality diverges

**Interfaces:**
- Consumes: everything. This task makes it real.

- [ ] **Step 1: TJ creates the Supabase project (requires the user)**

One-time setup checklist:
1. Sign up / log in at https://supabase.com (GitHub login works).
2. New project → name `stonewake` → nearest region → generate a database password (Supabase keeps it; the game never uses it).
3. Authentication → Sign In / Providers → Email: turn OFF "Confirm email"; set minimum password length to 8.
4. SQL Editor → paste the full contents of `db/schema.sql` → Run (expect "Success").
5. Project Settings → API: copy the Project URL and the `anon` `public` key into `js/config.js`.

- [ ] **Step 2: Fill in `js/config.js`**

Replace the placeholder values with the real project URL and anon key. These are public-safe; committing them is correct.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: End-to-end manual verification (against the real backend)**

Serve locally (`python3 -m http.server`) and verify, in order:
1. New User: password `1234567` → inline "Password must be at least 8 characters."
2. New User: valid signup (e.g. `TJ` / 8+ chars) → lands in the game; pre-account localStorage progress is present (import worked).
3. In Supabase Table Editor: `profiles` has the row; `saves` has one row whose `data.state` matches.
4. Second browser (or private window): New User with the same name (any casing) → "That username is taken."
5. Second browser: Existing User with the account → progress from step 2 appears (cloud save round-trip).
6. Wrong password → "Invalid username or password."
7. Log out button → login screen returns; log back in → progress intact.
8. Idle: leave the game untouched 6 min 6 s → back at login with "You have been logged out due to inactivity."; log in → progress intact (saved before logout).
9. Reset save (confirm modal) → back at login; log in → fresh character at spawn; `saves` row gone until the next autosave pushes a fresh one.
10. Refresh mid-game → login screen (no persisted session).

- [ ] **Step 5: Commit and push (first push of the whole branch)**

```bash
git add js/config.js
git commit -m "Connect the game to its account backend"
git push origin main
```

- [ ] **Step 6: Verify the live site**

Wait ~1 minute for Pages, then repeat verification steps 2, 5 and 6 at https://tjshere.github.io/Game/ (signup name must differ from step 2's). Confirm the page title shows "Stonewake".

---

## Plan self-review notes

- Spec coverage: rename (T1), validation rules (T2), idle logout (T3), account client + error copy (T4), schema/trigger/RLS (T5), `startGame` refactor + 50-tick cloud push (T6), login screen/import/logout/pagehide/reset (T7), setup + E2E + deploy (T8). Out-of-scope items from the spec remain out.
- The localStorage import is guarded by an adopted-flag so a friend signing up on an already-used browser doesn't inherit the owner's progress; first-login also sets the flag. This implements the spec's "pre-account save" wording precisely.
- Type consistency spot-checks: `createAccount({ url, anonKey, fetchFn })` matches T7 usage; `rehydrate`/`startGame`/`freshState` exported in T6, consumed in T7; `IDLE_LOGOUT_MS`/`createIdleTracker` (T3) consumed in T7; `AccountError` (T4) consumed in T7.
