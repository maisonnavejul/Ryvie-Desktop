# Système de Mise à Jour Automatique - Ryvie Desktop

## 📦 Configuration

Le système de mise à jour automatique est maintenant configuré avec **electron-updater** et utilise GitHub Releases pour distribuer les mises à jour.

## 🔧 Configuration requise

### 1. Mettre à jour le package.json

Dans `package.json`, vous devez modifier la section `publish` avec vos informations GitHub :

```json
"publish": {
  "provider": "github",
  "owner": "votre-username",
  "repo": "Ryvie-Desktop"
}
```

Remplacez `votre-username` par votre nom d'utilisateur GitHub.

### 2. Créer un token GitHub

Pour publier les releases, vous avez besoin d'un token GitHub :

1. Allez sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Créez un nouveau token avec les permissions :
   - `repo` (accès complet)
3. Copiez le token généré

### 3. Configurer la variable d'environnement

Ajoutez le token à vos variables d'environnement :

**Windows (PowerShell) :**
```powershell
$env:GH_TOKEN="votre_token_github"
```

**Ou de manière permanente :**
```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'votre_token_github', 'User')
```

## 🚀 Publier une nouvelle version

### 1. Mettre à jour la version

Modifiez le numéro de version dans `package.json` :
```json
"version": "0.0.9"
```

### 2. Créer le build et publier

```bash
npm run build:win
```

Puis publiez sur GitHub :
```bash
npx electron-builder --win --publish always
```

Ou en une seule commande :
```bash
npx electron-builder --win --publish always
```

### Options de publication :
- `--publish always` : Publie toujours sur GitHub
- `--publish never` : Ne publie jamais (build local uniquement)
- `--publish onTag` : Publie uniquement si c'est un tag Git

## 📱 Fonctionnement pour l'utilisateur

1. **Vérification automatique** : Au démarrage de l'application, une vérification des mises à jour est effectuée
2. **Notification** : Si une mise à jour est disponible, une modal s'affiche avec la nouvelle version
3. **Téléchargement** : L'utilisateur peut cliquer sur "Télécharger" pour lancer le téléchargement
4. **Progression** : Une barre de progression affiche l'avancement du téléchargement
5. **Installation** : Une fois téléchargée, l'utilisateur peut cliquer sur "Installer et redémarrer"
6. **Redémarrage** : L'application se ferme, installe la mise à jour, et redémarre automatiquement

## 🔍 Logs

Les logs de mise à jour sont stockés dans :
- **Windows** : `%USERPROFILE%\AppData\Roaming\ryvie-desktop\logs\`

## 🛠️ Commandes utiles

### Build local (sans publier)
```bash
npm run build:win
```

### Build et publier sur GitHub
```bash
npx electron-builder --win --publish always
```

### Tester en mode développement
```bash
npm start
```

Note : En mode développement, la vérification des mises à jour est désactivée.

## 📝 Structure des fichiers de mise à jour

Après le build, les fichiers suivants sont créés dans le dossier `dist/` :

- `Ryvie Setup X.X.X.exe` : Installateur NSIS
- `latest.yml` : Fichier de métadonnées pour electron-updater
- `*.blockmap` : Fichiers pour les mises à jour différentielles

## ⚠️ Important

1. **Signature de code** : Pour Windows, il est recommandé de signer votre application avec un certificat de signature de code pour éviter les avertissements de sécurité
2. **Versions** : Utilisez toujours le versioning sémantique (ex: 0.0.9, 0.1.0, 1.0.0)
3. **Release Notes** : Ajoutez des notes de version dans vos releases GitHub pour informer les utilisateurs des changements

## 🔐 Sécurité

- Ne commitez JAMAIS votre token GitHub dans le code
- Utilisez toujours des variables d'environnement pour les tokens
- Activez la signature de code pour les builds de production

## 🐛 Dépannage

### La mise à jour ne se déclenche pas
- Vérifiez que l'application est en mode production (pas `npm start`)
- Vérifiez les logs dans le dossier AppData
- Assurez-vous que la version sur GitHub est supérieure à la version actuelle

### Erreur de publication
- Vérifiez que le token GitHub est correctement configuré
- Vérifiez que le repo existe et que vous avez les droits
- Vérifiez la configuration `publish` dans package.json

## 📚 Ressources

- [Documentation electron-updater](https://www.electron.build/auto-update)
- [Documentation electron-builder](https://www.electron.build/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
