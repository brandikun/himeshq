import { PixelCanvas, type Rect, type SceneColor } from './pixel-canvas';
import { createRandom, pick, randomInt, type Random } from './prng';

/** Three screens wide: the designed scene sits in the middle, flanked by more city. */
export const SCENE_WIDTH = 768;
export const SCENE_HEIGHT = 128;
/** Extra rows of plain sky above the scene, so tall and wide screens both get room for the title. */
export const SKY_EXTRA = 288;

/** Left edge of the central 256-unit composition that phones show on their own. */
const HERO_X = 256;

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

type Palette = readonly [SceneColor, ...SceneColor[]];

interface SignSpec {
  id: string;
  text: string;
  layout: 'stack' | 'row';
  /** Wall signs sit flush on the facade; roof signs stand on posts above the roofline. */
  mount: 'wall' | 'roof';
  size: number;
  anchorX: number;
  color: SceneColor;
  shadow: SceneColor;
}

/** A building footprint. Sign hosts are sized from their sign, so the two always fit. */
interface Lot extends Rect {
  palette: Palette;
  litChance: number;
  sign?: { spec: SignSpec; plate: Rect };
}

const SIGN_SPECS: readonly SignSpec[] = [
  {
    id: 'music',
    text: '音楽',
    layout: 'stack',
    mount: 'wall',
    size: 9,
    anchorX: HERO_X + 14,
    color: 'magenta',
    shadow: 'cyan',
  },
  {
    id: 'tokyo',
    text: '東京',
    layout: 'stack',
    mount: 'wall',
    size: 9,
    anchorX: HERO_X + 120,
    color: 'cyan',
    shadow: 'magenta',
  },
  {
    id: 'ramen',
    text: 'ラーメン',
    layout: 'row',
    mount: 'roof',
    size: 9,
    anchorX: HERO_X + 156,
    color: 'sun',
    shadow: 'torii',
  },
  {
    id: 'guitar',
    text: 'ギター',
    layout: 'row',
    mount: 'wall',
    size: 9,
    anchorX: HERO_X + 230,
    color: 'paper',
    shadow: 'cyan',
  },
  // Flank signs only show on screens wide enough to look past the central composition.
  {
    id: 'cyber',
    text: '電脳',
    layout: 'stack',
    mount: 'wall',
    size: 9,
    anchorX: HERO_X - 104,
    color: 'paper',
    shadow: 'magenta',
  },
  {
    id: 'neon',
    text: 'ネオン',
    layout: 'row',
    mount: 'wall',
    size: 9,
    anchorX: HERO_X + 256 + 128,
    color: 'magenta',
    shadow: 'paper',
  },
];

const WINDOW_PALETTES: readonly [Palette, ...Palette[]] = [
  ['sun', 'sun', 'sun', 'sun', 'paper'],
  ['cyan', 'cyan', 'cyan', 'paper', 'magenta'],
  ['magenta', 'magenta', 'cyan', 'sun'],
  ['sun', 'sun', 'cyan'],
];

function overlaps(a: Rect, b: Rect, margin: number): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

function plateSize(spec: SignSpec): { w: number; h: number } {
  const count = Array.from(spec.text).length;
  return spec.layout === 'stack'
    ? { w: spec.size + 4, h: count * spec.size + 4 }
    : { w: count * spec.size + 4, h: spec.size + 6 };
}

function paintSky(canvas: PixelCanvas, random: Random): void {
  canvas.rect(0, 0, SCENE_WIDTH, 30, 'void');
  canvas.rect(0, 30, SCENE_WIDTH, 16, 'night');
  canvas.dither(46, 4, 'night', 'indigo');
  canvas.rect(0, 50, SCENE_WIDTH, 12, 'indigo');
  canvas.dither(62, 5, 'indigo', 'magenta');
  canvas.rect(0, 67, SCENE_WIDTH, 40, 'magenta');

  for (let i = 0; i < 140; i++) {
    const star = random() < 0.3 ? 'paper' : 'dim';
    canvas.set(randomInt(random, 0, SCENE_WIDTH - 1), randomInt(random, 0, 28), star);
  }
}

/** Long flat banded clouds with a dithered underside, tinted to the band they drift through. */
function paintClouds(canvas: PixelCanvas, random: Random): void {
  for (let i = 0; i < 16; i++) {
    const y = randomInt(random, 12, 44);
    const color: SceneColor = y < 30 ? 'night' : 'indigo';
    const width = randomInt(random, 36, 70);
    const x = randomInt(random, -10, SCENE_WIDTH - width + 10);
    canvas.rect(x + 8, y, width - 16, 2, color);
    canvas.rect(x + 3, y + 2, width - 6, 2, color);
    canvas.rect(x, y + 4, width, 2, color);
    for (let dx = 4; dx < width - 4; dx += 2) {
      canvas.set(x + dx, y + 6, color);
    }
  }
}

function paintMoon(canvas: PixelCanvas): void {
  const cx = HERO_X + 44;
  const cy = 38;
  canvas.disc(cx, cy, 11, 'dim');
  canvas.disc(cx - 2, cy - 1, 10, 'paper');
  canvas.rect(cx - 6, cy - 4, 3, 3, 'dim');
  canvas.rect(cx + 2, cy + 3, 4, 3, 'dim');
  canvas.rect(cx - 3, cy + 6, 2, 2, 'dim');
}

/** A distant aircraft: one magenta dot with a pale trail. */
function paintAircraft(canvas: PixelCanvas): void {
  canvas.set(HERO_X + 176, 24, 'magenta');
  canvas.set(HERO_X + 172, 25, 'dim');
  canvas.set(HERO_X + 168, 26, 'dim');
}

function paintHighSky(random: Random): PixelCanvas {
  const sky = new PixelCanvas(SCENE_WIDTH, SKY_EXTRA);
  sky.rect(0, 0, SCENE_WIDTH, SKY_EXTRA, 'void');
  for (let i = 0; i < 520; i++) {
    const star = random() < 0.25 ? 'paper' : 'dim';
    sky.set(randomInt(random, 0, SCENE_WIDTH - 1), randomInt(random, 0, SKY_EXTRA - 1), star);
  }
  for (let i = 0; i < 26; i++) {
    const x = randomInt(random, 6, SCENE_WIDTH - 7);
    const y = randomInt(random, 6, SKY_EXTRA - 7);
    sky.rect(x - 2, y, 5, 1, 'dim');
    sky.rect(x, y - 2, 1, 5, 'dim');
    sky.set(x, y, 'paper');
  }
  return sky;
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
  const cx = HERO_X + 206;
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

  const deck = top + 22;
  canvas.rect(cx - halfWidth(deck) - 3, deck, halfWidth(deck) * 2 + 7, 3, 'paper');
  canvas.rect(cx - halfWidth(deck) - 3, deck + 3, halfWidth(deck) * 2 + 7, 1, 'torii');
}

function newLot(random: Random, x: number, w: number, h: number): Lot {
  return {
    x,
    y: SCENE_HEIGHT - h,
    w,
    h,
    palette: pick(random, WINDOW_PALETTES),
    litChance: 0.25 + random() * 0.25,
  };
}

/** Sizes a lot around its sign: wide enough to carry it, tall enough to show it above the deck. */
function newSignLot(random: Random, spec: SignSpec): Lot {
  const plate = plateSize(spec);
  const roof = spec.mount === 'roof';
  const w = plate.w + (roof ? 2 : spec.layout === 'stack' ? 6 : 4);
  const h = roof ? randomInt(random, 34, 42) : plate.h + 26 + randomInt(random, 0, 10);
  const lot = newLot(random, Math.round(spec.anchorX - w / 2), w, h);
  const plateX = lot.x + Math.floor((w - plate.w) / 2);
  const plateY = roof ? lot.y - 3 - plate.h : lot.y + 6;
  return { ...lot, sign: { spec, plate: { x: plateX, y: plateY, w: plate.w, h: plate.h } } };
}

/** Fills the span from `from` to `to` with ordinary buildings, last one stretched to land exactly. */
function fillGap(random: Random, lots: Lot[], from: number, to: number): void {
  let x = from;
  while (to - x > 0) {
    const remaining = to - x;
    const previous = lots.at(-1);
    if (remaining < 8 && previous) {
      previous.w += remaining;
      return;
    }
    let w = remaining <= 26 ? remaining : randomInt(random, 14, 26);
    if (remaining - w > 0 && remaining - w < 8) {
      w = remaining;
    }
    lots.push(newLot(random, x, w, randomInt(random, 36, 74)));
    x += w;
  }
}

function planLots(random: Random): Lot[] {
  const hosts = SIGN_SPECS.map((spec) => newSignLot(random, spec)).sort((a, b) => a.x - b.x);
  const lots: Lot[] = [];
  let x = -2;
  for (const host of hosts) {
    fillGap(random, lots, x, host.x);
    lots.push(host);
    x = host.x + host.w;
  }
  fillGap(random, lots, x, SCENE_WIDTH + 2);
  return lots;
}

/** Tall buildings step in near the top; everything else is a single block. */
function facadesOf(random: Random, lot: Lot): Rect[] {
  if (lot.h <= 60 || lot.sign || lot.w < 16) {
    return [{ x: lot.x, y: lot.y, w: lot.w, h: lot.h }];
  }
  const tier = randomInt(random, 10, 16);
  return [
    { x: lot.x, y: lot.y + tier, w: lot.w, h: lot.h - tier },
    { x: lot.x + 3, y: lot.y, w: lot.w - 6, h: tier + 1 },
  ];
}

function paintLot(canvas: PixelCanvas, random: Random, lot: Lot): void {
  const facades = facadesOf(random, lot);
  for (const { x, y, w, h } of facades) {
    canvas.rect(x, y, w, h, 'void');
    canvas.rect(x, y, w, 1, 'indigo');
    canvas.rect(x, y, 1, h, 'indigo');
  }

  const roofTop = facades.at(-1) ?? lot;
  if (lot.sign?.spec.mount !== 'roof') {
    if (random() < 0.4) {
      const boxWidth = randomInt(random, 4, 7);
      const boxX = roofTop.x + randomInt(random, 2, Math.max(2, roofTop.w - boxWidth - 2));
      canvas.rect(boxX, roofTop.y - 3, boxWidth, 3, 'void');
      canvas.rect(boxX, roofTop.y - 3, boxWidth, 1, 'indigo');
    }
    if (random() < 0.3) {
      const mastX = roofTop.x + randomInt(random, 3, roofTop.w - 3);
      canvas.rect(mastX, roofTop.y - randomInt(random, 5, 9), 1, 9, 'dim');
    }
  }

  for (const facade of facades) {
    for (let wy = facade.y + 4; wy + 2 <= DECK_TOP - 2; wy += 5) {
      for (let wx = facade.x + 3; wx + 2 <= facade.x + facade.w - 2; wx += 4) {
        const window: Rect = { x: wx, y: wy, w: 2, h: 2 };
        if (wy + 2 > facade.y + facade.h || (lot.sign && overlaps(window, lot.sign.plate, 2))) {
          continue;
        }
        canvas.rect(wx, wy, 2, 2, random() < lot.litChance ? pick(random, lot.palette) : 'night');
      }
    }
  }
}

function paintSigns(canvas: PixelCanvas, lots: readonly Lot[]): Sign[] {
  const signs: Sign[] = [];
  for (const { sign } of lots) {
    if (!sign) {
      continue;
    }
    const { spec, plate } = sign;
    canvas.rect(plate.x - 1, plate.y - 1, plate.w + 2, plate.h + 2, 'indigo');
    canvas.rect(plate.x, plate.y, plate.w, plate.h, 'void');
    if (spec.mount === 'roof') {
      canvas.rect(plate.x + 3, plate.y + plate.h + 1, 1, 3, 'dim');
      canvas.rect(plate.x + plate.w - 4, plate.y + plate.h + 1, 1, 3, 'dim');
    }

    const stacked = spec.layout === 'stack';
    const glyphs = Array.from(spec.text).map((char, index) => ({
      char,
      x: stacked ? plate.x + plate.w / 2 : plate.x + 2 + index * spec.size + spec.size / 2,
      y: stacked
        ? plate.y + 2 + index * spec.size + spec.size * GLYPH_BASELINE
        : plate.y + (plate.h + spec.size * GLYPH_BASELINE) / 2,
    }));
    signs.push({
      id: spec.id,
      size: spec.size,
      plate,
      color: spec.color,
      shadow: spec.shadow,
      glyphs,
    });
  }
  return signs;
}

function paintTorii(canvas: PixelCanvas): void {
  const cx = HERO_X + 50;
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

const GUITAR_TILT = 0.12;

/**
 * Electric guitar silhouette in its own (u, v) frame: u runs up the neck from the bottom of the
 * body, v across it. Offset double cutaway, slim neck, small headstock.
 */
function insideGuitar(u: number, v: number): boolean {
  const ellipse = (cu: number, cv: number, au: number, av: number): boolean =>
    ((u - cu) / au) ** 2 + ((v - cv) / av) ** 2 <= 1;
  const body = ellipse(7, 0, 7.5, 7.5) || ellipse(17, 0.4, 5.5, 5.8);
  const horns = ellipse(22.5, 5.4, 3.2, 1.7) || ellipse(21, -5.2, 2.6, 1.5);
  const neck = u >= 21 && u <= 38 && Math.abs(v) <= 1.1;
  const head = u > 38 && u <= 45 && Math.abs(v + 0.4) <= 1.9;
  return body || horns || neck || head;
}

function paintGuitar(canvas: PixelCanvas): void {
  const cx = HERO_X + 92;
  const baseY = DECK_TOP - 7;
  const sin = Math.sin(GUITAR_TILT);
  const cos = Math.cos(GUITAR_TILT);
  const frame = (x: number, y: number): { u: number; v: number } => {
    const dx = x - cx;
    const dy = baseY - y;
    return { u: dx * sin + dy * cos, v: dx * cos - dy * sin };
  };
  const filled = (x: number, y: number): boolean => {
    const { u, v } = frame(x, y);
    return insideGuitar(u, v);
  };

  canvas.line(cx - 1, DECK_TOP - 5, cx - 9, DECK_TOP - 1, 'dim');
  canvas.line(cx + 1, DECK_TOP - 5, cx + 9, DECK_TOP - 1, 'dim');

  for (let y = baseY - 54; y <= baseY + 9; y++) {
    for (let x = cx - 14; x <= cx + 22; x++) {
      if (filled(x, y)) {
        canvas.set(x, y, 'void');
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        canvas.set(x, y, 'magenta');
      }
    }
  }

  for (let y = baseY - 30; y <= baseY + 2; y++) {
    for (let x = cx - 10; x <= cx + 14; x++) {
      const { u, v } = frame(x, y);
      const pickup = (u >= 11.5 && u < 12.7) || (u >= 15 && u < 16.2);
      const bridge = u >= 6 && u < 7.2;
      if ((pickup || bridge) && Math.abs(v) <= 3.4 && filled(x, y)) {
        canvas.set(x, y, 'night');
      }
    }
  }
}

/** Builds the title-screen scene. The same seed always yields the same pixels. */
export function buildSkyline(seed: number): Skyline {
  const random = createRandom(seed);
  const canvas = new PixelCanvas(SCENE_WIDTH, SCENE_HEIGHT);

  paintSky(canvas, random);
  paintClouds(canvas, random);
  paintMoon(canvas);
  paintAircraft(canvas);
  paintFarSkyline(canvas, random);
  paintTower(canvas);
  const lots = planLots(random);
  for (const lot of lots) {
    paintLot(canvas, random, lot);
  }
  const signs = paintSigns(canvas, lots);
  paintDeck(canvas);
  paintTorii(canvas);
  paintGuitar(canvas);

  return { canvas, sky: paintHighSky(random), signs };
}
