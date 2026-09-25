# SAPsolution

Modes opératoires, données de configuration et code ABAP pour SAP.

## Sujet 1 : Business Partner pour le suivi avant-vente et vente

| Document | Contenu |
|---|---|
| [docs/01-architecture-cible.md](docs/01-architecture-cible.md) | Ce qui relève du standard SAP et ce qui doit être développé (Z) |
| [docs/02-role-prospect.md](docs/02-role-prospect.md) | Mode opératoire : rôle Prospect (BUP002), adresses, langue, notes, pièces jointes, jalons, systèmes |
| [docs/03-role-client.md](docs/03-role-client.md) | Mode opératoire : rôle Client (FLCU00/FLCU01), vente directe ou via partenaire, vue projet |
| [docs/04-maintenance-parametrage.md](docs/04-maintenance-parametrage.md) | Mode opératoire : saisie des valeurs de paramétrage (SE54 / SM30) |
| [abap/ddic/](abap/ddic/) | Définitions des tables Z (syntaxe ADT `define table`) |

## Contexte (confirmé)

- **SAP S/4HANA on-premise**, avec accès à la SPRO et à ADT (Eclipse).
- Pas de SAP CRM ni de SAP Sales Cloud : le suivi avant-vente et projet est donc en tables Z.
- En vente indirecte, le **partenaire achète la prestation** : il est client (donneur d'ordre)
  et c'est lui qui est facturé.
- Les chemins SPRO sont donnés en anglais (langue de connexion EN).

## Règle de ce dépôt

Chaque point est classé :
- **[STANDARD]** : paramétrage SAP standard, sans développement.
- **[Z]** : développement spécifique nécessaire, car le standard ne couvre pas le besoin.
- **[À VALIDER]** : dépend de la version ou du périmètre, à vérifier sur votre système avant d'appliquer.
