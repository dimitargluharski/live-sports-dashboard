import React from 'react';
import type { Stream } from '../types/game';

interface StreamHealthDotProps {
  stream: Stream;
}

export const StreamHealthDot: React.FC<StreamHealthDotProps> = ({ stream }) => {
  const isHealthy = stream.healthStatus === 'healthy';
  const label = isHealthy ? 'Available stream' : 'Unavailable stream';

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
    />
  );
};
