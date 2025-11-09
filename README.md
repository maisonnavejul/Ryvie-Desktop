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

## Build

Générer l'exécutable Windows (.exe):

```bash
npm run build:win
```

L'exécutable sera généré dans `dist/`.

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
- Icône: `ryvielogo0.png`
- URLs par défaut:
  - API locale: `http://ryvie.local:3002/api/settings/ryvie-domains`
  - App locale: `http://ryvie.local:3000`

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