const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const srcSvg = path.join(projectRoot, 'ryvielogo0.svg');
  const outDir = path.join(projectRoot, 'build', 'icons', 'mac');
  const tmpPngDir = path.join(outDir, 'png');
  const outIconset = path.join(outDir, 'icon.iconset');
  const outIcns = path.join(outDir, 'icon.icns');

  if (!fs.existsSync(srcSvg)) {
    console.error(`❌ SVG introuvable: ${srcSvg}`);
    process.exit(1);
  }

  fs.mkdirSync(outIconset, { recursive: true });
  fs.mkdirSync(tmpPngDir, { recursive: true });

  // Tailles macOS standard (avec versions @2x pour Retina)
  const sizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ];

  console.log('🍎 Génération des icônes macOS avec fond blanc aux coins arrondis...\n');

  const renderOne = async (size, filename) => {
    const pngPath = path.join(outIconset, filename);
    
    const margin = Math.max(1, Math.round(size * 0.00));
    const logoSize = size - (margin * 2);
    const radius = Math.round(size * 0.22);

    try {
      const svgBuffer = fs.readFileSync(srcSvg);
      
      const highResSvg = await sharp(svgBuffer, { density: 700 })
        .resize(logoSize * 4, logoSize * 4, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      const finalLogo = await sharp(highResSvg)
        .resize(logoSize, logoSize, {
          kernel: 'lanczos3',
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      const base = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      const roundedRectSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">\n` +
        `  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff"/>\n` +
        `</svg>`
      );

      await base
        .composite([
          { input: roundedRectSvg, left: 0, top: 0 },
          { input: finalLogo, left: margin, top: margin }
        ])
        .png({ compressionLevel: 9, quality: 100 })
        .toFile(pngPath);

      console.log(`✓ ${filename} (${size}x${size}px)`);
      
      // Copier aussi dans le dossier png pour Linux
      const linuxPngPath = path.join(tmpPngDir, `${size}x${size}.png`);
      fs.copyFileSync(pngPath, linuxPngPath);
      
      return pngPath;
    } catch (err) {
      console.error(`❌ Erreur pour ${filename}:`, err.message);
      throw err;
    }
  };

  try {
    // Générer toutes les tailles
    for (const { size, name } of sizes) {
      await renderOne(size, name);
    }

    console.log('\n📦 Création du fichier .icns...');
    
    // Vérifier si iconutil est disponible (macOS uniquement)
    if (process.platform === 'darwin') {
      try {
        execSync(`iconutil -c icns "${outIconset}" -o "${outIcns}"`, { stdio: 'inherit' });
        console.log(`✅ ICNS généré avec succès: ${outIcns}`);
      } catch (err) {
        console.error('❌ Erreur lors de la création du .icns avec iconutil');
        console.log('ℹ️  Le .iconset a été créé, mais le .icns nécessite macOS pour être généré.');
        console.log('ℹ️  Utilisez GitHub Actions ou un Mac pour créer le .icns final.');
      }
    } else {
      console.log('ℹ️  Vous êtes sur ' + process.platform + ', pas sur macOS.');
      console.log('ℹ️  Le dossier .iconset a été créé avec toutes les images PNG.');
      console.log('ℹ️  Le fichier .icns sera généré automatiquement par electron-builder sur macOS.');
      console.log('ℹ️  Ou utilisez GitHub Actions pour builder sur macOS.');
    }

    console.log(`\n✅ Icônes PNG générées dans: ${tmpPngDir}`);
    console.log(`📊 Tailles: 16, 32, 64, 128, 256, 512, 1024px (pour Linux)\n`);
    
  } catch (err) {
    console.error('\n❌ Erreur lors de la génération:', err.message);
    process.exit(1);
  }
})();
