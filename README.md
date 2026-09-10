# Flam · Real-Time Collaborative Drawing Canvas

Multiplayer freehand drawing. Open a room, share the URL, and everyone draws on
the same canvas in real time — live cursors, presence, a colour/size/eraser
toolbar, shape tools, PNG export, and synced undo/redo. New joiners get the full
history replayed; strokes survive server restarts; the board reconnects and
resyncs on network drop.

**Live demo:** <https://flam-drawing-canvas.vercel.app>
**Stack:** React 19 · TypeScript · Vite 6 · Zustand · PartyKit (edge WebSockets)

---

## Quick start

```bash
npm install
cp .env.example .env        # optional for local dev; 127.0.0.1:1999 is the default
npm run dev                 # Vite on :5173  +  PartyKit on :1999
```

Open <http://localhost:5173> — you are redirected into a fresh room. Open the
same `/room/:id` URL in another tab or browser to collaborate.

Type-check everything (client + server + shared): `npm run typecheck`.

---

## Architecture

```
┌──────────────┐        WebSocket (partysocket)        ┌────────────────────┐
│  React app   │  ───────────────────────────────────► │  PartyKit server   │
│  (Vercel)    │  ◄─────────────────────────────────── │  1 instance / room │
│              │                                        │                    │
│  Canvas ──▶ Zustand store ──▶ <canvas> repaint        │  strokes: Stroke[] │
│    ▲                                                  │  room.storage      │
│    └── local draft drawn immediately (no round trip)  └────────────────────┘
└──────────────┘
```

- **`shared/protocol.ts`** is the single source of truth for every wire payload.
  Both the client (`src/`) and the server (`party/`) import it, so a change to a
  message shape is a compile error on both sides.
- **Local-first drawing.** A stroke in progress is held in a component ref and
  each new segment is painted to the canvas on `pointermove`, so the local line
  never waits for the network. On `pointerup` the finished stroke is committed to
  the store *and* sent to the server.
- **Server fan-out.** `party/main.ts` runs one durable instance per room id.
  `onMessage` validates the incoming `stroke:add`, appends it to the in-memory
  list, persists the list to `room.storage`, then `broadcast`s to every
  connection **except the sender** (who already has it).
- **History replay.** `onStart` rehydrates strokes from storage before the first
  connection; `onConnect` sends the joining client an `init` message with the
  full history, which the store applies in one `setStrokes`.
- **Rooms.** `/` redirects to `/room/<nanoid>`; each room id maps to its own
  PartyKit instance, so canvases are fully independent. Unknown paths bounce
  back to `/`.
- **Presence & cursors.** On connect the client sends `hello` with a persisted
  animal name + HSL colour; the server keeps an in-memory `peers` map (never
  persisted) and broadcasts `presence` on join/leave. Cursor positions are
  relayed at ~30ms (trailing-throttled) and dropped when a peer leaves.
- **Undo/redo.** A client can only undo/redo **its own** strokes. Undo removes
  the stroke locally and sends `stroke:remove`; the server filters history,
  persists, and fans out. Redo re-sends the original `stroke:add`.

### State stores (Zustand)

| Store | Holds | Re-renders |
|-------|-------|------------|
| `canvasStore` | `strokes`, `redoStack`, tool/colour/size | canvas repaint |
| `presenceStore` | `peers`, `self`, `cursors` | HUD + cursor overlay only |

Cursors live in their own store so 30ms updates never touch the canvas.

### Message protocol

| Direction | Message | Purpose |
|-----------|---------|---------|
| S → C | `init { strokes, self, peers }` | history + connection id + current presence |
| C → S | `hello { name, color }` | announce identity on connect |
| C ↔ S | `stroke:add { stroke }` | a completed stroke (echoed to all but sender) |
| C ↔ S | `stroke:remove { id }` | undo — delete a stroke everywhere |
| S → C | `presence { peers }` | roster changed |
| C → S | `cursor { x, y }` · S → C | `cursor { id, x, y }` | throttled live pointer |

A `Stroke` is `{ id, clientId, tool, color, size, points[], createdAt }` with
points in CSS-pixel canvas space.

---

## Stroke ordering — the R&D angle

**Problem.** Strokes are broadcast independently, so two peers can receive a pair
of near-simultaneous strokes in opposite orders. With opaque, overlapping paint
that means the two screens disagree about which stroke is *on top* — the canvas
has diverged even though both received the same data.

**Approach: Lamport timestamps with a client-id tiebreak.**

- Every tab keeps a monotonic counter (`src/lib/lamport.ts`). `tick()` before
  creating a stroke stamps it with `lamport`; `observe(remote)` on receipt sets
  `clock = max(clock, remote) + 1`, keeping this tab causally ahead of anything
  it has seen.
- The render order is a **total order** on `(lamport, clientId, id)`
  (`compareStrokes` in `shared/protocol.ts`). Lamport ordering preserves
  causality (if stroke B was drawn after the artist saw stroke A, `B.lamport >
  A.lamport`); `clientId` then `id` break ties deterministically.
- `canvasStore` keeps `strokes` sorted by that comparator on every insert, and
  the server pre-sorts the `init` history. Result: **every peer paints strokes
  in the same order, regardless of arrival order** — the canvas converges.

**Why not wall-clock time?** Unsynchronised clocks and clock skew reorder causal
events. `createdAt` is kept only as a secondary tiebreak.

**Limits / what's next.** Lamport gives a consistent *total* order but not a
minimal one — a late-arriving stroke with a low `lamport` correctly sorts under
newer strokes and the affected region repaints. A vector clock would additionally
expose *concurrency* (which strokes were truly parallel), enabling smarter merge
/ conflict UI. Full CRDT semantics (e.g. per-stroke Yjs) is the end state.

---

## Design decisions & tradeoffs

- **Broadcast completed strokes, not live points.** One stroke = one atomic
  message: simple, and robust to packet loss. The cost is that peers see a stroke
  appear only on `pointerup`. Live point streaming is a Tier 3 item.
- **Undo is own-strokes-only, and redo re-appends at the end.** Per-client undo
  avoids cross-user conflict entirely. A redone stroke goes back on top rather
  than at its original z-index — acceptable for freehand; a real fix needs
  positional or vector-clock ordering.
- **Cursor & stroke coordinates are absolute CSS pixels.** Simple and exact when
  viewports match; a smaller window sees peer content offset. Normalising to a
  shared logical space (or a pan/zoom transform) is the Tier 3 fix.
- **Presence is in-memory.** Peers vanish on server restart and are rebuilt from
  the next `hello`; only strokes are durable.
- **Shapes reuse the `Stroke` model.** A rect/ellipse/arrow is a stroke whose
  `points` are just `[start, end]` and whose `tool` picks the renderer — so
  history, undo/redo, ordering, and persistence all work unchanged. Live preview
  repaints the board each frame while dragging.
- **Full canvas repaint on history change.** `repaint()` clears and redraws every
  stroke whenever the committed list changes. Trivially correct and fine for
  hundreds of strokes; a layered/offscreen-canvas cache is the scaling path.
- **`init` replaces local history.** Fine because it arrives within a few
  hundred ms of load. Strokes drawn fully offline before the first connection
  could be lost — acceptable for Tier 1, fixed by merging on `init` later.
- **Server-side validation is shape-only.** Enough to reject malformed payloads;
  not a defense against a hostile client spamming valid strokes (rate limiting is
  a later concern).
- **`devicePixelRatio` scaling, points stored in CSS pixels.** Crisp on retina;
  coordinates are resolution-independent so they replay correctly on any client.

---

## Deployment

**1. PartyKit server (edge hosting):**

```bash
npx partykit login      # GitHub OAuth, one time
npx partykit deploy      # prints: https://flam-drawing-canvas.<username>.partykit.dev
```

**2. Vercel (frontend):** import the repo, then set an env var:

```
VITE_PARTYKIT_HOST = flam-drawing-canvas.<username>.partykit.dev
```

`vercel.json` sets the build (`npm run build` → `dist`) and rewrites all routes
to `index.html` for client-side routing. Redeploy after setting the var.

**Verify:** open the deployed URL in two separate browsers on the same
`/room/:id`; a stroke in one appears in the other, and reloading replays history.

---

## Roadmap

| Tier | Scope | Status |
|------|-------|--------|
| **1** | local-first canvas · room sync · stroke broadcast · history replay · storage · deploy | ✅ done |
| **2** | live cursors (throttled) · presence · toolbar (colour/size/eraser) · synced undo/redo | ✅ done |
| **3** | shape tools · PNG export · Lamport stroke ordering · reconnect + resync | ✅ done (pan/zoom deferred) |

### What I'd do with more time

- Pannable/zoomable infinite canvas (a viewport transform threaded through every
  coordinate path) — deferred to avoid regressing a working deployed demo.
- Live point streaming with a per-`clientId` partial-stroke buffer.
- Move storage from a single `strokes` blob to per-stroke keys so undo/redo and
  large histories don't rewrite the whole array; debounce writes.
- Offscreen-canvas render cache; only repaint the dirty region.
- Merge (not replace) on `init` to keep pre-connection strokes.
- Interpolation/smoothing (Catmull-Rom or `perfect-freehand`) for nicer lines.
- Normalise coordinates to a shared logical space so mismatched viewports agree.
- Vector-clock stroke ordering for conflict-free concurrent edits (the R&D angle).
