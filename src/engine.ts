// Pure deterministic engine. No clock, DOM, Math.random or renderer dependencies.
export const DT = 0.1, W = 960, H = 640, COLS = 60, ROWS = 40;
export const genes = ['speed', 'sense', 'metabolism', 'aggression'] as const;
export type Gene = typeof genes[number];
export type Genome = Record<Gene, number>;
export const ranges: Record<Gene, [number, number]> = { speed: [6, 48], sense: [16, 96], metabolism: [0.4, 2], aggression: [0, 1] };
export interface Config { initial: number; regeneration: number; capacity: number; mutation: number; upkeep: number; maxAge: number; }
export const defaults: Config = { initial: 180, regeneration: 0.6, capacity: 8, mutation: 0.12, upkeep: 0.65, maxAge: 240 };
export interface Organism { id: number; parent: number | null; x: number; y: number; heading: number; age: number; energy: number; generation: number; genome: Genome; }
export interface Sample { tick: number; population: number; energy: number; age: number; generation: number; diversity: number; means: Genome; }
export interface Action { tick: number; patch: Partial<Config>; }
export interface World { version: 1; seed: string; rng: number; tick: number; nextId: number; births: number; deaths: number; config: Config; initialConfig: Config; actions: Action[]; organisms: Organism[]; food: number[]; history: Sample[]; }
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export function random(w: World): number { w.rng = (w.rng + 0x6D2B79F5) >>> 0; let t = w.rng; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export function validateConfig(c: Config) { const limits: Record<keyof Config, [number, number]> = { initial: [1, 800], regeneration: [0, 3], capacity: [1, 20], mutation: [0, 1], upkeep: [0.1, 3], maxAge: [20, 600] }; for (const k of Object.keys(limits) as (keyof Config)[]) if (!Number.isFinite(c[k]) || c[k] < limits[k][0] || c[k] > limits[k][1]) throw new Error(`Некорректный параметр: ${k}`); if (!Number.isInteger(c.initial)) throw new Error('Начальная популяция должна быть целым числом'); }
export function createWorld(seed: string, config: Config = defaults): World {
  validateConfig(config); let hash = 2166136261; for (const c of seed) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const w: World = { version: 1, seed, rng: hash >>> 0, tick: 0, nextId: 1, births: 0, deaths: 0, config: { ...config }, initialConfig: { ...config }, actions: [], organisms: [], food: [], history: [] };
  for (let i = 0; i < COLS * ROWS; i++) w.food.push(random(w) * config.capacity);
  for (let i = 0; i < config.initial; i++) { const genome = {} as Genome; for (const g of genes) genome[g] = ranges[g][0] + random(w) * (ranges[g][1] - ranges[g][0]); w.organisms.push({ id: w.nextId++, parent: null, x: random(w) * W, y: random(w) * H, heading: random(w) * Math.PI * 2, age: 0, energy: 35 + random(w) * 30, generation: 0, genome }); }
  w.history.push(stats(w)); return w;
}
export function configure(w: World, patch: Partial<Config>) { const next = { ...w.config, ...patch }; validateConfig(next); w.config = next; w.actions.push({ tick: w.tick, patch: { ...patch } }); }
export function stats(w: World): Sample { const n = w.organisms.length, means = { speed: 0, sense: 0, metabolism: 0, aggression: 0 }; let energy = 0, age = 0, generation = 0, diversity = 0; for (const o of w.organisms) { energy += o.energy; age += o.age; generation = Math.max(generation, o.generation); for (const g of genes) means[g] += o.genome[g] / (n || 1); } for (const o of w.organisms) for (const g of genes) diversity += ((o.genome[g] - means[g]) / (ranges[g][1] - ranges[g][0])) ** 2 / (4 * (n || 1)); return { tick: w.tick, population: n, energy: energy / (n || 1), age: age / (n || 1), generation, diversity: Math.sqrt(diversity), means }; }
function delta(a: number, b: number, size: number) { let d = b - a; if (d > size / 2) d -= size; if (d < -size / 2) d += size; return d; }
export function step(w: World, count = 1) {
  for (let t = 0; t < count; t++) {
    for (let i = 0; i < w.food.length; i++) w.food[i] = Math.min(w.config.capacity, w.food[i] + w.config.regeneration * DT);
    // Spatial buckets limit organism sensing to adjacent cells. Stable insertion and iteration order.
    const buckets: Organism[][] = Array.from({ length: 70 }, () => []);
    for (const o of w.organisms) buckets[Math.floor(o.y / (H / 7)) * 10 + Math.floor(o.x / (W / 10))].push(o);
    const children: Organism[] = [];
    for (const o of w.organisms) {
      if (o.energy <= 0) continue;
      const g = o.genome; let sx = 0, sy = 0;
      const cx = Math.floor(o.x / 16), cy = Math.floor(o.y / 16), radius = Math.ceil(g.sense / 16);
      for (let yy = -radius; yy <= radius; yy++) for (let xx = -radius; xx <= radius; xx++) { const fx = ((cx + xx + COLS) % COLS) * 16 + 8, fy = ((cy + yy + ROWS) % ROWS) * 16 + 8; const dx = delta(o.x, fx, W), dy = delta(o.y, fy, H), d = Math.hypot(dx, dy); if (d < g.sense && d > 0) { const signal = w.food[Math.floor(fy / 16) * COLS + Math.floor(fx / 16)] / (1 + d * d); sx += dx / d * signal; sy += dy / d * signal; } }
      const bx = Math.floor(o.x / 96), by = Math.floor(o.y / (H / 7));
      for (let yy = -2; yy <= 2; yy++) for (let xx = -1; xx <= 1; xx++) for (const other of buckets[((by + yy + 7) % 7) * 10 + (bx + xx + 10) % 10]) {
        if (other.id === o.id || other.energy <= 0) continue; const dx = delta(o.x, other.x, W), dy = delta(o.y, other.y, H), d = Math.hypot(dx, dy);
        if (d < g.sense && d > 0) { const signal = (g.aggression - 0.5) * 0.15 / (1 + d); sx += dx / d * signal; sy += dy / d * signal; }
        if (d < 7) { const stolen = Math.min(other.energy, g.aggression * 3 * DT); other.energy -= stolen; o.energy += stolen * 0.6; o.energy -= g.aggression * DT; }
      }
      const wander = (random(w) - 0.5) * 0.5; if (Math.hypot(sx, sy) > 0.001) { const target = Math.atan2(sy, sx); o.heading += Math.atan2(Math.sin(target - o.heading), Math.cos(target - o.heading)) * 0.3 + wander * 0.2; } else o.heading += wander;
      o.x = (o.x + Math.cos(o.heading) * g.speed * DT + W) % W; o.y = (o.y + Math.sin(o.heading) * g.speed * DT + H) % H;
      const cell = Math.floor(o.y / 16) * COLS + Math.floor(o.x / 16); const eaten = Math.min(w.food[cell], 5 * g.metabolism * DT); w.food[cell] -= eaten; o.energy = Math.min(150, o.energy + eaten - (w.config.upkeep * g.metabolism + 0.0015 * g.speed ** 2 + 0.001 * g.sense) * DT); o.age += DT;
      if (o.age > w.config.maxAge) o.energy = 0;
      if (o.energy > 100 && o.age > 8 && w.organisms.length + children.length < 1200) { o.energy -= 55; const genome = { ...g }; for (const key of genes) if (random(w) < w.config.mutation) genome[key] = clamp(genome[key] + (random(w) - 0.5) * (ranges[key][1] - ranges[key][0]) * 0.25, ...ranges[key]); children.push({ ...o, id: w.nextId++, parent: o.id, x: (o.x + 8) % W, age: 0, energy: 40, generation: o.generation + 1, genome }); w.births++; }
    }
    const alive = w.organisms.filter(o => o.energy > 0); w.deaths += w.organisms.length - alive.length; w.organisms = alive.concat(children); w.tick++;
    if (w.tick % 10 === 0) { w.history.push(stats(w)); if (w.history.length > 600) w.history.shift(); }
  }
}
export function replay(w: World): World { const result = createWorld(w.seed, w.initialConfig); let a = 0; for (let tick = 0; tick <= w.tick; tick++) { while (a < w.actions.length && w.actions[a].tick === tick) configure(result, w.actions[a++].patch); if (tick < w.tick) step(result); } return result; }
export function save(w: World): string { return JSON.stringify(w); }
export function restore(text: string): World {
  if (text.length > 8_000_000) throw new Error('Снапшот слишком большой'); const w = JSON.parse(text) as World;
  if (!w || w.version !== 1 || typeof w.seed !== 'string' || !Array.isArray(w.food) || w.food.length !== COLS * ROWS || !Array.isArray(w.organisms) || w.organisms.length > 1200 || !Array.isArray(w.actions) || !Array.isArray(w.history) || w.history.length > 600) throw new Error('Неверный формат снапшота');
  validateConfig(w.config); validateConfig(w.initialConfig);
  for (const key of ['tick','nextId','rng','births','deaths'] as const) if (!Number.isSafeInteger(w[key]) || w[key] < 0) throw new Error('Неверный счётчик');
  if (w.rng > 0xffffffff || w.nextId < 1) throw new Error('Неверное состояние PRNG');
  for (const f of w.food) if (!Number.isFinite(f) || f < 0 || f > 20) throw new Error('Неверный ресурс');
  const ids = new Set<number>(); for (const o of w.organisms) { if (!Number.isInteger(o.id) || o.id < 1 || o.id >= w.nextId || ids.has(o.id) || !Number.isInteger(o.generation) || o.generation < 0 || (o.parent !== null && (!Number.isInteger(o.parent) || o.parent < 1 || o.parent >= o.id))) throw new Error('Неверный организм'); ids.add(o.id); for (const key of ['x','y','heading','age','energy'] as const) if (!Number.isFinite(o[key])) throw new Error('Неверное состояние организма'); if (o.x < 0 || o.x >= W || o.y < 0 || o.y >= H || o.age < 0 || o.energy <= 0 || o.energy > 150) throw new Error('Организм вне границ'); for (const g of genes) if (!Number.isFinite(o.genome?.[g]) || o.genome[g] < ranges[g][0] || o.genome[g] > ranges[g][1]) throw new Error('Неверный геном'); }
  let prev = 0; for (const a of w.actions) { if (!Number.isInteger(a.tick) || a.tick < prev || a.tick > w.tick || !a.patch || Object.keys(a.patch).some(k => !(k in defaults))) throw new Error('Неверный журнал'); validateConfig({ ...w.initialConfig, ...a.patch }); prev = a.tick; }
  prev = -1; for (const s of w.history) { if (!Number.isInteger(s.tick) || s.tick <= prev || s.tick > w.tick || !Number.isInteger(s.population) || s.population < 0 || s.population > 1200) throw new Error('Неверная история'); for (const key of ['energy','age','generation','diversity'] as const) if (!Number.isFinite(s[key]) || s[key] < 0) throw new Error('Неверная статистика'); for (const g of genes) if (!Number.isFinite(s.means?.[g])) throw new Error('Неверная статистика генов'); prev = s.tick; }
  return w;
}
