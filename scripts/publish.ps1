# Script de publication pour Ryvie Desktop
# Usage: .\scripts\publish.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Publication Ryvie Desktop" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que GH_TOKEN est défini
if (-not $env:GH_TOKEN) {
    Write-Host "ERREUR: La variable d'environnement GH_TOKEN n'est pas définie!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pour la définir temporairement:" -ForegroundColor Yellow
    Write-Host '  $env:GH_TOKEN="votre_token_github"' -ForegroundColor White
    Write-Host ""
    Write-Host "Pour la définir de manière permanente:" -ForegroundColor Yellow
    Write-Host '  [System.Environment]::SetEnvironmentVariable("GH_TOKEN", "votre_token_github", "User")' -ForegroundColor White
    Write-Host ""
    exit 1
}

# Lire la version actuelle
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Host "Version actuelle: $currentVersion" -ForegroundColor Green
Write-Host ""

# Demander confirmation
$confirmation = Read-Host "Voulez-vous publier la version $currentVersion sur GitHub? (o/n)"
if ($confirmation -ne 'o' -and $confirmation -ne 'O') {
    Write-Host "Publication annulée." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Génération des icônes..." -ForegroundColor Cyan
npm run icons:win

Write-Host ""
Write-Host "Build et publication en cours..." -ForegroundColor Cyan
Write-Host ""

# Build et publication
npx electron-builder --win --publish always

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "  Publication réussie!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "La version $currentVersion a été publiée sur GitHub." -ForegroundColor Green
    Write-Host "Les utilisateurs recevront automatiquement la notification de mise à jour." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Red
    Write-Host "  Erreur lors de la publication" -ForegroundColor Red
    Write-Host "==================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "  - Que le token GitHub est valide" -ForegroundColor White
    Write-Host "  - Que le repo existe et que vous avez les droits" -ForegroundColor White
    Write-Host "  - La configuration 'publish' dans package.json" -ForegroundColor White
    Write-Host ""
    exit 1
}
