#!/usr/bin/env bash
# =============================================================================
#  Démarrage du CRM (macOS / Linux) — Docker Compose
#
#   ./start.sh            démarre (ou met à jour) l'application et ouvre le navigateur
#   ./start.sh stop       arrête l'application (les données sont conservées)
#   ./start.sh restart    redémarre
#   ./start.sh status     état des conteneurs
#   ./start.sh logs       journaux de l'application (Ctrl+C pour quitter)
#   ./start.sh demo       ajoute les données de DÉMONSTRATION (seulement si la base est vide)
#   ./start.sh backup     sauvegarde la base + les pièces jointes dans ./backups
#
#  Au premier lancement, le fichier .env est créé à partir de .env.example
#  avec un mot de passe PostgreSQL aléatoire.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"

info() { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() {
  printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2
  exit 1
}

env_value() { # lit une variable du fichier .env (sans guillemets)
  grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

check_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker n'est pas installé : https://docs.docker.com/get-docker/"
  docker info >/dev/null 2>&1 || fail "Docker ne répond pas : lancez Docker Desktop puis réessayez."
  docker compose version >/dev/null 2>&1 || fail "Le plugin 'docker compose' est introuvable (Docker trop ancien ?)."
}

ensure_env() {
  [[ -f .env ]] && return
  info "Premier lancement : création du fichier .env"
  local password
  if command -v openssl >/dev/null 2>&1; then
    password=$(openssl rand -hex 16)
  else
    password=$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 32)
  fi
  sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${password}/" \
    -e "s#^DATABASE_URL=postgresql://crm:change-me@#DATABASE_URL=postgresql://crm:${password}@#" \
    .env.example >.env
  chmod 600 .env
  ok ".env créé (mot de passe PostgreSQL généré aléatoirement)"
}

app_url() { echo "http://localhost:$(env_value APP_PORT || true)" | sed 's/:$/:3000/'; }

wait_for_app() {
  local url
  url=$(app_url)
  info "Attente du démarrage de l'application ($url)…"
  for _ in $(seq 1 90); do
    if curl -fs -o /dev/null "$url/manifest.webmanifest" 2>/dev/null; then
      ok "Application disponible : $url"
      return
    fi
    sleep 2
  done
  fail "L'application ne répond pas. Consultez les journaux : ./start.sh logs"
}

lan_ip() {
  if command -v ipconfig >/dev/null 2>&1 && [[ "$(uname)" == "Darwin" ]]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  else
    hostname -I 2>/dev/null | awk '{print $1}' || true
  fi
}

open_browser() {
  local url
  url=$(app_url)
  if command -v open >/dev/null 2>&1 && [[ "$(uname)" == "Darwin" ]]; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

seed() { # $1 = true (démo) | false (référentiels uniquement)
  docker compose run --rm -e SEED_DEMO_DATA="$1" migrate npx prisma db seed
}

start() {
  check_docker
  ensure_env
  info "Construction et démarrage (PostgreSQL, migrations, application)…"
  docker compose up -d --build
  info "Référentiels (tags, cibles de démo, vecteurs de contact)…"
  seed false
  wait_for_app
  local ip port
  ip=$(lan_ip)
  port=$(env_value APP_PORT)
  [[ -n "$ip" ]] && ok "Depuis un téléphone sur le même Wi-Fi : http://${ip}:${port:-3000}"
  open_browser
}

backup() {
  check_docker
  mkdir -p backups
  local stamp
  stamp=$(date +%Y%m%d-%H%M%S)
  info "Sauvegarde de la base…"
  docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"backups/crm-${stamp}.dump"
  info "Sauvegarde des pièces jointes…"
  docker compose run --rm --no-deps --user root -v "$PWD/backups:/backup" --entrypoint sh app \
    -c "tar czf /backup/uploads-${stamp}.tgz -C /app/storage ." >/dev/null
  ok "Sauvegarde terminée : backups/crm-${stamp}.dump et backups/uploads-${stamp}.tgz"
}

case "${1:-start}" in
  start | up) start ;;
  stop | down)
    check_docker
    docker compose down
    ok "Application arrêtée (données conservées)."
    ;;
  restart)
    check_docker
    docker compose restart app
    wait_for_app
    ;;
  status | ps)
    check_docker
    docker compose ps
    ;;
  logs)
    check_docker
    docker compose logs -f app
    ;;
  demo)
    check_docker
    ensure_env
    seed true
    ok "Données de démonstration ajoutées (si la base était vide)."
    ;;
  backup) backup ;;
  -h | --help | help) sed -n '3,14p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) fail "Commande inconnue : $1 (voir ./start.sh help)" ;;
esac
