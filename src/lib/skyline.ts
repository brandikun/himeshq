import { PixelCanvas, type Rect, type SceneColor } from './pixel-canvas';
import { createRandom, pick, randomInt, type Random } from './prng';

export const SCENE_WIDTH = 256;
export const SCENE_HEIGHT = 128;
/** Extra rows of plain sky drawn above the scene, so portrait screens get more than a strip. */
export const SKY_EXTRA = 96;

const DECK_TOP = 116;
/** Where DotGothic16 sits its baseline, as a fraction of the em box. */
const GLYPH_BASELINE = 0.86;

export interface SignGlyph {
  char: string;
  x: number;
  y: number;
}

export interface Sign {
  id: string;
  size: number;
  plate: Rect;
  color: SceneColor;
  shadow: SceneColor;
  glyphs: SignGlyph[];
}

export interface Skyline {
  canvas: PixelCanvas;
  sky: PixelCanvas;
  signs: Sign[];
}

interface Building extends Rect {
  /** Alternates lit-window palette so neighbouring blocks do not look identical. */
  tint: number;
}

interface SignSpec {
  id: string;
  text: string;
  layout: 'stack' | 'row';
  size: number;
  anchorX: number;
  drop: number;
  color: SceneColor;
  shadow: SceneColor;
}

const SIGN_SPECS: readonly SignSpec[] = [
  {
    id: 'music',
    text: '音楽',
    layout: 'stack',
    size: 9,
    anchorX: 16,
    drop: 6,
    color: 'magenta',
    shadow: 'cyan',
  },
  {
    id: 'tokyo',
    text: '東京',
    layout: 'stack',
    size: 9,
    anchorX: 128,
    drop: 6,
    color: 'cyan',
    shadow: 'magenta',
  },
  {
    id: 'ramen',
    text: 'ラーメン',
    layout: 'row',
    size: 9,
    anchorX: 164,
    drop: 10,
    color: 'sun',
    shadow: 'torii',
  },
  {
    id: 'guitar',
    text: 'ギター',
    layout: 'row',
    size: 9,
    anchorX: 236,
    drop: 20,
    color: 'paper',
    shadow: 'cyan',
  },
];

const WINDOW_COLORS = [
  'sun',
  'sun',
  'sun',
  'sun',
  'sun',
  'cyan',
  'cyan',
  'magenta',
  'magenta',
  'paper',
] as const;

function paintSky(canvas: PixelCanvas, random: Random): void {
  canvas.rect(0, 0, SCENE_WIDTH, 30, 'void');
  canvas.rect(0, 30, SCENE_WIDTH, 16, 'night');
  canvas.dither(46, 4, 'night', 'indigo');
  canvas.rect(0, 50, SCENE_WIDTH, 12, 'indigo');
  canvas.dither(62, 5, 'indigo', 'magenta');
  canvas.rect(0, 67, SCENE_WIDTH, 40, 'magenta');

  for (let i = 0; i < 46; i++) {
    const star = random() < 0.3 ? 'paper' : 'dim';
    canvas.set(randomInt(random, 0, SCENE_WIDTH - 1), randomInt(random, 0, 52), star);
  }
}

function paintHighSky(random: Random): PixelCanvas {
  const sky = new PixelCanvas(SCENE_WIDTH, SKY_EXTRA);
  sky.rect(0, 0, SCENE_WIDTH, SKY_EXTRA, 'void');
  for (let i = 0; i < 70; i++) {
    const star = random() < 0.25 ? 'paper' : 'dim';
    sky.set(randomInt(random, 0, SCENE_WIDTH - 1), randomInt(random, 0, SKY_EXTRA - 1), star);
  }
  return sky;
}

function paintMoon(canvas: PixelCanvas): void {
  const cx = 58;
  const cy = 54;
  canvas.disc(cx, cy, 9, 'dim');
  canvas.disc(cx - 2, cy - 1, 8, 'paper');
  canvas.rect(cx - 5, cy - 3, 2, 2, 'dim');
  canvas.rect(cx + 1, cy + 3, 3, 2, 'dim');
}

function paintFarSkyline(canvas: PixelCanvas, random: Random): void {
  let x = 0;
  while (x < SCENE_WIDTH) {
    const width = randomInt(random, 8, 16);
    const top = 100 - randomInt(random, 18, 34);
    canvas.rect(x, top, width, SCENE_HEIGHT - top, 'night');
    for (let wy = top + 3; wy < 96; wy += 4) {
      for (let wx = x + 2; wx < x + width - 1; wx += 3) {
        if (random() < 0.14) {
          canvas.set(wx, wy, 'indigo');
        }
      }
    }
    x += width;
  }
}

function paintTower(canvas: PixelCanvas): void {
  const cx = 206;
  const top = 58;
  const base = 118;
  const bandHeight = 10;
  const halfWidth = (y: number): number => 1 + Math.round(19 * ((y - top) / (base - top)) ** 1.5);
  const bandColor = (y: number): SceneColor =>
    Math.floor((y - top) / bandHeight) % 2 === 0 ? 'torii' : 'paper';

  canvas.rect(cx, top - 12, 1, 12, 'paper');
  canvas.rect(cx - 1, top - 8, 3, 1, 'torii');
  canvas.set(cx, top - 13, 'magenta');

  for (let y = top; y <= base; y++) {
    const half = halfWidth(y);
    const color = bandColor(y);
    if (y < top + 12) {
      canvas.rect(cx - half, y, half * 2 + 1, 1, color);
    } else {
      canvas.set(cx - half, y, color);
      canvas.set(cx + half, y, color);
    }
  }

  for (let y = top + 12; y < base; y += bandHeight) {
    const lower = Math.min(y + bandHeight, base);
    const color = bandColor(y);
    canvas.rect(cx - halfWidth(y), y, halfWidth(y) * 2 + 1, 1, color);
    canvas.line(cx - halfWidth(y), y, cx + halfWidth(lower), lower, color);
    canvas.line(cx + halfWidth(y), y, cx - halfWidth(lower), lower, color);
  }

  const deck = top + 34;
  canvas.rect(cx - halfWidth(deck) - 3, deck, halfWidth(deck) * 2 + 7, 3, 'paper');
  canvas.rect(cx - halfWidth(deck) - 3, deck + 3, halfWidth(deck) * 2 + 7, 1, 'torii');
}

function paintBuildings(canvas: PixelCanvas, random: Random): Building[] {
  const buildings: Building[] = [];
  let x = -2;
  while (x < SCENE_WIDTH) {
    const w = randomInt(random, 14, 26);
    const h = randomInt(random, 36, 74);
    const building: Building = { x, y: SCENE_HEIGHT - h, w, h, tint: buildings.length % 3 };
    buildings.push(building);
    x += w + randomInt(random, 0, 2);
  }

  for (const { x: bx, y: by, w, h } of buildings) {
    canvas.rect(bx, by, w, h, 'void');
    canvas.rect(bx, by, w, 1, 'indigo');
    canvas.rect(bx, by, 1, h, 'indigo');

    if (random() < 0.4) {
      const boxWidth = randomInt(random, 4, 7);
      const boxX = bx + randomInt(random, 2, Math.max(2, w - boxWidth - 2));
      canvas.rect(boxX, by - 3, boxWidth, 3, 'void');
      canvas.rect(boxX, by - 3, boxWidth, 1, 'indigo');
    }
    if (random() < 0.3) {
      const mastX = bx + randomInt(random, 3, w - 3);
      canvas.rect(mastX, by - randomInt(random, 5, 9), 1, 9, 'dim');
    }

    for (let wy = by + 4; wy + 2 <= DECK_TOP - 2; wy += 5) {
      for (let wx = bx + 3; wx + 2 <= bx + w - 2; wx += 4) {
        const lit = random() < 0.38;
        canvas.rect(wx, wy, 2, 2, lit ? pick(random, WINDOW_COLORS) : 'night');
      }
    }
  }
  return buildings;
}

function paintSigns(canvas: PixelCanvas, buildings: readonly Building[]): Sign[] {
  return SIGN_SPECS.map((spec) => {
    const chars = Array.from(spec.text);
    const stacked = spec.layout === 'stack';
    const width = stacked ? spec.size + 4 : chars.length * spec.size + 4;
    const height = stacked ? chars.length * spec.size + 4 : spec.size + 6;
    const host =
      buildings.find(({ x, w }) => spec.anchorX >= x && spec.anchorX < x + w) ?? buildings[0];
    const plateX = Math.round((host?.x ?? 0) + ((host?.w ?? width) - width) / 2);
    const plateY = (host?.y ?? 40) + spec.drop;

    canvas.rect(plateX - 1, plateY - 1, width + 2, height + 2, 'indigo');
    canvas.rect(plateX, plateY, width, height, 'void');

    const glyphs = chars.map((char, index) => ({
      char,
      x: stacked ? plateX + width / 2 : plateX + 2 + index * spec.size + spec.size / 2,
      y: stacked
        ? plateY + 2 + index * spec.size + spec.size * GLYPH_BASELINE
        : plateY + (height + spec.size * GLYPH_BASELINE) / 2,
    }));

    return {
      id: spec.id,
      size: spec.size,
      plate: { x: plateX, y: plateY, w: width, h: height },
      color: spec.color,
      shadow: spec.shadow,
      glyphs,
    };
  });
}

function paintTorii(canvas: PixelCanvas): void {
  const cx = 44;
  const base = DECK_TOP;
  const top = base - 34;

  canvas.rect(cx - 13, top + 4, 3, 30, 'torii');
  canvas.rect(cx + 11, top + 4, 3, 30, 'torii');
  canvas.rect(cx - 12, top + 14, 25, 3, 'torii');
  canvas.rect(cx, top + 7, 2, 7, 'torii');
  canvas.rect(cx - 19, top + 2, 39, 4, 'torii');
  canvas.rect(cx - 21, top, 3, 3, 'torii');
  canvas.rect(cx + 19, top, 3, 3, 'torii');
  canvas.rect(cx - 17, top + 6, 35, 1, 'void');
  canvas.rect(cx - 19, top + 2, 39, 1, 'magenta');
}

function paintDeck(canvas: PixelCanvas): void {
  canvas.rect(0, DECK_TOP, SCENE_WIDTH, SCENE_HEIGHT - DECK_TOP, 'void');
  canvas.rect(0, DECK_TOP, SCENE_WIDTH, 1, 'indigo');
  canvas.rect(0, DECK_TOP + 6, SCENE_WIDTH, 1, 'night');
  for (let x = 4; x < SCENE_WIDTH; x += 16) {
    canvas.rect(x, DECK_TOP + 1, 1, 5, 'night');
  }
}

function drawGuitar(
  canvas: PixelCanvas,
  cx: number,
  color: SceneColor,
  dx: number,
  dy: number,
): void {
  const x = cx + dx;
  const bottom = DECK_TOP - 12 + dy;
  canvas.disc(x, bottom, 8, color);
  canvas.disc(x - 1, bottom - 11, 6, color);
  canvas.rect(x - 5, bottom - 12, 10, 8, color);
  canvas.rect(x - 1, bottom - 46, 3, 36, color);
  canvas.rect(x - 2, bottom - 54, 5, 9, color);
  canvas.rect(x - 3, bottom - 53, 1, 2, color);
  canvas.rect(x - 3, bottom - 49, 1, 2, color);
  canvas.rect(x + 3, bottom - 54, 1, 2, color);
  canvas.rect(x + 3, bottom - 50, 1, 2, color);
}

function paintGuitar(canvas: PixelCanvas): void {
  const cx = 92;
  canvas.line(cx - 1, DECK_TOP - 8, cx - 9, DECK_TOP - 1, 'indigo');
  canvas.line(cx + 1, DECK_TOP - 8, cx + 9, DECK_TOP - 1, 'indigo');

  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    drawGuitar(canvas, cx, 'magenta', dx, dy);
  }
  drawGuitar(canvas, cx, 'void', 0, 0);

  const bottom = DECK_TOP - 12;
  canvas.rect(cx - 4, bottom - 6, 8, 1, 'night');
  canvas.rect(cx - 4, bottom - 1, 8, 1, 'night');
  canvas.rect(cx - 3, bottom + 4, 6, 1, 'night');
}

/** Builds the title-screen scene. The same seed always yields the same pixels. */
export function buildSkyline(seed: number): Skyline {
  const random = createRandom(seed);
  const canvas = new PixelCanvas(SCENE_WIDTH, SCENE_HEIGHT);

  paintSky(canvas, random);
  paintMoon(canvas);
  paintFarSkyline(canvas, random);
  paintTower(canvas);
  const buildings = paintBuildings(canvas, random);
  const signs = paintSigns(canvas, buildings);
  paintDeck(canvas);
  paintTorii(canvas);
  paintGuitar(canvas);

  return { canvas, sky: paintHighSky(random), signs };
}
