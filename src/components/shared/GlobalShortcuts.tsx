'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESC to go back
      if (e.key === 'Escape') {
        // Prevent default browser behavior if needed, but usually esc is safe
        window.history.back();
      }
    };

    // 2. Capture mouse back button (usually button index 3)
    // Note: Most browsers already handle this, but explicit handling ensures consistency.
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) { // Mouse Back
        window.history.back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [router]);

  return null;
}
