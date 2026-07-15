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
