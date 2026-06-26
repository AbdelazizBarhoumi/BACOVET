# 3.2. Groupe : Performance Qualité (Série 100)

---

## F-REQ-101 — BR (Bon Retour) Commande

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Commande |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection commande / Nombre d'inspection commande × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DIVA |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-102 — BR GTD (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR GTD |
| **Description & Règle de Gestion** | Nombre de rejet suite contrôle par chaîne de production / Nombre de contrôle par chaîne de production × 100 (ce jour : jour en cours) |
| **Source & Système** | DIVA (Base de données) / gpro consulting |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-103 — BR GTD DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR GTD DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite contrôle RFID colis / Nombre de contrôle RFID colis annuel × 100 (par chaîne de production, dès le début de l'année jusqu'à présent) |
| **Source & Système** | DIVA (Base de données) |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-104 — RFT (Right First Time) Jour

| Champ | Valeur |
|-------|--------|
| **KPI** | RFT |
| **Description & Règle de Gestion** | Nombre des pièces Ok de premier coup par chaîne de production / Nombre des pièces produites par chaîne de production × 100 (ce jour : jour en cours) |
| **Source & Système** | gpro-prod |
| **Cible** | ≥ 98% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-105 — RFT DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | RFT DDA |
| **Description & Règle de Gestion** | Nombre des pièces Ok de premier coup par chaîne de production / Nombre des pièces produites par chaîne de production × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | gpro-prod |
| **Cible** | ≥ 98% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-106 — BR Bundling (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Bundling |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (ce jour : le jour en cours) |
| **Source & Système** | gpro-prod |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-107 — BR Bundling DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Bundling DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection Paquet / Nombre d'inspection Paquet × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | gpro-prod |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-108 — BR Print (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Print |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (ce jour : le jour en cours) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-109 — BR Print DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Print DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison sérigraphie / Nombre d'inspection livraison sérigraphie × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-110 — BR Care Label (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Care Label |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison vignettes / Nombre d'inspection livraison vignettes × 100 (ce jour : le jour en cours) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-111 — BR Care Label DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Care Label DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison vignettes / Nombre d'inspection livraison vignettes × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-112 — BR Accessoires (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Accessoires |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison accessoires / Nombre d'inspection livraison accessoires × 100 (ce jour : le jour en cours) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-113 — BR Accessoires DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Accessoires DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison accessoires / Nombre d'inspection livraison accessoires × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-114 — BR Compo (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Compo |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison Compo / Nombre d'inspection livraison Compo × 100 (ce jour : le jour en cours) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-115 — BR Compo DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR Compo DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection livraison Compo / Nombre d'inspection livraison Compo × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DRIVE |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

## F-REQ-116 — Pareto Defects (Opérations)

| Champ | Valeur |
|-------|--------|
| **KPI** | Pareto defects |
| **Description & Règle de Gestion** | Pareto defects au niveau opération gpro-prod 93+100+102 (ce jour : jour en cours) |
| **Source & Système** | gpro-prod |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Pareto Chart (Interactif) |

---

## F-REQ-117 — Pareto Defects FG (Finished Goods)

| Champ | Valeur |
|-------|--------|
| **KPI** | Pareto defects FG |
| **Description & Règle de Gestion** | Pareto defects Inspection AQL Colis + Contrôle RFID (ce jour : jour en cours) |
| **Source & Système** | DIVA + DRIVE |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Pareto Chart (Interactif) |

---

## F-REQ-118 — Best QP Team (Top 3)

| Champ | Valeur |
|-------|--------|
| **KPI** | Best QP team |
| **Description & Règle de Gestion** | Top 3 chaînes de production ayant la meilleure performance qualité ((0/1) BR × 5 + (0/1) BR IN × 3 + (0/1) BR GTD × 3 + (0/1) RFT × 1) |
| **Source & Système** | DIVA + DRIVE |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Podium ou Top 3 List |

---

## F-REQ-119 — Low QP Team (Bottom 3)

| Champ | Valeur |
|-------|--------|
| **KPI** | Low QP team |
| **Description & Règle de Gestion** | Les 3 chaînes de production ayant une performance à suivre et à améliorer ((0/1) BR × 5 + (0/1) BR IN × 3 + (0/1) BR GTD × 3 + (0/1) RFT × 1) |
| **Source & Système** | DIVA + DRIVE |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Podium ou Top 3 List |

---

## F-REQ-120 — BR IN (Jour)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR IN |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection colis / Nombre d'inspection colis × 100 (ce jour : jour en cours) |
| **Source & Système** | DIVA |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-121 — BR IN DDA (Depuis Début Année)

| Champ | Valeur |
|-------|--------|
| **KPI** | BR IN DDA |
| **Description & Règle de Gestion** | Nombre de rejet suite inspection AQL colis / Nombre d'inspection AQL colis × 100 (dès le début de l'année jusqu'à présent) |
| **Source & Système** | DIVA |
| **Cible** | ≤ 5% |
| **Fréquence d'actualisation** | 4 fois par jour |
| **Type de graphique** | Line Chart (Courbe) + Big Number avec couleur |

---

&gt; **Légende :**
&gt; - **BR** = Bon Retour (Taux de rejet)
&gt; - **RFT** = Right First Time (Taux de réussite au premier coup)
&gt; - **GTD** = ?
&gt; - **DDA** = Depuis Début d'Année
&gt; - **FG** = Finished Goods (Produits finis)
&gt; - **QP** = Qualité Performance
&gt; - **IN** = Inspection
&gt; - **AQL** = Acceptable Quality Level
&gt; - **RFID** = Radio Frequency Identification