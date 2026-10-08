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
#
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

function Test-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker n'est pas installé : https://docs.docker.com/desktop/setup/install/windows-install/"
  }
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { Fail "Docker ne répond pas : lancez Docker Desktop puis réessayez." }
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
  default { Fail "Commande inconnue : $Command (start, stop, restart, status, logs, demo, backup)" }
}
