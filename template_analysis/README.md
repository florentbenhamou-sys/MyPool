# Analyse et génération du template « Fiche d'exercice »

Chaîne de travail : `template.pptx` → analyse → `template_definition.json` → nouvelles fiches au même format.

| Fichier | Rôle |
|---|---|
| `ANALYSE_TEMPLATE.md` | Analyse complète en 13 sections (géométrie, grille, typographie, palette, GENERATION_RULES, incertitudes) |
| `output/template_definition.json` | Définition du template lisible par une machine (zones, composants, relations, règles, capacités de génération) |
| `output/raw_dump.json` | Extraction brute et exhaustive du XML (34 formes) |
| `output/render.png` / `render_annotated.png` | Rendu de la slide, et le même rendu avec boîtes, coordonnées, zones et axes |
| `output/generated/` | Exemples générés (`roundtrip` = contenu d'origine, `examples` = 2 nouvelles fiches) avec leurs rendus et rapports d'avertissements |
| `fixtures/` | Le template fourni + contenus JSON d'exemple + schéma synthétique |
| `tools/dump_slide.py` | Extraction exhaustive d'une slide : géométrie, couleurs de thème résolues, ombres, textes, tableaux, images |
| `tools/annotate.py` | Rendu annoté |
| `tools/generate_slides.py` | Génération : définition + contenu → `.pptx` (clonage de la slide, remplissage par nom de forme, contrôle de débordement) |
| `tests/test_template.py` | Tests (analyse et génération) |

## Utilisation

```bash
cd template_analysis
python3 tools/dump_slide.py fixtures/TemplateSeance.pptx > output/raw_dump.json
python3 tools/generate_slides.py fixtures/TemplateSeance.pptx output/template_definition.json \
        fixtures/content_examples.json mes_fiches.pptx      # écrit aussi mes_fiches.pptx.report.json
python3 -m pytest -q tests
```

Dépendances : `python-pptx`, `lxml`, `Pillow` (et `pytest` pour les tests). Pour un rendu fidèle, installer la police **Roboto** : sans elle, LibreOffice la remplace et certains textes passent à la ligne (par exemple « Echauffemen/t »).

## Format du contenu

Un objet JSON par fiche, ou `{"sheets": [...]}` pour plusieurs fiches :

```json
{
  "category": "Technique", "moment": "Echauffement", "title": "Créer et utiliser les espaces",
  "space": ["**Surface** : ", "12x12", "3 carrés"],
  "teams": {"black": "x joueurs", "red": 6, "blue": 6, "yellow": 6},
  "duration": ["Le temps total 15 minutes", "6 séquences de 2 minutes"],
  "goal": ["En conservation", "10 passes = 1pt"],
  "rules": ["4vs2", "jeu au sol obligatoire"],
  "variables": {"Complexifiantes": ["limiter les touches"], "Simplifiantes": ["Agrandir le terrain"]},
  "behaviours": ["Voir avant de recevoir grâce à la prise d'information."],
  "diagram": "schema.png", "diagram_alt": "…", "notes": "notes du présentateur"
}
```

`**texte**` met le texte en gras. Un champ absent est laissé vide et signalé dans le rapport, jamais inventé.
