'use client';

import { useEffect, useState } from 'react';
import type { Analysis, CharClass } from '@/lib/entropy-core';
import type { Pattern } from '@/lib/strength';
import { StarGlyph, WarnGlyph } from './Glyphs';

const PATTERN_LABEL: Record<Pattern, string> = {
  dictionary: 'Dictionary',
  spatial: 'Keyboard',
  repeat: 'Repeat',
  sequence: 'Sequence',
  regex: 'Year',
  date: 'Date',
  bruteforce: 'Random',
};

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const superscript = (n: number) => String(n).split('').map((d) => SUP[+d] ?? d).join('');

/** Human-readable guess count: small numbers literal, large ones as a × 10ⁿ. */
function formatGuesses(g: number): string {
  if (g < 1e4) return Math.round(g).toLocaleString('en-US');
  const exp = Math.floor(Math.log10(g));
  const mant = (g / 10 ** exp).toFixed(1);
  return `${mant} × 10${superscript(exp)}`;
}

export default function EntropyAnalyze() {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);

  // The analyzer carries ~90 KB of dictionaries, so it's code-split: load it on
  // mount (i.e. when the Analyze tab opens), then analysis runs instantly.
  const [analyzeFn, setAnalyzeFn] = useState<((pw: string) => Analysis) | null>(null);
  useEffect(() => {
    let on = true;
    import('@/lib/analyze').then((m) => { if (on) setAnalyzeFn(() => m.analyze); });
    return () => { on = false; };
  }, []);

  const a = value && analyzeFn ? analyzeFn(value) : null;
  const weak = a ? a.tier <= 1 : false;
  const col = weak ? 'var(--mag)' : 'var(--acid)';
  const has = (k: CharClass) => !!a && a.classes.includes(k);

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
            Strength is modelled the way an attacker actually cracks passwords —
            dictionaries, l33t, keyboard walks, repeats, sequences and dates —
            then the <span className="star">cheapest attack path</span> is
            costed across five scenarios. Everything is computed{' '}
            <span className="star">instantly</span> and{' '}
            <span className="star">never leaves this device.</span>
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
          ) : !a ? (
            <div className="anempty">Analyzing…</div>
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
                ≈ <b style={{ color: col }}>{formatGuesses(a.guesses)}</b> guesses to crack
              </div>

              {/* crack time across attack scenarios */}
              <div className="scn">
                {a.scenarios.map((s) => {
                  const fast = s.seconds < 86400; // < 1 day = quick
                  return (
                    <div className="scnrow" key={s.key}>
                      <span className="scnk">
                        {s.label}
                        <em>{s.sub}</em>
                      </span>
                      <span className="scnv" style={{ color: fast ? 'var(--mag)' : 'var(--acid)' }}>
                        {s.time}
                      </span>
                    </div>
                  );
                })}
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

              {/* how the password decomposes — the attack path */}
              {a.sequence.length > 0 && (
                <div className="seq">
                  <div className="seqhead">Attack path · weakest decomposition</div>
                  <div className="seqrow">
                    {a.sequence.map((m, i) => {
                      const random = m.pattern === 'bruteforce';
                      return (
                        <span key={i} className={`seqchip${random ? ' rand' : ''}`} title={m.detail}>
                          <span className="seqtok">{m.token}</span>
                          <span className="seqmeta">
                            {PATTERN_LABEL[m.pattern]} · {Math.round(m.bits)}b
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {(a.warning || a.suggestions.length > 0) && (
                <div className="notes">
                  {a.warning && (
                    <div className="note warn">
                      <WarnGlyph className="nb" />
                      <span>{a.warning}</span>
                    </div>
                  )}
                  {a.suggestions.map((n, i) => (
                    <div key={i} className="note">
                      <StarGlyph className="nb" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
