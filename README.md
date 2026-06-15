# 🗺️ Smart Route Finder — Dijkstra Shortest-Path Visualizer

An interactive, animated web app that computes and **visualizes the shortest route** between locations on a road network using **Dijkstra's algorithm**. Build a map, pick a source and destination, hit **Run**, and watch the algorithm settle vertices one by one, relax edges, and trace the optimal route in real time — with a live statistics panel reporting exactly what it's doing.

Built from scratch with **HTML5, CSS3, SVG and vanilla JavaScript (ES6+)** — no frameworks, no build step, no dependencies.

> **🔗 Live demo:** https://ayushjaiswal001.github.io/smart-route-finder-dijkstra/

---

## ✨ Features

- **Animated Dijkstra** — step-by-step visualization of the current vertex being settled, edges being relaxed, the growing settled set, and the final highlighted shortest path.
- **Binary min-heap priority queue** — a proper indexed min-heap with `O(log V)` insert / extract-min / decrease-key, giving the classic `O((V + E) log V)` running time.
- **Live statistics** — vertices visited, edges relaxed, total shortest distance, real (measured) compute time via `performance.now()`, and live priority-queue size.
- **Shortest-path table** — distance and reconstructed route from the source to every reachable vertex, updated as the algorithm runs.
- **Algorithm trace log** — a human-readable narration of every settle and relaxation (`relax C→B: 2+1 = 3 < 4 ✓`).
- **Build your own map** — edit mode lets you add junctions, draw weighted roads, drag nodes around, and delete elements. Three built-in presets plus a random connected-graph generator.
- **Playback controls** — Run, single Step, Pause/Resume, Reset, and an animation-speed slider.
- **Light / dark theme** with preference saved to `localStorage`. Fully responsive.

## 🧠 How it works

A road network is modelled as a weighted, undirected graph `G = (V, E)`:

- **Vertices (V)** — junctions / locations, each with screen coordinates.
- **Edges (E)** — roads connecting two locations.
- **Weight `w(u,v)`** — a non-negative cost (distance / travel time) on each road.

Dijkstra grows a set of **settled** vertices whose shortest distance from the source is final. At each step it greedily extracts the unsettled vertex with the smallest tentative distance from the min-heap, settles it, and **relaxes** every outgoing edge — if `dist[u] + w(u,v) < dist[v]`, a shorter path to `v` was found, so `dist[v]` and its predecessor are updated. Because all weights are non-negative, a settled vertex can never later be reached by a shorter path — that's the greedy invariant that makes the algorithm correct.

The route to any vertex is reconstructed by walking the predecessor array backwards from the destination to the source.

### Complexity

| Priority queue        | Extract-min | Decrease-key   | Overall time          |
|-----------------------|-------------|----------------|-----------------------|
| Array / linear scan   | `O(V)`      | `O(1)`         | `O(V²)`               |
| **Binary min-heap** ← | `O(log V)`  | `O(log V)`     | **`O((V + E) log V)`**|
| Fibonacci heap        | `O(log V)`  | `O(1)` amort.  | `O(E + V log V)`      |

Auxiliary space is `O(V + E)` for the adjacency list, distance/predecessor maps and the queue.

> Dijkstra requires **non-negative** edge weights. Graphs with negative edges need Bellman–Ford (`O(V·E)`).

## ▶️ Run it locally

It's a static site — no install or build needed.

```bash
git clone https://github.com/Ayushjaiswal001/smart-route-finder-dijkstra.git
cd smart-route-finder-dijkstra
```

Then either **double-click `index.html`**, or serve it (recommended) so everything loads cleanly:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000

# …or Node
npx serve .
```

## 🗂️ Project structure

```
smart-route-finder-dijkstra/
├── index.html              # markup & layout
├── assets/
│   ├── favicon.svg
│   ├── css/
│   │   └── styles.css      # theming, layout, SVG node/edge states
│   └── js/
│       ├── minheap.js      # indexed binary min-heap (priority queue)
│       ├── graph.js        # Graph model, presets, random generator
│       ├── dijkstra.js     # algorithm + step trace + path reconstruction
│       ├── renderer.js     # SVG drawing & visual-state helpers
│       └── app.js          # UI wiring, animation engine, editing
└── README.md
```

## 🛠️ Tech stack

`HTML5` · `CSS3 (custom properties, grid, flexbox)` · `SVG` · `JavaScript ES6+` · `performance.now()` — zero external libraries.

## 🚀 Ideas for later

- A\* search with a distance heuristic for faster point-to-point queries
- Bidirectional Dijkstra to halve the search space
- Real map data via the OpenStreetMap API
- An optional Bellman–Ford mode for graphs with negative edges

## 👤 Author

**Ayush Jaiswal** — [@Ayushjaiswal001](https://github.com/Ayushjaiswal001)

## 📄 License

Released under the [MIT License](LICENSE).
