# 03 – Mode opératoire : rôle Client et vue projet

## 1. Rôles client et CVI [STANDARD]

En S/4HANA, le client SD/FI (tables KNA1, KNB1, KNVV) est créé via la **Customer/Vendor
Integration (CVI)** quand on ajoute au BP les rôles :

| Rôle | Usage |
|---|---|
| **FLCU00** | Client comptable : données société (compte collectif, conditions de paiement) |
| **FLCU01** | Client vente : données zone de vente (devise, incoterms, fonctions partenaires) |

Paramétrage à vérifier ou compléter :

1. SPRO > *Cross-Application Components > Master Data Synchronization > Customer/Vendor Integration
   > Business Partner Settings > Settings for Customer Integration > Set BP Role Category for
   Direction BP to Customer*
   - FLCU00 et FLCU01 doivent y figurer. BUP002 ne doit **pas** y figurer, car un prospect ne crée
     pas de client.
2. SPRO > *... > Settings for Customer Integration > Field Assignment for Customer Integration >
   Assign Keys > Define Number Assignment for Direction BP to Customer*
   - Associer le groupement BP `ZPRO` à un groupe de comptes client, cocher **Même numéro**.
   - La tranche du groupe de comptes client doit être **externe** et couvrir la même plage
     que la tranche BP (`0090000000`–`0090999999`).

### Conversion prospect vers client (utilisateur)

1. Transaction **BP** > ouvrir le prospect > *Modifier*.
2. Changer le rôle affiché vers **FLCU00**, saisir la société et les données comptables. Enregistrer.
3. Changer le rôle affiché vers **FLCU01**, saisir la zone de vente, puis les onglets Commandes,
   Expédition, Facturation et Partenaires. Enregistrer.

Le BP garde BUP002 en historique. Vous pouvez le laisser (traçabilité) ou le supprimer du BP.

## 2. Client direct ou via un partenaire [STANDARD + Z]

### 2a. Rattacher le partenaire au client (fonction partenaire) [STANDARD]

1. Créer le partenaire (intégrateur) comme BP :
   - s'il **vous achète** (il facture ensuite le client final) : rôles FLCU00/FLCU01 ;
   - s'il est **votre sous-traitant** (vous le payez) : rôles fournisseur FLVN00/FLVN01.
2. Créer une fonction partenaire, par exemple `ZI` « Partenaire intégrateur » :
   SPRO > *Sales and Distribution > Basic Functions > Partner Determination > Set Up Partner
   Determination > Set Up Partner Determination for Customer Master*
   - Fonction partenaire `ZI`, type de partenaire **KU** (partenaire client) ou **LI** (partenaire
     fournisseur), selon le cas précédent.
   - L'ajouter à la procédure de détermination de partenaires du groupe de comptes utilisé.
3. Côté utilisateur : BP > rôle FLCU01 > zone de vente > onglet **Partenaires** > ajouter la
   fonction `ZI` avec le numéro du partenaire.

### 2b. Indicateur Direct / Indirect [Z]

Le mode de vente dépend du **projet** : un client peut être direct sur un projet et passer par un
partenaire sur un autre. On le stocke donc dans `ZSAP_PROJECT-SALES_CHANNEL` (`D` = direct,
`P` = via partenaire), avec `PARTNER_BP` qui pointe sur le BP du partenaire.

## 3. Vue projet [Z]

### Tables

| Table | Contenu | Classe |
|---|---|---|
| `ZSAP_SUBSCR` | Tranches d'abonnement (ex. `T1000` = [1000 – 2000]) | C |
| `ZSAP_PRJTYPE` | Types de projet (`PREMIUM` = Kit Premium, `LIGHT` = Kit Light) | C |
| `ZSAP_PROJECT` | En-tête projet : client, canal, partenaire, abonnement, type, dates, statut | A |
| `ZSAP_TASKTYPE` | Types de tâche (`CUTOVER`, `ATELIER`, `FORMATION`…) | C |
| `ZSAP_PROJECT_TASK` | Lignes du projet : opérations de cutover, ateliers… | A |

Les définitions sont dans [../abap/ddic/](../abap/ddic/).

### Valeurs proposées

`ZSAP_SUBSCR` :

| SUBSCR_TIER | LOW_VALUE | HIGH_VALUE | DESCRIPTION |
|---|---|---|---|
| T0000 | 0 | 999 | Tranche [0 – 999] |
| T1000 | 1000 | 2000 | Tranche [1000 – 2000] |
| T2000 | 2001 | 5000 | Tranche [2001 – 5000] |

> L'unité de la tranche (utilisateurs, transactions, €…) n'est pas précisée dans votre besoin : à
> compléter dans le libellé.

`ZSAP_PRJTYPE` : `PREMIUM` Kit Premium, `LIGHT` Kit Light.

`ZSAP_TASKTYPE` : `CUTOVER` Opération de cutover, `ATELIER` Atelier, `FORMATION` Formation,
`RECETTE` Recette.

### Lignes de tâche (cutover et ateliers)

Chaque ligne de `ZSAP_PROJECT_TASK` contient :
- un numéro d'ordre (`SEQ_NO`), pour dérouler un plan de cutover dans l'ordre ;
- le type (cutover, atelier…), le libellé et le responsable ;
- une date et une heure de début et de fin prévues, et une date et une heure réelles ;
- un statut (`O` ouvert, `E` en cours, `T` terminé, `A` annulé) et un commentaire.

Une seule table sert aux ateliers et au cutover, avec un filtre par type. Si vous voulez des
champs vraiment différents par type (par exemple *go/no-go* ou *rollback* pour le cutover), on
passera à deux tables.
