const fs = require('fs');
const path = require('path');

// Dynamic imports for ES modules
const sharpPromise = import('sharp');
const pngToIcoPromise = import('png-to-ico');

(async () => {
  // Await the dynamic imports
  const sharpModule = await sharpPromise;
  const pngToIcoModule = await pngToIcoPromise;
  const { default: sharp } = sharpModule;
  const { default: pngToIco } = pngToIcoModule;
  const projectRoot = path.resolve(__dirname, '..');
  const srcSvg = path.join(projectRoot, 'ryvielogo0.svg');
  const outDir = path.join(projectRoot, 'build', 'icons', 'win');
  const tmpPngDir = path.join(outDir, 'png');
  const outIco = path.join(outDir, 'icon.ico');

  if (!fs.existsSync(srcSvg)) {
    console.error(`❌ SVG introuvable: ${srcSvg}`);
    process.exit(1);
  }

  fs.mkdirSync(tmpPngDir, { recursive: true });

  // Toutes les tailles standard Windows
  const sizes = [16, 24, 32, 48, 64, 128, 256];

  console.log('🎨 Génération des icônes avec fond blanc aux coins arrondis...\n');

  const renderOne = async (size) => {
    const pngPath = path.join(tmpPngDir, `icon-${size}.png`);
    
    // Marge encore plus petite pour agrandir le logo (4% mini 1px)
    const margin = Math.max(1, Math.round(size * 0.00));
    const logoSize = size - (margin * 2);
    // Rayon des coins à la iOS (~22% de la taille)
    const radius = Math.round(size * 0.22);

    try {
      // Lire le SVG
      const svgBuffer = fs.readFileSync(srcSvg);
      
      // Rasteriser le SVG à haute densité pour qualité maximale
      // Utiliser 4x la taille finale puis redimensionner avec interpolation de haute qualité
      const highResSvg = await sharp(svgBuffer, { density: 700 })
        .resize(logoSize * 4, logoSize * 4, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Redimensionner à la taille finale avec interpolation Lanczos3 (meilleure qualité)
      const finalLogo = await sharp(highResSvg)
        .resize(logoSize, logoSize, {
          kernel: 'lanczos3',
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Canvas transparent
      const base = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });

      // Rectangle blanc arrondi (coins iOS) en SVG pour une netteté parfaite
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

      console.log(`✓ ${size}x${size}px généré`);
      return pngPath;
    } catch (err) {
      console.error(`❌ Erreur pour ${size}px:`, err.message);
      throw err;
    }
  };

  try {
    const pngPaths = [];
    
    for (const size of sizes) {
      const pngPath = await renderOne(size);
      pngPaths.push(pngPath);
    }

    console.log('\n📦 Création du fichier .ico...');
    const icoBuffer = await pngToIco(pngPaths);
    fs.writeFileSync(outIco, icoBuffer);

    console.log(`✅ ICO généré avec succès: ${outIco}`);
    console.log(`📊 Tailles incluses: ${sizes.join(', ')}px\n`);
  } catch (err) {
    console.error('\n❌ Erreur lors de la génération:', err.message);
    process.exit(1);
  }
})();
