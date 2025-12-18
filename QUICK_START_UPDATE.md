# 🚀 Guide Rapide - Mise à Jour Automatique

## Configuration initiale (à faire une seule fois)

### 1. Créer un token GitHub

1. Allez sur https://github.com/settings/tokens
2. Cliquez sur "Generate new token" → "Generate new token (classic)"
3. Cochez la permission `repo`
4. Générez et copiez le token

### 2. Configurer le token

**PowerShell (permanent) :**
```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'votre_token_ici', 'User')
```

Puis **redémarrez PowerShell**.

### 3. Modifier package.json

Remplacez dans `package.json` ligne 33 :
```json
"owner": "votre-username-github",
```

## Publier une nouvelle version

### Étape 1 : Modifier la version
Dans `package.json`, ligne 3 :
```json
"version": "0.0.9"
```

### Étape 2 : Publier
```bash
npm run publish
```

C'est tout ! 🎉

## Vérifier que ça fonctionne

1. La commande doit créer une release sur GitHub
2. Les fichiers `.exe` et `latest.yml` doivent être uploadés
3. Au prochain démarrage de l'app, les utilisateurs verront la notification

## En cas de problème

### "GH_TOKEN not set"
```powershell
# Vérifier si le token est défini
$env:GH_TOKEN

# Si vide, le redéfinir et redémarrer PowerShell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'votre_token', 'User')
```

### "Cannot find repository"
Vérifiez dans `package.json` que :
- `owner` correspond à votre username GitHub
- `repo` correspond au nom de votre repository
- Le repository existe sur GitHub

### La mise à jour ne s'affiche pas
- Assurez-vous que la nouvelle version est **supérieure** à l'ancienne
- Vérifiez que la release est bien publiée sur GitHub
- L'app doit être en mode production (pas `npm start`)

## Workflow recommandé

1. Développer et tester avec `npm start`
2. Incrémenter la version dans `package.json`
3. Lancer `npm run publish`
4. Vérifier la release sur GitHub
5. Tester l'installation sur une autre machine

## Notes importantes

- ✅ Les mises à jour sont **automatiques** pour les utilisateurs
- ✅ L'utilisateur peut choisir **quand installer**
- ✅ La progression du téléchargement est **visible**
- ✅ L'installation se fait **en un clic**
- ⚠️ Ne commitez **jamais** votre token GitHub dans le code
