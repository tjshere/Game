# Stonewake: admin accounts and :: commands — design

Date: 2026-07-17

## Goal

Give TJ's account (and only accounts flagged in the database) an in-game command
line: press Enter, type old-school `::` commands. v1 commands: `::maxstats` and
`::heal`. Groundwork for future moderation and multiplayer chat.

## Admin flag

- `profiles` gains `is_admin boolean not null default false`.
- There is no update policy on `profiles`, so the flag can only be set from the
  Supabase dashboard (SQL editor / table editor). The game client cannot grant
  admin to anyone, by construction.
- Applied to the live DB with:
  `alter table public.profiles add column is_admin boolean not null default false;`
  and flipped for one account with:
  `update public.profiles set is_admin = true where username_lower = '<name>';`
- `db/schema.sql` is updated to include the column for any future from-scratch setup.

## Honest security boundary

The game is a static client, so a technical player can always cheat their own
single-player save via devtools; the admin flag does not (and cannot) prevent
that. What it does guarantee: the command UI only activates for flagged
accounts, and when a server exists later (multiplayer), the same flag is
server-readable truth for real enforcement.

## Components

- **`js/account.js`** — new `fetchProfile()`: GET
  `/rest/v1/profiles?select=username,is_admin&user_id=eq.<session.userId>`,
  returns the row or null. (Requires the session; profiles are already
  world-readable so no policy changes.)
- **`js/commands.js`** — pure, unit-tested command engine:
  `runCommand(state, text) -> { ok, message }`. Parses `::name args`;
  unknown → `{ ok: false, message: "Unknown command." }`.
  - `::maxstats` — sets all five stats' xp to `xpForLevel(99)`, refills `hp`
    to the new max. Message: "All stats set to 99."
  - `::heal` — `hp = maxHp(player)`. Message: "Healed."
- **Command input UI** — markup in `index.html` (`#command-bar` with an input,
  hidden by default, styled like the game's existing panels, positioned over
  the bottom of the canvas). Wiring in `js/login.js` after `enterGame`:
  only when the logged-in profile has `is_admin`, listen for Enter →
  show + focus the bar; Esc or blur → hide; Enter in the bar → `runCommand`,
  show the result as a toast, clear and hide. Non-admins: no listener, no
  visible trace.
- **`js/ui.js`** — no changes; toasts reuse the exported `toast()`.

## Data flow

Login → `fetchProfile()` alongside the save fetch → profile stored in
`login.js` module state → `enterGame` wires the command bar if
`profile.is_admin`. Commands mutate `game.state.player` directly; a successful
command additionally triggers an immediate cloud push (closing the tab right
after a command must not lose its effect), and the normal autosave cycle
covers everything else. A failed
profile fetch is treated as not-admin (fail closed); the game still starts.

## Error handling

- Unknown command / bad input → toast "Unknown command." (no crash, input kept open).
- Profile fetch failure → admin UI simply absent; normal play unaffected.
- Command bar keystrokes must not leak into game controls (stopPropagation;
  the idle tracker still counts them as activity).

## Testing

- `tests/commands.test.js` — `::maxstats` sets all stats to 99 and refills hp;
  `::heal` refills hp without touching stats; unknown commands and non-`::`
  text rejected; parsing tolerates extra whitespace and case
  (`::MaxStats` works).
- `account.js` `fetchProfile` covered in `tests/account.test.js` with the
  existing fake-fetch harness (found row, empty result, network failure → null).
- Manual: full pass in the browser as admin and as a non-admin account.

## Setup (after implementation)

1. TJ signs up in the game normally (his account is just a player account).
2. TJ runs the `alter table` + `update` SQL in the Supabase SQL editor
   (exact statements above, with his username).
3. Log in → press Enter → `::maxstats`.

## Out of scope

`::give` (planned next), teleport, ban/kick tools, any chat visible to other
players, admin UI beyond the command bar.
