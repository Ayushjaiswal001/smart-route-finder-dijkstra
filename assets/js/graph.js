/* ============================================================
   Graph — a weighted, undirected graph stored as an adjacency
   list, plus a small library of preset "maps" and a random
   connected-graph generator.
   ============================================================ */
class Graph {
  constructor() {
    this.nodes = new Map();   // id -> { id, x, y }
    this.edges = [];          // { a, b, w }
    this.adj = new Map();     // id -> [{ to, w }]
  }

  get vertices() { return [...this.nodes.keys()]; }

  addNode(id, x, y) {
    this.nodes.set(id, { id, x, y });
    if (!this.adj.has(id)) this.adj.set(id, []);
    return id;
  }

  hasEdge(a, b) {
    return this.edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  }

  addEdge(a, b, w) {
    if (a === b || this.hasEdge(a, b)) return false;
    this.edges.push({ a, b, w });
    this.adj.get(a).push({ to: b, w });
    this.adj.get(b).push({ to: a, w });
    return true;
  }

  removeNode(id) {
    this.nodes.delete(id);
    this.adj.delete(id);
    this.edges = this.edges.filter(e => e.a !== id && e.b !== id);
    for (const list of this.adj.values()) {
      const filtered = list.filter(n => n.to !== id);
      list.length = 0; list.push(...filtered);
    }
  }

  removeEdge(a, b) {
    this.edges = this.edges.filter(e => !((e.a === a && e.b === b) || (e.a === b && e.b === a)));
    this.adj.set(a, this.adj.get(a).filter(n => n.to !== b));
    this.adj.set(b, this.adj.get(b).filter(n => n.to !== a));
  }

  neighbors(id) { return this.adj.get(id) || []; }

  /** Build a Graph from a plain preset definition. */
  static fromPreset(def) {
    const g = new Graph();
    def.nodes.forEach(n => g.addNode(n.id, n.x, n.y));
    def.edges.forEach(e => g.addEdge(e.a, e.b, e.w));
    return g;
  }
}

/* ----- next-label helper: A, B, ... Z, A1, B1, ... ----- */
function nextLabel(existing) {
  const set = new Set(existing);
  for (let suffix = 0; suffix < 50; suffix++) {
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i) + (suffix === 0 ? "" : suffix);
      if (!set.has(label)) return label;
    }
  }
  return "X" + existing.length;
}

/* ============================================================
   Preset maps
   ============================================================ */
const PRESETS = {
  sample: {
    name: "Sample network (6 nodes)",
    nodes: [
      { id: "A", x: 130, y: 150 },
      { id: "B", x: 340, y: 90  },
      { id: "C", x: 270, y: 300 },
      { id: "D", x: 530, y: 220 },
      { id: "E", x: 560, y: 430 },
      { id: "F", x: 770, y: 320 },
    ],
    edges: [
      { a: "A", b: "B", w: 4 }, { a: "A", b: "C", w: 2 }, { a: "B", b: "C", w: 1 },
      { a: "B", b: "D", w: 5 }, { a: "C", b: "D", w: 8 }, { a: "C", b: "E", w: 10 },
      { a: "D", b: "E", w: 2 }, { a: "D", b: "F", w: 6 }, { a: "E", b: "F", w: 3 },
    ],
  },

  city: {
    name: "City grid (9 nodes)",
    nodes: [
      { id: "A", x: 160, y: 110 }, { id: "B", x: 450, y: 110 }, { id: "C", x: 740, y: 110 },
      { id: "D", x: 160, y: 285 }, { id: "E", x: 450, y: 285 }, { id: "F", x: 740, y: 285 },
      { id: "G", x: 160, y: 460 }, { id: "H", x: 450, y: 460 }, { id: "I", x: 740, y: 460 },
    ],
    edges: [
      { a: "A", b: "B", w: 7 }, { a: "B", b: "C", w: 6 },
      { a: "D", b: "E", w: 3 }, { a: "E", b: "F", w: 5 },
      { a: "G", b: "H", w: 8 }, { a: "H", b: "I", w: 4 },
      { a: "A", b: "D", w: 4 }, { a: "D", b: "G", w: 9 },
      { a: "B", b: "E", w: 2 }, { a: "E", b: "H", w: 6 },
      { a: "C", b: "F", w: 5 }, { a: "F", b: "I", w: 3 },
      { a: "B", b: "D", w: 6 }, { a: "E", b: "C", w: 8 }, { a: "F", b: "H", w: 7 },
    ],
  },

  metro: {
    name: "Metro lines (8 nodes)",
    nodes: [
      { id: "A", x: 110, y: 280 }, { id: "B", x: 260, y: 130 }, { id: "C", x: 260, y: 430 },
      { id: "D", x: 450, y: 280 }, { id: "E", x: 620, y: 140 }, { id: "F", x: 620, y: 420 },
      { id: "G", x: 790, y: 240 }, { id: "H", x: 790, y: 400 },
    ],
    edges: [
      { a: "A", b: "B", w: 5 }, { a: "A", b: "C", w: 4 }, { a: "B", b: "D", w: 6 },
      { a: "C", b: "D", w: 3 }, { a: "D", b: "E", w: 7 }, { a: "D", b: "F", w: 5 },
      { a: "E", b: "G", w: 4 }, { a: "F", b: "H", w: 6 }, { a: "G", b: "H", w: 2 },
      { a: "E", b: "F", w: 9 }, { a: "B", b: "E", w: 12 },
    ],
  },
};

/* ----- random connected weighted graph laid out on a circle ----- */
function randomGraph(count) {
  count = Math.max(3, Math.min(15, count | 0));
  const g = new Graph();
  const cx = 450, cy = 280, rx = 330, ry = 210;
  const ids = [];
  // pseudo-jittered positions around an ellipse
  for (let i = 0; i < count; i++) {
    const id = nextLabel(ids);
    ids.push(id);
    const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
    const jitter = ((i * 37) % 40) - 20;
    g.addNode(id, Math.round(cx + Math.cos(ang) * (rx + jitter)),
                  Math.round(cy + Math.sin(ang) * (ry + jitter * 0.6)));
  }
  const rnd = mulberry32(count * 2654435761 >>> 0);
  // 1) spanning path to guarantee connectivity
  for (let i = 1; i < count; i++) {
    g.addEdge(ids[i - 1], ids[i], 1 + Math.floor(rnd() * 9));
  }
  // 2) extra chords for realism (~0.6·V additional edges)
  const extra = Math.round(count * 0.6);
  let guard = 0;
  for (let k = 0; k < extra && guard < extra * 12; guard++) {
    const a = ids[Math.floor(rnd() * count)];
    const b = ids[Math.floor(rnd() * count)];
    if (a !== b && !g.hasEdge(a, b)) {
      g.addEdge(a, b, 1 + Math.floor(rnd() * 9));
      k++;
    }
  }
  return g;
}

/* deterministic PRNG (so Math.random isn't needed and layouts are reproducible) */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

window.Graph = Graph;
window.PRESETS = PRESETS;
window.randomGraph = randomGraph;
window.nextLabel = nextLabel;
