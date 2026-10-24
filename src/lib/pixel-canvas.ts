export const SCENE_COLORS = [
  'void',
  'night',
  'indigo',
  'magenta',
  'cyan',
  'sun',
  'torii',
  'paper',
  'dim',
] as const;

export type SceneColor = (typeof SCENE_COLORS)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const EMPTY = 255;

/**
 * A grid of palette indices. Primitives paint into it, later paints win, and `toRects` flattens
 * the result into the fewest rectangles per color so the SVG carries no overdraw.
 */
export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  readonly #cells: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.#cells = new Uint8Array(width * height).fill(EMPTY);
  }

  get(x: number, y: number): SceneColor | undefined {
    if (!this.#inBounds(x, y)) {
      return undefined;
    }
    return SCENE_COLORS[this.#cells[y * this.width + x] ?? EMPTY];
  }

  set(x: number, y: number, color: SceneColor): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (this.#inBounds(px, py)) {
      this.#cells[py * this.width + px] = SCENE_COLORS.indexOf(color);
    }
  }

  rect(x: number, y: number, w: number, h: number, color: SceneColor): void {
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        this.set(x + col, y + row, color);
      }
    }
  }

  /** Bresenham line, one pixel wide. */
  line(x0: number, y0: number, x1: number, y1: number, color: SceneColor): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const endX = Math.round(x1);
    const endY = Math.round(y1);
    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1;
    const stepY = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.set(x, y, color);
      if (x === endX && y === endY) {
        return;
      }
      const doubled = 2 * error;
      if (doubled >= dy) {
        error += dy;
        x += stepX;
      }
      if (doubled <= dx) {
        error += dx;
        y += stepY;
      }
    }
  }

  disc(cx: number, cy: number, radius: number, color: SceneColor): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius + radius) {
          this.set(cx + dx, cy + dy, color);
        }
      }
    }
  }

  /** Checkerboard of two colors across a band of rows. */
  dither(y: number, height: number, a: SceneColor, b: SceneColor): void {
    for (let row = y; row < y + height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.set(col, row, (col + row) % 2 === 0 ? a : b);
      }
    }
  }

  /** Merges horizontal runs that repeat on consecutive rows into rectangles, grouped by color. */
  toRects(): Record<SceneColor, Rect[]> {
    const rects = Object.fromEntries(SCENE_COLORS.map((color) => [color, [] as Rect[]])) as Record<
      SceneColor,
      Rect[]
    >;
    let previousRow = new Map<string, Rect>();

    for (let y = 0; y < this.height; y++) {
      const currentRow = new Map<string, Rect>();
      let x = 0;
      while (x < this.width) {
        const index = this.#cells[y * this.width + x] ?? EMPTY;
        const color = SCENE_COLORS[index];
        if (color === undefined) {
          x++;
          continue;
        }
        let end = x + 1;
        while (end < this.width && this.#cells[y * this.width + end] === index) {
          end++;
        }
        const key = `${String(index)}:${String(x)}:${String(end - x)}`;
        const continued = previousRow.get(key);
        if (continued) {
          continued.h++;
          currentRow.set(key, continued);
        } else {
          const rect: Rect = { x, y, w: end - x, h: 1 };
          rects[color].push(rect);
          currentRow.set(key, rect);
        }
        x = end;
      }
      previousRow = currentRow;
    }
    return rects;
  }

  #inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}

/** SVG path data drawing every rectangle as a closed sub-path. */
export function rectsToPath(rects: readonly Rect[]): string {
  return rects
    .map(({ x, y, w, h }) => `M${String(x)} ${String(y)}h${String(w)}v${String(h)}h-${String(w)}z`)
    .join('');
}
