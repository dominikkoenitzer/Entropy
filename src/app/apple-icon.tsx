import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Apple touch icon (180×180, opaque PNG). iOS ignores SVG touch icons, so we
// rasterize the same contour-art favicon (src/app/icon.svg) to PNG. Read at
// build time — single source of truth, no drift from the SVG favicon.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const svg = readFileSync(join(process.cwd(), 'src/app/icon.svg'), 'utf8');
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
