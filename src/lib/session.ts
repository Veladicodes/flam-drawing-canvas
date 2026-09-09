import { newClientId } from "./ids.ts";

/** One id per tab/session, generated once on load. */
export const CLIENT_ID = newClientId();
