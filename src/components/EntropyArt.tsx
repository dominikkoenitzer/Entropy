'use client';

import { memo, useId, useMemo } from 'react';
import { buildArt, ART_WIDTH, ART_HEIGHT } from '@/lib/art';

function EntropyArt({ seed }: { seed: number }) {
  const clipId = useId();
  const art = useMemo(() => buildArt(seed), [seed]);

  return (
    <div className="art">
      <span className="seedtag l">SEED {art.seedLabel}</span>
      <svg viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <circle cx={art.cx} cy={art.cy} r={art.r} />
          </clipPath>
        </defs>
        <circle cx={art.cx} cy={art.cy} r={art.r} fill="#0a0b08" />
        <g clipPath={`url(#${clipId})`}>
          {art.paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#c6f000" strokeWidth={2.2} opacity={0.92} />
          ))}
        </g>
        <circle cx={art.cx} cy={art.cy} r={art.r} fill="none" stroke="#ff2e93" strokeWidth={3} />
        <circle cx={art.cx} cy={art.cy} r={art.r + 7} fill="none" stroke="#0a0b08" strokeWidth={2.5} />
      </svg>
    </div>
  );
}

export default memo(EntropyArt);
