/**
 * Process-local Lamport clock for this tab.
 *
 * - `tick()` before creating a local event (stroke).
 * - `observe(n)` on receiving a remote event, to stay causally ahead.
 *
 * Combined with `clientId` as a tiebreak, sorting strokes by `(lamport,
 * clientId)` gives every peer an identical, deterministic z-order.
 */
let clock = 0;

export const tick = (): number => (clock += 1);

export const observe = (received: number): void => {
  if (Number.isFinite(received)) clock = Math.max(clock, received) + 1;
};

export const current = (): number => clock;
