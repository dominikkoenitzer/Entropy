'use client';

import { useState } from 'react';
import EntropyGenerate from './EntropyGenerate';
import EntropyAnalyze from './EntropyAnalyze';
import { StarGlyph } from './Glyphs';

type Mode = 'generate' | 'analyze';

export default function Entropy() {
  const [mode, setMode] = useState<Mode>('generate');

  return (
    <div className="poster">
      {/* technical header */}
      <div className="htop">
        <StarGlyph className="star" />
        <span className="t">Entropy Generator</span>
        <span className="dots" aria-hidden="true">
          ······································
        </span>
        <span className="corner">v2</span>
      </div>
      <div className="hsub">
        <span>Cryptographic</span>
        <span>No Tracking</span>
      </div>

      {/* mode tabs */}
      <div className="tabs mode" role="tablist" aria-label="Mode">
        {(['generate', 'analyze'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'generate' ? 'Generate' : 'Analyze'}
          </button>
        ))}
      </div>

      {mode === 'generate' ? <EntropyGenerate /> : <EntropyAnalyze />}

      {/* giant wordmark footer */}
      <div className="wm">
        <div className="word">
          ENTR<span className="x">O</span>PY
        </div>
      </div>
      <div className="wmfoot">
        <span>Password Generator</span>
        <span className="c">Local-Only</span>
      </div>
    </div>
  );
}
