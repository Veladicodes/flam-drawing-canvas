# Flam · Real-Time Collaborative Drawing Canvas

Multiplayer freehand drawing. Open a room, share the URL, draw together in real
time. Built with React + TypeScript + Vite on the front end and
[PartyKit](https://partykit.io) for realtime sync on the edge.

> **Status:** Tier 1 in progress — see [the plan](#roadmap).

## Quick start

```bash
npm install
npm run dev          # runs Vite (5173) + PartyKit (1999) together
```

Open <http://localhost:5173>; you'll be redirected into a fresh room. Open the
same `/room/:id` URL in a second tab to collaborate.

## Roadmap

- **Tier 1** — local-first canvas, PartyKit room sync, stroke broadcast + history
  replay, room routing, deploy.
- **Tier 2** — live cursors, presence, toolbar (color / size / eraser),
  synced undo/redo, storage persistence.
- **Tier 3** — shapes, PNG export, pan/zoom, vector-clock stroke ordering,
  reconnection/resync.

Architecture, tradeoffs, and "what I'd do with more time" are documented here as
each tier lands.
