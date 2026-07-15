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
