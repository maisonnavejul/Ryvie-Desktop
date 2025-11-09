# Ryvie Desktop

Application desktop Electron pour Ryvie avec détection automatique de connexion locale/publique.

## Fonctionnalités

- **Détection automatique** : L'application détecte si Ryvie est accessible en local (`http://ryvie.local:3002`)
- **Basculement automatique** : Si la connexion locale échoue, l'application bascule vers l'adresse publique
- **Gestion des changements d'ID** : Avertissement si un nouveau serveur Ryvie local est détecté
- **Stockage persistant** : Sauvegarde de la configuration pour les prochaines utilisations

## Installation

1. Installer les dépendances :
```bash
npm install
```

## Développement

Lancer l'application en mode développement :
```bash
npm start
```

## Build

Générer l'exécutable Windows (.exe) :
```bash
npm run build:win
```

L'exécutable sera généré dans le dossier `dist/`.

## Utilisation

1. **Première connexion** : L'application tente de se connecter à `http://ryvie.local:3002/api/settings/ryvie-domains`
2. **Connexion locale réussie** : Le bouton "Ouvrir Ryvie" ouvre `http://ryvie.local:3000`
3. **Connexion locale échouée** : Le bouton redirige vers l'adresse publique (ex: `https://app-ybeouuow.ryvie.fr`)
4. **Changement d'ID détecté** : Un message d'avertissement s'affiche pour confirmer la connexion au nouveau serveur

## Structure du projet

- `main.js` : Processus principal Electron
- `preload.js` : Script de préchargement pour la communication IPC
- `renderer.js` : Logique de l'interface utilisateur
- `index.html` : Interface HTML
- `styles.css` : Styles CSS
- `package.json` : Configuration du projet et dépendances

## Technologies

- **Electron** : Framework pour applications desktop
- **Node.js** : Runtime JavaScript
- **electron-builder** : Outil de build pour générer les exécutables