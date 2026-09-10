import { usePresenceStore } from "../store/presenceStore.ts";

export function Cursors() {
  const cursors = usePresenceStore((s) => s.cursors);
  const peers = usePresenceStore((s) => s.peers);
  const self = usePresenceStore((s) => s.self);

  const byId = new Map(peers.map((p) => [p.id, p]));

  return (
    <div className="cursor-layer">
      {Object.entries(cursors).map(([id, c]) => {
        if (id === self) return null;
        const peer = byId.get(id);
        if (!peer) return null;
        return (
          <div
            key={id}
            className="cursor"
            style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M1 1l5.5 15 2.2-6.3L15 7.5 1 1z"
                fill={peer.color}
                stroke="#0f1115"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span className="cursor-label" style={{ background: peer.color }}>
              {peer.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
