# Stonewake: login screen and player accounts — design

Date: 2026-07-15

## Goal

Rename the game to **Stonewake** and put an old-school-MMO login screen in front of it.
Playing requires an account: username + password, globally unique usernames, save data
tied to the account so a player can log in from any device and continue. This is also
the first step toward a future fully-online version, so account infrastructure must not
be a dead end.

## Decisions (settled with TJ)

- **Username only** — no email at signup. A forgotten password means the account is
  unrecoverable; accepted trade-off for zero-friction, old-school signup.
- **Import old saves** — first signup from a browser holding a pre-account localStorage
  save imports that progress into the new account.
- **Login every visit** — sessions are not persisted across page loads.
- **Idle logout** — 6 minutes 6 seconds (366 s) without input logs the player out
  (progress saved first) with the message "You have been logged out due to inactivity."
- **Title** — the game is now called Stonewake everywhere (page title, login logo, README).

## Architecture

The client stays a static site on GitHub Pages (vanilla JS ES modules, no build step).
A Supabase project (name: `stonewake`, free tier) provides:

- **Auth** — signup/login, password hashing, session tokens, rate limiting. Supabase
  auth is email-keyed internally, so accounts register with the synthetic address
  `<username-lowercase>@stonewake.invalid`. Players only ever see a username field.
  Email confirmation is disabled in project settings; minimum password length is set
  to 8 there as well.
- **Postgres** — two tables (schema in `db/schema.sql`, applied once via the Supabase
  SQL editor):
  - `profiles(user_id uuid pk → auth.users, username text, username_lower text unique)`
    — the global username registry. The case-insensitive unique index is what makes
    duplicates impossible; a signup race loses cleanly with a constraint error.
    A check constraint enforces the length/charset rules server-side too.
    A trigger on `auth.users` inserts the profile row from signup metadata, so the
    client never writes profiles directly.
  - `saves(user_id uuid pk → auth.users, data jsonb, updated_at timestamptz)` — one
    save per account, holding the existing versioned save JSON unchanged.
- **Row-level security** on both tables: a logged-in user can select/upsert only their
  own rows; `profiles` is additionally readable-by-all for availability checks (it
  contains nothing but usernames). The anon API key shipped in the page is public by
  design; RLS is the security boundary.

No Supabase client library: the game talks to Supabase's auth and REST endpoints
directly with `fetch` (five calls total — signup, login, logout, fetch save, push
save — plus a username-availability check and save delete). This keeps the repo's
zero-dependency, no-build-step character and makes the account module fully
unit-testable with an injected fetch, matching how `save.js` takes an injected
storage. `js/config.js` exports `SUPABASE_URL` and `SUPABASE_ANON_KEY` (placeholder
values until the project exists; both are public-safe).

Future-online note: any later game server can verify Supabase-issued JWTs, and
Supabase Realtime channels attach to these same accounts, so nothing here is throwaway.

## Validation rules

Enforced in the UI for immediate feedback and by the backend as the real gate:

- Username: 1–12 characters; letters, digits, spaces, underscores; no leading/trailing
  space. Uniqueness is case-insensitive ("Zezima" blocks "zezima").
- Password: at least 8 characters.

Client-side rules live in a pure module (`js/auth-rules.js`) so they are unit-testable.

## Components

- **`index.html`** — gains `#login-screen`, a full-viewport overlay: STONEWAKE logo,
  "Existing User" / "New User" toggle, username + password inputs (password ×2 on the
  New User form), submit button, inline status line for errors. Game UI stays in the
  DOM underneath, inert until login. Title becomes "Stonewake". HUD gains a Logout
  button next to Reset save.
- **`js/auth-rules.js`** — pure validation: `validateUsername`, `validatePassword`,
  `usernameToEmail` (lowercase + synthetic domain). Unit-tested.
- **`js/account.js`** — account operations with `fetch` injected
  (mirrors how `save.js` takes `storage`): `signUp`, `logIn`, `logOut`,
  `fetchSave`, `pushSave`, `deleteSave`. Translates raw Supabase errors into player-facing
  messages ("That username is taken.", "Invalid username or password.",
  "Unable to connect — try again."). Unit-tested against a fake client.
- **`js/idle.js`** — pure idle tracker: `createIdleTracker(timeoutMs, onIdle)` with
  `touch()` and `tick(now)`; wiring to real DOM events (pointerdown, keydown, wheel)
  happens in login/boot code. Unit-tested with fake time.
- **`js/login.js`** — DOM wiring for the login screen: form handling, calls
  `account.js`, on success resolves the initial game state (cloud save → import →
  fresh, see Data flow) and calls `startGame`.
- **`js/main.js`** — refactored: everything after state creation moves into an
  exported `startGame(initialState, callbacks)`; module import no longer boots the
  game. Autosave keeps writing localStorage every 10 ticks; additionally every 50
  ticks (30 s) the state is pushed to Supabase. Logout/idle-logout/pagehide also push.
- **`js/save.js`** — unchanged format. Cloud rows store the same
  `{ v, state }` JSON produced by `serialize`.

## Data flow

- **Signup**: validate locally → `signUp` (username in metadata → trigger creates
  profile; unique index rejects duplicates) → if this browser has a pre-account
  localStorage save, it becomes the account's first cloud save (import) → otherwise
  fresh state → `startGame`.
- **Login**: validate shape → `logIn` → `fetchSave` → deserialize (falls back to
  fresh state if absent/corrupt) → `startGame`.
- **During play**: localStorage autosave every 10 ticks (unchanged); cloud push every
  50 ticks; failed pushes are silent and retried on the next interval (localStorage
  always has the latest state as backup).
- **Logout / idle logout / pagehide**: push save, sign out, show login screen
  (idle path adds the inactivity message). Session tokens are held in memory only,
  so a page refresh always lands on the login screen.
- **Reset save**: with accounts, "Reset save" wipes the cloud row and localStorage
  copy for the logged-in account (with the existing confirm step) and restarts fresh.

Save-slot semantics: the account's cloud row is canonical; localStorage is a
same-device cache/backup. Last write wins — fine for a single-player game.

## Error handling

- Username taken / invalid / password too short: inline message under the form.
- Wrong credentials: "Invalid username or password." (no hint which).
- Network/Supabase outage at login: "Unable to connect — try again."
- Cloud push failure mid-play: ignored (retry next interval); localStorage keeps state.
- Corrupt/missing cloud save at login: fresh character (same behavior as today's
  localStorage corruption path).

## Testing

`node --test`, pure logic with injected fakes (existing house style):

- `auth-rules.test.js` — username/password validation edge cases, email synthesis.
- `account.test.js` — signup/login/save flows and error translation against a fake
  Supabase client (including duplicate-username and network-failure paths).
- `idle.test.js` — timeout fires at 366 s, `touch()` resets it, no double-fire.
- Existing suites keep passing; `save.test.js` untouched (format unchanged).

Manual verification: full signup → play → idle-logout → login-from-second-browser
pass against the real Supabase project before deploy.

## Setup (one-time, requires TJ)

1. TJ creates a free Supabase account and a project named `stonewake`.
2. Dashboard settings: disable email confirmation; set minimum password length to 8.
3. Run `db/schema.sql` in the SQL editor (tables, trigger, RLS policies).
4. Project URL + anon key go into `js/config.js`; push to main deploys via Pages.

## Out of scope

Password recovery, changing username/password, multiple characters per account,
account deletion UI, any multiplayer/realtime features.
