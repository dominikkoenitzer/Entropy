import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

// Branded social card, generated at build/edge — no password material involved,
// no external font fetch. Palette mirrors the Y2K theme in globals.css.
export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const ACID = '#c6f000';
const MAG = '#ff2e93';
const PAPER = '#ededed';
const DIM = '#6f7560';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#000',
          color: PAPER,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* technical header strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 26,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: ACID,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800 }}>
            <div style={{ display: 'flex', width: 22, height: 22, background: ACID, marginRight: 14 }} />
            Entropy Generator
          </div>
          <div style={{ display: 'flex', flex: 1, color: '#8fae00', margin: '0 18px' }}>
            ··································
          </div>
          <div style={{ display: 'flex', color: MAG, fontWeight: 800 }}>v2</div>
        </div>

        {/* giant wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 230,
              fontWeight: 900,
              letterSpacing: -4,
              lineHeight: 1,
              color: ACID,
            }}
          >
            ENTR<span style={{ color: MAG }}>O</span>PY
          </div>
          <div style={{ display: 'flex', fontSize: 40, color: PAPER, marginTop: 14 }}>
            {SITE.tagline}
          </div>
        </div>

        {/* footer: feature tags + url */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {['GENERATE', 'ANALYZE', 'LOCAL-ONLY'].map((t) => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  background: '#15160c',
                  color: ACID,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 3,
                  padding: '10px 20px',
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: DIM, letterSpacing: 1 }}>
            entropy.punds.ch
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
