'use client';

import { useState } from 'react';
import { analyze, type CharClass } from '@/lib/entropy-core';
import { StarGlyph, WarnGlyph } from './Glyphs';

export default function EntropyAnalyze() {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);

  const a = analyze(value); // derived during render; analysis is cheap & instant
  const weak = a.tier <= 1;
  const col = weak ? 'var(--mag)' : 'var(--acid)';
  const has = (k: CharClass) => a.classes.includes(k);

  return (
    <div className="main">
      {/* LEFT RAIL — blurb */}
      <aside className="rail">
        <div className="anrail">
          <h3>
            Test Any
            <br />
            Password
          </h3>
          <p>
            Type or paste a password in the field. Strength, crack-time and composition are
            computed <span className="star">instantly</span> and{' '}
            <span className="star">never leave this device.</span>
          </p>
        </div>
      </aside>

      {/* RIGHT STAGE — input + results */}
      <section className="stage">
        <div className="anstage">
          <div className="aninput">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="TYPE A PASSWORD"
              autoComplete="off"
              spellCheck={false}
              aria-label="Password to analyze"
              autoFocus
            />
            <button onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          {!value ? (
            <div className="anempty">Analysis is instant · never leaves device</div>
          ) : (
            <div aria-live="polite">
              <div className="str" style={{ padding: '22px 0 0', border: 0 }}>
                <div className="blocks">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} className={i <= a.tier ? (weak ? 'on-mag' : 'on-acid') : ''} />
                  ))}
                </div>
                <span className="lbl" style={{ color: col }}>
                  {a.tierInfo.label.toUpperCase()}
                </span>
                <span className="bits">
                  {a.bits} <span>BITS</span>
                </span>
              </div>

              <div className="crackrow" style={{ border: 0, padding: '12px 0 0' }}>
                Avg. crack time <b style={{ color: col }}>{a.crack}</b>
              </div>

              <div className="comp">
                <div className={has('lower') ? 'on' : ''}>
                  <div className="cval">a-z</div>
                  <div className="clbl">Lower</div>
                </div>
                <div className={has('upper') ? 'on' : ''}>
                  <div className="cval">A-Z</div>
                  <div className="clbl">Upper</div>
                </div>
                <div className={has('number') ? 'on' : ''}>
                  <div className="cval">0-9</div>
                  <div className="clbl">Digit</div>
                </div>
                <div className={has('symbol') ? 'on' : ''}>
                  <div className="cval">#$!</div>
                  <div className="clbl">Symbol</div>
                </div>
              </div>

              <div className="comp" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="on">
                  <div className="cval">{a.length}</div>
                  <div className="clbl">Length</div>
                </div>
                <div className="on">
                  <div className="cval">{a.pool}</div>
                  <div className="clbl">Char Pool</div>
                </div>
              </div>

              <div className="notes">
                {a.notes.map((n, i) => {
                  const warn = !/no obvious/.test(n);
                  return (
                    <div key={i} className={`note${warn ? ' warn' : ''}`}>
                      {warn ? <WarnGlyph className="nb" /> : <StarGlyph className="nb" />}
                      <span>{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
