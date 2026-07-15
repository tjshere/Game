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
