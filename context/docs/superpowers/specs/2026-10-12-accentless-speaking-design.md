# Accentless: British RP Pronunciation Coach — Design Specification

**Date:** 2026-10-12  
**Target Platform:** Android (Google Play Store ready, API 21+ / Android 5.0 to Android 14+)  
**Framework:** Flutter (Dart)  
**Status:** Approved Draft for Implementation Planning  

---

## 1. Executive Summary & Vision

**Accentless: British RP Coach** is a gamified, high-tech mobile pronunciation training application designed to help non-native English speakers master authentic British Received Pronunciation (Standard Southern British / RP).

The app combines:
1. **Gamified Progression (Duo-Style):** An engaging learning path with unlockable nodes, XP, daily flame streaks, hearts, and a charismatic British guide (*Professor Higgins*).
2. **High-Tech Audio Studio:** A tactile, glowing central recording button with animated real-time audio waveforms and instant phonetic scoring.
3. **Anatomical Mouth & Tongue Guides:** Interactive articulatory diagrams depicting exact tongue elevation, jaw opening, and lip rounding for distinct RP phonemes.
4. **Interactive British Roleplay Scenarios:** Multi-turn simulated conversations (London Tea Shop, Oxford Seminar, Westminster Black Cab, Boardroom Presentation).
5. **Google Gemini Voice Coach:** Integrated multimodal AI accent coach providing spoken and written diction tips.
6. **Local PC Gemini Collaboration Workspace (`gemini_collab/`):** A dedicated folder and root `GEMINI.md` enabling continuous AI-assisted lesson generation, curriculum expansion, and project maintenance from the user's PC.
7. **Google Play Store Readiness:** Full Android Gradle setup (target SDK 34), runtime permissions, adaptive icons, and release signing instructions.

---

## 2. Core Functional Requirements

### 2.1. British Received Pronunciation (RP) Curriculum
The curriculum focuses specifically on the phonetic markers distinguishing authentic British RP:
- **The BATH Vowel (/ɑː/):** Un-rounded, open back vowel in *bath, grass, path, dance, ask, after, master* (contrasting with General American /æ/).
- **Non-Rhoticity (Silent 'R'):** Eradicating post-vocalic rhotic coloring in words like *car* (/kɑː/), *water* (/ˈwɔːtə/), *hard* (/hɑːd/), and *doctor* (/ˈdɒktə/), while training linking and intrusive /r/.
- **Alveolar 'T' vs Flap:** Crisp alveolar plosive [t] in *city, butter, water, party* instead of the American flap [ɾ] or lazy slurring.
- **The LOT/CLOTH Vowel (/ɒ/):** Open back rounded short vowel in *lot, pot, wash, off, coffee*.
- **The GOAT Diphthong (/əʊ/):** Mid-central to high-back rounded glide in *go, home, road, boat* (vs GenAm [oʊ]).
- **The NURSE Vowel (/ɜː/):** Mid-central non-rhotic vowel in *bird, nurse, learn, work*.
- **Intonation & Cadence:** Syllable timing, stress prominence, and British melodic fall-rise patterns.

### 2.2. Gamified Learning Experience
- **Learning Map:** Step-by-step winding path of lesson nodes grouped into 6 thematic units:
  1. *Unit 1: The Royal Vowels (/ɑː/, /ɒ/, /iː/)*
  2. *Unit 2: The Art of the Silent 'R' (Non-Rhotic Codas)*
  3. *Unit 3: Crisp Consonants & Alveolar 'T'*
  4. *Unit 4: Diphthongs & The GOAT Glide (/əʊ/, /eə/)*
  5. *Unit 5: British Scenarios & Social Roleplays*
  6. *Unit 6: The Higgins Master Exam (Final Boss)*
- **Game Mechanics:**
  - **Daily Streaks (🔥):** Tracks consecutive practice days with streak freezes.
  - **Experience Points (XP ⚡):** 10 XP for standard drill, 25 XP for perfect 90%+ scores, 50 XP for roleplay scenarios.
  - **Hearts (❤️):** 5-heart system to encourage focused repetition.
  - **Mascot Messages:** Professor Higgins character delivering British aphorisms ("Splendid!", "Jolly good!", "Keep your tongue back on that vowel!").

### 2.3. High-Tech Audio Studio & Feedback Widget
- Prominent central microphone button with smooth tactile tap animations and state changes (Idle, Recording, Analyzing, Result).
- Live pulsing visualizer waveform responding to microphone input amplitude.
- Audio playback of native British RP reference clips.
- Result scorecard:
  - Overall RP Accuracy percentage (0–100%).
  - Word & phoneme color-coding (Green ≥ 85%, Amber 60–84%, Red < 60%).
  - Instant coaching tip detailing how to adjust the articulators.

### 2.4. Articulatory Anatomical Guides
- Custom vector/canvas-drawn sagittal section diagrams of the vocal tract (lips, teeth, alveolar ridge, hard palate, soft palate/velum, tongue tip, tongue body).
- Visual annotations indicating:
  - Tongue height and backness (e.g. low-back for /ɑː/, high-front for /iː/).
  - Lip shape (neutral, spread, rounded).
  - Airflow path (plosive stop vs fricative vs vowel resonance).

### 2.5. Interactive British Roleplay Scenarios
- Turn-by-turn conversational drills:
  1. *Mayfair Tea Room:* Ordering Earl Grey tea and scones with clotted cream.
  2. *Westminster Black Cab:* Directing a London cabbie through Whitehall to Waterloo.
  3. *Oxford Tutorial:* Discussing a historical essay with an Oxford don.
  4. *City of London Boardroom:* Presenting quarterly strategy with calm, measured RP cadence.
- User hears the NPC audio, views target script with phonetic annotations, records response, and receives contextual dialogue continuation.

### 2.6. Gemini AI Accent Coach (`GeminiCoachService`)
- Native client to call Google Gemini API (Gemini 1.5 Flash / Gemini 2.0).
- Capabilities:
  - Analyzes audio recording or transcribed utterance against British RP standard.
  - Generates bespoke pronunciation suggestions, phonetic corrections, and contextual roleplay dialogue responses.
  - Configurable with an API key via in-app Settings or environment variable.
  - Graceful fallback to offline phonetic heuristic scoring when offline or no API key is set.

### 2.7. Google Gemini PC Collaboration Hub (`gemini_collab/`)
- Root `GEMINI.md`: Full architectural context, conventions, and operational guide for Gemini CLI when working in this project.
- `gemini_collab/README.md`: Instruction manual for working with Gemini CLI and scripts on PC.
- `gemini_collab/prompts/`: Curated system prompts for:
  - `generate_drills.md`: Prompt for creating new phoneme minimal pairs.
  - `generate_roleplay.md`: Prompt for drafting new multi-turn British dialogues.
  - `phonetic_audit.md`: Prompt for auditing phonetic accuracy.
- `gemini_collab/scripts/lesson_generator.py`: Executable Python CLI utility that connects to Gemini to generate new lesson JSON files and validate IPA transcriptions directly into `assets/lessons/`.
- `gemini_collab/notes/`: Roadmap, task tracking, and collaboration log.

### 2.8. Google Play Store Readiness
- Package ID: `com.accentless.speaking.rpcoach`
- Minimum SDK: 21 (Android 5.0 Lollipop), Target SDK: 34 (Android 14).
- Runtime permissions in `AndroidManifest.xml`: `android.permission.RECORD_AUDIO`, `android.permission.INTERNET`, `android.permission.VIBRATE`.
- Play Store assets structure: adaptive launcher icons, splash screen, and release build guide (`KEYSTORE_AND_RELEASE_GUIDE.md`).

---

## 3. System Architecture & Project Structure

```text
accentless_speaking/
├── GEMINI.md                             # Root Gemini CLI project context & instructions
├── pubspec.yaml                          # Flutter package dependencies and asset definitions
├── README.md                             # Project overview and run guide
├── KEYSTORE_AND_RELEASE_GUIDE.md         # Step-by-step Google Play release build guide
│
├── android/                              # Native Android configuration
│   ├── app/
│   │   ├── build.gradle                  # MinSDK 21, TargetSDK 34, namespace com.accentless.speaking.rpcoach
│   │   └── src/main/
│   │       ├── AndroidManifest.xml       # Microphone, Internet, Vibration permissions
│   │       └── res/                      # App icons and themes
│   └── build.gradle
│
├── assets/
│   ├── data/
│   │   ├── rp_phonetics.json             # RP IPA phoneme inventory & articulatory rules
│   │   └── lessons.json                  # Units, levels, phrases, and minimal pairs
│   ├── audio/                            # Bundled native reference audio samples
│   ├── images/                           # Professor Higgins mascot & anatomical diagrams
│   └── icons/                            # UI & App icons
│
├── gemini_collab/                        # PC Gemini Collaboration Workspace
│   ├── README.md                         # Guide for collaborating with Gemini on PC
│   ├── prompts/                          # System prompts for lesson & dialogue creation
│   │   ├── generate_drills.md
│   │   └── generate_roleplay.md
│   ├── scripts/                          # PC automation tools
│   │   └── lesson_generator.py           # Python CLI to generate new lessons via Gemini API
│   └── notes/                            # Project scratchpad & roadmap
│
├── lib/
│   ├── main.dart                         # Entry point, Theme initialization & MultiProvider/Bloc
│   ├── core/
│   │   ├── theme/                        # British Royal Oxford Navy & Gold Material 3 theme
│   │   │   ├── app_colors.dart
│   │   │   └── app_theme.dart
│   │   ├── constants/                    # Phonetic constants & route names
│   │   └── utils/                        # Levenshtein distance, IPA string formatter
│   │
│   ├── features/
│   │   ├── gamification/                 # Duo-style game loop
│   │   │   ├── models/                   # UserProgress, Streak, Quest, LevelNode
│   │   │   ├── providers/                # GamificationState / ProgressManager
│   │   │   └── presentation/             # RoadmapPathWidget, StreakCounter, HeartsBar
│   │   │
│   │   ├── assessment/                   # Core audio evaluation
│   │   │   ├── domain/                   # AssessmentResult, PhonemeScore, IAssessmentService
│   │   │   ├── services/                 # OfflineRPEngine, AudioRecordingService
│   │   │   └── presentation/             # StudioRecordButton, LiveWaveformWidget, ScorecardModal
│   │   │
│   │   ├── anatomy/                      # Articulatory anatomical guides
│   │   │   ├── models/                   # ArticulatorPlacement (/ɑː/, /ɒ/, /t/, /r/)
│   │   │   └── presentation/             # MouthCrossSectionPainter, AnatomyGuideCard
│   │   │
│   │   ├── roleplay/                     # British conversational scenarios
│   │   │   ├── models/                   # Scenario, DialogueTurn
│   │   │   └── presentation/             # RoleplayScreen, DialogueBubbleWidget
│   │   │
│   │   ├── gemini_coach/                 # Gemini AI integration
│   │   │   ├── services/                 # GeminiCoachService (Gemini 1.5/2.0 API client)
│   │   │   └── presentation/             # HigginsChatScreen, FeedbackCard
│   │   │
│   │   └── home/                         # Main navigation scaffold
│   │       └── presentation/             # MainTabsScaffold (Roadmap, Studio, Roleplay, Coach)
│   │
│   └── shared/                           # Reusable UI components (HapticButton, RoyalCard, etc.)
│
└── test/                                 # Unit & Widget tests
    ├── phonetic_scoring_test.dart        # Tests for RP IPA phoneme matching & scoring
    ├── gamification_logic_test.dart      # Tests for streaks, hearts, and XP awards
    └── lesson_loader_test.dart           # Tests for JSON curriculum parsing
```

---

## 4. Key Component Design & Data Flow

### 4.1. Audio Recording & Assessment Flow
1. **User action:** User taps the glowing `StudioRecordButton`.
2. **Audio recording:** `AudioRecordingService` initializes the microphone (16kHz WAV format) and streams normalized amplitude chunks to `LiveWaveformWidget`.
3. **Completion:** User taps stop (or auto-stops on silence timeout).
4. **Scoring Dispatch:**
   - **Offline Mode (Default):** `OfflineRPEngine` evaluates the utterance against target RP IPA phonemes in `rp_phonetics.json`. It computes:
     - Levenshtein distance between spoken phonemes and RP target.
     - Specific non-RP error flags (e.g. detected rhotic coloring, flapped /t/, or American [æ] vowel).
     - Overall accuracy score (0–100%).
   - **Gemini AI Mode (When API key active):** `GeminiCoachService` sends audio/transcription with a specialized prompt to obtain detailed vocal feedback.
5. **Gamification update:** `GamificationState` awards XP, checks daily streak, and deducts a heart if accuracy is below 60%.
6. **Result presentation:** Bottom sheet modal pops up with sound chime, visual phoneme breakdown, and anatomical suggestion.

### 4.2. Articulatory Anatomy Painter
- A custom `CustomPainter` (`MouthCrossSectionPainter`) that draws:
  - Fixed structures: Upper jaw, teeth, hard palate, velum, pharynx wall.
  - Dynamic highlight structures: Tongue body curve, tongue tip elevation, lip protrusion.
  - Active phoneme highlight: When viewing /ɑː/, the painter draws the tongue pulled back and low, jaw dropped, with a callout pointing to the pharyngeal cavity.

### 4.3. Gemini PC Collaboration Workflow
1. The user on their PC opens a terminal inside `accentless_speaking/`.
2. Any Gemini CLI session automatically reads `GEMINI.md`.
3. The user or Gemini can execute:
   ```bash
   python gemini_collab/scripts/lesson_generator.py --unit "British Consonants" --focus "Clear Alveolar T"
   ```
4. The script requests the Gemini API to format verified IPA lessons, validates against JSON schemas, and appends the new lessons directly into `assets/data/lessons.json`.

---

## 5. Visual Theme & Design Tokens

- **Primary Background:** `#0B192C` (Deep British Oxford Navy)
- **Secondary Surface:** `#1E2A38` (Slate Card Container)
- **Accent Primary:** `#D4AF37` (Royal British Gold)
- **Accent Glow:** `#FFD700` (Vibrant Gold for audio recording pulse)
- **Success Tone:** `#2ECC71` (Emerald Green for high RP accuracy ≥ 85%)
- **Warning Tone:** `#F39C12` (Amber for acceptable accent 60–84%)
- **Error Tone:** `#E74C3C` (Ruby Red for non-RP substitution < 60%)
- **Typography:** British editorial style (clean sans-serif with serif headings for Professor Higgins).

---

## 6. Testing Strategy

1. **Phonetic Scoring Tests (`test/phonetic_scoring_test.dart`):**
   - Verify that exact RP matches score 95–100%.
   - Verify that American rhotic substitution (e.g. `/kɑːr/` for `car`) is penalized and flagged with a non-rhotic tip.
   - Verify that American vowel substitution (`/bæθ/` for `bath`) is penalized and flagged with a BATH vowel tip.
2. **Gamification Logic Tests (`test/gamification_logic_test.dart`):**
   - Verify streak increments correctly when practicing on consecutive days.
   - Verify heart depletion on failing drills and heart refill timer.
   - Verify XP awards and level unlocking logic.
3. **Curriculum Integrity Tests (`test/lesson_loader_test.dart`):**
   - Verify valid JSON structure of all bundled units, phonemes, and roleplay dialogues.

---

## 8. Gemini-to-Gemini Collaboration Protocol

To enable seamless collaboration between the Cloud Gemini (developing the app) and the PC Gemini (assisting the user locally), the project employs a **File-Based Handover Protocol**.

### 8.1. Shared State Files (`gemini_collab/`)
- **`SYNC_LOG.md`**: A chronological log of every significant step, error, and breakthrough. After every task, the active Gemini appends an entry here.
- **`REVIEW_REQUEST.md`**: When one Gemini finishes a complex piece of code (e.g., the scoring engine), it writes a request here. The other Gemini, upon starting, checks this file to perform a code review or phonetic audit.
- **`HANDOVER.md`**: Stores the "current context pointer" — what is being worked on right now, what is blocked, and what the next specific sub-task is.

### 8.2. Collaborative Workflow Example
1. **Cloud Gemini** (me) implements the `OfflineRPEngine`.
2. **Cloud Gemini** writes to `gemini_collab/REVIEW_REQUEST.md`: *"Please review the phonetic alignment logic in lib/features/assessment/services/offline_rp_engine.dart for British RP accuracy."*
3. **PC Gemini** (user's app) reads the request, performs the review, and writes feedback to `gemini_collab/SYNC_LOG.md`.
4. **Cloud Gemini** reads the log and applies the fixes.

---

## 9. Delivery Deliverables

1. Complete Flutter app codebase inside `accentless_speaking/`.
2. Dedicated `gemini_collab/` folder with prompts, notes, and Python lesson generator.
3. Root `GEMINI.md` project guide.
4. Comprehensive automated unit tests passing.
5. Android manifest, Gradle, and `KEYSTORE_AND_RELEASE_GUIDE.md` for Google Play Store compilation.
