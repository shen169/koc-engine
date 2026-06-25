# Prompt Expansion — Product Development Phases

## Title + Style Block

**Working Title:** "How We Build Software: The Right Way, Step by Step"

**Design Identity:** Swiss Pulse DNA adapted to light canvas — grid-locked, precise, numbers-driven. Clean corporate presentation energy. Think Apple Keynote meets Stripe documentation.

**Palette** (from clean-corporate):
| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#E0FBFC` | Canvas background (very light cyan tint) |
| `fg` | `#293241` | Primary text (deep navy) |
| `accent` | `#3D5A80` | Primary accent (steel blue) |
| `secondary` | `#98C1D9` | Soft blue — decorative elements, rules |
| `warm` | `#EE6C4D` | Coral accent — emphasis, highlights, current-phase marker |
| `surface` | `#FFFFFF` | Card/surface backgrounds |
| `muted` | `#6B7B8D` | Secondary text, metadata |

**Typography:**
| Role | Font | Weight | Size |
|------|------|--------|------|
| Headlines | Geist | 700-900 | 72-120px |
| Body | Source Serif 4 | 300-400 | 28-36px |
| Code/Labels | JetBrains Mono | 400-600 | 18-24px |

## Rhythm Declaration

`slow-build → BUILD → PEAK → breathe → resolve`

| Scene | Energy | Duration | Transition Out |
|-------|--------|----------|---------------|
| 1. Title Intro | Calm build | 6s | Blur crossfade 0.4s power2.inOut |
| 2. Phase 1: Foundation | Building | 8s | Push slide-left 0.35s power3.inOut |
| 3. Phase 2: Hardening ⬅ CURRENT | Peak | 12s | Blur crossfade 0.4s power2.inOut |
| 4. Phase 3: Scale | Breathe | 6s | Blur crossfade 0.5s power1.inOut |
| 5. Outro | Resolve | 5s | Fade to cyan 0.6s sine.inOut |

**Total:** ~37s + transitions (~2s) = ~39s

## Global Rules

- **Transitions:** Blur crossfade primary (3/4 transitions). One push-slide for topic shift (Phase 1→2). Medium energy: 8-15px blur, 0.35-0.5s, power2 family.
- **Entrance only:** Every scene uses entrance animations. NO exit animations except final scene fade-out. Transitions ARE the exit.
- **Layout:** Scene-content uses flexbox with padding, not absolute positioning. Two focal points minimum per scene.
- **Background depth:** Every scene has 3+ decorative elements with ambient GSAP motion (breath, drift, pulse). Light canvas needs structural elements (rules, dividers) at 2px+.
- **Stagger order:** Most important element enters first. Total stagger sequence under 500ms.
- **Number display:** All numbers use `font-variant-numeric: tabular-nums`. Phase numbers are large (100px+).
- **Font weights:** 300 vs 900 contrast. No 400 vs 700 pairings on same screen.

## Per-Scene Beats

---

### Scene 1 — Title Intro

**Concept:** We open on a clean, airy canvas. The title assembles with quiet confidence — not shouting, but stating something obvious: good software follows a process. The phase numbers "1 → 2 → 3" appear as a visual promise of what's to come. Think of an architect unrolling blueprints before picking up a hammer.

**Mood direction:** Editorial calm. Josef Müller-Brockmann grid sensibility on a light surface. The frame breathes. Generous negative space. Everything is intentional.

**Depth layers:**
- **BG:** Light cyan canvas (`#E0FBFC`). Subtle radial glow from center-right (coral `#EE6C4D` at 8% opacity, breathing scale 1→1.02 over 6s). Ghost "DEV" text at 5% opacity, 200px, Geist 900, bleeding off right edge — slow 0.5px/s drift left.
- **MG:** Title "How We Build Software" (Geist 900, 96px, `#293241`). Subtitle "Product Development Phases" (Source Serif 4, 300, 36px, `#6B7B8D`). Phase indicators "1 · 2 · 3" (JetBrains Mono, 400, 24px, `#3D5A80`) aligned bottom-left.
- **FG:** Hairline horizontal rule (2px, `#98C1D9`, 60% width, left-aligned). Tiny "KOC-Engine · June 2026" metadata (JetBrains Mono, 400, 16px, `#6B7B8D`) bottom-right.

**Animation choreography:**
- `t=0.3s`: Title CRACKS in — `fromTo({opacity:0, y:60}, {opacity:1, y:0, 0.7s, expo.out})`
- `t=0.5s`: Horizontal rule DRAWS — `from({scaleX:0}, {transformOrigin:"left center", 0.6s, power3.out})`
- `t=0.7s`: Subtitle FLOATS up — `fromTo({opacity:0, y:30}, {opacity:1, y:0, 0.5s, sine.inOut})`
- `t=1.0s`: Phase numbers "1" "2" "3" CASCADE in sequence — each `fromTo({opacity:0, x:-20}, {opacity:1, x:0, 0.3s, power2.out})`, stagger 0.15s
- `t=1.6s`: Metadata FADES in — `fromTo({opacity:0}, {opacity:1, 0.3s, power2.out})`
- `t=2.5s`: Ghost "DEV" text begins slow drift
- `t=5.5s`: Transition out — blur crossfade to Scene 2

**Transition out:** Blur crossfade, 0.4s, power2.inOut, 10px blur

---

### Scene 2 — Phase 1: Foundation

**Concept:** Phase 1 is the AI-powered build phase. This is where the system came to life — fast iteration, core architecture, all the pieces snapping together. We show what was BUILT: the KOC-Engine with its three roles, the matching engine, the task system. This is the "make it work" phase. Speed and completeness are the values here.

**Mood direction:** Confident, energetic. Like watching a 3D printer lay down layers — each pass adds structure. The frame feels active but not chaotic.

**Depth layers:**
- **BG:** Canvas `#E0FBFC`. Grid pattern (4x4, `#98C1D9` at 10% opacity, subtle). Radial glow from top-left (steel blue `#3D5A80` at 10%, breathing).
- **MG:** Phase badge "PHASE 1" (JetBrains Mono, 600, 20px, `#EE6C4D`, pill outline). Headline "Foundation" (Geist, 900, 88px, `#293241`). Three stat cards in a row: "3 Roles" / "16 API Modules" / "14 Stores" — each card white surface with subtle shadow. Subtitle "AI-powered rapid development · Core architecture · MVP first" (Source Serif 4, 300, 28px, `#6B7B8D`).
- **FG:** Progress indicator "1/3" (JetBrains Mono, 600, 18px, `#3D5A80`) top-right. Thin vertical divider between phase badge and headline.

**Animation choreography:**
- `t=0.2s`: Phase badge STAMPS in — `fromTo({opacity:0, scale:0.9}, {opacity:1, scale:1, 0.35s, back.out(2)})`
- `t=0.4s`: Headline SLIDES in from left — `fromTo({opacity:0, x:-50}, {opacity:1, x:0, 0.6s, expo.out})`
- `t=0.6s`: Vertical divider DRAWS down — `from({scaleY:0}, {transformOrigin:"top center", 0.4s, power2.inOut})`
- `t=0.8s`: Three stat cards CASCADE up — each `fromTo({opacity:0, y:40}, {opacity:1, y:0, 0.45s, power3.out})`, stagger 0.15s
- `t=1.5s`: Subtitle FADES in — `fromTo({opacity:0, y:20}, {opacity:1, y:0, 0.4s, sine.inOut})`
- `t=2.0s`: Progress indicator FADES in
- `t=7.0s`: Transition out — push slide-left to Scene 3

**Transition out:** Push slide-left, 0.35s, power3.inOut. Outgoing scene slides left with 8px blur, incoming enters from right.

---

### Scene 3 — Phase 2: Hardening ⬅ CURRENT PHASE

**Concept:** THIS is the scene that matters most. We're in Phase 2 now — and Phase 2 is about making the thing SOLID. Not sexy, but essential. The frame shifts tone slightly: the coral accent becomes prominent, signaling "this is where we are." Three pillars of hardening rise into view: Security, Debugging, Geo Optimization. Each with concrete examples from this week's work. The message: this is NOT slow progress — this is CORRECT progress.

**Mood direction:** Determined, grounded. Think construction site after the frame is up — now we're reinforcing the joints, testing the load, weatherproofing. Active but deliberate. The coral accent (`#EE6C4D`) takes center stage — it's the "current phase" signal color.

**Depth layers:**
- **BG:** Canvas `#E0FBFC`. Subtle coral radial glow from center (`#EE6C4D` at 12%, breathing 1→1.03). Ghost "SOLID" text at 6% opacity, Geist 900, 180px, slow vertical drift. Faint grid lines.
- **MG:** Phase badge "PHASE 2 · CURRENT" (JetBrains Mono, 600, 20px, `#EE6C4D`, pill outline with coral fill at 15%). Headline "Hardening" (Geist, 900, 88px, `#293241`). Three focus cards arranged vertically with icons:
  - 🔐 "Login Security" — JWT hardening, password policies, session management
  - 🐛 "Logic Debugging" — state machine edge cases, SLA timeout fixes, data consistency
  - 🌍 "Geo Optimization" — multi-region routing, latency reduction, local compliance
  Each card: white surface, left coral accent stripe (4px), Geist 700 title + Source Serif 4 300 detail. Subtitle: "Making the system solid before scaling · This week: Debug + Geo" (Source Serif 4, 300, 28px, `#6B7B8D`)
- **FG:** "NOW" indicator with pulsing coral dot. Progress "2/3" top-right. Week label "Week of June 22" (JetBrains Mono, 400, 16px, `#6B7B8D`). Thin horizontal rule below headline.

**Animation choreography:**
- `t=0.2s`: Coral glow PULSES in — `tl.to(".coral-glow", {scale: 1.03, opacity: 0.15, duration: 2, yoyo: true, repeat: 5}, 0)`
- `t=0.3s`: Phase badge STAMPS — `fromTo({opacity:0, scale:0.9}, {opacity:1, scale:1, 0.3s, back.out(2)})`
- `t=0.4s`: "NOW" indicator DROPS in — `fromTo({opacity:0, y:-20}, {opacity:1, y:0, 0.3s, power3.out})`
- `t=0.5s`: Headline SLIDES in from left — `fromTo({opacity:0, x:-40}, {opacity:1, x:0, 0.6s, expo.out})`
- `t=0.7s`: Horizontal rule DRAWS — `from({scaleX:0}, {transformOrigin:"left", 0.5s, power3.out})`
- `t=0.9s`: Three focus cards RISE in sequence — each `fromTo({opacity:0, y:50}, {opacity:1, y:0, 0.5s, power3.out})`, stagger 0.2s
  - Card 1 (Security): 0.9s
  - Card 2 (Debug): 1.1s
  - Card 3 (Geo): 1.3s
- `t=2.0s`: Coral accent stripes on cards FILL left-to-right — `from({scaleX:0}, {transformOrigin:"left", 0.4s, power2.out})` staggered
- `t=2.5s`: Subtitle FLOATS in — `fromTo({opacity:0, y:20}, {opacity:1, y:0, 0.4s, sine.inOut})`
- `t=3.0s`: Week label FADES — `fromTo({opacity:0}, {opacity:1, 0.3s})`
- `t=11.0s`: Transition out — blur crossfade to Scene 4

**Transition out:** Blur crossfade, 0.4s, power2.inOut, 12px blur

---

### Scene 4 — Phase 3: Scale & Polish

**Concept:** The future — after hardening comes scale. This scene is aspirational but grounded. Lighter energy, looking forward. Performance monitoring, user growth, feature polish. The message: Phase 3 is the reward for doing Phase 2 right. If we skip hardening, scaling breaks everything.

**Mood direction:** Optimistic, forward-looking. Same grid discipline but with more breathing room. The coral recedes, steel blue returns as primary accent. Like looking at a clear horizon after a storm.

**Depth layers:**
- **BG:** Canvas `#E0FBFC`. Soft radial glow top-right (`#3D5A80` at 8%, breathing). Ghost "SCALE" text at 5%, Geist 900, 160px, slow horizontal drift. Subtle dot grid.
- **MG:** Phase badge "PHASE 3" (JetBrains Mono, 600, 20px, `#3D5A80`, pill outline). Headline "Scale & Polish" (Geist, 900, 88px, `#293241`). Three forward-looking items in a row:
  - ⚡ "Performance Optimization" 
  - 📊 "Monitoring & Alerts"
  - 🚀 "User Growth"
  Each as clean text + icon, no cards (lighter weight than Phase 2). Subtitle: "Built on a solid foundation · Coming next" (Source Serif 4, 300, 28px, `#6B7B8D`)
- **FG:** Progress "3/3" top-right. Subtle arrow connecting Phase 2→3 visual reference.

**Animation choreography:**
- `t=0.2s`: Phase badge FADES — `fromTo({opacity:0}, {opacity:1, 0.4s, power2.out})`
- `t=0.4s`: Headline FLOATS in from right — `fromTo({opacity:0, x:40}, {opacity:1, x:0, 0.6s, expo.out})`
- `t=0.7s`: Three items FADE+SLIDE in sequence — `fromTo({opacity:0, y:25}, {opacity:1, y:0, 0.4s, power2.out})`, stagger 0.2s
- `t=1.6s`: Subtitle FLOATS — `fromTo({opacity:0, y:15}, {opacity:1, y:0, 0.4s, sine.inOut})`
- `t=5.0s`: Transition out — gentle blur crossfade to Outro

**Transition out:** Blur crossfade, 0.5s, power1.inOut, 15px blur (gentler — winding down)

---

### Scene 5 — Outro

**Concept:** Closing statement. The three phases reprise as small indicators — Foundation → Hardening → Scale — with "You Are Here" on Phase 2. The final message: good software isn't rushed. Each phase exists for a reason. The frame slowly fades to the canvas color, leaving just the afterimage of structure.

**Mood direction:** Quiet confidence. The calm after a clear explanation. Nothing new introduced — just resolution.

**Depth layers:**
- **BG:** Canvas `#E0FBFC`. Fading radial glow, center. Ghost text fading.
- **MG:** Phase timeline: "1 · 2 ⬅ · 3" (Geist 900, 64px, `#293241`) with Phase 2 highlighted in coral. Headline "Build Right, Step by Step" (Geist, 900, 72px, `#293241`). Subtitle: "Every phase has its focus. We're exactly where we should be." (Source Serif 4, 300, 32px, `#6B7B8D`)
- **FG:** KOC-Engine logo/wordmark. "June 2026" date.

**Animation choreography:**
- `t=0.3s`: Phase timeline APPEARS — `fromTo({opacity:0, scale:0.95}, {opacity:1, scale:1, 0.6s, sine.inOut})`
- `t=0.6s`: "You Are Here" indicator on Phase 2 PULSES — coral `#EE6C4D`
- `t=0.9s`: Headline FLOATS up — `fromTo({opacity:0, y:30}, {opacity:1, y:0, 0.5s, power3.out})`
- `t=1.3s`: Subtitle FADES — `fromTo({opacity:0}, {opacity:1, 0.5s, sine.inOut})`
- `t=1.8s`: Wordmark FADES in bottom
- `t=4.0s`: Final fade out — ALL elements fade to canvas color, 0.6s, sine.inOut

**Transition out:** Final fade to `#E0FBFC`, 0.6s, sine.inOut

## Recurring Motifs

- Phase progress indicator (1/3, 2/3, 3/3) in top-right of scenes 2-4
- Pill badges for phase labels (JetBrains Mono, consistent size)
- Hairline rules as structural elements across scenes
- Ghost text bleeding off-frame (DEV, SOLID, SCALE) — one per scene, slow drift
- Radial glows shift position and hue per scene
- Coral accent (`#EE6C4D`) reserved for "current phase" emphasis — only prominent in Scene 3

## Negative Prompt

- **NO dark backgrounds** — user chose light/clean. Don't switch to dark.
- **NO gradient text** (`background-clip: text`) — lazy default
- **NO centered-everything layouts** — anchor to edges, use split frames
- **NO exit animations before transitions** — transitions ARE the exit (except final scene)
- **NO Inter, Roboto, or other banned fonts**
- **NO generic tech blue (#3B82F6)** — use palette's `#3D5A80`
- **NO flat single-element scenes** — every scene has 3 depth layers, 6-8 elements minimum
- **NO jump cuts** — every scene transition is a blur crossfade or push slide
- **NO `repeat: -1`** — all repeats are finite
- **NO absolute positioning for content containers** — flexbox with padding
