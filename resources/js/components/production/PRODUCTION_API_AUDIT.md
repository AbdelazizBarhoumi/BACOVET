# Production API Audit — Field Usage Reference

## 1. Chain Info Cards
**Endpoint:** `GET /production/chain-info`
**Component:** `ProductionTab` → Row 1

| Field | API Type | Displayed | Notes |
|-------|----------|-----------|-------|
| `id` | string | ✅ Card header | |
| `of` | string | ✅ Top-right badge | |
| `article` | string | ✅ KV row | |
| `designation` | string | ✅ Footer (conditional) | Hidden when null |
| `sam` | number/string | ✅ KV row | |
| `sot` | number/string | ✅ KV row | "N/A" fallback |
| `effectif` | number/string | ✅ KV row | |
| `objectif` | number/string | ✅ "QTÉ" label | |
| `eff` | number | ✅ KV row | |
| `wip` | number | ✅ KV row | |
| `bpd` | string | ✅ KV row | "N/A" fallback |
| `epd` | string | ✅ KV row | "N/A" fallback |
| `ehd` | string | ✅ KV row | "N/A" fallback |
| `hp` | number | ✅ Footer (conditional) | Hidden when null |
| `hs` | number | ✅ Footer (conditional) | Hidden when null |
| `status` | string | ✅ Status dot | |
| `br_gtd` | number/null | ✅ Badge | "N/A" fallback |
| `entree_jour` | number | ✅ Flow indicator | |
| `sortie_jour` | number | ✅ Flow indicator | |

## 2. KPI Cards
**Endpoint:** `GET /production/kpis` + separate Methods KPI endpoints
**Component:** `ProductionTab` → Row 2

| KPI Key | API Key | Displayed | Workshop Filter |
|---------|---------|-----------|-----------------|
| Efficience Chaîne | `avg_efficience` | ✅ Card | Not serigraphie |
| OWE Chaîne | `avg_owe` | ✅ Card | Not serigraphie |
| RFT Production | `rft_production` | ✅ Card | All |
| Total WIP | `total_wip` | ✅ Card | Not serigraphie |
| Arrêts non planifiés | `total_lost_time` | ✅ Card | Not serigraphie |
| BR GTD | `br_gtd` | ✅ Card | Confection/Coupe |
| BR Bundling | `br_bundling` | ✅ Card | Confection/Coupe |
| BR Print | `br_print` | ✅ Card | All |
| Taux Archivage | `tauxArchivage` (extra) | ✅ Card | All |
| Respect Temps Estimé | `respectTempsEstime` (extra) | ✅ Card | All |
| Temps Acceptés V1 | `tauxTempsAcceptes` (extra) | ✅ Card | All |

## 3. Efficience Gauges
**Endpoint:** `GET /production/efficience-gauges`
**Component:** `ProductionTab` → Row 3

| Field | Displayed | Notes |
|-------|-----------|-------|
| `chaine` | ✅ Gauge label | |
| `efficience_pct` | ✅ Gauge value | |

## 4. WIP Gauges
**Endpoint:** `GET /production/wip-gauges`
**Component:** `ProductionTab` → Row 3

| Field | Displayed | Notes |
|-------|-----------|-------|
| `chaine` | ✅ Gauge label | |
| `wip` | ✅ Gauge value (%) | |
| `raw_wip` | ✅ Label below gauge | |
| `target` | ✅ Label below gauge | |

## 5. Stoppage Timeline
**Endpoint:** `GET /production/stoppage-timeline`
**Component:** `ProductionTab` → Row 3

| Field | Displayed | Notes |
|-------|-----------|-------|
| `chaine` | ✅ Timeline row + list | |
| `motif` | ✅ Color block + badge | |
| `duration` | ✅ Block width + list | |
| `start` | ✅ Block position + list | |

## 6. OF Advancement Donuts
**Endpoint:** `GET /production/of-donuts`
**Component:** `ProductionTab` → Row 5

| Field | Displayed | Notes |
|-------|-----------|-------|
| `of` | ✅ Donut label | |
| `pct` | ✅ Donut value + % | |
| `statut` | ✅ Donut color | |

## 7. SO Progress
**Endpoint:** `GET /production/so-progress`
**Component:** `ProductionTab` → Row 5

| Field | Displayed | Notes |
|-------|-----------|-------|
| `chaine` | ✅ YAxis | |
| `realise` | ✅ Bar (stacked) | |
| `restant` | ✅ Bar (stacked) | |

## 8. Efficience Trend
**Endpoint:** `GET /production/efficience-trend`
**Component:** `ProductionTab` → Row 7

| Field | Displayed | Notes |
|-------|-----------|-------|
| `jour` | ✅ XAxis | |
| `eff` | ✅ Line value | |

## 9. Top Operators
**Endpoint:** `GET /production/top-operators`
**Component:** `ProductionTab` → Row 6

| Field | Displayed | Notes |
|-------|-----------|-------|
| `nom` | ✅ YAxis | |
| `eff` | ✅ Bar value | |
| `min_std` | ✅ Line (allOps chart) | Only in composed chart |
| `min_pres` | ❌ Not displayed | Available but unused |

## 10. WIP Trend (Flux Coupe)
**Endpoint:** `GET /production/wip`
**Component:** `ProductionTab` → Row 6

| Field | Displayed | Notes |
|-------|-----------|-------|
| `date` | ✅ XAxis | |
| `sortie` | ✅ Area | |
| `engagement` | ✅ Area | |

## 11. Departage / Vignettes (Confection)
**Endpoint:** `GET /production/coupe/departage?poste=OP221/OP213`
**Component:** `ProductionTab` → Row 6

| Field | Displayed | Notes |
|-------|-----------|-------|
| `employe` | ✅ XAxis | |
| `eff` | ✅ Bar value | |

## 12. Coupe Tagging Table
**Endpoint:** `GET /production/coupe/tagging`
**Component:** `ProductionTab` → Coupe tables

| Field | Displayed | Notes |
|-------|-----------|-------|
| `chaine` | ✅ Table column | |
| `tag_theorique` | ✅ Table column | |
| `tag_reel` | ✅ Table column | |
| `ecart_pct` | ✅ Table column | |
| `shift` | ✅ Table column | |
| `date` | ❌ Not displayed | Available but unused |
| `id` | ❌ Not displayed | Auto-increment, not relevant |
| `synced_at` | ❌ Not displayed | Metadata, not relevant |

## 13. Coupe OFs Table
**Endpoint:** `GET /production/coupe/ofs`
**Component:** `ProductionTab` → Coupe tables

| Field | Displayed | Notes |
|-------|-----------|-------|
| `of_number` | ✅ Table column | |
| `article` | ✅ Table column | |
| `quantite` | ✅ Table column | |
| `dt_debut` | ✅ Table column | |
| `designation` | ✅ Tooltip on article | |
| `statut` | ✅ Table column | |
| `id` | ❌ Not displayed | Auto-increment |
| `dt_fin` | ❌ Not displayed | Always null (active OFs) |
| `created_at` | ❌ Not displayed | Metadata |
| `updated_at` | ❌ Not displayed | Metadata |
| `synced_at` | ❌ Not displayed | Metadata |

## 14. Coupe QTE Departage Table
**Endpoint:** `GET /production/coupe/qte-departage`
**Component:** `ProductionTab` → Coupe tables

| Field | Displayed | Notes |
|-------|-----------|-------|
| `of` | ✅ Table column | |
| `article` | ✅ Table column | |
| `quantite` | ✅ Table column | |

## 15. Inline vs Endline Chart
**Endpoint:** `GET /production/inline-endline`
**Component:** `ProductionTab` → Coupe tables

| Field | Displayed | Notes |
|-------|-----------|-------|
| `shortname` | ✅ XAxis (as chaine) | |
| `opera` | ✅ Grouped into inline/endline bars | |
| `count` | ✅ Bar value | |
| `shift_code` | ❌ Not displayed | Available but unused |
| `log_date` | ❌ Not displayed | Filtered to today |
| `id` | ❌ Not displayed | Auto-increment |
| `synced_at` | ❌ Not displayed | Metadata |

## 16. Serigraphie Coverage
**Endpoint:** `GET /production/serigraphie/coverage`
**Component:** `ProductionTab` → Row 4

| Field | Displayed | Notes |
|-------|-----------|-------|
| `value` | ✅ Big number | |
| `status` | ✅ Traffic badge | |
| `target` | ✅ Target label | |

## 17. Serigraphie Flux
**Endpoint:** `GET /production/serigraphie/flux`
**Component:** `ProductionTab` → Seri panels

| Field | Displayed | Notes |
|-------|-----------|-------|
| `article` | ✅ XAxis | |
| `entree` | ✅ Bar | |
| `sortie` | ✅ Bar | |
| `couleur` | ✅ Tooltip on article | |

## 18. Serigraphie Rejets Table
**Endpoint:** `GET /production/serigraphie/rejets`
**Component:** `ProductionTab` → Seri panels

| Field | Displayed | Notes |
|-------|-----------|-------|
| `id_colis` | ✅ Table column | |
| `motif` | ✅ Table column | |
| `qtte` | ✅ Table column | |
| `reference` | ✅ Table column | |
| `date_rejet` | ✅ Table column | |
| `id` | ❌ Not displayed | Auto-increment |
| `synced_at` | ❌ Not displayed | Metadata |

## 19. Coupe Coverage
**Endpoint:** `GET /production/coupe/coverage`
**Component:** `ProductionTab` → Row 4

| Field | Displayed | Notes |
|-------|-----------|-------|
| `value` | ✅ Big number | |
| `status` | ✅ Traffic badge | |
| `unit` | ✅ "jours" suffix | |
| `delta_pcs` | ❌ Not displayed | Available but unused |

## 20. Coupe Chain Coverage
**Endpoint:** `GET /production/coupe/chain-coverage`
**Component:** `ProductionTab` → Row 4

| Field | Displayed | Notes |
|-------|-----------|-------|
| `value` | ✅ Total | |
| `unit` | ✅ "jours" | |
| `breakdown[].chaine` | ✅ YAxis | |
| `breakdown[].value` | ✅ Bar | |

## 21. Methods KPIs (Archivage, Respect Temps, Temps Acceptés)
**Endpoints:** `GET /production/taux-archivage`, `respect-temps-estime`, `taux-temps-acceptes`
**Component:** `ProductionKpiCard` + `ProductionKpiDetailModal`

| Field | Displayed | Notes |
|-------|-----------|-------|
| `value` | ✅ Card value | |
| `status` | ✅ Card status | |
| `target` | ✅ Card target | |
| `total` | ❌ Not displayed | Available but unused |
| `archived/respected/accepted` | ❌ Not displayed | Available but unused |

## 22. Modal — KPI Detail
**Endpoint:** `GET /production/breakdown/{kpiKey}`
**Component:** `ProductionKpiDetailModal`

| Field | Displayed | Notes |
|-------|-----------|-------|
| `kpi_key` | ✅ Config lookup | |
| `period` | ❌ Not displayed | Available but unused |
| `rows` | ✅ BreakdownTable | |
| `trend` | ✅ SparklineViz | |
| `synced_at` | ✅ Source section | |
