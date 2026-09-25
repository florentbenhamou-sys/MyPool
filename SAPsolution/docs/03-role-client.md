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

### 2a. Le partenaire est client (il achète la prestation) [STANDARD]

Le partenaire vous achète la prestation et la revend au client final. Dans SAP :

| | Vente directe | Vente via partenaire |
|---|---|---|
| Donneur d'ordre et facturé (commande, facture) | Client final | **Partenaire** |
| Client final | Donneur d'ordre | Rattaché au partenaire et au projet |

1. Créer le partenaire comme un BP *Organisation* avec les rôles **FLCU00** et **FLCU01**, comme
   n'importe quel client (voir §1). C'est lui que l'on saisit comme donneur d'ordre dans les
   commandes des projets indirects.
2. Créer une fonction partenaire `ZI` « Partenaire intégrateur », de type **KU** (client) :
   SPRO > *Sales and Distribution > Basic Functions > Partner Determination > Set Up Partner
   Determination > Set Up Partner Determination for Customer Master*
   - Définir la fonction partenaire `ZI`, type de partenaire `KU`.
   - L'ajouter, non obligatoire, à la procédure de détermination de partenaires du groupe de
     comptes du client final.
3. Côté utilisateur : BP du **client final** > rôle FLCU01 > zone de vente > onglet
   **Partenaires** > ajouter `ZI` avec le numéro BP du partenaire.
   - Le partenaire doit avoir le rôle FLCU01 **dans la même zone de vente**, sinon la saisie
     est refusée.

Conséquence : le client final n'a besoin des rôles FLCU00/FLCU01 que s'il est aussi facturé en
direct, ou pour porter la fonction `ZI` dans sa zone de vente. Un client final uniquement indirect
peut rester en BUP002 : le lien avec le partenaire se fait alors seulement par le projet
(`ZSAP_PROJECT-PARTNER_BP`, §2b).

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
