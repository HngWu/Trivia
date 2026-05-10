'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import SynapseBackground from './SynapseBackground';
import DataStreamBackground from './DataStreamBackground';
import SynapseVariantBackground from './SynapseVariantBackground';

export default function DynamicBackground() {
  const { background, isAnimationEnabled } = useTheme();

  if (!isAnimationEnabled) return null;

  return (
    <>
      {background === 'synapse' && <SynapseBackground key="synapse" isEnabled={isAnimationEnabled} />}
      {background === 'stream' && <DataStreamBackground key="stream" isEnabled={isAnimationEnabled} />}
      {background === 'synapse-variant' && <SynapseVariantBackground key="synapse-variant" isEnabled={isAnimationEnabled} />}
    </>
  );
}
