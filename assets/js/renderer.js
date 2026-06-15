/* ============================================================
   Renderer — draws the graph onto the SVG canvas and exposes
   helpers to update node / edge visual state during animation.
   Keeps DOM references so updates are O(1) (no re-query).
   ============================================================ */
const SVG_NS = "http://www.w3.org/2000/svg";

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

class Renderer {
  constructor(svg) {
    this.svg = svg;
    this.edgesG = svg.querySelector("#edgesG");
    this.edgeLabelsG = svg.querySelector("#edgeLabelsG");
    this.nodesG = svg.querySelector("#nodesG");
    this.nodeEls = new Map(); // id -> { g, circle, label, distBadge }
    this.edgeEls = new Map(); // key -> { line, label, a, b, w }
  }

  clear() {
    this.edgesG.innerHTML = "";
    this.edgeLabelsG.innerHTML = "";
    this.nodesG.innerHTML = "";
    this.nodeEls.clear();
    this.edgeEls.clear();
  }

  render(graph) {
    this.clear();
    // edges first (so nodes draw on top)
    for (const e of graph.edges) this._drawEdge(graph, e);
    for (const n of graph.nodes.values()) this._drawNode(n);
  }

  _drawEdge(graph, e) {
    const A = graph.nodes.get(e.a), B = graph.nodes.get(e.b);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "edge");
    line.setAttribute("x1", A.x); line.setAttribute("y1", A.y);
    line.setAttribute("x2", B.x); line.setAttribute("y2", B.y);
    line.dataset.key = edgeKey(e.a, e.b);
    this.edgesG.appendChild(line);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "edge-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("x", (A.x + B.x) / 2);
    label.setAttribute("y", (A.y + B.y) / 2 - 4);
    label.textContent = e.w;
    this.edgeLabelsG.appendChild(label);

    this.edgeEls.set(edgeKey(e.a, e.b), { line, label, a: e.a, b: e.b, w: e.w });
  }

  _drawNode(n) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "node");
    g.setAttribute("transform", `translate(${n.x},${n.y})`);
    g.dataset.id = n.id;

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", 22);

    const label = document.createElementNS(SVG_NS, "text");
    label.textContent = n.id;

    const distBadge = document.createElementNS(SVG_NS, "text");
    distBadge.setAttribute("class", "dist-badge");
    distBadge.setAttribute("y", -32);
    distBadge.textContent = "";

    g.append(circle, label, distBadge);
    this.nodesG.appendChild(g);
    this.nodeEls.set(n.id, { g, circle, label, distBadge });
  }

  /** Move a node and update incident edges (used while dragging). */
  moveNode(graph, id, x, y) {
    const node = graph.nodes.get(id);
    if (!node) return;
    node.x = x; node.y = y;
    const el = this.nodeEls.get(id);
    if (el) el.g.setAttribute("transform", `translate(${x},${y})`);
    for (const e of graph.edges) {
      if (e.a !== id && e.b !== id) continue;
      const ee = this.edgeEls.get(edgeKey(e.a, e.b));
      if (!ee) continue;
      const A = graph.nodes.get(e.a), B = graph.nodes.get(e.b);
      ee.line.setAttribute("x1", A.x); ee.line.setAttribute("y1", A.y);
      ee.line.setAttribute("x2", B.x); ee.line.setAttribute("y2", B.y);
      ee.label.setAttribute("x", (A.x + B.x) / 2);
      ee.label.setAttribute("y", (A.y + B.y) / 2 - 4);
    }
  }

  /* ---------- state helpers ---------- */
  resetStates() {
    for (const { g, distBadge } of this.nodeEls.values()) {
      g.classList.remove("settled", "current", "path", "pending");
      distBadge.textContent = "";
    }
    for (const { line } of this.edgeEls.values()) {
      line.classList.remove("relax", "tree", "path", "selected");
    }
  }

  setNodeClass(id, cls, on = true) {
    const el = this.nodeEls.get(id);
    if (el) el.g.classList.toggle(cls, on);
  }

  setDistBadge(id, text) {
    const el = this.nodeEls.get(id);
    if (el) el.distBadge.textContent = text;
  }

  flashEdge(a, b, duration = 480) {
    const ee = this.edgeEls.get(edgeKey(a, b));
    if (!ee) return;
    ee.line.classList.add("relax");
    setTimeout(() => ee.line.classList.remove("relax"), duration);
  }

  setEdgeClass(a, b, cls, on = true) {
    const ee = this.edgeEls.get(edgeKey(a, b));
    if (ee) ee.line.classList.toggle(cls, on);
  }

  markSourceDest(source, dest) {
    for (const { g } of this.nodeEls.values()) g.classList.remove("source", "dest");
    this.setNodeClass(source, "source", true);
    this.setNodeClass(dest, "dest", true);
  }
}

window.Renderer = Renderer;
window.edgeKey = edgeKey;
