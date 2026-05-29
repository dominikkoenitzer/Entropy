'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateRandom,
  generateWords,
  tier,
  tierInfo,
  crackTime,
  classOf,
  type GenResult,
  type CharClass,
} from '@/lib/entropy-core';
import { randomSeed } from '@/lib/art';
import { prefersReducedMotion, copyText } from '@/lib/ui';
import EntropyArt from './EntropyArt';

type GenType = 'random' | 'words';

interface Cfg {
  type: GenType;
  length: number;
  sets: Record<'upper' | 'lower' | 'number' | 'symbol', boolean>;
  avoidAmbiguous: boolean;
  wordCount: number;
  separator: string;
  capitalize: boolean;
  addNumber: boolean;
}

const DEFAULT_CFG: Cfg = {
  type: 'random',
  length: 16,
  sets: { upper: true, lower: true, number: true, symbol: true },
  avoidAmbiguous: false,
  wordCount: 5,
  separator: '-',
  capitalize: true,
  addNumber: true,
};

const LENGTH_MIN = 8;
const LENGTH_MAX = 64;
const WORDS_MIN = 3;
const WORDS_MAX = 8;
const HISTORY_CAP = 10;

const CHAR_SETS: Array<{ key: keyof Cfg['sets']; glyph: string; label: string }> = [
  { key: 'upper', glyph: 'AZ', label: 'Upper' },
  { key: 'lower', glyph: 'az', label: 'Lower' },
  { key: 'number', glyph: '09', label: 'Digit' },
  { key: 'symbol', glyph: '#$', label: 'Symbol' },
];

const SEPARATORS: Array<{ value: string; glyph: string }> = [
  { value: '-', glyph: '-' },
  { value: '.', glyph: '.' },
  { value: '_', glyph: '_' },
  { value: ' ', glyph: '␣' },
];

interface HistoryEntry {
  value: string;
  bits: number;
  tier: number;
}

function rangeStyle(value: number, min: number, max: number): React.CSSProperties {
  const p = ((value - min) / (max - min)) * 100;
  return { background: `linear-gradient(90deg, var(--acid) 0 ${p}%, var(--black-2) ${p}% 100%)` };
}

/** Bits readout that eases up to its target (~420ms), respecting reduced motion. */
function useCountUp(target: number): number {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);
  useEffect(() => {
    valRef.current = val;
  }, [val]);
  useEffect(() => {
    const from = valRef.current;
    if (from === target || prefersReducedMotion()) {
      setVal(target);
      return;
    }
    const dur = 420;
    const start = performance.now();
    let raf = 0;
    let done = false;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else done = true;
    };
    raf = requestAnimationFrame(step);
    // Fallback: if rAF is throttled (background tab), snap to the final value
    // so the bits readout is never stuck mid-count.
    const fallback = setTimeout(() => {
      if (!done) setVal(target);
    }, dur + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [target]);
  return val;
}

export default function EntropyGenerate() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [current, setCurrent] = useState<GenResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Deterministic on first render (server + client) to avoid a hydration
  // mismatch in the art SVG; the mount-effect generation sets a real seed.
  const [seed, setSeed] = useState(0);
  const [scramble, setScramble] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrambleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const generateWith = useCallback((c: Cfg, animate: boolean) => {
    const res =
      c.type === 'random'
        ? generateRandom({
            length: c.length,
            lower: c.sets.lower,
            upper: c.sets.upper,
            number: c.sets.number,
            symbol: c.sets.symbol,
            avoidAmbiguous: c.avoidAmbiguous,
          })
        : generateWords({
            count: c.wordCount,
            separator: c.separator,
            capitalize: c.capitalize,
            number: c.addNumber,
          });
    setCurrent(res);
    setSeed(randomSeed());
    setHistory((prev) =>
      [{ value: res.value, bits: res.bits, tier: tier(res.bits) }, ...prev].slice(0, HISTORY_CAP)
    );
    if (animate && !prefersReducedMotion()) {
      setScramble(true);
      clearTimeout(scrambleTimer.current);
      scrambleTimer.current = setTimeout(() => setScramble(false), 240);
    }
  }, []);

  // Event handlers read the current committed state from closure (always fresh),
  // then update — no side effects inside state updaters.
  const applyCfg = (partial: Partial<Cfg>, animate = true) => {
    const next = { ...cfg, ...partial };
    setCfg(next);
    generateWith(next, animate);
  };

  const regenerate = () => generateWith(cfg, true);

  const copyCurrent = () => {
    if (!current) return;
    copyText(current.value);
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1100);
  };

  // first generation (guarded against StrictMode double-invoke)
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    generateWith(DEFAULT_CFG, false);
  }, [generateWith]);

  // clean up timers
  useEffect(() => {
    return () => {
      clearTimeout(scrambleTimer.current);
      clearTimeout(copyTimer.current);
    };
  }, []);

  // keyboard shortcuts: r = regenerate, c = copy (stable subscription via refs)
  const regenRef = useRef(regenerate);
  const copyRef = useRef(copyCurrent);
  useEffect(() => {
    regenRef.current = regenerate;
    copyRef.current = copyCurrent;
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'r') {
        e.preventDefault();
        regenRef.current();
      } else if (e.key === 'c') {
        e.preventDefault();
        copyRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSet = (key: keyof Cfg['sets']) => {
    const activeCount = Object.values(cfg.sets).filter(Boolean).length;
    if (cfg.sets[key] && activeCount === 1) return; // keep at least one set
    applyCfg({ sets: { ...cfg.sets, [key]: !cfg.sets[key] } }, true);
  };

  const t = current ? tier(current.bits) : 0;
  const weak = t <= 1;
  const tierColor = weak ? 'var(--mag)' : 'var(--acid)';
  const displayBits = useCountUp(current?.bits ?? 0);
  const recent = history.slice(1); // exclude the current value

  return (
    <div className="main">
      {/* LEFT RAIL — type, controls, history */}
      <aside className="rail">
        <div className="tabs type2" role="tablist" aria-label="Generator type">
          {(['random', 'words'] as const).map((ty) => (
            <button
              key={ty}
              role="tab"
              aria-selected={cfg.type === ty}
              onClick={() => applyCfg({ type: ty }, true)}
            >
              {ty === 'random' ? 'Random' : 'Words'}
            </button>
          ))}
        </div>

        {cfg.type === 'random' ? (
          <div className="ctl">
            <div className="ctlhead">
              <span className="k">Length</span>
              <span className="v">{cfg.length}</span>
            </div>
            <input
              type="range"
              min={LENGTH_MIN}
              max={LENGTH_MAX}
              value={cfg.length}
              aria-label="Password length"
              onChange={(e) => applyCfg({ length: +e.target.value }, false)}
              style={rangeStyle(cfg.length, LENGTH_MIN, LENGTH_MAX)}
            />
            <div className="scale">
              <span>08</span>
              <span>64</span>
            </div>
            <div className="grid4">
              {CHAR_SETS.map(({ key, glyph, label }) => (
                <button
                  key={key}
                  className="sq"
                  aria-pressed={cfg.sets[key]}
                  onClick={() => toggleSet(key)}
                >
                  {glyph}
                  <small>{label}</small>
                </button>
              ))}
            </div>
            <button
              className="wide"
              aria-pressed={cfg.avoidAmbiguous}
              onClick={() => applyCfg({ avoidAmbiguous: !cfg.avoidAmbiguous }, true)}
            >
              Avoid Look-Alikes · 0 O 1 l
            </button>
          </div>
        ) : (
          <div className="ctl">
            <div className="ctlhead">
              <span className="k">Words</span>
              <span className="v">{cfg.wordCount}</span>
            </div>
            <input
              type="range"
              min={WORDS_MIN}
              max={WORDS_MAX}
              value={cfg.wordCount}
              aria-label="Word count"
              onChange={(e) => applyCfg({ wordCount: +e.target.value }, false)}
              style={rangeStyle(cfg.wordCount, WORDS_MIN, WORDS_MAX)}
            />
            <div className="scale">
              <span>03</span>
              <span>08</span>
            </div>
            <div className="sublabel">Separator</div>
            <div className="sepgrid" role="group" aria-label="Separator">
              {SEPARATORS.map(({ value, glyph }) => (
                <button
                  key={value}
                  className="sepbtn"
                  aria-pressed={cfg.separator === value}
                  onClick={() => applyCfg({ separator: value }, true)}
                >
                  {glyph}
                </button>
              ))}
            </div>
            <div className="twocol">
              <button
                className="wide"
                style={{ marginTop: 0 }}
                aria-pressed={cfg.capitalize}
                onClick={() => applyCfg({ capitalize: !cfg.capitalize }, true)}
              >
                Capitalize
              </button>
              <button
                className="wide"
                style={{ marginTop: 0 }}
                aria-pressed={cfg.addNumber}
                onClick={() => applyCfg({ addNumber: !cfg.addNumber }, true)}
              >
                Add Number
              </button>
            </div>
          </div>
        )}

        <div className="hist">
          <div className="histhead">
            <span>Recent</span>
            <button onClick={() => setHistory((prev) => prev.slice(0, 1))}>Clear</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty">No history yet</div>
          ) : (
            <ul>
              {recent.map((h, i) => (
                <li key={i} onClick={() => copyText(h.value)} title="click to copy">
                  <span className="bar" style={{ background: h.tier <= 1 ? 'var(--mag)' : 'var(--acid)' }} />
                  <span className="pwh">{h.value}</span>
                  <span className="bh">{h.bits}B</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* RIGHT STAGE — art + output */}
      <section className="stage">
        <EntropyArt seed={seed} />

        <div className="pwbar">
          <div className="pwlbl">
            <span>Output String</span>
            <span>{cfg.type === 'random' ? '// Random' : '// Passphrase'}</span>
          </div>
          <div className={`pw${scramble ? ' scramble' : ''}`} title="click to copy" onClick={copyCurrent}>
            {current
              ? [...current.value].map((ch, i) => {
                  const isSep = cfg.type === 'words' && /[-._ ]/.test(ch) && !/[a-z0-9]/i.test(ch);
                  const cls: CharClass | 'sep' = isSep ? 'sep' : classOf(ch);
                  return (
                    <span key={i} className={`ch ${cls}`}>
                      {ch === ' ' ? '·' : ch}
                    </span>
                  );
                })
              : null}
          </div>
        </div>

        <div className="str">
          <div className="blocks">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= t ? (weak ? 'on-mag' : 'on-acid') : ''} />
            ))}
          </div>
          <span className="lbl" style={{ color: tierColor }}>
            {current ? tierInfo(current.bits).label.toUpperCase() : '—'}
          </span>
          <span className="bits">
            {displayBits} <span>BITS</span>
          </span>
        </div>
        <div className="crackrow">
          Avg. crack time <b>{current ? crackTime(current.bits) : '—'}</b>
        </div>

        <div className="acts">
          <button className="regen" onClick={regenerate} aria-label="Regenerate (shortcut R)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Regenerate
          </button>
          <button
            className={`copy${copied ? ' copied' : ''}`}
            onClick={copyCurrent}
            aria-label="Copy to clipboard (shortcut C)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="1" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
