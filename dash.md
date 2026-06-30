# BACOVET Dashboard — Full Production-Ready Technical Specification
**Version:** 1.0 | **Based on:** CDC v2.2 + Novacity API v1.2

---

## 0. Global Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DATA SOURCES                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Novacity API│  │ Google Drive │  │  GPRO Consulting   │ │
│  │ (SDT / QCM /│  │  / Sheets    │  │  (Planning / SAM   │ │
│  │  DIVATEX)   │  │              │  │   / SOT / Dates)   │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘ │
└─────────┼────────────────┼───────────────────┼─────────────┘
          │ x-api-key      │ Service Account   │ credentials
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│  LARAVEL SYNC LAYER (Scheduled Jobs — app/Jobs/)            │
│  SyncNovacityJob  │  SyncDriveJob  │  SyncGproConsultingJob │
│  (runs every min) │  (4x/day)      │  (every 5 min)         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CENTRAL DATABASE (MySQL)                      │
│  Synced tables: sync_*  │  Config tables: users, screens…  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LARAVEL REST API  (routes/web.php)                         │
│  /quality/*  /production/*  /logistics/*        │
│  /development/*  /methods/*  /admin/*           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (SPA)                                             │
│  Auth → Role-based routing → Page components               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Environment Variables Required

```dotenv
# ── Novacity API ────────────────────────────────────────────
NOVACITY_API_BASE_URL=https://api.novacity.example.com
NOVACITY_API_KEY=<x-api-key>

# ── Google Drive / Sheets ───────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
GOOGLE_DRIVE_BR_PRINT_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_BR_CARE_LABEL_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_BR_ACCESSOIRES_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_BR_COMPO_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_INSPECTION_COMMANDE_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_DOT_HOT_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_DEVELOPMENT_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_GAMMES_SHEET_ID=<spreadsheet_id>
GOOGLE_DRIVE_COTATION_SHEET_ID=<spreadsheet_id>

# ── GPRO Consulting (planning data) ─────────────────────────
GPRO_CONSULTING_BASE_URL=<url>
GPRO_CONSULTING_API_KEY=<key>

# ── App ─────────────────────────────────────────────────────
DASHBOARD_SESSION_TTL_HOURS=8
```

Each pipeline checks for its ENV var at boot. If missing → job logs a warning and skips gracefully without crashing.

---

## 2. Laravel Sync Jobs — Complete Inventory

### 2.1 Novacity Jobs (every 1 minute via `*/1 * * * *`)

Each job calls one Novacity endpoint (or query), upserts into the local DB table using the primary key from the source. Use `limit=500&offset=0` with pagination loop when count > 500.

| Job Class | Novacity Endpoint | Local Table |
|---|---|---|
| `SyncItemTrxEnqJob` | `GET /api/data/itemtrxenq` | `sync_sdt_item_trx_enq` |
| `SyncItemTrxJob` | `GET /api/data/vwitemtrx` | `sync_sdt_item_trx` |
| `SyncLostTypeJob` | `GET /api/data/losttype` | `sync_sdt_lost_type` |
| `SyncLostTimeTrxJob` | `GET /api/data/losttimetrx` | `sync_sdt_lost_time_trx` |
| `SyncRoverEffectivenessJob` | `GET /api/data/rovereffectiveness` | `sync_qcm_rover_effectiveness` |
| `SyncProductionQcmJob` | `GET /api/data/production` | `sync_qcm_production` |
| `SyncInlineVsEndlineJob` | `GET /api/data/inlinevsendlinecomparison` | `sync_qcm_inline_vs_endline` |
| `SyncEmpDefectEffJob` | `GET /api/data/empdefecteff` | `sync_qcm_emp_defect_eff` |
| `SyncDefectJob` | `GET /api/data/vwdefect` | `sync_qcm_defects` |
| `SyncRejectQtyJob` | `GET /api/data/reject_qte` | `sync_qcm_reject_qty` |
| `SyncQcmDefectTrxJob` | `GET /api/data/qcmdefecttrx` | `sync_qcm_defect_trx` |
| `SyncCheckPassQtyJob` | `GET /api/data/checkpassqte` | `sync_qcm_check_pass_qty` |
| `SyncMpFamilleJob` | `GET /api/data/mp_famille` | `sync_diva_mp_famille` |
| `SyncMpJob` | `GET /api/data/mp` | `sync_diva_mp` |
| `SyncOFabricationJob` | `GET /api/data/ofabrication` | `sync_diva_ofabrication` |
| `SyncMouvementJob` | `GET /api/data/mouvement` | `sync_diva_mouvement` |
| `SyncMpConteneurJob` | `GET /api/data/mpconteneur` | `sync_diva_mp_conteneur` |
| `SyncArticlesColisJob` | `GET /api/data/articlescolis` | `sync_diva_article_colis` |
| `SyncDetailColisJob` | `GET /api/data/detailcolis` | `sync_diva_detail_colis` |
| `SyncExpeditionsJob` | `GET /api/data/expeditions` | `sync_diva_expeditions` |
| `SyncVueStockJob` | `GET /api/data/vue_stock` | `sync_diva_vue_stock` |
| `SyncDivaStockJob` | `GET /api/data/diva_stock` | `sync_diva_mvt_stock` |
| `SyncWipChaineJob` | `GET /api/data/q/wip_chaine` | `sync_sdt_wip_chaine` |
| `SyncTagingReelJob` | `GET /api/data/q/taging_reel` | `sync_sdt_taging_reel` |
| `SyncEtatAvancementJob` | `GET /api/data/q/etat_avancement` | `sync_sdt_etat_avancement` |
| `SyncEfficienceChaineJob` | `GET /api/data/q/efficience_chaine` | `sync_sdt_efficience_chaine` |
| `SyncMinutesPresenceJob` | `GET /api/data/q/minutes_presence` | `sync_sdt_minutes_presence` |
| `SyncMinutesProduiteJob` | `GET /api/data/q/minutes_produites` | `sync_sdt_minutes_produites` |
| `SyncTempsOperationJob` | `GET /api/data/q/temps_operation` | `sync_sdt_temps_operation` |
| `SyncLostTimeJob` | `GET /api/data/q/lost_time` | `sync_sdt_lost_time` |
| `SyncQteProduiteJob` | `GET /api/data/q/qte_produite` | `sync_sdt_qte_produite` |
| `SyncQteEntreeSerigraphieJob` | `GET /api/data/q/qte_entree_serigraphie` | `sync_sdt_qte_entree_serigraphie` |
| `SyncQteDepartChaineJob` | `GET /api/data/q/qte_depart_chaine_article_of` | `sync_sdt_qte_depart_chaine` |
| `SyncSortieSerigraphieJob` | `GET /api/data/q/sortie_serigraphie` | `sync_sdt_sortie_serigraphie` |
| `SyncQteEngagementJob` | `GET /api/data/q/qte_engagement` | `sync_sdt_qte_engagement` |
| `SyncSortieCoupeJob` | `GET /api/data/q/sortie_coupe` | `sync_sdt_sortie_coupe` |
| `SyncQteProduiteIndivJob` | `GET /api/data/q/qte_produite_indiv_jour` | `sync_sdt_qte_produite_indiv` |
| `SyncColisTotal3varJob` | `GET /api/data/q/colis_total_3var` | `sync_diva_colis_total` |
| `SyncPacketsRejetesJob` | `GET /api/data/q/packets_rejetes` | `sync_diva_packets_rejetes` |
| `SyncStockMoyenJob` | `GET /api/data/q/stock_moyen` | `sync_diva_stock_moyen` |
| `SyncArticlesSansMouvementJob` | `GET /api/data/q/articles_sans_mouvement_durant_365_jours` | `sync_diva_articles_sans_mvt` |
| `SyncQteTotaleStockJob` | `GET /api/data/q/quantite_totale_du_stock` | `sync_diva_qte_totale_stock` |
| `SyncCapaciteStockageJob` | `GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs` | `sync_diva_capacite_stockage` |
| `SyncNombreRouleauxJob` | `GET /api/data/q/nombre_de_rouleaux` | `sync_diva_rouleaux` |
| `SyncOFsLivresJob` | `GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel` | `sync_diva_ofs_livres` |
| `SyncMoyenneDateLivraisonJob` | `GET /api/data/q/moyenne_date_de_transfert_date_de_reservation` | `sync_diva_moyenne_livraison` |
| `SyncStockParProvenanceJob` | `GET /api/data/q/quantite_par_provenance_total` | `sync_diva_stock_provenance` |
| `SyncStockParFamilleJob` | `GET /api/data/q/quantite_par_famille` | `sync_diva_stock_famille` |
| `SyncStockParTypologieJob` | `GET /api/data/q/quantite_par_typologie_fournitures` | `sync_diva_stock_typologie` |
| `SyncPiecesOkJourJob` | `GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours` | `sync_qcm_pieces_ok_jour` |
| `SyncPiecesProduiteJourJob` | `GET /api/data/q/pieces_produites_jour_en_cours` | `sync_qcm_pieces_produites_jour` |
| `SyncPiecesOkAnneeJob` | `GET /api/data/q/pieces_ok_de_premier_coup_annee_en_cours` | `sync_qcm_pieces_ok_annee` |
| `SyncPiecesProduiteAnneeJob` | `GET /api/data/q/pieces_produites_annee_en_cours` | `sync_qcm_pieces_produites_annee` |
| `SyncBundleRejectJourJob` | `GET /api/data/q/rejets_suite_inspection_paquet_jour_en_cours` | `sync_qcm_bundle_reject_jour` |
| `SyncBundleInspectedJourJob` | `GET /api/data/q/inspections_paquet_jour_en_cours` | `sync_qcm_bundle_inspected_jour` |
| `SyncBundleRejectAnneeJob` | `GET /api/data/q/rejets_suite_inspection_paquet_annee_en_cours` | `sync_qcm_bundle_reject_annee` |
| `SyncBundleInspectedAnneeJob` | `GET /api/data/q/inspections_paquet_annee_en_cours` | `sync_qcm_bundle_inspected_annee` |

**⚠️ CRITICAL — INACTIVE NOVACITY ENDPOINTS:**
The following 4 Novacity queries are currently `État: Inactif`. The admin must activate them before BR Bundling KPIs will populate:
- `rejets_suite_inspection_paquet_jour_en_cours`
- `inspections_paquet_jour_en_cours`
- `rejets_suite_inspection_paquet_annee_en_cours`
- `inspections_paquet_annee_en_cours`

Your sync jobs for these should still run but log a warning if Novacity returns empty/zero rows.

---

### 2.2 Google Drive / Sheets Jobs

| Job Class | Drive Sheet | Columns expected | Local Table | Schedule |
|---|---|---|---|---|
| `SyncDriveBrPrintJob` | `BR_PRINT_SHEET_ID` | `date, nb_inspections, nb_rejets` | `sync_drive_br_print` | Every 6h |
| `SyncDriveBrCareLabelJob` | `BR_CARE_LABEL_SHEET_ID` | `date, nb_inspections, nb_rejets` | `sync_drive_br_care_label` | Every 6h |
| `SyncDriveBrAccessoiresJob` | `BR_ACCESSOIRES_SHEET_ID` | `date, nb_inspections, nb_rejets` | `sync_drive_br_accessoires` | Every 6h |
| `SyncDriveBrCompoJob` | `BR_COMPO_SHEET_ID` | `date, nb_inspections, nb_rejets` | `sync_drive_br_compo` | Every 6h |
| `SyncDriveInspectionCommandeJob` | `INSPECTION_COMMANDE_SHEET_ID` | `date, nb_inspections, nb_rejets` | `sync_drive_inspection_commande` | Every 6h |
| `SyncDriveDotHotJob` | `DOT_HOT_SHEET_ID` | `date, of, qte_commandee, qte_livree_on_time, type (DOT/HOT)` | `sync_drive_dot_hot` | Every 6h |
| `SyncDriveDevelopmentJob` | `DEVELOPMENT_SHEET_ID` | `date, modele, statut_validation, date_livraison_prevue, date_livraison_reelle, nomenclature_valide, est_reclamation` | `sync_drive_development` | Daily |
| `SyncDriveGammesJob` | `GAMMES_SHEET_ID` | `article, nb_gammes_total, nb_gammes_acceptees_v1` | `sync_drive_gammes` | Daily |
| `SyncDriveCotationJob` | `COTATION_SHEET_ID` | `article, temps_cotation_min, temps_production_min` | `sync_drive_cotation` | Per new start |

**Note on Drive sheets:** All sheets must have a standardized header row. Document the exact column order per sheet and validate at sync time. Reject and log rows with null `date` or negative quantities.

---

### 2.3 GPRO Consulting Jobs

GPRO Consulting supplies planning/master data not available via SDT/QCM. These endpoints require separate credentials.

| Job Class | Data | Local Table | Schedule |
|---|---|---|---|
| `SyncGproChainPlanningJob` | Chain-OF assignments: chaine, of_numero, qte_of, objectif_journalier, cadence_moyenne, cadence_hebdo | `sync_gpro_chain_planning` | Every 5 min |
| `SyncGproArticleMasterJob` | Article master: code_article, designation, sam_min, sot_min, effectif_requis | `sync_gpro_article_master` | Every 15 min |
| `SyncGproOfDatesJob` | OF dates per chain: of_numero, chaine, bpd, epd, ehd | `sync_gpro_of_dates` | Every 5 min |
| `SyncGproSuiviPaquetsJob` | OF archiving tracking: of_numero, est_solde, est_archive | `sync_gpro_suivi_paquets` | Daily |

**⚠️ GAP:** GPRO Consulting credentials and API spec are not in the provided documents. These tables must be populated for F-REQ-202, 204, 211–215, 301–312 to work. Placeholder tables should exist; KPIs that depend on this data must display "En attente de données" when the table is empty.

---

### 2.4 Sync Job Base Pattern (Laravel)

Every sync job must follow this pattern:

```php
class SyncXxxJob implements ShouldQueue {
    public function handle(): void {
        if (!config('services.novacity.api_key')) {
            Log::warning('SyncXxxJob: NOVACITY_API_KEY not configured, skipping.');
            return;
        }
        try {
            $response = Http::withHeader('x-api-key', config('services.novacity.api_key'))
                ->get(config('services.novacity.base_url') . '/api/data/xxx', [
                    'limit' => 500, 'offset' => 0,
                ]);
            $rows = $response->json('data', []);
            foreach ($rows as $row) {
                DB::table('sync_xxx')->upsert(
                    [...$row, 'synced_at' => now()],
                    ['primary_key_column'],   // conflict key
                    [...updateable_columns]
                );
            }
            SyncLog::record('sync_xxx', count($rows), 'ok');
        } catch (\Throwable $e) {
            SyncLog::record('sync_xxx', 0, 'error', $e->getMessage());
            Log::error('SyncXxxJob failed: ' . $e->getMessage());
        }
    }
}
```

Every table must have a `synced_at TIMESTAMP` column. The `sync_logs` table tracks every job run for the Admin supervision panel.

---

## 3. Central DB Schema (Key Tables)

All sync tables include `synced_at TIMESTAMP` and an auto-increment `id`.
Index on date columns + chain/OF identifiers for fast dashboard queries.

### sync_qcm_pieces_ok_jour
```sql
id, FirstPassToday INT, snapshot_date DATE, synced_at TIMESTAMP
-- PK on snapshot_date (one row per day, upsert on date)
```

### sync_qcm_pieces_produites_jour
```sql
id, ProducedToday INT, snapshot_date DATE, synced_at TIMESTAMP
```

### sync_qcm_pieces_ok_annee
```sql
id, FirstPassYear BIGINT, annee YEAR, synced_at TIMESTAMP
```

### sync_qcm_pieces_produites_annee
```sql
id, ProducedYear BIGINT, annee YEAR, synced_at TIMESTAMP
```

### sync_qcm_bundle_reject_jour / _annee
```sql
id, BundleRejectToday INT (or BundleRejectYear), snapshot_date DATE, synced_at TIMESTAMP
```

### sync_qcm_bundle_inspected_jour / _annee
```sql
id, BundleInspectedToday INT (or BundleInspectedYear), snapshot_date DATE, synced_at TIMESTAMP
```

### sync_qcm_defects
```sql
id, LOGDATE DATETIME, ShiftCode VARCHAR(5), ProdGroup VARCHAR(20),
OpNo VARCHAR(20), Qty INT, synced_at TIMESTAMP
INDEX(LOGDATE, ProdGroup, OpNo)
```

### sync_qcm_check_pass_qty
```sql
id, LOGDATE DATE, SHORTNAME VARCHAR(20), ShiftCode VARCHAR(5),
DefectPct DECIMAL(5,2), synced_at TIMESTAMP
INDEX(LOGDATE, SHORTNAME)
```

### sync_qcm_rover_effectiveness
```sql
id, LOGDATE DATE, ShiftCode VARCHAR(5), SHORTNAME VARCHAR(20),
MONO DECIMAL(5,2), synced_at TIMESTAMP
INDEX(LOGDATE, SHORTNAME)
```

### sync_qcm_reject_qty
```sql
id, LogDate DATE, ShiftCode VARCHAR(5), SHORTNAME VARCHAR(20),
STYLECODE VARCHAR(50), synced_at TIMESTAMP
INDEX(LogDate, SHORTNAME)
```

### sync_sdt_efficience_chaine
```sql
id, chaine VARCHAR(20), date DATE, heures_prod DECIMAL(6,2),
heures_standards DECIMAL(6,2), efficience_pct DECIMAL(5,2), synced_at TIMESTAMP
INDEX(date, chaine)
```

### sync_sdt_minutes_presence
```sql
id, employe VARCHAR(30), date DATE, minutes_presence INT, chaine VARCHAR(20), synced_at TIMESTAMP
INDEX(date, chaine, employe)
```

### sync_sdt_minutes_produites
```sql
id, employe VARCHAR(30), date DATE, minutes_produites INT, chaine VARCHAR(20), synced_at TIMESTAMP
INDEX(date, chaine, employe)
```

### sync_sdt_wip_chaine
```sql
id, chaine VARCHAR(20), en_cours INT, entree_jour INT, sortie_jour INT, synced_at TIMESTAMP
INDEX(chaine)
-- Upsert on chaine (keep latest)
```

### sync_sdt_taging_reel
```sql
id, chaine VARCHAR(20), shift VARCHAR(5), tag_theorique INT, tag_reel INT,
ecart_pct DECIMAL(5,2), synced_at TIMESTAMP
INDEX(chaine, shift)
```

### sync_sdt_etat_avancement
```sql
id, of VARCHAR(50), avancement_pct DECIMAL(5,2), quantite_prevue INT,
quantite_realisee INT, statut VARCHAR(20), synced_at TIMESTAMP
INDEX(of, statut)
-- Upsert on of
```

### sync_sdt_lost_time
```sql
id, date DATE, chaine VARCHAR(20), motif VARCHAR(50),
minutes_perdues INT, synced_at TIMESTAMP
INDEX(date, chaine)
```

### sync_sdt_qte_produite
```sql
id, date DATE, chaine VARCHAR(20), shift VARCHAR(5), quantite INT, synced_at TIMESTAMP
INDEX(date, chaine)
```

### sync_sdt_qte_entree_serigraphie
```sql
id, date DATE, article VARCHAR(50), couleur VARCHAR(30), quantite INT, synced_at TIMESTAMP
INDEX(date)
```

### sync_sdt_sortie_serigraphie
```sql
id, date DATE, article VARCHAR(50), couleur VARCHAR(30), quantite INT, synced_at TIMESTAMP
INDEX(date)
```

### sync_sdt_qte_engagement
```sql
id, commande VARCHAR(50), of VARCHAR(50), article VARCHAR(50), quantite_engagee INT, synced_at TIMESTAMP
INDEX(of)
```

### sync_sdt_sortie_coupe
```sql
id, commande VARCHAR(50), date DATE, quantite_coupee INT, synced_at TIMESTAMP
INDEX(commande)
```

### sync_sdt_qte_produite_indiv
```sql
id, employe VARCHAR(30), date DATE, chaine VARCHAR(20),
quantite INT, minutes_produites INT, synced_at TIMESTAMP
INDEX(date, chaine, employe)
```

### sync_sdt_qte_depart_chaine
```sql
id, of VARCHAR(50), chaine VARCHAR(20), article VARCHAR(50), quantite INT, synced_at TIMESTAMP
INDEX(of, chaine)
```

### sync_sdt_temps_operation
```sql
id, operation VARCHAR(20), temps_standard_s DECIMAL(8,2),
temps_reel_s DECIMAL(8,2), ecart_pct DECIMAL(5,2), synced_at TIMESTAMP
INDEX(operation)
```

### sync_diva_ofabrication
```sql
id, IDOFabrication INT UNIQUE, OFabrication VARCHAR(50),
DtDebut DATETIME, DtFin DATETIME, synced_at TIMESTAMP
INDEX(IDOFabrication)
```

### sync_diva_vue_stock
```sql
id, idmp INT, codemp VARCHAR(50), designation VARCHAR(200),
Couleur VARCHAR(50), Famille VARCHAR(100), synced_at TIMESTAMP
INDEX(idmp)
```

### sync_diva_mvt_stock
```sql
id, IDMvtStock BIGINT UNIQUE, IDMP INT, IDMagasin INT,
Qtte DECIMAL(15,2), qtteReserve DECIMAL(15,2), synced_at TIMESTAMP
INDEX(IDMvtStock, IDMP)
```

### sync_diva_stock_moyen
```sql
id, StockMoyen DECIMAL(15,2), NbLignesStock INT, snapshot_at TIMESTAMP, synced_at TIMESTAMP
-- Insert-only (time series), or keep only latest row
```

### sync_diva_articles_sans_mvt
```sql
id, NbArticles_SansMvt_365j INT, Qtte_SansMvt_365j DECIMAL(15,2), snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_qte_totale_stock
```sql
id, Quantite_Totale_Stock DECIMAL(15,2), snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_capacite_stockage
```sql
id, Total_Conteneurs INT, Conteneurs_Actifs INT, Conteneurs_Consommes INT,
Conteneurs_Supprimes INT, snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_rouleaux
```sql
id, NbRouleaux INT, snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_ofs_livres
```sql
id, NbOF_Livres_Total INT, OF_AvecTransfertCoupe INT,
OF_AvecTransfertCoupeJemmel INT, OF_AvecTransfertCoupe_Total INT,
snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_moyenne_livraison
```sql
id, MoyenneJours DECIMAL(8,2), NbOFConsideres INT, snapshot_at TIMESTAMP, synced_at TIMESTAMP
```

### sync_diva_stock_provenance
```sql
id, Provenance VARCHAR(100), Quantite DECIMAL(15,2), NbArticles INT, synced_at TIMESTAMP
-- Full replace on each sync (delete + insert or upsert on Provenance)
```

### sync_diva_stock_famille
```sql
id, FamilleFG VARCHAR(100), Quantite DECIMAL(15,2), synced_at TIMESTAMP
```

### sync_diva_stock_typologie
```sql
id, Typologie VARCHAR(100), Quantite DECIMAL(15,2), NbArticles INT, synced_at TIMESTAMP
```

### sync_diva_packets_rejetes
```sql
id, IDColis INT, reference VARCHAR(50), motif VARCHAR(200),
qtte INT, date_rejet DATETIME, synced_at TIMESTAMP
INDEX(IDColis, date_rejet)
```

### sync_drive_br_print / care_label / accessoires / compo
```sql
id, date DATE UNIQUE, nb_inspections INT, nb_rejets INT,
source VARCHAR(30), synced_at TIMESTAMP
```

### sync_drive_inspection_commande
```sql
id, date DATE UNIQUE, nb_inspections INT, nb_rejets INT, synced_at TIMESTAMP
```

### sync_drive_dot_hot
```sql
id, date DATE, of VARCHAR(50), type ENUM('DOT','HOT'),
qte_commandee INT, qte_livree_on_time INT, synced_at TIMESTAMP
INDEX(date, type)
```

### sync_drive_development
```sql
id, date DATE, modele VARCHAR(100), statut_validation ENUM('OK','NOK','PENDING'),
date_livraison_prevue DATE, date_livraison_reelle DATE,
nomenclature_valide TINYINT(1), est_reclamation TINYINT(1), synced_at TIMESTAMP
INDEX(date)
```

### sync_drive_gammes
```sql
id, article VARCHAR(100) UNIQUE, nb_gammes_total INT,
nb_gammes_acceptees_v1 INT, synced_at TIMESTAMP
```

### sync_drive_cotation
```sql
id, article VARCHAR(100), temps_cotation_min DECIMAL(8,2),
temps_production_min DECIMAL(8,2), date DATE, synced_at TIMESTAMP
INDEX(article, date)
```

### sync_gpro_chain_planning
```sql
id, chaine VARCHAR(20), of_numero VARCHAR(50), qte_of INT,
objectif_journalier INT, cadence_moyenne DECIMAL(8,2),
cadence_hebdo DECIMAL(8,2), synced_at TIMESTAMP
INDEX(chaine, of_numero)
```

### sync_gpro_article_master
```sql
id, code_article VARCHAR(50) UNIQUE, designation VARCHAR(200),
sam_min DECIMAL(8,3), sot_min DECIMAL(8,3), effectif_requis INT, synced_at TIMESTAMP
```

### sync_gpro_of_dates
```sql
id, of_numero VARCHAR(50), chaine VARCHAR(20), bpd DATE, epd DATE, ehd DATE, synced_at TIMESTAMP
INDEX(of_numero, chaine)
```

### sync_gpro_suivi_paquets
```sql
id, of_numero VARCHAR(50) UNIQUE, est_solde TINYINT(1), est_archive TINYINT(1), synced_at TIMESTAMP
```

### sync_logs (for Admin supervision)
```sql
id, job_class VARCHAR(100), table_name VARCHAR(100), rows_synced INT,
status ENUM('ok','error','skipped'), message TEXT,
duration_ms INT, executed_at TIMESTAMP
INDEX(job_class, executed_at)
```

---

## 4. PAGE: QUALITÉ (Série 100) — F-REQ-402

**Audience:** Responsable Qualité, Direction (read-only)
**Refresh:** Real-time (WebSocket or polling every 30s for GPRO data; 6h for Drive data)
**Display:** Industrial wall screen + desktop

---

### 4.1 KPI Inventory

#### F-REQ-101 — BR (Taux de Rejet Commande Annuel)
- **Formula:** `SUM(nb_rejets) / SUM(nb_inspections) * 100` — YTD (Jan 1 to today)
- **Source table:** `sync_drive_inspection_commande`
- **Target:** ≤ 5%
- **Colors:** Green < 4% | Orange 4–5% | Red > 5%
- **Chart:** Big Number with color badge + trend arrow vs last week
- **Laravel endpoint:** `GET /api/quality/br-commande`

#### F-REQ-102 — BR GTD (Taux de Rejet Contrôle par Chaîne — Jour)
- **Formula:** Per chain: `SUM(DefectPct)` from `sync_qcm_check_pass_qty` WHERE `LOGDATE = TODAY`
  - OR: Count rejets from `sync_qcm_reject_qty` / Count inspections from `sync_qcm_production` * 100
- **Source tables:** `sync_qcm_check_pass_qty`, `sync_qcm_reject_qty`
- **Target:** ≤ 5% per chain
- **Colors:** Green < 4% | Orange 4–5% | Red > 5%
- **Chart:** Big Number per chain (cards layout, one per active chain)
- **Laravel endpoint:** `GET /api/quality/br-gtd-jour`
- **Response:** `[{ chaine, br_gtd_pct, color_status }]`

#### F-REQ-103 — BR GTD DDA (Annuel RFID par Chaîne)
- **Formula:** Annual cumulative from `sync_qcm_check_pass_qty` WHERE `LOGDATE >= YEAR_START`
  - `SUM(DefectPct * weight) / COUNT(...)` — or aggregate from raw counts if available
- **Source table:** `sync_qcm_check_pass_qty`
- **Target:** ≤ 5%
- **Chart:** Line Chart (monthly trend) + Big Number current value
- **Laravel endpoint:** `GET /api/quality/br-gtd-dda`
- **Response:** `{ current_value, monthly_series: [{month, value}], color_status }`

#### F-REQ-104 — RFT (Right First Time — Jour)
- **Formula:** `FirstPassToday / ProducedToday * 100`
- **Source tables:** `sync_qcm_pieces_ok_jour`, `sync_qcm_pieces_produites_jour`
- **Target:** ≥ 98%
- **Colors:** Green ≥ 98% | Orange 95–97.9% | Red < 95%
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/quality/rft-jour`
- **⚠️ Note:** Validate that `ProducedToday` > 0 before dividing. Return null if both are 0 (no production yet today).

#### F-REQ-105 — RFT DDA (Annuel)
- **Formula:** `FirstPassYear / ProducedYear * 100`
- **Source tables:** `sync_qcm_pieces_ok_annee`, `sync_qcm_pieces_produites_annee`
- **Target:** ≥ 98%
- **Chart:** Line Chart (monthly trend from `sync_qcm_pieces_ok_jour` accumulated) + Big Number
- **Laravel endpoint:** `GET /api/quality/rft-dda`

#### F-REQ-106 — BR Bundling (Jour)
- **Formula:** `BundleRejectToday / BundleInspectedToday * 100`
- **Source tables:** `sync_qcm_bundle_reject_jour`, `sync_qcm_bundle_inspected_jour`
- **Target:** ≤ 5%
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/quality/br-bundling-jour`
- **⚠️ Note:** INACTIVE in Novacity — display "Source inactive" badge if table has 0 rows today.

#### F-REQ-107 — BR Bundling DDA (Annuel)
- **Formula:** `SUM(BundleRejectYear) / SUM(BundleInspectedYear) * 100` — YTD
- **Source tables:** `sync_qcm_bundle_reject_annee`, `sync_qcm_bundle_inspected_annee`
- **Target:** ≤ 5%
- **Chart:** Line Chart + Big Number
- **⚠️ Note:** INACTIVE in Novacity — same caveat.

#### F-REQ-108 — BR Print (Jour)
- **Formula:** `SUM(nb_rejets WHERE date = TODAY) / SUM(nb_inspections WHERE date = TODAY) * 100`
- **Source table:** `sync_drive_br_print`
- **Target:** ≤ 5% | **Refresh:** 4x/day (every 6h)
- **Chart:** Big Number with color

#### F-REQ-109 — BR Print DDA (Annuel)
- **Formula:** YTD cumulative from `sync_drive_br_print`
- **Chart:** Line Chart + Big Number | **Laravel endpoint:** `GET /api/quality/br-print-dda`

#### F-REQ-110 — BR Care Label (Jour)
- **Formula:** Same pattern as F-REQ-108 but from `sync_drive_br_care_label`
- **Target:** ≤ 5% | 4x/day | Big Number

#### F-REQ-111 — BR Care Label DDA
- **Source:** `sync_drive_br_care_label` — YTD | Line Chart + Big Number

#### F-REQ-112 — BR Accessoires (Jour)
- **Source:** `sync_drive_br_accessoires` | Target ≤ 5% | 4x/day | Big Number

#### F-REQ-113 — BR Accessoires DDA
- **Source:** `sync_drive_br_accessoires` — YTD | Line Chart + Big Number

#### F-REQ-114 — BR Compo (Jour)
- **Source:** `sync_drive_br_compo` | Target ≤ 5% | 4x/day | Big Number

#### F-REQ-115 — BR Compo DDA
- **Source:** `sync_drive_br_compo` — YTD | Line Chart + Big Number

#### F-REQ-116 — Pareto Defects RFT (Jour)
- **Formula:** Count of defects per operation from `sync_qcm_defects` WHERE `LOGDATE = TODAY`, aggregated by `OpNo`, sorted DESC, top operations shown as Pareto bars.
- **Source table:** `sync_qcm_defects`
- **Chart:** Interactive Pareto Chart (bar + cumulative line)
- **Laravel endpoint:** `GET /api/quality/pareto-rft`
- **Response:** `[{ operation, OpNo, qty, cumulative_pct }]` — top 10

#### F-REQ-117 — Pareto Defects FG (Jour) — Inspection Colis AQL + RFID
- **Formula:** Defects from `sync_diva_packets_rejetes` (by `motif`) + rejets from Drive inspection WHERE `date = TODAY`, sorted DESC.
- **Source tables:** `sync_diva_packets_rejetes`, `sync_drive_inspection_commande`
- **Chart:** Interactive Pareto Chart
- **Laravel endpoint:** `GET /api/quality/pareto-fg`

#### F-REQ-118 — Best QP Team (Top 3 Chains)
- **Formula per chain:** `score = (BR_ok ? 1 : 0)*5 + (BR_IN_ok ? 1 : 0)*3 + (BR_GTD_ok ? 1 : 0)*3 + (RFT_ok ? 1 : 0)*1`
  - `BR_ok` = BR ≤ 5% | `BR_IN_ok` = F-REQ-101 ≤ 5% | `BR_GTD_ok` = F-REQ-102 ≤ 5% | `RFT_ok` = F-REQ-104 ≥ 98%
- **Source tables:** computed from `sync_qcm_check_pass_qty`, `sync_qcm_pieces_ok_jour`, `sync_qcm_pieces_produites_jour`
- **Chart:** Podium / Top 3 List (Gold/Silver/Bronze)
- **Laravel endpoint:** `GET /api/quality/best-qp-team`

#### F-REQ-119 — Low QP Team (Bottom 3 Chains)
- Same computation as F-REQ-118, sorted ASC → bottom 3 chains needing attention.
- **Chart:** Bottom 3 List (with Red warning badges)
- **Laravel endpoint:** `GET /api/quality/low-qp-team`

---

### 4.2 Quality Page — Frontend Component Checklist

- [ ] `KpiCard` — Big Number with color badge, target label, source label, last-sync timestamp
- [ ] `LineChartDDA` — Monthly trend line chart with target reference line
- [ ] `ParetoChart` — Interactive bar + cumulative line, click to drill down by defect type
- [ ] `PodiumCard` — Top 3 / Bottom 3 ranking card with chain name and score
- [ ] `FilterBar` — Dropdowns: Marque, Atelier (chain), OF (order)
- [ ] `LastSyncBadge` — Shows "LIVE SYNC: OK" or "⚠ Hors ligne" per data source
- [ ] `InactiveSourceBanner` — Yellow banner when a Novacity source is inactive
- [ ] `ExportButton` — Export current view data as Excel (F-REQ-409)
- [ ] `AlertPanel` — Right sidebar showing last 5 quality alerts that crossed threshold

### 4.3 Quality Page — API Endpoints (Laravel)

```
GET /api/quality/summary         → all Big Number KPIs in one call (F-REQ-101–115)
GET /api/quality/br-gtd-jour     → per-chain BR GTD today
GET /api/quality/br-gtd-dda      → per-chain BR GTD annual line chart
GET /api/quality/rft-jour        → RFT today
GET /api/quality/rft-dda         → RFT annual line chart
GET /api/quality/br-bundling     → BR bundling today + annual
GET /api/quality/br-drive        → all Drive-sourced BRs (Print/CareLabel/Accessoires/Compo)
GET /api/quality/pareto-rft      → Pareto defects RFT today
GET /api/quality/pareto-fg       → Pareto defects FG today
GET /api/quality/best-qp-team    → top 3 chains by quality score
GET /api/quality/low-qp-team     → bottom 3 chains by quality score
```

All endpoints accept query params: `?chaine=CH1&marque=DOMYOS&of=OF-2026-0412`

---

## 5. PAGE: PRODUCTION (Série 200) — F-REQ-403

**Audience:** Responsable Production, Chef d'Atelier (per workshop: Confection / Coupe / Sérigraphie)
**Refresh:** Real-time (every 60s polling or WebSocket push)
**Display:** Wall-mounted industrial screens — must be readable at 5m (NF-REQ-507)
**Sub-views:** Vue Confection | Vue Coupe | Vue Sérigraphie

---

### 5.1 KPI Inventory

#### F-REQ-201 — Efficience par Opérateur par Chaîne
- **Formula:** `(minutes_produites / minutes_presence) * 100` per employee
- **Source tables:** JOIN `sync_sdt_minutes_produites` AND `sync_sdt_minutes_presence` ON `(employe, date, chaine)` WHERE `date = TODAY`
- **Target:** ≥ 90%
- **Chart:** Combo Bar/Line — bars per operator (actual efficiency), line = 90% target
- **Laravel endpoint:** `GET /api/production/efficience-operateur?chaine=CH1&date=today`
- **Response:** `[{ employe, chaine, minutes_presence, minutes_produites, efficience_pct }]`
- **Views:** Confection ✓ | Coupe ✓ | Sérigraphie ✗

#### F-REQ-202 — Efficience PAR CHAÎNE (Journalière)
- **Formula:** `(qte_declaree * SOT) / (effectif * minutes_presence) * 100`
  - `qte_declaree` = `sync_sdt_qte_produite.quantite` WHERE `date = TODAY`
  - `SOT` = `sync_gpro_article_master.sot_min` (join via current OF on chain)
  - `effectif` = `sync_gpro_chain_planning.objectif_journalier` (or GPRO consulting)
  - `minutes_presence` = SUM from `sync_sdt_minutes_presence` WHERE `date = TODAY AND chaine`
  - **Alternatively (if GPRO consulting unavailable):** use `sync_sdt_efficience_chaine.efficience_pct` directly
- **Target:** > 85%
- **Chart:** Gauge Chart per chain (one gauge per chain, color-coded)
- **Laravel endpoint:** `GET /api/production/efficience-chaine`
- **Response:** `[{ chaine, efficience_pct, target:85, color_status }]`

#### F-REQ-203 — Efficience Cumulée Chaîne (Mois en Cours)
- **Formula:** `SUM(minutes_produites for current month) / SUM(minutes_presence for current month) * 100` per chain
- **Source tables:** `sync_sdt_minutes_presence`, `sync_sdt_minutes_produites` WHERE `date >= MONTH_START`
- **Target:** > 85%
- **Chart:** Line Chart — daily trend line per chain for current month
- **Laravel endpoint:** `GET /api/production/efficience-cumulee?chaine=CH1`

#### F-REQ-204 — OWE par Chaîne (Output per Working Employee)
- **Formula:** `(qte_declaree * SAM) / (effectif * minutes_presence) * 100`
  - `SAM` = `sync_gpro_article_master.sam_min`
  - Same sources as F-REQ-202 but using SAM instead of SOT
- **Target:** > 70%
- **Chart:** Big Number with color per chain
- **Laravel endpoint:** `GET /api/production/owe-chaine`

#### F-REQ-205 — WIP par Chaîne
- **Formula:** `sortie_jour - quantite_engagee`
  - `sortie_jour` = `sync_sdt_wip_chaine.sortie_jour` (latest row per chain)
  - `quantite_engagee` = `sync_sdt_qte_engagement.quantite_engagee` for current OF on chain
- **Target:** ≤ ½ cadence chain
- **Chart:** Gauge Chart (fill = WIP / max_threshold, red if > ½ cadence)
- **Laravel endpoint:** `GET /api/production/wip-chaine`

#### F-REQ-206 — WIP OPTIMAL
- **Formula:** `qte_sortie_coupe - qte_engagement` per (chain, article, OF)
  - `qte_sortie_coupe` from `sync_sdt_sortie_coupe.quantite_coupee`
  - `qte_engagement` from `sync_sdt_qte_engagement.quantite_engagee`
- **Target:** ≥ 1.5 × cadence chain
- **Chart:** Area Chart — x: time, y: WIP level, shaded bands for optimal zone
- **Laravel endpoint:** `GET /api/production/wip-optimal`

#### F-REQ-207 — Arrêts Non Planifiés par Chaîne
- **Formula:** Show lost time events from `sync_sdt_lost_time` WHERE `date = TODAY`, joined with `sync_sdt_lost_type` for descriptions
- **Target:** < 10 minutes total per chain per day
- **Chart:** Timeline (Gantt-like horizontal bars per chain) + table listing motif and duration
- **Data:** `{ chaine, motif_code, motif_desc, minutes_perdues, heure_debut (estimated) }`
- **Laravel endpoint:** `GET /api/production/lost-time?chaine=CH1&date=today`
- **Alert:** Flash/blink the chain cell when cumulative lost_time > 10 minutes

#### F-REQ-208 — Efficience Départage par Opératrice
- **Formula:** `(minutes_produites_poste221 / minutes_presence) * 100`
  - Filter `sync_sdt_minutes_produites` by operation code `221` (from `sync_sdt_temps_operation.operation = 'OP221'` or equivalent post code)
- **Target:** > 85%
- **Chart:** Combo Bar/Line per operator
- **Views:** Confection ✓

#### F-REQ-209 — Efficience Vignettes par Opératrice
- **Formula:** Same as F-REQ-208 but for post code `213`
- **Target:** > 85%
- **Chart:** Combo Bar/Line per operator

#### F-REQ-210 — Top Opérateurs Coupe
- **Formula:** `(quantite_indiv * temps_operation) / minutes_presence * 100`
  - `quantite_indiv` = `sync_sdt_qte_produite_indiv.quantite`
  - `temps_operation` = average from `sync_sdt_temps_operation.temps_standard_s`
  - `minutes_presence` = `sync_sdt_qte_produite_indiv.minutes_produites` (proxy)
- **Target:** ≥ 90%
- **Chart:** Horizontal Bar Chart — top N operators, sorted by efficiency DESC
- **Laravel endpoint:** `GET /api/production/top-operateurs?chaine=CH1&limit=10`
- **Views:** Coupe ✓

#### F-REQ-211 — SAM par Chaîne
- **Source:** `sync_gpro_article_master.sam_min` joined via current OF on chain
- **Chart:** Big Number per chain
- **Laravel endpoint:** `GET /api/production/sam-chaine`

#### F-REQ-212 — SOT par Chaîne
- **Source:** `sync_gpro_article_master.sot_min`
- **Chart:** Big Number per chain

#### F-REQ-213 — Effectifs par Chaîne
- **Source:** `sync_gpro_chain_planning.objectif_journalier` or `sync_gpro_article_master.effectif_requis`
- **Chart:** Big Number per chain

#### F-REQ-214 — Code Article par Chaîne
- **Source:** `sync_gpro_chain_planning.of_numero` → join `sync_diva_ofabrication` or GPRO article master
- **Chart:** Big Number (text display)

#### F-REQ-215 — Désignation d'Article par Chaîne
- **Source:** `sync_gpro_article_master.designation` via current OF on chain
- **Chart:** Big Number (text display)

---

### 5.2 Methods KPIs (on Production Page — Série 200, Annexe Priorité 01)

#### F-REQ-216 — Taux d'Archivage Suivi Paquets par Chaîne
- **Formula:** `SUM(est_archive WHERE est_solde=1) / SUM(est_solde=1) * 100`
- **Source table:** `sync_gpro_suivi_paquets`
- **Target:** 85%
- **Chart:** Gauge Chart
- **Refresh:** Daily
- **Laravel endpoint:** `GET /api/production/taux-archivage`

#### F-REQ-217 — Taux de Fiabilité des Données sur Système par OF
- **Formula:** Compare `tag_reel` vs expected sortie from `sync_sdt_taging_reel`
  - `(1 - ABS(tag_theorique - tag_reel) / tag_theorique) * 100` per OF/chain
- **Source table:** `sync_sdt_taging_reel`
- **Target:** 95%
- **Chart:** Gauge Chart per OF
- **Laravel endpoint:** `GET /api/production/fiabilite-donnees`

#### F-REQ-218 — Taux de Respect du Temps Estimé par Article
- **Formula:** `COUNT(temps_cotation_min - temps_production_min >= 0) / COUNT(*) * 100`
- **Source tables:** `sync_drive_cotation`
- **Target:** 90%
- **Chart:** Big Number with color
- **Refresh:** Per new startup (manual trigger or on Drive sync)
- **Laravel endpoint:** `GET /api/production/respect-temps-estime`

#### F-REQ-219 — Taux des Temps Acceptés dès la 1ère Version par Article
- **Formula:** `(nb_gammes_total - (nb_gammes_total - nb_gammes_acceptees_v1)) / nb_gammes_total * 100`
  - Simplified: `nb_gammes_acceptees_v1 / nb_gammes_total * 100`
- **Source table:** `sync_drive_gammes`
- **Target:** ≥ 80%
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/production/taux-temps-acceptes`

---

### 5.3 Production Page — Additional Required KPIs (from Annex Priority 01)

The following planning KPIs also appear on the Production page views:

#### F-REQ-301 — OF ou OFs Confection par Chaîne
- **Source:** `sync_sdt_etat_avancement WHERE statut = 'en_cours'`
- **Chart:** Big Number + scrollable list of active OFs
- **Views:** Confection ✓

#### F-REQ-302 — OF Coupe en Cours
- **Source:** `sync_sdt_etat_avancement WHERE statut = 'en_cours'` + `sync_diva_ofabrication WHERE DtFin IS NULL`
- **Chart:** Big Number + list
- **Views:** Coupe ✓

#### F-REQ-303 — Quantité OF par Article
- **Source:** `sync_sdt_etat_avancement.quantite_prevue`
- **Chart:** Big Number + list

#### F-REQ-304 — SO Progress par OF
- **Source:** `sync_sdt_etat_avancement.avancement_pct` (multiple control points)
- **Chart:** Bar Chart per chain (horizontal progress bars per OF)

#### F-REQ-305 — Taux d'Avancement OF
- **Formula:** `quantite_realisee / quantite_prevue * 100`
- **Source:** `sync_sdt_etat_avancement`
- **Chart:** Donut Chart per OF

#### F-REQ-306/307/308 — BPD / EPD / EHD par OF par Chaîne
- **Source:** `sync_gpro_of_dates`
- **Chart:** Big Number (date display)
- **Color rule:** EHD RED if EHD < TODAY + 3 days | ORANGE if < TODAY + 7 days

#### F-REQ-309 — Couverture Sérigraphie
- **Formula:** `qte_entree - qte_sortie`
  - `qte_entree` = latest SUM from `sync_sdt_qte_entree_serigraphie WHERE date = TODAY`
  - `qte_sortie` = latest SUM from `sync_sdt_sortie_serigraphie WHERE date = TODAY`
- **Target:** > cadence hebdomadaire
- **Chart:** Bar Chart per article/chain
- **Views:** Sérigraphie ✓

#### F-REQ-310 — Couverture Chaîne
- **Formula:** `(qte_engagee - qte_planifiee) / cadence_moyenne`
  - `qte_engagee` = `sync_sdt_qte_engagement`
  - `qte_planifiee` = `sync_gpro_chain_planning.objectif_journalier * jours_restants`
  - `cadence_moyenne` = `sync_gpro_chain_planning.cadence_moyenne`
- **Target:** > 10 jours
- **Chart:** Bar Chart per chain | **Color:** Green > 10j | Orange 5–10j | Red < 5j

#### F-REQ-311 — Couverture Coupe
- **Formula:** `(qte_lancee - qte_coupee) / cadence_hebdo`
  - `qte_lancee` = `sync_sdt_qte_depart_chaine.quantite` (total launched)
  - `qte_coupee` = `sync_sdt_sortie_coupe.quantite_coupee`
  - `cadence_hebdo` = `sync_gpro_chain_planning.cadence_hebdo`
- **Chart:** Big Number with color | **Views:** Coupe ✓

#### F-REQ-312 — Objectif par Chaîne
- **Source:** `sync_gpro_chain_planning.objectif_journalier`
- **Chart:** Big Number | Compared with `sync_sdt_qte_produite.quantite WHERE date=TODAY` to show vs objective

---

### 5.4 Production Page — Frontend Component Checklist

- [ ] `ChainSelector` — Tab or dropdown to switch between confection/coupe/sérigraphie
- [ ] `GaugeChart` — Dial gauge with color zones (red/orange/green), used for Efficience, WIP, Archivage
- [ ] `EfficiencyComboChart` — Bar per operator + target line at 90%, per-shift filter
- [ ] `WIPAreaChart` — Area chart showing WIP level over time with optimal band shading
- [ ] `LostTimeTimeline` — Horizontal timeline showing unplanned stops per chain with motif labels
- [ ] `LostTimeTable` — Tabular list below timeline: chain, motif, duration, timestamp
- [ ] `HorizontalBarChart` — Top operators ranking with efficiency bars
- [ ] `OFProgressDonut` — Donut chart showing % complete for current OF
- [ ] `SOProgressBar` — Multi-stage horizontal progress bar (cut → sewing → QC → pack → ship)
- [ ] `DateBadge` — BPD/EPD/EHD display with color rules for imminent deadlines
- [ ] `CoverageBar` — Bar chart for chain/serigraphie coverage with day count overlay
- [ ] `WallModeLayout` — High-contrast layout for TV screens: large fonts (min 36px KPI numbers), traffic-light color fills
- [ ] `BlinkAlert` — CSS animation that blinks the chain card when a critical threshold is exceeded
- [ ] `LiveSyncIndicator` — Shows last sync time per data source

### 5.5 Production Page — API Endpoints (Laravel)

```
GET /api/production/summary?chaine=&date=        → all KPIs for one chain (one page load)
GET /api/production/efficience-operateur         → per-operator efficiency (F-REQ-201)
GET /api/production/efficience-chaine            → per-chain gauge data (F-REQ-202)
GET /api/production/efficience-cumulee           → monthly trend (F-REQ-203)
GET /api/production/owe                          → OWE per chain (F-REQ-204)
GET /api/production/wip-chaine                   → WIP gauge (F-REQ-205)
GET /api/production/wip-optimal                  → WIP optimal area (F-REQ-206)
GET /api/production/lost-time                    → unplanned stops (F-REQ-207)
GET /api/production/top-operateurs               → top operators (F-REQ-210)
GET /api/production/of-info                      → SAM, SOT, effectifs, code, designation (F-REQ-211–215)
GET /api/production/of-avancement                → OF progress (F-REQ-301–308)
GET /api/production/coverages                    → all coverage KPIs (F-REQ-309–311)
GET /api/production/objectif                     → daily objective (F-REQ-312)
GET /api/production/fiabilite-systeme            → archivage + tagging reliability (F-REQ-216–217)
GET /api/production/methodes                     → cotation and gammes KPIs (F-REQ-218–219)
```

---

## 6. PAGE: LOGISTIQUE & PLANNING (Série 300) — F-REQ-405

**Audience:** Planning/Coupe, Direction (read-only)
**Refresh:** Real-time for stock & OF data | 6h for Drive data
**Display:** Warehouse display screens + desktop

---

### 6.1 Stock KPIs

#### F-REQ-313/314/315 — Taux de Fiabilité Stock (Accessoires / Tissu / FG)
- **Formula:** `qte_physique / qte_systeme * 100`
  - `qte_systeme` = `sync_diva_mvt_stock.Qtte` (summed per IDMP)
  - `qte_physique` = from `sync_drive_dot_hot` or equivalent physical count in Drive
  - **Alternative if physical count not in Drive:** show `sync_diva_mvt_stock.Qtte - sync_diva_mvt_stock.qtteReserve` as "available" and compare with a Drive sheet for physical counts
- **Target:** > 99.5%
- **Chart:** Radial Gauge (Jauge Radiale) — one per category
- **Laravel endpoint:** `GET /api/logistics/fiabilite-stock`
- **⚠️ Note:** Requires Drive sheet mapping physical stock counts by article category (TISSU/ACCESSOIRES/FG). Confirm sheet structure with BACOVET team.

#### F-REQ-316/317/318 — Taux de Rotation Stock (Accessoires / Tissu / FG)
- **Formula:** `cout_marchandises / stock_moyen`
  - `stock_moyen` = `sync_diva_stock_moyen.StockMoyen`
  - `cout_marchandises` = must come from DIVA — **⚠️ GAP: not exposed in current Novacity API.** Need new DIVA query or a Drive input.
- **Chart:** Radial Gauge
- **Laravel endpoint:** `GET /api/logistics/rotation-stock`

#### F-REQ-319/320/321 — Taux de Stock Mort (Accessoires / Tissu / FG)
- **Formula:** `valeur_articles_sans_mvt_365 / valeur_totale_stock * 100`
  - `sync_diva_articles_sans_mvt.Qtte_SansMvt_365j` as numerator
  - `sync_diva_qte_totale_stock.Quantite_Totale_Stock` as denominator
  - **Category breakdown (TISSU/ACCESSOIRES/FG):** requires article family from `sync_diva_mp_famille` joined via `sync_diva_mp` — group articles_sans_mvt by famille
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/logistics/stock-mort`

#### F-REQ-322/323/324 — Taux d'Occupation (Accessoires / Tissu / FG)
- **Formula:** `nb_rouleaux / capacite_stockage_nb_colis * 100`
  - `sync_diva_rouleaux.NbRouleaux`
  - `sync_diva_capacite_stockage.Conteneurs_Actifs`
- **Target:** ≤ 85%
- **Chart:** Gauge Chart per category
- **Color:** Green < 75% | Orange 75–85% | Red > 85%
- **Laravel endpoint:** `GET /api/logistics/occupation-stock`

#### F-REQ-325/326/327 — Taux de Commandes Livrées à Temps (Accessoires / Tissu / FG)
- **Formula:** `OF_AvecTransfertCoupe_Total / NbOF_Livres_Total * 100`
  - From `sync_diva_ofs_livres` — breakdown by category requires DIVA family data
- **Target:** ≥ 80%
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/logistics/commandes-livrees-temps`

#### F-REQ-328/329/330 — Délai de Livraison d'une Commande
- **Formula:** `MoyenneJours` (date_transfert - date_reservation average)
  - From `sync_diva_moyenne_livraison.MoyenneJours`
- **Target:** 1 jour
- **Chart:** Big Number — color: Green = 1j | Orange > 1j | Red > 3j
- **Laravel endpoint:** `GET /api/logistics/delai-livraison`

#### F-REQ-331 — STOCK/Typologie
- **Formula:** `Quantite_par_Typologie / Quantite_Totale * 100`
- **Source:** `sync_diva_stock_typologie` + `sync_diva_qte_totale_stock`
- **Chart:** Pie Chart (exclude null total row)
- **Laravel endpoint:** `GET /api/logistics/stock-par-typologie`

#### F-REQ-332 — STOCK/Provenance
- **Source:** `sync_diva_stock_provenance` (exclude null/rollup row)
- **Chart:** Pie Chart
- **Laravel endpoint:** `GET /api/logistics/stock-par-provenance`

#### F-REQ-333 — STOCK/Brand
- **Source:** `sync_diva_stock_famille` (exclude null total row)
- **Chart:** Pie Chart
- **Laravel endpoint:** `GET /api/logistics/stock-par-brand`

---

### 6.2 Delivery & Planning KPIs

#### F-REQ-334 — DOT (Delivery On Time)
- **Formula:** `SUM(qte_livree_on_time WHERE type='DOT') / SUM(qte_commandee WHERE type='DOT') * 100`
- **Source:** `sync_drive_dot_hot`
- **Target:** ≥ 95%
- **Chart:** Line Chart (weekly/monthly trend)
- **Laravel endpoint:** `GET /api/logistics/dot`

#### F-REQ-335 — HOT (Handover On Time)
- **Formula:** Same as DOT but `type='HOT'`
- **Source:** `sync_drive_dot_hot`
- **Target:** ≥ 95%
- **Chart:** Line Chart (same chart as DOT, dual line)
- **Laravel endpoint:** `GET /api/logistics/hot`

#### F-REQ-336 — Respect Planification par Chaîne
- **Formula:** `qte_realisee / objectif_journalier * 100` per chain
  - `qte_realisee` = `sync_sdt_qte_produite.quantite WHERE date=TODAY`
  - `objectif_journalier` = `sync_gpro_chain_planning.objectif_journalier`
- **Target:** ≥ 95%
- **Chart:** Line Chart (daily trend, multiple chains)
- **Laravel endpoint:** `GET /api/logistics/respect-planif`

#### F-REQ-337 — Lead Time Global
- **Formula:** `STRH + LT_Transport`
  - `STRH` from Drive sheet (cotation lead time)
  - `LT_Transport` = static data from carnet (fixed values per destination)
  - **Store in:** `lead_time_config` table (admin-managed, static lookup by delivery location)
- **Target:** 32 jours
- **Chart:** Big Number
- **Color:** Green ≤ 32j | Orange 32–35j | Red > 35j
- **Laravel endpoint:** `GET /api/logistics/lead-time`

---

### 6.3 Logistics Page — OF Management Section

All OF-related KPIs from the Production annex (F-REQ-301 to F-REQ-312) also appear on the Logistics view. See Section 5.3 above for details. The Logistics view adds a full list of all current OFs with ability to drill down per OF.

**Important Note (from CDC):** The logistics view must allow displaying ALL orders currently running in the workshop (not just a summary), with the ability to view all OF at once.

- **Laravel endpoint:** `GET /api/logistics/all-of` → paginated list of all active OFs with: `{ of, chaine, avancement_pct, qte_prevue, qte_realisee, bpd, epd, ehd, statut }`

---

### 6.4 Logistics Page — Frontend Component Checklist

- [ ] `RadialGauge` — Circular gauge for stock reliability, rotation rate, occupation
- [ ] `PieChart` — Stock distribution by Provenance / Brand / Typologie with legend
- [ ] `DualLineChart` — DOT + HOT on the same chart with target reference line at 95%
- [ ] `LeadTimeCard` — Big Number display for Lead Time with target comparison
- [ ] `StockKpiGrid` — 3×3 grid layout: categories (Accessoires/Tissu/FG) × KPIs (Fiabilité/Rotation/Stock Mort/Occupation/Commandes livrées/Délai)
- [ ] `OFFullList` — Sortable, filterable table of all current OFs with status chips
- [ ] `NextExportAlert` — Countdown to next planned export (from EHD dates), links to packing list and export plan
- [ ] `PlanningBanner` — Highlight "Urgent Export" OFs where EHD - TODAY ≤ 3 days
- [ ] `FilterBar` — Marque, Atelier, OF filters (same as Quality page)

### 6.5 Logistics Page — API Endpoints (Laravel)

```
GET /api/logistics/summary               → all Big Number KPIs in one call
GET /api/logistics/stock-kpis            → fiabilité + rotation + mort + occupation (F-REQ-313–324)
GET /api/logistics/commandes-livraison   → taux livrées à temps + délai (F-REQ-325–330)
GET /api/logistics/stock-distribution    → Pie chart data: Provenance, Brand, Typologie (F-REQ-331–333)
GET /api/logistics/dot-hot               → DOT + HOT trend (F-REQ-334–335)
GET /api/logistics/respect-planif        → planning compliance (F-REQ-336)
GET /api/logistics/lead-time             → global lead time (F-REQ-337)
GET /api/logistics/all-of                → full paginated OF list
GET /api/logistics/next-export           → upcoming EHD alerts
```

---

## 7. PAGE: DÉVELOPPEMENT (Série 350) — F-REQ-406

**Audience:** Bureau d'études, Méthodes, Développement
**Refresh:** Monthly (manual trigger after each period close)
**Display:** Desktop

---

### 7.1 KPI Inventory

#### FREQ-350 — RFT (Right First Time) Développement
- **Formula:** `COUNT(statut_validation = 'OK') / COUNT(*) * 100`
- **Source table:** `sync_drive_development`
- **Target:** ≥ 95%
- **Chart:** Big Number with color
- **Laravel endpoint:** `GET /api/development/rft`
- **Filter:** By month/year, marque

#### FREQ-351 — Taux de Respect de Livraison à Date
- **Formula:** `COUNT(date_livraison_reelle <= date_livraison_prevue) / COUNT(*) * 100`
- **Source table:** `sync_drive_development` WHERE `date_livraison_reelle IS NOT NULL`
- **Target:** ≥ 95%
- **Chart:** Gauge Chart (Jauge)
- **Laravel endpoint:** `GET /api/development/respect-livraison`

#### FREQ-352 — Taux de Fiabilité de Nomenclature
- **Formula:** `COUNT(nomenclature_valide = 1) / COUNT(*) * 100`
- **Source table:** `sync_drive_development`
- **Target:** ≥ 98%
- **Chart:** Line Chart (monthly trend — one data point per month)
- **Laravel endpoint:** `GET /api/development/fiabilite-nomenclature`

#### FREQ-353 — % Réclamations de la Production
- **Formula:** `COUNT(est_reclamation = 1) / COUNT(*) * 100`
- **Source table:** `sync_drive_development`
- **Target:** < 2%
- **Chart:** Scatter Plot (one point per month — x: month, y: % reclamations)
- **Laravel endpoint:** `GET /api/development/reclamations`

---

### 7.2 Development Page — Additional KPIs from Annex

The Annex references F-REQ-334 (Lead Time Dev) which appears in the Development view. Store lead time for development separately:

- **Lead Time (Dev):** average `date_livraison_reelle - date_order_sent` from `sync_drive_development`
- **Target:** ≥ 95% within target LT
- **Chart:** Big Number + monthly line chart

---

### 7.3 Development Page — Frontend Component Checklist

- [ ] `GaugeJauge` — Circular gauge for Respect Livraison (F-REQ-351)
- [ ] `MonthlyLineChart` — One data point per month for nomenclature fiabilité (F-REQ-352)
- [ ] `ScatterPlot` — Monthly reclamations scatter (FREQ-353)
- [ ] `DetailsTable` — Tabular view: ID Exigence | Indicateur | Valeur Actuelle | Statut (as seen in F-REQ-406 prototype)
- [ ] `MonthYearSelector` — Filter by period (month + year)
- [ ] `ManualSyncButton` — Trigger Drive resync on-demand (since refresh is monthly)

### 7.4 Development Page — API Endpoints (Laravel)

```
GET /api/development/summary             → all 4 KPIs + details table
GET /api/development/rft                 → RFT monthly + current value
GET /api/development/respect-livraison   → delivery date compliance
GET /api/development/fiabilite-nomenclature → monthly trend
GET /api/development/reclamations        → scatter data monthly
GET /api/development/lead-time-dev       → lead time development
POST /api/development/sync               → manually trigger Drive resync (admin only)
```

---

## 8. PAGE: MÉTHODES — F-REQ-404

**Audience:** Méthodes / Planning
**Refresh:** Daily (archivage, fiabilité) | Per new startup (cotation) | Per gamme file (déchiffrage)
**Display:** Desktop

---

### 8.1 KPI Inventory

The Methods page shows the same 4 KPIs as F-REQ-216 to F-REQ-219 in the Production section, but in a dedicated desk-facing view with more detail.

#### F-REQ-216 (= Annex F-REQ-218) — Taux d'Archivage Suivi Paquets par Chaîne
- **Full Details view:** Table showing each OF: `{ of, est_solde, est_archive, taux_archivage_chaine }`
- **Source:** `sync_gpro_suivi_paquets`
- **Target:** 85% | **Chart:** Gauge Chart per chain + detail table

#### F-REQ-217 (= Annex F-REQ-219) — Taux de Fiabilité des Données sur Système
- **Full Details view:** Per-OF reliability: `{ of, chaine, tag_theorique, tag_reel, ecart_pct, est_fiable }`
- **Source:** `sync_sdt_taging_reel`
- **Target:** 95% | **Chart:** Gauge Chart per OF

#### F-REQ-218 (= Annex F-REQ-220) — Taux de Respect du Temps Estimé par Article
- **Full Details view:** Per-article: `{ article, temps_cotation, temps_production, difference, est_respecte }`
- **Source:** `sync_drive_cotation`
- **Target:** 90% | **Chart:** Big Number + detail table

#### F-REQ-219 (= Annex F-REQ-221) — Taux des Temps Acceptés dès la 1ère Version par Article
- **Full Details view:** Per-article: `{ article, nb_gammes_total, nb_acceptees_v1, taux_pct }`
- **Source:** `sync_drive_gammes`
- **Target:** ≥ 80% | **Chart:** Big Number + detail table

**⚠️ NUMBERING NOTE:** There is an ID discrepancy between the main CDC body (F-REQ-216–219) and the Annex (F-REQ-218–221). The Annex uses 218–221 for Methods view. Align IDs in your code to match the CDC body (216–219) and document this for the client.

---

### 8.2 Methods Page — Frontend Component Checklist

- [ ] `GaugeWithTable` — Gauge chart + expandable detail table per KPI
- [ ] `ArticleDetailTable` — Sortable table: article | cotation | production | diff | status chip
- [ ] `OFReliabilityTable` — OF | chain | theoretical tag | real tag | ecart % | reliability badge

### 8.3 Methods Page — API Endpoints (Laravel)

```
GET /api/methods/summary             → all 4 KPIs overview
GET /api/methods/archivage           → per-chain archivage detail (F-REQ-216)
GET /api/methods/fiabilite-donnees   → per-OF tagging reliability (F-REQ-217)
GET /api/methods/respect-temps       → per-article cotation compliance (F-REQ-218)
GET /api/methods/temps-acceptes      → per-article gamme acceptance rate (F-REQ-219)
```

---

## 9. PAGE: ADMINISTRATION — F-REQ-401

**Audience:** IT / Administrateur only
**Access:** Read/Write (unique profile with write access)
**Display:** Desktop

---

### 9.1 Pillar 1: Pipeline Supervision (NF-REQ-506)

Show the real-time health of every sync pipeline.

#### Required Components:
- **`ApiStatusCard`** per source (Novacity SDT, Novacity QCM, Novacity DIVATEX, Google Drive, GPRO Consulting):
  - Status: ONLINE ✅ / OFFLINE ❌ / DEGRADED ⚠️
  - Last successful sync timestamp: "Last sync: 2 min ago"
  - Row count from last sync
  - Error message if last sync failed

- **`SyncLogTable`** — scrollable live audit log drawn from `sync_logs`:
  - Columns: Timestamp | Job | Table | Rows | Status | Duration | Message
  - Color code: green (ok) | red (error) | yellow (skipped/inactive)
  - Filterable by source / status
  - Auto-refresh every 30s

- **`ManualSyncButton`** per source — trigger a sync immediately without waiting for cron

- **`InactiveSourceAlert`** — List Novacity endpoints that are `État: Inactif` with a link to the Novacity admin panel

#### API Endpoints:
```
GET  /api/admin/pipeline/status          → live status of all sync sources
GET  /api/admin/pipeline/logs?limit=100  → recent sync logs from sync_logs table
POST /api/admin/pipeline/sync/{source}   → manual trigger for one source
```

---

### 9.2 Pillar 2: User Management (NF-REQ-501/502)

#### DB Tables needed:
```sql
-- users
id, matricule VARCHAR(30) UNIQUE, email VARCHAR(150), password_hash VARCHAR(255),
role ENUM('admin','direction','resp_production','chef_atelier','resp_qualite',
          'methodes','planning_coupe'), is_active TINYINT(1),
last_login_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP

-- user_sessions
id, user_id FK, token VARCHAR(255), ip_address VARCHAR(45),
user_agent TEXT, last_activity TIMESTAMP, expires_at TIMESTAMP, created_at TIMESTAMP
```

#### Required Components:
- **`UserTable`** — list all users: matricule | name | role | status | last login | actions
- **`CreateUserModal`** — form: matricule, role, temporary password
- **`EditUserModal`** — change role, reset password, activate/deactivate
- **`RolePermissionMatrix`** — read-only display of which series (100/200/300/350) each role can access (matches CDC Section 2 table)

#### Role → Series Mapping (enforce server-side):
```
admin           → ALL (read + write config)
direction       → 100, 200, 300, 350 (read-only, consolidated)
resp_production → 200, 300 (all ateliers)
chef_atelier    → 200 (own atelier only)
resp_qualite    → 100 (all quality KPIs)
methodes        → 200 (efficience, qualité, respect planif)
planning_coupe  → 300 (DOT, HOT, Lead Time)
```

#### API Endpoints:
```
GET    /api/admin/users              → list all users
POST   /api/admin/users              → create user
PUT    /api/admin/users/{id}         → update role/status
DELETE /api/admin/users/{id}         → deactivate (soft delete)
POST   /api/admin/users/{id}/reset-password  → generate temp password
GET    /api/admin/users/{id}/sessions        → user's active sessions
```

---

### 9.3 Pillar 3: Screen Management (NF-REQ-503)

Map physical TV/display terminals to dashboard views.

#### DB Table:
```sql
-- screens
id, screen_code VARCHAR(50) UNIQUE, label VARCHAR(100),
location ENUM('confection','coupe','serigraphie','entrepot','bureau_qualite','direction','autre'),
current_view ENUM('quality','production_confection','production_coupe',
                  'production_serigraphie','logistics','development','methods'),
is_online TINYINT(1), last_ping TIMESTAMP, resolution VARCHAR(20),
notes TEXT, created_at TIMESTAMP, updated_at TIMESTAMP
```

#### Required Components:
- **`ScreenGrid`** — visual layout of all registered screens with status (Online/Offline)
- **`ScreenCard`** — per screen: label, location, current view, last seen, assign view dropdown
- **`AssignViewDropdown`** — change which dashboard this screen displays
- **Screen heartbeat:** Each frontend instance pings `POST /api/screens/{code}/ping` every 30s. Admin panel shows last ping time.

#### API Endpoints:
```
GET  /api/admin/screens              → list all screens
POST /api/admin/screens              → register new screen
PUT  /api/admin/screens/{id}         → update view assignment
POST /api/screens/{code}/ping        → heartbeat (public, no auth needed)
GET  /api/screens/{code}/config      → frontend fetches its assigned view on load
```

---

### 9.4 Pillar 4: Audit Log (NF-REQ-505)

#### DB Table:
```sql
-- audit_logs
id, user_id FK, user_matricule VARCHAR(30), action VARCHAR(100),
entity_type VARCHAR(50), entity_id VARCHAR(100), old_value JSON, new_value JSON,
ip_address VARCHAR(45), user_agent TEXT, created_at TIMESTAMP
INDEX(user_id, created_at)
INDEX(entity_type, created_at)
```

Capture every action: login, logout, user create/update/delete, screen reassignment, manual sync trigger, password reset.

#### Required Components:
- **`AuditLogTable`** — sortable, filterable audit trail
  - Columns: Timestamp | User | Action | Entity | Details | IP
- **`ExportAuditButton`** — export audit log to Excel for compliance

#### API Endpoint:
```
GET /api/admin/audit-logs?user=&action=&from=&to=  → filtered audit log
```

---

### 9.5 Lead Time Configuration (for F-REQ-337)

Static transport lead times per delivery destination (from "Carnet - data fixe").

#### DB Table:
```sql
-- lt_transport_config
id, destination VARCHAR(100) UNIQUE, lt_transport_jours INT,
strh_jours INT, total_lt INT GENERATED ALWAYS AS (lt_transport_jours + strh_jours),
updated_by FK users, updated_at TIMESTAMP
```

#### Required Component:
- **`LtConfigTable`** — admin-editable table for transport lead times

---

## 10. CROSS-CUTTING CONCERNS

### 10.1 Authentication & RBAC (NF-REQ-501/502)

**Login flow:**
1. POST `/api/auth/login` → `{ matricule, password }` → returns JWT token
2. JWT payload includes: `{ user_id, matricule, role, series_access: [100, 200] }`
3. Frontend reads `series_access` from decoded JWT → shows only accessible tabs
4. Middleware `CheckRole` on every protected route validates JWT + role
5. Session auto-expires after 8 hours of inactivity (NF-REQ-502)
6. Show `matricule` in header at all times (NF-REQ-505)

**Frontend routing guard:**
```
/dashboard/quality     → requires role: admin, direction, resp_qualite
/dashboard/production  → requires role: admin, direction, resp_production, chef_atelier
/dashboard/logistics   → requires role: admin, direction, planning_coupe, resp_production
/dashboard/development → requires role: admin, direction, methodes
/dashboard/methods     → requires role: admin, methodes, resp_production
/dashboard/admin       → requires role: admin only
```

**UI Masking:**
- Side navigation only shows tabs the user has access to
- Export/Config buttons hidden for non-admin roles
- Chef d'atelier sees only their own chain's data (add `chaine` claim to JWT)

---

### 10.2 Dynamic Filtering (F-REQ-407)

All dashboard pages must support filters:
- `?marque=DOMYOS` — filter by brand/family (from `sync_diva_stock_famille.FamilleFG`)
- `?chaine=CH1` — filter by production line (from all chain-level tables)
- `?of=OF-2026-0412` — filter by Fabrication Order

The filter bar component is shared across all pages. Selected filters are persisted in the URL query string (not localStorage — no browser storage in the app).

All API endpoints accept these as optional query parameters. If not provided, return all data.

---

### 10.3 Visual Alerts (F-REQ-408)

Implement a centralized `AlertService` that evaluates KPIs against targets:

```
alert_rules table:
id, kpi_id VARCHAR(50), target_value DECIMAL, operator ENUM('lt','gt','lte','gte'),
severity ENUM('warning','critical'), is_active TINYINT(1)

Example rows:
F-REQ-101 | 5.0 | gt | critical   → BR > 5% = critical alert
F-REQ-104 | 98.0 | lt | warning   → RFT < 98% = warning  
F-REQ-207 | 10.0 | gt | warning   → Lost time > 10min = warning
```

Alert colors on KPI cards:
- **Green:** target met
- **Orange:** approaching threshold (within 20% of target)
- **Red:** threshold exceeded

Blinking animation applies ONLY on production wall screens for critical severity.

Alert history stored in `alert_events` table for audit trail.

---

### 10.4 Export (F-REQ-409)

Every page has an "Exporter" button (visible to all roles). Clicking it:
1. Calls `GET /api/{page}/export?format=xlsx&filters=...`
2. Returns a streamed Excel file
3. File name: `BACOVET_{PAGE}_{DATE}.xlsx`

Use Laravel Excel (maatwebsite/excel) or spatie/simple-excel. Export includes the raw data behind every visible KPI, not just summary numbers.

Admin and Direction additionally see a "PDF Report" button that generates a full-page snapshot of the current dashboard state (use Laravel DomPDF or Puppeteer for HTML-to-PDF).

---

### 10.5 Last Sync Indicator (on all pages)

Every page header shows a "LIVE SYNC: OK" indicator (as seen in the CDC prototype). This calls:

```
GET /api/system/sync-status
→ { sources: [{ name, last_sync, status, rows_last_run }] }
```

Color: Green = last sync < 2 min ago | Orange = 2–10 min ago | Red = > 10 min or error

---

### 10.6 Multi-language (NF-REQ-509)

Default language: French. All labels, field names, error messages, and chart axes must be in French. Use a translation file (`lang/fr/*.php`) from day one, even if no second language is planned, to allow future extensions.

Sector-specific terminology (confection sector) is already embedded in the CDC field names — use them verbatim.

---

## 11. GAPS, ANOMALIES & ACTION ITEMS

### Critical Gaps (blocking production readiness)

| # | Issue | Impact | Action Required |
|---|---|---|---|
| G1 | 4 Novacity BR Bundling endpoints are **INACTIVE** | F-REQ-106, 107 show no data | Ask Novacity admin to activate in their panel |
| G2 | **GPRO Consulting API** credentials + spec not provided | F-REQ-202, 204, 211–215, 301–312 partially incomplete | Get GPRO Consulting API documentation |
| G3 | **Cost of goods** (Coût des marchandises) for F-REQ-316–318 not in Novacity API | Taux de rotation stock cannot be computed | Add new DIVA SQL query to Novacity, or use Drive input |
| G4 | **Physical stock count** sheets for F-REQ-313–315 not specified | Stock reliability KPIs need physical vs system comparison | Define Drive sheet structure with BACOVET |
| G5 | **DOT/HOT data** source (F-REQ-334–335) is "Cape / drive" — sheet structure undefined | DOT/HOT line charts show no data | Define Drive sheet structure with Cape/planning team |
| G6 | **LT Transport values** (F-REQ-337) are static per destination — not in any API | Lead Time Global cannot be computed | Define values in `lt_transport_config` admin table and enter via Admin UI |

### Non-Critical Gaps

| # | Issue | Action |
|---|---|---|
| G7 | RFT test data suspicious: `FirstPassToday=2947` while `ProducedToday=80` — ratio > 100% | Validate with QCM system admin; likely test data |
| G8 | CDC numbering discrepancy: body uses F-REQ-216–219 for methods; Annex uses F-REQ-218–221 | Standardize to body numbering; note in documentation |
| G9 | `requete_unifiee_dashboard_tout-en-un` endpoint is INACTIVE | Activate if you want to reduce API calls for unified KPI fetch |
| G10 | Pareto for F-REQ-116 references "posts 93, 100, 102, 239" but vwDefect uses `OpNo` codes | Map OpNo codes to post numbers with QCM team |
| G11 | "Taux de stock mort" by category (Accessoires/Tissu/FG) requires article family classification | Add `Famille` or `Categorie` to articles_sans_mvt query in Novacity |

### Data Quality Checks to Implement

- [ ] Validate `ProducedToday > 0` before computing RFT to avoid division by zero
- [ ] Validate `BundleInspectedToday > 0` before computing BR Bundling
- [ ] Detect and flag when sync tables have no data for current day by 08:00 (indicates job failure)
- [ ] Flag when `efficience_pct > 100%` (data entry error)
- [ ] Alert when `tag_reel` > `tag_theorique * 1.05` (suspicious tagging data)

---

## 12. LARAVEL PROJECT STRUCTURE CHECKLIST

```
app/
  Console/
    Kernel.php              → register all scheduled jobs (cron)
  Jobs/
    Sync/
      Novacity/             → one file per Novacity endpoint sync job
      Drive/                → Google Drive sync jobs
      GproConsulting/       → GPRO Consulting sync jobs
  Http/
    Controllers/
      Api/
        QualityController.php
        ProductionController.php
        LogisticsController.php
        DevelopmentController.php
        MethodsController.php
        AdminController.php
        AuthController.php
        ScreenController.php
    Middleware/
      CheckRole.php         → enforce RBAC per route
      LogUserActivity.php   → write to audit_logs
  Models/
    User.php
    SyncLog.php
    AlertEvent.php
    Screen.php
    AuditLog.php
  Services/
    NovacityApiService.php  → HTTP client wrapper for Novacity
    GoogleDriveService.php  → Sheets API wrapper
    AlertService.php        → evaluate KPIs against thresholds
    KpiComputationService.php → all KPI formula logic
routes/
  api.php                   → all REST endpoints
database/
  migrations/               → one migration per table listed in Section 3
  seeders/
    AlertRulesSeeder.php    → seed default alert thresholds
    LtTransportSeeder.php   → seed static lead time values
    ScreensSeeder.php       → seed known screen terminals
```

---

## 13. PRODUCTION LAUNCH CHECKLIST

Before going live, verify each item:

### Pipeline
- [ ] All Novacity sync jobs running and writing to DB (check `sync_logs`)
- [ ] 4 inactive Novacity queries activated (G1 above)
- [ ] Google Drive Service Account has read access to all required sheets
- [ ] Drive sync jobs verified end-to-end (read Sheet → write to `sync_drive_*`)
- [ ] GPRO Consulting integration connected and validated
- [ ] `lt_transport_config` table populated with real transport lead times
- [ ] Physical stock count Drive sheets structured and connected (G4)
- [ ] DOT/HOT Drive sheet structured and connected (G5)

### Application
- [ ] All 6 pages load without errors (Quality, Production, Logistics, Development, Methods, Admin)
- [ ] All KPIs showing data (no "En attente de données" from missing sources)
- [ ] RBAC enforced: each role can only see/access their allowed pages
- [ ] Session expires after 8 hours (test manually)
- [ ] Matricule displayed in header for all authenticated users
- [ ] Filter by Marque / Chain / OF works on all pages
- [ ] Visual color alerts (Green/Orange/Red) trigger correctly at thresholds
- [ ] Blink animation on Production wall screens for critical alerts
- [ ] Export to Excel works on all pages
- [ ] Last Sync indicator updates correctly
- [ ] Audit log records all user actions

### Admin Page
- [ ] All sync sources visible in Pipeline Supervision with correct status
- [ ] Manual sync trigger works per source
- [ ] User creation and role assignment tested for all 7 roles
- [ ] Screen registration and view assignment working
- [ ] Heartbeat ping from screen terminals visible in admin
- [ ] Audit log showing all actions with correct user attribution

### Wall Screens (NF-REQ-507)
- [ ] Minimum 36px font size for KPI numbers on all wall-screen views
- [ ] High contrast ratio (WCAG AAA recommended for industrial context)
- [ ] Traffic-light color fill covers entire KPI card background (not just text)
- [ ] Tested readable at 5 meters on actual screen hardware
- [ ] No horizontal scroll on any wall screen view
- [ ] Auto-refresh every 60s verified on each screen terminal
```
