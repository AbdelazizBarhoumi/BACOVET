# Statut de traduction V5 (FR)

Tableau de bord de la traduction français (FR) de l'éditeur V5 (« Constructeur de Pages »).

**Règle appliquée** : toutes les chaînes affichées à l'utilisateur (libellés, placeholders, `aria`/`title`, toasts, en-têtes) sont traduites en français. Les clés internes, identifiants, endpoints API, valeurs de données et commentaires techniques restent en anglais.

**Décisions validées** :
- La marque `Pages Builder` est traduite en « Constructeur de Pages ».
- `components/pbi/` + `lib/pbi/` sont exclusivement utilisés par V5 (V6 ne les importe jamais) → traduits intégralement.
- Le dossier `resources/js/components/v5/` contient un seul fichier : `ShareDialog.tsx`.

---

## Légende

| Statut | Signification |
|--------|---------------|
| ✅ | Aucune chaîne anglaise restante (affichage) |
| ⚠️ | Traduit, restent des éléments anglais ponctuels ou délibérément conservés |
| ➖ | Hors périmètre (pas de chaîne d'affichage / logique pure) |

---

## Pages V5

| Fichier | Statut | Remarques |
|---------|--------|-----------|
| `resources/js/pages/v5/page-builder.tsx` | ✅ | `Constructeur de Pages V5` (Head + H1) |
| `resources/js/pages/v5/login.tsx` | ✅ | `Constructeur de Pages V5` ; compte démo `Super administrateur` |
| `resources/js/pages/v5/trace.tsx` | ✅ | `Traçabilité — Constructeur de Pages`, `Live` → `En direct`, placeholder `page, KPI, utilisateur…` |
| `resources/js/pages/v5/p/[slug].tsx` | ✅ | Mode d'interaction : `Filtre` / `Surbrillance` / `Aucune` (valeurs `value` conservées) |

## Composants `components/v5/`

| Fichier | Statut | Remarques |
|---------|--------|-----------|
| `resources/js/components/v5/ShareDialog.tsx` | ✅ | Déjà en français |

## Components `components/pbi/` (éditeur V5)

| Fichier | Statut | Remarques |
|---------|--------|-----------|
| `resources/js/components/pbi/CartesianFormat.tsx` | ✅ | Unités, positions, contenus de libellés, styles, icônes de grille, légende, sections |
| `resources/js/components/pbi/formatControls.tsx` | ✅ | Polices, alignements, `Formater la chaîne`, `Choisir une couleur`, sections Général/Titre |
| `resources/js/components/pbi/ConditionalFormatDialog.tsx` | ✅ | Styles/conditions/valeurs/agrégations, règles, barres de données, boutons |
| `resources/js/components/pbi/GaugeFormat.tsx` | ✅ | Informations affichées, titres de sections, libellés |
| `resources/js/components/pbi/SingleValueFormat.tsx` | ✅ | Unités d'affichage, valeur d'appel, étiquette de catégorie, section Général |
| `resources/js/components/pbi/Panes.tsx` | ✅ | Texte, Image URL, Choisir un fichier, Forme, Couleur de contour, Rotation, Rayon de coin, Largeur/Hauteur, Nombre max de catégories, affichage, bloc texte/image (Contenu, Police, Famille de police, Taille, Couleur, Style de police, Alignement, URL de l'image, Texte alternatif), dossier `Other` → « Autre » (clé interne conservée) |
| `resources/js/components/pbi/ExportSurface.tsx` | ✅ | `Blank page` → `Page vide` |
| `resources/js/components/pbi/VisualView.tsx` | ✅ | 3 états vides → français ; narration `Récit intelligent`/`Facteurs principaux` (totalise, sur … lignes dans le contexte de filtre actuel, % du total, résumé auto, facteurs → hausse) |
| `resources/js/components/pbi/Canvas.tsx` | ✅ | Déjà en français |
| `resources/js/components/pbi/GaugeVisual.tsx`, `FullscreenView.tsx`, `VisualExportButton.tsx`, `ExportMenu.tsx`, `Ribbon.tsx`, `IconPicker.tsx` | ✅ | Déjà en français |
| `resources/js/components/pbi/Dialogs.tsx` | ✅ | Autocomplétion DAX (`Fonctions`, `Jeux de données`, `Colonnes et mesures`), messages de validation du signe `=`, badge `Intégrée` |
| `resources/js/components/pbi/CfIcon.tsx` | ✅ | Repli `Icônes` (si un jeu d'icônes sans libellé) |

## Logique `lib/pbi/`

| Fichier | Statut | Remarques |
|---------|--------|-----------|
| `resources/js/lib/pbi/icons.ts` | ✅ | Labels de `CF_ICON_SETS` (~150) → français (id/unicode/fluent/color conservés) |
| `resources/js/lib/pbi/store.tsx` | ✅ | Noms par défaut : `Zone de texte`, `Texte`, `Bouton` |
| `resources/js/lib/pbi/model.ts` | ✅ | `Other` → `Autre`, `Yes`/`No` → `Oui`/`Non` |
| `resources/js/lib/pbi/themes.ts`, `shapes.tsx`, `joins.ts`, `graph.ts`, `filters.ts`, `dax.ts`, `datasets.ts`, `visualConfig.ts`, `uploadImage.ts`, `conditionalFormat.ts`, `exportRender.ts`, `exportData.ts` | ➖ | Logique / données — pas de chaîne d'affichage à traduire |

## Tests mis à jour

| Fichier | Remarques |
|---------|-----------|
| `resources/js/lib/pbi/model.test.ts` | `Oui`/`Non` |
| `resources/js/lib/pbi/charts.test.ts` | Cas `Autre` |

## Notes / restant éventuel

- Vérifier le backend V5 (routes, contrôleurs passant des messages/labels en anglais) — non recensé dans ce document.
- Le format `/format` exécute prettier (`npm run format`), `npm run types` = `tsc --noEmit`, `npm run test` = vitest.