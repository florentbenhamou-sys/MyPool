# 02 – Mode opératoire : rôle Prospect

## 1. Groupement et tranche de numéros [STANDARD]

Objectif : donner aux prospects une tranche de numéros identifiable.

1. SPRO > *Cross-Application Components > SAP Business Partner > Business Partner > Basic Settings
   > Number Ranges and Groupings > Define Number Ranges*
   - Créer une tranche, par exemple `Z1` de `0090000000` à `0090999999`, en numérotation interne.
2. SPRO > *... > Number Ranges and Groupings > Define Groupings and Assign Number Ranges*
   - Créer un groupement `ZPRO` « Prospect » associé à la tranche `Z1`.

> Si les prospects deviennent clients avec le **même numéro** (recommandé), la tranche doit aussi
> être compatible avec la numérotation client de la CVI (voir 03, §1).

## 2. Rôle Prospect [STANDARD]

Le rôle **BUP002 – Prospect** est livré en standard. Vérifiez sa présence :

- SPRO > *Cross-Application Components > SAP Business Partner > Business Partner > Basic Settings >
  Business Partner Roles > Define BP Roles*

Aucune création n'est nécessaire. Ce rôle n'est **pas** lié à la CVI : il ne crée pas de client
SD/FI, ce qui est le comportement voulu pour un prospect.

## 3. Création d'un prospect (utilisateur) [STANDARD]

1. Transaction **BP** > *Organisation*.
2. *Créer en rôle BP* : **BUP002 Prospect**. Groupement : **ZPRO**.
3. Onglet **Adresse** : nom, rue, code postal, ville, pays.
4. Bloc **Communication** de l'adresse : champ **Langue** (langue de communication), téléphone,
   e-mail.
5. Enregistrer.

Pour une deuxième langue ou une adresse secondaire, utilisez l'onglet **Aperçu des adresses**,
qui permet plusieurs adresses avec leurs usages.

Pour les interlocuteurs, créez des BP *Personne* en rôle **BUP001 Contact Person**, puis la relation
*Is Contact Person For* depuis le prospect, dans l'onglet ou le bouton *Relations*.

## 4. Notes et texte long [STANDARD]

Dans la transaction BP, en affichage ou en modification du prospect :

- Icône **Services pour l'objet** (en haut à gauche) > *Créer* > **Créer une note**.
- Chaque note a un titre et un texte libre, et est datée et signée automatiquement.
- Consultation : *Services pour l'objet* > **Liste des pièces jointes**.

## 5. Pièce jointe : schéma d'architecture [STANDARD]

- Icône **Services pour l'objet** > *Créer* > **Créer une pièce jointe**, puis sélectionner le fichier.
- L'objet GOS du Business Partner est **BUS1006**.

> **[À VALIDER]** Par défaut, les pièces jointes GOS sont stockées dans la base SAP. Pour de gros
> volumes, faites paramétrer un Content Repository par votre équipe Basis.

## 6. Jalons datés (contact, démo, soutenance, meeting…) [Z]

Le BP standard ne permet pas une liste libre de dates typées. Il faut deux tables :

| Table | Rôle | Classe de livraison |
|---|---|---|
| `ZSAP_EVTTYPE` | Types de jalon (paramétrage) | C (customizing) |
| `ZSAP_BP_EVENT` | Jalons d'un BP, sans limite de nombre | A (application) |

Définitions : [../abap/ddic/zsap_evttype.tabl.acds](../abap/ddic/zsap_evttype.tabl.acds) et
[../abap/ddic/zsap_bp_event.tabl.acds](../abap/ddic/zsap_bp_event.tabl.acds).

Valeurs initiales proposées pour `ZSAP_EVTTYPE` :

| EVENT_TYPE | DESCRIPTION | SORT_ORDER |
|---|---|---|
| CONTACT | Prise de contact | 10 |
| DEMO | Démonstration | 20 |
| MEETING | Réunion | 30 |
| SOUTEN | Soutenance | 40 |
| PROPAL | Envoi de la proposition | 50 |
| DECISION | Décision client | 60 |

Chaque ligne de `ZSAP_BP_EVENT` contient : BP, type de jalon, date, statut (prévu ou réalisé),
interlocuteur et commentaire. Plusieurs démos ou meetings sont donc possibles, avec un historique
complet.

## 7. Liste des systèmes du client [Z]

Table `ZSAP_BP_SYSTEM` : BP, nom du système, éditeur, version, hébergement, rôle dans le SI, commentaire.
Définition : [../abap/ddic/zsap_bp_system.tabl.acds](../abap/ddic/zsap_bp_system.tabl.acds).

Le schéma d'architecture global reste une pièce jointe GOS sur le BP (§5).

## 8. Passage au rôle Client

Voir [03-role-client.md](03-role-client.md). On **ajoute** les rôles client au même BP. Le numéro,
les notes, les pièces jointes et les jalons sont conservés.
