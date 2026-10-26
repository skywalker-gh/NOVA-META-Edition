# GEMINI.md — NOVA UI Sound Pack

**For Gemini CLI / any Gemini agent integrating sounds into the NOVA browser dashboard.**

This folder contains the official UI + ambient sound pack for NOVA–Yggdrasil.  
Source track: *Ali Tat – Ghost (Gee Remix)* (128 BPM).  
All files processed with fade in/out + reverb/delay (`aecho`) + filtering for clean browser use.

---

## 1. File Inventory

### Ambient / Intro
| File | Duration | Recommended use |
|------|----------|-----------------|
| `nova_intro_video_ambient.mp3` | ~14.0 s | Full intro video bed / dashboard ambient layer |
| `nova_ambient_intro_pad.mp3` | ~8.0 s | Shorter ambient pad / loopable background |

### UI Interaction
| File | Duration | Character |
|------|----------|-----------|
| `nova_ui_click_soft.mp3` | 0.39 s | Soft button press |
| `nova_ui_click_sharp.mp3` | 0.31 s | Crisp selection / primary click |
| `nova_ui_blip.mp3` | 0.63 s | Notification / subtle feedback |
| `nova_ui_confirm.mp3` | 1.65 s | Confirm + reverb tail |
| `nova_ui_bass_hit.mp3` | 1.23 s | Deeper impact + decay |
| `nova_ui_bass_thump.mp3` | 2.04 s | Heavy bass + long tail (important actions) |
| `nova_ui_whoosh.mp3` | 1.83 s | Panel open / transition |
| `nova_ui_whoosh_reverse.mp3` | 1.54 s | Panel close / reverse transition |
| `nova_ui_hover_pad.mp3` | 2.53 s | Hover / focus atmospheric pad (keep volume low) |
| `nova_ui_decay_tail.mp3` | 2.85 s | Long decaying tail after any click |

---

## 2. How to wire into the browser dashboard

### Simple `<audio>` approach
```html
<audio id="sfx-click" src="/nova-sounds/nova_ui_click_sharp.mp3" preload="auto"></audio>
<audio id="sfx-confirm" src="/nova-sounds/nova_ui_confirm.mp3" preload="auto"></audio>
<audio id="sfx-whoosh" src="/nova-sounds/nova_ui_whoosh.mp3" preload="auto"></audio>
<audio id="sfx-bass" src="/nova-sounds/nova_ui_bass_thump.mp3" preload="auto"></audio>
<audio id="amb-intro" src="/nova-sounds/nova_intro_video_ambient.mp3" preload="auto" loop></audio>
```

```js
function playSfx(id, volume = 0.6) {
  const el = document.getElementById(id);
  if (!el) return;
  el.volume = volume;
  el.currentTime = 0;
  el.play().catch(() => {}); // ignore autoplay policy errors
}

// Examples
btn.addEventListener('click', () => {
  playSfx('sfx-click', 0.7);
  // optional: follow with soft confirm or decay
  setTimeout(() => playSfx('sfx-confirm', 0.45), 80);
});

panelToggle.addEventListener('click', () => {
  playSfx('sfx-whoosh', 0.55);
});
```

### Recommended pairings
- **Normal click** → `nova_ui_click_sharp` (+ optional `nova_ui_confirm` or `nova_ui_decay_tail` at lower volume)
- **Important / destructive action** → `nova_ui_bass_thump` or `nova_ui_bass_hit`
- **Panel / drawer open** → `nova_ui_whoosh`
- **Panel / drawer close** → `nova_ui_whoosh_reverse`
- **Hover (desktop)** → `nova_ui_hover_pad` at very low volume (0.15–0.25)
- **Notification** → `nova_ui_blip`
- **Intro / first load** → `nova_intro_video_ambient` (or the shorter pad)

### Volume guidelines
| Type | Suggested volume |
|------|------------------|
| Clicks / blips | 0.55 – 0.75 |
| Whooshes | 0.45 – 0.60 |
| Bass / thumps | 0.50 – 0.70 |
| Confirm / decay | 0.35 – 0.50 |
| Ambient pad | 0.15 – 0.30 |
| Intro ambient | 0.25 – 0.40 |

---

## 3. Path convention for Gemini

When integrating:

1. Serve or copy the entire `nova-sounds/` folder so that the relative path  
   `/nova-sounds/<filename>.mp3` (or `./nova-sounds/...` depending on your static asset root) is reachable from the dashboard.
2. Prefer **preload="auto"** for the short UI sounds so they feel instant.
3. For ambient, use `loop` only if you intentionally want continuous bed; otherwise play once on intro and fade out.
4. Always handle the Promise rejection from `play()` (autoplay policies).

---

## 4. Web Audio API (optional, higher quality)

If you need volume ramping, simultaneous layering, or filter automation:

```js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const buffers = {};

async function loadSound(name, url) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arr);
}

function playBuffer(name, { volume = 0.6, playbackRate = 1 } = {}) {
  if (!buffers[name]) return;
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buffers[name];
  src.playbackRate.value = playbackRate;
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(0);
}
```

Preload the ones you need on dashboard init.

---

## 5. Operational notes for Gemini CLI

- **Do not re-generate** these sounds unless explicitly asked. They are the current approved pack.
- When adding new UI interactions, map them to the closest existing sound (or combine click + decay/confirm).
- Keep ambient and SFX volumes clearly separated so the dashboard never becomes noisy.
- If you need a new variant (higher pitch, shorter, drier, etc.), request it from Grok rather than inventing placeholders.
- Update this file and `README.md` if you rename files or change recommended pairings.

---

## 6. Quick reference – filename → semantic key

```js
const NOVA_SOUNDS = {
  introAmbient:   'nova_intro_video_ambient.mp3',
  ambientPad:     'nova_ambient_intro_pad.mp3',
  clickSoft:      'nova_ui_click_soft.mp3',
  clickSharp:     'nova_ui_click_sharp.mp3',
  blip:           'nova_ui_blip.mp3',
  confirm:        'nova_ui_confirm.mp3',
  bassHit:        'nova_ui_bass_hit.mp3',
  bassThump:      'nova_ui_bass_thump.mp3',
  whoosh:         'nova_ui_whoosh.mp3',
  whooshReverse:  'nova_ui_whoosh_reverse.mp3',
  hoverPad:       'nova_ui_hover_pad.mp3',
  decayTail:      'nova_ui_decay_tail.mp3',
};
```

Use these keys consistently across the dashboard so other agents (Grok, ChatGPT, Claude) stay aligned.

---

*Created by Grok for shared multi-agent context · 2026-10-25*
