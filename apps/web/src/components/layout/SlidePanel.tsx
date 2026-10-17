import type { ReactNode } from 'react';
import AdaptiveSheet from '@/components/layout/AdaptiveSheet';

export interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  category?: string;
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  rightAction?: ReactNode;
  side?: 'left' | 'right' | 'center';
}

/**
 * SlidePanel (Forwarding adapter to AdaptiveSheet with custom side placement support)
 */
export default function SlidePanel(props: SlidePanelProps) {
  return <AdaptiveSheet {...props} />;
}
