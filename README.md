# Flam · Real-Time Collaborative Drawing Canvas

Multiplayer freehand drawing. Open a room, share the URL, and everyone draws on
the same canvas in real time. New joiners get the full history replayed; strokes
survive server restarts.

**Live demo:** _add Vercel URL here after deploy_
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

### Message protocol

| Direction | Message | Purpose |
|-----------|---------|---------|
| S → C | `init { strokes, self }` | full history + assigned connection id on join |
| C → S | `stroke:add { stroke }` | publish a completed local stroke |
| S → C | `stroke:add { stroke }` | a peer's completed stroke |

A `Stroke` is `{ id, clientId, tool, color, size, points[], createdAt }` with
points in CSS-pixel canvas space.

---

## Design decisions & tradeoffs

- **Broadcast completed strokes, not live points (Tier 1).** One stroke = one
  atomic message: simple, and robust to packet loss. The cost is that peers see a
  stroke appear only on `pointerup`. Live ~30ms point streaming is the first
  Tier 2 item.
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
| **2** | live cursors (throttled) · presence · toolbar (color/size/eraser) · synced undo/redo | planned |
| **3** | shapes · PNG export · pan/zoom infinite canvas · vector-clock stroke ordering · reconnect/resync | planned |

### What I'd do with more time

- Live point streaming with a per-`clientId` partial-stroke buffer.
- Move storage from a single `strokes` blob to per-stroke keys so undo/redo and
  large histories don't rewrite the whole array; debounce writes.
- Offscreen-canvas render cache; only repaint the dirty region.
- Merge (not replace) on `init` to keep pre-connection strokes.
- Interpolation/smoothing (Catmull-Rom or `perfect-freehand`) for nicer lines.
- Presence-aware conflict handling documented as the R&D angle.
