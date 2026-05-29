/* Flat SVG shapes that replace the header star and warning bullet glyphs.
   Rendered as vectors so platforms never substitute a color emoji for the
   raw characters. They inherit color via currentColor. */

export function StarGlyph({ className }: { className?: string }) {
  // Eight-spoked asterisk (stands in for U+2733 EIGHT SPOKED ASTERISK).
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" />
      <line x1="18.7" y1="5.3" x2="5.3" y2="18.7" />
    </svg>
  );
}

export function WarnGlyph({ className }: { className?: string }) {
  // Solid up-pointing triangle (stands in for U+25B2 BLACK UP-POINTING TRIANGLE).
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5 L21.5 20.5 L2.5 20.5 Z" />
    </svg>
  );
}
