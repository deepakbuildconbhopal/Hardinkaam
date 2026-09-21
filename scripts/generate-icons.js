import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const iconSvgPath = path.resolve('public/icon.svg');
const maskableSvgPath = path.resolve('public/icon-maskable.svg');
const publicDir = path.resolve('public');

async function generateIcons() {
  console.log('Generating PWA icons with sharp...');
  const iconSvg = fs.readFileSync(iconSvgPath);
  const maskableSvg = fs.readFileSync(maskableSvgPath);

  // 1. 192x192 standard icon
  await sharp(iconSvg)
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 2. 512x512 standard icon
  await sharp(iconSvg)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 3. 512x512 maskable icon
  await sharp(maskableSvg)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  // 4. 180x180 Apple touch icon
  await sharp(iconSvg)
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. 32x32 favicon.png / ico fallback
  await sharp(iconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created favicon-32x32.png');

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
