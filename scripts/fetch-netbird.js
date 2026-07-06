// Télécharge le binaire client NetBird ET le pilote Wintun (Windows) pour les embarquer
// dans l'app. netbird.exe a besoin de wintun.dll (à côté de lui) pour créer l'interface
// WireGuard ; l'archive client NetBird ne la contient pas, on la récupère depuis wintun.net.
//
// Résultat par architecture : resources/netbird/<arch>/{netbird.exe, wintun.dll}
// Copiés dans l'app au build via build.extraResources (voir package.json).
//
// Ces binaires NE sont PAS versionnés dans git (voir .gitignore) : on les récupère au build.
// Version NetBird épinglée dans netbird-version.json (source unique partagée avec main.js).
//
// Dépendances système : `curl` et `tar` (présents nativement sur Windows 10+, macOS et Linux).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Source unique de la version NetBird, partagée avec src/main/main.js
const NETBIRD_VERSION = require('../netbird-version.json').version;

// Wintun n'évolue plus depuis 0.14.1 ; version figée.
const WINTUN_VERSION = '0.14.1';

const ARCHES = [
  { arch: 'amd64', asset: `netbird_${NETBIRD_VERSION}_windows_amd64.tar.gz` },
  { arch: 'arm64', asset: `netbird_${NETBIRD_VERSION}_windows_arm64.tar.gz` },
];

const NETBIRD_BASE_URL = `https://github.com/netbirdio/netbird/releases/download/v${NETBIRD_VERSION}`;
const WINTUN_URL = `https://www.wintun.net/builds/wintun-${WINTUN_VERSION}.zip`;
const destRoot = path.join(__dirname, '..', 'resources', 'netbird');

// Sur Windows, on force le tar natif (bsdtar de System32) : le GNU tar de Git/MSYS
// interprète les chemins "C:\..." comme un hôte distant. bsdtar gère les chemins Windows
// et sait extraire aussi bien les .tar.gz que les .zip.
const IS_WIN = process.platform === 'win32';
const TAR = IS_WIN ? 'C:\\Windows\\System32\\tar.exe' : 'tar';
const fwd = (p) => p.replace(/\\/g, '/'); // slashes pour éviter l'échappement des backslashes

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

// 1) Binaire client NetBird par architecture
for (const { arch, asset } of ARCHES) {
  const url = `${NETBIRD_BASE_URL}/${asset}`;
  const tmp = path.join(os.tmpdir(), asset);
  const destDir = path.join(destRoot, arch);
  const exePath = path.join(destDir, 'netbird.exe');

  fs.mkdirSync(destDir, { recursive: true });

  console.log(`\n[fetch-netbird] ${arch} : téléchargement de ${asset}`);
  run(`curl -L --fail "${url}" -o "${fwd(tmp)}"`);

  console.log(`[fetch-netbird] ${arch} : extraction de netbird.exe -> ${destDir}`);
  run(`"${TAR}" -xzf "${fwd(tmp)}" -C "${fwd(destDir)}"`);
  try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }

  if (!fs.existsSync(exePath)) {
    console.error(`[fetch-netbird] ERREUR : netbird.exe introuvable après extraction pour ${arch}`);
    process.exit(1);
  }
  console.log(`[fetch-netbird] ${arch} : netbird.exe OK`);
}

// 2) Pilote Wintun (une seule archive contenant toutes les architectures)
console.log(`\n[fetch-netbird] Téléchargement de Wintun ${WINTUN_VERSION}`);
const wintunZip = path.join(os.tmpdir(), `wintun-${WINTUN_VERSION}.zip`);
const wintunDir = path.join(os.tmpdir(), `wintun-${WINTUN_VERSION}-extract`);
run(`curl -L --fail "${WINTUN_URL}" -o "${fwd(wintunZip)}"`);

fs.rmSync(wintunDir, { recursive: true, force: true });
fs.mkdirSync(wintunDir, { recursive: true });
run(`"${TAR}" -xf "${fwd(wintunZip)}" -C "${fwd(wintunDir)}"`);
try { fs.unlinkSync(wintunZip); } catch (e) { /* ignore */ }

for (const { arch } of ARCHES) {
  // structure de l'archive : wintun/bin/<arch>/wintun.dll
  const src = path.join(wintunDir, 'wintun', 'bin', arch, 'wintun.dll');
  const dst = path.join(destRoot, arch, 'wintun.dll');
  if (!fs.existsSync(src)) {
    console.error(`[fetch-netbird] ERREUR : wintun.dll introuvable pour ${arch} (${src})`);
    process.exit(1);
  }
  fs.copyFileSync(src, dst);
  console.log(`[fetch-netbird] ${arch} : wintun.dll OK`);
}
fs.rmSync(wintunDir, { recursive: true, force: true });

console.log(`\n[fetch-netbird] Terminé — NetBird v${NETBIRD_VERSION} + Wintun ${WINTUN_VERSION} prêts à être embarqués.`);
