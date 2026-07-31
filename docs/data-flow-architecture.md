# Data Flow Architecture — BACOVET

> Vue d'ensemble du flux de données depuis la source Novacity jusqu'à l'affichage dans le Page Builder (V3) et les pages V1/V2.

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Types de données et schémas](#2-types-de-données-et-schémas)
3. [Toutes les façons dont un utilisateur peut sauvegarder des données](#3-toutes-les-façons-dont-un-utilisateur-peut-sauvegarder-des-données)
4. [Flux de synchronisation (Novacity → KPI Data)](#4-flux-de-synchronisation-novacity--kpi-data)
5. [Pipeline de calcul des KPI](#5-pipeline-de-calcul-des-kpi)
6. [Comportements selon les configurations — exemples réels](#6-comportements-selon-les-configurations--exemples-réels)
7. [Flux Page Builder (V3)](#7-flux-page-builder-v3)
8. [Widgets et utilisation des données KPI](#8-widgets-et-utilisation-des-données-kpi)
9. [Gestion des filtres et cibles](#9-gestion-des-filtres-et-cibles)
10. [Pages V1/V2 (legacy)](#10-pages-v1v2-legacy)

---

## 1. Architecture générale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NOVACITY API SERVER                          │
│  (ERP / MES — données production, qualité, logistique, méthodes)    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP GET (avec x-api-key)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Sync Layer (Backend Laravel)                     │
│                                                                      │
│  Commands: SyncNovacityProduction, SyncNovacityQuality,               │
│            SyncNovacityLogistics, SyncNovacityFull                    │
│  Jobs:     SyncKpiEndpointJob                                         │
│  Services: SyncService, KpiEndpointService, NovacityService           │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │ SyncService  │───▶│ KpiEndpoint  │───▶│ KpiResultComputer     │  │
│  │ (field map)  │    │ Service      │    │ (pre-compute formula)  │  │
│  └─────────────┘    └──────┬───────┘    └───────────┬────────────┘  │
│                            │                        │                │
└────────────────────────────┼────────────────────────┼────────────────┘
                             ▼                        ▼
              ┌─────────────────────────┐  ┌─────────────────────┐
              │    kpi_data table        │  │ computed_result     │
              │    (response_data,       │  │ (scalar_value,      │
              │     computed_data)       │  │  status,            │
              └──────────┬──────────────┘  │  mapped_rows,       │
                         │                 │  filter_options)     │
                         │                 └──────────┬──────────┘
                         ▼                            ▼
              ┌────────────────────────────────────────────────────┐
              │               API Layer                             │
              │  GET /api/builder-kpis        → KPI definitions    │
              │  GET /api/builder-kpis/data    → computed_results   │
              │  CRUD /data-mappings           → data_mappings      │
              │  CRUD /api/builder-pages       → builder_pages      │
              └────────────────────┬───────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  V1/V2 Pages     │  │  V3 Page Builder │  │  V1 Data Page    │
  │  (qualité,       │  │  (drag & drop    │  │  (/v1/data)      │
  │   production,    │  │   dashboard)     │  │  (mapping KPI)   │
  │   logistique...)  │  │  /v3 /p/{slug}   │  │                  │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Types de données et schémas

### 2.1 Base de données — `data_mappings`

Table centrale de définition des KPI. Chaque KPI peut avoir **plusieurs lignes** (une par variable).

| Champ | Type | Description | Valeurs possibles |
|-------|------|-------------|-------------------|
| `id` | int (PK) | | |
| `kpi` | string | Code KPI | `F-REQ-205`, `F-REQ-101`, ... |
| `name` | string | Nom affiché | `"WIP"`, `"RFT"` |
| `variable` | string | Identifiant de la variable | `"en_cours"`, `"rendement"` |
| `endpoint` | string? | Chemin API Novacity | `"api/data/wip_chaine"`, `null` |
| `variable_type` | enum | Mode d'extraction | `"Direct"`, `"Complex"` |
| `variable_key` | string | Clé JSON dans la réponse | `"WIP_Chaine"`, `"Qtte"` |
| `is_filtered` | bool | Activer le filtrage ? | `true`, `false` |
| `filter_key` | string | Colonne de filtrage | `"ProdGroup"`, `"EmployeeNo"` |
| `filter_value` | string | Valeur de filtre par défaut | `"CH01"` |
| `has_function` | bool | Activer l'agrégation ? | `true`, `false` |
| `fn` | enum | Fonction d'agrégation | `"Latest"`, `"First"`, `"Sum"`, `"Average"`, `"Min"`, `"Max"`, `"Count"` |
| `modules` | JSON | Modules associés | `["production"]`, `["quality","production"]` |
| `formula` | JSON | Formule arithmétique | `{ items: [...] }` |
| `highlight_color` | string? | Couleur de surbrillance | `"#ff0000"` |
| `cible_operator` | string | Opérateur de cible | `"<="`, `">="`, `"<"`, `">"`, `"="` |
| `cible_value` | float? | Valeur cible | `95`, `85.5` |
| `cible_is_percentage` | bool | Cible en % ? | `true`, `false` |
| `refresh_frequency` | enum | Fréquence de synchro | `"instant"`, `"daily"`, `"weekly"`, `"monthly"`, `"yearly"` |
| `graph_types` | JSON | Types de graphiques | `["Big Number avec couleur"]` |
| `chart_config` | JSON | Config spécifique au graphique | `{ pareto: { label_key, value_key } }` |
| `extra_filters` | JSON | Filtres supplémentaires | `[{ filter_key, label, source_variable_index }]` |
| `notes` | text | Notes libres | |
| `user_id` | int? | Utilisateur | |

#### Formula — structure JSON

```json
{ "items": [
  { "type": "variable", "ref": 12, "label": "Quantité produite" },
  { "type": "operator", "op": "/" },
  { "type": "variable", "ref": 13, "label": "Temps standard" },
  { "type": "operator", "op": "*" },
  { "type": "number", "value": 100 }
] }
```

Types d'items : `"variable"`, `"operator"`, `"number"`, `"lparen"`, `"rparen"`

### 2.2 Base de données — `kpi_data`

Table des données synchronisées et pré-calculées.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int (PK) | |
| `kpi_code` | string | Référence à `data_mappings.kpi` |
| `endpoint` | string | Chemin API |
| `variable_key` | string | Clé JSON extraite |
| `variable_type` | string | `"Direct"` ou `"Complex"` |
| `refresh_frequency` | string | Cadence de synchro |
| `response_data` | JSON | Données brutes de l'API : `{ raw: [...], extracted: ... }` |
| `computed_data` | JSON | Données intermédiaires : `{ value, variable_key, fn, is_filtered, ... }` |
| `computed_result` | JSON | **Résultat pré-calculé** (voir ci-dessous) |
| `last_status` | string | `"ok"`, `"error"`, `"pending"` |
| `last_error` | text | Message d'erreur |
| `last_synced_at` | datetime | |
| `last_valid_synced_at` | datetime | |

#### computed_result — structure JSON

```json
{
  "scalar_value": 87.5,
  "status": "green",
  "mapped_rows": [
    { "ProdGroup": "CH01", "value": 92.1 },
    { "ProdGroup": "CH02", "value": 85.3 }
  ],
  "filter_options": {
    "ProdGroup": ["CH01", "CH02", "CH03"]
  },
  "computed_at": "2026-07-30T10:00:00+00:00"
}
```

### 2.3 Base de données — `builder_pages`

Stockage des pages créées dans le Page Builder.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int (PK) | |
| `slug` | string (unique) | Slug URL |
| `name` | string | Nom de la page |
| `layout` | JSON | Tableau de widgets (la page entière) |
| `group_id` | int? | FK vers `builder_page_groups` |
| `sort_order` | int | |

### 2.4 Config PHP — `config/data-mappings.php`

Définition statique des KPI par module. Structure par module :

```php
'production' => [
  'kpis' => [
    [
      'kpi' => 'F-REQ-205',
      'name' => 'WIP',
      'variables' => [
        [
          'variable' => 'En cours',
          'endpoint' => 'api/data/wip_chaine',
          'variable_type' => 'Complex',
          'variable_key' => 'WIP_Chaine',
          'is_filtered' => true,
          'filter_key' => 'ProdGroup',
          'has_function' => true,
          'fn' => 'Sum',
        ],
      ],
      'formula' => null,
      'graph_types' => ['Big Number avec couleur'],
      'target' => ['operator' => '<=', 'value' => 500],
    ],
  ],
],
```

### 2.5 Config PHP — `config/endpoints.php`

Définition statique des endpoints API et des clés à extraire. Structure :

```php
'api/data/wip_chaine' => [
  'refresh_frequency' => 'instant',
  'keys' => [
    [
      'variable_key' => 'WIP_Chaine',
      'variable_type' => 'Complex',
      'is_filtered' => true,
      'filter_key' => 'ProdGroup',
      'has_function' => true,
      'fn' => 'Sum',
      'kpis' => ['F-REQ-205'],
    ],
  ],
],
```

### 2.6 Types TypeScript

#### KPI Data (côté frontend)

```typescript
interface KpiResult {
  scalar_value: number | null;       // Valeur calculée du KPI
  status: string;                    // "green" | "orange" | "red" | "grey"
  mapped_rows: Record<string, unknown>[] | null;  // Lignes pour graphiques
  filter_options: Record<string, string[]>;       // Options de filtre disponibles
  computed_at: string | null;        // Timestamp du calcul
}

type KpiDataMap = Map<string, KpiResult>;
```

#### Page Builder — Widget

```typescript
type WidgetType =
  | "kpi" | "gauge" | "sparkline" | "line" | "bar" | "pareto"
  | "donut" | "pie" | "radar" | "area" | "combo"
  | "table" | "table-grid" | "text" | "divider";

interface Widget {
  id: string;
  type: WidgetType;
  x: number; y: number; w: number; h: number;
  locked?: boolean;
  config: WidgetConfig;
}

interface WidgetConfig {
  kpiCode?: string;
  tableGrid?: TableGrid;
  label?: string;
  unit?: string;
  decimals?: number;
  target?: number;
  accent?: string;
  showTarget?: boolean;
  showLabel?: boolean;
  showSparkline?: boolean;
  showKpiCode?: boolean;
  bg?: string;
  fg?: string;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  // + 50+ propriétés de style (padding, margin, border, font, etc.)
}
```

---

## 3. Toutes les façons dont un utilisateur peut sauvegarder des données

### 3.1 Page de mapping KPI (`/v1/data`)

La page `/v1/data` est un éditeur tableur complet avec **25 colonnes** pour configurer les KPI.

| # | Action | Mécanisme | Comportement |
|---|--------|-----------|--------------|
| 1 | **Modifier une cellule** | Édition inline | `dirtyIds` → debounce 500ms → `POST /data-mappings/batch` |
| 2 | **Ajouter une ligne** | Bouton "Add Row" | Crée une ligne vide avec KPI `F-REQ-XXX`, ajoute au `dirtyIds` |
| 3 | **Supprimer une ligne** | Icône poubelle | `DELETE /data-mappings/{id}` + audit log |
| 4 | **Ajouter une variable** | Bouton "Add Variable" dans le champ Name | Duplique la ligne du même KPI avec un nouveau nom de variable |
| 5 | **Changer l'endpoint** | EndpointSelector dropdown | Met à jour `endpoint`, recharge l'aperçu JSON |
| 6 | **Changer la clé JSON** | NestedKeySelector cascading | Parcourt la structure JSON de la réponse |
| 7 | **Configurer le type** | Dropdown Direct/Complex | Affecte le mode d'extraction |
| 8 | **Activer/désactiver le filtre** | Checkbox "Filtré ?" | Met à jour `is_filtered` |
| 9 | **Définir la clé de filtre** | Dropdown de clés JSON | Sélectionne la colonne de filtrage |
| 10 | **Définir la valeur de filtre** | Champ texte | Valeur par défaut du filtre |
| 11 | **Activer/désactiver l'agrégation** | Checkbox "Fonction ?" | Met à jour `has_function` |
| 12 | **Choisir l'agrégation** | Dropdown Latest/First/Sum/Average/Min/Max/Count | Met à jour `fn` |
| 13 | **Construire une formule** | FormulaBuilder visuel | Ajoute/supprime des items (variables, opérateurs, nombres, parenthèses) |
| 14 | **Définir la cible** | Opérateur + valeur + % | Met à jour `cible_operator`, `cible_value`, `cible_is_percentage` |
| 15 | **Choisir la fréquence** | Dropdown Instant/Quotidien/Hebdo/Mensuel/Annuel | Met à jour `refresh_frequency` |
| 16 | **Choisir les graphiques** | GraphTypePicker multi-select | Met à jour `graph_types` |
| 17 | **Définir les modules** | Checkboxes Qualité/Production/etc. | Met à jour `modules` |
| 18 | **Couleur de surbrillance** | Color picker inline | Met à jour `highlight_color` |
| 19 | **Notes** | Textarea | Met à jour `notes` |
| 20 | **Ajouter un endpoint** | Modal AddEndpoint | `POST /novacity-endpoints/test-and-save` |
| 21 | **Exécuter un test** | Bouton "Test" | Évalue la ligne sur les données en cache |
| 22 | **Exécuter en direct** | Bouton "Exec" | Appelle l'API live via proxy |
| 23 | **Test Live complet** | Bouton "Test Live" | Exécute tout le groupe KPI en direct |
| 24 | **Sauvegarde globale** | Bouton "Save" | Flush de tous les `dirtyIds` |
| 25 | **Exec All** | Bouton "Exec All" | Exécute toutes les lignes visibles |
| 26 | **Exporter Excel** | Bouton "Excel" | Export CSV de la vue filtrée |
| 27 | **Sync SQL** (superadmin) | Bouton "Sync SQL" | Truncate + réimport depuis SQL dump |
| 28 | **Reset** (superadmin) | Bouton "Reset" | Supprime tout + re-seed |

### 3.2 API REST — Mappings

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/data-mappings` | Liste tous les mappings |
| `POST` | `/data-mappings` | Créer un mapping |
| `PUT` | `/data-mappings/{id}` | Modifier un mapping (audit log) |
| `DELETE` | `/data-mappings/{id}` | Supprimer un mapping (audit log) |
| `POST` | `/data-mappings/batch` | Mise à jour groupée (plusieurs lignes) |
| `POST` | `/data-mappings/seed` | Initialiser depuis le fichier seed |
| `POST` | `/data-mappings/sync-sql` | Superadmin : import depuis SQL |
| `GET` | `/data-mappings/audit-logs` | Historique des modifications |
| `GET` | `/data-mappings/export-sql` | Export SQL |

### 3.3 Page Builder (V3)

| # | Action | Mécanisme | Comportement |
|---|--------|-----------|--------------|
| 1 | **Ajouter un widget** | Palette → clic ou drag & drop | `addWidget(type, partial?)` → état local |
| 2 | **Supprimer un widget** | Bouton X | `removeWidget(id)` → état local |
| 3 | **Dupliquer un widget** | Bouton Copy | `duplicateWidget(id)` → état local |
| 4 | **Déplacer/redimensionner** | Drag & drop grid | `setLayoutBulk(items)` → état local |
| 5 | **Verrouiller** | Bouton Lock | `toggleLock(id)` → `widget.locked = true` |
| 6 | **Assigner un KPI** | Inspector → dropdown KPI | `updateConfig(id, { kpiCode })` → état local |
| 7 | **Configurer le style** | Inspector → Style tab | `updateConfig(id, stylePatch)` → état local |
| 8 | **Changer la disposition** | Inspector → Disposition tab | `updateWidget(id, { x, y, w, h })` → état local |
| 9 | **Éditer une grille** | Inspector → Tableau tab (table-grid) | `updateConfig(id, { tableGrid: ... })` → état local |
| 10 | **Modifier les marges** | MarginInput | `pushMargin(id, side, newValuePx)` → décale les widgets adjacents |
| 11 | **Undo/Redo** | Ctrl+Z / Ctrl+Shift+Z | Pile d'historique (100 états max) |
| 12 | **Sauvegarder** | Bouton Save | `PUT /api/builder-pages/{id}` avec `{ layout: { version: 1, widgets } }` |
| 13 | **Reset** | Bouton Reset | Remet le layout à `null` (page vide) |
| 14 | **Exporter JSON** | Toolbar → Export | `JSON.stringify({ pageId, version, widgets })` |
| 15 | **Importer JSON** | Toolbar → Import | Parse et remplace `widgets` |
| 16 | **Créer une page** | Page list → "New Page" | `POST /api/builder-pages` |
| 17 | **Dupliquer une page** | Page list → "Duplicate" | `POST /api/builder-pages/{id}/duplicate` |
| 18 | **Créer un groupe** | Page list → "New Group" | `POST /api/builder-page-groups` |
| 19 | **Assigner une page à un groupe** | Page edit → group dropdown | `PUT /api/builder-page-groups/assign-page` |
| 20 | **Réordonner les pages** | Drag & drop dans la liste | `PUT /api/builder-page-groups/reorder-pages` |
| 21 | **KPI cell navigation** (table-grid) | Flèches, Tab, Enter | Cursor + sélection + clipboard (Ctrl+C/V/X) |

### 3.4 Administration

| # | Action | Route |
|---|--------|-------|
| 1 | **Synchroniser un KPI** | `POST /admin/kpi-endpoints/fire` |
| 2 | **Synchroniser tous les KPI** | `POST /admin/kpi-endpoints/fire-all` |
| 3 | **Sauvegarder un paramètre** | `POST /api/settings` (ex: `novacity_base_url`) |
| 4 | **Déclencher une synchro source** | `POST /admin/pipeline/sync/{source}` |
| 5 | **Déclencher toutes les synchros** | `POST /admin/pipeline/sync-all` |
| 6 | **Écran (TV)** CRUD | `POST/PUT/DELETE /admin/screens` |
| 7 | **Utilisateur admin** CRUD | `POST/PUT/DELETE /admin/users` |
| 8 | **Modifier manuellement une valeur KPI** | `PUT /admin/kpi-values/{key}` |
| 9 | **Créer une entrée d'audit** | `POST /admin/audit-logs` |

### 3.5 Automatisation (backend)

| # | Action | Mécanisme | Déclencheur |
|---|--------|-----------|-------------|
| 1 | **Sync Novacity Production** | `SyncNovacityProduction` command | Artisan / Cron |
| 2 | **Sync Novacity Qualité** | `SyncNovacityQuality` command | Artisan / Cron |
| 3 | **Sync Novacity Logistique** | `SyncNovacityLogistics` command | Artisan / Cron |
| 4 | **Sync KPI Endpoints** | `SyncKpiEndpoints` command | Artisan / Cron |
| 5 | **Sync Instants** | `SyncInstantEndpoints` command | Artisan / Cron |
| 6 | **Sync Full** | `SyncNovacityFull` command | Artisan / Cron |
| 7 | **Sync par job** | `SyncKpiEndpointJob` (queue) | Dispatched via `dispatchByFrequency()` |
| 8 | **Export mappings** | `ExportDataMappings` command | Artisan |
| 9 | **Export endpoints** | `ExportEndpoints` command | Artisan |
| 10 | **Extract page data** | `ExtractPageData` command | Artisan |

---

## 4. Flux de synchronisation (Novacity → KPI Data)

### 4.1 Sync KPI Endpoint (le flux principal)

```
KpiEndpointService::syncKpiFromEndpoint()
  │
  ├── 1. fetchEndpointData(endpointPath)
  │       GET {baseUrl}/{endpointPath}
  │       Headers: x-api-key
  │       Response: { data: [...] }
  │       → Extrait le tableau sous la clé "data"
  │
  ├── 2. extractKeyValue(responseData, variableKey, keyConfig)
  │       Voir §6.1 pour le comportement détaillé
  │       → { raw: [...], extracted: ... }
  │
  ├── 3. computeKpi(variableKey, extractedValue, keyConfig)
  │       → { value, variable_key, fn, is_filtered, filter_key, filter_value }
  │
  ├── 4. Upsert dans kpi_data
  │       kpi_data.response_data = extractedValue
  │       kpi_data.computed_data  = computedKpi result
  │       kpi_data.last_status    = "ok"
  │       kpi_data.last_synced_at = now()
  │
  └── 5. KpiResultComputer::computeKpi(kpiDef)
        (voir section 5)
```

### 4.2 Fréquences de synchronisation

| Fréquence | Déclencheur | Usage |
|-----------|-------------|-------|
| `instant` | SyncInstantEndpoints / à la demande | Données temps réel (WIP, production, arrêts) |
| `daily` | SyncKpiEndpoints | Données quotidiennes (qualité, expéditions) |
| `weekly` | SyncKpiEndpoints | Tendances hebdomadaires |
| `monthly` | SyncKpiEndpoints | KPI mensuels (RFT, fiabilité) |
| `yearly` | SyncKpiEndpoints | KPI annuels |

---

## 5. Pipeline de calcul des KPI

### 5.1 KpiResultComputer::computeKpi()

C'est le **cerveau du calcul**. Exécuté après chaque sync.

```
computeKpi(array $kpiDef):
  │
  ├── 1. Récupérer les raw_data pour chaque variable
  │       → KpiData::where('kpi_code', $kpiCode)
  │       → variableRaws = [ [row1, row2, ...], [row1, row2, ...] ]
  │
  ├── 2. Extraire les filter_options de toutes les raw_data
  │       → { "ProdGroup": ["CH01", "CH02"], "EmployeeNo": ["E001", "E002"] }
  │
  ├── 3. Détection du mode de calcul :
  │       Voir §6.5 pour l'arbre de décision complet
  │
  │   ┌─ Si row-by-row → computeRowByRow(items, raws, variables)
  │   │     ├── Trouver la clé de jointure commune
  │   │     ├── Indexer la 1ère variable par cette clé
  │   │     ├── Pour chaque ligne de la dernière variable :
  │   │     │     ├── Matcher avec l'index
  │   │     │     ├── Extraire les valeurs et calculer la formule
  │   │     │     └── mapped_rows[j] = { joinKey, ..., value }
  │   │     └── scalarValue = average(mapped_rows[*].value)
  │   │
  │   └─ Sinon → SCALAIRE
  │         ├── Pour chaque variable : aggregateRaw(raw, vk, fn)
  │         └── computeFormulaScalar(items, varValues)
  │
  ├── 4. Calcul du statut (vert/orange/rouge/gris)
  │       computeStatus(value, operator, target)
  │         → opérateurs : <=, >=, <, >, =
  │         → seuils : cible exacte (green), 10% marge (orange), hors (red)
  │         → null (pas de valeur) → "grey"
  │
  ├── 5. Chart rows spécifiques (Pareto)
  │       computeChartRows(raw, kpiDef)
  │         → Si graph_type = "Pareto Chart (Interactif)" + chart_config.pareto
  │         → Groupe par label_key, agrège value_key → tri décroissant
  │
  └── 6. Stocker computed_result sur la 1ère variable
        → kpi_data.computed_result = { scalar_value, status, mapped_rows, filter_options, computed_at }
```

### 5.2 Frontend — kpiFilterEngine.ts

Moteur de calcul côté client (fallback quand `computed_result` n'est pas disponible).

```typescript
computeKpi(kpi: KpiConfig, activeFilters: Record<string, string>): ComputedKpi
  │
  ├── Fast path : si kpi.computed_result existe
  │     → Utilise scalar_value et mapped_rows directement
  │     → Applique les filtres sur mapped_rows
  │     → Construit les FilterConfigs
  │
  └── Slow path : calcule depuis les raw_data
        → Pour chaque variable : applyFilters() → computeVariableValue()
        → Si formule → row-by-row ou scalaire (logique similaire au backend)
        → computeStatus() pour la couleur
```

---

## 6. Comportements selon les configurations — exemples réels

### 6.1 Extraction (`extractKeyValue`)

L'extraction dépend de `variable_type` et `variable_key` :

| `variable_key` | `variable_type` | Comportement | Code |
|---|---|---|---|
| `null` | — | Retourne le tableau brut complet `{ raw: responseData, extracted: null, note: 'no_variable_key' }` | L230 |
| `"MaClé"` | `Direct` | Itère sur le tableau `responseData`, collecte toutes les valeurs de `MaClé` → `{ raw: [...], extracted: [v1, v2, ...], count: N }` | L241-251 |
| `"MaClé"` | `Complex` | Cherche la **1ère occurrence** de `MaClé` dans le tableau `responseData` → `{ raw: [...], extracted: valeur_unique }` | L254-263 |

**Validation post-extraction** (L124-149) :
- `Direct` + `extracted` vide → erreur "Key not found"
- `Complex` + `extracted` null → erreur "Key not found"
- `variable_key` null + `responseData` vide → erreur "Empty response data"

### 6.2 Agrégation (`aggregateRaw`)

Appliquée sur les valeurs d'une variable extraites de `response_data.raw` :

| `fn` | Comportement | Code |
|---|---|---|
| `Latest` | Dernière valeur du tableau | L343 |
| `First` | Première valeur du tableau | L342 |
| `Sum` | Somme de toutes les valeurs numériques | L337 |
| `Average` | Somme / nombre de valeurs | L338 |
| `Min` | Valeur minimale | L339 |
| `Max` | Valeur maximale | L340 |
| `Count` | Nombre d'éléments (casté en float) | L341 |

Note : `has_function = false` équivaut à `fn = Latest` (comportement par défaut).

### 6.3 Comportement de `computeVariableValue()` (frontend)

| `variable_type` | `has_function` | `filter_key` | Résultat | Destiné à |
|---|---|---|---|---|
| `Direct` | — | — | `filteredRaw[0][key]` → **scalaire** (valeur de la 1ère ligne) | `kpi`, `gauge` |
| `Complex` | **true** | — | `aggregate(values, fn)` → **scalaire** | `kpi`, `gauge` |
| `Complex` | **false** | **null** | `values.map(v => ({key: v}))` → **tableau d'objets** | `line`, `bar`, `donut`, `area`, `combo`, `radar`, `pie`, `sparkline` |
| `Complex` | **false** | **défini** | `values[last]` → **scalaire** (dernière valeur) | `kpi`, `gauge` |

### 6.4 Décision row-by-row vs scalaire (backend `KpiResultComputer`)

| Formule | Nb variables | Au moins 1 var Complex + pas d'agg + >1 lignes ? | Mode | `mapped_rows` | `scalar_value` |
|---|---|---|---|---|---|
| `null` | 1 | — | **Scalaire** | `null` (sauf Pareto) | `aggregateRaw(var0)` |
| `null` | 2+ | — | **Scalaire** (var 0 seulement) | `null` | `aggregateRaw(var0)` |
| `{ items }` | 1 | — | **Scalaire** | `null` | `formula(items, [var0])` |
| `{ items }` | 2+ | **Oui** | **Row-by-row** | JOIN + formule par ligne | moyenne des rows |
| `{ items }` | 2+ | **Non** | **Scalaire** | `null` | `formula(aggregate(var0), aggregate(var1), ...)` |

**Condition row-by-row** (L65-75) :
```php
foreach variables:
  isComplex = (variable_type === 'Complex')
  noAgg = (!has_function && fn === 'Latest')
  hasMultipleRows = count(raw) > 1
  if isComplex && noAgg && hasMultipleRows → hasArrayVar = true
```

### 6.5 Exemples réels

---

#### Exemple 1 — Direct, sans fonction, sans formule (valeur unique)

**KPI :** `F-REQ-106` — "Paquets inspectés aujourd'hui"

```
endpoint:        api/data/q/inspections_paquet_jour_en_cours
variable_type:   Direct
variable_key:    BundleInspectedToday
has_function:    false     (fn = Latest par défaut)
formula:         null
```

**Donnée API :**
```json
[{ "BundleInspectedToday": 47, "Date": "2026-07-30" }]
```

**Étape 1 — Extraction** (KpiEndpointService L241-251) :
- `Direct` → itère le tableau
- Collecte `BundleInspectedToday` → `[{ BundleInspectedToday: 47 }]`
- `count = 1`
- `{ raw: [...], extracted: [47], count: 1 }`

**Étape 2 — Computation** (KpiResultComputer L97-105) :
- `formula = null` et `1 seule variable` → branche "Single variable"
- `aggregateRaw(raw, "BundleInspectedToday", "Latest")`
  - raw = `[{ BundleInspectedToday: 47, Date: "2026-07-30" }]`
  - values = `[47]`
  - Latest → `47`

**Computed result :**
```json
{ "scalar_value": 47, "status": "green", "mapped_rows": null, "filter_options": {} }
```

**Widgets compatibles :** `kpi`, `gauge`, `table`

---

#### Exemple 2 — Complex, avec fonction Sum, sans formule (valeur agrégée)

**KPI :** `F-REQ-205` — "WIP (Encours de production)"

```
endpoint:        api/data/q/wip_chaine
variable_type:   Complex
variable_key:    WIP_Chaine
has_function:    true
fn:              Sum
is_filtered:     true
filter_key:      ProdGroup
formula:         null
```

**Donnée API :**
```json
[
  { "ProdGroup": "CH01", "WIP_Chaine": 150, "Chaine": "Coupe" },
  { "ProdGroup": "CH02", "WIP_Chaine": 320, "Chaine": "Confection" },
  { "ProdGroup": "CH03", "WIP_Chaine": 85,  "Chaine": "Flux" }
]
```

**Étape 1 — Extraction** (KpiEndpointService L254-263) :
- `Complex` → cherche la 1ère occurrence de `WIP_Chaine`
- La 1ère ligne a `"WIP_Chaine": 150`
- `{ raw: [...], extracted: 150 }`

**Étape 2 — Computation** (KpiResultComputer L97-105) :
- `formula = null` → branche "Single variable"
- `aggregateRaw(raw, "WIP_Chaine", "Sum")`
  - raw = les 3 lignes (re-lecture de `response_data.raw`)
  - values = `[150, 320, 85]`
  - Sum → `150 + 320 + 85 = 555`

**Note importante :** La valeur extraite par `extractKeyValue` (`150`, la 1ère occurrence) n'est pas utilisée par `KpiResultComputer`. Celui-ci re-lit la `response_data.raw` brute et re-applique l'agrégation sur **toutes les lignes** → `555`.

```json
{ "scalar_value": 555, "status": "green", "mapped_rows": null,
  "filter_options": { "ProdGroup": ["CH01", "CH02", "CH03"] } }
```

**Widgets compatibles :** `kpi`, `gauge`, `table`

---

#### Exemple 3 — Complex, sans fonction, avec formule (row-by-row)

**KPI :** `F-REQ-313` — "Taux de fiabilité stock accessoires"

```
Variable 1 (var0) :
  endpoint        = api/data/diva_stock
  variable_type   = Complex
  variable_key    = Qtte
  has_function    = false
  fn              = Latest

Variable 2 (var1) :
  endpoint        = api/data/diva_stock
  variable_type   = Complex
  variable_key    = qtteReservee
  has_function    = false
  fn              = Latest

formula : { items: [
  { type: "variable", ref: 105, label: "Quantité physique" },
  { type: "operator", op: "/" },
  { type: "variable", ref: 106, label: "Quantité système" },
  { type: "operator", op: "*" },
  { type: "number", value: 100 }
] }
```

**Donnée API (diva_stock) :**
```json
[
  { "Article": "ACC001", "Qtte": 120, "qtteReservee": 130, "Stock": "Accessoires" },
  { "Article": "ACC002", "Qtte": 45,  "qtteReservee": 50,  "Stock": "Accessoires" },
  { "Article": "ACC003", "Qtte": 200, "qtteReservee": 180, "Stock": "Accessoires" }
]
```

**Étape 1 — Extraction :**
- Var0 (`Complex` + `Qtte`) → `extracted: 120` (1ère occurrence)
- Var1 (`Complex` + `qtteReservee`) → `extracted: 130` (1ère occurrence)

**Étape 2 — Détection row-by-row** (KpiResultComputer L65-75) :
- `formula` existe ✅
- `count(variables) >= 2` ✅ (var0 et var1)
- Var0 : `Complex` + `has_function = false` + `fn = Latest` (= pas d'agg) + `count(raw) = 3 > 1` ✅
- `hasArrayVar = true` → **Row-by-row**

**Étape 3 — Join** (computeRowByRow L136-211) :
- `allKeys` = intersection des clés des 2 raw_data : `["Article", "Qtte", "qtteReservee", "Stock"]`
- `filter_key` non défini → cherche la 1ère clé qui n'est pas une `variable_key` (`Qtte`, `qtteReservee`)
- `"Article"` n'est pas dans les variable_keys → **clé de jointure = "Article"**
- Indexe var0 par `Article` :
  ```json
  { "ACC001": { "Article": "ACC001", "Qtte": 120, "qtteReservee": 130, "Stock": "Accessoires" },
    "ACC002": { "Article": "ACC002", "Qtte": 45,  "qtteReservee": 50,  "Stock": "Accessoires" },
    "ACC003": { "Article": "ACC003", "Qtte": 200, "qtteReservee": 180, "Stock": "Accessoires" } }
  ```
- Pour chaque ligne de var1 (la dernière variable), extrait les valeurs et calcule :

| `Article` | `Qtte` (var0) | `qtteReservee` (var1) | Formule | Résultat |
|---|---|---|---|---|
| ACC001 | 120 | 130 | 120/130*100 | 92.31 |
| ACC002 | 45 | 50 | 45/50*100 | 90.00 |
| ACC003 | 200 | 180 | 200/180*100 | 111.11 |

**Mapped rows :**
```json
[
  { "Article": "ACC001", "Stock": "Accessoires", "value": 92.31 },
  { "Article": "ACC002", "Stock": "Accessoires", "value": 90.00 },
  { "Article": "ACC003", "Stock": "Accessoires", "value": 111.11 }
]
```

**Scalar value = moyenne :** `(92.31 + 90.00 + 111.11) / 3 = 97.81`

```json
{ "scalar_value": 97.81, "status": "green",
  "mapped_rows": [
    { "Article": "ACC001", "Stock": "Accessoires", "value": 92.31 },
    { "Article": "ACC002", "Stock": "Accessoires", "value": 90.00 },
    { "Article": "ACC003", "Stock": "Accessoires", "value": 111.11 }
  ],
  "filter_options": {} }
```

**Widgets :**
- `kpi` → affiche `97.81` (la scalar_value, moyenne générale)
- `bar`, `line`, `area`, `combo` → affichent les 3 barres/courbes (les mapped_rows)
- `donut`, `pie` → affichent les parts par Article

---

#### Exemple 4 — Direct, sans fonction, avec formule (scalaire)

**KPI :** `F-REQ-350` — "RFT Development"

```
Variable 1 :
  variable_type   = Direct
  variable_key    = null
  has_function    = false

Variable 2 :
  variable_type   = Direct
  variable_key    = null
  has_function    = false

formula : { items: [
  { type: "variable", ref: 162, label: "Validés premier coup" },
  { type: "operator", op: "/" },
  { type: "variable", ref: 163, label: "Total envoyés" }
] }
```

**Pas d'endpoint** (`endpoint = null`) → pas de sync automatique.

**Extraction :** `variable_key = null` → `{ raw: responseData, extracted: null, note: 'no_variable_key' }`

**Computation :**
- `formula` existe + `count(variables) >= 2` ✅
- Détection row-by-row : var0 n'est pas Complex → `hasArrayVar = false`
- Mode **Scalaire**
- `aggregateRaw(raw1, null, "Latest")` → `null` (pas de variable_key pour extraire les valeurs)
- `computeFormulaScalar(items, [null, null])` → `null`

**Résultat :** `scalar_value = null`, `status = "grey"`

Ce type de KPI sans endpoint ne peut pas être calculé automatiquement. Sa valeur doit être fournie manuellement via l'API admin ou un autre mécanisme.

**Widgets compatibles :** `kpi` (affiche "—" ou "grey")

---

#### Exemple 5 — Complex, avec fonction Sum, filtré, sans formule

**KPI :** `F-REQ-207` — "Lost Time (Temps perdu)"

```
endpoint:        api/data/losttimetrx
variable_type:   Complex
variable_key:    LostTime
has_function:    true
fn:              Sum
is_filtered:     true
filter_key:      LostTime
formula:         null
```

**Donnée API :**
```json
[
  { "LostTime": 15, "Type": "Mécanique", "LostTypeDesc": "Panne" },
  { "LostTime": 8,  "Type": "Mécanique", "LostTypeDesc": "Réglage" },
  { "LostTime": 23, "Type": "Électrique", "LostTypeDesc": "Coupure" }
]
```

**Computation :**
- `formula = null` → 1 seule variable
- `aggregateRaw(raw, "LostTime", "Sum")` → `15 + 8 + 23 = 46`

```json
{ "scalar_value": 46, "status": "green",
  "filter_options": { "LostTime": ["8", "15", "23"] } }
```

**Note :** `filter_key = "LostTime"` mais `is_filtered = true` → les options de filtre sont les valeurs distinctes elles-mêmes. Le filtre permet de sélectionner une valeur de temps perdu spécifique dans le frontend.

**Widgets :** `kpi`, `gauge`

---

#### Exemple 6 — Complex, sans fonction, sans formule, plusieurs variables (pour chart)

**KPI :** `F-REQ-331` — "Quantité par typologie de fournitures"

```
Variable 1 :
  endpoint        = api/data/q/quantite_par_typologie_fournitures
  variable_type   = Complex
  variable_key    = Typologie
  has_function    = false
  fn              = Latest

Variable 2 :
  endpoint        = api/data/q/quantite_par_typologie_fournitures
  variable_type   = Complex
  variable_key    = Quantite
  has_function    = false
  fn              = Latest

formula : null
```

**Donnée API :**
```json
[
  { "Typologie": "ETIQUETTE", "Quantite": 15000 },
  { "Typologie": "CARTON", "Quantite": 8000 },
  { "Typologie": "FIL", "Quantite": 5000 }
]
```

**Computation (back-end) :**
- `formula = null` → prend la **1ère variable** seulement
- `aggregateRaw(raw, "Typologie", "Latest")` → `"FIL"` (la dernière valeur)

**C'est un KPI de type chart** (graph_type = ~). Mais sans formule et avec `has_function = false`, le backend ne génère pas de `mapped_rows` (sauf Pareto).

**Cependant, en frontend (slow path)** :
- `computeVariableValue(var0, filteredRaw, extraFilters?)`
- `Complex` + `has_function = false` + `filter_key = null`
- → retourne `values.map(v => ({ Typologie: v }))` = `[{ Typologie: "ETIQUETTE" }, { Typologie: "CARTON" }, { Typologie: "FIL" }]`
- Ce tableau alimente les widgets chart directement.

**Widgets compatibles :** `donut`, `pie`, `bar` (via le slow path frontend)

---

#### Tableau récapitulatif — Comportement de `aggregateRaw()` (backend)

| `fn` | Input | Output |
|---|---|---|
| `Latest` | `[150, 320, 85]` | `85` |
| `First` | `[150, 320, 85]` | `150` |
| `Sum` | `[150, 320, 85]` | `555` |
| `Average` | `[150, 320, 85]` | `185` |
| `Min` | `[150, 320, 85]` | `85` |
| `Max` | `[150, 320, 85]` | `320` |
| `Count` | `[150, 320, 85]` | `3` |

---

## 7. Flux Page Builder (V3)

### 7.1 Architecture des composants

```
page-builder.tsx (liste des pages)
  │
  └── [slug].tsx (page view)
        │ Inertia render → layout from DB
        │
        └── dashboard-builder.tsx
              │ BuilderProvider (Context)
              │
              ├── toolbar.tsx        (Save, Undo/Redo, Export/Import, Refresh)
              ├── palette.tsx        (Widget types + KPI list → drag source)
              ├── canvas.tsx         (react-grid-layout grid)
              │     └── widget-renderer.tsx
              │           ├── kpi.tsx, gauge.tsx, sparkline.tsx
              │           ├── line-chart.tsx, bar-chart.tsx, ...
              │           └── table-grid.tsx, text.tsx, divider.tsx
              └── inspector.tsx      (Widget property editor)
```

### 7.2 Flux de données dans le builder

```
1. [Mount] defaultLayout props → widgets state (BuilderProvider)
2. [Canvas] Extrait tous les kpiCodes des widgets
     └── useKpiData(kpiCodes)
           ├── GET /api/builder-kpis/data?codes=F-REQ-205,F-REQ-101
           ├── Refresh automatique toutes les 60s
           └── Retourne Map<kpiCode, KpiResult>
3. [WidgetRenderer] Pour chaque widget :
     ├── kpiData.get(widget.config.kpiCode)
     ├── resolveKpiValue(config, kpiData) → { value, hasData, status }
     └── resolveKpiSeries(config, kpiData) → { series: [{x, v}], hasData }
4. [Save] PUT /api/builder-pages/{id}
     { layout: { version: 1, widgets: [...] } }
```

### 7.3 API endpoints du builder

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/builder-kpis` | GET | Liste des KPI (dédupliqués par code) pour la palette |
| `/api/builder-kpis/data?codes=X,Y` | GET | Données calculées pour les KPI demandés |
| `/api/builder-pages` | GET/POST | Liste / Créer une page |
| `/api/builder-pages/{id}` | GET/PUT/DELETE | Lire / Modifier / Supprimer une page |
| `/api/builder-pages/{id}/duplicate` | POST | Dupliquer une page |
| `/api/builder-page-groups` | GET/POST | Liste / Créer un groupe |
| `/api/builder-page-groups/{id}` | PUT/DELETE | Modifier / Supprimer un groupe |
| `/api/builder-page-groups/assign-page` | PUT | Assigner une page à un groupe |
| `/api/builder-page-groups/reorder-pages` | PUT | Réordonner les pages |
| `/api/builder-page-groups/reorder-groups` | PUT | Réordonner les groupes |

---

## 8. Widgets et utilisation des données KPI

### 8.1 Types de widgets et données utilisées

| Widget | Type | Données utilisées | Comportement |
|--------|------|-------------------|--------------|
| **KPI Card** | `kpi` | `scalar_value`, `status` | Affiche un grand nombre avec couleur basée sur le statut (vert/orange/rouge). Optionnel : sparkline en arrière-plan. |
| **Gauge** | `gauge` | `scalar_value`, `status` | Jauge demi-cercle avec aiguille. Min/max configurables. Couleur selon statut. |
| **Sparkline** | `sparkline` | `mapped_rows` | Mini courbe de tendance. Affiche la valeur agrégée (Latest/Sum/etc.) avec variation en %. |
| **Line Chart** | `line` | `mapped_rows` | Courbe X/Y. Ligne de target optionnelle. Agrégation configurable. |
| **Bar Chart** | `bar` | `mapped_rows` | Barres verticales. Couleur par série. Agrégation configurable. |
| **Pareto** | `pareto` | `mapped_rows` (chart_config) | Diagramme de Pareto interactif : barres décroissantes + courbe cumulative. |
| **Donut** | `donut` | `mapped_rows` | Anneau avec segments. Valeur centrale = total ou agrégation. |
| **Pie Chart** | `pie` | `mapped_rows` | Camembert avec légende. |
| **Radar** | `radar` | `mapped_rows` | Graphique radar multi-axes. |
| **Area Chart** | `area` | `mapped_rows` | Graphique à aires. Ligne de target optionnelle. |
| **Combo Chart** | `combo` | `mapped_rows` | Barres + courbe combinées. Deux axes Y possibles. |
| **Table** | `table` | `scalar_value`, `status` | Tableau simple listant les KPI avec leurs valeurs. |
| **Table Grid** | `table-grid` | Par cellule : `scalar_value` ou `name` | Grille libre. Chaque cellule peut afficher un KPI (nom ou valeur). Supporte les fusions, copier/coller, header. |
| **Text** | `text` | Aucune | Texte libre / titre. |
| **Divider** | `divider` | Aucune | Séparateur horizontal. |

### 8.2 Résolution des données par widget

```typescript
// Pour les widgets "Big Number" (kpi, gauge, table)
const { value, hasData, status } = resolveKpiValue(config, kpiData);
// → config.kpiCode → kpiData.get(code) → scalar_value
// → status = computed_result.status OU calculé depuis target

// Pour les widgets "Chart" (line, bar, pareto, donut, etc.)
const { series, hasData } = resolveKpiSeries(config, kpiData);
// → config.kpiCode → kpiData.get(code) → mapped_rows
// → mapped_rows[0] keys → { x: joinKey, v: "value" }
// → Si showScaler → computeScalerValue(series, agg) → affiche valeur agrégée
```

### 8.3 Comportement des statuts

| Statut | Couleur | Condition (opérateur `>=`) | Condition (opérateur `<=`) |
|--------|---------|---------------------------|---------------------------|
| `green` | Vert `#22c55e` | `value >= target` | `value <= target` |
| `orange` | Jaune `#f59e0b` | `value >= target * 0.9` | `value <= target * 1.1` |
| `red` | Rouge `#ef4444` | `value < target * 0.9` | `value > target * 1.1` |
| `grey` | Gris | Pas de données (`null`) | Pas de données (`null`) |

Statuts spécifiques (`KpiComputeService`, legacy V1/V2) :
| Méthode | Seuil green | Seuil orange |
|---------|-------------|--------------|
| `rftStatus(pct)` | `>= 98` | `>= 95` |
| `brStatus(pct)` | `< 4` | `<= 5` |
| `efficienceStatus(pct)` | `>= 85` | `>= 70` |
| `wipStatus(wip, cadence)` | `<= 0.5 * cadence` | `<= cadence` |
| `lostTimeStatus(minutes)` | `< 10` | `<= 30` |

### 8.4 Scaler (affichage agrégé)

Les widgets de type chart peuvent afficher une valeur scalée en-tête :

```typescript
computeScalerValue(series, "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count")
```

Affiche : `{valeur} {unité} {agg}` avec variation en pourcentage `{sign}{pct}%`

---

## 9. Gestion des filtres et cibles

### 9.1 Types de filtres

| Type | Source | Description |
|------|--------|-------------|
| **Auto-generated** | `data_mappings.is_filtered` + `filter_key` | Filtre automatique basé sur une colonne de la donnée brute. Les options sont extraites des `filter_options` du `computed_result`. |

Le filtrage applique : `raw.filter(row => String(row[filter_key]) === selectedValue)`

### 9.2 Application des filtres

**Backend (`KpiResultComputer::extractFilterOptions`) :**
- Pour chaque variable avec `is_filtered = true` et `filter_key` défini :
  - Extrait les valeurs uniques de `filter_key` dans `response_data.raw`
  - Les stocke dans `computed_result.filter_options`

**Frontend (`kpiFilterEngine.applyFilters`) :**
- Pour chaque variable : si `activeFilters[filter_key]` existe → filtre `raw_data`

### 9.3 Targets (Cibles)

Configurées dans `data_mappings` :
- `cible_operator` : `<=`, `>=`, `<`, `>`, `=`
- `cible_value` : valeur numérique
- `cible_is_percentage` : si la cible est un pourcentage

Utilisées pour :
1. Calculer le **statut** (vert/orange/rouge)
2. Afficher la **ligne de target** sur les graphiques (`showTarget`)
3. Afficher la **valeur cible** dans l'inspecteur du builder

---

## 10. Pages V1/V2 (legacy)

### 10.1 Architecture V1/V2

Les pages V1/V2 sont des **SPA standalone** utilisant TanStack Router.

```
/v1/
├── /data          → DataMapping page (éditeur de mappings)
├── /login         → Auth (data_users table)
├── /qualite       → Quality dashboard
├── /production/
│   ├── flux       → Production flux dashboard
│   └── confection → Production confection dashboard
└── /comparaison   → Comparaison page
```

### 10.2 Flux V1/V2

Contrairement au V3 qui utilise le pipeline `kpi_data.computed_result`, les pages V1/V2 appellent des **endpoints spécifiques** qui lisent directement les tables de sync ou font des calculs dédiés.

```
Page V1/V2
  │
  ├── fetchProductionKpis(filters)   → GET /api/v2/production/kpis
  ├── fetchProductionGauges(filters) → GET /api/v2/production/gauges
  ├── fetchProductionTrend(filters)  → GET /api/v2/production/trend
  ├── fetchProductionStoppages(...)  → GET /api/v2/production/stoppages
  └── ...autres appels spécifiques
        │
        ▼
  Controllers V1/V2 (ProductionController, QualityController, etc.)
    → Lisent directement les tables de sync (OfFabrication, etc.)
    → Ou utilisent KpiComputeService pour les statuts spécifiques
    → Ou utilisent KpiData pour les données déjà synchronisées
```

---

## Annexes

### A. Dépendances entre les fichiers clés

```
Backend:
  config/data-mappings.php     ← Définition statique des KPI
  config/endpoints.php         ← Définition statique des endpoints
  app/Models/DataMapping.php   ← Modèle Eloquent
  app/Models/KpiData.php       ← Modèle Eloquent
  app/Models/BuilderPage.php   ← Modèle Eloquent
  app/Services/KpiEndpointService.php   ← Sync API → kpi_data
  app/Services/KpiResultComputer.php    ← Pré-calcul des résultats
  app/Services/KpiComputeService.php    ← Calcul legacy V1/V2
  app/Http/Controllers/Api/BuilderKpiController.php   ← API builder
  app/Http/Controllers/Api/BuilderPageController.php  ← CRUD pages
  app/Http/Controllers/Api/DataMappingController.php  ← CRUD mappings

Frontend:
  resources/js/pages/v3/page-builder.tsx
  resources/js/pages/v3/p/[slug].tsx
  resources/js/components/builder/
    ├── dashboard-builder.tsx     ← Shell
    ├── store.tsx                 ← State management
    ├── types.ts                  ← Types Widget, WidgetConfig
    ├── canvas.tsx                ← Grille + data fetching
    ├── palette.tsx               ← Palette de widgets
    ├── inspector.tsx             ← Éditeur de propriétés
    ├── useKpiData.ts             ← Hook de données KPI
    ├── widget-renderer.tsx       ← Routeur de widgets
    └── widgets/                  ← 15 widgets
  resources/js/lib/
    ├── kpi-rows.ts               ← fetchKpiList, fetchKpiData
    ├── kpiFilterEngine.ts        ← Calcul KPI frontend
    └── exec.ts                   ← Formules, agrégations
  resources/js/services/
    └── dataMappingApi.ts         ← API client mappings
  routes-v1/pages/data.tsx        ← Page d'édition des mappings
```

### B. Diagramme de flux complet

```
[NOVACITY API] ──HTTP──▶ [KpiEndpointService] ──▶ [kpi_data table]
                              │                         │
                              │                  [KpiResultComputer]
                              │                         │
                              ▼                         ▼
                        [kpi_data.computed_result] ◀────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │  API /builder-   │
                   │  kpis/data       │
                   └────────┬─────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
          [V3 Builder]  [V1/V2 Pages]  [Screen TV]
                │
                ▼
        [WidgetRenderer]
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
    [kpi.tsx] [line] [gauge] ...
        │
        ▼
  resolveKpiValue() / resolveKpiSeries()
        │
        ▼
  KpiDataMap.get(kpiCode)
    → scalar_value (big number)
    → mapped_rows (charts)
    → status (couleur)
```
