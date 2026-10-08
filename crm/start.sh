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
#   ./start.sh check      vérifie seulement que Docker est installé et démarré
#
#  Si Docker est absent, le script propose de l'installer (Homebrew sur macOS,
#  script officiel get.docker.com sur Linux) ; s'il est arrêté, il le démarre.
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

confirm() { # $1 = question ; renvoie 0 si l'utilisateur répond oui
  local answer
  read -r -p "$1 [o/N] " answer || return 1
  [[ "$answer" =~ ^[oOyY] ]]
}

install_docker() {
  case "$(uname)" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        confirm "Installer Docker Desktop avec Homebrew (brew install --cask docker) ?" ||
          fail "Installation annulée. Téléchargement manuel : https://www.docker.com/products/docker-desktop/"
        brew install --cask docker
        ok "Docker Desktop installé. Premier démarrage (acceptez les conditions dans la fenêtre Docker)…"
        open -a Docker
      else
        info "Homebrew absent : ouverture de la page de téléchargement de Docker Desktop."
        open "https://www.docker.com/products/docker-desktop/" 2>/dev/null || true
        fail "Installez Docker Desktop (Apple Silicon ou Intel), lancez-le une fois, puis relancez ./start.sh"
      fi
      ;;
    Linux)
      confirm "Installer Docker Engine avec le script officiel (https://get.docker.com, droits sudo requis) ?" ||
        fail "Installation annulée. Procédure manuelle : https://docs.docker.com/engine/install/"
      curl -fsSL https://get.docker.com | sudo sh
      sudo systemctl enable --now docker
      sudo usermod -aG docker "$USER"
      ok "Docker installé. Fermez votre session puis reconnectez-vous (groupe 'docker'), puis relancez ./start.sh"
      exit 0
      ;;
    *) fail "Système non reconnu. Installez Docker : https://docs.docker.com/get-docker/" ;;
  esac
}

start_docker_daemon() {
  if [[ "$(uname)" == "Darwin" ]]; then
    info "Docker Desktop n'est pas démarré : lancement…"
    open -a Docker 2>/dev/null || fail "Impossible de lancer Docker Desktop : ouvrez-le manuellement."
  elif command -v systemctl >/dev/null 2>&1; then
    info "Le service Docker n'est pas démarré : sudo systemctl start docker"
    sudo systemctl start docker || true
  fi
}

wait_for_docker() {
  info "Attente de Docker (jusqu'à 3 minutes)…"
  for _ in $(seq 1 90); do
    docker info >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

# Vérifie Docker ; propose de l'installer s'il est absent, le démarre s'il est arrêté.
check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    info "Docker n'est pas installé sur cette machine."
    install_docker
  fi
  if ! docker info >/dev/null 2>&1; then
    if docker info 2>&1 | grep -qi "permission denied"; then
      fail "Accès à Docker refusé : ajoutez-vous au groupe docker (sudo usermod -aG docker \$USER) puis reconnectez-vous."
    fi
    start_docker_daemon
    wait_for_docker || fail "Docker ne répond pas : lancez Docker Desktop manuellement puis relancez le script."
  fi
  docker compose version >/dev/null 2>&1 ||
    fail "Le plugin 'docker compose' est introuvable : mettez Docker à jour (https://docs.docker.com/compose/install/)."
}

# Diagnostic seul (aucune action).
check_only() {
  local status=0
  if command -v docker >/dev/null 2>&1; then
    ok "Docker installé : $(docker --version)"
    if docker info >/dev/null 2>&1; then ok "Docker est démarré"; else
      printf '\033[1;31m✖ Docker est installé mais pas démarré\033[0m\n'
      status=1
    fi
    if docker compose version >/dev/null 2>&1; then ok "$(docker compose version)"; else
      printf '\033[1;31m✖ Plugin docker compose absent\033[0m\n'
      status=1
    fi
  else
    printf '\033[1;31m✖ Docker n'"'"'est pas installé (./start.sh proposera de l'"'"'installer)\033[0m\n'
    status=1
  fi
  return $status
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
  check) check_only ;;
  -h | --help | help) awk 'NR > 2 && /^# ====/ { exit } NR > 2' "$0" | sed 's/^# \{0,1\}//' ;;
  *) fail "Commande inconnue : $1 (voir ./start.sh help)" ;;
esac
