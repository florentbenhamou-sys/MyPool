# 01 – Architecture cible : Business Partner avant-vente / vente

## Principe

Le Business Partner (BP) est une **donnée de base**. Il porte l'identité, les adresses, la langue,
les rôles et les données commerciales du client. Il n'est pas prévu pour stocker des **listes
d'événements** (jalons, ateliers, opérations de cutover), ni des **projets**.

Voici l'architecture recommandée :

```
                 ┌──────────────────────────────┐
                 │  Business Partner (transac. BP)│
                 │  Rôle BUP002 Prospect          │──► pièces jointes / notes (GOS)
                 │  Rôle FLCU00/FLCU01 Client     │──► partenaire intégrateur (fonction partenaire)
                 └──────────────┬───────────────┘
                                │ clé : numéro BP (BU_PARTNER)
        ┌───────────────────────┼─────────────────────────────┐
        ▼                       ▼                             ▼
 ZSAP_BP_EVENT            ZSAP_BP_SYSTEM                 ZSAP_PROJECT
 jalons datés             systèmes du client             projet client
 (contact, démo,          (liste, versions)              (abonnement, type de kit,
  soutenance, meeting…)                                   direct / via partenaire)
                                                                │
                                                                ▼
                                                        ZSAP_PROJECT_TASK
                                                        opérations de cutover, ateliers…
```

## Couverture du besoin

| Besoin | Solution | Type |
|---|---|---|
| Rôle Prospect | Rôle standard **BUP002** | [STANDARD] |
| Adresse, langue de communication | Données générales du BP (rôle 000000, onglet Adresse) | [STANDARD] |
| Zone de notes, texte long | Note GOS (« Services pour l'objet ») sur le BP | [STANDARD] |
| Pièce jointe (schéma d'architecture) | Pièce jointe GOS sur le BP | [STANDARD] |
| Dates multiples (contact, démo, soutenance, meeting…) | Table Z 1:n + table de types paramétrable | [Z] |
| Liste des systèmes du client | Table Z 1:n | [Z] |
| Rôle Client | Rôles **FLCU00** (comptabilité) et **FLCU01** (vente), via CVI | [STANDARD] |
| Client direct ou via un partenaire | Fonction partenaire dans la zone de vente + indicateur sur le projet | [STANDARD] + [Z] |
| Vue projet : abonnement (tranche), type de projet (Kit Premium/Light) | Table Z projet + tables de valeurs paramétrables | [Z] |
| Liste d'opérations (cutover), liste d'ateliers | Table Z de tâches liée au projet | [Z] |

### Pourquoi l'abonnement et le type de kit vont sur le projet et pas sur le BP

Un même client peut avoir plusieurs projets : un Kit Light puis un Kit Premium, ou un changement de
tranche d'abonnement. Si l'on stocke ces valeurs sur le BP, on perd l'historique et on ne peut
pas gérer deux projets en parallèle.

## Interface utilisateur des données Z : options

| Option | Avantage | Inconvénient |
|---|---|---|
| A. Application Fiori elements (RAP) sur les tables Z | Moderne, peu de code, liste et objet générés | Nécessite une version S/4HANA récente et le Fiori Launchpad |
| B. Écrans intégrés dans la transaction BP (BDT) | Tout est dans la transaction BP | Développement BDT lourd, à éviter pour des tables 1:n |
| C. Maintenance de table (SM30) | Très rapide à mettre en place | Ergonomie minimale, pas de vue « projet » |

Recommandation : **A**. Utiliser **C** en attendant, pour démarrer vite.
Le choix final dépend de votre version (voir les questions ouvertes).

## Questions ouvertes

1. Version exacte (ex. S/4HANA 2022, 2023) ? On-premise, RISE ou Public Cloud ?
   *En Public Cloud, il n'y a ni SPRO ni tables Z classiques : l'approche change complètement.*
2. Avez-vous SAP Sales Cloud (C4C) ou SAP CRM ? Si oui, leads, opportunités et activités sont
   standard.
3. Le partenaire intégrateur est-il **facturé par vous** (fournisseur) ou **facture-t-il le client
   final** (vous lui vendez, il est donc client) ?
4. La fin de votre message a été coupée (« Je veux… ») : quelle est la suite ?
