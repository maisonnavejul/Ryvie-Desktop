<p align="center">
  <img src="ryvielogo0.png" alt="Logo Ryvie" width="140" />
</p>

# Ryvie Desktop

Application Electron pour lancer Ryvie avec détection automatique de la disponibilité locale/publique.

## Fonctionnalités

- **Détection automatique**: teste l'API locale `http://ryvie.local:3002/api/settings/ryvie-domains`.
- **Basculement**: si la connexion locale échoue, bascule vers l'URL publique fournie par l'API.
- **Gestion des changements d'ID**: avertit si un nouveau serveur local est détecté.
- **Stockage persistant**: sauvegarde la configuration utilisateur.

## Prérequis

- Node.js 18+ recommandé
- Windows (build configuré pour Windows)

## Installation

```bash
npm install
```

## Développement

```bash
npm start
```

## Build & scripts

| Commande | Description |
|----------|-------------|
| `npm start` | Lance l'application en mode développement. |
| `npm run icons:win` | Génère l'icône Windows (`build/icons/win/icon.ico`) à partir du SVG avec fond blanc arrondi. |
| `npm run build:win` | Génère l'installeur Windows (exécute d'abord `icons:win`). |

L'installeur (.exe) est produit dans `dist/`.

## Utilisation

1. Au démarrage, l'app affiche un splash, puis l'écran principal.
2. L'app teste l'API locale `http://ryvie.local:3002`.
3. Le bouton « Ouvrir Ryvie » ouvre:
   - **En local**: `http://ryvie.local:3000` dans le navigateur par défaut.
   - **Sinon**: l'URL publique renvoyée par l'API (ex: `https://app-xxxxx.ryvie.fr`).
4. Si un nouvel ID Ryvie local est détecté, une confirmation est demandée.

## Plein écran pour Ryvie Web

- **Dans le navigateur externe**: on ne peut pas forcer le plein écran depuis l'app (l'utilisateur peut activer F11 manuellement).
- **Intégré dans Electron (optionnel)**: charger Ryvie Web dans une fenêtre Electron en plein écran.

Étapes (option de base):

1) Dans `src/main/main.js`, dans `createMain`, remplacer le chargement de l'interface par l'URL:

```js
// Remplace:
// mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
// Par:
mainWindow.loadURL('http://ryvie.local:3000');
```

2) Activer le plein écran pour cette fenêtre:

```js
// Option A: à la création de la fenêtre
mainWindow = new BrowserWindow({
  fullscreen: true,
  // ...le reste de la config
});

// Option B: après ready-to-show
mainWindow.once('ready-to-show', () => {
  mainWindow.setFullScreen(true);
  mainWindow.show();
});

// Option C (kiosque): empêche de sortir facilement
// mainWindow = new BrowserWindow({ kiosk: true, ... })
```

Raccourcis utiles: `F11` (plein écran), `Esc` (sortie du plein écran, si kiosque désactivé).

## Configuration

- Fichier de config: `%AppData%/Ryvie Desktop/ryvie-config.json`
- Icône app/raccourci: `build/icons/win/icon.ico`
- URLs par défaut:
  - API locale: `http://ryvie.local:3002/api/settings/ryvie-domains`
  - App locale: `http://ryvie.local:3000`

## Icône style app (coins arrondis)

- Source: `ryvielogo0.svg`
- Script de génération: `npm run icons:win`
  - Tailles générées: 16, 24, 32, 48, 64, 128, 256 px
  - Fond blanc avec coins arrondis façon iOS
- Fichier de sortie: `build/icons/win/icon.ico`

> ⚠️ Réexécuter `npm run icons:win` avant chaque build si le SVG évolue.

## Mises à jour automatiques (Electron Updater)

1. **Hébergement des releases**: configurer la section `build.publish` (GitHub Releases, S3, serveur HTTPS, etc.).
2. **Incrémenter `version`** dans `package.json` avant chaque publication.
3. **Publier** avec:
   ```bash
   npm run build:win -- --publish always
   ```
   → Génère `Ryvie-Setup-x.x.x.exe`, `latest.yml`, `*.blockmap`.
4. **Code**: utiliser `electron-updater` dans `src/main/main.js` pour `autoUpdater.checkForUpdatesAndNotify()` et relayer les événements (`update_available`, `update_ready`, `update_error`) vers le renderer. Ajouter un handler IPC `autoUpdater.quitAndInstall()` côté main.
5. **UI**: dans `renderer.js`, afficher un message/bouton quand `update_ready` est reçu.

> Conseil: tester sur une VM (release « draft ») avant déploiement public. Prévoir la signature du binaire pour éviter les alertes SmartScreen.

## Structure du projet

- `src/main/main.js`: Processus principal Electron
- `src/main/preload.js`: Script de préchargement (IPC)
- `src/renderer/index.html`: Interface HTML
- `src/renderer/renderer.js`: Logique UI
- `src/renderer/styles.css`: Styles
- `src/renderer/splash.html`: Splash screen
- `package.json`: Scripts et dépendances

## Technologies

- Electron
- Node.js
- electron-builder

## Dépannage

- Si `ryvie.local` n'est pas résolu: vérifier DNS local/hosts ou la disponibilité du serveur.
- Si rien ne s'ouvre: lancer depuis un terminal et vérifier la console.
- Pour forcer l'ouverture locale: vérifiez que l'API locale répond avec `success: true` et fournit `domains`.