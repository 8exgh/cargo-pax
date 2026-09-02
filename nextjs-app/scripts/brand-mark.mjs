// The CargoPax mark: a kraft parcel with a map pin standing on it, on the
// brand blue. Everything that shows the logo renders it from here -
// generate-icons.mjs for the icons, render-promo.mjs for the video - so
// there is one drawing to change.

// The drawing lives on a 512 grid. `scale` shrinks the mark about the
// centre (the maskable icon needs breathing room), `bleed` drops the
// rounded corners for formats that apply their own mask.
export function tile({ bleed = false, scale = 1 } = {}) {
  const t = `translate(${256 - 256 * scale} ${256 - 256 * scale}) scale(${scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${bleed ? 0 : 112}" fill="url(#bg)"/>
  <g transform="${t}">
${mark()}
  </g>
</svg>
`;
}

// The parcel and pin alone. `mono` flattens it to a white silhouette, which
// is what Android wants for the notification badge: one hexagon for the
// box (three white faces would show seams), the pin lifted clear of it and
// its dot cut out, or the two would melt into a blob at status-bar size.
export function mark({ mono = false } = {}) {
  const pin = 'M256 222 C 256 222, 200 150, 200 106 A 56 56 0 1 1 312 106 C 312 150, 256 222, 256 222 Z';
  if (mono) {
    const hole = 'M256 84 A 22 22 0 1 0 256 128 A 22 22 0 1 0 256 84 Z';
    return `    <path d="M256 150 L376 220 L376 370 L256 440 L136 370 L136 220 Z" fill="#fff"/>
    <path d="${pin} ${hole}" fill-rule="evenodd" fill="#fff" transform="translate(0 -92)"/>`;
  }
  return `    <g transform="translate(256 262) scale(1.06) translate(-256 -262)">
      <ellipse cx="256" cy="426" rx="150" ry="32" fill="#0f172a" opacity="0.28"/>
      <path d="M136 220 L256 290 L256 440 L136 370 Z" fill="#d99a3e"/>
      <path d="M376 220 L256 290 L256 440 L376 370 Z" fill="#b9782a"/>
      <path d="M256 150 L376 220 L256 290 L136 220 Z" fill="#f2be6b"/>
      <path d="M186.4 249.4 L306.4 179.4 L325.6 190.6 L205.6 260.6 Z" fill="#fff3dc" opacity="0.95"/>
      <path d="M186.4 249.4 L205.6 260.6 L205.6 410.6 L186.4 399.4 Z" fill="#fff3dc" opacity="0.8"/>
      <path d="${pin}" fill="#ffffff"/>
      <circle cx="256" cy="106" r="22" fill="#1e40af"/>
    </g>`;
}

// The silhouette spans y = -42..440 on the grid; centre it and leave a
// little margin, since the badge is drawn tiny.
export function badge() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(256 256) scale(0.96) translate(-256 -199)">
${mark({ mono: true })}
  </g>
</svg>
`;
}
