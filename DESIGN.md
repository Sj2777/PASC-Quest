# QuizPop — Campus Literary Tactile Design System

*Visual Source of Truth: Stitch Project `projects/16109577532723618977`*  
*Target Assets: Student Home (`62546f9286be46ee8078e5ddfd356922`), Question Gameplay (`9bc10318bbfa4c7b861a204420ac163b`), Design System (`assets/82db7bf7d24d4d6ca4ddb3682808779a`)*

---

## 1. DESIGN DIRECTION

### Overall Visual Concept
**Campus Literary Tactile** is an editorial, collegiate aesthetic that merges classic academic broadsheet pedigree with the punchy, tactile delight of modern social trivia gaming. It rejects generic dark-mode cyber grids, neon glows, flat wireframe minimalism, and sterile tech-SaaS cards. 

Instead, the design is rooted in the tangible richness of:
- Heavyweight warm rag paper and archival vellum.
- Authoritative editorial serifs reminiscent of campus gazettes, examination papers, and university quarterlies.
- Heavy paper index cards, bookplate rules, and physical 3D cardboard tokens that visibly depress like mechanical rubber stamps upon tap.
- Archival printer's ink charcoal in place of synthetic digital black.

### Visual Personality & Intended Feel
- **Scholarly & Prestigious**: The experience feels dignified, thoughtful, and academically rigorous rather than juvenile or gamified with cartoon mascots.
- **Warm & Organic**: Sunlit study-table warmth conveyed by cream, milk, and parchment surfaces (`#FAF8F5`) layered against crisp index card white (`#FFFFFF`).
- **Kinetic & Punchy**: High-urgency gameplay elements (countdowns, timers, active selection states, submit triggers) ignite with a kinetic vermilion/coral pulse (`#DB3320` / `#B71607`), anchored by amber/marigold honor tokens (`#F59E0B`).
- **Tactile & Mechanical**: Every interactive element has physical weight. Buttons and cards feature solid underside bezel drops (`box-shadow: 0 4px 0 ...`) that collapse to zero with a corresponding `translateY` offset when pressed.

### Distinction from Generic AI / SaaS Dashboards
| Attribute | Generic AI / SaaS Dashboard | Campus Literary Tactile |
| :--- | :--- | :--- |
| **Color Mood** | Cold blue/slate `#0f172a` or sterile pure white `#ffffff` | Warm sun-bleached parchment `#FAF8F5` and archival ink `#18181B` |
| **Typography** | Generic sans-serif (Inter, Roboto, system-ui) | Dynamic pairing: Editorial serif (`Newsreader`) + Humanist geometric sans (`Plus Jakarta Sans`) |
| **Surface Depth** | Diffuse floating blur shadows (`box-shadow: 0 10px 25px rgba(...)`) | Physical cardstock bevels (`0 3px 0 #DDD8CE`, `0 4px 0 #920700`) that depress on active tap |
| **Borders** | Synthetic 1px `#e2e8f0` or gradient outlines | Warm hairline rule lines (`#E5E1D8`, `#D8C3AD`) evoking printed book leaves |
| **Emotional Tone** | Clinical, corporate, detached | Scholastic, spirited, tactile, collegiate |

---

## 2. COLOR SYSTEM

All colors are extracted directly from Stitch project `projects/16109577532723618977` (Asset `assets/82db7bf7d24d4d6ca4ddb3682808779a` and screens `62546f92` & `9bc10318`).

### Canvas & Surface Grounds
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `surface-canvas` | `#FAF8F5` | Primary mobile envelope baseline, overall page parchment background |
| `surface` | `#FBF8FC` | Core theme surface foundation |
| `surface-container-lowest` | `#FFFFFF` | Crisp white index cardstock (challenge cards, question plaques, option cards) |
| `surface-container` | `#F0EDF1` | Subtle muted grey/parchment tint for option index alphabet tokens (A, B, C, D) |
| `surface-container-low` | `#F6F2F7` | Recessed secondary surface layer |
| `surface-container-high` | `#EAE7EB` | Elevated container surface |
| `surface-container-highest`| `#E4E1E6` | High-contrast neutral dividers |
| `surface-variant` | `#E4E1E6` | Inactive progress track indicators, neutral chip grounds |

### Archival Ink & Typography
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `on-surface` | `#18181B` / `#1B1B1E` | Primary archival ink text; rich warm charcoal replacing harsh pure black |
| `on-surface-variant` | `#534434` | Warm slate for subheaders, secondary metrics, and unselected nav icons |
| `outline` | `#867461` | Category labels, metadata tags, and tertiary footnotes |
| `outline-variant` | `#D8C3AD` / `#E5E1D8` | Hairline card borders, divider rules, and card well separators |

### Secondary / Kinetic Vermilion & Red
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `secondary` | `#B71607` | Deep scholastic red; countdown timer text, warning alerts, active card borders |
| `secondary-container` | `#DB3320` | Kinetic punch vermilion/coral; primary CTA button background, active timer bar, selected choice rim |
| `on-secondary` | `#FFFFFF` | High-contrast pure white text for primary kinetic buttons and badges |
| `on-secondary-fixed-variant`| `#920700` | Dark crimson solid underside 3D shadow for primary buttons (`0 4px 0 #920700`) |
| `secondary-fixed` | `#FFDAD4` | Warm peach/coral badge background for `● LIVE` chips |
| `on-secondary-fixed` | `#400100` | Deep dark red text for `● LIVE` chips |
| `secondary-fixed-dim` | `#FFB4A7` | Auxiliary alert tint |

### Primary / Amber & Marigold (Streaks & Honors)
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `primary-container` | `#F59E0B` | Marigold amber; streak badge flame fill, active nav tab pill, streak milestone dots |
| `primary` | `#855300` | Deep golden amber; QuizPop brand title text in header, streak heading labels |
| `primary-fixed` | `#FFDDB8` | Soft amber background for streak pills and XP bonus chips (`+250 XP`) |
| `on-primary-fixed` | `#2A1700` | Dark brown text for amber chips |
| `on-primary-container` | `#613B00` | Deep contrast text for amber containers and active nav pill bottom shadow |

### Tertiary / Mint & Forest (Accuracy & Completion)
| Token Name | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `tertiary` | `#006C49` / `#10B981`| Forest green; verified correct answers, completed challenge status, accuracy metrics |
| `tertiary-container` | `#30C88F` | Active progress fills for verified completions |
| `tertiary-fixed` / Wash | `#6FFBBE` / `#ECFDF5`| Light mint background for completed question cards and accuracy badges |
| `on-tertiary` | `#FFFFFF` | Pure white text over green surfaces |

### State & Interactive Palette
| State | Visual Treatment |
| :--- | :--- |
| **Option Resting** | `#FFFFFF` fill, `1px solid #E5E1D8`, `box-shadow: 0 3px 0 #DDD8CE` |
| **Option Hover** | Border transitions to `#867461` (`outline`), lift slightly |
| **Option Selected** | Tinted coral background `rgba(255, 218, 212, 0.2)` (`bg-secondary-fixed/20`), `border-2 border-[#DB3320]`, `box-shadow: 0 4px 0 #B71607`, checkmark circle |
| **Option Correct** | Snaps to `#ECFDF5` background, `#059669` rim, `#10B981` text |
| **Option Incorrect** | Soft vermilion wash `#FEF2F2`, `#EF4444` rim, muted red text |
| **Button Active / Press**| Translates downward (`transform: translateY(4px)` or `translateY(1px)`), flattening bottom shadow to zero |

---

## 3. TYPOGRAPHY

The typography enforces a strict dual-font pairing between editorial literary authority and crisp geometric interaction.

### 1. `Newsreader` (Editorial Serif)
* **Design Purpose**: Imbues trivia questions, literary prompts, and brand mastheads with academic pedigree. Treats each quiz question like a printed examination prompt or varsity quarterly article.
* **Weights Used**: `500` (Medium), `600` (Semi-Bold), `Italic / Normal`
* **Permitted Usage**:
  - Application brand header logotype (`QuizPop`)
  - Hero greeting headlines (`What’s live today?`)
  - Section titles (`Daily Quests`, `Campus Standings`)
  - Challenge card titles
  - Main question text in the quiz gameplay plaque
* **Prohibited Usage**: Do NOT use Newsreader for body text, button labels, countdown timers, badges, chips, or option choice cards.

### 2. `Plus Jakarta Sans` (Humanist Geometric Sans)
* **Design Purpose**: Delivers maximum legibility and friendly rounded terminals for high-speed mobile reading, timers, data metrics, and mechanical buttons.
* **Weights Used**: `500` (Medium), `600` (Semi-Bold), `700` (Bold), `800` (Extra-Bold)
* **Permitted Usage**:
  - Choice card copy and index tokens (`A`, `B`, `C`, `D`)
  - Primary and secondary button text (`interactive-btn`)
  - Timers, score counters, and streak counters (`stat-numeral-lg`, `stat-numeral-md`)
  - All uppercase badges, metadata tags, and status chips (`label-caps`)
  - Bottom navigation bar labels
  - Subheaders, body descriptions, and footnote disclaimers

### Type Scale Specification
| Token Name | Font Family | Size | Line Height | Weight | Letter Spacing | Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-hero` | Newsreader | 48px | 52px | 600 | -0.02em | Normal |
| `display-hero-mobile` | Newsreader | 36px | 40px | 600 | -0.01em | Normal |
| `headline-lg` | Newsreader | 32px | 38px | 500 | -0.015em | Normal |
| `headline-lg-mobile` | Newsreader | 26px | 32px | 500 | Normal | Normal |
| `headline-md` | Newsreader | 22px | 28px | 500 | Normal | Normal |
| `stat-numeral-lg` | Plus Jakarta Sans | 40px | 44px | 800 | -0.03em | Tabular |
| `stat-numeral-md` | Plus Jakarta Sans | 24px | 28px | 800 | -0.02em | Tabular |
| `interactive-btn` | Plus Jakarta Sans | 16px | 20px | 700 / 800 | 0.01em | Normal |
| `body-lg` | Plus Jakarta Sans | 18px | 26px | 500 | Normal | Normal |
| `body-md` | Plus Jakarta Sans | 15px | 22px | 500 | Normal | Normal |
| `body-sm` | Plus Jakarta Sans | 13px | 18px | 500 | Normal | Normal |
| `label-caps` | Plus Jakarta Sans | 11px | 14px | 700 | 0.08em | Uppercase |

---

## 4. SPACING

### Spacing Scale
| Token | REM Value | Pixel Value | Typical Application |
| :--- | :--- | :--- | :--- |
| `space-xs` | `0.25rem` | 4px | Internal chip gaps, dot badge padding |
| `space-sm` | `0.5rem` | 8px | Grouped status rows, option choice gaps, card item margins |
| `space-md` | `1.0rem` | 16px | Card internal padding, standard content gutters |
| `space-lg` | `1.5rem` | 24px | Large challenge card padding, major section gaps |
| `space-xl` | `2.25rem` | 36px | Page section separators, hero block spacing |

### Viewport Margins & Gutters
- **Mobile (< 640px)**:
  - Container Max-Width: `430px` centered
  - Canvas Margin: `1.25rem` (20px)
  - Grid Gutter: `1.0rem` (16px)
- **Tablet (640px – 1024px)**:
  - Container Max-Width: `580px` centered desk presentation
  - Canvas Margin: `2.0rem` (32px)
  - Grid Gutter: `1.5rem` (24px)
- **Desktop (> 1024px)**:
  - Container Max-Width: `720px` centered notebook presentation
  - Canvas Margin: `3.0rem` (48px)
  - Grid Gutter: `2.0rem` (32px)

---

## 5. SHAPE LANGUAGE

The shape language uses soft, tactile, hand-trimmed cardstock curvature (**Roundness: 8 / Level 2**):

1. **Micro Badges & Chips (`rounded` / `0.25rem` - 4px to 6px)**:
   - Elevated category tabs (e.g., `CORE MEMORY SYSTEMS` black tab on question plaque).
   - Streak recovery counter pips and XP badges (`+250 XP`).
2. **Standard Components (`rounded-lg` to `rounded-xl` / `0.5rem` to `0.75rem` - 8px to 12px)**:
   - Option choice cards (`rounded-xl` / 12px).
   - Option alphabet index box (`A`, `B`, `C`, `D` — `w-8 h-8 rounded-lg`).
   - Action buttons (Primary kinetic red button, Secondary varsity white button).
   - Exit button and timer icon boxes.
3. **Major Card Envelopes (`rounded-xl` to `rounded-2xl` / `16px` to `20px`)**:
   - Challenge cards (`rounded-xl`).
   - Question plaque container (`rounded-xl`).
   - Streak progression card (`rounded-xl`).
4. **Pills (`rounded-full` / `9999px`)**:
   - `● LIVE` status chips.
   - Streak pill (`🔥 7 days`).
   - Radio indicator rings in choice cards (`w-5 h-5 rounded-full`).
   - Progress bar ends and floating avatar border rings.

---

## 6. SHADOW & TACTILE SYSTEM

Visual hierarchy rejects blurry dark drop shadows in favor of **solid underside bezels** that create tangible, mechanical depth:

### 1. Resting Cards
- Surface: `#FFFFFF`
- Border: `1px solid rgba(216, 195, 173, 0.4)` or `#E5E1D8`
- Shadow: `box-shadow: 0 4px 0 #E2DDD2` (featured challenge card) or `box-shadow: 0 2px 4px rgba(39, 34, 26, 0.04)`

### 2. Primary Red Kinetic Buttons
- Surface: `#DB3320` (`secondary-container`)
- Shadow: `box-shadow: 0 4px 0 #920700` (deep crimson underside bezel)
- Hover: `brightness(105%)`
- Active / Pressed State: `transform: translateY(4px); box-shadow: 0 0 0 transparent;` (immediate mechanical stamp depression)

### 3. Secondary Varsity Buttons
- Surface: `#FFFFFF` with `1px solid #E5E1D8`
- Shadow: `box-shadow: 0 3px 0 #DDD8CE`
- Active / Pressed State: `transform: translateY(3px); box-shadow: 0 0 0 transparent;`

### 4. Answer Option Cards
- Resting State: `#FFFFFF` background, `1px solid rgba(216, 195, 173, 0.6)`, `box-shadow: 0 3px 0 #DDD8CE`.
- Active Press: `transform: translateY(2px); box-shadow: 0 1px 0 #DDD8CE;`.
- Selected State: `transform: translateY(-2px); border: 2px solid #DB3320; background: rgba(255, 218, 212, 0.2); box-shadow: 0 4px 0 #B71607;`.

### 5. Canvas Ambient Envelope
- The overall mobile wrapper centered on screen carries an ambient warm glow: `box-shadow: 0 0 50px rgba(39, 34, 26, 0.06);`.

---

## 7. COMPONENTS SPECIFICATION

### 1. Top Header
- **Background**: `#FAF8F5/90` with `backdrop-blur-md`, sticky at top.
- **Border**: Bottom ambient separator `box-shadow: 0 2px 4px rgba(39, 34, 26, 0.04)`.
- **Leading**: Circular student avatar framed with collegiate ring (`ring-2 ring-[#E5E1D8]`), followed by "QuizPop" logotype rendered in `Newsreader` (`headline-lg-mobile`, 26px, weight 600, color `#855300`).
- **Trailing**: Tactile streak badge pill.

### 2. Streak Badge
- **Pill Geometry**: `rounded-full`, `#FFFFFF` background, `1px solid rgba(216, 195, 173, 0.4)`, `box-shadow: 0 2px 0 #E2DDD2`.
- **Content**: Flame emoji/icon + count text (`🔥 7 days`, text 14px, font Plus Jakarta Sans).
- **Interactive**: `active:translate-y-0.5 transition-all`.

### 3. Challenge Cards
- **Container**: Index card white (`#FFFFFF`), `rounded-xl`, padding `1.5rem` (24px), border `1px solid #E5E1D8`, underside shadow `0 4px 0 #E2DDD2`.
- **Header Row**:
  - Left: `● LIVE` pill badge (`bg-[#FFDAD4]`, text `#400100`, font `label-caps` bold) with an inner animated ping dot (`bg-[#B71607] animate-ping`).
  - Right: Category track in uppercase letter-spacing (`ALGORITHMS`, font `label-caps` 11px, color `#867461`).
- **Title**: `Newsreader` headline (`headline-md`, 22px, weight 500, color `#18181B`, leading-tight).
- **Metadata Row**: Duration indicator (`⏱ 30 seconds`) + expiry or bonus text (`Expires in 18h 42m` or `Double Streak XP`).
- **Action Trigger**: Full-width button inside card footer.

### 4. Question Plaque
- **Chassis**: `#FFFFFF` card, `rounded-xl`, padding `1.0rem` (16px), border `1px solid rgba(216, 195, 173, 0.6)`, dual shadow `0 3px 0 #E2DDD2, 0 6px 16px rgba(39, 34, 26, 0.04)`.
- **Category Badge (Raised Tab)**: Absolute positioned tab at top-left (`top: -12px; left: 16px;`), filled with `#18181B`, pure white text, uppercase `text-[10px] font-bold tracking-widest px-2 py-0.5 rounded`.
- **Question Text**: `Newsreader` (`headline-lg-mobile`, 26px, weight 500, color `#18181B`, leading-snug). Key technical terms highlighted in bold red (`text-secondary font-bold`) or underline amber (`underline decoration-primary-container decoration-2 underline-offset-4`).

### 5. Answer Option Cards (Multiple Choice)
- **Base Structure**: Horizontal flex row, `#FFFFFF` background, `1px solid #E5E1D8`, `rounded-xl`, padding `16px`, shadow `0 3px 0 #DDD8CE`.
- **Index Box**: Left square `w-8 h-8 rounded-lg bg-[#F0EDF1] border border-[#E5E1D8] flex items-center justify-center font-bold text-[#534434]`.
- **Label**: `Plus Jakarta Sans` (`body-md`, 15px, weight 600, color `#18181B`).
- **Selection Indicator**: Right-aligned `w-5 h-5 rounded-full border-2 border-outline-variant/60`.
- **Selected State**:
  - Background shifts to `rgba(255, 218, 212, 0.2)`
  - Border becomes `2px solid #DB3320`
  - Shadow increases to `0 4px 0 #B71607`
  - Left index box becomes solid `#DB3320` with pure white text
  - Right radio ring fills with `#DB3320` containing a white checkmark icon (`check`)

### 6. Primary Action CTA Button (Red/Vermilion)
- Full width, `bg-[#DB3320]`, text `#FFFFFF`, `rounded-xl`, padding `14px 24px`, font `interactive-btn` (16px bold).
- 3D Bezel Shadow: `box-shadow: 0 4px 0 #920700`.
- Active Depression: `active:translate-y-1 active:shadow-none`.
- Trailing arrow icon (`arrow_forward`).

### 7. Secondary Action Button (White Index Card)
- Full width, `bg-[#FFFFFF]`, text `#18181B`, border `1px solid #E5E1D8`, `rounded-xl`, padding `12px 16px`, font `interactive-btn`.
- Shadow: `box-shadow: 0 3px 0 #DDD8CE`.
- Active Depression: `active:translate-y-1 active:shadow-none`.

### 8. Bottom Navigation Bar
- Fixed bottom docked bar across mobile envelope (`max-w-[430px] mx-auto pb-safe bg-[#FFFFFF] rounded-t-xl shadow-[0_-4px_16px_rgba(39,34,26,0.06)]`).
- **Active Tab ("Home")**: Highlighted pill container in `#F59E0B` (`primary-container`), text `#613B00` (`on-primary-container`), `rounded-xl`, padding `6px 16px`, shadow `0 2px 0 #613B00`.
- **Inactive Tabs ("Compete", "Profile")**: Muted text `#534434`, hover color `#855300`.

### 9. Timers
- **Dynamic Linear Ambient Bar**: Pinned to the very top edge of the quiz screen (`h-1.5 bg-[#E4E1E6]/40`), filled with `#DB3320` (`secondary-container`), linear countdown transition.
- **Tension Countdown Badge**: Top-right corner box (`rounded-xl bg-[#FFDAD4]/40 border border-[#B71607]/20 shadow-[0_2px_0_#FFDAD4]`), featuring timer icon + tabular numerals (`00:24`, font `stat-numeral-md`, color `#B71607`).

### 10. Completed Question State
- Soft parchment/mint card (`bg-[#F0EDF1]/60` or `#F0FDF4`), border `1px solid rgba(216, 195, 173, 0.3)`.
- Status Label: `COMPLETED` in `#006C49` (`tertiary`) with filled checkmark icon.
- Question text rendered with strikethrough in `#867461`.
- Positive XP delta footnote (`Scored +120 XP • Speed King 4.2s`).

---

## 8. STUDENT HOME (SCREEN `62546f9286be46ee8078e5ddfd356922`)

Source of truth: Stitch screen `62546f9286be46ee8078e5ddfd356922` (`QuizPop - Student Home (Live Challenges)`).

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: [Avatar] QuizPop (Newsreader)         [🔥 7 days]  │
├─────────────────────────────────────────────────────────────┤
│  GREETING:                                                  │
│  "GOOD EVENING, PARTH" (Plus Jakarta Sans label-caps)       │
│  "What’s live today?" (Newsreader display-hero-mobile)      │
├─────────────────────────────────────────────────────────────┤
│  STREAK CARD:                                               │
│  STEAL THE STREAK [● ● ○]            [🔥 Flame Enamel Pin]  │
│  "1 win away from Day 8"                                    │
├─────────────────────────────────────────────────────────────┤
│  DAILY QUESTS: "3 ACTIVE"                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [● LIVE]                             ALGORITHMS       │  │
│  │ Dynamic Programming vs Greedy: Optimal Substructure   │  │
│  │ ⏱ 30 seconds • Expires in 18h 42m                     │  │
│  │ [PLAY CHALLENGE ➔]  (Primary Red Kinetic Button)      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [● LIVE]                             DATABASE...      │  │
│  │ B+ Tree Page Splitting in Write-Heavy Workloads       │  │
│  │ ⏱ 45 seconds • Double Streak XP                       │  │
│  │ [PLAY CHALLENGE ➔]  (Secondary White Button)          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [✓ COMPLETED]                        NETWORKING       │  │
│  │ TCP Congestion Control: BBR vs Cubic (Strikethrough)  │  │
│  │ Scored +120 XP • Speed King 4.2s                      │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  CAMPUS STANDINGS:                                 TOP 5%   │
│  #14 Parth Sharma                                 1,480 XP  │
├─────────────────────────────────────────────────────────────┤
│  BOTTOM NAV: [🎮 Home (Active)]   [🏆 Compete]  [👤 Profile]│
└─────────────────────────────────────────────────────────────┘
```

---

## 9. QUESTION GAMEPLAY (SCREEN `9bc10318bbfa4c7b861a204420ac163b`)

Source of truth: Stitch screen `9bc10318bbfa4c7b861a204420ac163b` (`QuizPop - Question Gameplay Screen`).

```
┌─────────────────────────────────────────────────────────────┐
│ [═════════════ AMBIENT PROGRESS BAR (Vermilion) ══════════] │
├─────────────────────────────────────────────────────────────┤
│ [✕ Close]         [● ALGORITHMS]            [⏱ 00:24 (Red)] │
├─────────────────────────────────────────────────────────────┤
│ 🔥 DAILY CHALLENGE • 01 OF 01                      +250 XP  │
├─────────────────────────────────────────────────────────────┤
│ ┌─[CORE MEMORY SYSTEMS]───────────────────────────────────┐ │
│ │ Which data structure offers amortized O(1) time        │ │
│ │ complexity for insertions while maintaining strict      │ │
│ │ FIFO order under concurrent buffer pool evictions?      │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [ A ] HashMap with Linked Buckets                       ( ) │
├─────────────────────────────────────────────────────────────┤
│ [ B ] Lock-Free Ring Buffer  (SELECTED - Red Rim)       (✓) │
├─────────────────────────────────────────────────────────────┤
│ [ C ] Fibonacci Heap                                    ( ) │
├─────────────────────────────────────────────────────────────┤
│ [ D ] B+ Tree Leaf Node                                 ( ) │
├─────────────────────────────────────────────────────────────┤
│ [           SUBMIT ANSWER ➔ (Kinetic Red 3D Button)       ] │
│ Playing as Parth Sharma • One attempt per question          │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. RESPONSIVE BEHAVIOR

1. **Mobile First (< 640px)**:
   - Max container width locked to `430px`.
   - Single-column linear layout.
   - Pinned bottom safe area for navigation on Home, or Submit button on Question screen.
2. **Tablet (640px – 1024px)**:
   - Centered notebook metaphor with `580px` max width.
   - The outer parchment background (`#FAF8F5`) frames the card stack with a dot-matrix texture.
   - Bottom navigation docks within the centered card boundary.
3. **Desktop (> 1024px)**:
   - Intimate editorial layout centered at `720px` max width.
   - Preserves high tactile focus instead of stretching elements into a wide operational SaaS table.

---

## 11. IMPLEMENTATION RULES & BOUNDARIES

1. **Visual Redesign Only**: This is strictly an aesthetic overhaul. No backend endpoints, data shapes, or business logic shall be altered.
2. **QuizPop Architecture is Authoritative**:
   - The Stitch screens provide visual mockups with hardcoded demo values; existing QuizPop data structures are the single source of truth.
   - Existing React Router routes (`/`, `/auth`, `/student`, `/play`, `/result`, `/stats`, `/social`, `/leaderboard/:pollLaunchId`) must remain intact.
   - Existing API client methods in [`api.ts`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/api.ts) must be preserved.
3. **PollLaunch Architecture**:
   - Multiple independent questions (`PollLaunchItem[]`) can be active simultaneously.
   - Each challenge card on the Student Home must bind to its respective `pollItem.pollLaunchId`.
   - Each question card must compute and display its own independent expiry countdown.
   - Completion status (`pollItem.completed`) must originate from the backend API.
4. **Game Mechanics**:
   - One-shot attempt rule is mandatory.
   - Streak counters, comeback mechanics (3-day recovery), milestone animations, and streak restoration logic must continue to execute as implemented in [`Landing.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Landing.tsx).
   - Speed King, Ghost Mode, and Confetti triggers in [`ResultPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/ResultPage.tsx) are scoped per PollLaunch and must not be broken.
   - Branch Battle and Hall of Fame in [`SocialHub.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/SocialHub.tsx) must remain accessible.
   - Student session token authentication via [`StudentAuth.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/StudentAuth.tsx) and `api.getMe()` remains unchanged.

---

## 12. CURRENT QUIZPOP → STITCH MAPPING

| Existing File | Current Aesthetic | Stitch Target & Proposed Visual Role |
| :--- | :--- | :--- |
| [`index.css`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/index.css) | Baloo 2, Manrope, pastel pink/lilac blobs | Replace CSS variables with Campus Literary Tactile tokens (`--bg: #FAF8F5`, `--ink: #18181B`, `--primary: #F59E0B`, `--secondary: #DB3320`, `--outline: #E5E1D8`). Import `Newsreader` and `Plus Jakarta Sans`. Configure 3D extrusion utility classes (`shadow-[0_4px_0_...]`). |
| [`App.css`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/App.css) | Vite template styling & social list styles | Clean up obsolete counter/hero CSS, establish mobile envelope classes (`max-w-[430px]`) and parchment background textures. |
| [`Landing.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Landing.tsx) | Glassmorphic floating card with pastel blobs, top buttons for stats/social | Adopts Screen `62546f92` layout: Sticky Newsreader TopAppBar, streak pill badge, greeting section, challenge cards stack with individual `handleStart(pollItem)` triggers, completed challenge card styling, and bottom navigation bar. |
| [`QuestionPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/QuestionPage.tsx) | Center radial SVG countdown ring, pastel card option cards | Adopts Screen `9bc10318` layout: Top linear progress bar + tension timer badge (`00:24`), Question Plaque with raised category tab, tactile answer choice cards with left alphabet box (`A-D`). |
| [`ResultPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/ResultPage.tsx) | Colorful pastel feedback with canvas confetti | Adopts tactile cardstock outcome plaque, bold Plus Jakarta Sans time readouts, Speed King badge, and return CTA buttons. |
| [`EntryPage.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/EntryPage.tsx) | Neutral dark dashboard with purple/pink cards | Restyled into Campus Literary Tactile portal (parchment ground, Newsreader masthead, tactile student/admin cards). |
| [`PersonalStats.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/PersonalStats.tsx) | Pastel rank history line chart | Campus ledger styling with ink rank line and parchment cards. |
| [`Leaderboard.tsx`](file:///c:/ACMQuiz/AptitudeQuizPlatformPASC/frontend/src/pages/Leaderboard.tsx) | Dark space background with neon podium | Classic campus podium and ranked ledger rows with warm hairline dividers (`#E5E1D8`). |

---

## 13. MIGRATION RISKS & CONFLICT ANALYSIS

1. **Option Selection vs Immediate Submit**:
   - *Conflict*: Existing `QuestionPage.tsx` automatically submits the attempt the instant an option is tapped (`handleSelect(idx) -> submit(idx)`). Stitch Screen `9bc10318` depicts a two-step interaction (tap to highlight radio option $\rightarrow$ click bottom "SUBMIT ANSWER" button).
   - *Architecture Consideration*: In a strict 20–30 second timed aptitude quiz, requiring a two-step click (option + submit) can cause accidental timeouts if students forget to press submit. 
   - *Resolution Strategy*: When redesigning `QuestionPage.tsx`, either implement a rapid two-step submit with sticky bottom button, or keep one-tap submission while applying the tactile selected state visually during the brief submit delay.
2. **Timer Format: Seconds vs MM:SS**:
   - *Conflict*: Backend provides integer `timerSeconds` (e.g. `30`). Stitch displays `00:24` tabular text plus a horizontal bar.
   - *Resolution*: Format `secondsLeft` with a simple formatter (`String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')`) and compute linear bar width `(secondsLeft / totalSeconds) * 100%`.
3. **Hardcoded Stitch Mock Data vs Dynamic Backend Model**:
   - *Conflict*: Stitch includes hardcoded badges like `+250 XP`, `TOP 5%`, and static categories (`CORE MEMORY SYSTEMS`).
   - *Resolution*: QuizPop's `PollLaunchItem` text and option arrays are dynamic. XP and category chips should display available metadata or clean graceful fallbacks (e.g., displaying the subject or poll index) without breaking if XP fields do not exist on the backend model.
4. **Bottom Navigation Routing**:
   - *Conflict*: Stitch shows a bottom navigation bar with `Home`, `Compete`, `Profile`. QuizPop currently uses top buttons to navigate to `/social` and `/stats`.
   - *Resolution*: The bottom bar seamlessly integrates with existing routes:
     - `Home` $\rightarrow$ `/student`
     - `Compete` $\rightarrow$ `/social` (Branch Battle, Leaderboards, Friends)
     - `Profile` $\rightarrow$ `/stats` (Personal Stats & Rank History)
