# Architecture et décisions

Ce document résume l'analyse de la spécification, les choix d'architecture et les
ambiguïtés tranchées pendant le développement de la V1.

## 1. Vue d'ensemble

```
Navigateur (desktop / mobile / PWA)
        │  React Server Components + Server Actions (validation Zod côté serveur)
        ▼
Next.js 15 (App Router) ── src/app            pages (UI)
        │                ── src/components     composants (shadcn/ui + métier)
        │                ── src/server/actions Server Actions (entrée validée)
        │                ── src/server/data    accès aux données (SEUL endroit où Prisma est utilisé)
        │                ── src/domain/pricing moteur de calcul PUR (sans React / Prisma)
        ▼
PostgreSQL 16 (Prisma ORM, migrations versionnées)      Stockage fichiers (src/server/storage)
```

### Arborescence

```
crm/
├── prisma/
│   ├── schema.prisma          modèle de données complet
│   ├── migrations/            migrations SQL versionnées (+ contraintes CHECK)
│   └── seed.ts                données de DÉVELOPPEMENT
├── src/
│   ├── app/                   routes (pages, route handlers /api, manifest PWA)
│   ├── components/
│   │   ├── ui/                composants shadcn/ui (Button, Dialog, Tabs…)
│   │   ├── layout/            sidebar, menu mobile, recherche, service worker
│   │   ├── shared/            listes responsive, filtres, confirmations…
│   │   ├── entities/ activities/ catalog/ admin/ proposals/
│   ├── domain/pricing/        moteur de calcul (testé unitairement)
│   ├── lib/
│   │   ├── i18n/              textes d'interface (fr) — prêt pour en
│   │   ├── validation/        schémas Zod partagés client / serveur
│   │   ├── format.ts          formatage monnaie / dates (fr-FR)
│   │   └── action-result.ts
│   └── server/
│       ├── config.ts          variables d'environnement validées (server-only)
│       ├── context.ts         utilisateur courant (point d'entrée de la future auth)
│       ├── data/              repositories Prisma
│       ├── actions/           Server Actions
│       ├── mappers/           Prisma → modèles du moteur de calcul
│       └── storage/           abstraction de stockage (local, puis S3)
└── tests/
    ├── unit/pricing/          tests du moteur de calcul (Vitest)
    └── e2e/                   parcours + responsive (Playwright)
```

Règles de dépendance (vérifiées par ESLint pour Prisma) :

- `src/domain` n'importe rien d'autre que `decimal.js` ;
- `@prisma/client` n'est importé que dans `src/server/data`, `src/server/db.ts`, `src/server/mappers` et `prisma/` ;
- `src/server/**` est marqué `server-only` : impossible de l'embarquer dans le bundle navigateur
  (DATABASE_URL et secrets ne fuient jamais).

## 2. Modèle de données — cardinalités

| Relation | Cardinalité | Suppression |
|---|---|---|
| Entity → Contact, ContactChannel, Meeting, Demo, RfpRfi | 1 → 0..n | cascade |
| Entity → Proposal | 1 → 0..n | **Restrict** (une entité avec propositions s'archive) |
| Entity ↔ Tag (EntityTag) | n ↔ n | cascade du lien |
| ContactChannel → ContactChannelType | n → 1 | Restrict |
| ContactChannel → Contact | n → 0..1 | SetNull |
| Meeting ↔ Contact (MeetingContact), Meeting ↔ Tag | n ↔ n | cascade du lien |
| Meeting → DemoTarget | n → 0..1 | SetNull |
| Demo → Meeting | n → 0..1 | SetNull |
| Demo ↔ DemoTarget, Demo ↔ Tag | n ↔ n | cascade du lien |
| RfpRfi → RfpRfiFile | 1 → 0..n | cascade (+ fichier physique supprimé) |
| Proposal → RfpRfi | n → 0..1 | SetNull |
| Proposal → ProposalProduct → Scenario | 1 → 0..n → **1..n** | cascade |
| ProposalProduct → Product (catalogue) | n → 1 | **Restrict** (produit utilisé = désactivé, jamais supprimé) |
| Scenario → ScenarioSubscription / ScenarioService / ScenarioMaintenance / ScenarioOption | 1 → 0..n | cascade |
| ScenarioService → ScenarioServiceOption | 1 → 0..n | cascade |
| Scenario* → élément de catalogue | n → 0..1 | SetNull (le snapshot reste) |

Le « 1..n scénarios » est garanti par l'application : l'ajout d'un produit crée un scénario
« Standard » et la suppression du dernier scénario est refusée.

## 3. Catalogue ≠ Proposition (règle fondamentale)

- Chaque ligne de scénario stocke **son propre snapshot** : `codeSnapshot`, `descriptionSnapshot`,
  `listPrice`, `discount`, `customerPrice`, `displayDiscount`.
- Lors de l'ajout depuis le catalogue, le serveur **relit** le code et le prix dans la base (le client
  ne peut pas imposer un prix catalogue).
- Une ligne issue du catalogue garde son code et son prix catalogue **figés** ; seuls le libellé
  (reformulation client), la remise et l'affichage de la remise sont modifiables.
- Le lien vers le catalogue (`subscriptionId`…) est conservé pour les statistiques futures, mais n'est
  jamais utilisé pour recalculer un prix. `ProposalProduct` copie de même le nom et la description du produit.
- `customerPrice` est **stocké** ; les synthèses additionnent les prix stockés (état commercial historique).
- La duplication d'une proposition copie les snapshots tels quels, sans relire le catalogue.

## 4. Montants, remises, devises

- `DECIMAL(14,2)` pour les montants, `DECIMAL(5,2)` pour les remises. Contraintes `CHECK` en base :
  prix ≥ 0, remise entre 0 et 100.
- **La remise est un pourcentage** : `customerPrice = listPrice × (1 − discount / 100)`, arrondi au
  centime (demi supérieur). Voir `src/domain/pricing/line.ts`.
- Calculs avec `decimal.js` (instance isolée). Aucun `number` flottant pour un montant ; les montants
  circulent en chaînes entre serveur et client.
- Devise : colonne `currency` (ISO 4217, défaut `DEFAULT_CURRENCY`) sur la proposition et sur les
  éléments de catalogue. Pas de conversion en V1 ; l'affichage utilise la devise de la donnée.

## 5. Moteur de calcul (`src/domain/pricing`)

| Fonction | Rôle |
|---|---|
| `computeCustomerPrice(listPrice, discount%)` | prix client d'une ligne |
| `calculateScenarioSummary(scenario)` | annuel, one shot, année 1, année N, sous-totaux, remise totale |
| `generateScenarioCombinations(scenario, { isValid })` | produit cartésien souscriptions × packages de services |
| `isCombinationValid(combination, rules)` | point d'extension des règles de compatibilité (V1 : `true`) |
| `calculateProductSummary(product)` | scénarios, combinaisons, alternatives, fourchette |
| `calculateProposalSummary(proposal)` | nb produits / scénarios, synthèse par produit, total ou fourchette |
| `calculateContractTotal(annual, oneShot, months)` | total sur la durée du contrat |

### Scénarios et combinaisons = alternatives

- Un **package de services** = un service + toutes ses options.
- Combinaison = 1 souscription × 1 package ; maintenances et options libres sont communes à toutes.
  Sans souscription → une combinaison par package ; sans service → une par souscription.
- Les combinaisons sont **calculées**, jamais stockées. Leur clé stable (`sub:<id>|svc:<id>`) peut être
  mémorisée dans `Scenario.selectedCombinationKey` (« Retenir » dans l'interface).
- Les **produits** d'une proposition sont cumulatifs ; les **scénarios** d'un produit et les
  **combinaisons** d'un scénario sont des alternatives.
  - si chaque produit n'a qu'une alternative → total unique (`kind: "SINGLE"`) ;
  - sinon → fourchette (`kind: "RANGE"`) : somme des minima — somme des maxima, triés par total année 1.
    La fourchette « durée du contrat » est calculée alternative par alternative.
  - **Jamais** la somme de toutes les alternatives.

## 6. Ambiguïtés de la spécification et décisions prises

| Sujet | Décision |
|---|---|
| Synthèse d'un scénario avec plusieurs souscriptions | `calculateScenarioSummary` additionne toutes les lignes (définition §24). L'interface signale alors que ce total n'est pas un prix : le scénario contient des alternatives (combinaisons) et les tableaux de synthèse affichent la fourchette des combinaisons. |
| Options d'un service dans les combinaisons | Toujours incluses avec leur service (exemple §25 : « S1 + Service1 + Option »). |
| `contractDuration` | Entier en **mois** ; sert au « total sur la durée du contrat ». |
| `presentation` (RFP/RFI) | Interprété comme la **date de soutenance** (`presentationDate`). |
| `demoTarget` sur Meeting | Relation optionnelle vers le référentiel `DemoTarget`. |
| Compteurs Meeting / Demo / RFP | Par entité, attribués à la création (`max + 1`, contrainte UNIQUE + retry), jamais renumérotés ; RFP et RFI partagent le compteur. Le meeting/démo ne change pas d'entité après création. |
| Numéro de proposition | `P-AAAA-NNNN`, séquence par année, unique. |
| Statuts (Entity, Proposal) et types (Meeting, RFP/RFI) | Enums PostgreSQL : ils pilotent des règles (verrouillage, compteurs). Ajouter une valeur = migration + libellé i18n. Affichés en lecture seule dans Administration. Les référentiels « libres » (tags, vecteurs, cibles) sont des tables administrables. |
| Tags sur les entités | Ajoutés (EntityTag) : les tags ENVIRONMENT (S4, ECC6, RISE…) qualifient naturellement le client. |
| Propositions figées | ACCEPTED / REJECTED / EXPIRED ou archivée → contenu non modifiable (vérifié côté serveur). « Dupliquer » crée une nouvelle version brouillon. |
| Suppression | Propositions : archivage. Catalogue et référentiels : désactivation. Entité : suppression refusée si elle a des propositions (archivage proposé). Objets CRM : suppression avec confirmation. |
| Colonnes d'audit | `createdById` / `updatedById` sans clé étrangère (les utilisateurs ne sont jamais supprimés, seulement désactivés). Table `AuditLog` alimentée pour les créations/archivages/suppressions/statuts. |
| Saisie rapide | `/entities/new` = écran unique entité + contact + vecteur + note, en une transaction. Les champs d'adresse se complètent ensuite via « Modifier ». |
| Recharts / TanStack Table | Non utilisés en V1 : aucun graphique n'apportait de valeur réelle, et les listes sont filtrées/triées côté serveur (URL). Ajout trivial si besoin. |

## 7. Dates et fuseau horaire

- Dates « jour » (`contactDate`, `validityDate`…) en `DATE` : pas de fuseau, affichées telles quelles.
- Dates + heures (`meetingDate`, `demoDate`) en `TIMESTAMPTZ` (UTC en base). Saisies et affichées dans
  le fuseau métier `APP_TIMEZONE` (défaut `Europe/Paris`), conversions côté serveur (`date-fns-tz`).
  Évolution : un fuseau par utilisateur.
- Format : `08/10/2026` et `08/10/2026 14:30`.

## 8. Sécurité

- Validation Zod **côté serveur** de toutes les entrées (les formulaires envoient les valeurs brutes,
  le serveur applique lui-même le schéma) ; identifiants vérifiés (UUID) ; appartenance contrôlée
  (contacts d'un meeting, meeting d'une démo, RFP d'une proposition = même entité).
- Prisma : requêtes paramétrées. React échappe tout le contenu (aucun `dangerouslySetInnerHTML`).
- Uploads : taille max (`MAX_UPLOAD_MB`), liste blanche d'extensions, type MIME déduit côté serveur,
  clé de stockage générée (pas de chemin fourni par le client, protection path traversal),
  téléchargement en `attachment` + `nosniff`.
- En-têtes de sécurité (X-Frame-Options, nosniff, Referrer-Policy…).
- **Aucune authentification en V1** : l'application ne doit PAS être exposée sur Internet en l'état
  (voir README, « Déploiement serveur »).

## 9. Évolutions préparées

| Évolution | Point d'entrée |
|---|---|
| Authentification / multi-utilisateurs | `src/server/context.ts` (`getCurrentUser`), table `User`, colonnes `createdById`/`updatedById` |
| Rôles / permissions | enveloppe `runAction` (`src/server/actions/run.ts`) |
| Audit détaillé | table `AuditLog` (`changes` JSON), `recordAudit()` |
| Stockage S3 | interface `StorageDriver`, sélection par `STORAGE_DRIVER` |
| Règles de compatibilité | `CompatibilityRule`, `isCombinationValid`, option `isValid` du moteur |
| Combinaison retenue | `Scenario.selectedCombinationKey` (déjà utilisable) |
| Anglais | `src/lib/i18n` (dictionnaire typé `Messages`) |
| Multi-devises | colonnes `currency` |
| API REST / mobile | réutiliser `src/server/data` + schémas Zod dans des route handlers |
| PDF / Excel | `calculateProposalSummary` fournit toutes les données |
| Multi-organisations | UUID partout ; ajout d'un `organizationId` filtré dans `src/server/data` |
