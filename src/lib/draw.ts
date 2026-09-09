import type { Stroke } from "../../shared/protocol.ts";

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
