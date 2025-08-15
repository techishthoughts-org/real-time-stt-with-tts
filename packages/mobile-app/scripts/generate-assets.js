const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
const iconSvg = path.join(assetsDir, 'icon.svg');

async function generateAssets() {
  try {
    console.log('Generating app assets...');

    // Read the SVG icon
    const svgBuffer = fs.readFileSync(iconSvg);

    // Generate icon.png (1024x1024)
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));

    // Generate splash.png (1242x2436)
    await sharp(svgBuffer)
      .resize(1242, 2436)
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));

    // Generate adaptive-icon.png (1024x1024)
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));

    // Generate favicon.png (32x32)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));

    console.log('✅ Assets generated successfully!');
    console.log('Generated files:');
    console.log('- icon.png (1024x1024)');
    console.log('- splash.png (1242x2436)');
    console.log('- adaptive-icon.png (1024x1024)');
    console.log('- favicon.png (32x32)');

  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

generateAssets();
