import "server-only";

/**
 * Public surface of the auth module. Authorization rule: always check the
 * session on the server (`requireUser()` / `getCurrentUser()`) in server
 * components, server actions and route handlers. Nothing the client holds
 * decides access.
 */
export { handlers, auth, signIn, signOut } from "./nextauth";
export { getCurrentUser, requireUser } from "./user";
export type { PublicUser, PublicSession } from "./session";
