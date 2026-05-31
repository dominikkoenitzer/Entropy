import { ImageResponse } from 'next/og';

// Apple touch icon (180×180, opaque) — same mark as the favicon.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: '#c6f000',
          color: '#000',
          fontFamily: 'sans-serif',
          fontWeight: 900,
          fontSize: 140,
          lineHeight: 1,
        }}
      >
        e
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            right: 28,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#ff2e93',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
