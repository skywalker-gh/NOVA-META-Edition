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
  assert.ok(html.includes('Under Construction'), 'construction badge required');
  assert.ok(html.includes('Advanced Codepad for workflow automations with different Agents & Models.'), 'dockingstation subline required');
  assert.ok(html.includes('Drag a card into the Workflow Manager Box below, or click it to add a step.'), 'dockingstation hint required');
  assert.ok(html.includes('Agent-Bus Dockingstation & Workflow Manager Box ⚙️'), 'merged section header required');
  assert.ok(!html.includes('Clear wires'), 'clear-wires button removed');
  assert.ok(!html.includes('Garage is live'), 'garage-live hint removed');
  assert.ok(html.includes('.wf-divider-gray{height:2px;margin:14px 0 4px;background:linear-gradient(90deg,transparent,#6b7280,transparent)'), 'gray divider like lila required');
  assert.ok(html.includes('repeating-linear-gradient(-45deg,#facc15'), 'construction stripes required');
  assert.ok(html.includes('＋ Add Custom Agent'), 'gray custom-agent button like below');
  assert.ok(html.indexOf('Add Agent / Subagent') < html.indexOf('Agent-Bus Dockingstation &'), 'subagent button above dock');
  assert.ok(html.includes('▶ Execute Workflow'), 'taskbar execute label');
  assert.ok(html.includes('↺ Reset'), 'reset button matches chat style');
  assert.ok(html.includes('Task Sources seamlessly</span>'), 'manager subtitle without end period');
  assert.ok(html.includes('every merge gated by human approval.</i>'), 'manager jury line with period');
});

test('V6: source-chat model (no lower form)', () => {
  assert.ok(html.includes('<b>Task Source</b>'), 'chat section header');
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
  const lamps = html.indexOf('Lamps stay gray');
  const agentsH = html.indexOf('AI Agents & Models');
  assert.ok(lamps > -1 && html.indexOf('<div class="wf-divider-gray"></div>', lamps) > lamps && html.indexOf('<div class="wf-divider-gray"></div>', lamps) < agentsH, 'gray divider between lamps and agents header');
  assert.ok(agentsH < html.indexOf('id="techs"'), 'header above techs');
  assert.ok(html.indexOf('id="techs"') < html.indexOf('id="messages"'), 'techs above messages');
  assert.equal(html.split('<div class="wf-divider"').length - 1, 10, 'lila dividers after gray swap');
  assert.equal(html.split('<div class="wf-divider-gray"').length - 1, 4, 'gray: chat x2 + workflow x2');
  const tail = html.slice(html.indexOf('margin-left:auto'));
  assert.ok(tail.indexOf('↺ Reset') < tail.indexOf('Generate Image'), 'Reset left of Image');
  assert.ok(tail.indexOf('Generate Image') < tail.indexOf('▶ Send'), 'Image left of Send');
  assert.ok(html.includes('Choose your Agent or Agents (For Multiple Answers)'), 'agent help text');
  assert.ok(html.includes('Activate your Agent to send him a message in the chat below.'), 'activation hint');
  assert.ok(!html.includes('Choose your Destiny'), 'old text gone');
  assert.ok(!html.includes('<aside class="chat-pic">'), 'side portrait removed');
  assert.ok(html.includes('.chat-wrap>.card{flex:1;min-width:0;margin-bottom:0}'), 'card margin moved to wrap (flush bottom)');
  assert.ok(!html.includes('nova-new-chat-side3'), 'side artwork unwired');
  assert.ok(!html.includes('Created with Muse Image'), 'hover caption gone');
  assert.ok(html.includes('AI Agents & Models 🤖'), 'agents title one size');
  assert.ok(html.indexOf('addNewTech') < html.indexOf('AI Agents & Models'), 'plus left of title');
  assert.ok(html.includes('& Models 🤖'), 'agents title tail');
  assert.ok(!html.includes('// AI Agents'), 'no NOVA prefix in agents title');
  assert.ok(html.includes('Multi-Model AI Ecosystem'), 'top subtitle line 1');
  assert.ok(html.includes('Muse Spark Version 1.0'), 'top subtitle line 2');
});

test('V6: aa5 dock cards with lamps and dots', () => {
  for (const name of ['Gemini CLI', 'Codex Worker', 'Grok Reviewer']) {
    assert.ok(html.includes(name), 'dock must list ' + name);
  }
  assert.ok(html.includes('Agent-Bus Dockingstation'), 'dock section title');
  assert.ok(!html.includes("name: 'Phobos CI'"), 'phobos card removed');
  assert.ok(!html.includes("name: 'Tommy PC'"), 'tommy card removed');
  assert.ok(html.includes('wf-dock-ports'), 'dock cards need inside port footer');
  assert.ok(html.includes('wfTommyLight'), 'Tommy lamp element');
  assert.ok(html.includes('Connector Problem! Check the Dockingstation below'), 'master red text');
});

test('V6: trap scrolls top, workflow after art, task source under garage, bottom row, auto-fill', () => {
  assert.ok(html.includes('window.scrollTo(0, 0)'), 'trap enter scrolls to top');
  assert.ok(html.indexOf('Multi Agent-Bus / Workflow Manager') < html.indexOf('// API Keys'), 'workflow card sits after the art');
  assert.ok(html.indexOf('id="wfCanvas"') < html.indexOf('<b>Task Source</b>'), 'task source row sits under the canvas');
  assert.ok(html.indexOf('<b>Task Source</b>') < html.indexOf('>Run</h4>'), 'task source row sits above run');
  assert.ok(html.includes('For the workflow manager above, just write your request and hit the button to its right.'), 'task source hint required');
  assert.ok(html.includes('onclick="wfAskSend()" title="Send to canvas">'), 'canvas send required');
  assert.ok(!html.includes('onclick="wfDemo()"'), 'demo button removed for space');
  assert.ok(html.includes('<button class="btn-orange" onclick="wfResetGraph()">'), 'reset matches chat style');
  assert.ok(html.includes('<button class="btn-send" style="margin-left:0" onclick="wfSave()">'), 'save matches blue-lila send style');
  assert.ok(html.includes('<button class="btn-send" style="margin-left:0" onclick="wfStart()">'), 'execute like send, margins zeroed');
  assert.ok(html.includes('Create <b>Task Source</b> Card'), 'task source header required');
  assert.ok(html.includes('For the workflow manager above'), 'task source subline required');
  assert.ok(!html.includes('btn-add'), 'custom add style removed, chat plus reused');
  assert.ok(html.includes("s.instruction = 'Execute Workflow'"), 'empty instructions auto-filled');
  assert.ok(html.includes('No step cards on the canvas'), 'empty-canvas message required');
  assert.ok(html.includes('<details id="wfRunFold" style="flex:1;min-width:0">'), 'run content folded behind advanced');
  assert.ok(html.indexOf('id="wfRunFold"') < html.indexOf('id="wfTaskList"'), 'task list folds too');
  assert.ok(html.includes('<details id="wfKeysFold"'), 'keys fold required');
  assert.ok(html.includes('<details id="wfLogFold"'), 'log fold required');
  assert.ok(html.includes('align-items:baseline'), 'fold titles bottom-aligned');
});

test('V6: green signal first, favicon, meta link, 3-brains header', () => {
  assert.ok(html.indexOf("title: 'GREEN SIGNAL'") < html.indexOf("title: 'NEON CITY'"), 'green signal plays first');
  assert.ok(html.includes('<link rel="icon" href="grafik/favicon.ico"'), 'favicon required');
  assert.ok(html.includes('<a href="https://www.meta.ai/"'), 'trap meta logo links to meta');
  assert.ok(html.includes('Multi-Agent Bus - Chat</span>'), 'chat header bold part required');
  assert.ok(html.includes('answers in parallel from shared project memory'), 'how-it-works line required');
  assert.ok(html.includes('Lamps stay gray until first contact'), 'lamp rule required');
  assert.ok(html.includes('selected.size===0'), 'empty-selection guard required');
  assert.ok(html.includes('all cards start gray'), 'gray-on-open default required');
  assert.ok(html.includes('.msg-user{background:#0064e0'), 'user chat on meta blue');
});

test('V6: musicbox card in top layer, 2-track playlist, click sounds removed', () => {
  assert.ok(html.includes('id="topLayer"'), 'top layer required');
  assert.ok(html.includes('NOVA-SECOND-LAYER'), 'second layer background required');
  assert.ok(html.includes('/prework/NOVA-TOP-LAYER%20Kopie.png'), 'banner uses top layer art');
  assert.ok(html.includes('id="novaPlayer"'), 'player card required');
  assert.ok(html.includes('NEON CITY'), 'track 1 name required');
  assert.ok(html.includes('CYBERLOPOT'), 'track 1 artist required');
  assert.ok(html.includes('youtube.com/watch?v=ZWyv_w_cFiw'), 'track 1 youtube required');
  assert.ok(html.includes('GREEN SIGNAL'), 'track 2 name required');
  assert.ok(html.includes('youtube.com/channel/UCuES77aLmrE7ApbwaUmpvaA'), 'track 2 youtube required');
  assert.ok(html.includes('id="npPlay"') && html.includes('id="npPause"') && html.includes('id="npStop"') && html.includes('id="npNext"'), 'transport buttons required');
  assert.ok(html.includes('id="npVol"'), 'volume control required');
  assert.ok(html.includes('// Musicbox'), 'player header required');
  assert.ok(html.includes('id="npStatus"'), 'player status line required');
  assert.ok(html.includes('encodeURIComponent(tracks[ti].file)'), 'src must be encoded (spaces/%/emoji in name)');
  assert.ok(!html.includes('playSfx'), 'click sounds removed');
  assert.ok(!html.includes('id="sfx-click"'), 'sfx elements removed');
  assert.ok(html.includes("addEventListener('ended'") && html.includes('loadTrack(ti + 1, true)'), 'auto-advance to next track on ended');
  assert.ok(!html.includes('audio.loop = true'), 'single-track loop off (playlist rotates)');
});

test('V6: layer strokes and glows (banner gray, chat hover gradient, cards gray until click)', () => {
  assert.ok(html.includes('.banner-wrap{position:relative;border-radius:16px;overflow:hidden;margin-bottom:24px;background:#000;border:1px solid #333}'), 'banner gray stroke');
  assert.ok(html.includes('id="chatLayer"'), 'chat layer id required');
  assert.ok(html.includes('#chatLayer:hover{border:1px solid transparent;background:linear-gradient(#111,#111) padding-box,linear-gradient(135deg,#a3e635,#f97316) border-box'), 'chat hover gradient stroke green-orange');
  assert.ok(html.includes('.art-wrap:hover{border-color:#0064e0;box-shadow:0 0 24px rgba(0,100,224,.45)'), 'art layer hover-only blue glow + stroke');
  assert.ok(html.includes('.wf-dock-card{position:relative;width:200px;background:#151515;border:1px solid #333;'), 'cards gray until click');
  assert.ok(html.includes('linear-gradient(135deg,#0064e0,#a3e635)'), 'selected gradient is blue to neon-green');
  assert.ok(!html.includes('tech-gold'), 'gold tier removed');
  assert.ok(html.includes('.wf-dock-card.sel.tech-green'), 'rest selected green required');
  assert.ok(html.includes("t.id==='chatgpt') glow=' tech-grad'"), 'chatgpt joins the gradient group');
});

test('V6: static-host fallback swaps prework art to repo paths (Pages)', () => {
  assert.ok(html.includes('id="bannerImg"'), 'banner needs id for swap');
  assert.ok(html.includes('Grafik%20Prework%20for%20Web%20and%20Design'), 'static base path required');
  assert.ok(html.includes("swap('trapImg'"), 'trap image swap required');
  assert.ok(html.includes("swap('bannerImg'"), 'banner swap required');
  assert.ok(html.includes("typeof location !== 'undefined'"), 'sandbox-safe host check required');
});

test('V6: jury intro, banner stroke, chat art, captions', () => {
  assert.ok(html.includes('.banner-wrap:hover{box-shadow:0 0 30px #a3e635, 0 0 60px rgba(163,230,53,0.4);transition:box-shadow 0.3s;border-color:#a3e635}'), 'banner hover green stroke');
  assert.ok(html.includes('enjoy the ride through my vision'), 'jury intro line required');
  assert.ok(html.includes('id="chatArt"'), 'chat art required');
  assert.ok(html.includes('cyberblick%202%20Kopie.png'), 'chat art src required');
  assert.ok(html.includes('object-position:center'), 'faces stay centered');
  assert.ok(html.includes('Image created with Meta AI'), 'banner caption variant required');
  assert.ok(html.includes('Image created with Muse Image'), 'art caption required');
  assert.ok(html.includes('id="trapMeta"'), 'trap meta logo required');
  assert.ok(html.includes('© Meta · 2026'), 'captions use (c) + year');
  assert.ok(!html.includes('cap-date'), 'dynamic dates removed');
  assert.ok(html.includes('glowFollow'), 'trap glow follows the mouse');
  assert.ok(html.includes("swap('chatArt'"), 'chat art static swap required');
  assert.ok(html.includes("swap('trapMeta'"), 'meta logo static swap required');
});

test('V6: human trap startscreen (image -> black -> logo click opens page + sound)', () => {
  assert.ok(html.includes('id="humanTrap"'), 'trap overlay required');
  assert.ok(html.includes('Muse%20Image%20-%20Ygdrassil.png'), 'trap image required');
  assert.ok(html.includes('NOVA%20-%20Meta%20Logo%20-%20Transparent%20Kopie.png'), 'trap logo (transparent) required');
  assert.ok(html.includes("#trapLogo:hover"), 'logo hover glow required');
  assert.ok(html.includes("trap.style.display = 'none'"), 'click must open the page');
  assert.ok(html.includes('ng.gain.value = 1.4'), 'full-blast gain after trap');
  assert.ok(html.includes('value="100"'), 'volume slider maxed by default');
});
