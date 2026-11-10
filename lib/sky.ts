// ASCII birds circling the home photo, after Yash Thapliyal's koi pond (yashdthapliyal.com)
// and stackedlol/ascii-sharks. We look up at the sky: birds flap, glide and bank around the
// photo and pass behind it; clicking the sky tosses seeds they swoop down to.

type Kind = "gull" | "robin" | "cardinal" | "swallow";
type Tone = "pale" | "mid" | "dense" | "orange" | "red" | "teal";

// body regions
const HEAD = 1, BODY = 2, TAIL = 3, ARM = 4, HAND = 5, BEAK = 6;
// body landmarks along the bird, as fractions of body length (head forward)
const HEAD_U = 0.3, TAIL_U = 0.2, WING_U = 0.05, BODY_A = 0.27;

// colour roles: 1 text, 2 link/teal, 3 eye, 4 dim, 5 orange, 6 red, 7 mid
const FONT_PX = 9, CELL_H = 10;
const DIRS = "-\\|/";
const CLOUD = ".::";
// sub-cell samples for anti-aliased silhouettes
const SUB = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];

interface Shape {
  scale: number;   // body length relative to the base size
  span: number;    // wingspan / body length
  chord: number;   // wing depth at the root
  sweep: number;   // how far the wingtips sweep back
  wrist: number;   // forward bulge at the wrist (the gull's "M")
  pointed: boolean;
  bodyW: number;
  head: number;
  beak: number;
  beakW: number;
  tail: "fan" | "fork" | "square";
  tailLen: number;
  freq: number;    // wingbeats per second
  amp: number;     // wingbeat amplitude (radians)
  dihedral: number;
  flap: [number, number];   // seconds spent flapping (min, max)
  glide: [number, number];  // seconds spent gliding (min, max)
  speed: number;
  paint: (region: number, u: number, t: number) => Tone;
}

const SHAPES: Record<Kind, Shape> = {
  // seen from below: white with grey wings and black tips
  gull: {
    scale: 1, span: 2.35, chord: 0.42, sweep: 0.26, wrist: 0.08, pointed: false, bodyW: 0.14, head: 0.11,
    beak: 0.08, beakW: 0.045, tail: "fan", tailLen: 0.2, freq: 2.1, amp: 0.75, dihedral: 0.1,
    flap: [0.8, 1.6], glide: [2.5, 5], speed: 58,
    paint: (g, _u, t) => (g === BEAK ? "orange" : g === HAND && t > 0.8 ? "dense" : g === ARM || g === HAND ? "mid" : "pale"),
  },
  // orange breast, dark head and tail
  robin: {
    scale: 0.85, span: 1.85, chord: 0.46, sweep: 0.12, wrist: 0.03, pointed: false, bodyW: 0.16, head: 0.13,
    beak: 0.07, beakW: 0.05, tail: "square", tailLen: 0.26, freq: 3.6, amp: 0.95, dihedral: 0.04,
    flap: [1.2, 2.2], glide: [0.6, 1.4], speed: 52,
    paint: (g, u) => (g === BEAK ? "orange" : g === HEAD || g === TAIL ? "dense" : g === BODY ? (u > -0.2 ? "orange" : "pale") : "mid"),
  },
  // red all over with a black mask
  cardinal: {
    scale: 0.85, span: 1.8, chord: 0.46, sweep: 0.1, wrist: 0.02, pointed: false, bodyW: 0.15, head: 0.13,
    beak: 0.075, beakW: 0.06, tail: "square", tailLen: 0.34, freq: 3.4, amp: 0.95, dihedral: 0.04,
    flap: [1.2, 2.2], glide: [0.6, 1.3], speed: 50,
    paint: (g, u) => (g === BEAK ? "orange" : g === HEAD && u > HEAD_U + 0.03 ? "dense" : "red"),
  },
  // tree swallow: iridescent blue-green, long pointed wings, forked tail
  swallow: {
    scale: 0.85, span: 2.25, chord: 0.34, sweep: 0.5, wrist: 0.06, pointed: true, bodyW: 0.12, head: 0.1,
    beak: 0.05, beakW: 0.04, tail: "fork", tailLen: 0.42, freq: 3.0, amp: 0.8, dihedral: 0.06,
    flap: [0.5, 1.0], glide: [0.6, 1.5], speed: 78,
    paint: (g, u, t) => (g === BEAK ? "dense" : g === HEAD && u > HEAD_U + 0.04 ? "orange" : g === HAND && t > 0.7 ? "dense" : "teal"),
  },
};
const KINDS = Object.keys(SHAPES) as Kind[];

interface Bird {
  kind: Kind; s: Shape;
  x: number; y: number; heading: number; L: number; speed: number;
  tx: number; ty: number;
  phase: number; amp: number; flapping: boolean; stateT: number; bank: number;
  // pose, refreshed each step
  cos: number; sin: number; hsL: number; hsR: number; thL: number; thR: number; sweep: number;
}
interface Seed { x: number; y: number; age: number; sway: number; eaten?: boolean }
interface Ring { x: number; y: number; r: number; life: number }
interface Flock { x: number; y: number; heading: number; speed: number; n: number; t: number }
interface Craft {
  kind: "plane" | "jet";
  x: number; y: number; heading: number; base: number; L: number; speed: number; t: number;
  roll: number; rollAt: number; rollDir: number; spin: number; flick: number; puffT: number;
  cos: number; sin: number;
}
interface Puff { x: number; y: number; vx: number; vy: number; age: number; life: number; d: number }
interface Meteor { x: number; y: number; ux: number; uy: number; speed: number; t: number; life: number; len: number }

// aircraft parts
const FUSE = 1, WING = 2, STAB = 3, CANOPY = 4, PROP = 5, NOZZLE = 6, FLAME = 7;
interface Colors { bg: string; text: string; dim: string; mid: string; link: string; orange: string; red: string; light: boolean }

function hash(x: number, y: number) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function smooth(a: number, b: number, x: number) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
/** Glyph for a line running along (dx, dy) on screen (y down). */
function dirIndex(dx: number, dy: number) {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI; a = ((a % 180) + 180) % 180;
  return a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
}
function dirChar(dx: number, dy: number) { return DIRS[dirIndex(dx, dy)]; }
/** Glyph for an edge whose outward normal is (nx, ny). */
function contour(nx: number, ny: number) { return dirChar(-ny, nx); }

export function startSky(stage: HTMLElement, canvas: HTMLCanvasElement, photo: HTMLImageElement): () => void {
  const root = document.documentElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, cols = 0, rows = 0, cw = 5.4, time = 0;
  let wake = new Float32Array(0), wdir = new Uint8Array(0), dots = new Float32Array(0);
  let chars: (string | null)[] = [], role = new Uint8Array(0), alpha = new Float32Array(0);
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let colors: Colors;
  let birds: Bird[] = [], seeds: Seed[] = [], rings: Ring[] = [];
  let flock: Flock | null = null, nextFlock = 4;
  let crafts: Craft[] = [], puffs: Puff[] = [], vapor = new Float32Array(0), vdir = new Uint8Array(0);
  // sun (light) or moon (dark) above the photo's corner; shooting stars at night
  let celX = 0, celY = 0, celR = 30, meteor: Meteor | null = null, nextMeteor = Infinity;
  let nextPlane = rand(7, 11), nextJet = rand(16, 21);
  let lastRing: { x: number; y: number } | null = null;
  let raf = 0, destroyed = false, booted = false;

  function readColors() {
    const cs = getComputedStyle(root), g = (k: string) => cs.getPropertyValue(k).trim();
    colors = {
      bg: g("--bg"), text: g("--text"), dim: g("--dim"), mid: g("--mid"), link: g("--link"),
      orange: g("--bird-orange"), red: g("--bird-red"), light: root.getAttribute("data-theme") === "light",
    };
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.font = FONT_PX + "px " + getComputedStyle(root).getPropertyValue("--mono");
    ctx!.textBaseline = "top";
    cw = ctx!.measureText("M").width || 5.4;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / CELL_H);
    const total = cols * rows;
    wake = new Float32Array(total); wdir = new Uint8Array(total); vapor = new Float32Array(total); vdir = new Uint8Array(total);
    role = new Uint8Array(total); alpha = new Float32Array(total); chars = new Array(total).fill(null);
    // ~4% of cells hold a faint dot (a star, at night); the value seeds its twinkle
    dots = new Float32Array(total);
    for (let i = 0; i < total; i++) { const h = hash(i % cols, (i / cols) | 0); if (h < 0.04) dots[i] = h / 0.04 + 0.001; }
    const pr = photo.getBoundingClientRect();
    box = { x0: pr.left - rect.left, y0: pr.top - rect.top, x1: pr.right - rect.left, y1: pr.bottom - rect.top };
    celR = Math.min(52, Math.max(22, W * 0.04));
    celX = W * 0.82; celY = H * 0.22;
    // keep it clear of the photo when the sky is narrow
    if (celX + celR * 2 > box.x0 && celX - celR * 2 < box.x1) celY = Math.min(celY, box.y0 - celR * 2);
    celY = Math.max(celR * 1.7, celY);
  }
  function inPhoto(x: number, y: number) { return x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1; }

  // ---- birds ------------------------------------------------------------------------------

  function makeBirds() {
    const n = W < 520 ? 2 : W < 900 ? 3 : 4;
    const base = Math.min(112, Math.max(58, W * 0.095));
    const kinds = KINDS.slice().sort(() => Math.random() - 0.5);
    birds = [];
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % kinds.length], s = SHAPES[kind];
      // one bird per quarter of the sky, pointed anywhere
      const b: Bird = {
        kind, s,
        x: W * ((i % 2) * 0.5 + 0.1 + Math.random() * 0.3), y: H * ((i >> 1) * 0.5 + 0.1 + Math.random() * 0.3),
        heading: Math.random() * 6.28, L: base * s.scale * rand(0.94, 1.06), speed: s.speed * rand(0.9, 1.1),
        tx: 0, ty: 0, phase: Math.random() * 6.28, amp: s.amp, flapping: Math.random() < 0.5,
        stateT: rand(0, 2), bank: 0,
        cos: 1, sin: 0, hsL: 0, hsR: 0, thL: 0, thR: 0, sweep: s.sweep,
      };
      pickTarget(b); pose(b);
      birds.push(b);
    }
  }

  // aim for open sky; birds still pass behind the photo on the way between targets
  function pickTarget(b: Bird) {
    for (let i = 0; i < 12; i++) {
      b.tx = W * (0.08 + Math.random() * 0.84); b.ty = H * (0.1 + Math.random() * 0.8);
      if (!(b.tx > box.x0 - 40 && b.tx < box.x1 + 40 && b.ty > box.y0 - 30 && b.ty < box.y1 + 30)) return;
    }
  }

  // each seed is claimed by the bird nearest to it, so they don't all pile onto one spot
  function nearestSeed(b: Bird) {
    let best: Seed | null = null, bd = 1e9;
    for (const p of seeds) {
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d >= bd || birds.some((o) => o !== b && Math.hypot(p.x - o.x, p.y - o.y) < d)) continue;
      bd = d; best = p;
    }
    return best;
  }

  function stepBird(b: Bird, dt: number) {
    const s = b.s, meal = nearestSeed(b);
    const gx = meal ? meal.x : b.tx, gy = meal ? meal.y : b.ty;
    if (!meal && Math.hypot(gx - b.x, gy - b.y) < 60) pickTarget(b);
    const headX = b.x + Math.cos(b.heading) * HEAD_U * b.L, headY = b.y + Math.sin(b.heading) * HEAD_U * b.L;
    if (meal && Math.hypot(meal.x - headX, meal.y - headY) < 12) {
      meal.eaten = true; rings.push({ x: meal.x, y: meal.y, r: 2, life: 0.8 });
    }

    // steer for the goal, edging away from any bird that gets too close
    let wx = Math.cos(Math.atan2(gy - b.y, gx - b.x)), wy = Math.sin(Math.atan2(gy - b.y, gx - b.x));
    for (const o of birds) {
      if (o === b) continue;
      const d = Math.hypot(b.x - o.x, b.y - o.y), near = (b.L * b.s.span + o.L * o.s.span) * 0.6;
      if (d > 0 && d < near) { const k = 4 * (1 - d / near); wx += ((b.x - o.x) / d) * k; wy += ((b.y - o.y) / d) * k; }
    }
    const want = Math.atan2(wy, wx);
    const d = Math.atan2(Math.sin(want - b.heading), Math.cos(want - b.heading));
    const rate = meal ? 2.4 : 1.1;
    const turn = Math.max(-rate * dt, Math.min(rate * dt, d));
    b.heading += turn;
    // bank into the turn
    const bankTo = Math.max(-0.22, Math.min(0.22, (turn / (dt || 1)) * 0.25));
    b.bank += (bankTo - b.bank) * Math.min(1, dt * 3);

    // bursts of flapping between glides; always flapping when chasing a seed
    b.stateT -= dt;
    if (b.stateT <= 0) { b.flapping = !b.flapping; b.stateT = b.flapping ? rand(...s.flap) : rand(...s.glide); }
    const flapping = b.flapping || !!meal;
    b.amp += ((flapping ? s.amp : 0.06) - b.amp) * Math.min(1, dt * 3);
    b.phase += 6.283 * s.freq * (meal ? 1.35 : 1) * (flapping ? 1 : 0.35) * dt;

    const sp = b.speed * (meal ? 1.6 : 1) * (flapping ? 1.05 : 0.95);
    b.x += Math.cos(b.heading) * sp * dt; b.y += Math.sin(b.heading) * sp * dt;
    pose(b);
  }

  // wing angle and how much of the span shows from below (raised wings foreshorten)
  function pose(b: Bird) {
    const s = b.s;
    b.cos = Math.cos(b.heading); b.sin = Math.sin(b.heading);
    const th = b.amp * Math.sin(b.phase) + s.dihedral;
    // wings tuck in a little on the upstroke
    const fold = 1 - 0.22 * Math.max(0, Math.cos(b.phase)) * Math.min(1, b.amp / s.amp);
    b.thR = th - b.bank; b.thL = th + b.bank;
    b.hsR = (s.span / 2) * Math.cos(b.thR) * fold;
    b.hsL = (s.span / 2) * Math.cos(b.thL) * fold;
    b.sweep = s.sweep + (1 - fold) * 0.9;
  }

  function toWorld(b: Bird, u: number, v: number): [number, number] {
    return [b.x + (u * b.cos - v * b.sin) * b.L, b.y + (u * b.sin + v * b.cos) * b.L];
  }

  // which part of the bird a point lands on (0 for none), with body coordinates left in S
  const S = { u: 0, v: 0, side: 1, t: 0, q: 0, k: 0, rr: 0 };
  function sample(b: Bird, px: number, py: number): number {
    const s = b.s, dx = px - b.x, dy = py - b.y;
    const u = (dx * b.cos + dy * b.sin) / b.L, v = (-dx * b.sin + dy * b.cos) / b.L, av = Math.abs(v);
    S.u = u; S.v = v; S.side = v >= 0 ? 1 : -1;
    const hu = u - HEAD_U;
    if (hu * hu + v * v < s.head * s.head) return HEAD;
    const bl = s.head + s.beak;
    if (u > HEAD_U && u < HEAD_U + bl && av < s.beakW * (1 - hu / bl)) return BEAK;
    const e = (u / BODY_A) ** 2;
    if (e < 1 && av < s.bodyW * Math.sqrt(1 - e)) { S.rr = v / (s.bodyW * Math.sqrt(Math.max(1e-3, 1 - e))); return BODY; }

    const k = (-TAIL_U - u) / s.tailLen;
    if (k >= 0 && k <= 1) {
      let hw: number, inside: boolean;
      if (s.tail === "fan") { hw = 0.06 + 0.1 * k; inside = av < hw && k <= 1 - 0.3 * (av / hw) ** 2; }
      else if (s.tail === "square") { hw = 0.06 + 0.04 * k; inside = av < hw; }
      else { hw = 0.05 + 0.08 * k; inside = av < hw && av > 0.13 * smooth(0.3, 1, k); }
      if (inside) { S.k = k; S.rr = v / hw; return TAIL; }
    }

    const hs = v >= 0 ? b.hsR : b.hsL;
    if (av < hs) {
      const t = av / hs;
      const le = WING_U + s.chord * 0.4 + s.wrist * Math.sin(Math.PI * Math.min(1, t / 0.85)) - b.sweep * t * t;
      let ch = s.pointed ? s.chord * (1 - 0.88 * Math.pow(t, 1.3)) : s.chord * (1 - 0.45 * Math.pow(t, 1.6));
      if (!s.pointed && t > 0.84) ch *= Math.sqrt(Math.max(0, 1 - ((t - 0.84) / 0.16) ** 2));
      if (u <= le && u >= le - ch) { S.t = t; S.q = (le - u) / ch; return t > 0.48 ? HAND : ARM; }
    }
    return 0;
  }

  function toneRole(t: Tone) {
    switch (t) {
      case "pale": return colors.light ? 4 : 1;
      case "mid": return 7;
      case "dense": return colors.light ? 1 : 4;
      case "orange": return 5;
      case "red": return 6;
      default: return 2;
    }
  }
  function toneRamp(t: Tone) {
    if (t === "pale") return colors.light ? ".:;" : ":;tS%X";
    if (t === "mid") return ";tS%X8";
    if (t === "dense") return "%X8#@";
    return "tS%X8#";
  }
  function toneAlpha(t: Tone, dark: number) {
    if (t === "pale") return colors.light ? 0.55 : 0.72 + 0.28 * dark;
    if (t === "mid") return 0.8 + 0.2 * dark;
    if (t === "dense") return 0.95;
    return 0.88 + 0.12 * dark;
  }

  const Hh = { u: 0, v: 0, side: 1, t: 0, q: 0, k: 0, rr: 0 };
  const covered: number[] = [];
  function rasterBird(b: Bird) {
    const s = b.s, R = b.L * Math.max(s.span / 2, 0.8) + cw * 2;
    const c0 = Math.max(0, Math.floor((b.x - R) / cw)), c1 = Math.min(cols - 1, Math.ceil((b.x + R) / cw));
    const r0 = Math.max(0, Math.floor((b.y - R) / CELL_H)), r1 = Math.min(rows - 1, Math.ceil((b.y + R) / CELL_H));
    const lx = -0.5, ly = -0.6, lz = 0.62;
    covered.length = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const idx = r * cols + c;
      if (chars[idx] && chars[idx] !== " ") continue;   // another bird already owns this cell
      let reg = sample(b, (c + 0.5) * cw, (r + 0.5) * CELL_H);
      if (reg) Object.assign(Hh, S);
      let n = 0, sx = 0, sy = 0;
      for (let k = 0; k < 4; k++) {
        const ox = SUB[k * 2], oy = SUB[k * 2 + 1], g = sample(b, (c + ox) * cw, (r + oy) * CELL_H);
        if (!g) continue;
        n++; sx += (ox - 0.5) * cw; sy += (oy - 0.5) * CELL_H;
        if (!reg) { reg = g; Object.assign(Hh, S); }
      }
      if (!reg) continue;
      covered.push(idx);

      const tone = s.paint(reg, Hh.u, Hh.t);
      const tr = toneRole(tone);
      let ch: string, ro = tr, al: number;
      if (n <= 2) {
        // silhouette edge: a line glyph following the outline
        ch = sx || sy ? contour(sx, sy) : dirChar(b.cos, b.sin);
        ro = tone === "orange" || tone === "red" || tone === "teal" ? tr : 1; al = 1;
      } else if (reg === HEAD && Math.abs(Hh.u - HEAD_U - 0.02) < 0.045 && Math.abs(Math.abs(Hh.v) - s.head * 0.62) < 0.03) {
        ch = "o"; ro = 3; al = 1;
      } else if ((reg === ARM || reg === HAND) && Hh.q > 0.62) {
        // flight feathers: streaks running back off the trailing edge, splaying toward the tip
        const du = -1, dv = Hh.side * (0.15 + 0.7 * Hh.t);
        ch = dirChar(du * b.cos - dv * b.sin, du * b.sin + dv * b.cos); al = 0.7;
      } else if (reg === TAIL && Hh.k > 0.35) {
        const du = -1, dv = Hh.rr * 0.35;
        ch = dirChar(du * b.cos - dv * b.sin, du * b.sin + dv * b.cos); al = 0.7;
      } else {
        let nx = 0, ny = 0, nz = 1;
        if (reg === BODY || reg === TAIL || reg === BEAK) {
          const rr = Math.max(-1, Math.min(1, Hh.rr * (reg === BODY ? 1 : 0.4)));
          nx = rr * -b.sin; ny = rr * b.cos; nz = Math.sqrt(1 - rr * rr);
        } else if (reg === HEAD) {
          const hu = (Hh.u - HEAD_U) / s.head, hv = Hh.v / s.head;
          nx = hu * b.cos - hv * b.sin; ny = hu * b.sin + hv * b.cos; nz = Math.sqrt(Math.max(0, 1 - hu * hu - hv * hv));
        } else {
          const th = Hh.side > 0 ? b.thR : b.thL, sv = -Hh.side * Math.sin(th);
          nx = sv * -b.sin; ny = sv * b.cos; nz = Math.cos(th);
        }
        let lit = Math.max(0, nx * lx + ny * ly + nz * lz);
        if (reg === ARM || reg === HAND) lit += 0.12 * (1 - Hh.q);
        const dark = Math.min(1, Math.max(0, 1 - lit)), ramp = toneRamp(tone);
        ch = ramp[Math.min(ramp.length - 1, Math.floor(dark * ramp.length))];
        al = toneAlpha(tone, dark);
      }
      chars[idx] = ch; role[idx] = ro; alpha[idx] = al;
    }
    clearAround();
  }

  // a little clear air around whatever was just drawn so trails and stars don't touch it
  function clearAround() {
    for (const idx of covered) {
      const c = idx % cols, r = (idx / cols) | 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
        const j = rr * cols + cc;
        if (!chars[j]) { chars[j] = " "; role[j] = 0; }
      }
    }
  }

  // ---- aircraft ---------------------------------------------------------------------------
  // now and then a stunt plane (sometimes doing a barrel roll) or a fighter jet crosses the sky,
  // above the birds; the jet's exhaust leaves a contrail that spreads, drifts and fades away

  function launch(kind: Craft["kind"]) {
    const L = Math.min(110, Math.max(60, W * 0.085)), R = L * 0.85;
    const dir = Math.random() < 0.5 ? 1 : -1, y = H * rand(0.12, 0.88);
    let tilt = rand(-0.28, 0.28);
    const endY = y + dir * W * Math.tan(tilt);
    if (endY < H * 0.06 || endY > H * 0.94) tilt = -tilt;
    const heading = (dir > 0 ? 0 : Math.PI) + tilt;
    const speed = kind === "jet" ? rand(190, 240) : rand(80, 100);
    const crossing = (W + 2 * R) / speed;
    crafts.push({
      kind, x: dir > 0 ? -R : W + R, y, heading, base: heading, L, speed, t: 0,
      roll: 0, rollAt: kind === "plane" && Math.random() < 0.7 ? crossing * rand(0.3, 0.55) : -1,
      rollDir: Math.random() < 0.5 ? 1 : -1, spin: 0, flick: 1, puffT: 0,
      cos: Math.cos(heading), sin: Math.sin(heading),
    });
  }

  function craftWorld(a: Craft, u: number, v: number): [number, number] {
    return [a.x + (u * a.cos - v * a.sin) * a.L, a.y + (u * a.sin + v * a.cos) * a.L];
  }

  // returns false once the craft has left the sky
  function stepCraft(a: Craft, dt: number) {
    a.t += dt;
    if (a.kind === "plane") {
      a.heading = a.base + 0.04 * Math.sin(a.t * 0.7);
      if (a.rollAt >= 0) a.roll = a.rollDir * 6.283 * smooth(a.rollAt, a.rollAt + 1.5, a.t);
      a.spin += dt * 31;
    } else {
      a.flick = rand(0.7, 1.15);
    }
    a.cos = Math.cos(a.heading); a.sin = Math.sin(a.heading);
    a.x += a.cos * a.speed * dt; a.y += a.sin * a.speed * dt;

    if (a.kind === "jet") {
      // exhaust puffs from both nozzles, one every few pixels of flight
      a.puffT -= dt;
      const pd = dirIndex(a.cos, a.sin);
      while (a.puffT <= 0) {
        a.puffT += 4 / a.speed;
        for (const side of [-1, 1]) {
          const [x, y] = craftWorld(a, -0.62, side * 0.05);
          puffs.push({ x, y, vx: 6 + rand(-6, 6), vy: rand(-6, 6), age: 0, life: rand(2.4, 3.4), d: pd });
        }
      }
      // faint vapour off the wingtips
      const sc = Math.max(0.1, Math.abs(Math.cos(a.roll))), di = dirIndex(a.cos, a.sin);
      for (const side of [-1, 1]) {
        const [x, y] = craftWorld(a, -0.31, side * 0.5 * sc), c = Math.floor(x / cw), r = Math.floor(y / CELL_H);
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const i = r * cols + c;
        wake[i] = Math.min(1, wake[i] + 3 * dt); wdir[i] = di;
      }
    }
    const m = a.L + 20;
    return !(a.x < -m - 40 || a.x > W + m + 40 || a.y < -m - 40 || a.y > H + m + 40) || a.t < 2;
  }

  // which part of the aircraft a point lands on (0 for none), with coordinates left in CS
  const CS = { u: 0, v: 0, rr: 0, t: 0 }, CH = { u: 0, v: 0, rr: 0, t: 0 };
  function sampleCraft(a: Craft, px: number, py: number): number {
    const dx = px - a.x, dy = py - a.y;
    const u = (dx * a.cos + dy * a.sin) / a.L, v = (-dx * a.sin + dy * a.cos) / a.L, av = Math.abs(v);
    const tv = av / Math.max(0.1, Math.abs(Math.cos(a.roll)));   // rolling foreshortens the wings
    CS.u = u; CS.v = v; CS.rr = 0; CS.t = 0;
    if (a.kind === "plane") {
      // propeller: the spinner, and a blade whose visible length pulses as it turns
      if (u > 0.41 && u < 0.47 && (av < 0.025 || (Math.abs(u - 0.44) < 0.02 && av < 0.2 * Math.abs(Math.cos(a.spin))))) return PROP;
      if (u > -0.5 && u < 0.42) {
        const hw = u > 0.3 ? 0.065 * Math.sqrt(Math.max(0, 1 - ((u - 0.3) / 0.12) ** 2)) : u > -0.05 ? 0.065 : 0.065 - 0.04 * ((-0.05 - u) / 0.45);
        if (av < hw) { CS.rr = v / hw; return u > 0.12 && u < 0.26 && av < 0.04 ? CANOPY : FUSE; }
      }
      if (u > 0 && u < 0.18 && tv < 0.68 && (tv < 0.6 || ((tv - 0.6) / 0.08) ** 2 + ((u - 0.09) / 0.09) ** 2 < 1)) { CS.t = tv / 0.68; return WING; }
      if (u > -0.5 && tv < 0.24 && u < -0.38 - 0.15 * tv) { CS.t = tv / 0.24; return STAB; }
      return 0;
    }
    // jet: afterburner, fuselage with canopy and twin nozzles, swept wings, tailplanes
    const fl = 0.16 * a.flick;
    if (u < -0.49 && u > -0.49 - fl) { const k = (-0.49 - u) / fl; if (Math.abs(av - 0.045) < 0.03 * (1 - k)) return FLAME; }
    if (u > -0.5 && u < 0.5) {
      const hw = u > 0.18 ? (0.075 * (0.5 - u)) / 0.32 : u > -0.28 ? 0.075 : 0.09;
      if (av < hw) {
        CS.rr = v / hw;
        if (u < -0.44) return NOZZLE;
        if (u > 0.1 && u < 0.3 && av < 0.035 * Math.sqrt(Math.max(0, 1 - ((u - 0.2) / 0.1) ** 2))) return CANOPY;
        return FUSE;
      }
    }
    const t = tv / 0.5;
    if (t <= 1 && u <= 0.1 - 0.4 * t && u >= -0.3 - 0.03 * t) { CS.t = t; return WING; }
    const t2 = tv / 0.24;
    if (t2 <= 1 && u <= -0.33 - 0.12 * t2 && u >= -0.48) { CS.t = t2; return STAB; }
    return 0;
  }

  function craftTone(a: Craft, reg: number, u: number, t: number): Tone {
    if (reg === FLAME) return u > -0.56 ? "orange" : "red";
    if (reg === CANOPY) return "teal";
    if (reg === PROP || reg === NOZZLE) return "dense";
    if (a.kind === "plane") {
      // red and white stunt livery
      if (reg === STAB || (reg === WING && t > 0.72) || (reg === FUSE && (u > 0.3 || (u > -0.26 && u < -0.16)))) return "red";
      return "pale";
    }
    return reg === FUSE ? "pale" : "mid";
  }

  function rasterCraft(a: Craft) {
    const R = a.L * 0.85 + cw * 2;
    const c0 = Math.max(0, Math.floor((a.x - R) / cw)), c1 = Math.min(cols - 1, Math.ceil((a.x + R) / cw));
    const r0 = Math.max(0, Math.floor((a.y - R) / CELL_H)), r1 = Math.min(rows - 1, Math.ceil((a.y + R) / CELL_H));
    if (c0 > c1 || r0 > r1) return;
    const lx = -0.5, ly = -0.6, lz = 0.62, latX = -a.sin, latY = a.cos;
    covered.length = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const idx = r * cols + c;
      if (chars[idx] && chars[idx] !== " ") continue;   // birds fly below, so they stay in front
      let reg = sampleCraft(a, (c + 0.5) * cw, (r + 0.5) * CELL_H);
      if (reg) Object.assign(CH, CS);
      let n = 0, sx = 0, sy = 0;
      for (let k = 0; k < 4; k++) {
        const ox = SUB[k * 2], oy = SUB[k * 2 + 1], g = sampleCraft(a, (c + ox) * cw, (r + oy) * CELL_H);
        if (!g) continue;
        n++; sx += (ox - 0.5) * cw; sy += (oy - 0.5) * CELL_H;
        if (!reg) { reg = g; Object.assign(CH, CS); }
      }
      if (!reg) continue;
      covered.push(idx);

      const tone = craftTone(a, reg, CH.u, CH.t), tr = toneRole(tone);
      let ch: string, ro = tr, al: number;
      if (reg === FLAME) {
        ch = "*#%+"[Math.floor(Math.random() * 4)]; al = 0.9;
      } else if (reg === PROP) {
        ch = dirChar(latX, latY); al = 0.85;
      } else if (n <= 2) {
        ch = sx || sy ? contour(sx, sy) : dirChar(a.cos, a.sin);
        ro = tone === "orange" || tone === "red" || tone === "teal" ? tr : 1; al = 1;
      } else {
        // fuselage as a cylinder, wings as flat panels, all tilted by the roll
        let nl: number, nz: number;
        if (reg === FUSE || reg === CANOPY || reg === NOZZLE) {
          const phi = Math.asin(Math.max(-1, Math.min(1, CH.rr))) + a.roll; nl = Math.sin(phi); nz = Math.cos(phi);
        } else { nl = Math.sin(a.roll); nz = Math.cos(a.roll); }
        const lit = Math.max(0, nl * (latX * lx + latY * ly) + nz * lz);
        const dark = Math.min(1, Math.max(0, 1 - lit)), ramp = toneRamp(tone);
        ch = ramp[Math.min(ramp.length - 1, Math.floor(dark * ramp.length))];
        al = toneAlpha(tone, dark);
      }
      chars[idx] = ch; role[idx] = ro; alpha[idx] = al;
    }
    clearAround();
  }

  function stepAircraft(dt: number) {
    if (!reduced) {
      if (time > nextPlane) { launch("plane"); nextPlane = Infinity; }
      if (time > nextJet) { launch("jet"); nextJet = Infinity; }
    }
    crafts = crafts.filter((a) => {
      if (stepCraft(a, dt)) return true;
      if (a.kind === "plane") nextPlane = time + rand(22, 40); else nextJet = time + rand(28, 50);
      return false;
    });
    for (const a of crafts) rasterCraft(a);

    // contrail: each puff grows and thins as it ages, drifting on the wind until it's gone
    vapor.fill(0);
    puffs = puffs.filter((p) => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.age < p.life; });
    for (const p of puffs) {
      const k = p.age / p.life, rad = 3 + 10 * k, str = Math.pow(1 - k, 1.3) * Math.min(1, p.age / 0.08) * 0.85;
      const c0 = Math.max(0, Math.floor((p.x - rad) / cw)), c1 = Math.min(cols - 1, Math.floor((p.x + rad) / cw));
      const r0 = Math.max(0, Math.floor((p.y - rad) / CELL_H)), r1 = Math.min(rows - 1, Math.floor((p.y + rad) / CELL_H));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const d = Math.hypot((c + 0.5) * cw - p.x, (r + 0.5) * CELL_H - p.y) / rad;
        if (d < 1) { const i = r * cols + c; vapor[i] = Math.min(1, vapor[i] + str * (1 - d * d)); vdir[i] = p.d; }
      }
    }
  }

  // ---- sun, moon and shooting stars --------------------------------------------------------

  // draws the sun (light) or moon (dark) into an open-sky cell; false when the cell misses it
  function paintCelestial(i: number, px: number, py: number) {
    const dx = px - celX, dy = py - celY, d = Math.hypot(dx, dy) / celR, rim = (cw * 0.9) / celR;
    if (colors.light) {
      if (d < 1) {
        if (d > 1 - rim) { chars[i] = contour(dx, dy); role[i] = 5; alpha[i] = 1; }
        else {
          // bright core, deeper toward the limb, with a slow shimmer
          const k = Math.min(0.99, Math.max(0, 0.15 + 0.75 * d + 0.08 * Math.sin(time * 1.6 + dx * 0.2 + dy * 0.3)));
          chars[i] = ":;tS%X8#"[Math.floor(k * 8)]; role[i] = 5; alpha[i] = 0.75 + 0.25 * k;
        }
        return true;
      }
      // twelve rays, long and short, slowly turning and breathing
      if (d > 1.25 && d < 2.05) {
        const step = (Math.PI * 2) / 12, a = Math.atan2(dy, dx) - time * 0.12, k = Math.round(a / step);
        const across = Math.abs(a - k * step) * d * celR;
        const len = (k % 2 ? 1.6 : 1.95) + 0.08 * Math.sin(time * 2 + k);
        if (across < cw * 0.65 && d < len) { chars[i] = dirChar(dx, dy); role[i] = 5; alpha[i] = 0.55 + 0.3 * (1 - (d - 1.25) / 0.8); return true; }
      }
      return false;
    }
    if (d < 1) {
      // crescent: the disc minus a shadow disc offset to the upper right, with faint earthshine
      const sx = dx - celR * 0.85, sy = dy + celR * 0.35, shadow = Math.hypot(sx, sy) / celR;
      if (shadow < 0.95) { chars[i] = d > 1 - rim ? contour(dx, dy) : "."; role[i] = 4; alpha[i] = d > 1 - rim ? 0.35 : 0.16; return true; }
      if (d > 1 - rim) { chars[i] = contour(dx, dy); role[i] = 1; alpha[i] = 1; return true; }
      if (shadow < 0.95 + rim) { chars[i] = contour(sx, sy); role[i] = 1; alpha[i] = 0.8; return true; }
      // maria and craters as darker patches
      const crater = noise(dx / 9 + 11, dy / 7 + 3) > 0.62;
      const k = Math.min(0.99, 0.2 + 0.5 * d);
      chars[i] = crater ? "o%"[Math.floor(hash(px, py) * 2)] : ":;tS"[Math.floor(k * 4)];
      role[i] = crater ? 7 : 1; alpha[i] = crater ? 0.85 : 0.7 + 0.3 * k;
      return true;
    }
    // a soft halo
    if (d < 1.55 && hash(px * 0.37, py * 0.53) < 0.4) { chars[i] = "."; role[i] = 4; alpha[i] = 0.3 * (1.55 - d) / 0.55; return true; }
    return false;
  }

  // a shooting star streaking down across the upper sky, every 45 to 60 seconds at night
  function stepMeteor(dt: number) {
    if (colors.light || reduced) { meteor = null; return; }
    if (!meteor && time >= nextMeteor) {
      // start beside the photo and head away from it, so the streak stays in open sky
      const right = Math.random() < 0.5, ang = right ? rand(0.55, 0.85) : Math.PI - rand(0.55, 0.85);
      const room = right ? W - box.x1 : box.x0;
      meteor = {
        x: room > 140 ? (right ? box.x1 + room * rand(0, 0.55) : box.x0 * rand(0.45, 1)) : W * rand(0.2, 0.8),
        y: H * rand(0.03, 0.25),
        ux: Math.cos(ang), uy: Math.sin(ang), speed: rand(650, 900), t: 0, life: rand(0.8, 1.1), len: rand(150, 230),
      };
      nextMeteor = time + rand(45, 60);
    }
    const m = meteor;
    if (!m) return;
    m.t += dt; m.x += m.ux * m.speed * dt; m.y += m.uy * m.speed * dt;
    if (m.t > m.life) { meteor = null; return; }
    const fade = Math.min(1, m.t / 0.1) * (1 - smooth(m.life * 0.6, m.life, m.t)), glyph = dirChar(m.ux, m.uy);
    const put = (x: number, y: number, ch: string, al: number) => {
      const c = Math.floor(x / cw), r = Math.floor(y / CELL_H);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const i = r * cols + c;
      if (chars[i] && chars[i] !== " ") return;   // birds and aircraft stay in front
      chars[i] = ch; role[i] = 1; alpha[i] = al;
    };
    // tail first, so the head wins its cell
    for (let s = m.len; s > cw * 0.8; s -= cw * 0.6) {
      const k = 1 - s / m.len;
      put(m.x - m.ux * s, m.y - m.uy * s, s < m.len * 0.6 ? glyph : ".", fade * Math.min(1, 0.15 + Math.pow(k, 0.8)));
    }
    // a little glint around the head
    for (const [ox, oy] of [[-cw, 0], [cw, 0], [0, -CELL_H], [0, CELL_H]]) put(m.x + ox, m.y + oy, "+", fade * 0.35);
    put(m.x, m.y, "*", fade);
  }

  // wingtip trails
  function stampTips(b: Bird, dt: number) {
    const s = b.s, tipU = WING_U + s.chord * 0.4 - b.sweep - s.chord * 0.25, di = dirIndex(b.cos, b.sin);
    for (const hs of [b.hsR, -b.hsL]) {
      const [x, y] = toWorld(b, tipU, hs), c = Math.floor(x / cw), r = Math.floor(y / CELL_H);
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      const i = r * cols + c;
      wake[i] = Math.min(1, wake[i] + 2.4 * dt); wdir[i] = di;
    }
  }

  // how well a warmed-up sky shows off its birds: the worst bird's share of body in open sky
  // (on screen, not behind the photo), zeroed if any two are crowded together
  function openSkyScore() {
    let worst = 1;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i], pts = [toWorld(b, 0, 0), toWorld(b, HEAD_U, 0), toWorld(b, -TAIL_U - b.s.tailLen, 0),
        toWorld(b, 0, b.s.span / 2), toWorld(b, 0, -b.s.span / 2)];
      let seen = 0;
      for (const [x, y] of pts) {
        const m = 24;
        if (x > m && x < W - m && y > m && y < H - m && !(x > box.x0 - m && x < box.x1 + m && y > box.y0 - m && y < box.y1 + m)) seen++;
      }
      worst = Math.min(worst, seen / pts.length);
      for (let k = 0; k < i; k++) if (Math.hypot(b.x - birds[k].x, b.y - birds[k].y) < W * 0.15) return 0;
    }
    return worst;
  }

  // let the sky run for a few unseen seconds so the birds are mid-flight on the first frame,
  // keeping the first run (out of a handful) where every bird is in open sky and spread apart
  function settle() {
    let best: Bird[] | null = null, bestScore = -1;
    for (let attempt = 0; attempt < 80 && bestScore < 1; attempt++) {
      makeBirds();
      const steps = 180 + Math.floor(Math.random() * 300);
      for (let i = 0; i < steps; i++) for (const b of birds) stepBird(b, 1 / 60);
      const score = openSkyScore();
      if (score > bestScore) { bestScore = score; best = birds; }
    }
    birds = best ?? birds;
  }

  // ---- the rest of the sky ----------------------------------------------------------------

  // a far-off flock in a V, crossing now and then
  function stepFlock(dt: number) {
    if (!flock) {
      if (time < nextFlock || reduced) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const top = Math.random() < 0.65;
      flock = {
        x: dir > 0 ? -80 : W + 80, y: H * (top ? rand(0.07, 0.22) : rand(0.8, 0.9)),
        heading: (dir > 0 ? 0 : Math.PI) + rand(-0.12, 0.12), speed: rand(40, 52), n: 5 + Math.floor(Math.random() * 3), t: 0,
      };
    }
    const f = flock;
    f.t += dt; f.x += Math.cos(f.heading) * f.speed * dt; f.y += Math.sin(f.heading) * f.speed * dt;
    if (f.x < -160 || f.x > W + 160) { flock = null; nextFlock = time + rand(10, 26); return; }
    const c = Math.cos(f.heading), s = Math.sin(f.heading);
    for (let i = 0; i < f.n; i++) {
      const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1, back = rank * 18, lat = side * rank * 13;
      const x = f.x - c * back - s * lat, y = f.y - s * back + c * lat + Math.sin(f.t * 1.3 + i) * 1.5;
      const col = Math.floor(x / cw), row = Math.floor(y / CELL_H);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const idx = row * cols + col;
      if (chars[idx]) continue;
      chars[idx] = Math.sin(f.t * 6 + i * 0.9) > -0.2 ? "v" : "-"; role[idx] = 7; alpha[idx] = 0.65;
    }
  }

  function stampRing(rp: Ring) {
    const steps = Math.max(8, Math.floor((rp.r * 6.28) / cw));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * 6.28, c = Math.floor((rp.x + Math.cos(a) * rp.r) / cw), r = Math.floor((rp.y + Math.sin(a) * rp.r * 0.8) / CELL_H);
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      const idx = r * cols + c;
      if (chars[idx] && chars[idx] !== " ") continue;
      chars[idx] = rp.life > 0.6 ? "o" : "."; role[idx] = 7; alpha[idx] = Math.min(0.8, rp.life);
    }
  }

  function frame(dt: number) {
    time += dt;
    const total = cols * rows;
    for (let i = 0; i < total; i++) chars[i] = null;
    role.fill(0);
    const decay = Math.exp(-dt * 1.6);
    for (let w = 0; w < total; w++) wake[w] *= decay;

    for (const b of birds) { stepBird(b, dt); stampTips(b, dt); }
    for (const b of birds) rasterBird(b);
    stepAircraft(dt);
    stepFlock(dt);
    stepMeteor(dt);

    seeds = seeds.filter((p) => {
      p.age += dt; p.y += 12 * dt; p.x += Math.sin(p.age * 2.2 + p.sway) * 10 * dt;
      return !p.eaten && p.age < 14 && p.y < H + 10;
    });
    for (const p of seeds) {
      const c = Math.floor(p.x / cw), r = Math.floor(p.y / CELL_H);
      if (c >= 0 && c < cols && r >= 0 && r < rows) { const i = r * cols + c; chars[i] = "*"; role[i] = 5; alpha[i] = 1; }
    }
    rings = rings.filter((rp) => { rp.r += 26 * dt; rp.life -= 0.45 * dt; return rp.life > 0.05; });
    for (const rp of rings) stampRing(rp);

    // open sky: contrails, wingtip trails, then slow-drifting clouds, then stars
    const drift = time * 9;
    for (let i = 0; i < total; i++) {
      if (chars[i]) continue;
      const vp = vapor[i];
      if (vp > 0.07) {
        // a solid line at the fresh core, softening to wisps and dots as it spreads
        chars[i] = vp > 0.6 ? (vdir[i] === 0 ? "=" : DIRS[vdir[i]]) : vp > 0.38 ? "~" : vp > 0.2 ? ":" : ".";
        role[i] = !colors.light && vp > 0.45 ? 1 : 7; alpha[i] = 0.2 + 0.6 * vp;
        continue;
      }
      if (wake[i] > 0.06) { chars[i] = wake[i] > 0.3 ? DIRS[wdir[i]] : "."; role[i] = 2; alpha[i] = Math.min(0.6, wake[i] * 1.2); continue; }
      const x = (i % cols) * cw, y = ((i / cols) | 0) * CELL_H;
      const px = x + cw / 2, py = y + CELL_H / 2;
      if (Math.abs(px - celX) < celR * 2.1 && Math.abs(py - celY) < celR * 2.1 && paintCelestial(i, px, py)) continue;
      const n = 0.65 * noise((x + drift) / 120, y / 60) + 0.35 * noise((x + drift * 1.4) / 45, y / 24);
      if (n > 0.6) {
        const k = Math.min(1, (n - 0.6) / 0.26);
        chars[i] = CLOUD[Math.min(CLOUD.length - 1, Math.floor(k * CLOUD.length))]; role[i] = k > 0.55 ? 7 : 4; alpha[i] = 0.2 + 0.32 * k;
        continue;
      }
      const d = dots[i];
      if (d) {
        if (colors.light) { chars[i] = "."; role[i] = 4; alpha[i] = 0.32; }
        else {
          chars[i] = d > 0.93 ? "+" : "."; role[i] = 4;
          alpha[i] = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time * (0.8 + d) + d * 40));
        }
      }
    }
    draw();
  }

  function draw() {
    const fills = [null, colors.text, colors.link, colors.text, colors.dim, colors.orange, colors.red, colors.mid];
    ctx!.globalAlpha = 1;
    ctx!.fillStyle = colors.bg; ctx!.fillRect(0, 0, W, H);
    for (let pass = 1; pass < fills.length; pass++) {
      ctx!.fillStyle = fills[pass]!;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (role[i] !== pass || !ch || ch === " ") continue;
        ctx!.globalAlpha = alpha[i];
        ctx!.fillText(ch, (i % cols) * cw, ((i / cols) | 0) * CELL_H);
      }
    }
    ctx!.globalAlpha = 1;
  }

  // ---- input and lifecycle ----------------------------------------------------------------

  function toLocal(e: PointerEvent | MouseEvent) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onMove(e: PointerEvent) {
    const p = toLocal(e);
    if (!lastRing || Math.hypot(p.x - lastRing.x, p.y - lastRing.y) > 46) { rings.push({ x: p.x, y: p.y, r: 2, life: 0.55 }); lastRing = p; }
  }
  function onClick(e: MouseEvent) {
    const p = toLocal(e);
    if (inPhoto(p.x, p.y)) return;
    for (let i = 0; i < 3; i++) seeds.push({ x: p.x + (Math.random() - 0.5) * 22, y: p.y + (Math.random() - 0.5) * 14, age: 0, sway: Math.random() * 6.28 });
    rings.push({ x: p.x, y: p.y, r: 3, life: 1 });
    if (seeds.length > 18) seeds.splice(0, seeds.length - 18);
    if (reduced) frame(0.001);
  }
  function onResize() { if (booted) { resize(); frame(0.001); } }

  function boot() {
    if (destroyed || booted) return;
    booted = true;
    readColors(); resize(); settle();
    if (!colors.light) nextMeteor = rand(2, 9);
    frame(1 / 60);
    if (reduced) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("click", onClick);
  window.addEventListener("resize", onResize);
  // the theme toggle swaps palettes without restarting the sky
  const themeWatch = new MutationObserver(() => {
    const wasLight = colors?.light;
    readColors();
    // switching to night brings a shooting star within the first ten seconds
    if (wasLight && !colors.light) { meteor = null; nextMeteor = time + rand(2, 9); }
    if (booted && reduced) frame(0.001);
  });
  themeWatch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => {
    if (photo.complete) boot();
    else { photo.addEventListener("load", boot, { once: true }); photo.addEventListener("error", boot, { once: true }); }
  });

  return () => {
    destroyed = true;
    cancelAnimationFrame(raf);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("click", onClick);
    window.removeEventListener("resize", onResize);
    photo.removeEventListener("load", boot);
    photo.removeEventListener("error", boot);
    themeWatch.disconnect();
  };
}
