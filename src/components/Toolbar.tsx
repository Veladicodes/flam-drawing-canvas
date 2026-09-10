import { CLIENT_ID } from "../lib/session.ts";
import { useCanvasStore } from "../store/canvasStore.ts";

const SWATCHES = [
  "#e6e8ec",
  "#ff5c7c",
  "#ffb454",
  "#ffe14d",
  "#59d499",
  "#6ea8fe",
  "#c58bff",
  "#0f1115",
];

const SIZES = [2, 4, 8, 16, 28];

type Props = {
  onUndo: () => void;
  onRedo: () => void;
};

export function Toolbar({ onUndo, onRedo }: Props) {
  const tool = useCanvasStore((s) => s.tool);
  const color = useCanvasStore((s) => s.color);
  const size = useCanvasStore((s) => s.size);
  const setTool = useCanvasStore((s) => s.setTool);
  const setColor = useCanvasStore((s) => s.setColor);
  const setSize = useCanvasStore((s) => s.setSize);
  const canUndo = useCanvasStore((s) =>
    s.strokes.some((stroke) => stroke.clientId === CLIENT_ID),
  );
  const canRedo = useCanvasStore((s) => s.redoStack.length > 0);

  return (
    <div className="toolbar">
      <div className="tool-group">
        <button
          className="tool-btn"
          data-active={tool === "pen"}
          onClick={() => setTool("pen")}
          title="Pen"
        >
          ✏️
        </button>
        <button
          className="tool-btn"
          data-active={tool === "eraser"}
          onClick={() => setTool("eraser")}
          title="Eraser"
        >
          🩹
        </button>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        {SWATCHES.map((c) => (
          <button
            key={c}
            className="swatch"
            data-active={tool === "pen" && color.toLowerCase() === c}
            style={{ background: c }}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
        <label className="swatch swatch-custom" title="Custom color">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        {SIZES.map((s) => (
          <button
            key={s}
            className="size-btn"
            data-active={size === s}
            onClick={() => setSize(s)}
            title={`${s}px`}
          >
            <span style={{ width: s, height: s }} />
          </button>
        ))}
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        <button
          className="tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className="tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </button>
      </div>
    </div>
  );
}
