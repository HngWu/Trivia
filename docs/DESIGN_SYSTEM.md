# TriviaDuel Design System

## 1. Design Philosophy

The TriviaDuel design system is built on a **"Lume-Glass" aesthetic** — a premium, minimalist dark theme inspired by modern operating systems (iOS, macOS, Windows 11). The philosophy prioritizes:

- **Depth & Hierarchy:** Glass morphism with layered blur effects creates visual depth without clutter
- **Minimalism:** Restraint in elements; white space is a design tool
- **Responsiveness:** Adaptive typography and spacing that scales from mobile to desktop
- **Performance:** GPU-accelerated animations and strategic use of backdrop filters
- **Accessibility:** High contrast ratios, clear focus states, keyboard-first interactions
- **Immersion:** Atmospheric canvas backgrounds support gameplay without distraction

### Core Principles
1. **"Less is more"** — Every element serves a purpose
2. **"Dark by default"** — High visual comfort in all lighting conditions
3. **"Glass first"** — Blur and transparency create sophistication
4. **"Alive & responsive"** — Smooth animations respond to user actions
5. **"Mobile-first"** — Builds up from mobile constraints

---

## 2. Color System

### 2.1 OKLCH Color Model

All colors use **OKLCH color space** (Oklch(Lightness, Chroma, Hue)) for perceptual uniformity and better color mixing. This avoids the gamma problems of RGB/HSL.

### 2.2 Neutral Foundation

The core palette is **achromatic (zero chroma)** with layered lightness:

| Token | OKLCH | Usage | Notes |
|-------|-------|-------|-------|
| **--foreground** | `oklch(0.985 0 0)` | Primary text, contrast on dark surfaces | 98.5% lightness (near white) |
| **--background** | `oklch(0.145 0 0)` | Root background, full viewport | 14.5% lightness (deep charcoal) |
| **--card** | `oklch(0.205 0 0)` | Elevated surfaces (cards, panels) | 20.5% lightness (slightly lighter) |
| **--muted** | `oklch(0.269 0 0)` | Secondary text, disabled states | 26.9% lightness (subtle gray) |
| **--muted-foreground** | `oklch(0.708 0 0)` | Hint text, labels | 70.8% lightness (light gray) |

### 2.3 Glass System (Transparency)

Transparency layers create the "glass" effect:

```css
--glass-bg: rgba(255, 255, 255, 0.04);          /* 4% white opacity */
--glass-border: rgba(255, 255, 255, 0.12);      /* 12% white opacity */
--glass-highlight: rgba(255, 255, 255, 0.08);   /* 8% white opacity (inset) */
```

**Usage:**
- `.glass` containers use `var(--glass-bg)` + `backdrop-filter: blur(24px)`
- `.glass-button` uses `rgba(255, 255, 255, 0.04)` + `blur(12px)`
- `.glass-input` uses `rgba(0, 0, 0, 0.2)` (darker tint on focus)

### 2.4 Semantic Colors

| Token | OKLCH | Purpose |
|-------|-------|---------|
| **--primary** | `oklch(0.922 0 0)` | Interactive elements, focus states |
| **--secondary** | `oklch(0.269 0 0)` | Tertiary actions, secondary UI |
| **--accent** | `oklch(0.269 0 0)` | Highlights, emphasis (same as secondary in dark mode) |
| **--destructive** | `oklch(0.704 0.191 22.216)` | Warnings, deletions (red-orange) |

### 2.5 Accessibility Contrast

All text/background combinations meet WCAG AA (4.5:1) or AAA (7:1) standards:
- Foreground on dark backgrounds: **18:1 contrast** ✓
- Muted foreground on dark backgrounds: **7.2:1 contrast** ✓

---

## 3. Typography

### 3.1 Type Families

| Font | Family | Usage |
|------|--------|-------|
| **Geist Sans** | `'Geist', 'Inter', system-ui, -apple-system, sans-serif` | All body text, headings, UI labels |
| **Geist Mono** | `'Geist Mono', 'SFMono-Regular', monospace` | Code, room codes, technical text |

**Fallback Strategy:** System fonts ensure rendering even if fonts fail to load.

### 3.2 Type Scale

A **modular scale** using **1.125 ratio** (11.25% increments) ensures visual hierarchy:

| Semantic | Size | Line Height | Letter-Spacing | Usage |
|----------|------|-------------|-----------------|-------|
| **h1** (display) | clamp(2rem, 6vw, 4rem) | 1.2 | -0.02em | Hero titles, page headers |
| **h2** (heading) | clamp(1.5rem, 4vw, 2.5rem) | 1.2 | -0.02em | Section titles, large labels |
| **h3** (subheading) | 1.5rem (24px) | 1.3 | -0.01em | Medium labels, subtitle |
| **h4** (label) | 1.125rem (18px) | 1.4 | 0em | UI labels, strong text |
| **body-lg** | 1rem (16px) | 1.5 | 0em | Primary body text |
| **body-base** | 0.875rem (14px) | 1.5 | 0.02em | Standard UI text, descriptions |
| **body-sm** | 0.75rem (12px) | 1.4 | 0.03em | Small labels, hints, captions |
| **body-xs** | 0.6875rem (11px) | 1.4 | 0.04em | Smallest text, badges, room codes |

### 3.3 Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| **Regular** | 400 | Body text, default |
| **Medium** | 500 | Slightly emphasized text |
| **Semibold** | 600 | Buttons, labels, important text |
| **Bold** | 700 | Headings, strong emphasis |

### 3.4 Typography Rules

1. **Headings:** Always `letter-spacing: -0.02em` and `line-height: 1.2` (tight, premium look)
2. **Body text:** Default `line-height: 1.5` for readability
3. **Small text (<14px):** Increase `letter-spacing` to 0.03–0.04em for legibility
4. **All caps:** Use `text-transform: uppercase` with `tracking-widest` or `tracking-wide`
5. **Mono text:** Room codes, technical identifiers always use mono font + `font-bold`

### 3.5 Fluid Typography

Headings use **CSS clamp()** to scale smoothly across viewports:
```css
h1 { font-size: clamp(2rem, 6vw, 4rem); }  /* 32px → 64px */
h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); } /* 24px → 40px */
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

A **base unit of 0.5rem (8px)** with **1.25x ratio**:

| Token | Size | Multiplier | Usage |
|-------|------|-----------|-------|
| **xs** | 0.5rem | 1× | Tight spacing, inline gaps |
| **sm** | 0.625rem | 1.25× | Compact spacing |
| **md** | 0.75rem | 1.5× | Comfortable padding |
| **lg** | 0.875rem | 1.75× | Generous padding |
| **xl** | 1rem | 2× | Section padding |
| **2xl** | 1.25rem | 2.5× | Major spacing, section gaps |
| **3xl** | 1.5rem | 3× | Large gaps between sections |
| **4xl** | 2rem | 4× | Huge gaps, page margins |
| **5xl** | 2.5rem | 5× | Maximum margins |
| **6xl** | 3rem | 6× | Edge-to-edge spacing |

### 4.2 Spacing Rules

1. **Adjacent elements:** Use multiples of the base unit (8px, 12px, 16px, etc.)
2. **Padding:** Container padding = spacing unit × 1-3 (12px, 16px, 24px typical)
3. **Margins:** Between components = spacing unit × 2-4 (16px, 24px, 32px typical)
4. **Gaps (flexbox/grid):** Use spacing scale proportionally
5. **Mobile reduction:** On screens <640px, reduce padding by ~20% for comfortable thumb areas

### 4.3 Layout Containers

All page layouts follow this structure:

```
<RootLayout>                           {/* full viewport, dark background */}
  <DynamicBackground />                {/* atmospheric canvas (fixed, behind) */}
  <GlobalShortcuts />                  {/* keyboard event listeners */}
  <main className="container mx-auto"> {/* centered, max-width ~1024px */}
    <PageContent>                      {/* flex flex-col items-center justify-center */}
  </main>
</RootLayout>
```

#### Container Rules
- **Max-width:** 1024px for desktop, full width on mobile
- **Horizontal padding:** 1rem (16px) on mobile, 1.5rem (24px) on tablet+
- **Vertical padding:** 2rem (32px) minimum, 3rem (48px) preferred
- **Centering:** Always `flex flex-col items-center justify-center` for viewport-relative layouts

---

## 5. Glass & Surface Styles

### 5.1 Glass Morphism Layers

The `.glass` class creates a reusable frosted-glass effect:

```css
.glass {
  background: var(--glass-bg);                    /* rgba(255,255,255,0.04) */
  backdrop-filter: blur(24px);                   /* Strong blur effect */
  -webkit-backdrop-filter: blur(24px);           /* Safari support */
  border: 1px solid var(--glass-border);        /* rgba(255,255,255,0.12) */
  box-shadow: 
    inset 0 1px 0 0 var(--glass-highlight),    /* Top highlight */
    0 4px 20px -5px rgba(0,0,0,0.4);           /* Soft shadow */
}
```

### 5.2 Surface Variants

#### Surface: Elevated (Cards)
```css
.surface-elevated {
  @apply glass p-6 rounded-2xl w-full max-w-lg;
}
```
- Blur: 24px
- Border: `rgba(255,255,255,0.12)`
- Padding: 1.5rem (24px)
- Border-radius: 2rem (32px)
- Use for: Dialogs, panels, major containers

#### Surface: Interactive (Buttons)
```css
.glass-button {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}
```

#### Surface: Input Fields
```css
.glass-input {
  background: rgba(0, 0, 0, 0.2);          /* Darker tint */
  backdrop-filter: blur(8px);              /* Lighter blur */
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-input:focus {
  background: rgba(0, 0, 0, 0.4);         /* Darker on focus */
  border-color: rgba(255, 255, 255, 0.2);
}
```

### 5.3 Elevation Shadows

The system uses **functional shadows** based on elevation:

| Elevation | Shadow | Usage |
|-----------|--------|-------|
| **0 (flat)** | None | Inline text, flat buttons |
| **1 (raised)** | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift for interactive elements |
| **2 (card)** | `0 4px 12px rgba(0,0,0,0.15)` | Cards, small dialogs |
| **3 (modal)** | `0 20px 25px rgba(0,0,0,0.3)` | Large dialogs, modals |
| **4 (overlay)** | `0 40px 40px rgba(0,0,0,0.4)` | Full-page overlays |

---

## 6. Lume Glow Variants

The **"Lume Glow"** effect adds premium, interactive luminosity to surfaces:

### 6.1 Glow On Hover

All interactive glass surfaces glow on hover:

```css
.glass-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 0 15px rgba(255, 255, 255, 0.05),      /* Soft white glow */
    0 10px 25px -5px rgba(0,0,0,0.4);        /* Shadow depth */
  color: white;                               /* Brighten text */
}
```

### 6.2 Shimmer Sweep Animation

Interactive buttons have a **"sweep shimmer"** on hover:

```css
.glass-button::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.05),
    transparent
  );
  transform: skewX(-25deg);
  transition: 0.75s;
}

.glass-button:hover:not(:disabled)::after {
  left: 150%;  /* Sweep from left to right */
}
```

### 6.3 Focus Ring Glow

All focusable elements have a **premium focus ring**:

```css
focus:ring-2 focus:ring-white/20 focus:outline-none
```

- Ring width: 2px
- Ring color: `rgba(255, 255, 255, 0.2)`
- On smaller text: `focus:ring-1` for proportionality

---

## 7. Component Specifications

### 7.1 Buttons

#### GlassButton (Primary Interactive)
- **Inherits:** `.glass-button` from globals.css
- **Default padding:** `px-6 py-3` (24px × 12px)
- **Border-radius:** `rounded-lg` (12px)
- **Font:** `font-semibold text-base` (600 weight, 16px)
- **Focus:** `focus:ring-2 focus:ring-white/20`
- **Disabled:** `disabled:opacity-30 disabled:cursor-not-allowed`
- **Variants:** `primary` (default), `secondary`, `ghost` (for future use)

**Props:**
```tsx
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}
```

**Usage:**
```tsx
<GlassButton onClick={handleStart} fullWidth>
  Start Game
</GlassButton>
```

### 7.2 Text Input

#### GlassInput
- **Inherits:** `.glass-input` from globals.css
- **Padding:** `px-4 py-2` (16px × 8px)
- **Font:** `font-base text-base` (16px, prevents mobile zoom)
- **Border-radius:** `rounded-lg` (12px)
- **Focus:** Changes background + border
- **Placeholder:** `text-gray-500`

**Usage:**
```tsx
<input
  type="text"
  className="glass-input w-full rounded-lg px-4 py-2"
  placeholder="Room code or nickname"
/>
```

### 7.3 Glass Container

#### Surface Card
- **Class:** `.glass`
- **Padding:** `p-6` or `p-8` (24px or 32px)
- **Border-radius:** `rounded-2xl` (32px)
- **Max-width:** `max-w-lg` (480px, typical dialog width)
- **Border:** `border-white/[0.03]` (very subtle)

**Usage:**
```tsx
<div className="glass p-6 sm:p-8 rounded-2xl w-full max-w-lg space-y-6">
  {/* content */}
</div>
```

### 7.4 Toast Notifications

#### Toast Component
- **Position:** `fixed top-6 left-1/2 -translate-x-1/2` (centered top)
- **Z-index:** `z-[200]` (high stacking)
- **Class:** `.glass` + custom positioning
- **Padding:** `px-6 py-3` (24px × 12px)
- **Border-radius:** `rounded-2xl` (32px)
- **Animation:** `animate-toast-in` (fade in + slide)
- **Auto-close:** 3–5 seconds recommended

**Usage:**
```tsx
<Toast message="Game started!" type="success" />
```

### 7.5 Room Code Display

Room codes always use:
- **Font:** `font-mono font-bold` (monospace, bold)
- **Background:** `bg-white/[0.03]` (glass tint)
- **Padding:** `px-2 py-0.5` (8px × 4px)
- **Border-radius:** `rounded-lg` (12px)
- **Border:** `border border-white/5` (subtle edge)
- **Font-size:** `text-xs` (12px)

**Usage:**
```tsx
<span className="font-mono font-bold bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/5 text-xs">
  {roomCode}
</span>
```

---

## 8. Motion & Animation

### 8.1 Easing Functions

All animations use **cubic-bezier easing** for smooth, premium feel:

| Token | Easing | Usage |
|-------|--------|-------|
| **ease-in-out** | `cubic-bezier(0.4, 0, 0.6, 1)` | Default transitions (UI changes) |
| **ease-out** | `cubic-bezier(0.2, 0, 0, 1)` (custom) | Entrance animations |
| **bounce** | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions, playful elements |

### 8.2 Duration Scale

| Token | Duration | Usage |
|-------|----------|-------|
| **fast** | 150ms | Hover states, micro-interactions |
| **normal** | 300ms | Standard transitions (buttons, fades) |
| **slow** | 600ms–1s | Page transitions, major state changes |

### 8.3 Animation Library

#### Page Transition
```css
.page-transition {
  animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```
**Usage:** Applied to page wrapper on mount

#### Fade In
```css
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
**Usage:** Delayed content reveals

#### Pulse Slow
```css
.animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```
**Usage:** Subtle emphasis (active indicators, presence dots)

#### Shimmer Sweep
```css
/* In .glass-button::after (see section 6.2) */
transition: 0.75s;
/* Sweeps left to right on hover */
```

### 8.4 Motion Rules

1. **Hover transitions:** 300ms `ease-in-out`
2. **Focus ring:** Instant (no transition), high visibility
3. **Page navigation:** 600ms bounce easing
4. **Micro-interactions (button press):** 150ms
5. **Disabled state:** Instant, no hover animation
6. **Mobile:** Consider reducing duration by ~25% (240ms instead of 300ms)

---

## 9. Responsive Design

### 9.1 Breakpoints (Tailwind)

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **sm** | 640px | Tablets, large phones |
| **md** | 768px | Small tablets |
| **lg** | 1024px | Tablets, small desktops |
| **xl** | 1280px | Desktops |
| **2xl** | 1536px | Large desktops |

### 9.2 Mobile-First Typography Scaling

- **Mobile (<640px):** 1rem base, scaled down slightly on headings
- **Tablet (640–1024px):** 1rem base, standard headings
- **Desktop (>1024px):** 1.125rem base with 1.125x modular scale

**Example:**
```tsx
<h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Heading
</h2>
```

### 9.3 Spacing Adjustments

Mobile-first padding/margins:
```css
/* Mobile-first: generous padding */
padding: 1rem;      /* 16px */

/* Tablet+ */
sm:padding: 1.5rem; /* 24px */

/* Desktop+ */
lg:padding: 2rem;   /* 32px */
```

### 9.4 Interactive Element Sizing

- **Touch targets:** Minimum 44px × 44px (mobile)
- **Button padding:** `px-4 py-2` → `px-6 py-3` on mobile → desktop
- **Input height:** `h-10` (40px) on mobile for comfortable thumb tapping
- **Gap in flex/grid:** Reduce on mobile, increase on desktop

---

## 10. Accessibility

### 10.1 Color Contrast

- **AAA Standard:** All text meets 7:1 contrast minimum
- **AA Standard:** Secondary text meets 4.5:1 minimum
- **Decorative:** No contrast requirement, but aim for 3:1

**Verified Pairs:**
- Foreground (`oklch(0.985 0 0)`) on background (`oklch(0.145 0 0)`): **18:1** ✓
- Muted foreground on background: **7.2:1** ✓

### 10.2 Focus States

All interactive elements have visible focus rings:
```css
focus:ring-2 focus:ring-white/20 focus:outline-none
```

**Focus order:** Logical tab order following DOM structure or explicit `tabIndex`

### 10.3 Keyboard Navigation

- **Escape:** Navigate back (global shortcut)
- **Tab:** Cycle through focusable elements
- **Enter:** Activate buttons, submit forms
- **Arrow keys:** Select options (in dropdowns, carousel)
- **Spacebar:** Toggle checkboxes, activate buttons

### 10.4 ARIA & Semantic HTML

- Use `<button>` for clickable actions (not `<div>`)
- Use `<input>` with associated `<label>` for form fields
- Add `aria-label` for icon-only buttons
- Add `role="alert"` to toast notifications
- Use `aria-live="polite"` for dynamic content updates

---

## 11. Implementation Checklist

When adding components to the design system:

- [ ] Uses tokens from color system (no hardcoded colors)
- [ ] Typography follows type scale and rules
- [ ] Spacing uses defined scale (8px, 12px, 16px, etc.)
- [ ] Glass surfaces use `.glass` or `.glass-button` / `.glass-input`
- [ ] Animations use defined easing and duration
- [ ] Responsive breakpoints defined (mobile-first)
- [ ] Focus states visible and accessible
- [ ] Touch targets minimum 44px (mobile)
- [ ] Contrast ratio ≥4.5:1 (AA) or 7:1 (AAA)
- [ ] No hardcoded z-indexes (use z-[50], z-[100], z-[200] tiers)
- [ ] Internationalization ready (no text in components)

---

## 12. Design Tokens Reference

### CSS Variables (from globals.css)

```css
/* Colors */
--foreground: oklch(0.985 0 0);
--background: oklch(0.145 0 0);
--card: oklch(0.205 0 0);
--muted: oklch(0.269 0 0);
--muted-foreground: oklch(0.708 0 0);
--primary: oklch(0.922 0 0);
--secondary: oklch(0.269 0 0);
--accent: oklch(0.269 0 0);
--destructive: oklch(0.704 0.191 22.216);

/* Glass */
--glass-bg: rgba(255, 255, 255, 0.04);
--glass-border: rgba(255, 255, 255, 0.12);
--glass-highlight: rgba(255, 255, 255, 0.08);

/* Radius (all in rem, multiplied by base 10px) */
--radius-sm: 0.375rem;    /* 6px */
--radius-md: 0.5rem;      /* 8px */
--radius-lg: 0.625rem;    /* 10px */
--radius-xl: 0.875rem;    /* 14px */
--radius-2xl: 1.125rem;   /* 18px */
--radius-3xl: 1.375rem;   /* 22px */
--radius-4xl: 1.625rem;   /* 26px */

/* Fonts */
--font-sans: 'Geist', 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono', 'SFMono-Regular', monospace;
```

---

## 13. Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0** | May 2026 | Initial design system documentation |

---

## Maintenance & Updates

This design system is a living document. When making changes:

1. Update the relevant section in this document
2. Apply changes to `globals.css` and components
3. Test across mobile (mobile), tablet (iPad), and desktop viewports
4. Verify accessibility (contrast, focus, keyboard nav)
5. Increment version number in section 13

---

**Questions?** Refer to [GEMINI.md](../GEMINI.md) for architecture questions or [.github/copilot-instructions.md](../.github/copilot-instructions.md) for development patterns.
