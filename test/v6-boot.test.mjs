// V6 dashboard boot wiring: auto-connect, offline guidance, drop + merge presence.
// Static by design — the repo has no browser harness; these strings are the
// exact call sites that failed in the field (empty garage, no connection shown).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('V6: auto-connect on boot (no manual Connect trap)', () => {
  assert.ok(html.includes('try { wfRefresh(); }'), 'boot must auto-call wfRefresh');
});

test('V6: offline state names the fix (start.bat + /v6)', () => {
  assert.ok(html.includes('http://127.0.0.1:8000/v6'), 'offline hint must point at /v6');
  assert.ok(html.includes('start.bat) and press Connect'), 'canvas hint must name start.bat + Connect');
});

test('V6: dock drag is pointer-based (ghost), pins live inside cards', () => {
  assert.ok(html.includes('wfDockDrag'), 'dock cards use pointer drag');
  assert.ok(html.includes('wf-ghost'), 'drag ghost follows pointer');
  assert.ok(html.includes('wf-pin-in'), 'input pins inside node');
  assert.ok(html.includes('wf-pin-out'), 'output pins inside node');
  assert.ok(html.includes('wfPinPos'), 'wires measured from live pin rects');
  assert.ok(!html.includes('text/agent'), 'no HTML5 DnD payload anymore');
  assert.ok(!html.includes('cv.ondrop'), 'no HTML5 drop handler anymore');
});

test('V6: merge button calls the approval-gated endpoint', () => {
  assert.ok(html.includes('onclick="wfMerge()"'), 'Run section needs the merge button');
  assert.ok(html.includes('/api/workflow/merge'), 'wfMerge must call /api/workflow/merge');
});

test('V6: aa5 title, badge, taskbar labels', () => {
  assert.ok(html.includes('Multi Agent-Bus /'), 'title must name Multi Agent-Bus');
  assert.ok(html.includes('N8N STYLE NODE GRAPH'), 'N8N badge required');
  assert.ok(html.includes('＋ Add Agent / Subagent'), 'taskbar add-agent label');
  assert.ok(html.includes('▶ Execute Workflow'), 'taskbar execute label');
  assert.ok(html.includes('⟳ Reset'), 'taskbar reset button');
  assert.ok(html.includes('Visual Workflow Manager to chain AI Agents and Task Sources seamlessly.'));
});

test('V6: source-chat model (no lower form)', () => {
  assert.ok(html.includes('Task Source</h4>'), 'chat section header');
  assert.ok(html.includes('id="wfAsk"'), 'chat input');
  assert.ok(html.includes('wfAskSend'), 'send puts source on canvas');
  assert.ok(html.includes('wfSourceAdd'), 'source card creator');
  assert.ok(html.includes('wfFilePicked'), 'upload picker');
  assert.ok(html.includes('V6 UI rev'), 'visible build stamp');
  assert.ok(!html.includes('wfGoal'), 'goal textarea gone');
  assert.ok(!html.includes('wfRenderSteps'), 'step editor gone');
  assert.ok(!html.includes('wfCheck'), 'check input gone');
});

test('V6: chat layout — agents top, divider, buttons Reset/Image/Send', () => {
  const d1 = html.indexOf('<div class="wf-divider"></div>');
  const agentsH = html.indexOf('AI Agents & Models');
  assert.ok(d1 > -1 && d1 < agentsH, 'divider above agents header');
  assert.ok(agentsH < html.indexOf('id="techs"'), 'header above techs');
  assert.ok(html.indexOf('id="techs"') < html.indexOf('id="messages"'), 'techs above messages');
  assert.equal(html.split('<div class="wf-divider"></div>').length - 1, 7, 'chat x5 + workflow x2 dividers');
  const tail = html.slice(html.indexOf('margin-left:auto'));
  assert.ok(tail.indexOf('↺ Reset') < tail.indexOf('Generate Image'), 'Reset left of Image');
  assert.ok(tail.indexOf('Generate Image') < tail.indexOf('▶ Send'), 'Image left of Send');
  assert.ok(html.includes('Choose your Agent or Agents (For Multiple Answers)'), 'agent help text');
  assert.ok(html.includes('Activate your Agent to send him a message in the chat below.'), 'activation hint');
  assert.ok(!html.includes('Choose your Destiny'), 'old text gone');
  assert.ok(html.includes('chat-pic-img'), 'portrait image beside chat');
  assert.ok(html.includes('.chat-wrap>.card{flex:1;min-width:0;margin-bottom:0}'), 'card margin moved to wrap (flush bottom)');
  assert.ok(html.includes('nova-new-chat-side3'), 'side artwork wired');
  assert.ok(html.includes('Created with Muse Image'), 'hover caption');
  assert.ok(html.includes('AI Agents & Models 🤖'), 'agents title one size');
  assert.ok(html.indexOf('addNewTech') < html.indexOf('AI Agents & Models'), 'plus left of title');
  assert.ok(html.includes('& Models 🤖'), 'agents title tail');
  assert.ok(!html.includes('// AI Agents'), 'no NOVA prefix in agents title');
  assert.ok(html.includes('Multi-Model AI Ecosystem'), 'top subtitle line 1');
  assert.ok(html.includes('Muse Spark Version 1.0'), 'top subtitle line 2');
});

test('V6: aa5 dock cards with lamps and dots', () => {
  for (const name of ['Gemini CLI', 'Codex Worker', 'Phobos CI', 'Grok Reviewer', 'Tommy PC']) {
    assert.ok(html.includes(name), 'dock must list ' + name);
  }
  assert.ok(html.includes('Agent-Bus Dockingstation'), 'dock section title');
  assert.ok(html.includes('wf-dock-ports'), 'dock cards need inside port footer');
  assert.ok(html.includes('wfTommyLight'), 'Tommy lamp element');
  assert.ok(html.includes('Connector Problem! Check the Dockingstation below'), 'master red text');
});

test('V6: UI click sounds wired (audio + delegated playSfx)', () => {
  assert.ok(html.includes('id="sfx-click"'), 'click audio element required');
  assert.ok(html.includes('id="sfx-bass"'), 'bass audio element required');
  assert.ok(html.includes('/nova-sounds/nova_ui_bass_hit.mp3'), 'click src must hit bridge route');
  assert.ok(html.includes('function playSfx(id'), 'playSfx helper required');
  assert.ok(html.includes("closest('button')"), 'delegated button click wiring required');
});
