// Scene engine for the ascii-scenes mod: a tiny character canvas plus 12 animated
// scenes. Pure functions of (frame number, canvas size): nothing here touches `$`.

export type Run = { text: string; color?: string }
export type Ctx = { working: boolean }
export type Scene = { id: string; label: string; draw: (c: Canvas, t: number, x: Ctx) => void }

// Mid-tone colors that stay readable on both light and dark themes.
const K = {
  green: '#43a047', leaf: '#2e7d32', brown: '#a1887f', wood: '#8d6e63',
  blue: '#42a5f5', deep: '#1e88e5', sea: '#26a6d1', yellow: '#f9a825',
  orange: '#fb8c00', red: '#ef5350', pink: '#ec407a', gray: '#9e9e9e',
  cloud: '#90a4ae', purple: '#ab47bc', teal: '#26a69a', night: '#7986cb',
  snow: '#64b5f6', hay: '#d4a017',
}

const hs = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.min(1, Math.max(0, u))
const wrap = (v: number, m: number) => ((v % m) + m) % m

export class Canvas {
  w: number
  h: number
  ch: string[]
  co: string[]
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.ch = new Array(w * h).fill(' ')
    this.co = new Array(w * h).fill('')
  }
  put(x: number, y: number, c: string, k = '') {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    this.ch[i] = c
    this.co[i] = k
  }
  txt(x: number, y: number, s: string, k = '', map?: Record<string, string>) {
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.put(x + i, y, s[i], map?.[s[i]] ?? k)
  }
  spr(x: number, y: number, lines: string[], k = '', map?: Record<string, string>) {
    for (let i = 0; i < lines.length; i++) this.txt(x, y + i, lines[i], k, map)
  }
  // Like spr, but blanks inside the sprite cover what is behind it.
  solid(x: number, y: number, lines: string[], k = '', map?: Record<string, string>) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].replace(/\s+$/, '')
      const lead = l.length - l.replace(/^\s+/, '').length
      for (let j = lead; j < l.length; j++) this.put(x + j, y + i, l[j], map?.[l[j]] ?? k)
    }
  }
  runs(): Run[][] {
    const out: Run[][] = []
    for (let y = 0; y < this.h; y++) {
      const row: Run[] = []
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x
        const color = this.co[i] || undefined
        const last = row[row.length - 1]
        if (last && last.color === color) last.text += this.ch[i]
        else row.push({ text: this.ch[i], color })
      }
      out.push(row)
    }
    return out
  }
}

const MIR: Record<string, string> = {
  '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[',
  '{': '}', '}': '{', d: 'b', b: 'd', '`': "'", "'": '`',
}
export const flip = (lines: string[]) => {
  const w = Math.max(...lines.map(l => l.length))
  return lines.map(l =>
    [...l.padEnd(w)].reverse().map(ch => MIR[ch] ?? ch).join(''),
  )
}

const floor = (c: Canvas, y: number, k: string, pat = '_', off = 0) => {
  for (let x = 0; x < c.w; x++) c.put(x, y, pat[wrap(x + off, pat.length)], k)
}

const bubble = (c: Canvas, x: number, y: number, s: string, k: string) => {
  const n = s.length + 2
  c.txt(x, y, '.' + '-'.repeat(n) + '.', k)
  c.txt(x, y + 1, '| ' + s + ' |', k)
  c.txt(x, y + 2, "'-v" + '-'.repeat(Math.max(0, n - 2)) + "'", k)
}

const cloud = (c: Canvas, x: number, y: number, k = K.cloud) =>
  c.spr(x, y, ['  .--.   ', ' (    ).-.', '(______)  )'], k)

// ------------------------------------------------------------------ CAT
const CAT_WALK = [
  [' /\\_/\\ ', '( o.o )', ' > ^ < ', '  u u  '],
  [' /\\_/\\ ', '( o.o )', ' > ^ < ', ' u   u '],
]
const CAT_SIT = [' /\\_/\\ ', '( o.o )', ' > ^ < ', ' /   \\ ', '(_|_|_)']
const CAT_SLEEP = [' /\\_/\\    ', '( -.- )___ ', '(________)~']

const cat = (c: Canvas, t: number) => {
  const w = c.w, g = c.h - 1, P = 150, u = t % P
  floor(c, g, K.brown)
  c.spr(2, g - 3, ['\\|/', ' | ', '[_]'], K.green, { '[': K.wood, '_': K.wood, ']': K.wood })
  c.txt(w - 7, g - 1, '(@)', K.red)
  c.txt(w - 6, g - 2, '~', K.red)
  const L = 9, R = Math.max(L + 6, w - 17), C = Math.round(w / 2 - 4)
  const k = K.orange
  if (u < 30) {
    c.spr(C, g - 3, CAT_SLEEP, k, { '-': K.gray })
    for (let i = 0; i < 3; i++) {
      c.put(C + 11 + i * 2, g - 4 - ((((t >> 1) + i * 2) % 3) | 0), i % 2 ? 'Z' : 'z', K.purple)
    }
    return
  }
  if (u >= 55 && u < 80) {
    const blink = (u - 55) % 18 < 2
    const sit = CAT_SIT.map((l, i) => (i === 1 && blink ? '( -.- )' : l))
    c.spr(L, g - 5, sit, k)
    c.put(L + 7, g - 2, t % 6 < 3 ? '~' : '-', k)
    if (u >= 64 && u < 76) bubble(c, L + 9, g - 6, 'meo', K.gray)
    return
  }
  let x = C
  if (u < 55) x = lerp(C, L, (u - 30) / 25)
  else if (u < 125) x = lerp(L, R, (u - 80) / 45)
  else x = lerp(R, C, (u - 125) / 25)
  x = Math.round(x)
  c.spr(x, g - 4, CAT_WALK[(t >> 1) & 1], k)
  c.put(x + 7, g - 2, t % 4 < 2 ? '~' : '-', k)
}

// ---------------------------------------------------------------- MOUSE
const MOUSE_L = [
  [' ()_()   ', '(._.  )~~', '  u u   '],
  [' ()_()   ', '(._.  )~~', ' u   u  '],
]
const CHEESE = ['  ___  ', ' /o  \\ ', '/__o__\\']

const mouse = (c: Canvas, t: number) => {
  const w = c.w, g = c.h - 1, P = 170, u = t % P
  floor(c, g, K.brown)
  const hx = 1
  c.spr(hx, g - 2, [' .-. ', '(   )'], K.gray)
  if (u < 12 || u >= 140) {
    if (u % 10 < 7) c.txt(hx + 1, g - 1, '. .', K.yellow)
  }
  const cx = Math.max(hx + 20, w - 12)
  const stage = u < 62 ? 0 : Math.min(4, 1 + Math.floor((u - 62) / 12))
  if (stage < 4) {
    c.spr(cx, g - 3, CHEESE.map(l => l.slice(0, Math.max(0, l.length - (stage ? stage * 2 : 0)))), K.yellow, { o: K.orange })
  } else {
    c.txt(cx, g - 1, '. :', K.yellow)
  }
  if (u >= 12 && u < 62) {
    const x = Math.round(lerp(hx + 4, cx - 8, (u - 12) / 50))
    c.spr(x, g - 3, flip(MOUSE_L[(t >> 1) & 1]), K.gray)
  } else if (u >= 62 && u < 110) {
    const bob = (t >> 1) & 1
    c.spr(cx - 8, g - 3 + (bob && u < 62 + 48 ? 0 : 0), flip(MOUSE_L[bob]), K.gray)
    if (t % 6 < 2) c.put(cx - 1, g - 4, '.', K.yellow)
  } else if (u >= 110 && u < 140) {
    const x = Math.round(lerp(cx - 8, hx + 2, (u - 110) / 30))
    c.spr(x, g - 3, MOUSE_L[(t >> 1) & 1], K.gray)
  }
}

// -------------------------------------------------------------- CHICKEN
// Drawn facing left; flipped when walking right.
const HEN_L = [
  '  ,~.       ',
  ' <(o )      ',
  '  /   \\___  ',
  ' (_______ ) ',
  '   d  b     ',
]
const HEN_PECK_L = [
  '            ',
  '  ,~.       ',
  ' <(o ) \\___ ',
  ' (_______ ) ',
  '   d  b     ',
]

const chicken = (c: Canvas, t: number) => {
  const w = c.w, g = c.h - 1, P = 160, u = t % P
  floor(c, g, K.green, '"\'')
  for (let i = 0; i < 6; i++) {
    const gx = 6 + Math.floor(hs(i + 3) * (w - 12))
    if (!(u > 60 + i * 8 && u < 100)) c.put(gx, g - 1, '.', K.hay)
  }
  const R = w - 15
  let x = 2, peck = false
  if (u < 50) x = lerp(2, R, u / 50)
  else if (u < 100) { x = R; peck = true }
  else if (u < 150) x = lerp(R, 2, (u - 100) / 50)
  x = Math.round(x)
  const frame = (t >> 1) & 1
  let sp = HEN_L.map((l, i) => (i === 4 && frame ? '  d   b    ' : l))
  if (peck && (t >> 1) % 3 === 0) sp = HEN_PECK_L
  if (u < 100) sp = flip(sp)
  c.spr(x, g - 5, sp, K.orange, { o: K.gray, '>': K.yellow, '<': K.yellow, ',': K.red, '~': K.red, '.': K.red })
  if (peck && (t >> 1) % 3 === 0) c.put(x + 9, g - 1, '*', K.hay)
  if (u >= 150) {
    const v = u - 150
    if (v > 2) bubble(c, x + 12, g - 8, 'cluck', K.gray)
    if (v > 6) c.put(x + 14, g - 1, 'o', K.hay)
  }
}

// ------------------------------------------------------------------ COW
const COW_L = [
  ' \\ /   __________   ',
  ' (oo)_|  ::  ::  |~ ',
  '  \\/  |   ::      |) ',
  '      |__________|   ',
  '       || ||  || ||  ',
]

const cow = (c: Canvas, t: number) => {
  const w = c.w, g = c.h - 1, P = 200, u = t % P
  floor(c, g, K.green, '"\'`')
  for (let i = 0; i < 4; i++) {
    const fx = 4 + Math.floor(hs(i + 11) * (w - 8))
    c.put(fx, g, '*', [K.pink, K.yellow, K.red, K.purple][i])
  }
  const x = Math.round(w / 2 - 9 + Math.sin(t / 60) * Math.max(0, w / 2 - 22))
  const grazing = u > 40 && u < 120
  const chew = grazing && (t >> 1) % 2 === 0
  const lines = COW_L.map((l, i) => (i === 1 && chew ? l.replace('(oo)', '(o-)') : l))
  c.spr(x, g - 5, lines, K.brown, { o: K.gray, ':': K.gray, '|': K.wood, '_': K.wood })
  c.put(x + 19, g - 4, t % 8 < 4 ? '~' : '-', K.brown)
  if (u >= 150 && u < 175) bubble(c, x + 3, Math.max(0, g - 8), 'moo~', K.gray)
  if (grazing && t % 10 < 5) c.txt(x + 1, g - 1, '"', K.green)
  const fa = t / 3
  c.put(x + 9 + Math.cos(fa) * 6, g - 6 + Math.sin(fa * 1.7) * 1.2, 'o', K.gray)
}

// ------------------------------------------------------------------ BOT
// An original little helper robot (not a character from anywhere).
const bot = (c: Canvas, t: number, ctx: Ctx) => {
  const w = c.w, g = c.h - 1
  floor(c, g, K.gray, '=-')
  const working = ctx.working
  const x = working ? Math.round(w / 2 - 3) : Math.round(w / 2 - 3 + Math.sin(t / 25) * Math.max(0, w / 2 - 14))
  const blink = t % 24 < 2
  const eye = working ? '^' : blink ? '-' : 'o'
  const spark = ['*', '+', '.', '+'][t % 4]
  const step = !working && (t >> 1) % 2
  const body = [
    `   ${spark}   `,
    ' .---. ',
    ` |${eye} ${eye}| `,
    working ? ' |_o_| ' : t % 40 < 8 ? ' |_o_| ' : ' |___| ',
    step ? ' d   b ' : '  d b  ',
  ]
  c.spr(x, g - 5, body, K.teal, { [eye]: K.yellow, '*': K.yellow, '+': K.yellow, o: K.yellow })
  if (!working && t % 90 > 70) {
    c.put(x - 1, g - 3 - (t % 4 < 2 ? 0 : 1), '\\', K.teal)
    c.put(x + 7, g - 3 - (t % 4 < 2 ? 1 : 0), '/', K.teal)
  }
  if (working) {
    const spin = '|/-\\'[t % 4]
    bubble(c, x + 8, Math.max(0, g - 6), `${spin} ${'.'.repeat(1 + (t >> 2) % 3)}`.padEnd(5), K.gray)
    c.txt(x - 9, g - 2, `[${'#'.repeat((t >> 1) % 6)}${'.'.repeat(6 - ((t >> 1) % 6))}]`, K.teal)
  } else if (t % 120 > 100) {
    bubble(c, x + 8, Math.max(0, g - 6), '<3', K.pink)
  } else if (t % 120 > 60 && t % 120 < 72) {
    bubble(c, x + 8, Math.max(0, g - 6), 'hi!', K.gray)
  }
}

// ------------------------------------------------------------------ SEA
const BOAT = ['    |\\   ', '    | \\  ', ' ___|__\\_ ', ' \\______/ ']
const sea = (c: Canvas, t: number) => {
  const w = c.w, h = c.h
  const y0 = Math.max(3, h - 4)
  // sun
  const sx = Math.round(w * 0.8)
  c.spr(sx - 2, 0, t % 8 < 4 ? ['\\ | /', '-(@)-', '/ | \\'] : [' \\|/ ', ' (@) ', ' /|\\ '], K.yellow)
  cloud(c, Math.round(wrap(t * 0.25, w + 20) - 10), 0, K.cloud)
  cloud(c, Math.round(wrap(t * 0.15 + 40, w + 20) - 10), 1, K.cloud)
  // gulls
  for (let i = 0; i < 2; i++) {
    const gx = wrap(t * (0.5 + i * 0.2) + i * 30, w + 8) - 4
    c.put(gx, 1 + i * 2 + Math.sin(t / 4 + i), (t >> 1) % 2 ? 'v' : '^', K.gray)
  }
  // waves
  for (let r = 0; r < h - y0; r++) {
    const y = y0 + r
    for (let x = 0; x < w; x++) {
      const v = Math.sin((x + t * (0.6 + r * 0.25)) * 0.45 + r * 1.7)
      if (v > 0.55) c.put(x, y, '~', r === 0 ? K.blue : K.sea)
      else if (v > -0.2) c.put(x, y, r % 2 ? '-' : '~', r % 2 ? K.deep : K.sea)
      else if (v > -0.7 && r > 1) c.put(x, y, '.', K.deep)
    }
  }
  // boat
  const bx = Math.round(wrap(t * 0.4, w + 14) - 10)
  const bob = Math.round(Math.sin(t / 5))
  c.solid(bx, y0 - 3 + bob, BOAT, K.wood, { '|': K.gray, '\\': K.cloud, '/': K.cloud })
}

// ------------------------------------------------------------- MOUNTAIN
const mountain = (c: Canvas, t: number) => {
  const w = c.w, h = c.h
  const far = (x: number) => h * 0.4 + Math.sin(x * 0.09 + 1) * 2.2 + Math.sin(x * 0.21) * 1.1
  const near = (x: number) => h * 0.7 + Math.sin(x * 0.12 + 4) * 1.5 + Math.sin(x * 0.33) * 0.6
  // sun crossing, then moon
  const cyc = 520, u = t % cyc, isDay = u < 360
  const px = Math.round(lerp(4, w - 6, (isDay ? u / 360 : (u - 360) / 160)))
  const py = Math.round(1 + Math.pow(((isDay ? u / 360 : (u - 360) / 160) - 0.5) * 2, 2) * 2)
  c.txt(px - 1, py, isDay ? '(@)' : '(c)', isDay ? K.yellow : K.night)
  cloud(c, Math.round(wrap(t * 0.2, w + 16) - 9), 0, K.cloud)
  const ridge = (f: (x: number) => number, x: number) => {
    const a = Math.round(f(x - 1)), b = Math.round(f(x)), d = Math.round(f(x + 1))
    return b < a && b < d ? '^' : d < a ? '/' : d > a ? '\\' : '_'
  }
  for (let x = 0; x < w; x++) {
    const yf = Math.round(far(x))
    for (let y = yf; y < h; y++) c.put(x, y, y === yf ? ridge(far, x) : '.', y === yf && yf <= h * 0.3 ? K.cloud : K.night)
  }
  for (let x = 0; x < w; x++) {
    const yn = Math.round(near(x))
    for (let y = yn; y < h; y++) c.put(x, y, y === yn ? ridge(near, x) : ':', K.leaf)
  }
  // birds
  for (let i = 0; i < 3; i++) {
    const bx = wrap(t * 0.6 + i * 14, w + 10) - 5
    c.put(bx, 1 + i + Math.sin(t / 6 + i) , (t + i * 2 >> 1) % 2 ? 'v' : '^', K.gray)
  }
  // tiny hut
  const hx = Math.round(w * 0.25)
  c.spr(hx, Math.round(near(hx)) - 2, [' /\\ ', '/__\\'], K.red)
  if (t % 10 < 5) c.put(hx + 1, Math.round(near(hx)) - 3, 'o', K.gray)
}

// --------------------------------------------------------------- FOREST
const forest = (c: Canvas, t: number) => {
  const w = c.w, g = c.h - 1
  floor(c, g, K.leaf, '"`\',')
  const n = Math.max(4, Math.floor(w / 9))
  for (let i = 0; i < n; i++) {
    const x = 3 + Math.floor(hs(i) * (w - 6))
    const th = 3 + Math.floor(hs(i + 7) * Math.max(1, c.h - 5))
    const sway = Math.round(Math.sin(t / 14 + i) * 0.7)
    for (let k = 0; k < th; k++) {
      const y = g - th + k
      const half = Math.round(k * 0.7) + (k === 0 ? 0 : 0)
      const ox = k < th / 2 ? sway : 0
      c.put(x - half + ox, y, '/', i % 2 ? K.leaf : K.green)
      c.put(x + half + ox, y, '\\', i % 2 ? K.leaf : K.green)
      for (let j = -half + 1; j < half; j++) c.put(x + j + ox, y, (j + k) % 2 ? '^' : '*', i % 2 ? K.leaf : K.green)
    }
    c.put(x, g, '|', K.wood)
  }
  // falling leaves
  for (let i = 0; i < Math.max(5, w / 10); i++) {
    const lx = wrap(hs(i + 30) * w + t * 0.3 + Math.sin(t / 6 + i) * 2, w)
    const ly = wrap(hs(i + 50) * (g + 2) + t * 0.25, g + 1)
    c.put(lx, ly, i % 3 ? '.' : ',', i % 2 ? K.orange : K.hay)
  }
  // fireflies
  for (let i = 0; i < Math.max(6, w / 8); i++) {
    const fx = hs(i + 70) * w + Math.sin(t / 9 + i) * 3
    const fy = 1 + hs(i + 90) * (g - 2) + Math.cos(t / 11 + i) * 1.3
    if ((t + i * 5) % 14 < 8) c.put(fx, fy, '*', K.yellow)
  }
  // rabbit hopping across
  const P = 190, u = t % P
  if (u > 40 && u < 160) {
    const hop = Math.abs(Math.sin((u - 40) / 3.2)) * 2
    c.spr(Math.round(lerp(-6, w, (u - 40) / 120)), Math.round(g - 3 - hop), ['(\\_/)', '(o.o)', '(")(")'], K.cloud, { o: K.red })
  }
}

// ----------------------------------------------------------------- ROAD
const CAR = ['   ____   ', ' _/_||_\\_ ', '(_o____o_)']
const BUS = [' _______________ ', '|[]|[]|[]|[]|[]\\', '|_o_________o__|']
const TRUCK = ['  ____________   __  ', ' |____________|_|__\\ ', '  (o)      (o)(o)(o) ']
const BIKE = ['  __\\o ', ' (o)-(o)']

const road = (c: Canvas, t: number) => {
  const w = c.w, h = c.h, g = h - 1
  // skyline (parallax)
  for (let b = 0; b < Math.ceil(w / 5) + 6; b++) {
    const bw = 4 + Math.floor(hs(b + 1) * 3)
    const bh = 2 + Math.floor(hs(b + 9) * Math.max(1, h - 6))
    const bx = Math.round(b * 6 - wrap(t * 0.25, 6 * (Math.ceil(w / 6) + 4)) + w)
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const ch = y === 0 ? '_' : x === 0 || x === bw - 1 ? '|' : (x + y) % 2 === 0 && hs(b * 3 + y) > 0.4 ? '+' : ' '
        if (ch !== ' ') c.put(bx + x, h - 4 - bh + y + 1, ch, ch === '+' ? K.yellow : K.night)
      }
    }
  }
  // road: lane dashes scroll
  c.txt(0, g - 1, ' '.repeat(w), K.gray)
  for (let x = 0; x < w; x++) {
    c.put(x, g - 1, wrap(x + Math.floor(t * 2), 8) < 4 ? '-' : ' ', K.yellow)
    c.put(x, g, '=', K.gray)
    c.put(x, g - 3 + 0, ' ', '')
  }
  const lane = (len: number, speed: number, off: number, dir: 1 | -1, sprite: string[], yUp: number, k: string) => {
    const span = w + len + 20
    const pos = wrap(t * speed + off, span)
    const x = Math.round(dir === 1 ? pos - len : w - pos)
    const rows = dir === 1 ? sprite : flip(sprite)
    const wheel = (t >> 1) % 2 ? 'o' : '0'
    c.solid(x, g - 1 - rows.length + 1 - yUp, rows.map(l => l.replace(/o/g, wheel)), k, { '[': K.sea, ']': K.sea, _: k })
  }
  lane(18, 1.1, 0, 1, BUS, 0, K.orange)
  lane(10, 2.0, 60, 1, CAR, 0, K.red)
  lane(8, 1.7, 30, -1, BIKE, 1, K.teal)
  lane(21, 0.9, 90, -1, TRUCK, 1, K.deep)
}

// ----------------------------------------------------------------- KOI
const KOI_R = '><(((o>'
const koi = (c: Canvas, t: number) => {
  const w = c.w, h = c.h
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x += 2) {
      const v = Math.sin(x * 0.2 + t * 0.15) + Math.sin(y * 1.3 - t * 0.1 + x * 0.05)
      if (v > 1.45) c.put(x, y, '~', K.sea)
    }
  }
  // lily pads
  for (let i = 0; i < Math.max(2, w / 24); i++) {
    const px = Math.round(hs(i + 5) * (w - 8)), py = 1 + Math.floor(hs(i + 15) * Math.max(1, h - 3))
    c.txt(px, py, ' ,-@-, ', K.leaf)
    c.txt(px, py + 1, " '---' ", K.green)
  }
  // ripples
  for (let i = 0; i < 2; i++) {
    const u = (t + i * 40) % 80, r = u / 5
    const cx = hs(Math.floor((t + i * 40) / 80) + i * 7) * w, cy = h / 2
    if (r < 12) for (let a = 0; a < 20; a++) {
      const an = (a / 20) * Math.PI * 2
      c.put(cx + Math.cos(an) * r * 1.8, cy + Math.sin(an) * r * 0.5, r < 4 ? 'o' : '.', K.blue)
    }
  }
  // fish
  const cols = [K.orange, '#e0e0e0', K.red, K.hay]
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1
    const y = Math.max(0, Math.min(h - 1, Math.round(1 + hs(i + 40) * (h - 2) + Math.sin(t / 12 + i) * 0.8)))
    const pos = wrap(t * (0.5 + i * 0.15) + i * 23, w + 20)
    const x = Math.round(dir === 1 ? pos - 10 : w + 3 - pos)
    c.txt(x, y, dir === 1 ? KOI_R : '<o)))><', cols[i], { o: K.gray })
    if (t % 20 < 3) c.put(x + (dir === 1 ? 8 : -1), y - 1, 'o', K.blue)
  }
}

// ---------------------------------------------------------------- NIGHT
const CABIN = [
  '      __   ',
  '   __|__|  ',
  '  /_____\\  ',
  ' /_______\\ ',
  ' |  []   | ',
  ' |__  ___| ',
]
const night = (c: Canvas, t: number) => {
  const w = c.w, h = c.h, g = h - 1
  for (let i = 0; i < Math.floor(w * h / 14); i++) {
    const sx = Math.floor(hs(i) * w), sy = Math.floor(hs(i + 99) * (h - 2))
    const v = Math.sin(t / 5 + i * 1.7)
    if (v > -0.3) c.put(sx, sy, v > 0.8 ? '*' : v > 0.3 ? '+' : '.', K.night)
  }
  c.spr(Math.round(w * 0.78), 0, ['  _.-.', ' (  o )', "  `-.'"], K.yellow)
  floor(c, g, K.leaf, '"^')
  const cx = Math.round(w * 0.35)
  c.spr(cx, g - 5, CABIN, K.wood, { '[': K.yellow, ']': K.yellow })
  if (t % 3 === 0) c.put(cx + 7, g - 6 - ((t >> 2) % 3), 'o', K.gray)
  c.put(cx + 7 + Math.sin(t / 6) , g - 7 - ((t >> 2) % 3), 'O', K.gray)
  // shooting star every ~90 frames
  const u = t % 90
  if (u < 14) {
    const x0 = w * 0.85, y0 = 0
    for (let i = 0; i < 6; i++) c.put(x0 - u * 2 - i, y0 + (u + i * 0.5) * 0.3, i ? (i < 3 ? '-' : '.') : '*', K.yellow)
  }
}

// ----------------------------------------------------------------- SNOW
const snow = (c: Canvas, t: number) => {
  const w = c.w, h = c.h, g = h - 1
  for (let x = 0; x < w; x++) c.put(x, g, Math.sin(x * 0.3) > 0.2 ? '~' : '_', K.snow)
  const n = Math.max(3, Math.floor(w / 18))
  for (let i = 0; i < n; i++) {
    const x = 4 + Math.floor(hs(i + 2) * (w - 10)), th = 3 + Math.floor(hs(i + 8) * Math.max(1, h - 5))
    for (let k = 0; k < th; k++) {
      const half = Math.round(k * 0.7)
      c.put(x - half, g - th + k, '/', K.leaf)
      c.put(x + half, g - th + k, '\\', K.leaf)
      for (let j = -half + 1; j < half; j++) c.put(x + j, g - th + k, k % 2 ? ':' : '*', k % 3 === 0 ? K.snow : K.leaf)
    }
    c.put(x, g, '|', K.wood)
  }
  // snowman
  const sx = Math.round(w * 0.62)
  c.spr(sx, g - 4, [' ,-, ', '(o o)', '( : )', "`---'"], K.snow, { o: K.gray, ':': K.orange })
  if (t % 30 < 2) c.put(sx + 1, g - 3, '-', K.gray)
  // flakes
  const wind = Math.sin(t / 40) * 0.4
  for (let i = 0; i < Math.floor(w * h / 10); i++) {
    const fx = wrap(hs(i + 200) * w + t * (wind + (hs(i + 5) - 0.5) * 0.1) + Math.sin(t / 7 + i) * 1.2, w)
    const fy = wrap(hs(i + 300) * h + t * (0.18 + hs(i + 9) * 0.3), h)
    c.put(fx, fy, hs(i + 1) > 0.7 ? '*' : '.', K.snow)
  }
}

export const SCENES: Scene[] = [
  { id: 'cat', label: 'Mèo', draw: cat },
  { id: 'mouse', label: 'Chuột', draw: mouse },
  { id: 'chicken', label: 'Gà', draw: chicken },
  { id: 'cow', label: 'Bò', draw: cow },
  { id: 'bot', label: 'Bot', draw: bot },
  { id: 'sea', label: 'Biển', draw: sea },
  { id: 'mountain', label: 'Núi', draw: mountain },
  { id: 'forest', label: 'Rừng', draw: forest },
  { id: 'road', label: 'Xe cộ', draw: road },
  { id: 'koi', label: 'Cá koi', draw: koi },
  { id: 'night', label: 'Đêm', draw: night },
  { id: 'snow', label: 'Tuyết', draw: snow },
]

export const render = (id: string, t: number, w: number, h: number, ctx: Ctx): Run[][] => {
  const scene = SCENES.find(s => s.id === id) ?? SCENES[0]
  const c = new Canvas(w, h)
  scene.draw(c, t, ctx)
  return c.runs()
}
