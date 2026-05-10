'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import SynapseBackground from './SynapseBackground';
import DataStreamBackground from './DataStreamBackground';
import SynapseVariantBackground from './SynapseVariantBackground';

export default function DynamicBackground() {
  const { background, isAnimationEnabled } = useTheme();

  return (
    <>
      {background === 'synapse' && <SynapseBackground key="synapse" isEnabled={isAnimationEnabled} />}
      {background === 'stream' && <DataStreamBackground key="stream" isEnabled={isAnimationEnabled} />}
      {background === 'synapse-variant' && <SynapseVariantBackground key="synapse-variant" isEnabled={isAnimationEnabled} />}
      
      {/* Universal Vignette for depth - positioned between bg and content */}
      <div className="fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </>
  );
}
