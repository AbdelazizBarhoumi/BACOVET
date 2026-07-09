# Novacity API Reference

> Source of truth: tested via curl against `http://100.76.6.178:4100` with API key.
> Last verified: 2026-07-08

## Authentication
All requests require header: `x-api-key: <NOVACITY_API_KEY>`

## Base URLs
- Queries: `{base_url}/api/data/q/{slug}?limit=N&offset=N`
- Endpoints: `{base_url}/api/data/{endpoint}?limit=N&offset=N`

---

## Quality Tables

### check_pass_qte
- **Type:** Endpoint → `/api/data/checkpassqte`
- **API Fields:** `LOGDATE, SHORTNAME, ShiftCode, DefectPct` (empty at test time)
- **DB Table:** `check_pass_qte`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `LOGDATE` | `log_date` | date |
| `SHORTNAME` | `shortname` | varchar(50) |
| `ShiftCode` | `shift_code` | varchar(10) |
| `DefectPct` | `defect_pct` | decimal(6,2) |

### vw_defects
- **Type:** Endpoint → `/api/data/vwdefect`
- **API Fields:** `LOGDATE, ShiftCode, ProdGroup, OpNo, QCCheckpointQty, DefectQty`
- **DB Table:** `vw_defects`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `LOGDATE` | `log_date` | date |
| `ShiftCode` | `shift_code` | varchar(10) |
| `ProdGroup` | `prod_group` | varchar(50) |
| `OpNo` | `op_no` | varchar(50) |
| `QCCheckpointQty` | `qccheckpoint_qty` | int |
| `DefectQty` | `defect_qty` | int |

### qcm_defect_trx
- **Type:** Endpoint → `/api/data/qcmdefecttrx`
- **API Fields:** `LOGDATE, ShiftCode, GROUPID, TicketID, ITEMNO, TerminalNo, TransactionTime, LinkedID, OPERATIONNO, DEFECTCODEID, DEFECTCODENAME, DEFECTQUANTITY, QCCheckPointOP, DefectCategoryName`
- **DB Table:** `qcm_defect_trx`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `LOGDATE` | `log_date` | date |
| `ShiftCode` | `shift_code` | varchar(10) |
| `GROUPID` | `group_id` | varchar(50) |
| `TicketID` | `ticket_id` | varchar(50) |
| `ITEMNO` | `itemno` | varchar(100) |
| `TerminalNo` | `terminal_no` | varchar(50) |
| `TransactionTime` | `transaction_time` | timestamp |
| `LinkedID` | `linked_id` | int |
| `OPERATIONNO` | `operationno` | varchar(50) |
| `DEFECTCODEID` | `defectcodeid` | int |
| `DEFECTCODENAME` | `defectcodename` | varchar(200) |
| `DEFECTQUANTITY` | `defectquantity` | int |
| `QCCheckPointOP` | `qccheck_point_op` | varchar(50) |
| `DefectCategoryName` | `defect_category_name` | varchar(200) |

### pieces_ok_jour
- **Type:** Query → `pieces_ok_de_premier_coup_jour_en_cours`
- **API Fields:** `FirstPassToday`

| API Field | DB Column |
|-----------|-----------|
| `FirstPassToday` | `first_pass_today` |

### pieces_produites_jour
- **Type:** Query → `pieces_produites_jour_en_cours`
- **API Fields:** `ProducedToday`

| API Field | DB Column |
|-----------|-----------|
| `ProducedToday` | `produced_today` |

### pieces_ok_annee
- **Type:** Query → `pieces_ok_de_premier_coup_annee_en_cours`
- **API Fields:** `FirstPassYear`

| API Field | DB Column |
|-----------|-----------|
| `FirstPassYear` | `first_pass_year` |

### pieces_produites_annee
- **Type:** Query → `pieces_produites_annee_en_cours`
- **API Fields:** `ProducedYear`

| API Field | DB Column |
|-----------|-----------|
| `ProducedYear` | `produced_year` |

---

## Production Tables

### item_trx_enq
- **Type:** Endpoint → `/api/data/itemtrxenq`
- **API Fields:** `IsSplit, SONo, TransactionID, ItemNo, OpNo, PartialClaim, StartTime, EndTime, TerminalNo, Quantity, LogDate, OpCode, PayRate, SAM, DailyWorkScheduleID, LastUpdate, ShiftCode, ProdGroup, EmpGroup, ProdGrpID, EmpGrpID, ActionType, EmployeeName, CutLotNo, WorkstageNo, ItemCard, TagDTime, MasterItemNo, MoBundleNo, CutLotBundleNo, MoCutLotNo, UHFEPC, BuyerEPC, EPCTagDTime`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `TransactionID` | `transaction_id` | varchar(100) |
| `SONo` | `so_no` | varchar(50) |
| `ItemNo` | `item_no` | varchar(100) |
| `OpNo` | `op_no` | varchar(50) |
| `IsSplit` | `is_split` | boolean |
| `ActionType` | `action_type` | varchar(10) |
| `Atelier` | `atelier` | varchar(50) |
| `BuyerEPC` | `buyer_epc` | varchar(200) |
| `CutLotBundleNo` | `cut_lot_bundle_no` | varchar(50) |
| `CutLotNo` | `cut_lot_no` | varchar(50) |
| `DailyWorkScheduleID` | `daily_work_schedule_id` | int |
| `EmpGroup` | `emp_group` | varchar(50) |
| `EmpGrpID` | `emp_grp_id` | int |
| `EmployeeName` | `employee_name` | varchar(100) |
| `EndTime` | `end_time` | timestamp |
| `EPCTagDTime` | `epctag_dtime` | timestamp |
| `ItemCard` | `item_card` | varchar(100) |
| `LastUpdate` | `last_update` | timestamp |
| `LogDate` | `log_date` | date |
| `MasterItemNo` | `master_item_no` | varchar(50) |
| `MoBundleNo` | `mo_bundle_no` | varchar(50) |
| `MoCutLotNo` | `mo_cut_lot_no` | varchar(50) |
| `OpCode` | `op_code` | varchar(50) |
| `PartialClaim` | `partial_claim` | varchar(50) |
| `PayRate` | `pay_rate` | decimal(8,2) |
| `ProdGroup` | `prod_group` | varchar(50) |
| `ProdGrpID` | `prod_grp_id` | int |
| `Quantity` | `quantity` | int |
| `SAM` | `sam` | decimal(8,2) |
| `ShiftCode` | `shift_code` | varchar(20) |
| `StartTime` | `start_time` | timestamp |
| `TagDTime` | `tag_dtime` | timestamp |
| `TerminalNo` | `terminal_no` | varchar(50) |
| `UHFEPC` | `uhfepc` | varchar(200) |
| `WorkstageNo` | `workstage_no` | varchar(50) |

### wip_chaine
- **Type:** Query → `wip_chaine`
- **API Fields:** `ProdGroup, WIP_Chaine`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `ProdGroup` | `prod_group` | varchar(50) |
| `WIP_Chaine` | `wip_chaine` | int |

### etat_avancement
- **Type:** Query → `etat_avancement`
- **API Fields:** `OF_No, ProdGroup, departage, vigniette_coupe, envoie_serigraphie, sortie_serigraphie, sortie_coupe, entree_chaine, engagement, sortie_montage, controle_qualite, conditionement, embalage`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `OF_No` | `of_no` | varchar(50) |
| `ProdGroup` | `prod_group` | varchar(50) |
| `departage` | `departage` | int |
| `vigniette_coupe` | `vigniette_coupe` | int |
| `envoie_serigraphie` | `envoie_serigraphie` | int |
| `sortie_serigraphie` | `sortie_serigraphie` | int |
| `sortie_coupe` | `sortie_coupe` | int |
| `entree_chaine` | `entree_chaine` | int |
| `engagement` | `engagement` | int |
| `sortie_montage` | `sortie_montage` | int |
| `controle_qualite` | `controle_qualite` | int |
| `conditionement` | `conditionement` | int |
| `embalage` | `embalage` | int |

### efficience_chaine
- **Type:** Query → `efficience_chaine`
- **API Fields:** `ProdGroup, TempsStandard, TempsPresence, Efficience_Pourcentage`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `ProdGroup` | `prod_group` | varchar(50) |
| `TempsStandard` | `temps_standard` | decimal(10,2) |
| `TempsPresence` | `temps_presence` | decimal(10,2) |
| `Efficience_Pourcentage` | `efficience_pourcentage` | decimal(10,2) |

### qte_produite
- **Type:** Query → `qte_produite`
- **API Fields:** `DateProduction, OF_No, Article, Chaine, Quantite_Produite`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateProduction` | `date_production` | date |
| `OF_No` | `of_no` | varchar(50) |
| `Article` | `article` | varchar(100) |
| `Chaine` | `chaine` | varchar(20) |
| `Quantite_Produite` | `quantite_produite` | int |

### lost_time
- **Type:** Query → `lost_time`
- **API Fields:** `LostTypeCode, LostTypeDesc, TotalLostTime`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `LostTypeCode` | `lost_type_code` | varchar(50) |
| `LostTypeDesc` | `lost_type_desc` | varchar(200) |
| `TotalLostTime` | `total_lost_time` | int |

### taging_reel
- **Type:** Query → `taging_reel`
- **API Fields:** `MONo, ProdGroup, TotalEngagement, TotalEmbalage, StatutTagging`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `MONo` | `mono` | varchar(50) |
| `ProdGroup` | `prod_group` | varchar(50) |
| `TotalEngagement` | `total_engagement` | int |
| `TotalEmbalage` | `total_embalage` | int |
| `StatutTagging` | `statut_tagging` | varchar(100) |

### packets_rejetes
- **Type:** Query → `packets_rejetes`
- **API Fields:** `Jour, RFID_introuvable, Packet_annule`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `Jour` | `jour` | date |
| `RFID_introuvable` | `rfid_introuvable` | int |
| `Packet_annule` | `packet_annule` | int |

### sortie_coupe
- **Type:** Query → `sortie_coupe`
- **API Fields:** `DateProduction, Commande, OpNo, Quantite_Sortie_Coupe`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateProduction` | `date_production` | date |
| `Commande` | `commande` | varchar(50) |
| `OpNo` | `op_no` | varchar(50) |
| `Quantite_Sortie_Coupe` | `quantite_sortie_coupe` | int |

### qte_engagement
- **Type:** Query → `qte_engagement`
- **API Fields:** `DateEngagement, Commande, OpNo, Quantite_Engagement`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateEngagement` | `date_engagement` | date |
| `Commande` | `commande` | varchar(50) |
| `OpNo` | `op_no` | varchar(50) |
| `Quantite_Engagement` | `quantite_engagement` | int |

### qte_entree_serigraphie
- **Type:** Query → `qte_entree_serigraphie`
- **API Fields:** `DateEntreeSerigraphie, OF_No, Article, Chaine, Quantite_Entree_Serigraphie`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateEntreeSerigraphie` | `date_entree_serigraphie` | date |
| `OF_No` | `of_no` | varchar(50) |
| `Article` | `article` | varchar(100) |
| `Chaine` | `chaine` | varchar(50) |
| `Quantite_Entree_Serigraphie` | `quantite_entree_serigraphie` | int |

### sortie_serigraphie
- **Type:** Query → `sortie_serigraphie`
- **API Fields:** `DateSerigraphie, Commande, OpNo, Quantite_Sortie_Serigraphie`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateSerigraphie` | `date_serigraphie` | date |
| `Commande` | `commande` | varchar(50) |
| `OpNo` | `op_no` | varchar(50) |
| `Quantite_Sortie_Serigraphie` | `quantite_sortie_serigraphie` | int |

### temps_operation
- **Type:** Query → `temps_operation`
- **API Fields:** `ProdGroup, OpNo, OpCode, TempsOperation`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `ProdGroup` | `prod_group` | varchar(50) |
| `OpNo` | `op_no` | varchar(50) |
| `OpCode` | `op_code` | varchar(50) |
| `TempsOperation` | `temps_operation` | decimal(10,2) |

### minutes_presence
- **Type:** Query → `minutes_presence`
- **API Fields:** `ProdGroup, EmployeeNo, EmployeeName, TempsPresence_Min`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `ProdGroup` | `prod_group` | varchar(50) |
| `EmployeeNo` | `employee_no` | varchar(50) |
| `EmployeeName` | `employee_name` | varchar(100) |
| `TempsPresence_Min` | `temps_presence_min` | decimal(10,2) |

### minutes_produites
- **Type:** Query → `minutes_produites`
- **API Fields:** `ProdGroup, EmployeeNo, EmployeeName, TotalQuantite, MinuteProduite`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `ProdGroup` | `prod_group` | varchar(50) |
| `EmployeeNo` | `employee_no` | varchar(50) |
| `EmployeeName` | `employee_name` | varchar(100) |
| `TotalQuantite` | `total_quantite` | int |
| `MinuteProduite` | `minute_produite` | decimal(10,2) |

### qte_depart_chaine_article_of
- **Type:** Query → `qte_depart_chaine_article_of`
- **API Fields:** `DateDepartage, Chaine, Article, OF_No, Quantite_Departage`

| API Field | DB Column | DB Type |
|-----------|-----------|---------|
| `DateDepartage` | `date_departage` | date |
| `Chaine` | `chaine` | varchar(20) |
| `Article` | `article` | varchar(100) |
| `OF_No` | `of_no` | varchar(50) |
| `Quantite_Departage` | `quantite_departage` | int |

### inline_vs_endline_comparison
- **Type:** Endpoint → `/api/data/inlinevsendlinecomparison`
- **API Fields:** (empty at test time)

### of_fabrication
- **Type:** Endpoint → `/api/data/ofabrication`
- **API Fields:** (HTTP 500 at test time)

### qte_produit_individuel_jour
- **Type:** Query → `qte_produite_indiv_jour`
- **API Fields:** (empty at test time)

---

## Logistics Tables

### vue_stock
- **Type:** Endpoint → `/api/data/vue_stock`
- **API Fields:** (empty at test time)

### diva_stock
- **Type:** Endpoint → `/api/data/diva_stock`
- **API Fields:** (empty at test time)

### stock_moyen
- **Type:** Query → `stock_moyen`
- **API Fields:** `StockMoyen, NbLignesStock`

| API Field | DB Column |
|-----------|-----------|
| `StockMoyen` | `stock_moyen` |
| `NbLignesStock` | `nb_lignes_stock` |

### articles_sans_mouvement
- **Type:** Query → `articles_sans_mouvement_durant_365_jours`
- **API Fields:** `NbArticles_SansMvt_365j, Qtte_SansMvt_365j`

| API Field | DB Column |
|-----------|-----------|
| `NbArticles_SansMvt_365j` | `nb_articles_sans_mvt_365j` |
| `Qtte_SansMvt_365j` | `qtte_sans_mvt_365j` |

### quantite_totale_stock
- **Type:** Query → `quantite_totale_du_stock`
- **API Fields:** `Quantite_Totale_Stock`

| API Field | DB Column |
|-----------|-----------|
| `Quantite_Totale_Stock` | `quantite_totale_stock` |

### capacite_stockage
- **Type:** Query → `capacite_de_stockage_en_nombre_de_conteneurs`
- **API Fields:** `Total_Conteneurs, Conteneurs_Actifs, Conteneurs_Consommes, Conteneurs_Supprimes`

| API Field | DB Column |
|-----------|-----------|
| `Total_Conteneurs` | `total_conteneurs` |
| `Conteneurs_Actifs` | `conteneurs_actifs` |
| `Conteneurs_Consommes` | `conteneurs_consommes` |
| `Conteneurs_Supprimes` | `conteneurs_supprimes` |

### nombre_rouleaux
- **Type:** Query → `nombre_de_rouleaux`
- **API Fields:** `NbRouleaux`

| API Field | DB Column |
|-----------|-----------|
| `NbRouleaux` | `nb_rouleaux` |

### nombre_ofs_livres
- **Type:** Query → `nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel`
- **API Fields:** `NbOF_Livres_Total, OF_AvecTransfertCoupe, OF_AvecTransfertCoupeJemmel, OF_AvecTransfertCoupe_Total`

| API Field | DB Column |
|-----------|-----------|
| `NbOF_Livres_Total` | `nb_of_livres_total` |
| `OF_AvecTransfertCoupe` | `of_avec_transfert_coupe` |
| `OF_AvecTransfertCoupeJemmel` | `of_avec_transfert_coupe_jemmel` |
| `OF_AvecTransfertCoupe_Total` | `of_avec_transfert_coupe_total` |

### moyenne_date_transfert
- **Type:** Query → `moyenne_date_de_transfert_date_de_reservation`
- **API Fields:** `MoyenneJours, NbOFConsideres`

| API Field | DB Column |
|-----------|-----------|
| `MoyenneJours` | `moyenne_jours` |
| `NbOFConsideres` | `nb_of_consideres` |

### quantite_par_provenance
- **Type:** Query → `quantite_par_provenance_total`
- **API Fields:** `Provenance, Quantite, NbArticles`

| API Field | DB Column |
|-----------|-----------|
| `Provenance` | `provenance` |
| `Quantite` | `quantite` |
| `NbArticles` | `nb_articles` |

### quantite_par_famille
- **Type:** Query → `quantite_par_famille`
- **API Fields:** `FamilleFG, Quantite`

| API Field | DB Column |
|-----------|-----------|
| `FamilleFG` | `famille_fg` |
| `Quantite` | `quantite` |

### quantite_par_typologie
- **Type:** Query → `quantite_par_typologie_fournitures`
- **API Fields:** `Typologie, Quantite, NbArticles`

| API Field | DB Column |
|-----------|-----------|
| `Typologie` | `typologie` |
| `Quantite` | `quantite` |
| `NbArticles` | `nb_articles` |

### colis_total_var
- **Type:** Query → `colis_total_3var`
- **API Fields:** `Total_colis, Colis_valides, Total_rejetes, RFID_introuvable, Colis_annules`

| API Field | DB Column |
|-----------|-----------|
| `Total_colis` | `total_colis` |
| `Colis_valides` | (auto-converts to `colis_valides`) |
| `Total_rejetes` | (auto-converts to `total_rejetes`) |
| `RFID_introuvable` | (auto-converts to `rfid_introuvable`) |
| `Colis_annules` | (auto-converts to `colis_annules`) |

### expeditions
- **Type:** Endpoint → `/api/data/expeditions`
- **API Fields:** (empty at test time)
