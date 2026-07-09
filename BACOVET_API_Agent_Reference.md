# BACOVET API — Référence Agent (Novacity)

> **But de ce document :** référence statique pour qu'un agent IA sache quels endpoints appeler, quelles clés (champs) chaque réponse contient, et lesquels sont cassés — **sans avoir à interroger le serveur**.
> Basé sur : le guide PDF fournisseur (`Guide_API_Prestataire_Novacity.pdf`, généré 2026-07-02) **et** une exécution de tests réelle (Newman/Postman, `report.html`, exécutée 2026-07-08). Quand les deux sources divergent, les résultats du test réel (plus récents) font foi.

**Dernière vérification en direct :** 8 juillet 2026 — 62 requêtes testées → 49 succès (200), 12 erreurs serveur (500), 1 route introuvable (404).

---

## 0. Connexion

| | |
|---|---|
| **URL de base** | `http://100.76.6.178:4100` |
| **Mode d'authentification réel (confirmé par le serveur)** | Clés statiques — pas de login. Header `x-api-key` sur `/api/data/*`. |
| **Clé API (x-api-key)** | `803b836914bf40eba6f138725e999db4e2a6caa2b5564f248fd2501150c63074` |
| **Pagination** | `?limit=100&offset=0` sur tous les endpoints `/api/data/*` |

```bash
curl -H "x-api-key: 803b836914bf40eba6f138725e999db4e2a6caa2b5564f248fd2501150c63074" \
  "http://100.76.6.178:4100/api/data/{endpoint}?limit=100&offset=0"
```

⚠️ **Conflit connu :** le PDF documente aussi une route `POST /api/auth/prestataire/login` (email/mot de passe → JWT), qui a été testée et **répond bien en 200** avec `{ success, token, api_key, prestataire, expiresIn }`. Mais la description de la collection Postman affirme que ce login n'existe pas et que seule la clé statique / JWT pré-généré fonctionnent. **Les deux mécanismes semblent actifs en pratique** — à clarifier avec Novacity, mais utiliser `x-api-key` en premier choix car c'est le mode documenté comme stable par les deux sources.

**Identifiants de login (si utilisé) :**
`novacity@bacovet.com` / `Bacovet2026`

### GET `/` — Health / info serveur
✅ 200 — Clés : `name`, `version`, `status`, `docs`
```json
{"name":"Novacity API","version":"1.0.0","status":"running","docs":"/api/admin/health"}
```

### Endpoints self-service mentionnés mais **non testés** (statut inconnu)
- `GET /api/data/me/catalog`
- `GET /api/data/me/jobs`
- `GET /api/data/me/doc.pdf`

---

## 1. Résumé rapide — à ne PAS appeler

| Endpoint | URL | Erreur | Cause |
|---|---|---|---|
| `rovereffectiveness` | `/api/data/rovereffectiveness` | 500, timeout 30s | Requête QCM trop lente / index manquant |
| `checkpassqte` | `/api/data/checkpassqte` | 500, timeout 30s | Requête QCM trop lente / index manquant |
| `mp_famille` | `/api/data/mp_famille` | 500 | `Incorrect arguments to mysqld_stmt_execute` |
| `mp` | `/api/data/mp` | 500 | idem |
| `ofabrication` | `/api/data/ofabrication` | 500 | idem |
| `mouvement` | `/api/data/mouvement` | 500 | idem |
| `mpconteneur` | `/api/data/mpconteneur` | 500 | idem |
| `articlescolis` | `/api/data/articlescolis` | 500 | idem |
| `detailcolis` | `/api/data/detailcolis` | 500 | idem |
| `expeditions` | `/api/data/expeditions` | 500 | idem |
| `vue_stock` | `/api/data/vue_stock` | 500 | idem |
| `diva_stock` | `/api/data/diva_stock` | 500 | idem |
| `/api/admin/jobs/:id/run` | `/api/admin/jobs/52/run` (GET) | 404 | Route non enregistrée (peut-être POST) |

Corps d'erreur type pour tous les 500 ci-dessus : `{"success":false,"message":"..."}`

---

## 2. Endpoints Tables / Vues (22) — `GET /api/data/{nom}?limit=100&offset=0`

### ✅ Fonctionnels (10)

#### `itemtrxenq` — source SDT, vue `vwItemTrxEnq`
Clés : `IsSplit`, `SONo`, `TransactionID`, `ItemNo`, `OpNo`, `PartialClaim`, `StartTime`, `EndTime`, `TerminalNo`, `Quantity`, `LogDate`, `OpCode`, `PayRate`, `SAM`, `DailyWorkScheduleID`, `LastUpdate`, `ShiftCode`, `ProdGroup`, `EmpGroup`, `ProdGrpID`, `EmpGrpID`, `ActionType`, `EmployeeName`, `CutLotNo`, `WorkstageNo`, `ItemCard`, `TagDTime`, `MasterItemNo`, `MoBundleNo`, `CutLotBundleNo`, `MoCutLotNo`, `UHFEPC`, `BuyerEPC`, `EPCTagDTime`

#### `vwitemtrx` — source SDT, vue `vwItemTrx`
Clés : `TransactionID`, `LogDate`, `ShiftCode`, `ProdGroup`, `OpNo`, `OpName`, `SMV`, `Quantity`, `StartTime`, `EndTime`, `BundleTime`, `BreakTime`, `TerminalNo`, `MachineCode`, `MachineDesc`, `MachineType`

#### `losttype` — source SDT, vue `vwLostType`
Clés : `LostTypeID`, `LostTypeCode`, `LostTypeDesc`

#### `losttimetrx` — source SDT, vue `vwLostTimeTrx`
Clés : `LogDate`, `ShiftCode`, `ProdGroup`, `EmployeeNo`, `LostTypeID`, `StartTime`, `EndTime`, `LostTime`, `MONo`, `OpNo`, `OpName`, `TerminalNo`, `MachineCode`

#### `production` — source QCM, vue `vwProduction`
Clés : `LogDate`, `ShiftCode`, `ProdGroup`, `LoginManpower`, `TodayQty`, `EarnMin`, `ClockTime`, `LostTime`

#### `inlinevsendlinecomparison` — source QCM, vue `vwInlineVSEndlineComparison`
Clés : `LOGDATE`, `ShiftCode`, `SHORTNAME`, `OPERATIONNO`, `MONO`, `RovingSampleQty`, `RovingDefectQty`, `EndlineInspectedQty`, `EndlineDefectQty`

#### `empdefecteff` — source QCM, vue `vwEmpDefectEff`
Clés : `LogDate`, `ShiftCode`, `ProdGroup`, `EmployeeNo`, `OpNo`, `OpName`, `MONo`, `SMV`, `TodayQty`, `ClockTime`, `LostTime`, `DefectQty`

#### `vwdefect` — source QCM, vue `vwDefect`
Clés : `LOGDATE`, `ShiftCode`, `ProdGroup`, `OpNo`, `QCCheckpointQty`, `DefectQty`

#### `reject_qte` — source QCM, vue `RejectQty`
Clés : `LogDate`, `ShiftCode`, `SHORTNAME`, `STYLECODE`, `SONO`, `MONO`, `LinkedID`, `EventTime`, `ProcessType`, `GlobalTagID`, `GlobalTagDOB`, `Qty`, `RejectEventTime`, `RejectQty`

#### `qcmdefecttrx` — source QCM, vue `QCMDefectTrx`
Clés : `LOGDATE`, `ShiftCode`, `GROUPID`, `TicketID`, `ITEMNO`, `TerminalNo`, `TransactionTime`, `LinkedID`, `OPERATIONNO`, `DEFECTCODEID`, `DEFECTCODENAME`, `DEFECTQUANTITY`, `QCCheckPointOP`, `DefectCategoryName`

### ❌ Cassés (12) — voir §1 pour les erreurs

- `rovereffectiveness` (QCM) — colonnes non confirmées ; la description de la collection cite `LOGDATE, ShiftCode, SHORTNAME, MONO` mais **non vérifiées** (timeout avant retour de données)
- `checkpassqte` (QCM) — colonnes historiquement observées dans le PDF (2026-07-02) : `LOGDATE`, `SHORTNAME`, `ShiftCode`, `DefectPcs`, `FirstCheckQty`, `FirstPassQty`, `ReCheckedQty`, `PassQty`, `TotalCheckedQty`, `TotalPassQty` — fonctionnait alors, timeout maintenant (régression probable)
- `mp_famille`, `mp`, `ofabrication`, `mouvement`, `mpconteneur`, `articlescolis`, `detailcolis`, `expeditions`, `vue_stock`, `diva_stock` (toutes DIVATEX) — **colonnes inconnues**, ces endpoints n'ont jamais renvoyé de données avec succès dans aucune des deux sources

---

## 3. Endpoints Requêtes KPI (36) — `GET /api/data/q/{nom}?limit=100&offset=0`

Toutes retournent **200** au dernier test. 5 sont marquées **[INACTIF]** dans la collection de tests (raison non documentée — probablement dépréciées côté usage dashboard bien qu'elles répondent techniquement). Enveloppe standard :
```json
{ "success": true, "query": "<nom>", "prestataire": {...}, "count": n, "limit": n, "offset": 0, "data": [...] }
```

| # | Endpoint | Statut | Clés (dans `data[]`) |
|---|---|---|---|
| 1 | `colis_total_3var` | ✅ | `Total_colis`, `Colis_valides`, `Total_rejetes`, `RFID_introuvable`, `Colis_annules` |
| 2 | `packets_rejetes` | ✅ | `Jour`, `RFID_introuvable`, `Packet_annule` |
| 3 | `wip_chaine` | ✅ | `ProdGroup`, `WIP_Chaine` |
| 4 | `taging_reel` | ✅ | `MONo`, `ProdGroup`, `TotalEngagement`, `TotalEmbalage`, `StatutTagging` |
| 5 | `etat_avancement` | ✅ | `OF_No`, `ProdGroup`, `departage`, `vigniette_coupe`, `envoie_serigraphie`, `sortie_serigraphie`, `sortie_coupe`, `entree_chaine`, `engagement`, `sortie_montage`, `controle_qualite`, `conditionement`, `embalage` |
| 6 | `efficience_chaine` | ✅ | `ProdGroup`, `TempsStandard`, `TempsPresence`, `Efficience_Pourcentage` |
| 7 | `minutes_presence` | ✅ | `ProdGroup`, `EmployeeNo`, `EmployeeName`, `TempsPresence_Min` |
| 8 | `minutes_produites` | ✅ | `ProdGroup`, `EmployeeNo`, `EmployeeName`, `TotalQuantite`, `MinuteProduite` |
| 9 | `temps_operation` | ✅ | `ProdGroup`, `OpNo`, `OpCode`, `TempsOperation` |
| 10 | `lost_time` | ✅ | `LostTypeCode`, `LostTypeDesc`, `TotalLostTime` |
| 11 | `qte_produite` | ✅ | `DateProduction`, `OF_No`, `Article`, `Chaine`, `Quantite_Produite` |
| 12 | `qte_entree_serigraphie` | ✅ | `DateEntreeSerigraphie`, `OF_No`, `Article`, `Chaine`, `Quantite_Entree_Serigraphie` |
| 13 | `qte_depart_chaine_article_of` | ✅ | `DateDepartage`, `Chaine`, `Article`, `OF_No`, `Quantite_Departage` |
| 14 | `sortie_serigraphie` | ✅ | `DateSerigraphie`, `Commande`, `OpNo`, `Quantite_Sortie_Serigraphie` |
| 15 | `qte_engagement` | ✅ | `DateEngagement`, `Commande`, `OpNo`, `Quantite_Engagement` |
| 16 | `sortie_coupe` | ✅ | `DateProduction`, `Commande`, `OpNo`, `Quantite_Sortie_Coupe` |
| 17 | `qte_produite_indiv_jour` | ✅ | `DateProduction`, `EmployeeNo`, `EmployeeName`, `Quantite_Produite` |
| 18 | `pieces_ok_de_premier_coup_jour_en_cours` | ✅ | `FirstPassToday` |
| 19 | `pieces_produites_jour_en_cours` | ✅ | `ProducedToday` |
| 20 | `rejets_suite_inspection_paquet_jour_en_cours` | ✅ ⚠️ INACTIF | `BundleRejectToday` |
| 21 | `inspections_paquet_jour_en_cours` | ✅ ⚠️ INACTIF | `BundleInspectedToday` |
| 22 | `pieces_ok_de_premier_coup_annee_en_cours` | ✅ | `FirstPassYear` |
| 23 | `pieces_produites_annee_en_cours` | ✅ | `ProducedYear` |
| 24 | `rejets_suite_inspection_paquet_annee_en_cours` | ✅ ⚠️ INACTIF | `BundleRejectYear` |
| 25 | `inspections_paquet_annee_en_cours` | ✅ ⚠️ INACTIF | `BundleInspectedYear` |
| 26 | `requete_unifiee_dashboard_tout-en-un` | ✅ ⚠️ INACTIF | `FirstPassToday`, `ProducedToday`, `BundleRejectToday`, `BundleInspectedToday`, `FirstPassYear`, `ProducedYear`, `BundleRejectYear`, `BundleInspectedYear` |
| 27 | `stock_moyen` | ✅ | `StockMoyen`, `NbLignesStock` |
| 28 | `articles_sans_mouvement_durant_365_jours` | ✅ | `NbArticles_SansMvt_365j`, `Qtte_SansMvt_365j` |
| 29 | `quantite_totale_du_stock` | ✅ | `Quantite_Totale_Stock` |
| 30 | `capacite_de_stockage_en_nombre_de_conteneurs` | ✅ | `Total_Conteneurs`, `Conteneurs_Actifs`, `Conteneurs_Consommes`, `Conteneurs_Supprimes` |
| 31 | `nombre_de_rouleaux` | ✅ | `NbRouleaux` |
| 32 | `nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel` | ✅ | `NbOF_Livres_Total`, `OF_AvecTransfertCoupe`, `OF_AvecTransfertCoupeJemmel`, `OF_AvecTransfertCoupe_Total` |
| 33 | `moyenne_date_de_transfert_date_de_reservation` | ✅ | `MoyenneJours`, `NbOFConsideres` |
| 34 | `quantite_par_provenance_total` | ✅ | `Provenance`, `Quantite`, `NbArticles` |
| 35 | `quantite_par_famille` | ✅ | `FamilleFG`, `Quantite` |
| 36 | `quantite_par_typologie_fournitures` | ✅ | `Typologie`, `Quantite`, `NbArticles` |

---

## 4. Endpoints Admin

### `GET /api/admin/jobs` — ✅ 200
Liste les jobs planifiés (cron) qui exécutent automatiquement les requêtes KPI ci-dessus (39 jobs au total, un par requête KPI environ, exécutés chaque minute).
Clés : `id`, `nom`, `label`, `schedule`, `action_type`, `action_ref`, `actif`, `last_run`, `last_status`, `last_message`, `created_at`

### `GET /api/admin/jobs/:id/run` — ❌ 404
`Route non trouvée.` Vérifier si la méthode devrait être `POST`.

---

## 5. Notes pour l'agent

- **Toujours utiliser `x-api-key`** en header ; ne pas tenter le flux JWT sauf besoin spécifique confirmé.
- **Ne jamais appeler en boucle/retry** les 12 endpoints listés en §1 — ce sont des échecs serveur confirmés, pas des erreurs transitoires (sauf les 2 timeouts, qui pourraient un jour fonctionner si le serveur est optimisé).
- Pour les 5 endpoints KPI marqués **[INACTIF]** (§3, lignes 20-21, 24-26), les données renvoyées sont valides mais leur usage métier est incertain — les traiter avec prudence dans un dashboard.
- Les champs `ProdGroup`, `SHORTNAME`, `MONo`/`MONO`, `SONo`/`SONO` sont souvent retournés **avec des espaces de padding** (chaînes de longueur fixe côté SQL Server) — toujours `TRIM()` côté agent avant comparaison/affichage.
- Ce document ne remplace pas un appel réel si une donnée à jour est requise — il sert à éviter d'appeler des endpoints connus pour être cassés et à connaître la forme des réponses sans devoir les découvrir par essai-erreur.

---

*Sources : `Guide_API_Prestataire_Novacity.pdf` (généré 2026-07-02) et `report.html` (Newman, exécuté 2026-07-08). Document confidentiel — contient une clé API active.*
