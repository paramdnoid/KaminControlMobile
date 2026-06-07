/**
 * Design tokens used directly as React Native prop values.
 * Layout/typography/spacing are handled by NativeWind (Tailwind) classes.
 */
export const colors = {
  background:   '#F2EFE8',
  surface:      '#FFFFFF',
  ink:          '#1A1613',
  border:       '#E3DCD0',
  divider:      '#EDE7DD',
  muted:        '#6B635A',
  mutedLight:   '#A89E93',
  primary:      '#16453D',
  primarySoft:  '#DBEAE4',
  accent:       '#BC6230',
  success:      '#2D6A4F',
  danger:       '#9F2D2D',
  info:         '#275C7D',
};

/**
 * Shadow tokens — used as `style` spread alongside NativeWind className.
 * Tailwind's shadow utilities map differently on iOS/Android; these give
 * precise control over the card elevation feel.
 */
export const shadow = {
  card: {
    shadowColor: '#3A2E1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#2A2113',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    shadowColor: '#0F312B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;
