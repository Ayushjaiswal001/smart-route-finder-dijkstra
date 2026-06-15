/* ============================================================
   App — wires the UI to the graph model, the algorithm engine
   and the renderer. Handles animation playback, step-through,
   live statistics, graph editing and theming.
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt = (d) => (d === INF || d === undefined) ? "∞" : String(d);

  function svgPoint(svg, evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  const REPO_URL = "https://github.com/Ayushjaiswal001/smart-route-finder-dijkstra";

  class App {
    constructor() {
      this.svg = $("graph");
      this.renderer = new Renderer(this.svg);

      // controls
      this.presetSelect = $("presetSelect");
      this.sourceSelect = $("sourceSelect");
      this.destSelect = $("destSelect");
      this.speed = $("speed");
      this.speedLabel = $("speedLabel");
      this.randomSize = $("randomSize");
      this.randomSizeLabel = $("randomSizeLabel");

      this.runBtn = $("runBtn");
      this.stepBtn = $("stepBtn");
      this.pauseBtn = $("pauseBtn");
      this.resetBtn = $("resetBtn");
      this.randomBtn = $("randomBtn");
      this.editToggle = $("editToggle");
      this.editHint = $("editHint");

      // outputs
      this.stepLog = $("stepLog");
      this.stepCounter = $("stepCounter");
      this.distTableBody = $("distTableBody");
      this.resultDist = $("resultDist");
      this.resultRoute = $("resultRoute");
      this.statVisited = $("statVisited");
      this.statRelaxed = $("statRelaxed");
      this.statDistance = $("statDistance");
      this.statTime = $("statTime");
      this.statPQ = $("statPQ");
      this.statGraph = $("statGraph");

      // animation / interaction state
      this.animToken = 0;
      this.playing = false;
      this.paused = false;
      this.editMode = false;
      this.pendingNode = null;
      this.drag = null;

      $("repoLink").href = REPO_URL;
      $("themeToggle").href = "#";
    }

    /* ---------------- bootstrap ---------------- */
    init() {
      // restore theme
      const saved = localStorage.getItem("srf-theme");
      if (saved) document.body.setAttribute("data-theme", saved);

      // populate preset dropdown
      for (const [key, def] of Object.entries(PRESETS)) {
        const opt = document.createElement("option");
        opt.value = key; opt.textContent = def.name;
        this.presetSelect.appendChild(opt);
      }
      this.presetSelect.value = "sample";

      this.bindEvents();
      this.loadGraph(Graph.fromPreset(PRESETS.sample));
      this.updateSpeedLabel();
    }

    bindEvents() {
      this.presetSelect.addEventListener("change", () =>
        this.loadGraph(Graph.fromPreset(PRESETS[this.presetSelect.value])));
      this.randomBtn.addEventListener("click", () => {
        this.presetSelect.value = "";
        this.loadGraph(randomGraph(parseInt(this.randomSize.value, 10)));
      });
      this.randomSize.addEventListener("input", () => {
        this.randomSizeLabel.textContent = this.randomSize.value;
      });

      this.sourceSelect.addEventListener("change", () => this.reset());
      this.destSelect.addEventListener("change", () => this.reset());
      this.speed.addEventListener("input", () => this.updateSpeedLabel());

      this.runBtn.addEventListener("click", () => this.startPlay());
      this.stepBtn.addEventListener("click", () => this.stepOnce());
      this.pauseBtn.addEventListener("click", () => this.togglePause());
      this.resetBtn.addEventListener("click", () => this.reset());

      this.editToggle.addEventListener("click", () => this.toggleEdit());
      $("themeToggle").addEventListener("click", () => this.toggleTheme());

      // canvas interaction (drag + edit)
      this.svg.addEventListener("pointerdown", (e) => this.onPointerDown(e));
      this.svg.addEventListener("pointermove", (e) => this.onPointerMove(e));
      this.svg.addEventListener("pointerup", (e) => this.onPointerUp(e));
      this.svg.addEventListener("dblclick", (e) => this.onDblClick(e));
    }

    /* ---------------- graph loading ---------------- */
    loadGraph(graph) {
      this.graph = graph;
      this.pendingNode = null;
      this.renderer.render(graph);
      const verts = graph.vertices;
      this.fillSelect(this.sourceSelect, verts);
      this.fillSelect(this.destSelect, verts);
      this.sourceSelect.value = verts[0];
      this.destSelect.value = verts[verts.length - 1];
      this.reset();
    }

    fillSelect(sel, verts) {
      sel.innerHTML = "";
      for (const v of verts) {
        const o = document.createElement("option");
        o.value = v; o.textContent = v;
        sel.appendChild(o);
      }
    }

    refreshSelects() {
      const verts = this.graph.vertices;
      const prevS = this.sourceSelect.value, prevD = this.destSelect.value;
      this.fillSelect(this.sourceSelect, verts);
      this.fillSelect(this.destSelect, verts);
      this.sourceSelect.value = verts.includes(prevS) ? prevS : (verts[0] || "");
      this.destSelect.value = verts.includes(prevD) ? prevD : (verts[verts.length - 1] || "");
    }

    afterGraphChange() {
      this.renderer.render(this.graph);
      this.refreshSelects();
      this.reset();
    }

    /* ---------------- compute & reset ---------------- */
    compute() {
      this.source = this.sourceSelect.value;
      this.dest = this.destSelect.value;
      this.result = dijkstra(this.graph, this.source);
      this.steps = this.result.steps;
      this.elapsed = dijkstraTimed(this.graph, this.source);
      this.statGraph.textContent = `${this.graph.vertices.length}/${this.graph.edges.length}`;
    }

    reset() {
      this.animToken++;            // cancel any running animation
      this.playing = false;
      this.paused = false;
      this.pauseBtn.disabled = true;
      this.pauseBtn.textContent = "⏸ Pause";

      this.compute();
      this.idx = 0;
      this.visited = 0;
      this.relaxed = 0;
      this.pqSize = 0;
      this.currentNode = null;

      this.liveDist = new Map();
      this.livePrev = new Map();
      for (const v of this.graph.vertices) this.liveDist.set(v, INF);
      this.liveDist.set(this.source, 0);

      this.renderer.resetStates();
      this.renderer.markSourceDest(this.source, this.dest);
      this.renderer.setDistBadge(this.source, 0);

      this.stepLog.innerHTML = "";
      this.buildDistTable();
      this.updateStats();
      this.updateStepCounter();
      this.resultDist.textContent = "—";
      this.resultRoute.textContent = this.source === this.dest
        ? "Source and destination are the same — distance is 0."
        : "Press Run to compute the shortest path.";
    }

    /* ---------------- playback ---------------- */
    delayMs() {
      const s = parseInt(this.speed.value, 10);          // 1..100
      return Math.round(30 + ((100 - s) / 99) * 870);    // ~900ms slow .. ~30ms fast
    }

    updateSpeedLabel() {
      const s = parseInt(this.speed.value, 10);
      this.speedLabel.textContent = s < 34 ? "Slow" : s < 72 ? "Normal" : "Fast";
    }

    async startPlay() {
      if (!this.steps || this.steps.length === 0) return;
      if (this.idx >= this.steps.length) this.reset();     // finished -> restart
      this.paused = false;
      this.pauseBtn.disabled = false;
      this.pauseBtn.textContent = "⏸ Pause";

      const token = ++this.animToken;
      this.playing = true;
      while (this.idx < this.steps.length) {
        if (token !== this.animToken) return;              // cancelled by reset
        if (this.paused) { await sleep(90); continue; }
        this.applyStep(this.steps[this.idx]);
        this.idx++;
        this.updateStepCounter();
        await sleep(this.delayMs());
      }
      if (token === this.animToken) {
        this.playing = false;
        this.pauseBtn.disabled = true;
        this.finish();
      }
    }

    stepOnce() {
      if (!this.steps || this.idx >= this.steps.length) {
        if (this.idx >= (this.steps ? this.steps.length : 0)) return;
      }
      this.animToken++;                 // stop any auto-play
      this.playing = false;
      this.pauseBtn.disabled = true;
      this.applyStep(this.steps[this.idx]);
      this.idx++;
      this.updateStepCounter();
      if (this.idx >= this.steps.length) this.finish();
    }

    togglePause() {
      if (!this.playing) return;
      this.paused = !this.paused;
      this.pauseBtn.textContent = this.paused ? "▶ Resume" : "⏸ Pause";
    }

    /* ---------------- apply a single trace step ---------------- */
    applyStep(step) {
      if (step.type === "settle") {
        if (this.currentNode && this.currentNode !== step.u) {
          this.renderer.setNodeClass(this.currentNode, "current", false);
        }
        this.renderer.setNodeClass(step.u, "settled", true);
        this.renderer.setNodeClass(step.u, "current", true);
        this.renderer.setDistBadge(step.u, fmt(step.dist));
        this.currentNode = step.u;
        this.visited++;
        this.pqSize = step.queueSize;
        this.addLog("settle",
          `✓ settle <b>${step.u}</b> · dist = ${fmt(step.dist)} · PQ size ${step.queueSize}`);
      } else if (step.type === "relax") {
        this.renderer.flashEdge(step.u, step.v, Math.max(220, this.delayMs() * 0.9));
        const du = this.liveDist.get(step.u);
        if (step.improved) {
          // re-point the shortest-path tree edge
          const oldPrev = this.livePrev.get(step.v);
          if (oldPrev !== undefined && oldPrev !== null) {
            this.renderer.setEdgeClass(oldPrev, step.v, "tree", false);
          }
          this.liveDist.set(step.v, step.newDist);
          this.livePrev.set(step.v, step.u);
          this.renderer.setEdgeClass(step.u, step.v, "tree", true);
          this.renderer.setDistBadge(step.v, fmt(step.newDist));
          this.relaxed++;
          this.updateRow(step.v);
          this.addLog("relax-yes",
            `→ relax ${step.u}→${step.v}: ${du}+${step.w} = ${step.newDist} &lt; ${fmt(step.oldDist)} ✓`);
        } else {
          this.addLog("relax-no",
            `→ relax ${step.u}→${step.v}: ${step.newDist} ≥ ${fmt(step.oldDist)} ✗`);
        }
      }
      this.updateStats();
    }

    finish() {
      if (this.currentNode) this.renderer.setNodeClass(this.currentNode, "current", false);
      this.currentNode = null;

      const distTo = this.result.dist.get(this.dest);
      const path = reconstructPath(this.result.prev, this.dest);
      const reachable = distTo !== INF && distTo !== undefined && path[0] === this.source;

      if (reachable) {
        path.forEach((v) => this.renderer.setNodeClass(v, "path", true));
        for (let i = 0; i < path.length - 1; i++) {
          this.renderer.setEdgeClass(path[i], path[i + 1], "path", true);
        }
        this.resultDist.textContent = `${distTo} units`;
        this.resultRoute.textContent = path.join(" → ");
        const dRow = this.rowEls.get(this.dest);
        if (dRow) dRow.tr.classList.add("is-dest");
        this.addLog("final",
          `★ shortest path ${this.source} → ${this.dest} = ${distTo} : ${path.join(" → ")}`);
      } else if (this.source === this.dest) {
        this.resultDist.textContent = "0 units";
        this.resultRoute.textContent = this.source;
      } else {
        this.resultDist.textContent = "∞";
        this.resultRoute.textContent = "No route exists — destination is unreachable.";
        this.addLog("final", `★ ${this.dest} is unreachable from ${this.source}`);
      }
      this.updateStats();
    }

    /* ---------------- outputs ---------------- */
    addLog(cls, html) {
      const li = document.createElement("li");
      li.className = cls;
      li.innerHTML = html;
      this.stepLog.appendChild(li);
      this.stepLog.scrollTop = this.stepLog.scrollHeight;
    }

    buildDistTable() {
      this.distTableBody.innerHTML = "";
      this.rowEls = new Map();
      for (const v of this.graph.vertices) {
        if (v === this.source) continue;
        const tr = document.createElement("tr");
        tr.classList.add("unreachable");
        if (v === this.dest) tr.classList.add("is-dest");
        const td1 = document.createElement("td"); td1.textContent = v;
        const td2 = document.createElement("td"); td2.textContent = "∞";
        const td3 = document.createElement("td"); td3.textContent = "—";
        tr.append(td1, td2, td3);
        this.distTableBody.appendChild(tr);
        this.rowEls.set(v, { tr, distTd: td2, routeTd: td3 });
      }
    }

    updateRow(v) {
      const row = this.rowEls.get(v);
      if (!row) return;
      const d = this.liveDist.get(v);
      if (d === INF) {
        row.distTd.textContent = "∞";
        row.routeTd.textContent = "—";
        row.tr.classList.add("unreachable");
      } else {
        row.distTd.textContent = d;
        row.routeTd.textContent = reconstructPath(this.livePrev, v).join(" → ");
        row.tr.classList.remove("unreachable");
      }
    }

    updateStats() {
      this.statVisited.textContent = this.visited;
      this.statRelaxed.textContent = this.relaxed;
      this.statDistance.textContent = fmt(this.liveDist.get(this.dest));
      this.statTime.innerHTML = `${this.elapsed.toFixed(2)}<small>ms</small>`;
      this.statPQ.textContent = this.pqSize;
    }

    updateStepCounter() {
      this.stepCounter.textContent = `step ${this.idx} / ${this.steps ? this.steps.length : 0}`;
    }

    /* ---------------- theme & edit toggles ---------------- */
    toggleTheme() {
      const cur = document.body.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      localStorage.setItem("srf-theme", next);
    }

    toggleEdit() {
      this.editMode = !this.editMode;
      this.editToggle.setAttribute("aria-pressed", String(this.editMode));
      this.editHint.hidden = !this.editMode;
      if (!this.editMode && this.pendingNode) {
        this.renderer.setNodeClass(this.pendingNode, "pending", false);
        this.pendingNode = null;
      }
    }

    /* ---------------- canvas pointer interaction ---------------- */
    onPointerDown(e) {
      const nodeG = e.target.closest(".node");
      if (nodeG) {
        this.drag = { id: nodeG.dataset.id, sx: e.clientX, sy: e.clientY, moved: false };
        try { this.svg.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    onPointerMove(e) {
      if (!this.drag) return;
      const moved = Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) > 4;
      if (moved) this.drag.moved = true;
      if (this.drag.moved) {
        const p = svgPoint(this.svg, e);
        this.renderer.moveNode(this.graph, this.drag.id, clamp(p.x, 26, 874), clamp(p.y, 26, 534));
      }
    }

    onPointerUp(e) {
      if (this.drag) {
        const { id, moved } = this.drag;
        this.drag = null;
        if (!moved && this.editMode) this.handleEditNodeClick(id);
        return;
      }
      // pointer up on empty canvas while editing -> add a junction
      if (this.editMode && !e.target.closest(".node") && !e.target.closest(".edge")) {
        const p = svgPoint(this.svg, e);
        const id = nextLabel(this.graph.vertices);
        this.graph.addNode(id, clamp(p.x, 28, 872), clamp(p.y, 28, 532));
        this.afterGraphChange();
      }
    }

    handleEditNodeClick(id) {
      if (this.pendingNode === null) {
        this.pendingNode = id;
        this.renderer.setNodeClass(id, "pending", true);
        return;
      }
      if (this.pendingNode === id) {
        this.renderer.setNodeClass(id, "pending", false);
        this.pendingNode = null;
        return;
      }
      const a = this.pendingNode, b = id;
      this.renderer.setNodeClass(a, "pending", false);
      this.pendingNode = null;
      if (this.graph.hasEdge(a, b)) return;
      const wStr = prompt(`Weight (distance) for road ${a} – ${b}:`, "5");
      if (wStr === null) return;
      const w = parseInt(wStr, 10);
      if (!Number.isFinite(w) || w < 0) { alert("Please enter a non-negative integer."); return; }
      this.graph.addEdge(a, b, w);
      this.afterGraphChange();
    }

    onDblClick(e) {
      if (!this.editMode) return;
      const nodeG = e.target.closest(".node");
      if (nodeG) { this.graph.removeNode(nodeG.dataset.id); this.afterGraphChange(); return; }
      const line = e.target.closest(".edge");
      if (line && line.dataset.key) {
        const [a, b] = line.dataset.key.split("|");
        this.graph.removeEdge(a, b);
        this.afterGraphChange();
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => new App().init());
})();
