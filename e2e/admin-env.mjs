// Test-only admin settings for the browser and fresh-install tests. Not real secrets: the test admin
// runs locally with its own throwaway database.
// Not the usual 4173, so a demo already running from another checkout is never tested by mistake.
export const DEMO_PORT = 4174;
export const ADMIN_PORT = 8788;
export const DEMO_URL = `http://127.0.0.1:${DEMO_PORT}`;
export const ADMIN_URL = `http://127.0.0.1:${ADMIN_PORT}`;
export const ADMIN_PASSWORD = 'e2e-test-password-not-a-secret';
export const SESSION_SECRET = 'e2e-test-session-secret-0123456789abcdef';
