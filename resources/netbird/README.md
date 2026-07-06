# Binaire NetBird embarqué

Ce dossier est empaqueté dans l'application via `extraResources` (voir `package.json` →
`build.extraResources`). En production il se retrouve dans `<resources>/netbird/`, et en
développement l'app le cherche dans `resources/netbird/` (voir `getBundledNetbirdPath()`
dans `src/main/main.js`).

## Ce qu'il faut déposer ici

- **Windows** : `netbird.exe` (binaire client NetBird officiel).
  - Optionnel : `wintun.dll` si la version du binaire ne l'embarque pas déjà.

Tant qu'aucun binaire n'est présent ici, l'app retombe automatiquement sur l'ancien
comportement (téléchargement + installation du MSI officiel). Le fait de déposer
`netbird.exe` active le mode « embarqué » :

1. `installNetbird()` enregistre et démarre le **service Windows NetBird** depuis ce
   binaire (une seule élévation UAC), au lieu de télécharger le MSI.
2. `isNetbirdInstalled()` considère NetBird « installé » quand le **service** est
   enregistré (le binaire, lui, est toujours présent puisqu'embarqué).

## À tester sur une vraie machine Windows

- Premier setup : élévation UAC → `netbird service install` + `service start` → `netbird up`.
- Reconnexion / déconnexion / statut.
- Build packagé (`npm run build:win`) : vérifier que le binaire arrive bien dans
  `resources/netbird/` de l'app installée.

## Licence

Le binaire NetBird n'est PAS versionné dans le dépôt. Vérifier les conditions de
redistribution de NetBird (et de Wintun sur Windows) avant de le livrer, et inclure les
mentions de licence requises dans l'app.
