export type Identity = { name: string; color: string };

const ANIMALS = [
  "Fox", "Owl", "Bear", "Lynx", "Wren", "Hare",
  "Newt", "Moth", "Crow", "Seal", "Ibis", "Vole",
];

const STORAGE_KEY = "flam:identity";

function generate(): Identity {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const tag = Math.floor(1000 + Math.random() * 9000);
  const hue = Math.floor(Math.random() * 360);
  return { name: `${animal} ${tag}`, color: `hsl(${hue} 72% 62%)` };
}

/** A stable display name + colour for this browser, remembered across reloads. */
export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    /* storage unavailable */
  }
  const identity = generate();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* storage unavailable */
  }
  return identity;
}
