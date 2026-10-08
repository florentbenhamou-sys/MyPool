# =============================================================================
#  Démarrage du CRM (Windows) — Docker Compose
#
#   start.cmd            démarre (ou met à jour) l'application et ouvre le navigateur
#   start.cmd stop       arrête l'application (les données sont conservées)
#   start.cmd restart    redémarre
#   start.cmd status     état des conteneurs
#   start.cmd logs       journaux de l'application (Ctrl+C pour quitter)
#   start.cmd demo       ajoute les données de DÉMONSTRATION (seulement si la base est vide)
#   start.cmd backup     sauvegarde la base + les pièces jointes dans .\backups
#   start.cmd check      vérifie seulement que Docker est installé et démarré
#
#  Si Docker est absent, le script propose de l'installer (winget) ;
#  s'il est arrêté, il lance Docker Desktop et attend qu'il soit prêt.
#  Au premier lancement, le fichier .env est créé à partir de .env.example
#  avec un mot de passe PostgreSQL aléatoire.
# =============================================================================
param([string]$Command = "start")

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Info($m) { Write-Host "> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "OK $m" -ForegroundColor Green }
function Fail($m) { Write-Host "ERREUR $m" -ForegroundColor Red; exit 1 }

function Invoke-Native([scriptblock]$Block, [string]$ErrorMessage) {
  & $Block
  if ($LASTEXITCODE -ne 0) { Fail $ErrorMessage }
}

function Get-EnvValue($Name) {
  if (-not (Test-Path .env)) { return $null }
  $line = Get-Content .env | Where-Object { $_ -match "^$Name=" } | Select-Object -Last 1
  if ($line) { return ($line -replace "^$Name=", "").Trim('"') }
  return $null
}

$DockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"

function Confirm-Choice($Question) {
  $answer = Read-Host "$Question [o/N]"
  return $answer -match '^[oOyY]'
}

function Install-Docker {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    if (-not (Confirm-Choice "Installer Docker Desktop avec winget (droits administrateur demandés) ?")) {
      Fail "Installation annulée. Téléchargement manuel : https://www.docker.com/products/docker-desktop/"
    }
    winget install --exact --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "L'installation par winget a échoué. Téléchargement manuel : https://www.docker.com/products/docker-desktop/" }
    Ok "Docker Desktop est installé."
    Write-Host ""
    Write-Host "Étapes suivantes :" -ForegroundColor Yellow
    Write-Host "  1. Redémarrez Windows si l'installateur le demande (activation de WSL 2)."
    Write-Host "  2. Lancez Docker Desktop une première fois et acceptez les conditions."
    Write-Host "  3. Relancez start.cmd."
    exit 0
  }
  Info "winget indisponible : ouverture de la page de téléchargement de Docker Desktop."
  Start-Process "https://www.docker.com/products/docker-desktop/"
  Fail "Installez Docker Desktop, lancez-le une fois, puis relancez start.cmd."
}

function Test-DockerRunning {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

# Vérifie Docker ; propose de l'installer s'il est absent, le démarre s'il est arrêté.
function Test-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    if (Test-Path $DockerDesktopExe) {
      Fail "Docker Desktop est installé mais la commande 'docker' est introuvable : fermez ce terminal (ou redémarrez Windows) puis relancez start.cmd."
    }
    Info "Docker n'est pas installé sur cette machine."
    Install-Docker
  }
  if (-not (Test-DockerRunning)) {
    if (-not (Test-Path $DockerDesktopExe)) { Fail "Docker ne répond pas : lancez Docker Desktop puis réessayez." }
    Info "Docker Desktop n'est pas démarré : lancement..."
    Start-Process $DockerDesktopExe
    Info "Attente de Docker (jusqu'à 3 minutes)..."
    for ($i = 0; $i -lt 90 -and -not (Test-DockerRunning); $i++) { Start-Sleep -Seconds 2 }
    if (-not (Test-DockerRunning)) { Fail "Docker ne répond pas : vérifiez la fenêtre Docker Desktop puis relancez start.cmd." }
  }
  docker compose version *> $null
  if ($LASTEXITCODE -ne 0) { Fail "Le plugin 'docker compose' est introuvable : mettez Docker Desktop à jour." }
}

# Diagnostic seul (aucune action).
function Show-DockerCheck {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "X Docker n'est pas installé (start.cmd proposera de l'installer)" -ForegroundColor Red; exit 1
  }
  Ok "Docker installé : $(docker --version)"
  if (Test-DockerRunning) { Ok "Docker est démarré" } else { Write-Host "X Docker est installé mais pas démarré" -ForegroundColor Red }
  docker compose version *> $null
  if ($LASTEXITCODE -eq 0) { Ok "$(docker compose version)" } else { Write-Host "X Plugin docker compose absent" -ForegroundColor Red }
}

function New-EnvFile {
  if (Test-Path .env) { return }
  Info "Premier lancement : création du fichier .env"
  $bytes = New-Object byte[] 16
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $password = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  $content = Get-Content .env.example | ForEach-Object {
    $_ -replace '^POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$password" `
       -replace '^DATABASE_URL=postgresql://crm:change-me@', "DATABASE_URL=postgresql://crm:$password@"
  }
  # UTF-8 sans BOM (lisible par docker compose)
  [System.IO.File]::WriteAllLines((Join-Path $PSScriptRoot ".env"), $content, (New-Object System.Text.UTF8Encoding $false))
  Ok ".env créé (mot de passe PostgreSQL généré aléatoirement)"
}

function Get-AppUrl {
  $port = Get-EnvValue "APP_PORT"
  if (-not $port) { $port = "3000" }
  return "http://localhost:$port"
}

function Wait-App {
  $url = Get-AppUrl
  Info "Attente du démarrage de l'application ($url)..."
  for ($i = 0; $i -lt 90; $i++) {
    try {
      Invoke-WebRequest -Uri "$url/manifest.webmanifest" -UseBasicParsing -TimeoutSec 3 | Out-Null
      Ok "Application disponible : $url"
      return
    } catch { Start-Sleep -Seconds 2 }
  }
  Fail "L'application ne répond pas. Consultez les journaux : start.cmd logs"
}

function Invoke-Seed([string]$Demo) {
  Invoke-Native { docker compose run --rm -e "SEED_DEMO_DATA=$Demo" migrate npx prisma db seed } "Le seed a échoué."
}

function Start-App {
  Test-Docker
  New-EnvFile
  Info "Construction et démarrage (PostgreSQL, migrations, application)..."
  Invoke-Native { docker compose up -d --build } "Le démarrage a échoué (voir les messages ci-dessus)."
  Info "Référentiels (tags, cibles de démo, vecteurs de contact)..."
  Invoke-Seed "false"
  Wait-App
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.PrefixOrigin -in @("Dhcp", "Manual") -and $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -First 1 -ExpandProperty IPAddress
  $port = Get-EnvValue "APP_PORT"; if (-not $port) { $port = "3000" }
  if ($ip) { Ok "Depuis un téléphone sur le même Wi-Fi : http://${ip}:$port" }
  Start-Process (Get-AppUrl)
}

function Backup-App {
  Test-Docker
  New-Item -ItemType Directory -Force -Path backups | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Info "Sauvegarde de la base..."
  # pg_dump écrit dans le conteneur puis le fichier est copié (évite toute conversion d'encodage PowerShell)
  Invoke-Native { docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/crm.dump' } "pg_dump a échoué."
  $db = (docker compose ps -q db).Trim()
  Invoke-Native { docker cp "${db}:/tmp/crm.dump" "backups/crm-$stamp.dump" } "Copie de la sauvegarde impossible."
  Info "Sauvegarde des pièces jointes..."
  $backupDir = (Resolve-Path backups).Path
  Invoke-Native { docker compose run --rm --no-deps --user root -v "${backupDir}:/backup" --entrypoint sh app -c "tar czf /backup/uploads-$stamp.tgz -C /app/storage ." } "Sauvegarde des fichiers impossible."
  Ok "Sauvegarde terminée : backups\crm-$stamp.dump et backups\uploads-$stamp.tgz"
}

switch ($Command.ToLower()) {
  { $_ -in "start", "up" } { Start-App }
  { $_ -in "stop", "down" } { Test-Docker; docker compose down; Ok "Application arrêtée (données conservées)." }
  "restart" { Test-Docker; docker compose restart app; Wait-App }
  { $_ -in "status", "ps" } { Test-Docker; docker compose ps }
  "logs" { Test-Docker; docker compose logs -f app }
  "demo" { Test-Docker; New-EnvFile; Invoke-Seed "true"; Ok "Données de démonstration ajoutées (si la base était vide)." }
  "backup" { Backup-App }
  "check" { Show-DockerCheck }
  default { Fail "Commande inconnue : $Command (start, stop, restart, status, logs, demo, backup, check)" }
}
