import { usePresenceStore } from "../store/presenceStore.ts";

const MAX_AVATARS = 5;

export function Presence() {
  const peers = usePresenceStore((s) => s.peers);
  const self = usePresenceStore((s) => s.self);

  if (peers.length === 0) return null;

  const shown = peers.slice(0, MAX_AVATARS);
  const overflow = peers.length - shown.length;

  return (
    <div className="presence">
      <div className="avatars">
        {shown.map((p) => (
          <span
            key={p.id}
            className="avatar"
            style={{ background: p.color }}
            title={p.id === self ? `${p.name} (you)` : p.name}
          >
            {p.name.charAt(0)}
          </span>
        ))}
        {overflow > 0 && <span className="avatar avatar-more">+{overflow}</span>}
      </div>
      <span className="presence-count">
        {peers.length} {peers.length === 1 ? "person" : "people"} here
      </span>
    </div>
  );
}
