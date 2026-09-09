import { nanoid } from "nanoid";

/** Short, URL-friendly room id used in `/room/:roomId`. */
export const newRoomId = () => nanoid(10);

/** Stable id for this browser tab, used to attribute strokes and cursors. */
export const newClientId = () => nanoid(8);

/** Unique id for a single stroke. */
export const newStrokeId = () => nanoid(12);
