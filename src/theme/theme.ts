/**
 * Design tokens used directly as React Native prop values.
 * Layout/typography/spacing are handled by NativeWind (Tailwind) classes.
 */
export const colors = {
  background:   '#F5F2EC',
  surface:      '#FFFFFF',
  muted:        '#6E665E',
  mutedLight:   '#A39990',
  primary:      '#1E4E46',
  accent:       '#B65F2A',
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
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.11,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;
