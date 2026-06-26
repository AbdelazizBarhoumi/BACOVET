# BACOVET Dashboard — Spécification Complète des Pages
**Version de référence :** CDC v2.2 (05/03/2026) + API Novacity v1.2 (28/04/2026)
**Auteur analyse :** Novation Industry 4.0 Center

---

## Légende globale

| Icône | Signification |
|-------|---------------|
| ✅ | Endpoint API actif et mappé |
| ⚠️ | Endpoint mappé mais **INACTIF** dans l'API v2 — activation requise |
| 🔗 | Source externe (Google Drive / Sheets) — hors API Novacity |
| ❌ | Champ absent de l'API v1 et v2 — développement ou alimentation manuelle nécessaire |
| 🔄 | Job cron configuré (exécution toutes les minutes) |

---

## Table des Pages

| Page | Vue | Série F-REQ | Profils autorisés |
|------|-----|-------------|-------------------|
| [P-00](#p-00--vue-dauthentification) | Authentification | — | Tous |
| [P-01](#p-01--vue-dadministration) | Administration | — | IT / Admin |
| [P-02](#p-02--vue-performance-qualité) | Qualité | 100 (101–121) | Direction, Resp. Qualité, Production |
| [P-03A](#p-03a--vue-production--confection) | Production — Confection | 200+300 (subset) | Chef Atelier, Resp. Production |
| [P-03B](#p-03b--vue-production--coupe) | Production — Coupe | 200+300 (subset) | Chef Atelier, Resp. Production, Coupe |
| [P-03C](#p-03c--vue-production--sérigraphie) | Production — Sérigraphie | 200+300 (subset) | Chef Atelier, Resp. Production |
| [P-04](#p-04--vue-méthodes) | Méthodes | 216–219 | Méthodes / Planning |
| [P-05](#p-05--vue-logistique--planning) | Logistique & Planning | 300 (301–337) | Direction, Planning/Coupe, Resp. Production |
| [P-06](#p-06--vue-développement) | Développement | 350 (350–353) | Méthodes / Planning, Direction |

---

## P-00 — Vue d'Authentification

**Référence :** F-REQ-400
**Route :** `/login`
**Accès :** Public (avant authentification)

### Contenu obligatoire

Le portail d'entrée unique affiche :

- Logo BACOVET + mention "PILOTAGE OPÉRATIONNEL"
- Champ **MATRICULE / ID** (identifiant système)
- Champ **CLÉ DE SÉCURITÉ** (mot de passe, masqué par défaut avec toggle affichage)
- Bouton **VALIDATION IDENTITÉ**
- Lien "Réinitialisation" (mot de passe oublié)
- Mention réseau local / connectivité

### Comportement post-login (RBAC)

Après validation, le système lit le profil utilisateur et applique les règles suivantes :

| Profil | Redirection automatique | Onglets visibles |
|--------|------------------------|------------------|
| Direction | P-02 (Qualité) | Tous |
| Resp. Production | P-03A (Confection) | P-02, P-03A/B/C, P-05 |
| Chef d'atelier | P-03A (selon atelier assigné) | P-03A ou P-03B ou P-03C |
| Resp. Qualité | P-02 (Qualité) | P-02 |
| IT / Administrateur | P-01 (Admin) | Tous + Admin |
| Méthodes / Planning | P-04 (Méthodes) | P-02, P-04, P-05 |
| Coupe | P-03B (Coupe) | P-03B, P-05 |

### Règles de session

- L'identifiant connecté doit être **affiché en permanence** dans le header de toutes les pages (NF-REQ-505).
- Session expirée automatiquement après **8 heures d'inactivité** ou fin de shift standard.
- Toutes les tentatives de connexion (succès et échecs) sont enregistrées dans le journal d'audit.

### API concernée

Aucun endpoint de données métier. L'authentification utilise un mécanisme interne JWT (voir `/api/admin/jobs` Bearer JWT pour référence de pattern).

---

## P-01 — Vue d'Administration

**Référence :** F-REQ-401
**Route :** `/admin`
**Accès :** IT / Administrateur uniquement

### Pilier 1 — Supervision des flux API (Pipeline Monitoring)

Afficher le statut de connexion en temps réel pour chaque source de données :

| Source | Endpoint de vérification | Champ de santé | Affichage |
|--------|--------------------------|----------------|-----------|
| ERP DIVA (DIVATEX) | `GET /api/data/diva_stock` | `success: true/false` | Badge Online / Offline |
| GPRO-Prod / QCM | `GET /api/data/production` | `success: true/false` | Badge Online / Offline |
| GPRO Planning / SDT | `GET /api/data/q/etat_avancement` | `success: true/false` | Badge Online / Offline |
| Google Drive / Sheets | Connecteur externe | n/a | Badge Online / Offline |

Pour chaque source, afficher :
- **Statut** : Online (vert) / Offline (rouge)
- **Time since last sync** : calculé depuis le champ `last_run` de l'endpoint `GET /api/admin/jobs`
- **Nombre d'enregistrements dernière sync** : issu de `last_message` (ex. "37 ligne(s) retournée(s)")

#### Catalogue des 39 jobs cron (référence admin)

Tous les jobs tournent à `*/1 * * * *`. Afficher le tableau suivant avec statut `last_status` :

| Job ID | Nom | Requête liée | Statut attendu |
|--------|-----|--------------|----------------|
| 25 | colis | colis_total_3var | ✅ ok |
| 26 | packet rejeter | packets_rejetes | ✅ ok |
| 27 | wip | wip_chaine | ✅ ok |
| 28 | taging | taging_reel | ✅ ok |
| 29, 30 | etat avancement | etat_avancement | ✅ ok |
| 31 | eff/ch | efficience_chaine | ✅ ok |
| 32 | min presence | minutes_presence | ✅ ok |
| 33 | min produite | minutes_produites | ✅ ok |
| 34 | temp d'opération | temps_operation | ✅ ok |
| 35 | lost time | lost_time | ✅ ok |
| 36 | qte produite | qte_produite | ✅ ok |
| 37 | qte serigraphie | qte_entree_serigraphie | ✅ ok |
| 38 | qte depart chaine | qte_depart_chaine_article_of | ✅ ok |
| 39 | sortie serigraphe | sortie_serigraphie | ✅ ok |
| 40 | qte engagement | qte_engagement | ✅ ok |
| 41 | sortie coupe | sortie_coupe | ✅ ok |
| 42 | qte produite par jour | qte_produite_indiv_jour | ✅ ok |
| 43 | qte par typologie | quantite_par_typologie_fournitures | ✅ ok |
| 44 | qte par famille | quantite_par_famille | ✅ ok |
| 45 | qte par provenance | quantite_par_provenance_total | ✅ ok |
| 46 | moyene date | moyenne_date_de_transfert_date_de_reservation | ✅ ok |
| 47 | nbre dof livree | nombre_d_ofs_livres_avec_date_de_transfert_coupe_jemmel | ✅ ok |
| 48 | nbre roulot | nombre_de_rouleaux | ✅ ok |
| 49 | capacité stockage | capacite_de_stockage_en_nombre_de_conteneurs | ✅ ok |
| 50 | qte total stock | quantite_totale_du_stock | ✅ ok |
| 51 | article sans mouvement | articles_sans_mouvement_durant_365_jours | ✅ ok |
| 52 | stock moyen | stock_moyen | ✅ ok |
| 53 | unifié | requete_unifiee_dashboard_tout-en-un | ⚠️ Inactif |
| 54, 56 | inspection paquet année | inspections_paquet_annee_en_cours | ⚠️ Inactif |
| 55, 57 | rejet année | rejets_suite_inspection_paquet_annee_en_cours | ⚠️ Inactif |
| 58 | pièce en cours | pieces_produites_annee_en_cours | ✅ ok |
| 59 | pièce ok | pieces_ok_de_premier_coup_annee_en_cours | ✅ ok |
| 60 | inspection paquet jour | inspections_paquet_jour_en_cours | ⚠️ Inactif |
| 61 | rejet jour en cours | rejets_suite_inspection_paquet_jour_en_cours | ⚠️ Inactif |
| 62 | pièce produit jour | pieces_produites_jour_en_cours | ✅ ok |
| 63 | colis total | colis_total_3var | ✅ ok |

### Pilier 2 — Gestion des Écrans (NF-REQ-503)

Interface de mapping physique des terminaux d'affichage :

| Terminal | Zone | Dashboard assigné |
|----------|------|-------------------|
| TV Confection (n lignes) | Atelier Confection | P-03A |
| Écran Coupe | Atelier Coupe | P-03B |
| TV Sérigraphie | Atelier Sérigraphie | P-03C |
| Écran Qualité | Zone contrôle | P-02 |
| Écran Entrepôt | Entrepôt | P-05 |

Contrôle à distance : sélection du dashboard projeté par écran, sans déplacement physique.

### Pilier 3 — Gestion des Comptes et Journal d'Audit (NF-REQ-505)

- Création / suppression de comptes utilisateurs
- Réinitialisation de mots de passe
- Attribution des droits par série (100 à 400)
- Journal d'audit : horodatage, utilisateur, action (connexion, déconnexion, modification config)
- Le journal doit être **infalsifiable** et exportable

---

## P-02 — Vue Performance Qualité

**Référence :** F-REQ-402 — Série 100
**Route :** `/qualite`
**Rafraîchissement :** Temps réel (sauf DRIVE : 4×/jour)
**Lecture à distance :** 5 mètres minimum — contraste élevé obligatoire (NF-REQ-507)
**Filtres disponibles :** Marque (Brand), Atelier, Ligne, OF

### Code couleur global pour tous les KPIs BR (Blocking Rate)

| Valeur | Couleur | Signification |
|--------|---------|---------------|
| < 4% | 🟢 Vert | Objectif atteint |
| 4% – 5% | 🟠 Orange | Vigilance |
| > 5% | 🔴 Rouge | Hors cible — action requise |

### Code couleur pour RFT

| Valeur | Couleur |
|--------|---------|
| ≥ 98% | 🟢 Vert |
| 95% – 98% | 🟠 Orange |
| < 95% | 🔴 Rouge |

---

### F-REQ-101 — BR (Blocking Rate annuel)

**Description :** Taux de rejet suite inspection commande depuis le début de l'année (YTD).
**Formule :** `(Nombre de rejets inspection commande / Nombre d'inspections commande) × 100`
**Cible :** ≤ 5%
**Graphique :** Big Number avec couleur
**Fréquence :** Temps réel

| Champ | Source | Endpoint | Field JSON | Statut |
|-------|--------|----------|------------|--------|
| Numérateur | DIVA | — | Non mappé | ❌ Absent API v1 et v2 |
| Dénominateur | DIVA | — | Non mappé | ❌ Absent API v1 et v2 |

**Action requise :** Ces deux variables doivent être ajoutées à l'API Novacity dans une prochaine version, ou alimentées manuellement via Google Sheets.

---

### F-REQ-102 — BR GTD (jour en cours)

**Description :** Taux de rejet suite contrôle RFID colis par chaine de production pour le jour en cours.
**Formule :** `(SUM(qtte) / SUM(total_colis)) × 100`
**Cible :** ≤ 5%
**Graphique :** Big Number avec couleur
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numérateur — rejets | DIVA | `GET /api/data/q/packets_rejetes` | `qtte` | ✅ Job #26 |
| Dénominateur — total colis | DIVA | `GET /api/data/q/colis_total_3var` | `total_colis` | ✅ Job #25, #63 |

**Structure de réponse — packets_rejetes :**
```json
{
  "data": [
    { "IDColis": 2001, "reference": "PK-0001", "motif": "Défaut couture", "qtte": 12, "date_rejet": "2026-04-19T10:12:00.000Z" }
  ]
}
```

**Structure de réponse — colis_total_3var :**
```json
{
  "data": [
    { "commande": "CMD-2026-0101", "article": "ART-001", "couleur": "Blanc", "total_colis": 24, "total_pieces": 288 }
  ]
}
```

**Notes d'implémentation :**
- Filtrer `packets_rejetes` sur `date_rejet` = date du jour (format ISO, tronquer à la date).
- Filtrer `colis_total_3var` sur date du jour si un champ date est disponible.
- `SUM(qtte)` / `SUM(total_colis)` × 100.

---

### F-REQ-103 — BR GTD DDA (annuel)

**Description :** Taux de rejet RFID colis depuis le début de l'année, par chaine.
**Formule :** `(Nombre de rejets RFID colis annuels / Nombre de contrôles RFID colis annuels) × 100`
**Cible :** ≤ 5%
**Graphique :** Line Chart (courbe tendance YTD) + Big Number avec couleur
**Fréquence :** Temps réel

| Champ | Source | Endpoint | Field JSON | Statut |
|-------|--------|----------|------------|--------|
| Numérateur annuel | DIVA | — | Non mappé | ❌ Absent API v1 et v2 |
| Dénominateur annuel | DIVA | — | Non mappé | ❌ Absent API v1 et v2 |

**Action requise :** Endpoint dédié à créer dans l'API, agrégant `packets_rejetes` et `colis_total_3var` avec filtre annuel.

---

### F-REQ-104 — RFT (Right First Time — jour en cours)

**Description :** Pièces conformes du premier coup sur la journée en cours, par chaine.
**Formule :** `(FirstPassToday / ProducedToday) × 100`
**Cible :** ≥ 98%
**Graphique :** Big Number avec couleur
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numérateur | GPRO-Prod (QCM) | `GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours` | `FirstPassToday` | ✅ Job #59 |
| Dénominateur | GPRO-Prod (QCM) | `GET /api/data/q/pieces_produites_jour_en_cours` | `ProducedToday` | ✅ Job #62 |

**Structure de réponse — pieces_ok_de_premier_coup_jour_en_cours :**
```json
{ "data": [{ "FirstPassToday": 2947 }] }
```

**Structure de réponse — pieces_produites_jour_en_cours :**
```json
{ "data": [{ "ProducedToday": 80 }] }
```

> ⚠️ **Anomalie de données en environnement test :** `FirstPassToday` (2947) est supérieur à `ProducedToday` (80) dans les exemples de l'API — situation physiquement impossible. Vérifier la cohérence des données réelles avec l'équipe Novacity avant mise en production.

**Calcul :** `(data[0].FirstPassToday / data[0].ProducedToday) × 100`

---

### F-REQ-105 — RFT DDA (annuel)

**Description :** Pièces conformes du premier coup depuis le début de l'année.
**Formule :** `(FirstPassYear / ProducedYear) × 100`
**Cible :** ≥ 98%
**Graphique :** Line Chart (courbe tendance mensuelle) + Big Number avec couleur
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numérateur | GPRO-Prod (QCM) | `GET /api/data/q/pieces_ok_de_premier_coup_annee_en_cours` | `FirstPassYear` | ✅ Job #59 |
| Dénominateur | GPRO-Prod (QCM) | `GET /api/data/q/pieces_produites_annee_en_cours` | `ProducedYear` | ✅ Job #58 |

**Structure de réponse :**
```json
{ "data": [{ "FirstPassYear": 1664359 }] }
{ "data": [{ "ProducedYear": 882644 }] }
```

> ⚠️ Même anomalie de cohérence que F-REQ-104 (FirstPassYear > ProducedYear en données de test).

---

### F-REQ-106 — BR Bundling (jour en cours)

**Description :** Taux de rejet suite inspection paquet pour le jour en cours.
**Formule :** `(BundleRejectToday / BundleInspectedToday) × 100`
**Cible :** ≤ 5%
**Graphique :** Big Number avec couleur
**Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numérateur | GPRO-Prod (QCM) | `GET /api/data/q/rejets_suite_inspection_paquet_jour_en_cours` | `BundleRejectToday` | ⚠️ **INACTIF** — Job #61 |
| Dénominateur | GPRO-Prod (QCM) | `GET /api/data/q/inspections_paquet_jour_en_cours` | `BundleInspectedToday` | ⚠️ **INACTIF** — Job #60 |

> ⚠️ **ACTION CRITIQUE :** Ces deux endpoints sont marqués `État: Inactif` dans l'API v2. L'équipe Novacity doit **activer ces requêtes** avant le déploiement. Sans activation, ce KPI affichera toujours 0.

---

### F-REQ-107 — BR Bundling DDA (annuel)

**Description :** Taux de rejet inspection paquet depuis le début de l'année.
**Formule :** `(BundleRejectYear / BundleInspectedYear) × 100`
**Cible :** ≤ 5%
**Graphique :** Line Chart + Big Number avec couleur
**Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numérateur | GPRO-Prod (QCM) | `GET /api/data/q/rejets_suite_inspection_paquet_annee_en_cours` | `BundleRejectYear` | ⚠️ **INACTIF** — Job #55, #57 |
| Dénominateur | GPRO-Prod (QCM) | `GET /api/data/q/inspections_paquet_annee_en_cours` | `BundleInspectedYear` | ⚠️ **INACTIF** — Job #54, #56 |

> ⚠️ Même blocage qu'en F-REQ-106. Activation des 4 endpoints (jobs 54, 55, 56, 57, 60, 61) nécessaire côté API.

---

### F-REQ-108 — BR Print (jour en cours)

**Description :** Taux de rejet suite inspection livraison sérigraphie pour le jour en cours.
**Formule :** `(Nombre rejets sérigraphie / Nombre inspections sérigraphie) × 100`
**Cible :** ≤ 5%
**Graphique :** Big Number avec couleur
**Fréquence :** 4 fois par jour

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Numérateur | DRIVE (Google Sheets) | Connecteur Google Drive | 🔗 Hors API Novacity |
| Dénominateur | DRIVE (Google Sheets) | Connecteur Google Drive | 🔗 Hors API Novacity |

**Implémentation :** Lecture de la feuille Google Sheets dédiée aux inspections sérigraphie, avec actualisation planifiée 4×/jour (ex. 06:00, 10:00, 14:00, 18:00).

---

### F-REQ-109 — BR Print DDA (annuel)

**Description :** Taux de rejet livraison sérigraphie depuis le début de l'année.
**Formule :** `(Rejets sérigraphie annuels / Inspections sérigraphie annuelles) × 100`
**Cible :** ≤ 5%
**Graphique :** Line Chart + Big Number avec couleur
**Fréquence :** 4 fois par jour

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur | DRIVE | 🔗 Hors API Novacity |
| Dénominateur | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-110 — BR Care Label (jour en cours)

**Description :** Taux de rejet inspection livraison vignettes pour le jour en cours.
**Formule :** `(Rejets vignettes / Inspections vignettes) × 100`
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Big Number avec couleur

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-111 — BR Care Label DDA (annuel)

**Description :** Taux de rejet vignettes depuis le début de l'année.
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Line Chart + Big Number

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur annuels | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-112 — BR Accessoires (jour en cours)

**Description :** Taux de rejet inspection livraison accessoires pour le jour en cours.
**Formule :** `(Rejets accessoires / Inspections accessoires) × 100`
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Big Number avec couleur

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-113 — BR Accessoires DDA (annuel)

**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Line Chart + Big Number

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur annuels | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-114 — BR Compo (jour en cours)

**Description :** Taux de rejet inspection livraison Composants pour le jour en cours.
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Big Number avec couleur

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-115 — BR Compo DDA (annuel)

**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Line Chart + Big Number

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur annuels | DRIVE | 🔗 Hors API Novacity |

---

### F-REQ-116 — Pareto Defects RFT (jour en cours)

**Description :** Graphique Pareto des défauts au niveau opération GPRO (postes 93, 100, 102) pour le jour en cours.
**Graphique :** Pareto Chart interactif (barres descendantes + courbe cumulative %)
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Fields JSON | Statut |
|-------|--------|--------------|-------------|--------|
| Quantité de défauts | GPRO-Prod (QCM) | `GET /api/data/vwdefect` | `LOGDATE, ShiftCode, ProdGroup, OpNo, Qty` | ✅ |

**Structure de réponse :**
```json
{
  "data": [
    { "LOGDATE": "2026-04-20T00:00:00.000Z", "ShiftCode": "S1", "ProdGroup": "G01", "OpNo": "OP10", "Qty": 4 },
    { "LOGDATE": "2026-04-20T00:00:00.000Z", "ShiftCode": "S1", "ProdGroup": "G02", "OpNo": "OP20", "Qty": 2 },
    { "LOGDATE": "2026-04-21T00:00:00.000Z", "ShiftCode": "S2", "ProdGroup": "G01", "OpNo": "OP30", "Qty": 7 }
  ]
}
```

**Notes d'implémentation :**
- Filtrer `LOGDATE` = date du jour.
- Filtrer `OpNo` dans `["OP93", "OP100", "OP102"]` (**à confirmer avec Novacity** — le mapping signale "à vérifier").
- Grouper par type de défaut (ou `OpNo`), `SUM(Qty)`, trier décroissant.
- Afficher le top 10 défauts avec % cumulatif.
- Interactivité : clic sur une barre pour drill-down par `ProdGroup` / `ShiftCode`.

---

### F-REQ-117 — Pareto Defects Inspection Colis (BR IN + BR GTD)

**Description :** Pareto des défauts Inspection AQL Colis + Contrôle RFID pour le jour en cours.
**Graphique :** Pareto Chart interactif
**Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Défauts RFID colis | DIVA (QCM) | `GET /api/data/vwdefect` | `Qty, OpNo, ProdGroup` | ✅ (partiel) |
| Défauts inspection AQL colis | DRIVE | Connecteur Google Drive | — | 🔗 Hors API |

**Notes d'implémentation :**
- Combiner données `vwdefect` (DIVA) avec données DRIVE.
- Normaliser les deux sources dans un format commun avant agrégation Pareto.
- La colonne "type défaut" sera dérivée de `OpNo` pour la source API, et du champ correspondant dans le Google Sheet.

---

### F-REQ-118 — Best QP Team (Top 3 chaines)

**Description :** Les 3 chaines ayant la meilleure performance qualité composite.
**Formule scoring :** `(0/1)BR × 5 + (0/1)BR_IN × 3 + (0/1)BR_GTD × 3 + (0/1)RFT × 1`
**Graphique :** Podium visuel ou Top 3 List (médaille Or / Argent / Bronze)
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Score qualité par chaine (MONO) | DIVA + DRIVE + G.PRO (QCM) | `GET /api/data/rovereffectiveness` | `LOGDATE, ShiftCode, SHORTNAME, MONO` | ✅ |

**Structure de réponse :**
```json
{
  "data": [
    { "LOGDATE": "2026-04-20T00:00:00.000Z", "ShiftCode": "S1", "SHORTNAME": "CH1", "MONO": 92.5 },
    { "LOGDATE": "2026-04-20T00:00:00.000Z", "ShiftCode": "S2", "SHORTNAME": "CH1", "MONO": 88.1 },
    { "LOGDATE": "2026-04-21T00:00:00.000Z", "ShiftCode": "S1", "SHORTNAME": "CH2", "MONO": 90.3 }
  ]
}
```

**Notes d'implémentation :**
- Filtrer sur `LOGDATE` = date du jour.
- Grouper par `SHORTNAME` (= identifiant chaine).
- Trier par `MONO` décroissant — prendre les 3 premiers.
- Le score de scoring (0/1 par KPI) doit être calculé en amont à partir des KPIs individuels (BR, BR IN, BR GTD, RFT). Le champ `MONO` semble être un score agrégé déjà calculé côté API.
- **Règle :** 0 = objectif non atteint, 1 = objectif atteint (selon note CDC §3.2).

---

### F-REQ-119 — Low QP Team (3 chaines à améliorer)

**Description :** Les 3 chaines avec la performance qualité la plus basse.
**Formule :** Identique à F-REQ-118
**Graphique :** Podium inversé ou Bottom 3 List (signalétique rouge)
**Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Score qualité par chaine | QCM | `GET /api/data/rovereffectiveness` | `SHORTNAME, MONO` | ✅ |

**Notes :** Même logique que F-REQ-118, trier `MONO` croissant — prendre les 3 premiers.

---

### F-REQ-120 — BR IN (jour en cours)

**Description :** Taux de rejet suite inspection colis AQL pour le jour en cours.
**Formule :** `(Nombre rejets inspection colis / Nombre inspections colis) × 100`
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Big Number avec couleur

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur | DRIVE | 🔗 Hors API Novacity |

> Note : Le CDC page 13 liste cette source comme "DIVA" mais le document de mapping indique que ces champs sont absents de l'API. Source probable : DRIVE.

---

### F-REQ-121 — BR IN DDA (annuel)

**Description :** Taux de rejet inspection AQL colis depuis le début de l'année.
**Formule :** `(Rejets AQL annuels / Inspections AQL annuelles) × 100`
**Cible :** ≤ 5% — **Fréquence :** 4×/jour — **Graphique :** Big Number avec couleur

| Champ | Source | Statut |
|-------|--------|--------|
| Numérateur + Dénominateur annuels | DIVA | ❌ Absent API v1 et v2 |

---

## P-03A — Vue Production — Confection

**Référence :** F-REQ-403 (subset Confection)
**Route :** `/production/confection`
**Rafraîchissement :** Instantané (temps réel continu)
**Lecture à distance :** 5 mètres — code couleur "Feu Tricolore" (NF-REQ-507)
**Filtres disponibles :** Marque, Atelier, Ligne, OF

### KPIs présents sur cette vue (selon Annexe 1)

F-REQ-102, F-REQ-104, F-REQ-106, F-REQ-201, F-REQ-202, F-REQ-203, F-REQ-204, F-REQ-205, F-REQ-206, F-REQ-207, F-REQ-208, F-REQ-209, F-REQ-211, F-REQ-212, F-REQ-213, F-REQ-214, F-REQ-215, F-REQ-301, F-REQ-303, F-REQ-304, F-REQ-305, F-REQ-306, F-REQ-307, F-REQ-308, F-REQ-310, F-REQ-312

---

### F-REQ-201 — Efficience par OPÉRATEUR par chaine

**Formule :** `(Minutes produites / Minutes présence) × 100`
**Cible :** ≥ 90%
**Graphique :** Combo Bar/Line (barre = valeur opérateur, ligne = cible 90%)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Minutes produites | G.PRO (SDT) | `GET /api/data/q/minutes_produites` | `employe, date, minutes_produites, chaine` | ✅ Job #33 |
| Minutes présence | G.PRO (SDT) | `GET /api/data/q/minutes_presence` | `employe, date, minutes_presence, chaine` | ✅ Job #32 |

**Structure réponse — minutes_produites :**
```json
{
  "data": [
    { "employe": "EMP0123", "date": "2026-04-20", "minutes_produites": 412, "chaine": "CH1" },
    { "employe": "EMP0456", "date": "2026-04-20", "minutes_produites": 395, "chaine": "CH1" }
  ]
}
```

**Structure réponse — minutes_presence :**
```json
{
  "data": [
    { "employe": "EMP0123", "date": "2026-04-20", "minutes_presence": 468, "chaine": "CH1" }
  ]
}
```

**Notes d'implémentation :**
- Jointure sur `employe` + `date` + `chaine`.
- Calcul par opérateur : `(minutes_produites / minutes_presence) × 100`.
- Filtrer sur `date` = aujourd'hui.
- Trier par efficience décroissante.
- Afficher par chaine de confection (filtrer par `chaine`).

---

### F-REQ-202 — Efficience PAR CHAINE

**Formule :** `(Quantité déclarée par chaine × SOT) / (Effectif × Minutes présence) × 100`
**Cible :** > 85%
**Graphique :** Gauge Chart (Jauge) / par période
**Fréquence :** Instantané

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité déclarée par chaine | G.PRO + GPRO Consulting (SDT) | `GET /api/data/q/qte_produite` | `quantite, chaine, shift, date` | ✅ Job #36 |
| Minutes présence (par chaine) | GPRO Consulting (SDT) | `GET /api/data/q/minutes_presence` | `minutes_presence, chaine` | ✅ Job #32 |
| SOT (temps article fournisseur) | GPRO Consulting | — | Non mappé | ❌ Absent API |
| Effectif (nb opérateurs par chaine) | GPRO Consulting | — | Non mappé | ❌ Absent API |

**Structure réponse — qte_produite :**
```json
{
  "data": [
    { "date": "2026-04-20", "chaine": "CH1", "shift": "S1", "quantite": 1478 }
  ]
}
```

> ❌ **Blocage partiel :** SOT et Effectif absent de l'API. En attendant, utiliser `efficience_pct` de l'endpoint `efficience_chaine` comme valeur proxy ou afficher "N/D" pour ce KPI jusqu'à disponibilité des données.

**Alternative disponible :**
```
GET /api/data/q/efficience_chaine → efficience_pct (valeur pré-calculée)
```

---

### F-REQ-203 — Efficience Cumulée Chaine (mensuelle)

**Formule :** `(SUM(minutes_produites mois en cours) / SUM(minutes_presence mois en cours)) × 100`
**Cible :** > 85%
**Graphique :** Line Chart (courbe mensuelle, point par jour)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Minutes produites (mois) | G.PRO (SDT) | `GET /api/data/q/minutes_produites` | `minutes_produites` | ✅ Job #33 |
| Minutes présence (mois) | GPRO Consulting (SDT) | `GET /api/data/q/minutes_presence` | `minutes_presence` | ✅ Job #32 |

**Alternative pré-calculée :**
```
GET /api/data/q/efficience_chaine → efficience_pct (per chaine per date)
```

**Notes :** Filtrer les deux endpoints sur le mois en cours, agréger par chaine, tracer la courbe d'efficience jour par jour.

---

### F-REQ-204 — OWE par chaine

**Formule :** `(Quantité déclarée × SAM) / (Effectif × Minutes présence) × 100`
**Cible :** > 70%
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité déclarée | G.PRO + GPRO Consulting | `GET /api/data/q/qte_produite` | `quantite` | ✅ Job #36 |
| SAM (heures standards) | GPRO Consulting | `GET /api/data/q/efficience_chaine` | `heures_standards` | ✅ Job #31 (proxy) |
| Minutes présence | GPRO Consulting | `GET /api/data/q/minutes_presence` | `minutes_presence` | ✅ Job #32 |
| Effectif | GPRO Consulting | — | Non mappé | ❌ Absent API |

> ❌ **Blocage partiel :** L'Effectif par chaine est absent de l'API. Afficher "N/D" ou utiliser une valeur fixe jusqu'à disponibilité.

---

### F-REQ-205 — WIP par chaine

**Formule :** `Quantité en cours - Quantité sortie poste 93`
**Cible :** ≤ ½ cadence chaine
**Graphique :** Gauge Chart (Jauge)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| En cours (`en_cours`) | G.PRO (SDT) | `GET /api/data/q/wip_chaine` | `chaine, en_cours, entree_jour, sortie_jour` | ✅ Job #27 |
| Sortie poste 93 (`sortie_jour`) | G.PRO (SDT) | `GET /api/data/q/wip_chaine` | `sortie_jour` | ✅ Job #27 |

**Structure réponse :**
```json
{
  "data": [
    { "chaine": "CH1", "en_cours": 1820, "entree_jour": 420, "sortie_jour": 390 },
    { "chaine": "CH2", "en_cours": 945, "entree_jour": 310, "sortie_jour": 305 }
  ]
}
```

**Calcul :** `WIP = en_cours - sortie_jour` par chaine.
**Seuil jauge :** La cadence chaine est ❌ absent de l'API — la limite "½ cadence" sera une valeur fixe à paramétrer manuellement dans la configuration du dashboard.

---

### F-REQ-206 — WIP OPTIMAL

**Formule :** `Quantité engagement (par chaine/article/OF) - Quantité Sortie coupe`
**Cible :** ≥ 1.5 × cadence chaine
**Graphique :** Area Chart (graphique d'aires)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité engagement | G.PRO (SDT) | `GET /api/data/q/qte_engagement` | `commande, of, article, quantite_engagee` | ✅ Job #40 |
| Quantité sortie coupe | G.PRO (SDT) | `GET /api/data/q/sortie_coupe` | `commande, date, quantite_coupee` | ✅ Job #41 |
| Quantité sortie sérigraphie 241 | G.PRO (SDT) | `GET /api/data/q/sortie_serigraphie` | `date, article, couleur, quantite` | ✅ Job #39 |
| Quantité départage (chaine/article/OF) | G.PRO (SDT) | `GET /api/data/q/qte_depart_chaine_article_of` | `of, chaine, article, quantite` | ✅ Job #38 |

**Notes :** La cadence chaine (pour cible) est ❌ absente — à configurer manuellement.

---

### F-REQ-207 — Arrêts non planifiés par chaine

**Valeur affichée :** Minutes perdues par motif, par chaine
**Cible :** < 10 minutes par arrêt
**Graphique :** Timeline (Chronologie) + liste de motifs pour tout arrêt non planifié
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Temps perdu | G.PRO (SDT) | `GET /api/data/q/lost_time` | `date, chaine, motif, minutes_perdues` | ✅ Job #35 |
| Labels des motifs | G.PRO (SDT) | `GET /api/data/losttype` | `LostTypeCode, LostTypeDesc` | ✅ |

**Structure réponse — lost_time :**
```json
{
  "data": [
    { "date": "2026-04-20", "chaine": "CH1", "motif": "MAINT", "minutes_perdues": 45 },
    { "date": "2026-04-20", "chaine": "CH1", "motif": "MATIERE", "minutes_perdues": 22 },
    { "date": "2026-04-20", "chaine": "CH2", "motif": "QUALITE", "minutes_perdues": 18 }
  ]
}
```

**Structure réponse — losttype :**
```json
{
  "data": [
    { "LostTypeID": 1, "LostTypeCode": "MAINT", "LostTypeDesc": "Arrêt maintenance" },
    { "LostTypeID": 2, "LostTypeCode": "MATIERE", "LostTypeDesc": "Rupture matière" },
    { "LostTypeID": 3, "LostTypeCode": "QUALITE", "LostTypeDesc": "Problème qualité" }
  ]
}
```

**Notes :** Joindre `lost_time.motif` avec `losttype.LostTypeCode` pour afficher `LostTypeDesc` dans la timeline.

---

### F-REQ-208 — Efficience Départage PAR OPÉRATRICE (poste 221)

**Formule :** `(Minutes produites poste 221 / Minutes présence) × 100`
**Cible :** > 85%
**Graphique :** Combo Bar/Line / par période
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Minutes produites poste 221 | G.PRO (SDT) | `GET /api/data/q/minutes_produites` **+ filtre OpNo=221** | `minutes_produites` | ✅ avec filtre |
| Minutes présence | G.PRO (SDT) | `GET /api/data/q/minutes_presence` | `minutes_presence` | ✅ Job #32 |

> ⚠️ **Filtre à confirmer :** Le mapping indique `OpNo=221` mais les exemples JSON de l'API ne montrent pas de paramètre de filtrage par OpNo sur cet endpoint. Confirmer avec Novacity si le paramètre de filtre est disponible (`?opno=221`) ou si une requête SQL dédiée doit être créée.

---

### F-REQ-209 — Efficience Vignettes PAR OPÉRATRICE (poste 213)

**Formule :** `(Minutes produites poste 213 / Minutes présence) × 100`
**Cible :** > 85%
**Graphique :** Combo Bar/Line / par période
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Minutes produites poste 213 | G.PRO (SDT) | `GET /api/data/q/minutes_produites` **+ filtre OpNo=213** | `minutes_produites` | ✅ avec filtre |
| Minutes présence | G.PRO (SDT) | `GET /api/data/q/minutes_presence` | `minutes_presence` | ✅ Job #32 |

> ⚠️ Même blocage que F-REQ-208 sur le filtre OpNo.

---

### F-REQ-211 — SAM (Temps Standard Alloué) par chaine

**Valeur affichée :** Heures standard allouées par chaine
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Heures standards | GPRO Consulting (SDT) | `GET /api/data/q/efficience_chaine` | `heures_standards` | ✅ Job #31 |

**Structure réponse :**
```json
{
  "data": [
    { "chaine": "CH1", "date": "2026-04-20", "heures_prod": 8, "heures_standards": 7.12, "efficience_pct": 89 }
  ]
}
```

---

### F-REQ-212 — SOT (Temps Article Fournisseur) par chaine

**Valeur affichée :** Temps d'article de fournisseur
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Temps article fournisseur | GPRO Consulting | — | ❌ Absent API v1 et v2 |

**Action requise :** À ajouter dans une prochaine version de l'API ou à saisir manuellement.

---

### F-REQ-213 — Effectifs par chaine

**Valeur affichée :** Nombre d'opérateurs exigé par chaine
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nb opérateurs exigé | GPRO Consulting | — | ❌ Absent API v1 et v2 |

---

### F-REQ-214 — Code article par chaine

**Valeur affichée :** Code conception de l'article en cours
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Code article (IDOFabrication) | GPRO Consulting (DIVATEX) | `GET /api/data/ofabrication` | `IDOFabrication` | ✅ |

**Structure réponse :**
```json
{
  "data": [
    { "IDOFabrication": 7845, "OFabrication": "OF-2026-0412", "DtDebut": "2026-04-12T06:00:00.000Z", "DtFin": "2026-04-15T18:00:00.000Z" }
  ]
}
```

---

### F-REQ-215 — Désignation d'article par chaine

**Valeur affichée :** Description de l'article en cours
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Description article | GPRO Consulting (DIVATEX) | `GET /api/data/mp` | `Description` | ✅ |

**Structure réponse :**
```json
{
  "data": [
    { "IDMPFamille": 1, "IDMP": 1001, "Description": "Coton blanc 180g", "Commentaire": "Stock principal" }
  ]
}
```

**Notes :** Joindre `mp.IDMP` avec l'identifiant article de l'OF en cours pour afficher la description correspondante.

---

### F-REQ-301 — OF ou OFs confection par CHAINE

**Valeur affichée :** Numéro(s) OF en cours de production par chaine
**Graphique :** Big Number + liste des OF en cours non soldés
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numéro OF | GPRO Consulting (SDT) | `GET /api/data/q/etat_avancement` | `of, statut, avancement_pct, quantite_prevue, quantite_realisee` | ✅ Job #29, #30 |

**Structure réponse :**
```json
{
  "data": [
    { "of": "OF-2026-0412", "avancement_pct": 78.2, "quantite_prevue": 3000, "quantite_realisee": 2346, "statut": "en_cours" },
    { "of": "OF-2026-0413", "avancement_pct": 42.5, "quantite_prevue": 2500, "quantite_realisee": 1062, "statut": "en_cours" }
  ]
}
```

**Notes :** Filtrer `statut = "en_cours"`. Afficher la liste de tous les OF non soldés (note CDC §3.4).

---

### F-REQ-303 — Quantité OF ou OFs par ARTICLE

**Valeur affichée :** Quantité prévue par OF et par article
**Graphique :** Big Number + liste
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité prévue | GPRO Consulting (SDT) | `GET /api/data/q/etat_avancement` | `quantite_prevue` | ✅ Job #29, #30 |

---

### F-REQ-304 — SO Progress par OF

**Valeur affichée :** État d'avancement par OF par point de contrôle
**Graphique :** Bar Chart horizontal (par chaîne)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| % avancement | G.PRO (SDT) | `GET /api/data/q/etat_avancement` | `avancement_pct` | ✅ Job #29, #30 |

**Notes :** Afficher une barre de progression par OF (`avancement_pct` de 0 à 100%). Les couleurs feu tricolore s'appliquent selon seuils.

---

### F-REQ-305 — Taux d'avancement OF par OF par chaine

**Formule :** `(quantite_realisee / quantite_prevue) × 100`
**Graphique :** Donut Chart (Anneau)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Qté réalisée + prévue | GPRO Consulting (SDT) | `GET /api/data/q/etat_avancement` | `quantite_realisee, quantite_prevue` | ✅ Job #29, #30 |

---

### F-REQ-306 — BPD (Beginning Production Date) par OF par chaine

**Valeur :** Date de début de la commande en cours
**Graphique :** Big Number avec couleur (vert si dans les délais, rouge si dépassé)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Date début | G.PRO Consulting (DIVATEX) | `GET /api/data/ofabrication` | `DtDebut` | ✅ |

---

### F-REQ-307 — EPD (End Production Date) par OF par chaine

**Valeur :** Date de fin prévue de la commande en cours
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Date fin prévue | GPRO Consulting (DIVATEX) | `GET /api/data/ofabrication` | `DtFin` | ✅ |

---

### F-REQ-308 — EHD par OF par chaine

**Valeur :** Date d'export prévue de la commande en cours
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Date export prévue | GPRO Consulting (DIVATEX) | `GET /api/data/ofabrication` | `DtFin` | ✅ |

> ⚠️ **Point de vigilance :** F-REQ-307 (EPD) et F-REQ-308 (EHD) utilisent tous deux le champ `DtFin` selon le document de mapping. Vérifier avec BACOVET si une colonne séparée pour la date d'export doit être ajoutée à la table `ofabrication`.

---

### F-REQ-310 — Couverture chaine

**Formule :** `(Qté engagée - Qté planifiée) / Cadence moyenne`
**Cible :** > 10 jours
**Graphique :** Bar Chart (par chaîne)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité engagée | GPRO Consulting (SDT) | `GET /api/data/q/qte_engagement` | `quantite_engagee` | ✅ Job #40 |
| Quantité planifiée | GPRO Consulting | — | Non mappé | ❌ Absent API v1 et v2 |
| Cadence moyenne | GPRO Consulting | — | Non mappé | ❌ Absent API v1 et v2 |

---

### F-REQ-312 — Objectif par chaine

**Valeur :** Objectif journalier prévu par chaine
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Objectif journalier | GPRO Consulting | — | ❌ Absent API v1 et v2 |

---

## P-03B — Vue Production — Coupe

**Référence :** F-REQ-403 (subset Coupe)
**Route :** `/production/coupe`
**Rafraîchissement :** Instantané — Lecture à distance 5 mètres (NF-REQ-507)

### KPIs présents sur cette vue (selon Annexe 1)

F-REQ-104, F-REQ-201, F-REQ-202, F-REQ-203, F-REQ-204, F-REQ-205, F-REQ-206, F-REQ-207, F-REQ-210, F-REQ-211, F-REQ-212, F-REQ-213, F-REQ-214, F-REQ-215, F-REQ-302, F-REQ-303, F-REQ-304, F-REQ-305, F-REQ-306, F-REQ-307, F-REQ-308, F-REQ-311

F-REQ-201 à F-REQ-209 : voir spécifications complètes dans [P-03A](#p-03a--vue-production--confection) — mêmes endpoints, filtrer par `chaine` = chaines de coupe.

---

### F-REQ-210 — Top opérateurs coupe

**Formule :** `(Quantité produite indiv × Temps d'opération) / Minutes présence déclarées × 100`
**Cible :** ≥ 90%
**Graphique :** Horizontal Bar Chart (classement opérateurs)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité produite individuelle | G.PRO (SDT) | `GET /api/data/q/qte_produite_indiv_jour` | `employe, date, chaine, quantite` | ✅ Job #42 |
| Temps d'opération réel | G.PRO (SDT) | `GET /api/data/q/temps_operation` | `operation, temps_reel_s, ecart_pct` | ✅ Job #34 |
| Minutes présence | G.PRO (SDT) | `GET /api/data/q/minutes_presence` | `employe, minutes_presence` | ✅ Job #32 |

**Structure réponse — qte_produite_indiv_jour :**
```json
{
  "data": [
    { "employe": "EMP0123", "date": "2026-04-20", "chaine": "CH1", "quantite": 412 },
    { "employe": "EMP0456", "date": "2026-04-20", "chaine": "CH1", "quantite": 395 }
  ]
}
```

**Structure réponse — temps_operation :**
```json
{
  "data": [
    { "operation": "OP10", "temps_standard_s": 42, "temps_reel_s": 45.2, "ecart_pct": 7.62 }
  ]
}
```

**Notes d'implémentation :**
- Joindre `qte_produite_indiv_jour` et `temps_operation` via une clé commune (opération/chaine — à confirmer avec Novacity).
- Joindre avec `minutes_presence` via `employe`.
- Calcul par opérateur : `(quantite × temps_reel_s) / minutes_presence × 100`.
- Filtrer sur `date` = aujourd'hui + `chaine` = chaines de coupe.
- Trier décroissant — afficher top N opérateurs.

---

### F-REQ-302 — OF encours ou OFs coupe

**Valeur :** Numéros des OF lancés créés sur G.PRO
**Graphique :** Big Number + liste OF en cours non soldés
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Numéro OF coupe | GPRO Consulting (DIVATEX) | `GET /api/data/ofabrication` | `OFabrication, IDOFabrication, DtDebut, DtFin` | ✅ |

**Notes :** Filtrer `DtFin = null` pour les OF encore en cours. Afficher liste complète (note CDC §3.4).

---

### F-REQ-311 — Couverture Coupe

**Formule :** `(Qté lancée - Qté coupée) / Cadence hebdomadaire moyenne`
**Cible :** > cadence hebdomadaire moyenne
**Graphique :** Big Number avec couleur
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Qté lancée (engagée) | GPRO Consulting (SDT) | `GET /api/data/q/qte_engagement` | `quantite_engagee` | ✅ Job #40 |
| Qté coupée | GPRO Consulting (SDT) | `GET /api/data/q/sortie_coupe` | `quantite_coupee` | ✅ Job #41 |
| Cadence hebdomadaire | DIVA / GPRO Consulting | — | Non mappé | ❌ Absent API |

**Structure réponse — qte_engagement :**
```json
{
  "data": [
    { "commande": "CMD-2026-0101", "of": "OF-2026-0412", "article": "ART-001", "quantite_engagee": 1800 }
  ]
}
```

**Structure réponse — sortie_coupe :**
```json
{
  "data": [
    { "commande": "CMD-2026-0101", "date": "2026-04-18", "quantite_coupee": 1820 }
  ]
}
```

---

## P-03C — Vue Production — Sérigraphie

**Référence :** F-REQ-403 (subset Sérigraphie)
**Route :** `/production/serigraphie`
**Rafraîchissement :** Instantané

### KPIs présents sur cette vue (selon Annexe 1)

F-REQ-102, F-REQ-108, F-REQ-201, F-REQ-202, F-REQ-203, F-REQ-204, F-REQ-205, F-REQ-207, F-REQ-211, F-REQ-212, F-REQ-213, F-REQ-214, F-REQ-215, F-REQ-303, F-REQ-304, F-REQ-305, F-REQ-306, F-REQ-307, F-REQ-308, F-REQ-309

F-REQ-201 à F-REQ-215 : voir spécifications dans [P-03A](#p-03a--vue-production--confection), filtrer par `chaine` = chaines de sérigraphie.

---

### F-REQ-309 — Couverture Sérigraphie

**Formule :** `Quantité entrée sérigraphie (poste 236) - Quantité produite (poste 239)`
**Cible :** > cadence hebdomadaire moyenne
**Graphique :** Bar Chart (par chaîne)
**Fréquence :** Instantané 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Qté entrée sérigraphie 236 | G.PRO (SDT) | `GET /api/data/q/qte_entree_serigraphie` | `date, article, couleur, quantite` | ✅ Job #37 |
| Qté produite 239 | G.PRO (SDT) | `GET /api/data/q/qte_produite` | `date, chaine, shift, quantite` | ✅ Job #36 |

**Structure réponse — qte_entree_serigraphie :**
```json
{
  "data": [
    { "date": "2026-04-20", "article": "ART-001", "couleur": "Blanc", "quantite": 620 }
  ]
}
```

**Calcul :** `Couverture = SUM(qte_entree) - SUM(qte_produite)` filtré sur date récente / période.
**Cible :** cadence hebdomadaire ❌ à configurer manuellement.

---

## P-04 — Vue Méthodes

**Référence :** F-REQ-404 — Série 200 (subset Méthodes)
**Route :** `/methodes`
**Rafraîchissement :** Journalier / Hebdomadaire selon KPI

### KPIs présents (selon Annexe 1)

F-REQ-218 (Taux de respect du temps estimé), F-REQ-219 (Taux des temps acceptés), F-REQ-216 (Taux d'archivage), F-REQ-217 (Taux de fiabilité données système)

---

### F-REQ-216 — Taux d'archivage suivi paquets

**Formule :** `(Nombre OF soldés archivés / Nombre OF soldés) × 100`
**Cible :** 85%
**Graphique :** Gauge Chart (Jauge)
**Fréquence :** Journalière

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nombre OF soldés archivés | Base suivi production | — | ❌ Absent API Novacity |
| Nombre OF soldés total | Base suivi production | — | ❌ Absent API Novacity |

---

### F-REQ-217 — Taux de fiabilité des données système par OF

**Formule :** Écart entre tagging réel et sortie fin chaine (différence absolue ou %)
**Cible :** 95%
**Graphique :** Gauge Chart (Jauge)
**Fréquence :** Journalière 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Tagging réel | GPRO (SDT) | `GET /api/data/q/taging_reel` | `chaine, shift, tag_theorique, tag_reel, ecart_pct` | ✅ Job #28 |
| Sortie fin chaine | Base suivi production (DRIVE) | `GET /api/data/q/wip_chaine` | `sortie_jour` | ✅ Job #27 (proxy) |

**Structure réponse — taging_reel :**
```json
{
  "data": [
    { "chaine": "CH1", "shift": "S1", "tag_theorique": 1500, "tag_reel": 1478, "ecart_pct": -1.47 },
    { "chaine": "CH2", "shift": "S1", "tag_theorique": 1200, "tag_reel": 1205, "ecart_pct": 0.42 }
  ]
}
```

**Calcul :** Comparer `tag_reel` (taging_reel) avec `sortie_jour` (wip_chaine) par chaine. Fiabilité = 100 − |écart en %|.

---

### F-REQ-218 — Taux de respect du temps estimé par ARTICLE

**Formule :** `Temps cotation - Temps prod ≥ 0 minute`
**Cible :** 90%
**Graphique :** Big Number avec couleur
**Fréquence :** Journalière

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Temps production (heures_prod) | Base rendement (SDT) | `GET /api/data/q/efficience_chaine` | `heures_prod` | ✅ Job #31 |
| Temps cotation | Logiciel Cotation (Excel) | — | Non mappé | ❌ Absent API — source Excel |

**Notes :** Le temps cotation doit être intégré via le connecteur Google Sheets (si le fichier Excel est synchronisé).

---

### F-REQ-219 — Taux des temps acceptés dès la première version par ARTICLE

**Formule :** `(Nbr gammes déchiffrage - Nbr demandes de négociation) / Nbr gammes déchiffrage × 100`
**Cible :** ≥ 80%
**Graphique :** Big Number avec couleur
**Fréquence :** Hebdomadaire

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Gammes déchiffrage | Fichier déchiffrage | — | ❌ Absent API — fichier Excel |
| Demandes de négociation | Logiciel Cotation | — | ❌ Absent API — logiciel externe |

---

## P-05 — Vue Logistique & Planning

**Référence :** F-REQ-405 — Série 300
**Route :** `/logistique`
**Rafraîchissement :** Temps réel (sauf journalier pour stock)
**Lecture à distance :** 5 mètres (NF-REQ-507)
**Filtres disponibles :** Marque, Atelier, OF

### Sous-sections de la vue

1. **Indicateurs de livraison** (DOT, HOT, Lead Time)
2. **Suivi stock** (Fiabilité, Rotation, Mort, Occupation)
3. **Suivi OF et flux** (avec renvoi vers P-03A/B/C pour détails)

---

### F-REQ-313 / 314 / 315 — Taux de fiabilité stock (Accessoires / Tissu / FG)

**Formule :** `(Quantité physique / Quantité dans le système) × 100`
**Cible :** > 99.5%
**Graphique :** Jauge Radiale — **Fréquence :** Journalier 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité physique | DIVA (DIVATEX) | `GET /api/data/diva_stock` | `Qtte` | ✅ |
| Quantité système (réservée) | DIVA (DIVATEX) | `GET /api/data/diva_stock` | `qtteReserve` | ✅ |

**Structure réponse :**
```json
{
  "data": [
    { "IDMvtStock": 880012, "IDMP": 1001, "IDMagasin": 1, "Qtte": 500, "qtteReserve": 120 }
  ]
}
```

**Notes :** Filtrer par `IDMagasin` pour distinguer Accessoires / Tissu / FG. La correspondance `IDMagasin` → type de stock doit être documentée par BACOVET. Combiner avec `vue_stock` pour filtrer par `Famille`.

---

### F-REQ-316 / 317 / 318 — Taux de rotation stock (Accessoires / Tissu / FG)

**Formule :** `Coût des marchandises / Stock moyen`
**Graphique :** Jauge Radiale — **Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Stock moyen | DIVA (DIVATEX) | `GET /api/data/q/stock_moyen` | `StockMoyen, NbLignesStock` | ✅ Job #52 |
| Coût des marchandises | DIVA | — | Non mappé | ❌ Absent API v1 et v2 |

**Structure réponse :**
```json
{ "data": [{ "StockMoyen": 38035.07, "NbLignesStock": 4261 }] }
```

---

### F-REQ-319 / 320 / 321 — Taux de stock mort (Accessoires / Tissu / FG)

**Formule :** `(Valeur articles sans mouvement 365j / Valeur totale stock) × 100`
**Graphique :** Big Number avec couleur — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Qté sans mouvement 365j | DIVA (DIVATEX) | `GET /api/data/q/articles_sans_mouvement_durant_365_jours` | `Qtte_SansMvt_365j, NbArticles_SansMvt_365j` | ✅ Job #51 |
| Quantité totale stock | DIVA (DIVATEX) | `GET /api/data/q/quantite_totale_du_stock` | `Quantite_Totale_Stock` | ✅ Job #50 |

**Structure réponse :**
```json
{ "data": [{ "NbArticles_SansMvt_365j": 843, "Qtte_SansMvt_365j": 147329728.72 }] }
{ "data": [{ "Quantite_Totale_Stock": 162067420.25 }] }
```

**Calcul :** `(Qtte_SansMvt_365j / Quantite_Totale_Stock) × 100` = 90.9% environ dans les données actuelles.

---

### F-REQ-322 / 323 / 324 — Taux d'occupation (Accessoires / Tissu / FG)

**Formule :** `(Nombre de rouleaux / Capacité stockage en nombre de colis) × 100`
**Cible :** ≤ 85%
**Graphique :** Gauge Chart — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Nombre de rouleaux | DIVA (DIVATEX) | `GET /api/data/q/nombre_de_rouleaux` | `NbRouleaux` | ✅ Job #48 |
| Capacité totale (conteneurs) | DIVA (DIVATEX) | `GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs` | `Total_Conteneurs, Conteneurs_Actifs` | ✅ Job #49 |

**Structure réponse :**
```json
{ "data": [{ "NbRouleaux": 39031 }] }
{ "data": [{ "Total_Conteneurs": 132228, "Conteneurs_Actifs": "42864", "Conteneurs_Consommes": "88499" }] }
```

**Calcul :** `(39031 / 132228) × 100 ≈ 29.5%` — actuellement dans les limites.

---

### F-REQ-325 / 326 / 327 — Taux de commandes livrées à temps (Accessoires / Tissu / FG)

**Formule :** `(Commandes avec date de transfert coupe / Total commandes livrées) × 100`
**Cible :** ≥ 80%
**Graphique :** Big Number avec couleur — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| OF avec transfert coupe | DIVA (DIVATEX) | `GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel` | `NbOF_Livres_Total, OF_AvecTransfertCoupe_Total, OF_AvecTransfertCoupe, OF_AvecTransfertCoupeJemmel` | ✅ Job #47 |

**Structure réponse :**
```json
{
  "data": [{
    "NbOF_Livres_Total": 4270,
    "OF_AvecTransfertCoupe": 2411,
    "OF_AvecTransfertCoupeJemmel": 805,
    "OF_AvecTransfertCoupe_Total": 3213
  }]
}
```

**Calcul :** `(OF_AvecTransfertCoupe_Total / NbOF_Livres_Total) × 100` = `(3213 / 4270) × 100 ≈ 75.2%` — actuellement **en-dessous de la cible 80%** 🔴.

---

### F-REQ-328 / 329 / 330 — Délai de livraison d'une commande (Accessoires / Tissu / FG)

**Formule :** Moyenne (date de transfert − date de réservation) en jours
**Cible :** 1 jour
**Graphique :** Big Number avec couleur — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Moyenne jours | DIVA (DIVATEX) | `GET /api/data/q/moyenne_date_de_transfert_date_de_reservation` | `MoyenneJours, NbOFConsideres` | ✅ Job #46 |

**Structure réponse :**
```json
{ "data": [{ "MoyenneJours": "4.16", "NbOFConsideres": 6576 }] }
```

> ⚠️ Valeur actuelle : **4.16 jours** — cible = 1 jour → KPI actuellement **ROUGE** 🔴.

---

### F-REQ-331 — STOCK / Typologie

**Formule :** `(Quantité par Typologie / Quantité totale stock) × 100`
**Graphique :** Pie Chart (Secteurs) — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité par Typologie | DIVA (DIVATEX) | `GET /api/data/q/quantite_par_typologie_fournitures` | `Typologie, Quantite, NbArticles` | ✅ Job #43 |
| Quantité totale | DIVA (DIVATEX) | `GET /api/data/q/quantite_totale_du_stock` | `Quantite_Totale_Stock` | ✅ Job #50 |

**Structure réponse (extrait 10 typologies sur 37) :**
```json
{
  "data": [
    { "Typologie": "CORDON", "Quantite": 457758.69, "NbArticles": 93 },
    { "Typologie": "ELASTIQUE", "Quantite": 1313886.88, "NbArticles": 65 },
    { "Typologie": "COQUE", "Quantite": 449071, "NbArticles": 66 }
  ]
}
```

---

### F-REQ-332 — STOCK / Provenance

**Formule :** `(Quantité par Provenance / Quantité totale) × 100`
**Graphique :** Pie Chart — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité par provenance | DIVA (DIVATEX) | `GET /api/data/q/quantite_par_provenance_total` | `Provenance, Quantite, NbArticles` | ✅ Job #45 |

**Structure réponse :**
```json
{
  "data": [
    { "Provenance": "Chine", "Quantite": 38700, "NbArticles": 7 },
    { "Provenance": "France", "Quantite": 112576, "NbArticles": 2 },
    { "Provenance": "NON RENSEIGNE", "Quantite": 161916144.25, "NbArticles": 2114 },
    { "Provenance": null, "Quantite": 162067420.25, "NbArticles": 2123 }
  ]
}
```

**Notes :** Exclure les entrées où `Provenance = null` (ligne total). Utiliser les lignes avec valeur non-nulle pour les parts du Pie.

---

### F-REQ-333 — STOCK / Brand

**Formule :** `(Quantité par famille FG / Quantité totale) × 100`
**Graphique :** Pie Chart — **Fréquence :** Temps réel 🔄

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité par famille FG | DIVA (DIVATEX) | `GET /api/data/q/quantite_par_famille` | `FamilleFG, Quantite` | ✅ Job #44 |

**Familles disponibles :** AUTRE, DOMYOS, KALENJI, KIPSTA, NABAIJI, OLAIAN, QUECHUA, TRIBORD, WEDZE.
**Notes :** Exclure la ligne `FamilleFG = null` (ligne total = 162,067,420.25).

---

### F-REQ-334 — DOT (Delivery On Time)

**Formule :** `(QT livrée on time / QT commandée) × 100`
**Cible :** ≥ 95%
**Graphique :** Line Chart (courbe tendance) — **Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité commandée | GPRO Consulting (SDT) | `GET /api/data/q/qte_engagement` | `quantite_engagee` | ✅ Job #40 |
| Quantité livrée à temps | GPRO Consulting / DRIVE | — | Non mappé | ❌ Absent API v1 et v2 |

---

### F-REQ-335 — HOT (Handover On Time)

**Formule :** `(QT livrée on time / QT commandée) × 100`
**Cible :** ≥ 95%
**Graphique :** Line Chart — **Fréquence :** Temps réel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Quantité commandée | GPRO Consulting | `GET /api/data/q/qte_engagement` → `quantite_engagee` | ✅ |
| Quantité livrée à temps | CPRO CONSU / DRIVE | — | ❌ Absent API v1 et v2 |

---

### F-REQ-336 — Respect Planification

**Formule :** `(Quantité réalisée / Objectif journalier) × 100` par chaine
**Cible :** ≥ 95%
**Graphique :** Line Chart — **Fréquence :** Temps réel

| Champ | Source | Endpoint API | Field JSON | Statut |
|-------|--------|--------------|------------|--------|
| Quantité réalisée | G.PRO (SDT) | `GET /api/data/q/etat_avancement` | `quantite_realisee` | ✅ Job #29, #30 |
| Objectif journalier | G.PRO / DRIVE | — | Non mappé | ❌ Absent API v1 et v2 |

---

### F-REQ-337 — Lead Time Global

**Formule :** `STRH + LT Transport`
**Cible :** 32 jours
**Graphique :** Big Number avec couleur — **Fréquence :** Temps réel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| STRH | DRIVE | — | 🔗 Hors API Novacity |
| LT Transport | Carnet (données fixes par lieu livraison) | — | ❌ Données statiques à intégrer |

**Notes :** LT Transport = donnée fixe par destination. À configurer dans une table de paramètres du dashboard.

---

## P-06 — Vue Développement

**Référence :** F-REQ-406 — Série 350
**Route :** `/developpement`
**Rafraîchissement :** Mensuel (toutes les données de cette vue)
**Source principale :** Google Drive / Google Sheets 🔗

> ⚠️ **L'ensemble de la Série 350 repose exclusivement sur des données issues de Google Drive / Google Sheets, non disponibles dans l'API Novacity v1 et v2.** Un connecteur Google Drive dédié doit être configuré et synchronisé.

---

### F-REQ-350 — RFT Développement (Right First Time)

**Formule :** `(Nb modèles validés 1er coup / Total modèles envoyés) × 100`
**Cible :** ≥ 95%
**Graphique :** Big Number avec couleur — **Fréquence :** Mensuel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nb modèles validés 1er coup | DRIVE | Connecteur Google Sheets | 🔗 Hors API |
| Total modèles envoyés | DRIVE | Connecteur Google Sheets | 🔗 Hors API |

---

### F-REQ-351 — Taux de respect de livraison à date

**Formule :** `(Nb modèles envoyés à date / Total modèles envoyés) × 100`
**Cible :** ≥ 95%
**Graphique :** Gauge Chart (Jauge) — **Fréquence :** Mensuel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nb modèles à date | DRIVE | Connecteur Google Sheets | 🔗 Hors API |
| Total modèles | DRIVE | Connecteur Google Sheets | 🔗 Hors API |

---

### F-REQ-352 — Taux de fiabilité de nomenclature

**Formule :** `(Nb nomenclatures validées et fiables / Total nomenclatures) × 100`
**Cible :** ≥ 98%
**Graphique :** Line Chart mensuel (courbe par mois) — **Fréquence :** Mensuel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nb nomenclatures validées | DRIVE | Connecteur Google Sheets | 🔗 Hors API |
| Total nomenclatures | DRIVE | Connecteur Google Sheets | 🔗 Hors API |

---

### F-REQ-353 — % Réclamations de la production

**Formule :** `(Nb modèles réclamés / Total modèles) × 100`
**Cible :** < 2%
**Graphique :** Scatter Plot (Nuage de points — tendance par mois/article) — **Fréquence :** Mensuel

| Champ | Source | Endpoint | Statut |
|-------|--------|----------|--------|
| Nb modèles réclamés | DRIVE | Connecteur Google Sheets | 🔗 Hors API |
| Total modèles | DRIVE | Connecteur Google Sheets | 🔗 Hors API |

---

## Annexe A — Synthèse des Gaps API (champs non mappés)

Les éléments suivants sont **requis par le CDC mais absents de l'API Novacity v1 et v2**. Ils constituent la backlog technique prioritaire à traiter avec l'équipe Novacity.

| # | KPI concerné | Champ manquant | Source attendue | Priorité |
|---|--------------|----------------|-----------------|----------|
| 1 | F-REQ-101 | Nb rejets inspection commande (annuel) | DIVA | Haute |
| 2 | F-REQ-101 | Nb inspections commande (annuel) | DIVA | Haute |
| 3 | F-REQ-103 | Nb rejets RFID DDA (annuel) | DIVA | Haute |
| 4 | F-REQ-103 | Nb contrôles RFID DDA (annuel) | DIVA | Haute |
| 5 | F-REQ-120/121 | Nb rejets + inspections AQL colis | DIVA/DRIVE | Haute |
| 6 | F-REQ-202/204 | SOT (temps article fournisseur) | GPRO Consulting | Haute |
| 7 | F-REQ-202/204/213 | Effectifs par chaine | GPRO Consulting | Haute |
| 8 | F-REQ-205/309/311 | Cadence hebdomadaire / chaine | DIVA/GPRO | Haute |
| 9 | F-REQ-212 | SOT par chaine | GPRO Consulting | Moyenne |
| 10 | F-REQ-216 | Nb OF soldés archivés | Base suivi production | Moyenne |
| 11 | F-REQ-218 | Temps cotation (par article) | Logiciel Cotation Excel | Moyenne |
| 12 | F-REQ-219 | Nb gammes déchiffrage + nb négociations | Fichier déchiffrage + Cotation | Moyenne |
| 13 | F-REQ-310 | Quantité planifiée par chaine | GPRO Consulting | Haute |
| 14 | F-REQ-312 | Objectif journalier par chaine | GPRO Consulting | Haute |
| 15 | F-REQ-316/317/318 | Coût des marchandises | DIVA | Haute |
| 16 | F-REQ-334/335 | Quantité livrée à temps (DOT/HOT) | GPRO Consulting / DRIVE | Haute |
| 17 | F-REQ-336 | Objectif journalier (Respect Planif) | G.PRO / DRIVE | Haute |
| 18 | F-REQ-337 | STRH + LT Transport | DRIVE + Carnet fixe | Moyenne |
| 19 | F-REQ-350–353 | Toutes données Développement | Google Drive | Haute |

---

## Annexe B — Endpoints API inactifs à activer (critique)

Ces 6 requêtes sont **configurées dans l'API mais marquées "Inactif"**. Elles bloquent les KPIs F-REQ-106 et F-REQ-107.

| Endpoint (slug) | KPI bloqué | Jobs cron associés | Action |
|-----------------|------------|-------------------|--------|
| `rejets_suite_inspection_paquet_jour_en_cours` | F-REQ-106 (numérateur) | #61 | **Activer** |
| `inspections_paquet_jour_en_cours` | F-REQ-106 (dénominateur) | #60 | **Activer** |
| `rejets_suite_inspection_paquet_annee_en_cours` | F-REQ-107 (numérateur) | #55, #57 | **Activer** |
| `inspections_paquet_annee_en_cours` | F-REQ-107 (dénominateur) | #54, #56 | **Activer** |
| `requete_unifiee_dashboard_tout-en-un` | Dashboard unifié (optionnel) | #53 | Optionnel |

---

## Annexe C — Anomalies de données à vérifier

| Anomalie | Endpoint concerné | Description | Impact |
|----------|-------------------|-------------|--------|
| Incohérence logique | `pieces_ok_de_premier_coup_jour_en_cours` vs `pieces_produites_jour_en_cours` | `FirstPassToday` (2947) > `ProducedToday` (80) — impossible physiquement | F-REQ-104 : RFT affiché > 100% en données de test |
| Incohérence logique | `pieces_ok_de_premier_coup_annee_en_cours` vs `pieces_produites_annee_en_cours` | `FirstPassYear` (1,664,359) > `ProducedYear` (882,644) | F-REQ-105 : RFT DDA affiché > 100% |
| EPD = EHD | `ofabrication.DtFin` | F-REQ-307 (EPD) et F-REQ-308 (EHD) mappés sur le même champ | Distinction EPD/EHD impossible sans nouvelle colonne |
| Délai > cible | `moyenne_date_de_transfert_date_de_reservation` | MoyenneJours = 4.16j (cible = 1j) | F-REQ-328/329/330 en rouge dès la mise en production |
| Taux commandes livrées | `nombre_d_ofs_livres_avec_date_de_transfert` | 75.2% (cible ≥ 80%) | F-REQ-325/326/327 en rouge dès la mise en production |

---

## Annexe D — Matrice de confirmation obligatoire avant développement

Les points suivants doivent être **validés avec BACOVET et Novacity** avant le démarrage du développement frontend :

1. **Filtre OpNo pour F-REQ-208/209** : Confirmer si `GET /api/data/q/minutes_produites?opno=221` est supporté ou si une requête SQL dédiée doit être créée.
2. **Distinction EPD/EHD (F-REQ-307/308)** : Confirmer si `DtFin` couvre les deux, ou si une nouvelle colonne `DtExport` doit être ajoutée à `ofabrication`.
3. **Mapping IDMagasin → type de stock** : Fournir la table de correspondance `IDMagasin` ↔ {Accessoires, Tissu, FG} pour F-REQ-313 à F-REQ-324.
4. **Correspondance OpNo pour F-REQ-116** : Confirmer que les postes GPRO pour le Pareto RFT sont bien OP93, OP100 et OP102.
5. **Clé de jointure pour F-REQ-210** : Identifier la clé permettant de joindre `qte_produite_indiv_jour` avec `temps_operation` (via `employe` + `operation` ?).
6. **Activation des endpoints inactifs** : Obtenir confirmation de Novacity pour l'activation des 4 endpoints BR Bundling.
7. **Correction des données test RFT** : Vérifier avec Novacity pourquoi FirstPass > Produced dans les exemples JSON.