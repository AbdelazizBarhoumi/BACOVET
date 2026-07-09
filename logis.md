# 3.4. Groupe : Logistique, Planning (Série 300)

---

## F-REQ-301 — OF ou OFs Confection par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | OF ou OFs confection par CHAINE |
| **Description & Règle de Gestion** | Numéro Ordre de Fabrication en cours production |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur + Liste de OF en cours non soldés |

---

## F-REQ-302 — OF en Cours ou OFs Coupe

| Champ | Valeur |
|-------|--------|
| **KPI** | OF encours ou OFs coupe |
| **Description & Règle de Gestion** | Numéro Ordre de Fabrication lancés créé sur G.PRO |
| **Source & Système** | GPRO CONSULTING |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur + Liste de OF en cours non soldés |

---

## F-REQ-303 — Quantité OF ou OFs par Article

| Champ | Valeur |
|-------|--------|
| **KPI** | Quantité OF ou OFs par ARTICLE |
| **Description & Règle de Gestion** | Quantité OF ou OFs |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur + Liste de OF en cours non soldés |

---

## F-REQ-304 — SO Progress par OF

| Champ | Valeur |
|-------|--------|
| **KPI** | SO Progress par OF |
| **Description & Règle de Gestion** | L'état d'avancement des commandes par point de contrôle |
| **Source & Système** | G.PRO |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Bar Chart (par chaîne) |

---

## F-REQ-305 — Taux d'Avancement OF par OF par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux d'avancement OF par OF par chaine |
| **Description & Règle de Gestion** | (Quantité produite déclaré / Quantité OF) × 100 |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Donut Chart (Anneau) |

---

## F-REQ-306 — BPD (Beginning Production Date) par OF par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | BPD (Beginning Production Date) par OF par chaine |
| **Description & Règle de Gestion** | Date de début de la commande en cours |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-307 — EPD (End Production Date) par OF par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | EPD (End Production Date) par OF par chaine |
| **Description & Règle de Gestion** | Date de fin prévue de la commande en cours en fonction de la quantité réalisée et la cadence allouée |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-308 — EHD par OF par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | EHD par OF par chaine |
| **Description & Règle de Gestion** | La date d'export prévue de la commande en cours |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-309 — Couverture Sérigraphie

| Champ | Valeur |
|-------|--------|
| **KPI** | COUVERTURE Sérigraphie |
| **Description & Règle de Gestion** | Quantité entrée sérigraphie 236 − quantité produite 239 |
| **Source & Système** | G.PRO |
| **Cible** | > cadence hebdomadaire moyenne |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Bar Chart (par chaîne) |

---

## F-REQ-310 — Couverture Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Couverture chaine |
| **Description & Règle de Gestion** | (Qté engagé − Qté planifié) / cadence moyenne |
| **Source & Système** | GPRO consulting |
| **Cible** | > 10 jours |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Bar Chart (par chaîne) |

---

## F-REQ-311 — Couverture Coupe

| Champ | Valeur |
|-------|--------|
| **KPI** | Couverture Coupe |
| **Description & Règle de Gestion** | (Qté lancé − Qté coupé) / cadence hebdomadaire moyenne |
| **Source & Système** | DIVA / GPRO consulting |
| **Cible** | > cadence hebdomadaire moyenne |
| **Fréquence d'actualisation** | — |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-312 — Objectif par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Objectif par chaine |
| **Description & Règle de Gestion** | Objectif prévu journalier |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-313 — Taux de Fiabilité Stock Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de fiabilité stock accessoires |
| **Description & Règle de Gestion** | (Quantité physique / Quantité dans le système) × 100 |
| **Source & Système** | DIVA / DRIVE |
| **Cible** | > 99,5% |
| **Fréquence d'actualisation** | Journalier |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-314 — Taux de Fiabilité Stock Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de fiabilité stock tissu |
| **Description & Règle de Gestion** | (Quantité physique / Quantité dans le système) × 100 |
| **Source & Système** | DIVA / DRIVE |
| **Cible** | > 99,5% |
| **Fréquence d'actualisation** | Journalier |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-315 — Taux de Fiabilité Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de fiabilité stock FG |
| **Description & Règle de Gestion** | (Quantité physique / Quantité dans le système) × 100 |
| **Source & Système** | DRIVE / DIVA |
| **Cible** | > 99,5% |
| **Fréquence d'actualisation** | Journalier |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-316 — Taux de Rotation Stock Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de rotation stock accessoires |
| **Description & Règle de Gestion** | Coût des marchandises / Stock moyen |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-317 — Taux de Rotation Stock Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de rotation stock tissu |
| **Description & Règle de Gestion** | Coût des marchandises / Stock moyen |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-318 — Taux de Rotation Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de rotation stock FG |
| **Description & Règle de Gestion** | Coût des marchandises / Stock moyen |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Jauge Radiale |

---

## F-REQ-319 — Taux de Stock Mort Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de stock mort accessoires |
| **Description & Règle de Gestion** | (Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-320 — Taux de Stock Mort Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de stock mort tissu |
| **Description & Règle de Gestion** | (Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-321 — Taux de Stock Mort Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de stock mort stock FG |
| **Description & Règle de Gestion** | (Valeur des articles sans mouvement durant 365 / la valeur total du stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-322 — Taux d'Occupation Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux d'occupation Accessoires |
| **Description & Règle de Gestion** | (Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100 |
| **Source & Système** | DIVA |
| **Cible** | ≤ 85% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-323 — Taux d'Occupation Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux d'occupation tissu |
| **Description & Règle de Gestion** | (Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100 |
| **Source & Système** | DIVA |
| **Cible** | ≤ 85% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-324 — Taux d'Occupation Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux d'occupation stock FG |
| **Description & Règle de Gestion** | (Nombre de rouleaux / Capacité de stockage en nombre des Colis) × 100 |
| **Source & Système** | DIVA |
| **Cible** | ≤ 85% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-325 — Taux de Commandes Livrées à Temps Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de commandes livrées à temps Accessoires |
| **Description & Règle de Gestion** | Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel) |
| **Source & Système** | DIVA |
| **Cible** | ≥ 80% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-326 — Taux de Commandes Livrées à Temps Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de commandes livrées à temps tissu |
| **Description & Règle de Gestion** | Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel) |
| **Source & Système** | DIVA |
| **Cible** | ≥ 80% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-327 — Taux de Commandes Livrées à Temps Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de commandes livrées à temps stock FG |
| **Description & Règle de Gestion** | Nombre de commandes livrée dont la date de transfert (transfert coupe + transfert coupe Jemmel) |
| **Source & Système** | DIVA |
| **Cible** | ≥ 80% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-328 — Délai de Livraison d'une Commande Accessoires

| Champ | Valeur |
|-------|--------|
| **KPI** | Délai de livraison d'une commande Accessoires |
| **Description & Règle de Gestion** | Moyen (date de transfert − date de réservation) |
| **Source & Système** | DIVA |
| **Cible** | 1 jour |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-329 — Délai de Livraison d'une Commande Tissu

| Champ | Valeur |
|-------|--------|
| **KPI** | Délai de livraison d'une commande tissu |
| **Description & Règle de Gestion** | Moyen (date de transfert − date de réservation) |
| **Source & Système** | DIVA |
| **Cible** | 1 jour |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-330 — Délai de Livraison d'une Commande Stock FG

| Champ | Valeur |
|-------|--------|
| **KPI** | Délai de livraison d'une commande stock FG |
| **Description & Règle de Gestion** | Moyen (date de transfert − date de réservation) |
| **Source & Système** | DIVA |
| **Cible** | 1 jour |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-331 — Stock / Typologie

| Champ | Valeur |
|-------|--------|
| **KPI** | STOCK/Typologie |
| **Description & Règle de Gestion** | (Valeur par Typologie fournitures / Valeur total de stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Pie Chart (Secteurs) |

---

## F-REQ-332 — Stock / Provenance

| Champ | Valeur |
|-------|--------|
| **KPI** | STOCK/provenance |
| **Description & Règle de Gestion** | (Valeur par provenance / Valeur total Stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Pie Chart (Secteurs) |

---

## F-REQ-333 — Stock / Brand

| Champ | Valeur |
|-------|--------|
| **KPI** | STOCK/Brand |
| **Description & Règle de Gestion** | (Valeur Par famille FG (ex : NABAIJI ; DOMYOS ; …) / Valeur Total Stock) × 100 |
| **Source & Système** | DIVA |
| **Cible** | — |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Pie Chart (Secteurs) |

---

## F-REQ-334 — DOT (Delivery On Time)

| Champ | Valeur |
|-------|--------|
| **KPI** | DOT (Delivery) |
| **Description & Règle de Gestion** | (QT livrée on time / ordered QT) × 100 |
| **Source & Système** | gpro-planning / carnet |
| **Cible** | ≥ 95% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) |

---

## F-REQ-335 — HOT (Handover On Time)

| Champ | Valeur |
|-------|--------|
| **KPI** | HOT (Handover) |
| **Description & Règle de Gestion** | (QT livrée on time / ordered QT) × 100 |
| **Source & Système** | gpro-planning / carnet |
| **Cible** | ≥ 95% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) |

---

## F-REQ-336 — Respect Planification

| Champ | Valeur |
|-------|--------|
| **KPI** | Respect Planif. |
| **Description & Règle de Gestion** | (qte réaliser / objectif journalier) par chaine de montage |
| **Source & Système** | gpro-planning / carnet |
| **Cible** | ≥ 95% |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Line Chart (Courbe) |

---

## F-REQ-337 — Lead Time Global

| Champ | Valeur |
|-------|--------|
| **KPI** | Lead Time Global |
| **Description & Règle de Gestion** | STRH + LT TRANSPORT |
| **Source & Système** | gpro-planning / carnet |
| **Cible** | 32 jours |
| **Fréquence d'actualisation** | Temps réel |
| **Type de graphique** | Big Number avec couleur |

---

> **Légende :**
> - **OF** = Ordre de Fabrication
> - **BPD** = Beginning Production Date (Date de début de production)
> - **EPD** = End Production Date (Date de fin de production prévue)
> - **EHD** = Expected Handover Date (Date d'export prévue)
> - **SO** = Sales Order (Commande client)
> - **FG** = Finished Goods (Produits finis)
> - **DOT** = Delivery On Time
> - **HOT** = Handover On Time
> - **STRH** = ?
> - **LT** = Lead Time
> - **WIP** = Work In Progress
> - **SAM** = Standard Allowed Minute
> - **SOT** = Supplier Operation Time
