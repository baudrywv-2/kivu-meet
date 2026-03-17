const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install -D sharp');
    process.exit(1);
  }

  const publicDir = path.join(__dirname, '..', 'public');
  const rose = '#e11d48';
  const lightPink = '#fef2f2';
  const yellow = '#fffc00';
  const black = '#0a0a0a';

  const createIcon = async (size) => {
    const rx = Math.round(size * 0.22);
    const fontSize = Math.round(size * 0.34);
    const subSize = Math.round(size * 0.12);
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${lightPink}"/>
            <stop offset="100%" style="stop-color:${rose}"/>
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="${Math.round(size * 0.02)}" stdDeviation="${Math.round(size * 0.03)}" flood-color="#000" flood-opacity="0.18"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" rx="${rx}" fill="url(#bg)"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.28}" fill="${yellow}" filter="url(#shadow)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          font-size="${fontSize}" font-weight="800" fill="${black}">
          K
        </text>
        <text x="50%" y="${Math.round(size * 0.76)}" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          font-size="${subSize}" font-weight="700" fill="rgba(255,255,255,0.92)">
          MEET
        </text>
      </svg>
    `;
    return sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  };

  const icon192 = await createIcon(192);
  const icon512 = await createIcon(512);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  console.log('Created public/icon-192.png and public/icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
