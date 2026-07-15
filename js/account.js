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
