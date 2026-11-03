// V6 drag-and-drop proof: runs the REAL index.html scripts in a minimal DOM stub
// (node:vm) and simulates pointer drag / click / wire / snap-back.
// Regression test for "drag und drop geht nicht".
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const KNOWN_IDS = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));

function makeRect(l = 0, t = 0, w = 800, h = 340) {
  return { left: l, top: t, width: w, height: h, right: l + w, bottom: t + h };
}

class El {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase();
    this._doc = doc;
    this.children = [];
    this.parent = null;
    this.style = {};
    this.dataset = {};
    this._cls = new Set();
    this._ownText = null;
    this._cn = '';
    Object.defineProperty(this, 'className', {
      get: () => this._cn,
      set: (v) => { this._cn = String(v); this._cls = new Set(this._cn.split(' ').filter(Boolean)); },
    });
    this.value = '';
    this.files = [];
    this._handlers = {};
    const self = this;
    this.classList = {
      add: (c) => { self._cls.add(c); self._sync(); },
      remove: (c) => { self._cls.delete(c); self._sync(); },
      toggle: (c, f) => { const on = f === undefined ? !self._cls.has(c) : !!f; if (on) self._cls.add(c); else self._cls.delete(c); self._sync(); return on; },
      contains: (c) => self._cls.has(c),
    };
  }
  _sync() { this._cn = [...this._cls].join(' '); }
  get textContent() {
    if (this._ownText !== null) return this._ownText;
    return this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) { this._ownText = String(v); }
  set innerHTML(v) { this.children = []; this._ownText = v === '' ? null : String(v); }
  get innerHTML() { return ''; }
  setAttribute() {}
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this);
    this.parent = null;
  }
  addEventListener(t, fn) { (this._handlers[t] = this._handlers[t] || []).push(fn); }
  removeEventListener(t, fn) { this._handlers[t] = (this._handlers[t] || []).filter((f) => f !== fn); }
  dispatch(t, ev) { for (const fn of [...(this._handlers[t] || [])]) fn(ev); }
  getBoundingClientRect() { return makeRect(10, 10, 12, 12); }
  closest() { return null; }
  scrollIntoView() {}
  focus() {}
  click() {}
  _matchPart(part) {
    if (!part.startsWith('.')) return this.tagName === String(part).toUpperCase();
    const m = part.match(/^\.([\w-]+)(?:\[([\w-]+)="([^"]+)"\])?$/);
    if (!m) return false;
    if (!this._cls.has(m[1])) return false;
    if (m[2] !== undefined) {
      const key = m[2].startsWith('data-') ? m[2].slice(5) : m[2];
      if (this.dataset[key] !== m[3]) return false;
    }
    return true;
  }
  contains(node) {
    let p = node;
    while (p) { if (p === this) return true; p = p.parent; }
    return false;
  }
  _findAll(parts, idx, out) {
    for (const c of this.children) {
      if (c._matchPart(parts[idx])) {
        if (idx === parts.length - 1) out.push(c);
        else c._findAll(parts, idx + 1, out);
      }
      c._findAll(parts, idx, out);
    }
    return out;
  }
  querySelectorAll(sel) { return this._findAll(String(sel).split(' '), 0, []); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

function buildCtx() {
  const els = {};
  const winHandlers = {};
  const window = {
    addEventListener: (t, fn) => { (winHandlers[t] = winHandlers[t] || []).push(fn); },
    removeEventListener: (t, fn) => { winHandlers[t] = (winHandlers[t] || []).filter((f) => f !== fn); },
  };
  const store = {};
  const doc = {
    _elFromPoint: () => null,
    getElementById: (id) => {
      if (!KNOWN_IDS.has(id)) return null;
      if (!els[id]) { els[id] = new El('div', doc); els[id].id = id; }
      return els[id];
    },
    createElement: (tag) => new El(tag, doc),
    createElementNS: (_ns, tag) => new El(tag, doc),
    elementFromPoint: (...a) => doc._elFromPoint(...a),
    body: null,
  };
  doc.body = new El('body', doc);
  const agents = [
    { id: 'codex', label: 'Codex CLI', role: 'writer', status: 'ready', version: 'v', detail: 'd', lastCheck: 't' },
    { id: 'gemini', label: 'Gemini CLI', role: 'reviewer', status: 'ready', version: 'v', detail: 'd', lastCheck: 't' },
    { id: 'muse', label: 'Muse', role: 'session', status: 'session', version: 'chat', detail: 'd', lastCheck: 't' },
    { id: 'grok', label: 'Grok', role: 'reviewer', status: 'ready', version: 'g', detail: 'd', lastCheck: 't' },
  ];
  const mkTask = (status) => ({
    id: 't9', goal: 'ship it', status, outcome: null, branch: 'task/t9',
    steps: [{ n: 1, id: 's1', agent: 'gemini', instruction: 'do review', status: 'pending', startedAt: null, endedAt: null, exitCode: null, timedOut: false, durationMs: null, output: null, error: null }],
    diffStat: null, checkResult: null, approvalId: null, mergedAt: null,
  });
  const fetch = async (url, opts = {}) => {
    const j = async (v) => v;
    const u = String(url);
    if (u.includes('/api/agents')) return { ok: true, status: 200, json: () => j(agents), text: async () => '' };
    if (u.includes('/api/workflow/run') && opts.method === 'POST') return { ok: true, status: 200, json: () => j(mkTask('running')), text: async () => '' };
    if (u.includes('/api/workflow?id=')) return { ok: true, status: 200, json: () => j(mkTask('running')), text: async () => '' };
    if (u.endsWith('/api/workflow') && opts.method === 'POST') return { ok: true, status: 201, json: () => j(mkTask('received')), text: async () => '' };
    if (u.endsWith('/api/chat') && opts.method === 'POST') {
      let ps = ['spark'];
      try { ps = JSON.parse(opts.body || '{}').providers || ps; } catch { /* default */ }
      return { ok: true, status: 200, json: () => j({ results: ps.map((p) => ({ provider: p, ok: true, reply: 'ok-' + p })), memory: { chars: 10, used: [] } }), text: async () => '' };
    }
    return { ok: true, status: 200, json: () => j([]), text: async () => '' };
  };
  const sandbox = {
    document: doc,
    window,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    fetch,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    console,
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(blocks.length, 2);
  blocks.forEach((b, i) => vm.runInContext(b, ctx, { filename: 'v6block' + i + '.js' }));
  const fire = (t, ev) => { for (const fn of [...(winHandlers[t] || [])]) fn(ev); };
  const canvas = doc.getElementById('wfCanvas');
  canvas.getBoundingClientRect = () => makeRect(0, 0, 800, 340);
  return { sb: sandbox, doc, fire, canvas, winHandlers };
}

let T = null;
before(() => { T = buildCtx(); });

test('V6drag: boot waits for bridge with empty canvas', () => {
  const hint = T.doc.getElementById('wfCanvasHint').textContent;
  assert.match(hint, /Waiting for bridge/);
  assert.equal(T.canvas.querySelectorAll('.wf-node').length, 0);
});

test('V6drag: dock renders 5 cards after connect', async () => {
  await T.sb.wfRefresh();
  const garage = T.doc.getElementById('wfGarage');
  assert.equal(garage.children.length, 5);
  assert.match(garage.children[1].textContent, /Codex Worker/);
  assert.ok(garage.children[1].querySelector('.tech-light').className.includes('light-green'));
});

test('V6drag: pointer drag drops a card on the canvas', () => {
  const card = T.doc.getElementById('wfGarage').children[1];
  assert.equal(typeof card.onpointerdown, 'function');
  card.onpointerdown({ button: 0, clientX: 100, clientY: 100, preventDefault: () => {} });
  T.fire('pointermove', { clientX: 400, clientY: 200 });
  assert.ok(T.doc.body.querySelector('.wf-ghost'), 'ghost follows pointer');
  assert.ok(T.canvas.classList.contains('wf-drop'), 'canvas highlights on hover');
  T.fire('pointerup', { clientX: 400, clientY: 200 });
  const nodes = T.canvas.querySelectorAll('.wf-node');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].style.left, '315px');
  assert.equal(nodes[0].style.top, '160px');
  assert.match(T.doc.getElementById('wfCanvasHint').textContent, /placed/);
  assert.equal(T.doc.body.querySelector('.wf-ghost'), null);
});

test('V6drag: plain click still adds a step', () => {
  const card = T.doc.getElementById('wfGarage').children[0];
  card.onpointerdown({ button: 0, clientX: 60, clientY: 60, preventDefault: () => {} });
  T.fire('pointerup', { clientX: 60, clientY: 60 });
  assert.equal(T.canvas.querySelectorAll('.wf-node').length, 2);
});

test('V6drag: chat question becomes the source card', () => {
  T.doc.getElementById('wfAsk').value = 'hello world';
  T.sb.wfAskSend();
  const nodes = T.canvas.querySelectorAll('.wf-node');
  assert.equal(nodes.length, 3);
  const src = nodes.find((e) => e.textContent.includes('hello world'));
  assert.ok(src, 'source node shows the question');
  assert.equal(src.style.borderStyle, 'dashed');
  assert.equal(src.querySelectorAll('.wf-pin-in').length, 0);
  assert.equal(src.querySelectorAll('.wf-pin-out').length, 3);
  assert.equal(T.doc.getElementById('wfAsk').value, '');
});

test('V6drag: output click then input click wires the chain', () => {
  const nodes = T.canvas.querySelectorAll('.wf-node');
  const outPin = nodes[0].querySelector('.wf-pin-out');
  const inPin = nodes[1].querySelector('.wf-pin-in');
  outPin.onclick({ stopPropagation: () => {} });
  inPin.onclick({ stopPropagation: () => {} });
  const svg = T.canvas.children.find((c) => c.tagName === 'SVG');
  assert.ok(svg && svg.children.length === 1, 'one wire drawn');
});

test('V6drag: node dragged back to dock snaps out of the canvas', () => {
  const before = T.canvas.querySelectorAll('.wf-node').length;
  const node = T.canvas.querySelectorAll('.wf-node')[0];
  node.onpointerdown({ target: node, clientX: 300, clientY: 150, preventDefault: () => {} });
  T.doc._elFromPoint = () => T.doc.getElementById('wfGarage');
  T.fire('pointermove', { clientX: 50, clientY: 500 });
  T.fire('pointerup', { clientX: 50, clientY: 500 });
  assert.equal(T.canvas.querySelectorAll('.wf-node').length, before - 1);
  assert.match(T.doc.getElementById('wfCanvasHint').textContent, /snapped back/);
});

test('V6drag: execute validates source and instructions, then starts', async () => {
  const conn = () => T.doc.getElementById('wfConn').textContent;
  // state: gemini agent node without instructions + source 'hello world'
  await T.sb.wfStart();
  assert.match(conn(), /none has instructions/);
  // delete the source -> source error
  const nodes = T.canvas.querySelectorAll('.wf-node');
  const src = nodes.find((e) => e.textContent.includes('hello world'));
  src.querySelector('.wf-node-x').onclick({ stopPropagation: () => {} });
  await T.sb.wfStart();
  assert.match(conn(), /No source card/);
  // restore source + type instructions -> starts
  T.doc.getElementById('wfAsk').value = 'ship it';
  T.sb.wfAskSend();
  const agent = T.canvas.querySelectorAll('.wf-node').find((e) => !e.textContent.includes('ship it'));
  const ta = agent.querySelector('textarea');
  ta.value = 'do review';
  ta.oninput();
  await T.sb.wfStart();
  assert.match(conn(), /Task t9 running/);
});

test('V6chat: agents render as cards with emoji and light, spark preselected', () => {
  const techs = T.doc.getElementById('techs');
  assert.equal(techs.children.length, 12);
  const c0 = techs.children[0];
  assert.ok(c0.className.includes('wf-dock-card'));
  assert.ok(c0.className.includes('sel'));
  assert.match(c0.textContent, /🌌/);
  assert.match(c0.textContent, /Muse Spark/);
  assert.ok(c0.querySelector('.tech-light'));
  assert.ok(!techs.children[7].className.includes('sel'));
});

test('V6chat: card click toggles multi-select', () => {
  const techs = T.doc.getElementById('techs');
  techs.children[7].onclick();
  assert.ok(T.doc.getElementById('techs').children[7].className.includes('sel'));
  assert.ok(T.doc.getElementById('techs').children[0].className.includes('sel'));
  T.doc.getElementById('techs').children[7].onclick();
  assert.ok(!T.doc.getElementById('techs').children[7].className.includes('sel'));
});

test('V6chat: send fans out to selected agents and lights them green', async () => {
  T.doc.getElementById('techs').children[7].onclick();
  T.doc.getElementById('input').value = 'hi';
  await T.sb.sendMessage();
  const msgs = T.doc.getElementById('messages').children;
  assert.equal(msgs.length, 3);
  assert.match(msgs[0].textContent, /hi/);
  assert.match(T.doc.getElementById('memBadge').textContent, /Memory: 10 chars/);
  const techs = T.doc.getElementById('techs');
  assert.ok(techs.children[0].querySelector('.tech-light').className.includes('light-green'));
  assert.ok(techs.children[7].querySelector('.tech-light').className.includes('light-green'));
});
