# NOVA UI Sound Pack

Source: **Ali Tat – Ghost (Gee Remix)** (128 BPM)  
Processed with fades + `aecho` (reverb/delay) + high/low-pass filtering for clean UI use.

## Intro / Ambient

| File | Duration | Use |
|------|----------|-----|
| `nova_intro_video_ambient.mp3` | ~14 s | Full intro video / dashboard ambient bed |
| `nova_ambient_intro_pad.mp3` | ~8 s | Shorter ambient loop / pad |

## UI Interaction Sounds

| File | Duration | Character / Use |
|------|----------|-----------------|
| `nova_ui_click_soft.mp3` | 0.39 s | Soft confirm / button press |
| `nova_ui_click_sharp.mp3` | 0.31 s | Crisp click / selection |
| `nova_ui_blip.mp3` | 0.63 s | Notification / subtle feedback |
| `nova_ui_confirm.mp3` | 1.65 s | Confirm with nice reverb tail |
| `nova_ui_bass_hit.mp3` | 1.23 s | Deeper impact + decay |
| `nova_ui_bass_thump.mp3` | 2.04 s | Heavy bass thump + long tail (important actions) |
| `nova_ui_whoosh.mp3` | 1.83 s | Transition / open / close |
| `nova_ui_whoosh_reverse.mp3` | 1.54 s | Reverse whoosh / special transition |
| `nova_ui_hover_pad.mp3` | 2.53 s | Hover / focus atmospheric pad |
| `nova_ui_decay_tail.mp3` | 2.85 s | Long decaying tail after click |

## Recommended pairings for dashboard

- **Click → Confirm**: `nova_ui_click_sharp` + `nova_ui_confirm` (or just the confirm)
- **Important action**: `nova_ui_bass_thump` or `nova_ui_bass_hit`
- **Hover**: `nova_ui_hover_pad` (very quiet volume)
- **Panel open/close**: `nova_ui_whoosh` / `nova_ui_whoosh_reverse`
- **After any click (decay)**: layer or follow with `nova_ui_decay_tail` at low volume

All files are stereo MP3 192–256 kbps, ready for browser `<audio>` or Web Audio API.

See **GEMINI.md** for full integration guide for Gemini CLI.
