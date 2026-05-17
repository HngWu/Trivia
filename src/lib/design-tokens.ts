/**
 * Design System Tokens
 * Centralized source of truth for design system values
 * Used to ensure consistency across components
 */

// Semantic Color Classes
export const colorTokens = {
  // Text Colors
  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    muted: 'text-muted',
    inverse: 'text-background',
  },
  
  // Background Colors
  bg: {
    primary: 'bg-background',
    surface: 'bg-card',
    muted: 'bg-muted',
  },
  
  // Semantic Colors
  semantic: {
    success: 'text-green-400', // TODO: Replace with design token when available
    error: 'text-destructive',
    warning: 'text-yellow-400', // TODO: Replace with design token when available
    info: 'text-blue-400', // TODO: Replace with design token when available
  },
  
  // Glass Surfaces
  glass: {
    default: 'glass',
    button: 'glass-button',
    input: 'glass-input',
    elevated: 'glass bg-white/8',
  },
} as const;

// Border Radius Tokens
export const radiusTokens = {
  sm: 'rounded-sm',      // 0.375rem (6px)
  md: 'rounded-md',      // 0.5rem (8px)
  lg: 'rounded-lg',      // 0.75rem (12px)
  xl: 'rounded-xl',      // 1rem (16px)
  '2xl': 'rounded-2xl',  // 1.25rem (20px)
  '3xl': 'rounded-3xl',  // 1.5rem (24px)
  '4xl': 'rounded-4xl',  // 2rem (32px)
  full: 'rounded-full',
} as const;

// Spacing Tokens (8px base unit)
export const spacingTokens = {
  xs: 'space-y-1',       // 4px (0.5x base)
  sm: 'space-y-2',       // 8px (1x base)
  md: 'space-y-3',       // 12px (1.5x base)
  lg: 'space-y-4',       // 16px (2x base)
  xl: 'space-y-6',       // 24px (3x base)
  '2xl': 'space-y-8',    // 32px (4x base)
  '3xl': 'space-y-12',   // 48px (6x base)
} as const;

// Padding Tokens (for consistent surface padding)
export const paddingTokens = {
  compact: 'p-3',        // 12px
  default: 'p-4 sm:p-6', // 16px → 24px
  generous: 'p-6 sm:p-8',// 24px → 32px
  xl: 'p-8 sm:p-10',     // 32px → 40px
} as const;

// Typography Tokens
export const typographyTokens = {
  heading: {
    h1: 'text-4xl sm:text-5xl font-bold tracking-tight',
    h2: 'text-3xl sm:text-4xl font-bold tracking-tight',
    h3: 'text-2xl sm:text-3xl font-bold tracking-tight',
    h4: 'text-xl font-bold tracking-tight',
  },
  body: {
    lg: 'text-lg font-medium',
    base: 'text-base font-normal',
    sm: 'text-sm font-normal',
    xs: 'text-xs font-normal',
  },
  label: 'text-xs font-bold tracking-widest uppercase',
  mono: 'font-mono font-bold',
} as const;

// Animation Tokens
export const animationTokens = {
  duration: {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
    slower: 'duration-700',
  },
  easing: {
    'ease-out': 'cubic-bezier(0.2, 0, 0, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.6, 1)',
    'bounce': 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

// Focus States
export const focusTokens = {
  ring: 'focus:ring-2 focus:ring-white/20 focus:outline-none',
  ringSmall: 'focus:ring-1 focus:ring-white/20 focus:outline-none',
} as const;

// Z-Index Tiers
export const zIndexTokens = {
  base: 'z-0',
  dropdown: 'z-40',
  sticky: 'z-50',
  fixed: 'z-50',
  modal: 'z-100',
  popover: 'z-150',
  toast: 'z-200',
} as const;

// Container Sizes
export const containerTokens = {
  sm: 'max-w-sm',        // 384px
  md: 'max-w-md',        // 448px
  lg: 'max-w-lg',        // 512px
  xl: 'max-w-xl',        // 576px
  '2xl': 'max-w-2xl',    // 672px
  '3xl': 'max-w-3xl',    // 768px
  '4xl': 'max-w-4xl',    // 896px
} as const;

// Touch Target Sizes (min 44px)
export const touchTargetTokens = {
  button: 'min-h-10 min-w-10 px-4 py-2',  // 40px height
  icon: 'h-8 w-8',                        // 32px
  control: 'h-6 w-6',                     // 24px (secondary)
} as const;

export type ColorToken = typeof colorTokens;
export type RadiusToken = typeof radiusTokens;
export type SpacingToken = typeof spacingTokens;
export type PaddingToken = typeof paddingTokens;
export type TypographyToken = typeof typographyTokens;
export type AnimationToken = typeof animationTokens;
export type FocusToken = typeof focusTokens;
export type ZIndexToken = typeof zIndexTokens;
export type ContainerToken = typeof containerTokens;
export type TouchTargetToken = typeof touchTargetTokens;
