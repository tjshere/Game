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
    // anonymous calls must not carry an Authorization header (publishable keys reject it)
    assert.equal(signup.opts.headers.Authorization, undefined);
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

    const dead = createAccount({ url: URL, anonKey: "anon", fetchFn: async (u) => { if (u.includes("token")) return TOKEN_OK.reply(); throw new TypeError("offline"); } });
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
