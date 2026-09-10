import { isShapeTool, type Stroke } from "../../shared/protocol.ts";

/**
 * Size the canvas backing store to the element's CSS box times devicePixelRatio,
 * then scale the context so all drawing commands can use CSS pixels.
 * Returns the ratio so callers can decide whether a resize actually happened.
 */
export function fitCanvasToDisplay(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth, clientHeight } = canvas;
  const nextW = Math.round(clientWidth * dpr);
  const nextH = Math.round(clientHeight * dpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Draw a single stroke onto the context. */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
): void {
  const { points } = stroke;
  if (points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.size;
  ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  if (isShapeTool(stroke.tool)) {
    renderShape(ctx, stroke);
    ctx.restore();
    return;
  }

  if (points.length === 1) {
    // A tap: render a dot so single clicks leave a mark.
    const p = points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Render the whole board onto an offscreen canvas the size of the current
 * viewport (over an opaque background) and trigger a PNG download.
 */
export function exportPng(
  strokes: readonly Stroke[],
  background = "#0f1115",
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  for (const stroke of strokes) renderStroke(ctx, stroke);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flam-canvas-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** Render a shape stroke from its first point to its last point. */
function renderShape(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const a = stroke.points[0];
  const b = stroke.points[stroke.points.length - 1];

  if (stroke.tool === "rect") {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    return;
  }

  if (stroke.tool === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    return;
  }

  // arrow: shaft + a filled head, its length scaling gently with brush size
  const head = 8 + stroke.size * 2;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(
    b.x - head * Math.cos(angle - Math.PI / 7),
    b.y - head * Math.sin(angle - Math.PI / 7),
  );
  ctx.lineTo(
    b.x - head * Math.cos(angle + Math.PI / 7),
    b.y - head * Math.sin(angle + Math.PI / 7),
  );
  ctx.closePath();
  ctx.fill();
}

/** Clear and repaint the full stroke list. */
export function repaint(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
): void {
  const { a, d } = ctx.getTransform();
  const width = ctx.canvas.width / a;
  const height = ctx.canvas.height / d;
  ctx.clearRect(0, 0, width, height);
  for (const stroke of strokes) renderStroke(ctx, stroke);
}
