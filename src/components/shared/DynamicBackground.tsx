'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import SynapseBackground from './SynapseBackground';
import DataStreamBackground from './DataStreamBackground';
import SynapseV2Background from './SynapseV2Background';

export default function DynamicBackground() {
  const { background, isAnimationEnabled } = useTheme();

  if (!isAnimationEnabled) return null;

  return (
    <>
      {background === 'synapse' && <SynapseBackground key="synapse" isEnabled={isAnimationEnabled} />}
      {background === 'stream' && <DataStreamBackground key="stream" isEnabled={isAnimationEnabled} />}
      {background === 'syn-v2' && <SynapseV2Background key="syn-v2" isEnabled={isAnimationEnabled} />}
    </>
  );
}
