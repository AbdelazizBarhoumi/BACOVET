# Traçabilité V3 — Pages Builder

Table de traçabilité : **qui** a touché **quoi** (page / widget / KPI), **quand**, et avec quelles données.

Chaque événement est enregistré dans une table dédiée `builder_activity_logs`. L'identité (utilisateur, IP, agent, horodatage) est **toujours** estampillée côté serveur : le client ne peut pas falsifier « qui » ni « quand ».

## Table `builder_activity_logs`

| Colonne | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK `users` nullable | Utilisateur authentifié (estampillé serveur) |
| `page_id` | FK `builder_pages` nullable | Page concernée |
| `page_slug` | string nullable | Slug dénormalisé (survit à la suppression de la page) |
| `page_name` | string nullable | Nom dénormalisé |
| `group_id` | FK `builder_page_groups` nullable | Groupe concerné |
| `widget_id` | string nullable | UID du widget builder |
| `widget_type` | string nullable | Un des 15 types : `kpi, gauge, sparkline, line, bar, pareto, donut, pie, radar, area, combo, table, table-grid, text, divider` |
| `kpi_code` | string nullable | `config.kpiCode` du widget ou codes KPI des cellules d'un `table-grid` (concaténés `,`) |
| `action` | string, indexé | Taxonomie ci-dessous |
| `detail` | json nullable | Diff / payload borné (clés modifiées, avant/après, coordonnées…) |
| `ip_address` | string nullable | Estampillé serveur |
| `user_agent` | string nullable | Estampillé serveur |
| `created_at` | timestamp | Estampillé serveur (pas de `updated_at`) |

## Taxonomie des actions

### Pages
| Action | Déclencheur |
|---|---|
| `page.create` | Création d'une page (`/v3`, sidebar) |
| `page.update` | Renommage / changement de slug / changement de groupe |
| `page.delete` | Suppression d'une page |
| `page.duplicate` | Duplication d'une page |
| `page.view` | Ouverture d'une page en lecture (`/p/{slug}`) |

### Widgets
| Action | Déclencheur |
|---|---|
| `widget.add` | Ajout depuis la palette (clic ou drag&drop) |
| `widget.move` | Déplacement sur le canevas / flèches clavier |
| `widget.resize` | Redimensionnement sur le canevas |
| `widget.config` | Modification de config (label, KPI, couleurs, cible…) — clés modifiées dans `detail.keys` |
| `widget.type_change` | Changement de type dans l'inspecteur |
| `widget.delete` | Suppression d'un widget |
| `widget.duplicate` | Duplication d'un widget |
| `widget.lock` / `widget.unlock` | Verrouillage / déverrouillage |
| `widget.z_front` / `widget.z_back` | Ordre d'empilement |

### Layout
| Action | Déclencheur |
|---|---|
| `layout.save` | Sauvegarde (bouton « Sauvegarder » ou PUT layout) — diff ajouté/supprimé/modifié + `kpi_codes` |
| `layout.reset` | Réinitialisation du layout |
| `layout.export` | Export JSON du layout |
| `layout.import` | Import JSON du layout |
| `undo` / `redo` | Annulation / rétablissement |

### Tableau libre (`table-grid`)
| Action | Déclencheur |
|---|---|
| `table.cell.edit` | Contenu / KPI / style d'une cellule (débouncé) |
| `table.row.add` / `table.col.add` | Insertion ligne / colonne |
| `table.row.delete` / `table.col.delete` | Suppression ligne / colonne |
| `table.row.move` / `table.col.move` | Déplacement ligne / colonne |
| `table.merge` / `table.unmerge` | Fusion / séparation de cellules |
| `table.resize` | Redimensionnement colonnes / lignes (débouncé) |
| `table.copy` / `table.paste` / `table.cut` | Presse-papiers |

### Données / lectures
| Action | Déclencheur |
|---|---|
| `kpi.refresh` | Bouton « Actualiser » de la barre d'outils (rafraîchissement manuel) |
| `kpi.detail_view` | Clic sur un widget KPI ou cellule liée à un KPI → fenêtre de détail |

### Groupes
| Action | Déclencheur |
|---|---|
| `group.create` | Création d'un groupe |
| `group.update` | Renommage d'un groupe |
| `group.delete` | Suppression d'un groupe |
| `group.assign_page` | Affectation / déplacement de page dans un groupe |
| `group.reorder_pages` | Réordonnancement des pages |
| `group.reorder_groups` | Réordonnancement des groupes |

### Mode
| Action | Déclencheur |
|---|---|
| `mode.edit` / `mode.view` | Bascule « Éditer » / « Vue » dans la barre d'outils |

> **Non tracé volontairement** : le polling automatique de 60 s des données KPI (`useKpiData`). C'est une machine qui poll, pas un « toucher » humain.

## Points de capture

### Côté serveur (autoritaire)
| Fichier | Méthode(s) | Actions |
|---|---|---|
| `app/Http/Controllers/Api/BuilderActivityController.php` | `store()` | Point d'entrée fire-and-forget `POST /api/builder-activity` — estampille `user_id`/`ip`/`agent`/`created_at` |
| `app/Http/Controllers/Api/BuilderPageController.php` | `store`, `update`, `destroy`, `duplicate` + helpers `logActivity()`, `diffLayouts()`, `widgetSummary()` | `page.*`, `layout.save` (avec diff) |
| `app/Http/Controllers/Api/BuilderPageGroupController.php` | toutes + helper `logActivity()` | `group.*` |

### Côté client
| Fichier | Capteur |
|---|---|
| `resources/js/lib/activity.ts` | `logActivity()` (débounce 800 ms par clé), `logWidgetActivity()`, `widgetKpiCodes()`, `setPageContext()` |
| `resources/js/components/builder/store.tsx` | Tous les mutateurs : `widget.*`, `undo`, `redo`, `layout.reset` |
| `resources/js/components/builder/toolbar.tsx` | `mode.*`, `kpi.refresh`, `layout.export`, `layout.import` |
| `resources/js/components/builder/dashboard-builder.tsx` | `page.view` au chargement (une fois) + `setPageContext` |
| `resources/js/components/builder/canvas.tsx` | `kpi.detail_view`, `table.*` (menu contextuel + clavier) |
| `resources/js/components/builder/inspector.tsx` | `table.cell.edit`, `table.*` (boutons structure) |

## Routes

| Méthode | URL | Accès |
|---|---|---|
| `POST` | `/api/builder-activity` | Tout utilisateur authentifié (capture fire-and-forget) |
| `GET` | `/api/builder-activity` | **IT uniquement** (`role:it`) — filtres `user_id, page_id, action, widget_type, kpi_code, from, to, q` + pagination |
| `GET` | `/v3/trace` | **IT uniquement** (`role:it`) — écran de traçabilité Inertia |

## Chaîne de données tracée (widget → KPI)

`widget.config.kpiCode` / `tableGrid.cells[].kpiCode`
→ collecté dans `canvas.tsx` (`useKpiData`) 
→ `GET /api/builder-kpis/data?codes=…` (`BuilderKpiController::data`)
→ table `kpi_data.computed_result` (`scalar_value`, `status`, `mapped_rows`, `computed_at`)

Les métadonnées de la palette (`fetchKpiList`) viennent de `GET /api/builder-kpis` (`BuilderKpiController::index`), agrégées depuis la table `data_mappings`.

## Filtres de l'écran `/v3/trace`

- Utilisateur, page, action, type de widget, date (Du/Au), recherche libre (`q` : page, slug, widget_id, kpi_code, action, nom d'utilisateur)
- Pagination 50 / page, rafraîchissement auto « Live » (10 s)
