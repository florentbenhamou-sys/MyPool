# Auto Coûts — coûts automobiles du foyer

Application web locale pour gérer les véhicules du foyer, calculer leur coût réel
et comparer des configurations (« scénarios ») afin de trouver la plus économique.

```bash
cd auto-couts
npm install      # installe les dépendances et génère le client Prisma
npm run dev      # crée/maj la base SQLite, charge la démo au 1er lancement, démarre sur http://localhost:3000
npm test         # tests unitaires du moteur de calcul
```

Prérequis : Node.js ≥ 20. Aucune dépendance cloud : les données sont dans `prisma/auto-couts.db`.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (lance `db:setup` avant) |
| `npm run build` puis `npm start` | version optimisée |
| `npm run db:reset` | **efface** la base et recharge les données de démonstration |
| `npm run lint` | vérification TypeScript |

## Version fichier HTML (sans installation)

`auto-couts.html` est l'application complète dans un seul fichier : double-cliquez dessus,
elle s'ouvre dans le navigateur (Edge, Chrome, Firefox), sans Node.js ni droits administrateur.

- Mêmes écrans et même moteur de calcul que la version serveur (le code est partagé).
- Les données sont enregistrées **dans le navigateur, sur ce poste** (localStorage) : elles restent
  après fermeture, mais sont effacées si vous videz les données de navigation. Exportez régulièrement
  en JSON (Paramètres) ; le JSON est compatible entre les deux versions.
- Regénérer le fichier après une modification du code : `npm run build:html` (sources dans `spa/`).

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript**, rendu serveur des pages, *server actions* pour les écritures.
- **SQLite + Prisma 6** (`prisma/schema.prisma`). Le schéma est appliqué avec `prisma db push` au démarrage.
- **Tailwind CSS 4**, thème clair/sombre automatique, mise en page responsive (barre latérale sur ordinateur, barre d'onglets sur mobile).
- **Recharts** pour les graphiques, **zod** pour la validation (même schéma côté formulaire et côté serveur).
- **Vitest** pour les tests.

```
src/lib/calc/engine.ts    moteur de calcul (pur, sans base ni React) ← toutes les formules
src/lib/calc/finance.ts   crédit : mensualité, échéancier, taux implicite
src/lib/calc/types.ts     entrées / résultats du moteur
src/lib/domain.ts         référentiels (catégories, motorisations, postes de coûts, libellés)
src/lib/validation.ts     schémas zod
src/lib/data.ts           lecture Prisma → entrées du moteur
src/lib/backup.ts         export / import JSON (utilisé aussi par le seed)
src/app/…                 pages : / (dashboard), /vehicules, /scenarios, /comparaison, /simulations, /parametres
src/app/actions.ts        server actions (création, modification, suppression, import…)
src/app/api/export        export JSON / CSV
prisma/demo-data.ts       données de démonstration
```

Les composants n'appliquent aucune formule : ils affichent les résultats du moteur,
qui fournit aussi le texte explicatif de chaque calcul. Le même moteur tourne côté
serveur (pages) et côté navigateur (aperçu en direct des formulaires, simulations instantanées).

## Modèle de données

- `EnergyType` : énergies et prix (€/L, €/kWh…). Extensible depuis **Paramètres** (ex. E85, hydrogène).
- `Vehicle` : identification, catégorie (fonction / neuve / occasion), motorisation, consommations
  (constructeur + réelle), kilométrage, champs voiture de fonction, champs achat/financement.
- `CostLine` : lignes de coûts libres (assurance, parking, entretien, pneus…), en €/mois, €/an ou €/km.
- `Scenario` + `ScenarioVehicle` : configuration du foyer ; un véhicule peut être dans plusieurs scénarios,
  avec un kilométrage propre au scénario. `ScenarioPriceOverride` : prix d'énergie propres au scénario.
  Configuration familiale (adultes, enfants, besoin de deux véhicules) stockée pour de futures contraintes.
- `Settings` : taux AEN par défaut, horizon par défaut, méthode de coût, scénario de référence.
- `Simulation` : hypothèses « Et si… » enregistrées.

## Règles de calcul

Tous les montants sont des **coûts supportés par le foyer**. Ce qui est payé par
l'employeur est affiché à part, en « informatif », et jamais additionné.

**Énergie**
- consommation retenue = réelle si renseignée, sinon constructeur ;
- coût/km = consommation / 100 × prix ; coût annuel = km annuels × coût/km ; mensuel = annuel / 12 ;
- hybride rechargeable : km électriques = km × part électrique, le reste en carburant, chaque part avec sa consommation et son prix ;
- prix utilisé (priorité décroissante) : **simulation > scénario > véhicule > paramètres globaux**. La source est affichée.

**Voiture de fonction**
- redevance + participation complémentaire du salarié (fixes) ;
- surcoût fiscal de l'avantage en nature = AEN mensuel × taux (taux du véhicule, sinon taux par défaut des paramètres),
  ou un surcoût saisi directement (prioritaire) ;
- énergie : part employeur paramétrable par véhicule (0 % = payée par le foyer, 100 % = carte carburant) ;
- coût employeur : informatif.

**Achat (neuf / occasion)** — deux méthodes, au choix (paramètre par défaut + bascule sur chaque page) :
- *Coût économique* : décote = (prix − revente) / durée de détention, + intérêts du crédit payés pendant la détention
  (échéancier exact). Les mensualités ne sont **pas** recomptées (elles remboursent le prix, déjà compté via la décote).
- *Trésorerie* : sorties d'argent réelles sur l'horizon : apport (ou prix comptant), mensualités, capital restant dû à la revente,
  moins la revente lorsqu'elle tombe dans l'horizon. Si l'horizon dépasse la détention, renouvellement à l'identique ;
  si le véhicule est encore détenu à la fin de l'horizon, sa valeur estimée est signalée mais non déduite.
- La mensualité saisie est prioritaire ; sinon une mensualité indicative est calculée (crédit amortissable).
  Le taux implicite est recalculé à partir de la mensualité pour obtenir les intérêts.

**Totaux**
- coût annuel = coût total sur l'horizon / nombre d'années (identique quel que soit l'horizon en mode économique) ;
- coût/km = coût annuel / km annuels (non calculé si 0 km) ;
- fixes : redevances, financement, assurance, parking… ; variables : énergie, entretien, pneus, réparations, péages, lavage ;
- comparaison : économie = coût de la référence − coût du scénario (mensuel, annuel, 1/3/5/7/10 ans, %),
  avec l'explication de l'écart par véhicule et par poste.

**Garde-fous** : validation complète des formulaires ; toute donnée manquante utilisée par défaut
(durée de détention, valeur de revente, taux, part électrique…) produit un avertissement visible ;
incohérences signalées (apport + financé ≠ prix, taux saisi ≠ mensualité, revente > prix,
leasing + crédit ou leasing + redevance = risque de double comptage…).

## Décisions fonctionnelles retenues

- Énergie des voitures de fonction : part employeur réglable par véhicule.
- Avantage en nature : AEN × taux marginal paramétrable, ou surcoût saisi directement.
- Méthode de coût des achats : économique **ou** trésorerie, au choix.
- Véhicule personnel déjà possédé : renseigner sa valeur de marché actuelle comme « prix d'achat »
  (c'est ce que l'on renonce à récupérer en le gardant).

## Sauvegarde

Paramètres → *Exporter (JSON complet)* / *Importer un JSON* (remplace toutes les données) ;
export CSV des véhicules et des scénarios (séparateur « ; », compatible Excel).
