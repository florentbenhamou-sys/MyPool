#!/usr/bin/env bash
# =============================================================================
#  CRM — démarrage SANS Docker (macOS / Linux).
#  Seul Node.js est nécessaire : la base PostgreSQL est fournie par le projet.
#    ./start-local.sh          démarre (Ctrl+C pour arrêter)
#    ./start-local.sh demo     ajoute les données de démonstration (base vide)
#    ./start-local.sh backup   sauvegarde (application arrêtée)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé."
  if [[ "$(uname)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    read -r -p "Installer Node.js LTS avec Homebrew (brew install node@22) ? [o/N] " answer
    if [[ "$answer" =~ ^[oOyY] ]]; then
      brew install node@22 && brew link --overwrite --force node@22
    fi
  fi
  command -v node >/dev/null 2>&1 || {
    echo "Installez la version LTS depuis https://nodejs.org puis relancez ce script."
    exit 1
  }
fi

exec node scripts/local.mjs "$@"
