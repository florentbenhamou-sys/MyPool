# SAPsolution

Modes opératoires, données de configuration et code ABAP pour SAP.

## Sujet 1 : Business Partner pour le suivi avant-vente et vente

| Document | Contenu |
|---|---|
| [docs/01-architecture-cible.md](docs/01-architecture-cible.md) | Ce qui relève du standard SAP et ce qui doit être développé (Z) |
| [docs/02-role-prospect.md](docs/02-role-prospect.md) | Mode opératoire : rôle Prospect (BUP002), adresses, langue, notes, pièces jointes, jalons, systèmes |
| [docs/03-role-client.md](docs/03-role-client.md) | Mode opératoire : rôle Client (FLCU00/FLCU01), vente directe ou via partenaire, vue projet |
| [abap/ddic/](abap/ddic/) | Définitions des tables Z (syntaxe ADT `define table`) |

## Hypothèses (à confirmer)

- **SAP S/4HANA on-premise** (ou RISE private edition), avec accès à la SPRO et à ADT (Eclipse).
- Pas de SAP CRM ni de SAP Sales Cloud : si l'un d'eux est disponible, leads, opportunités et
  activités y existent en standard et une grande partie des développements Z deviennent inutiles.
- Les chemins SPRO sont donnés en anglais (langue de connexion EN).

## Règle de ce dépôt

Chaque point est classé :
- **[STANDARD]** : paramétrage SAP standard, sans développement.
- **[Z]** : développement spécifique nécessaire, car le standard ne couvre pas le besoin.
- **[À VALIDER]** : dépend de la version ou du périmètre, à vérifier sur votre système avant d'appliquer.
