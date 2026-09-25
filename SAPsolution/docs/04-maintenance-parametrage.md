# 04 – Mode opératoire : saisie des tables de paramétrage (SE54 / SM30)

Les 4 tables de paramétrage (classe de livraison C) se saisissent en SM30, une fois le générateur
de maintenance créé :

| Table | Contenu |
|---|---|
| ZSAP_EVTTYPE | Types de jalon (contact, démo, soutenance…) |
| ZSAP_SUBSCR | Tranches d'abonnement |
| ZSAP_PRJTYPE | Types de projet (Kit Premium / Kit Light) |
| ZSAP_TASKTYPE | Types de tâche (cutover, atelier…) |

Prérequis : les tables sont activées (voir [../abap/ddic/README.md](../abap/ddic/README.md)).
Elles sont déclarées avec `@AbapCatalog.dataMaintenance : #ALLOWED`, ce qui autorise SM30.

## 1. Générer la maintenance (développeur, une fois par table)

1. Transaction **SE54** > saisir le nom de la table, par exemple `ZSAP_EVTTYPE` >
   *Generated Objects* > **Create/Change**.
2. Renseigner :
   - **Authorization Group** : `&NC&` (sans groupe), ou votre groupe d'autorisation.
   - **Function group** : `ZSAP_MAINT`, le même pour les 4 tables.
   - **Maintenance type** : *One step*.
   - **Maint. Screen No.** : bouton **Find Scr. Number(s)**, puis accepter la proposition.
   - **Recording routine** : *Standard recording routine*, pour que les saisies partent dans un
     ordre de transport customizing.
3. Bouton **Create**, puis sélectionner un ordre de transport (workbench).
4. Recommencer pour les 3 autres tables.

## 2. Saisir les valeurs (consultant fonctionnel)

1. Transaction **SM30** > nom de la table > **Maintain**.
2. *New Entries*, saisir les lignes, enregistrer, puis choisir un **ordre customizing**.
3. Transporter l'ordre vers la qualification et la production, comme tout paramétrage.

Valeurs proposées :

**ZSAP_EVTTYPE**

| EVENT_TYPE | DESCRIPTION | SORT_ORDER |
|---|---|---|
| CONTACT | Prise de contact | 010 |
| DEMO | Démonstration | 020 |
| MEETING | Réunion | 030 |
| SOUTEN | Soutenance | 040 |
| PROPAL | Envoi de la proposition | 050 |
| DECISION | Décision client | 060 |

**ZSAP_SUBSCR** (unité à préciser dans le libellé)

| SUBSCR_TIER | LOW_VALUE | HIGH_VALUE | DESCRIPTION |
|---|---|---|---|
| T0000 | 0 | 999 | Tranche [0 – 999] |
| T1000 | 1000 | 2000 | Tranche [1000 – 2000] |
| T2000 | 2001 | 5000 | Tranche [2001 – 5000] |

**ZSAP_PRJTYPE**

| PROJECT_TYPE | DESCRIPTION |
|---|---|
| PREMIUM | Kit Premium |
| LIGHT | Kit Light |

**ZSAP_TASKTYPE**

| TASK_TYPE | DESCRIPTION |
|---|---|
| CUTOVER | Opération de cutover |
| ATELIER | Atelier |
| FORMATION | Formation |
| RECETTE | Recette |

## Et les tables de données (jalons, systèmes, projets, tâches) ?

Elles ne se saisissent **pas** en SM30. Leur clé est un UUID technique, impossible à saisir à la main,
et elles sont déclarées `#RESTRICTED`. Elles seront alimentées par l'application Fiori (RAP),
prochaine étape, qui dépend de votre release exacte.
