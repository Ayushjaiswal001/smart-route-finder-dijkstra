/* ============================================================
   Dijkstra's single-source shortest-path algorithm.

   Two entry points:
   • dijkstra(graph, source)      -> full result + step trace
                                      (used to drive the animation)
   • dijkstraTimed(graph, source) -> pure run, no trace, returns
                                      elapsed ms (an honest measure
                                      of just the computation).

   "Edges relaxed" counts successful relaxations (an improvement
   to a tentative distance). For the report's 6-node sample this
   yields exactly 6 vertices visited and 9 edges relaxed.
   ============================================================ */

const INF = Infinity;

function dijkstra(graph, source) {
  const dist = new Map();
  const prev = new Map();
  const settled = new Set();
  const steps = [];
  let edgesRelaxed = 0;
  let verticesVisited = 0;

  for (const v of graph.vertices) { dist.set(v, INF); prev.set(v, null); }
  if (!dist.has(source)) return { dist, prev, settled, steps, edgesRelaxed, verticesVisited };
  dist.set(source, 0);

  const pq = new MinHeap();
  pq.push(source, 0);

  while (!pq.isEmpty()) {
    const { v: u } = pq.pop();
    if (settled.has(u)) continue;        // skip stale heap entries
    settled.add(u);
    verticesVisited++;
    steps.push({ type: "settle", u, dist: dist.get(u), queueSize: pq.size() });

    for (const { to: v, w } of graph.neighbors(u)) {
      if (settled.has(v)) continue;
      const alt = dist.get(u) + w;
      const old = dist.get(v);
      const improved = alt < old;
      steps.push({ type: "relax", u, v, w, oldDist: old, newDist: alt, improved });
      if (improved) {
        dist.set(v, alt);
        prev.set(v, u);
        edgesRelaxed++;
        pq.push(v, alt);                 // insert or decrease-key
      }
    }
  }

  return { dist, prev, settled, steps, edgesRelaxed, verticesVisited };
}

/** Pure timed run (no step recording) — returns elapsed milliseconds. */
function dijkstraTimed(graph, source) {
  const dist = new Map();
  const settled = new Set();
  for (const v of graph.vertices) dist.set(v, INF);
  if (!dist.has(source)) return 0;
  dist.set(source, 0);

  const pq = new MinHeap();
  pq.push(source, 0);

  const t0 = performance.now();
  while (!pq.isEmpty()) {
    const { v: u } = pq.pop();
    if (settled.has(u)) continue;
    settled.add(u);
    for (const { to: v, w } of graph.neighbors(u)) {
      if (settled.has(v)) continue;
      const alt = dist.get(u) + w;
      if (alt < dist.get(v)) { dist.set(v, alt); pq.push(v, alt); }
    }
  }
  return performance.now() - t0;
}

/** Reconstruct the route source -> target from the predecessor map. */
function reconstructPath(prev, target) {
  const path = [];
  let cur = target;
  while (cur !== null && cur !== undefined) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  return path; // path[0] should be the source if target is reachable
}

window.dijkstra = dijkstra;
window.dijkstraTimed = dijkstraTimed;
window.reconstructPath = reconstructPath;
window.INF = INF;
