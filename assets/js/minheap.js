/* ============================================================
   MinHeap — an indexed binary min-heap used as the
   min-priority queue for Dijkstra's algorithm.

   Keyed on a vertex id; supports O(log V) insert, extract-min
   and decrease-key. A position map (vertex -> heap index) makes
   decrease-key O(log V) instead of O(V).
   ============================================================ */
class MinHeap {
  constructor() {
    this.heap = [];          // array of { v, priority }
    this.pos = new Map();    // vertex id -> index in heap
  }

  size()    { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }
  has(v)    { return this.pos.has(v); }

  _swap(i, j) {
    const a = this.heap[i], b = this.heap[j];
    this.heap[i] = b; this.heap[j] = a;
    this.pos.set(b.v, i);
    this.pos.set(a.v, j);
  }

  _siftUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].priority < this.heap[parent].priority) {
        this._swap(i, parent);
        i = parent;
      } else break;
    }
  }

  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.heap[l].priority < this.heap[smallest].priority) smallest = l;
      if (r < n && this.heap[r].priority < this.heap[smallest].priority) smallest = r;
      if (smallest !== i) { this._swap(i, smallest); i = smallest; }
      else break;
    }
  }

  /** Insert v with the given priority, or decrease its key if already present. */
  push(v, priority) {
    if (this.pos.has(v)) { this.decreaseKey(v, priority); return; }
    this.heap.push({ v, priority });
    const i = this.heap.length - 1;
    this.pos.set(v, i);
    this._siftUp(i);
  }

  /** Lower the priority of an existing vertex (no-op if not smaller). */
  decreaseKey(v, priority) {
    const i = this.pos.get(v);
    if (i === undefined) { this.push(v, priority); return; }
    if (priority < this.heap[i].priority) {
      this.heap[i].priority = priority;
      this._siftUp(i);
    }
  }

  /** Remove and return the { v, priority } with the smallest priority. */
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    this.pos.delete(top.v);
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.pos.set(last.v, 0);
      this._siftDown(0);
    }
    return top;
  }
}

// expose globally (loaded via classic <script>)
window.MinHeap = MinHeap;
