import { ImageResponse } from 'next/og';

// Favicon / PWA icon: acid-green field with a black wordmark initial and the
// magenta accent dot from the "O" in ENTRØPY. Legible down to tab size.
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize: 400,
          lineHeight: 1,
        }}
      >
        e
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            right: 78,
            width: 86,
            height: 86,
            borderRadius: '50%',
            background: '#ff2e93',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
