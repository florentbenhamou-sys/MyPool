# Tables DDIC

Sources au format ADT (Eclipse) : *New > Other ABAP Repository Object > Dictionary > Database
Table*, puis coller le contenu du fichier `.acds` correspondant, et activer.

| Table | Classe | Contenu |
|---|---|---|
| ZSAP_EVTTYPE | C | Types de jalon |
| ZSAP_BP_EVENT | A | Jalons datés d'un BP |
| ZSAP_BP_SYSTEM | A | Systèmes du client |
| ZSAP_SUBSCR | C | Tranches d'abonnement |
| ZSAP_PRJTYPE | C | Types de projet (Kit Premium / Light) |
| ZSAP_TASKTYPE | C | Types de tâche (cutover, atelier…) |
| ZSAP_PROJECT | A | En-tête projet |
| ZSAP_PROJECT_TASK | A | Tâches du projet |

Remarques :
- Les clés techniques sont des UUID (`SYSUUID_X16`), le format attendu par une application RAP
  gérée (option A du document 01). Elles sont alimentées par l'application, pas saisies.
- Les libellés des tables de paramétrage ne sont pas traduisibles (pas de table de textes).
  Si vous travaillez en plusieurs langues de connexion, il faudra ajouter des tables de textes.
- Contrôles de valeurs (types, tranches, statut) : ils seront portés par la couche applicative
  (validations RAP), à livrer à l'étape suivante.
- Préfixe `Z` : à adapter si votre système impose un namespace (`/XXX/`) ou une autre convention.

Valeurs des codes (à porter en validations RAP) :

| Champ | Valeurs |
|---|---|
| ZSAP_BP_EVENT-STATUS | P prévu, R réalisé, A annulé |
| ZSAP_BP_SYSTEM-HOSTING | texte libre (ex. On-premise, Cloud, Hybride) |
| ZSAP_PROJECT-SALES_CHANNEL | D direct, P via partenaire (renseigner PARTNER_BP) |
| ZSAP_PROJECT-STATUS, ZSAP_PROJECT_TASK-STATUS | O ouvert, E en cours, T terminé, A annulé |
