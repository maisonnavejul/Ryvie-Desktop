<p align="center">
  <img src="ryvielogo0.png" alt="Logo Ryvie" width="140" />
</p>

# Ryvie Connect

Application Electron pour lancer Ryvie avec détection automatique de la disponibilité locale/publique, et accès distant sécurisé via un tunnel NetBird embarqué.

## Fonctionnalités

- **Détection automatique** : teste l'API locale `http://ryvie.local:3002` (machine-id / domaines).
- **Basculement local ↔ distant** : si la connexion locale échoue, bascule vers l'URL publique (domaine `app`) ou le tunnel.
- **Tunnel intégré** : configure NetBird automatiquement à partir de la clé fournie par le serveur Ryvie (accès distant sans configuration manuelle).
- **Multi-profils** : gestion de plusieurs Ryvie (ajout, renommage, suppression, bascule).
- **Interface single-page** : login et écran connecté dans un seul document, transitions fluides sans rechargement.
- **Mises à jour automatiques** : via GitHub Releases (electron-updater).
- **Stockage persistant** : sauvegarde des profils et de la configuration utilisateur.

## Prérequis

- Node.js 18+ recommandé
- Windows, macOS ou Linux (builds configurés pour les 3 plateformes)

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
| `npm run fetch:netbird` | Télécharge le binaire NetBird + Wintun (Windows) dans `resources/netbird/`. |
| `npm run icons:win` | Génère l'icône Windows (`.ico`) à partir du SVG avec fond blanc arrondi. |
| `npm run icons:mac` | Génère les icônes macOS (`.icns` et PNG pour Linux). |
| `npm run icons:all` | Génère toutes les icônes (Windows + macOS/Linux). |
| `npm run build:win` | Build Windows (lance `fetch:netbird` puis produit `.exe`). |
| `npm run build:mac` | Build macOS (génère `.dmg` et `.zip`). |
| `npm run build:linux` | Build Linux (génère `.AppImage` et `.deb`). |
| `npm run build:all` | Build pour toutes les plateformes (lance `fetch:netbird`, nécessite l'OS correspondant). |
| `npm run publish` | Publie les builds sur GitHub Releases. |

Les installeurs sont produits dans `dist/`.

> ⚠️ **Important** : vous ne pouvez builder que pour votre OS actuel en local. Pour builder les 3 plateformes, utilisez GitHub Actions (voir plus bas).

## Architecture single-page

L'app charge **un seul document** ([src/renderer/index.html](src/renderer/index.html)) qui contient deux vues :

- `#login-view` — sélection de profil / connexion (logique dans [login.js](src/renderer/login.js))
- `#app-view` — écran connecté, statut, ouverture de Ryvie, déconnexion (logique dans [renderer.js](src/renderer/renderer.js))

Un petit routeur ([app.js](src/renderer/app.js)) bascule entre les vues (`window.Ryvie.showLogin()` / `showApp()`) avec des transitions CSS, **sans jamais recharger la page** → plus de flash blanc entre les écrans.

> Comme le DOM persiste entre les vues, l'état d'un écran doit être réinitialisé dans son `init()` (`checkConnection` pour la vue connectée, `bootLogin` pour la vue login).

## Tunnel NetBird embarqué

L'accès distant repose sur [NetBird](https://netbird.io) (tunnel WireGuard). Le binaire est **embarqué dans l'app** : l'utilisateur n'a rien à installer séparément.

- **Version épinglée** : unique source dans [netbird-version.json](netbird-version.json), lue à la fois par le script de build et par le process principal.
- **Récupération au build** : `fetch:netbird` télécharge `netbird.exe` (x64 + arm64) depuis les releases NetBird **et** `wintun.dll` depuis wintun.net, dans `resources/netbird/<arch>/`. Ces binaires ne sont **pas** versionnés dans git (`.gitignore`).
- **Embarquement** : `build.extraResources` copie `resources/netbird/` dans l'app.
- **Déploiement (Windows)** : au premier setup, le binaire est copié dans un emplacement stable `C:\ProgramData\Ryvie\netbird\`, et le **service Windows** NetBird tourne depuis cette copie (1 élévation UAC). Ainsi une mise à jour de l'app ne verrouille jamais le binaire.
- **Fallback** : si aucun binaire n'est présent dans `resources/netbird/`, l'app retombe automatiquement sur l'installation du **MSI officiel** NetBird.

### Mettre à jour la version de NetBird

1. Éditer le numéro dans [netbird-version.json](netbird-version.json) (doit être un tag de release NetBird existant).
2. Bump `version` dans `package.json` (requis pour que la mise à jour atteigne les utilisateurs).
3. `npm run publish` (le build relance `fetch:netbird` et ré-embarque le binaire).

Au prochain lancement après la MAJ de l'app, si la version NetBird a changé, l'app met à jour la copie déployée (1 UAC). Une MAJ app qui ne change **pas** NetBird ne demande **aucune** élévation.

## Utilisation

1. Au démarrage : splash, puis vue login (ou directement l'écran connecté si un profil existe).
2. L'app teste l'API locale `http://ryvie.local:3002` puis, si besoin, configure/utilise le tunnel NetBird.
3. Le bouton « Ouvrir Ryvie » ouvre :
   - **En local** : `http://ryvie.local` dans le navigateur par défaut.
   - **Sinon** : l'URL publique renvoyée par l'API (ex : `https://app-xxxxx.ryvie.fr`) ou le tunnel.
4. Si un nouvel ID Ryvie local est détecté, une confirmation est demandée.

## Configuration

- Config utilisateur : `%AppData%/Ryvie Connect/ryvie-config.json` (+ `ryvie-users.json`, `ryvie-current-user.json`)
- Binaire NetBird déployé (Windows) : `C:\ProgramData\Ryvie\netbird\`
- Icône app/raccourci : `build/icons/win/icon.ico`
- URLs par défaut :
  - API locale : `http://ryvie.local:3002`
  - App locale : `http://ryvie.local`
  - Management NetBird : `https://netbird.ryvie.fr`

## Icônes multi-plateformes (coins arrondis)

- **Source** : `ryvielogo0.svg`
- **Style** : fond blanc avec coins arrondis façon iOS

### Windows
- Script : `npm run icons:win`
- Tailles : 16, 24, 32, 48, 64, 128, 256 px
- Sortie : `build/icons/win/icon.ico`

### macOS
- Script : `npm run icons:mac`
- Tailles : 16@1x/2x, 32@1x/2x, 128@1x/2x, 256@1x/2x, 512@1x/2x
- Sortie : `build/icons/mac/icon.icns` (+ `.iconset/`)

### Linux
- Généré automatiquement avec `npm run icons:mac`
- Tailles PNG : 16, 32, 64, 128, 256, 512, 1024 px
- Sortie : `build/icons/mac/png/`

> ⚠️ Réexécuter `npm run icons:all` avant chaque build si le SVG évolue.

## Builds automatiques avec GitHub Actions

Un workflow (`.github/workflows/build.yml`) builde automatiquement sur les 3 plateformes.

**📱 macOS :** l'app est **signée et notarisée** avec un certificat Developer ID. Voir [MACOS_SIGNING.md](MACOS_SIGNING.md).

### Déclenchement

**Tag de version (recommandé)**
```bash
git tag v0.0.33
git push origin v0.0.33
```
→ Build automatique + création d'une release GitHub avec tous les installeurs.

**Déclenchement manuel** : onglet « Actions » → « Build & Release » → « Run workflow ».

### Résultats

- **Windows** : `Ryvie-Setup-x.x.x.exe` + fichiers de mise à jour
- **macOS** : `.dmg` + `.zip` + fichiers de mise à jour
- **Linux** : `.AppImage` + `.deb`

## Mises à jour automatiques (Electron Updater)

1. **Incrémenter `version`** dans `package.json` avant chaque publication.
2. **Créer un tag** puis pousser (déclenche GitHub Actions).
3. **L'app** vérifie les mises à jour au démarrage et télécharge la release depuis la cible `publish` (`package.json`).

> **Note** : mises à jour auto sur Windows et macOS. Sur Linux, l'utilisateur télécharge manuellement la nouvelle version.
>
> La cible de publication (`build.publish`) doit rester stable : une app installée cherche ses mises à jour sur le dépôt gravé dans son build. Voir les remarques sur la migration de dépôt avant de changer `owner`/`repo`.

## Structure du projet

- `src/main/main.js` — processus principal Electron (fenêtres, updater, NetBird, IPC)
- `src/main/preload.js` — pont IPC (contextBridge)
- `src/renderer/index.html` — page unique (vues login + connecté)
- `src/renderer/app.js` — routeur single-page (bascule des vues)
- `src/renderer/login.js` — logique de la vue login / profils
- `src/renderer/renderer.js` — logique de la vue connectée
- `src/renderer/styles.css` — styles
- `src/renderer/splash.html` — splash screen
- `netbird-version.json` — version NetBird épinglée (source unique)
- `scripts/fetch-netbird.js` — téléchargement NetBird + Wintun au build
- `resources/netbird/` — binaires embarqués (non versionnés)
- `THIRD_PARTY_NOTICES.txt` — licences des composants tiers (NetBird, Wintun)
- `package.json` — scripts, dépendances, config electron-builder

## Technologies

- Electron
- Node.js
- electron-builder / electron-updater
- NetBird (tunnel WireGuard) + Wintun (Windows)

## Licences tierces

Voir [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) : NetBird (client) est sous BSD-3-Clause, Wintun sous ses propres conditions. Ces mentions sont livrées avec l'application.

## Dépannage

### macOS : installation
L'application est **signée et notarisée**. En cas de message de sécurité, voir [MACOS_SIGNING.md](MACOS_SIGNING.md#dépannage).

### NetBird / accès distant (Windows)
- Vérifier le service : `sc query NetBird` (doit être `RUNNING`).
- Vérifier le binaire déployé : `C:\ProgramData\Ryvie\netbird\` doit contenir `netbird.exe`, `wintun.dll`, `version.txt`.
- Erreur « Unable to load wintun.dll » : `wintun.dll` doit être à côté de `netbird.exe` (géré par le déploiement).
- Réinitialiser pour retester l'install (PowerShell admin) :
  ```powershell
  & "C:\ProgramData\Ryvie\netbird\netbird.exe" service stop
  & "C:\ProgramData\Ryvie\netbird\netbird.exe" service uninstall
  Remove-Item -Recurse -Force "C:\ProgramData\Ryvie\netbird"
  ```

### Autres problèmes
- Si `ryvie.local` n'est pas résolu : vérifier DNS local/hosts ou la disponibilité du serveur.
- Si rien ne s'ouvre : lancer depuis un terminal et vérifier la console.
- Pour forcer l'ouverture locale : vérifier que l'API locale répond avec `success: true` et fournit `domains`.
