const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1c2028"/>
      <stop offset="100%" stop-color="#0d0f12"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="60" y1="60" x2="452" y2="452" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ef233c"/>
      <stop offset="50%" stop-color="#d90429"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="110" fill="url(#bgGrad)" stroke="#262c37" stroke-width="6"/>

  <!-- Glowing Accent Border -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="url(#primaryGrad)" stroke-width="4" opacity="0.6"/>

  <!-- Inner Badge Frame -->
  <rect x="106" y="106" width="300" height="300" rx="60" fill="#15181e" stroke="#262c37" stroke-width="4"/>
  <rect x="110" y="110" width="292" height="292" rx="56" fill="none" stroke="url(#primaryGrad)" stroke-width="2" opacity="0.4"/>

  <!-- Logo Icon: Stylized Poultry / Automation Shield -->
  <g filter="url(#glow)">
    <path d="M256 150 C290 150 330 175 330 220 C330 270 280 305 256 325 C232 305 182 270 182 220 C182 175 222 150 256 150 Z" 
          fill="url(#primaryGrad)"/>
    <circle cx="256" cy="220" r="28" fill="#15181e"/>
    <circle cx="256" cy="220" r="14" fill="#ffffff"/>
  </g>

  <!-- Text "IVO" -->
  <text x="256" y="375" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="44" fill="#ffffff" letter-spacing="6">IVO</text>
</svg>
`;

async function main() {
    const electronDir = path.join(__dirname, '..', 'electron');
    const buildDir = path.join(__dirname, '..', 'build');

    if (!fs.existsSync(electronDir)) fs.mkdirSync(electronDir, { recursive: true });
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

    const iconBuffer = await sharp(Buffer.from(svgIcon))
        .resize(512, 512)
        .png()
        .toBuffer();

    fs.writeFileSync(path.join(electronDir, 'icon.png'), iconBuffer);
    fs.writeFileSync(path.join(buildDir, 'icon.png'), iconBuffer);
    console.log('✅ App icons generated successfully at electron/icon.png and build/icon.png');
}

main().catch((err) => {
    console.error('Failed to generate icons:', err);
});
