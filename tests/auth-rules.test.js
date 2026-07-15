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
