# 🎨 SECURICLAW UX DOCUMENTATION

**Date:** 2026-02-15  
**Version:** MVP 1.0  
**Design:** Combined Version 1 + Version 2

---

## 📸 UI STATES & MOCKUPS

### STATE 1: Initial / Landing Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        [Glowing Background]                     │
│                                                                 │
│                    🦞 [MASCOT LOBSTER]                         │
│                                                                 │
│                     SECURICLAW                                  │
│                                                                 │
│            The AI that actually does security                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1  // Paste JavaScript/TypeScript code here to audit     │ │
│  │ 2                                                         │ │
│  │ 3                                                         │ │
│  │ 4                                                         │ │
│  │ 5                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                    [ ⚡ RUN AUDIT ]                            │
│                                                                 │
│   ● Static Scan Active  ● AST Structural Inspection            │
│         ● Deterministic Risk Scoring                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐ ┌──────────────────────┐            │
│  │  STATIC ANALYSIS     │ │  AST INSPECTION      │            │
│  │                      │ │                      │            │
│  │  Regex-based         │ │  Parses code into    │            │
│  │  pattern matching... │ │  Abstract Syntax...  │            │
│  └──────────────────────┘ └──────────────────────┘            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  DETERMINISTIC SCORING                                   │ │
│  │                                                          │ │
│  │  Weighted severity model produces 0-100 score...        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Static Analysis Only • No Code Execution • Open Source        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- 🦞 Large lobster mascot (260x260px)
- Glowing red background effect (red/10 with blur)
- Dark theme throughout
- Monaco code editor with line numbers
- Red accent button (Securiclaw red #D7263D)
- 3-card protocol explainer

---

### STATE 2: Scanning In Progress

```
┌─────────────────────────────────────────────────────────────────┐
│                     🦞 SECURICLAW                              │
│              The AI that actually does security                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Code Editor with user code]                                  │
│                                                                 │
│                  [ ⚡ SCANNING... ]                            │
│                                                                 │
│  ────────────────────────▓▓▓▓▓──────────  60%                 │
│                                                                 │
│  ✅ LAYER 1 — EXECUTION SAFETY              READY              │
│  ✅ LAYER 2 — INJECTION DEFENSE             READY              │
│  🔄 LAYER 3 — PRIVILEGE INTEGRITY           SCANNING...        │
│  ○  LAYER 4 — DEPENDENCY HYGIENE                               │
│  ○  LAYER 5 — STRUCTURAL COMPLEXITY                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Animation Details:**
- Progress bar fills from left to right
- Active layer shows spinning loader icon (🔄)
- Completed layers show green checkmark (✅)
- Pending layers show empty circle (○)
- Layer name turns red when active
- "READY" appears in green when complete
- Total animation: ~750ms (150ms per layer)

---

### STATE 3: Results - Low Risk (Clean Code)

```
┌─────────────────────────────────────────────────────────────────┐
│                     🦞 SECURICLAW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Scan ID: SC-1737433920-X7K2M      Duration: 42ms       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                ╔════════════════════════╗                       │
│                ║                        ║                       │
│                ║         95             ║                       │
│                ║   Security Score       ║                       │
│                ║                        ║                       │
│                ╚════════════════════════╝                       │
│                                                                 │
│                  🛡️ Low Risk                                   │
│                  0 issues found                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               🛡️                                         │  │
│  │                                                           │  │
│  │         No issues detected                                │  │
│  │         Code looks clean! ✨                             │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Large score display (60px font)
- Green shield icon for Low risk
- Clean "no issues" state with celebration emoji
- Scan metadata in subtle banner

---

### STATE 4: Results - Critical Risk (Vulnerable Code)

```
┌─────────────────────────────────────────────────────────────────┐
│                     🦞 SECURICLAW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Scan ID: SC-1737433920-A9F4K      Duration: 89ms       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│         ╔════════╗        🚨 Critical Risk                     │
│         ║   12   ║        17 issues found                      │
│         ║ Score  ║                                              │
│         ╚════════╝                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ #1  [CRITICAL] exec-risk-eval                            │  │
│  │                                                           │  │
│  │     Unsafe eval() usage detected - arbitrary code        │  │
│  │     execution risk                                        │  │
│  │                                                           │  │
│  │     ▼ Click for details                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ #2  [CRITICAL] dep-dangerous-module                      │  │
│  │                                                           │  │
│  │     Dangerous module imported: child_process             │  │
│  │                                                           │  │
│  │     ▼ Click for details                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ #3  [HIGH] endpoint-no-auth                              │  │
│  │                                                           │  │
│  │     Unauthenticated endpoint detected: POST /api/exec   │  │
│  │                                                           │  │
│  │     ▼ Click for details                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                    ... 14 more issues                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- CRITICAL: Red (#DC2626) left border
- HIGH: Orange (#EA580C) left border
- MEDIUM: Yellow (#CA8A04) left border
- LOW: Blue (#3B82F6) left border

---

### STATE 5: Expanded Issue Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ #1  [CRITICAL] exec-risk-eval                            │  │
│  │                                                           │  │
│  │     Unsafe eval() usage detected - arbitrary code        │  │
│  │     execution risk                                        │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │ ⚠️  Exploit Scenario:                           │   │  │
│  │  │                                                   │   │  │
│  │  │  Attacker can inject and execute malicious       │   │  │
│  │  │  JavaScript code through user input.             │   │  │
│  │  │                                                   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │ ✅ Fix:                                          │   │  │
│  │  │                                                   │   │  │
│  │  │  Remove eval(). Use JSON.parse() for data or     │   │  │
│  │  │  safe alternatives like Function constructors    │   │  │
│  │  │  with validated input.                           │   │  │
│  │  │                                                   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │     ▲ Click to collapse                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction:**
- Click any issue card to expand/collapse
- Expanded shows orange "Exploit Scenario" section
- Green "Fix" section with remediation advice
- Toggle indicator changes (▼ → ▲)

---

## 🎨 DESIGN SYSTEM

### Colors

**Primary Palette:**
- Securiclaw Red: `#D7263D`
- Teal Accent: `#00DFC0`
- Background: `#09090B` (zinc-950)
- Card: `#18181B` (zinc-900)
- Border: `#27272A` (zinc-800)

**Severity Colors:**
- Critical: `#DC2626` (red-600)
- High: `#EA580C` (orange-500)
- Medium: `#CA8A04` (yellow-600)
- Low: `#3B82F6` (blue-400)

### Typography

**Headers:**
- SECURICLAW logo: 36px, extrabold, tracking-widest
- Tagline: 11px, uppercase, tracking-[0.3em]

**Body:**
- Issue titles: 14px, medium
- Issue descriptions: 13px, regular
- Metadata: 10-12px, muted

**Monospace:**
- Scan IDs: font-mono, 14px
- Code editor: 13px

### Spacing

- Container max-width: 700px (editor), 4xl (results)
- Card padding: 16px
- Gap between cards: 12px
- Section spacing: 16-24px

### Effects

- Glow: 96px x 96px blur, red/10 opacity
- Shadows: lg on cards
- Borders: 1px solid, rounded-lg
- Hover: bg-card/80 transition

---

## 📱 RESPONSIVE BEHAVIOR

**Desktop (> 768px):**
- Full width cards up to max-width
- 3-column protocol cards
- Large mascot (260px)

**Mobile (< 768px):**
- Stack protocol cards vertically
- Smaller mascot (180px)
- Full-width editor
- Compact scan progress

---

## ♿ ACCESSIBILITY

- **Keyboard Navigation:** All interactive elements
- **Screen Readers:** Proper ARIA labels
- **Color Contrast:** WCAG AA compliant
- **Focus Indicators:** Visible on all focusable elements

---

## 🎭 ANIMATIONS

**Scan Progress:**
- Duration: 750ms total (150ms per layer)
- Easing: ease-in-out
- Progress bar: linear fill
- Spinner: 1s rotation loop

**Card Interactions:**
- Hover: 200ms transition
- Expand/Collapse: 300ms ease
- Button press: 100ms scale

**Page Load:**
- Mascot: fade-in 500ms
- Cards: stagger 100ms each

---

## 🎯 USER FLOWS

### Flow 1: Scan Clean Code

1. User lands on page → sees 3 protocol cards
2. Pastes safe code into editor
3. Clicks "RUN AUDIT" button
4. Progress animation (5 layers, ~750ms)
5. Results show: Score 90+, Low risk, "No issues"
6. User sees green shield, celebration message

### Flow 2: Scan Vulnerable Code

1. User pastes malicious code
2. Clicks "RUN AUDIT"
3. Progress animation
4. Results show: Score < 30, Critical risk
5. Multiple issue cards appear (numbered)
6. User clicks issue #1 to expand
7. Sees exploit scenario + fix recommendation
8. User clicks again to collapse
9. Reviews all issues
10. Copies scan ID for sharing

### Flow 3: Edge Case Handling

1. User pastes empty string
2. Clicks "RUN AUDIT"
3. Error message appears: "Code input is empty"
4. No crash, clean error state
5. User fixes input and retries

---

## 📊 METRICS DISPLAYED

**Scan Metadata Banner:**
- Scan ID (format: SC-{timestamp}-{random})
- Duration in milliseconds
- Displayed after scan completes

**Score Panel:**
- Security score (0-100, large font)
- Risk level (Critical/High/Moderate/Low)
- Total issues count

**Issue Cards:**
- Issue number (#1, #2, etc.)
- Severity badge (colored)
- Issue type (monospace)
- Description
- Exploit scenario (when expanded)
- Fix recommendation (when expanded)

---

## 🔮 FUTURE ENHANCEMENTS

**Planned UI Improvements:**
- [ ] Dark/Light theme toggle
- [ ] Export report as PDF
- [ ] Share button (copy scan link)
- [ ] Issue filtering by severity
- [ ] Search within issues
- [ ] Keyboard shortcuts overlay
- [ ] Issue type icons
- [ ] Animated risk gauge
- [ ] Historical scans panel
- [ ] Comparison view (before/after)

---

**Status:** ✅ Current MVP design is complete and functional  
**Dev Server:** <http://localhost:8080>
