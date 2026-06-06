import type { ReactNode } from 'react';
import { View } from 'react-native';

import { shadow } from '../theme/theme';

type Props = {
  children: ReactNode;
  compact?: boolean;
  elevated?: boolean;
};

export function Card({ children, compact = false, elevated = false }: Props) {
  return (
    <View
      className={[
        'bg-surface rounded-md border border-border',
        compact ? 'p-3 gap-3' : 'p-4 gap-3',
        elevated ? 'border-0' : '',
      ].join(' ')}
      style={elevated ? shadow.elevated : shadow.card}
    >
      {children}
    </View>
  );
}
