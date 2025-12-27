# Documentation : Signature et Notarisation macOS

Ce document explique comment l'application Ryvie Desktop est signée et notarisée pour macOS afin d'éviter les avertissements de sécurité lors de l'installation.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Configuration initiale](#configuration-initiale)
- [Secrets GitHub](#secrets-github)
- [Fonctionnement](#fonctionnement)
- [Dépannage](#dépannage)

---

## Prérequis

### Compte Apple Developer

- **Compte Apple Developer payant** (99$/an)
- Accès à [developer.apple.com](https://developer.apple.com)

### Certificats requis

- **Developer ID Application** : pour signer l'app hors Mac App Store
- Certificat installé dans le Trousseau d'accès macOS

---

## Configuration initiale

### 1. Créer le certificat Developer ID Application

1. Va sur [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
2. Clique sur **+** pour créer un nouveau certificat
3. Sélectionne **Developer ID Application** (section Software)
4. Choisis **G2 Sub-CA (Xcode 11.4.1 ou plus récent)**
5. Génère une CSR (Certificate Signing Request) :
   - Ouvre **Trousseau d'accès** → menu **Trousseau d'accès** → **Assistant de certification** → **Demander un certificat à une autorité de certification**
   - Entre ton email Apple Developer et un nom (ex: "Ryvie Developer ID")
   - Coche **"Enregistrer sur le disque"**
   - Sauvegarde le fichier `.certSigningRequest`
6. Upload la CSR sur le portail Apple
7. Télécharge le certificat `.cer` généré
8. Double-clique dessus pour l'installer dans le Trousseau

### 2. Vérifier le certificat installé

```bash
security find-identity -v -p codesigning
```

Tu devrais voir une ligne comme :
```
2) FABEBDF6C9B9613A0840EBB98622FA2A456FCE79 "Developer ID Application: Jules Maisonnave (GW9M6A3925)"
```

### 3. Exporter le certificat pour GitHub Actions

1. Ouvre **Trousseau d'accès**
2. Dans **Mes certificats**, trouve **"Developer ID Application: ..."**
3. Clic droit → **Exporter "Developer ID Application: ..."**
4. Format : **Certificat d'échange de données personnelles (.p12)**
5. Sauvegarde (ex: `~/Desktop/DeveloperID.p12`)
6. Entre un **mot de passe** (note-le bien)

### 4. Convertir le certificat en base64

```bash
base64 -i ~/Desktop/DeveloperID.p12 -o ~/Desktop/certificate_base64.txt
```

Le fichier `certificate_base64.txt` contient le certificat encodé en base64.

### 5. Créer un mot de passe d'app spécifique

Pour la notarisation Apple :

1. Va sur [appleid.apple.com](https://appleid.apple.com)
2. Connecte-toi avec ton Apple ID
3. Section **Sécurité** → **Mots de passe d'app**
4. Clique sur **Générer un mot de passe d'app**
5. Nom : "Ryvie Notarization"
6. **Copie le mot de passe** (format: `xxxx-xxxx-xxxx-xxxx`)

---

## Secrets GitHub

Va sur ton repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Ajoute ces **5 secrets** :

| Nom du secret | Valeur | Description |
|---------------|--------|-------------|
| `MACOS_CERTIFICATE` | Contenu du fichier `certificate_base64.txt` | Certificat Developer ID en base64 |
| `MACOS_CERTIFICATE_PWD` | Mot de passe du .p12 | Mot de passe utilisé lors de l'export |
| `APPLE_ID` | Ton email Apple ID | Email du compte Apple Developer |
| `APPLE_APP_PASSWORD` | Mot de passe d'app spécifique | Généré sur appleid.apple.com |
| `APPLE_TEAM_ID` | `GW9M6A3925` | Team ID Apple Developer |

---

## Fonctionnement

### Configuration dans `package.json`

```json
"mac": {
  "target": ["dmg", "zip"],
  "icon": "build/icons/mac/icon.icns",
  "category": "public.app-category.productivity",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist",
  "identity": "Jules Maisonnave (GW9M6A3925)",
  "notarize": {
    "teamId": "GW9M6A3925"
  }
}
```

### Fichier `build/entitlements.mac.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
  </dict>
</plist>
```

Ces entitlements sont nécessaires pour Electron avec `hardenedRuntime`.

### Workflow GitHub Actions

Le workflow `.github/workflows/build.yml` :

1. **Importe le certificat** dans le keychain temporaire
2. **Build l'app** avec electron-builder
3. **Signe l'app** avec le certificat Developer ID
4. **Notarise l'app** auprès d'Apple (vérifie qu'il n'y a pas de malware)
5. **Crée le DMG** signé et notarisé

```yaml
- name: Import Code-Signing Certificates for macOS
  if: matrix.os == 'macos-latest'
  uses: apple-actions/import-codesign-certs@v2
  with:
    p12-file-base64: ${{ secrets.MACOS_CERTIFICATE }}
    p12-password: ${{ secrets.MACOS_CERTIFICATE_PWD }}

- name: Build macOS
  if: matrix.os == 'macos-latest'
  run: npm run build:mac
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

---

## Processus de release

### 1. Mettre à jour la version

Dans `package.json` :
```json
"version": "0.0.23"
```

### 2. Créer un tag et push

```bash
git add .
git commit -m "Release v0.0.23"
git push
git tag v0.0.23
git push origin v0.0.23
```

### 3. GitHub Actions

Le workflow se déclenche automatiquement et :
- Build pour Windows, macOS et Linux
- Signe et notarise l'app macOS
- Crée une GitHub Release avec tous les installeurs

### 4. Temps de build

- **Signature** : ~30 secondes
- **Notarisation** : 2-5 minutes (Apple analyse l'app)
- **Total macOS** : ~6-8 minutes

---

## Dépannage

### Erreur : "cannot read entitlement data"

**Cause :** Le fichier `build/entitlements.mac.plist` est manquant ou invalide.

**Solution :**
```bash
git add -f build/entitlements.mac.plist
git commit -m "Add entitlements file"
git push
```

### Erreur : "Please remove prefix 'Developer ID Application:'"

**Cause :** L'identité dans `package.json` contient le préfixe complet.

**Solution :** Utilise uniquement le nom sans préfixe :
```json
"identity": "Jules Maisonnave (GW9M6A3925)"
```

### Erreur : "APPLE_APP_SPECIFIC_PASSWORD env var needs to be set"

**Cause :** Le nom de la variable d'environnement est incorrect.

**Solution :** Dans `.github/workflows/build.yml`, utilise :
```yaml
APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
```

### Erreur : "Notarization failed"

**Causes possibles :**
- Mot de passe d'app incorrect
- Apple ID incorrect
- Team ID incorrect
- L'app contient du code non signé

**Solution :**
1. Vérifie que tous les secrets GitHub sont corrects
2. Vérifie les logs de notarization dans GitHub Actions
3. Consulte [developer.apple.com](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

### L'app est signée mais pas notarisée

**Symptôme :** Message "Apple n'a pas pu confirmer que « Ryvie » ne contient pas de logiciel malveillant"

**Solution :** Vérifie que :
- `notarize.teamId` est configuré dans `package.json`
- Les variables d'environnement `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` et `APPLE_TEAM_ID` sont définies
- Le build GitHub Actions montre "notarizing" dans les logs

---

## Vérification locale

### Vérifier la signature

```bash
codesign -dv --verbose=4 /Applications/Ryvie.app
```

Tu devrais voir :
```
Authority=Developer ID Application: Jules Maisonnave (GW9M6A3925)
```

### Vérifier la notarisation

```bash
spctl -a -vv /Applications/Ryvie.app
```

Tu devrais voir :
```
/Applications/Ryvie.app: accepted
source=Notarized Developer ID
```

---

## Ressources

- [Apple Developer - Code Signing](https://developer.apple.com/support/code-signing/)
- [Apple Developer - Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder - Code Signing](https://www.electron.build/code-signing)
- [electron-builder - Notarization](https://www.electron.build/configuration/mac#notarization)

---

## Notes importantes

- **Certificat valide 5 ans** : Renouvelle-le avant expiration
- **Mot de passe d'app** : Peut être révoqué et recréé à tout moment
- **Notarization gratuite** : Incluse dans le compte Apple Developer
- **Builds locaux** : Peuvent être signés mais pas notarisés sans les credentials Apple
