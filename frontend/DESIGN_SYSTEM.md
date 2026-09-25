# QuizPop — Campus Literary Tactile Design System
## The Authoritative Frontend Visual & Architecture Specification

*Status: Authoritative Master Document*  
*Visual Reference: Stitch Project `projects/16109577532723618977` (Screens: `62546f9286be46ee8078e5ddfd356922`, `9bc10318bbfa4c7b861a204420ac163b`; Asset: `assets/82db7bf7d24d4d6ca4ddb3682808779a`)*  
*Functional Reference: Existing QuizPop React + TypeScript + Express + Prisma Architecture*

---

## 1. SOURCE OF TRUTH & OPERATIONAL HIERARCHY

This specification supersedes all prior design drafts, scratch notes, and mock interpretations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HIERARCHY OF AUTHORITY                          │
├────────────────────────────────────────────────────────────────────────┤
│  1. BACKEND & DOMAIN LOGIC (Highest Authority)                         │
│     - Express API routes, Prisma schemas, PollLaunch mechanics,        │
│       real authentication sessions, and database constraints.         │
│     - Real application data MUST NEVER be replaced by mock values.     │
│                                                                        │
│  2. APPLICATION ARCHITECTURE & ROUTING                                 │
│     - React Router routes (`/`, `/auth`, `/student`, `/play`, etc.).   │
│     - Multi-question PollLaunch array (`PollLaunchItem[]`).            │
│     - Per-launch timer, streak, Speed King, and Ghost Mode scoping.    │
│                                                                        │
│  3. VISUAL STYLING: CAMPUS LITERARY TACTILE (Visual Authority)         │
│     - Cream/red color palette, Newsreader + Plus Jakarta Sans fonts,   │
│       physical 3D cardstock bezels, mechanical stamp button states.    │
│     - Dark "Terminal Branch Arena" design is COMPLETELY EXCLUDED.      │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Invariants
1. **Visual Redesign Only**: Zero modifications to backend endpoints, Prisma schema, server controllers, or API response contracts.
2. **Dynamic PollLaunch Reality**: The system does NOT assume 1 or 2 static questions per day. Any number of concurrent, independent `PollLaunch` items may be active simultaneously.
3. **Strict Data Grounding**: Do not introduce fictional client-side metrics (e.g. arbitrary "XP points", artificial campus percentages, or invented category tags) that do not exist in the database or API.

---

## 2. DESIGN DIRECTION: CAMPUS LITERARY TACTILE

### Overall Concept
**Campus Literary Tactile** is an editorial, collegiate aesthetic that merges classic academic broadsheet pedigree with the punchy, tactile delight of modern social trivia gaming. It rejects:
- Generic dark-mode cyber grids and neon cyan glows.
- Flat wireframe austerity and generic AI/SaaS dashboard cards.
- Sterile grey-scale containers and floating blur shadows.

Instead, the design is rooted in:
- **Warm Rag Paper & Archival Vellum (`#FAF8F5`)**: Natural sunlit study-hall paper grounds layered with crisp index cardstock (`#FFFFFF`).
- **Authoritative Editorial Masthead (`Newsreader`)**: Expressive, high-contrast serif typography treating trivia prompts like published varsity examination papers.
- **Physical 3D Extrusion**: Buttons and cards possess physical weight with solid underside bezels (`0 4px 0 #920700`, `0 3px 0 #DDD8CE`) that mechanically compress upon tap (`translateY`).
- **Rich Archival Ink (`#18181B`)**: Soft, deep charcoal ink instead of harsh digital black.
- **Kinetic Vermilion Pulse (`#DB3320` / `#B71607`)**: Urgent, athletic energy driving countdown timers, primary CTA triggers, and selected choice states.

---

## 3. COLOR SYSTEM

All tokens are extracted directly from Stitch project `projects/16109577532723618977` (Asset `assets/82db7bf7d24d4d6ca4ddb3682808779a`).

### Canvas & Surface Grounds
| Token Name | Hex Value | Role & Architectural Purpose |
| :--- | :--- | :--- |
| `surface-canvas` | `#FAF8F5` | Page baseline; warm sun-bleached parchment sheet |
| `surface` | `#FBF8FC` | Core theme ground |
| `surface-card` | `#FFFFFF` | Crisp index cardstock (`surface-container-lowest`); challenge cards & plaques |
| `surface-subtle` | `#F0EDF1` | Muted parchment tint for option index letters (A, B, C, D) |
| `surface-inset` | `#E4E1E6` | Debossed tracks, unselected progress lines, and chip wells |
| `border-hairline`| `#E5E1D8` | Archival rule line (`#D8C3AD`); 1px boundary separating paper layers |

### Archival Ink & Typography
| Token Name | Hex Value | Role & Architectural Purpose |
| :--- | :--- | :--- |
| `on-surface` | `#18181B` | Primary ink text; rich warm charcoal replacing harsh `#000000` |
| `on-surface-variant` | `#534434` | Warm slate; subheaders, secondary labels, unselected nav icons |
| `outline` | `#867461` | Category track labels, timestamp metadata, and footnote disclaimers |
| `outline-variant` | `#D8C3AD` | Fine rules, card border strokes, and input outlines |

### Secondary / Kinetic Vermilion & Red
| Token Name | Hex Value | Role & Architectural Purpose |
| :--- | :--- | :--- |
| `secondary` | `#B71607` | Deep academic red; tension timer badge, warning alerts, active borders |
| `secondary-container` | `#DB3320` | Kinetic vermilion/coral; primary CTA button fill, active timer wire, selected card border |
| `on-secondary` | `#FFFFFF` | High-contrast pure white text for primary kinetic buttons and badges |
| `secondary-bezel` | `#920700` | Solid dark crimson 3D underside bezel (`box-shadow: 0 4px 0 #920700`) |
| `secondary-fixed` | `#FFDAD4` | Warm peach badge background for `● LIVE` status chips |
| `on-secondary-fixed`| `#400100` | Deep dark red text for `● LIVE` chips |

### Primary / Amber & Marigold (Streaks & Varsity Honors)
| Token Name | Hex Value | Role & Architectural Purpose |
| :--- | :--- | :--- |
| `primary-container` | `#F59E0B` | Marigold amber; streak badge flame fill, active nav tab pill |
| `primary` | `#855300` | Deep golden amber; QuizPop brand title text in header, streak headings |
| `primary-fixed` | `#FFDDB8` | Soft amber background for streak badges and comeback status pills |
| `on-primary-container` | `#613B00` | Contrast text for active amber navigation pill and streak titles |

### Tertiary / Mint & Forest (Accuracy & Completion)
| Token Name | Hex Value | Role & Architectural Purpose |
| :--- | :--- | :--- |
| `tertiary` | `#006C49` | Forest green; verified correct indicator, completed challenge badge |
| `tertiary-container` | `#30C88F` | Active progress fill for completion and verified answer states |
| `tertiary-fixed` | `#ECFDF5` | Soft mint wash for completed challenge cards and correct feedback wells |
| `on-tertiary` | `#FFFFFF` | High-contrast pure white text on green badges |

---

## 4. TYPOGRAPHY SYSTEM

Strict dual-font pairing between academic literary authority and responsive geometric interaction:

```
┌───────────────────────────────────────┬────────────────────────────────────────┐
│     EDITORIAL HEADINGS & PROMPTS      │     DATA, BODY & TACTILE CONTROLS      │
│               Newsreader              │           Plus Jakarta Sans            │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ • App Brand Logotype ("QuizPop")       │ • Multiple-choice answer copy          │
│ • Hero Greetings ("What’s live today?")│ • Primary & secondary action buttons   │
│ • Challenge card question titles       │ • Timers, countdowns & tabular figures │
│ • Quiz gameplay main question text     │ • Badges, chips, tags & status pills   │
│ • Section headers ("Daily Quests")    │ • Bottom navigation bar labels         │
└───────────────────────────────────────┴────────────────────────────────────────┘
```

### Type Scale Specification
| Token Name | Family | Size | Line Height | Weight | Letter Spacing | Case | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-hero` | Newsreader | 48px | 52px | 600 | -0.02em | Normal | Desktop hero headings |
| `display-hero-mobile` | Newsreader | 36px | 40px | 600 | -0.01em | Normal | Mobile greeting ("What’s live today?") |
| `headline-lg` | Newsreader | 32px | 38px | 500 | -0.015em | Normal | Large section headings |
| `headline-lg-mobile` | Newsreader | 26px | 32px | 500 | Normal | Normal | Question plaque text, header brand |
| `headline-md` | Newsreader | 22px | 28px | 500 | Normal | Normal | Challenge card titles |
| `stat-numeral-lg` | Plus Jakarta | 40px | 44px | 800 | -0.03em | Tabular | Large scoreboard metrics |
| `stat-numeral-md` | Plus Jakarta | 24px | 28px | 800 | -0.02em | Tabular | Countdown timer badges (`00:24`) |
| `interactive-btn` | Plus Jakarta | 16px | 20px | 700 / 800 | 0.01em | Normal | Action buttons, submit triggers |
| `body-lg` | Plus Jakarta | 18px | 26px | 500 | Normal | Normal | Emphasized body text |
| `body-md` | Plus Jakarta | 15px | 22px | 500 | Normal | Normal | Option choice card text |
| `body-sm` | Plus Jakarta | 13px | 18px | 500 | Normal | Normal | Card metadata, expiry text |
| `label-caps` | Plus Jakarta | 11px | 14px | 700 | 0.08em | UPPER | Status badges, category breadcrumbs |

---

## 5. SPACING & LAYOUT SYSTEM

### Spacing Scale
- `space-xs` = `0.25rem` (4px) — Internal badge padding, dot margins
- `space-sm` = `0.5rem` (8px) — Choice card vertical gaps, metadata item spacing
- `space-md` = `1.0rem` (16px) — Standard card padding, section gutters
- `space-lg` = `1.5rem` (24px) — Challenge card internal padding, major section gaps
- `space-xl` = `2.25rem` (36px) — Page section dividers, hero margins

### Viewport Adaptation
- **Mobile (< 640px)**:
  - Envelope Max Width: `430px` centered
  - Horizontal Canvas Margin: `1.25rem` (20px)
  - Grid Gutter: `1.0rem` (16px)
- **Tablet (640px – 1024px)**:
  - Envelope Max Width: `580px` centered desk presentation
  - Canvas Margin: `2.0rem` (32px)
- **Desktop (> 1024px)**:
  - Envelope Max Width: `720px` centered notebook presentation
  - Canvas Margin: `3.0rem` (48px)
  - Note: Keeps the intimacy of an academic reading notebook; does not blow out into a wide table.

---

## 6. SHAPE & TACTILE BEZEL SYSTEM

Visual hierarchy rejects blurry dark drop shadows in favor of **solid underside bezels** that create tangible, mechanical depth:

```
RESTING STATE: Solid Underside Bezel           ACTIVE / PRESSED STATE: Stamp Depressed
┌─────────────────────────────────┐           
│          PLAY CHALLENGE         │           ┌─────────────────────────────────┐
└─────────────────────────────────┘ (4px) ──> │          PLAY CHALLENGE         │ (0px)
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           └─────────────────────────────────┘
(box-shadow: 0 4px 0 #920700)                 (transform: translateY(4px); box-shadow: 0 0 0)
```

### 1. Border Radius Rules
- **Micro Badges (`0.25rem` / 4px)**: Raised category tabs, XP tags, streak status pips.
- **Components & Buttons (`0.75rem` / 12px - `rounded-xl`)**: Primary kinetic buttons, choice cards, exit buttons.
- **Card Envelopes (`1.0rem` to `1.5rem` / 16px to 24px - `rounded-xl` to `rounded-2xl`)**: Question plaque, challenge cards, streak progression card.
- **Pills (`9999px` - `rounded-full`)**: `● LIVE` badge, streak badge pill, timer indicator rings.

### 2. Physical Bezel Shadow Specifications
- **Primary Kinetic Red Button**:
  - Resting: `background: #DB3320; box-shadow: 0 4px 0 #920700;`
  - Active: `transform: translateY(4px); box-shadow: 0 0 0 transparent;`
- **Secondary Varsity White Button**:
  - Resting: `background: #FFFFFF; border: 1px solid #E5E1D8; box-shadow: 0 3px 0 #DDD8CE;`
  - Active: `transform: translateY(3px); box-shadow: 0 0 0 transparent;`
- **Answer Option Cards**:
  - Resting: `background: #FFFFFF; border: 1px solid #E5E1D8; box-shadow: 0 3px 0 #DDD8CE;`
  - Hover: Border shifts to `#867461`, slight lift.
  - Active: `transform: translateY(2px); box-shadow: 0 1px 0 #DDD8CE;`
  - Selected: `transform: translateY(-2px); border: 2px solid #DB3320; background: rgba(255, 218, 212, 0.2); box-shadow: 0 4px 0 #B71607;`
- **Resting Challenge Cards**: `background: #FFFFFF; border: 1px solid #E5E1D8; box-shadow: 0 4px 0 #E2DDD2;`
- **Outer Canvas Container**: `box-shadow: 0 0 50px rgba(39, 34, 26, 0.06);`

---

## 7. ATOMIC COMPONENTS SPECIFICATION

### 1. Brand Top Bar
- **Position**: Sticky top (`bg-[#FAF8F5]/90 backdrop-blur-md z-40 border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)]`).
- **Leading**: Circular student avatar (`w-9 h-9 rounded-full ring-2 ring-[#E5E1D8]`) + "QuizPop" logotype (`Newsreader`, 26px, weight 600, color `#855300`).
- **Trailing**: Tactile streak badge pill.

### 2. Streak Badge Pill
- Geometry: `rounded-full px-3 py-1 bg-[#FFFFFF] border border-[#E5E1D8] shadow-[0_2px_0_#E2DDD2]`.
- Content: `🔥 {student.currentStreak} days` in `Plus Jakarta Sans` 14px bold.
- Press: `active:translate-y-0.5 transition-all`.

### 3. Live Challenge Card (Single & Multi-Launch)
- **Container**: White index card (`#FFFFFF`), `rounded-xl`, padding `1.5rem` (24px), border `1px solid #E5E1D8`, shadow `0 4px 0 #E2DDD2`.
- **Top Row**:
  - Left: `● LIVE` badge (`bg-[#FFDAD4] text-[#400100] px-2.5 py-0.5 rounded-full font-bold text-xs`) with animated ping dot (`bg-[#B71607] animate-ping`).
  - Right: Question index/indicator in uppercase tracking (`QUESTION 1`, `QUESTION 2`, etc. via `label-caps`).
- **Question Preview**: `Newsreader` (`headline-md`, 22px, weight 500, color `#18181B`, leading-tight, 2-line clamp).
- **Metadata**: Expiry countdown computed from `pollItem.expiresAt` (`⏱ formatExpiryCountdown(pollItem.expiresAt, now)`).
- **Action Trigger**: Full-width button bound specifically to `pollItem.pollLaunchId`. If first live question: Primary Red Kinetic Button. If subsequent: Secondary Varsity Button or Primary button.

### 4. Completed Question Card
- Soft parchment/mint background (`#F0EDF1/80` or `#F0FDF4`), border `1px solid #BBF7D0`.
- Left Badge: `✓ COMPLETED` in `#006C49` (`tertiary`).
- Question text rendered in strikethrough `#867461`.
- Completed checkmark badge replacing play button.

### 5. Steal the Streak / Comeback Recovery Card
- Bound to `streakStatus.comebackActive`.
- Surface: `#FFF7ED` (Warm paper amber), border `1px solid #FDBA74`, shadow `0 2px 4px rgba(39,34,26,0.04)`.
- Left: "STEAL THE STREAK" header + 3-step recovery pip indicators (`■ ■ □`).
- Subtext: `Recover your {streakStatus.preBreakStreak} day streak — Day {streakStatus.comebackProgress} of 3`.
- Right: Tactile flame medal badge (`w-10 h-10 rounded-full bg-[#FFDDB8] text-[#855300] border border-[#855300]/20`).

### 6. Question Plaque & Code Box
- White index card (`#FFFFFF`), `rounded-xl`, padding `1.0rem` (16px), border `1px solid #E5E1D8`, shadow `0 3px 0 #E2DDD2, 0 6px 16px rgba(39,34,26,0.04)`.
- Raised Category Tab: Top-left absolute tab (`top: -12px; left: 16px;`) in `#18181B` with pure white text, uppercase `text-[10px] font-bold tracking-widest px-2 py-0.5 rounded`. Displays question index or subject.
- Question Text: `Newsreader` (`headline-lg-mobile`, 26px, weight 500, color `#18181B`).
- Code Snippet Box (if text contains code blocks): Monospaced block on `#18181B` dark ground with light syntax text and rounded 8px corners.

### 7. Multiple Choice Tactile Option Cards
- Base: Horizontal flex row, `#FFFFFF` background, `1px solid #E5E1D8`, `rounded-xl`, padding `16px`, shadow `0 3px 0 #DDD8CE`.
- Index Token: Left square `w-8 h-8 rounded-lg bg-[#F0EDF1] border border-[#E5E1D8] font-bold text-[#534434]`.
- Option Label: `Plus Jakarta Sans` (`body-md`, 15px, weight 600, color `#18181B`).
- Selected State: Red outline `2px solid #DB3320`, shadow `0 4px 0 #B71607`, background `rgba(255, 218, 212, 0.2)`, checkmark indicator.

### 8. Timers
- **Dynamic Linear Ambient Progress Bar**: Sticky at top of viewport (`h-1.5 bg-[#E4E1E6]/40`), filled with `#DB3320` (`secondary-container`), transition linear duration 1000ms.
- **Tension Countdown Badge**: Top-right corner box (`rounded-xl bg-[#FFDAD4]/40 border border-[#B71607]/20 shadow-[0_2px_0_#FFDAD4]`), timer icon + tabular countdown (`MM:SS`, e.g. `00:24`, color `#B71607`, font `stat-numeral-md`).

### 9. Bottom Navigation Bar
- Pinned bottom bar (`max-w-[430px] mx-auto pb-safe bg-[#FFFFFF] rounded-t-xl border-t border-[#E5E1D8] shadow-[0_-4px_16px_rgba(39,34,26,0.06)]`).
- Tabs:
  - **Home** (`/student`): Active pill in `#F59E0B` (`primary-container`), text `#613B00`, shadow `0 2px 0 #613B00`.
  - **Compete** (`/social`): Inactive text `#534434`, opens Branch Battle & Hall of Fame.
  - **Profile** (`/stats`): Inactive text `#534434`, opens Personal Stats & Rank History.

---

## 8. STUDENT HOME (`/student` -> `Landing.tsx`)

### Architecture & Data Binding
- Endpoint: `GET /api/poll/current` returning `PollLaunchItem[]`.
- Student Profile: `GET /api/student/me` returning `Student`.
- Streak & Recovery: `GET /api/student/streak-status` returning `StreakStatus`.
- State Handlers:
  - `handleStart(pollItem)`: Starts specific launch via `POST /api/poll/${pollItem.pollLaunchId}/start`.
  - Per-card error handling: `errors[pollItem.pollLaunchId]`.
  - Real-time expiry: `formatExpiryCountdown(pollItem.expiresAt, now)`.

### Screen Layout Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│  STICKY TOPBAR:                                             │
│  [Avatar] QuizPop (Newsreader 26px)            [🔥 7 days]  │
├─────────────────────────────────────────────────────────────┤
│  GREETING:                                                  │
│  "GOOD EVENING, {student.nickname.toUpperCase()}"           │
│  "What’s live today?" (Newsreader 36px)                     │
├─────────────────────────────────────────────────────────────┤
│  COMEBACK / STREAK RECOVERY CARD (if comebackActive):       │
│  STEAL THE STREAK [■ ■ □]            [🔥 Flame Medal Badge] │
│  "Recover your {preBreakStreak} day streak"                 │
├─────────────────────────────────────────────────────────────┤
│  LIVE QUESTIONS HEADER: "{polls.length} ACTIVE"             │
│                                                             │
│  ┌─[ POLL LAUNCH CARD: pollItem.pollLaunchId ]───────────┐  │
│  │ [● LIVE]                                QUESTION 1    │  │
│  │ {pollItem.text} (Newsreader 22px)                     │  │
│  │ ⏱ {timerSeconds}s • Expires in {hours}h {mins}m       │  │
│  │ [PLAY CHALLENGE ➔] (Primary Red Kinetic 3D Button)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─[ COMPLETED POLL LAUNCH CARD ]────────────────────────┐  │
│  │ [✓ COMPLETED]                           QUESTION 2    │  │
│  │ {completedPollItem.text} (Strikethrough)              │  │
│  │ Completed • One attempt used                          │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  CAMPUS PROFILE SUMMARY:                                    │
│  Branch: {student.branch || "General"}                      │
│  Best Streak: {student.bestStreak} days                     │
├─────────────────────────────────────────────────────────────┤
│  BOTTOM NAV: [🎮 Home (Active)]   [🏆 Compete]  [👤 Profile]│
└─────────────────────────────────────────────────────────────┘
```

---

## 9. QUESTION GAMEPLAY (`/play` -> `QuestionPage.tsx`)

### Architecture & Data Binding
- Navigation State: `{ poll: PollLaunchItem, token: string, timerSeconds: number, nickname: string }`.
- Submission Endpoint: `POST /api/poll/attempts` with `{ token, selectedOption }`.
- Timeout Handling: Automatic submission with `null` option when countdown reaches 0.

### Submission Timing & Timeout Strategy
- **Immediate Submit with Tactile Animation**: When student taps an option, immediately apply the selected state (`border-2 border-[#DB3320]`, `bg-[#FFDAD4]/20`, `shadow-[0_4px_0_#B71607]`) and fire `submit(idx)`. This prevents accidental timeouts caused by requiring a separate bottom button press during rapid 15–30s aptitude tests.
- **Alternative Two-Step Submit**: If an explicit bottom button is desired, the "SUBMIT ANSWER" button is enabled only after an option is highlighted, and an unmistakable visual countdown warning pulsates when `< 5s` remain.

### Screen Layout Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ [═════════════ AMBIENT PROGRESS BAR (Vermilion) ══════════] │
├─────────────────────────────────────────────────────────────┤
│ [✕ Exit]          [● LIVE ROUND]             [⏱ 00:24 (Red)] │
├─────────────────────────────────────────────────────────────┤
│ ┌─[QUESTION 1 OF {total}]─────────────────────────────────┐ │
│ │ {poll.text} (Newsreader 26px)                           │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [ A ] {poll.options[0]}                                 ( ) │
├─────────────────────────────────────────────────────────────┤
│ [ B ] {poll.options[1]} (SELECTED - Vermilion Bezel)    (✓) │
├─────────────────────────────────────────────────────────────┤
│ [ C ] {poll.options[2]}                                 ( ) │
├─────────────────────────────────────────────────────────────┤
│ [ D ] {poll.options[3]}                                 ( ) │
├─────────────────────────────────────────────────────────────┤
│ Playing as {nickname} • One attempt per question            │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. QUIZPOP ARCHITECTURAL INVARIANTS & INTEGRATION RULES

To ensure flawless operation of existing production features during the visual redesign:

1. **PollLaunch ID Isolation**:
   - Every challenge card MUST pass its own `pollItem.pollLaunchId` to `handleStart`.
   - `QuestionPage` MUST pass that exact `pollLaunchId` through to `ResultPage` in `location.state`.
2. **Speed King Scoping**:
   - `api.getSpeedKing(pollLaunchId)` is queried per launch. ResultPage must continue passing `pollLaunchId` so the Speed King crown displays correctly.
3. **Ghost Mode Scoping**:
   - `api.getGhostMode(pollLaunchId)` aggregates attempt distributions for that specific launch.
4. **Streak & Comeback Mechanics**:
   - Steal the Streak (3-day recovery window), streak milestones (3, 7, 14, 30 days), and restored streak animations are preserved verbatim from [`Landing.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Landing.tsx).
5. **Branch Battle & Social Features**:
   - Social features (`/social`) including follow/unfollow, Branch Battle leaderboards, and Hall of Fame remain intact.
6. **Authentication & Session Tokens**:
   - Cookie-based session authentication (`credentials: 'include'`) and `api.getMe()` guards on routes must not be altered.

---

## 11. EXISTING QUIZPOP → STITCH COMPONENT MAPPING TABLE

| File | Current Visual Implementation | New Campus Literary Tactile Visual Role |
| :--- | :--- | :--- |
| [`index.css`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/index.css) | Baloo 2, Manrope, pastel pink/lilac blobs, CSS variables | Campus Literary Tactile tokens (`--bg: #FAF8F5`, `--ink: #18181B`, `--primary: #F59E0B`, `--secondary: #DB3320`, `--outline: #E5E1D8`). Google Fonts imports for `Newsreader` and `Plus Jakarta Sans`. Utility classes for 3D underside bezels. |
| [`App.css`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/App.css) | Vite starter styles, unused counter & hero CSS | Mobile container styling (`max-w-[430px] mx-auto`), paper parchment background dot texture. |
| [`Landing.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Landing.tsx) | Centered floating card with ambient blobs, top nav buttons | Student Home screen (`62546f92`): Sticky header, Newsreader greeting, streak medal card, dynamic challenge card list with kinetic red buttons, bottom docked navigation bar. |
| [`QuestionPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/QuestionPage.tsx) | Radial SVG countdown ring, pastel card option buttons | Question Gameplay screen (`9bc10318`): Linear ambient vermilion timer wire, tabular MM:SS badge, Newsreader question plaque, tactile multiple choice option cards with left letter box (`A-D`). |
| [`ResultPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/ResultPage.tsx) | Pastel outcome box with confetti | Tactile broadsheet outcome plaque, bold Plus Jakarta Sans time readouts, Speed King badge, return to home kinetic CTA. |
| [`PersonalStats.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/PersonalStats.tsx) | Pastel rank history line chart | Campus ledger styling with ink rank line and parchment card surfaces. |
| [`Leaderboard.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Leaderboard.tsx) | Dark space gradient with neon podium | Campus broadsheet podium and ranked ledger rows with warm hairline dividers (`#E5E1D8`). |
| [`SocialHub.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/SocialHub.tsx) | Tabbed social page with Branch Battle & Hall of Fame | Parchment card tabs for Friends, Branch Battle, and Hall of Fame. |
| [`EntryPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/EntryPage.tsx) | Dark dashboard with purple/pink glassmorphism | Warm parchment welcome screen with Newsreader masthead and tactile student/admin login cards. |

---

## 12. MIGRATION RISKS & CONFLICT RESOLUTIONS

1. **Option Selection vs Immediate Submit**:
   - *Conflict*: Existing `QuestionPage.tsx` submits immediately upon selecting an option (`handleSelect(idx) -> submit(idx)`). Stitch Screen `9bc10318` depicts a two-step interaction (tap to highlight radio option $\rightarrow$ click bottom "SUBMIT ANSWER" button).
   - *Architecture Resolution*: On strict 15–30 second timed tests, requiring a second click can cause unfair timeouts. The recommended implementation is to keep immediate submission on option tap while animating the tactile selected card state during the submission transition.
2. **Timer Format: Seconds vs MM:SS**:
   - *Conflict*: Backend provides integer `timerSeconds` (e.g. `30`). Stitch displays `00:24` tabular text plus a horizontal bar.
   - *Architecture Resolution*: Format `secondsLeft` with a simple formatter (`String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')`) and compute linear bar width `(secondsLeft / totalSeconds) * 100%`.
3. **Hardcoded Stitch Mock Data vs Dynamic Backend Model**:
   - *Conflict*: Stitch includes hardcoded badges like `+250 XP`, `TOP 5%`, and static categories (`CORE MEMORY SYSTEMS`).
   - *Architecture Resolution*: QuizPop's `PollLaunchItem` text and option arrays are dynamic. XP and category chips must not be hardcoded; instead, render the dynamic question index or branch tag.
4. **Bottom Navigation Routing**:
   - *Conflict*: Stitch shows a bottom navigation bar with `Home`, `Compete`, `Profile`. QuizPop currently uses top buttons to navigate to `/social` and `/stats`.
   - *Architecture Resolution*: The bottom bar seamlessly integrates with existing routes:
     - `Home` $\rightarrow$ `/student`
     - `Compete` $\rightarrow$ `/social` (Branch Battle, Leaderboards, Friends)
     - `Profile` $\rightarrow$ `/stats` (Personal Stats & Rank History)
