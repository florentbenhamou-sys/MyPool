# MyPool CRM — avant-vente & propositions commerciales

Application web de CRM, de suivi d'avant-vente et de configuration de propositions commerciales.
Responsive (desktop, tablette, iPhone, Android) et installable comme une PWA.

- **CRM** : entités, contacts, vecteurs de prise de contact, meetings, démos, RFP/RFI (avec fichiers), tags.
- **Commercial** : catalogue (produits, souscriptions annuelles, services, maintenances), propositions
  → produits → scénarios alternatifs → lignes figées (snapshots), options, combinaisons calculées, synthèses.

Stack : Next.js 15 (App Router) · TypeScript strict · React 19 · Tailwind CSS 4 · shadcn/ui · PostgreSQL 16 ·
Prisma 6 · Zod · React Hook Form · Vitest · Playwright · Docker Compose.

Les choix d'architecture, le modèle de données et les ambiguïtés tranchées sont décrits dans
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> Le dépôt contient aussi, à la racine, une application « piscine » indépendante. Le CRM vit
> entièrement dans ce dossier `crm/` : toutes les commandes ci-dessous s'exécutent depuis `crm/`.

---

## 1. Démarrage rapide avec Docker (recommandé)

Pré-requis : Docker Desktop (ou Docker Engine + plugin compose), démarré.

### Vérifier Docker (et l'installer si besoin)

Vérification rapide :

| Système | Commande |
|---|---|
| macOS / Linux | `./start.sh check` |
| Windows | `start.cmd check` |

Ou à la main, dans un terminal : `docker --version` (installé ?), `docker info` (démarré ?),
`docker compose version` (plugin compose présent ?).

Le script de démarrage s'en charge aussi :
- **Docker absent** → il propose de l'installer, après confirmation :
  - Windows : `winget install --exact --id Docker.DockerDesktop` ;
  - macOS : `brew install --cask docker` (sinon ouverture de la page de téléchargement) ;
  - Linux : script officiel `curl -fsSL https://get.docker.com | sudo sh`.
- **Docker installé mais arrêté** → il lance Docker Desktop (ou `systemctl start docker`) et attend qu'il soit prêt.

Installation manuelle :

| Système | Procédure |
|---|---|
| Windows 10/11 | Télécharger **Docker Desktop** sur https://www.docker.com/products/docker-desktop/, installer en laissant l'option **WSL 2** cochée, **redémarrer** Windows, lancer Docker Desktop et accepter les conditions. Si WSL manque : `wsl --install` dans un PowerShell administrateur, puis redémarrer. |
| macOS | Télécharger **Docker Desktop** (choisir *Apple Silicon* ou *Intel* selon le Mac : menu  → À propos de ce Mac), glisser dans Applications, lancer une fois et accepter les conditions. |
| Linux | Suivre https://docs.docker.com/engine/install/ (ou le script `get.docker.com`), puis `sudo usermod -aG docker $USER` et se reconnecter. |

Après l'installation, ouvrir **un nouveau terminal** (pour que la commande `docker` soit trouvée)
et relancer le script de démarrage.

### Avec le script de démarrage

| Système | Commande (depuis le dossier `crm/`) |
|---|---|
| macOS / Linux | `./start.sh` |
| Windows | double-cliquer sur `start.cmd` (ou `start.cmd` dans un terminal) |

Le script :

1. vérifie Docker (propose de l'installer s'il est absent, le démarre s'il est arrêté) ;
2. au premier lancement, crée `.env` à partir de `.env.example` avec un **mot de passe PostgreSQL aléatoire** ;
3. construit et démarre PostgreSQL, applique les migrations, démarre l'application
   (relancer le script après un `git pull` suffit pour mettre à jour) ;
4. installe les référentiels (tags, cibles de démo, vecteurs de contact) sans écraser vos modifications ;
5. attend que l'application réponde, affiche l'adresse à utiliser depuis un téléphone et ouvre le navigateur.

Autres commandes (`./start.sh <commande>` ou `start.cmd <commande>`) :

| Commande | Rôle |
|---|---|
| `stop` | arrête l'application (données conservées) |
| `restart` | redémarre l'application |
| `status` | état des conteneurs |
| `logs` | journaux de l'application |
| `demo` | ajoute les données de démonstration (uniquement si la base est vide) |
| `backup` | sauvegarde la base et les pièces jointes dans `backups/` |
| `check` | vérifie seulement que Docker est installé et démarré |

### Manuellement

```bash
cd crm
cp .env.example .env              # puis changer POSTGRES_PASSWORD (et DATABASE_URL en conséquence)
docker compose up -d --build      # PostgreSQL + migrations + application
docker compose run --rm migrate npx prisma db seed   # (optionnel) données de démonstration
```

Ouvrir http://localhost:3000.

Ce que fait `docker compose up` :

| Service | Rôle |
|---|---|
| `db` | PostgreSQL 16, données dans le volume persistant `pgdata`, exposé seulement sur `127.0.0.1` |
| `migrate` | applique les migrations (`prisma migrate deploy`) puis s'arrête |
| `app` | serveur Next.js (image « standalone », utilisateur non root), fichiers dans le volume `uploads` |

Commandes utiles :

```bash
docker compose logs -f app                 # journaux
docker compose down                        # arrêt (les données sont conservées)
docker compose up -d --build               # mise à jour après un git pull (migrations incluses)
docker compose down -v                     # ⚠ arrêt + SUPPRESSION des volumes (base et fichiers)
```

## 2. Développement local (sans conteneur pour l'application)

Pré-requis : Node.js ≥ 20.18 (22 recommandé), une base PostgreSQL (celle du compose suffit : `docker compose up -d db`).

```bash
cd crm
cp .env.example .env            # DATABASE_URL pointe sur localhost:5432
npm install                     # génère aussi le client Prisma
npm run db:deploy               # applique les migrations
npm run db:seed                 # données de démonstration (DÉVELOPPEMENT)
npm run dev                     # http://localhost:3000 (accessible au téléphone via l'IP du PC)
```

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | développement / build de production / serveur de production |
| `npm run lint` · `typecheck` · `format` | ESLint · TypeScript · Prettier |
| `npm test` | tests unitaires du moteur de calcul (Vitest, sans base ni navigateur) |
| `npm run test:e2e` | parcours + responsive (Playwright, application démarrée et seedée) |
| `npm run db:studio` | Prisma Studio (exploration de la base) |

## 3. Base de données : migrations, seed, reset

```bash
# Modifier prisma/schema.prisma, puis créer une migration (développement) :
npm run db:migrate -- --name description_du_changement
# Appliquer les migrations existantes (CI, serveur, Docker) :
npm run db:deploy                       # ou : docker compose run --rm migrate
# Données de démonstration (idempotent ; le CRM fictif n'est créé que si la base est vide) :
npm run db:seed                         # ou : docker compose run --rm migrate npx prisma db seed
SEED_DEMO_DATA=false npm run db:seed    # référentiels uniquement (tags, cibles, vecteurs)
# ⚠ RESET complet en développement (supprime TOUTES les données, rejoue migrations + seed) :
npm run db:reset                        # ou : docker compose run --rm migrate npx prisma migrate reset --force
```

Le seed est clairement marqué « données de DÉVELOPPEMENT » : ne pas l'exécuter sur une base de
production avec `SEED_DEMO_DATA` à `true` (il ne crée de toute façon les données CRM fictives
que si aucune entité n'existe).

## 4. Sauvegarde et restauration PostgreSQL

Le plus simple : `./start.sh backup` (Windows : `start.cmd backup`), qui produit dans `backups/`
un dump de la base et une archive des pièces jointes. Équivalent manuel, au format « custom »
(compressé, restauration sélective possible) :

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > backups/crm-$(date +%Y%m%d-%H%M).dump
```

Restauration (⚠ remplace le contenu actuel) :

```bash
docker compose stop app
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < backups/crm-20261008-1430.dump
docker compose start app
```

Variante SQL lisible (`psql` pour restaurer) :

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > backups/crm.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/crm.sql
```

Sans Docker : `pg_dump "$DATABASE_URL" -Fc > crm.dump` et `pg_restore -d "$DATABASE_URL" --clean --if-exists crm.dump`.

Les **pièces jointes** ne sont pas dans la base : sauvegarder aussi le volume `uploads` :

```bash
docker run --rm -v crm_uploads:/data -v "$PWD/backups":/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tgz -C /data .
```

(Le nom réel du volume est visible avec `docker volume ls`, préfixé par le nom du projet compose.)
Conseil : planifier ces deux commandes (cron / Planificateur de tâches) et copier `backups/` hors de la machine.

## 5. Utilisation sur téléphone et installation (PWA)

- Sur le même réseau Wi-Fi, ouvrir `http://<IP-du-PC>:3000` sur le téléphone.
- **iOS (Safari)** : Partager → « Sur l'écran d'accueil ». **Android (Chrome)** : menu → « Installer l'application ».
- L'installation complète (service worker) nécessite HTTPS hors `localhost` : c'est le cas une fois
  déployé derrière un reverse proxy TLS (voir ci-dessous).
- Le service worker ne met **jamais** les données en cache (PostgreSQL fait foi) ; il affiche une page
  « hors ligne » si le serveur est injoignable.

## 6. Passer du local au serveur

```
LOCAL                                   SERVEUR
PC → Docker Compose → PostgreSQL local  Utilisateurs → reverse proxy HTTPS → app (Docker) → PostgreSQL partagé
```

Le modèle de données et le code ne changent pas : seules la configuration et l'infrastructure évoluent.

1. **Ajouter une authentification AVANT toute exposition sur Internet.** La V1 n'en a pas
   (utilisateur local unique). Le point d'entrée est `src/server/context.ts` (`getCurrentUser`) :
   brancher Auth.js / OIDC (Google Workspace, Microsoft Entra ID…), protéger les routes via un
   `middleware.ts`, puis renseigner les utilisateurs dans la table `User`. Les colonnes
   `createdById` / `updatedById` et la table `AuditLog` sont déjà en place.
   En attendant, un accès restreint est possible via VPN (WireGuard/Tailscale) ou une authentification
   au niveau du reverse proxy.
2. **Serveur** : VM Linux avec Docker. Copier le dossier `crm/`, créer un `.env` avec des secrets forts.
3. **HTTPS** : reverse proxy (Caddy, Traefik ou Nginx + Let's Encrypt) vers le port 3000 ; ne pas exposer
   le port PostgreSQL.
4. **Base partagée** :
   - soit le service `db` du compose (volume `pgdata` sauvegardé régulièrement) ;
   - soit un PostgreSQL managé : supprimer le service `db`, renseigner `DATABASE_URL`
     (avec `?sslmode=require` si nécessaire) pour `migrate` et `app`.
5. **Migrer les données locales** vers le serveur : `pg_dump` local (section 4) → copie → `pg_restore`
   sur la base serveur après `prisma migrate deploy` (ou restauration complète d'une base vide).
6. **Fichiers** : volume `uploads` sauvegardé, ou implémentation d'un driver S3-compatible
   (`src/server/storage/types.ts` → `S3Storage`, sélection par `STORAGE_DRIVER`).
7. **Mises à jour** : `git pull && docker compose up -d --build` (les migrations s'appliquent avant
   le démarrage de l'application). Faire une sauvegarde avant chaque mise à jour.

## 7. Configuration (variables d'environnement)

Toutes listées et commentées dans [.env.example](.env.example). Aucun secret n'est codé en dur ;
la configuration serveur est validée au démarrage (`src/server/config.ts`) et n'est jamais exposée au navigateur.

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion PostgreSQL (recalculée automatiquement dans docker compose) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | base du compose |
| `APP_PORT` | port HTTP publié |
| `APP_TIMEZONE` | fuseau de saisie / affichage des dates + heures (défaut `Europe/Paris`) |
| `DEFAULT_CURRENCY` | devise par défaut (ISO 4217, défaut `EUR`) |
| `LOCAL_USER_EMAIL` / `LOCAL_USER_NAME` | utilisateur local (mode mono-utilisateur) |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` / `MAX_UPLOAD_MB` | stockage des pièces jointes |

## 8. Tests

- **Moteur de calcul** (`tests/unit/pricing`, `npm test`) : souscription avec/sans remise, service,
  service + option, maintenance, option libre, scénario complet, combinaison S1 + Service1, plusieurs
  souscriptions, plusieurs services, année 1, scénarios sans option / sans service / sans souscription,
  arrondis, combinaisons de l'exemple de la spécification, alternatives et fourchettes de proposition.
- **Bout en bout** (`tests/e2e`, `npm run test:e2e`) : saisie rapide « salon » sur téléphone, validation
  de l'e-mail, construction d'une proposition avec recalcul de la synthèse, et absence de défilement
  horizontal sur toutes les pages à 320, 375, 390, 430, 768, 1024 et 1440 px.
