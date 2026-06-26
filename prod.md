# 3.3. Groupe : Performance de Production & Flux (Série 200)

---

## F-REQ-201 — Efficience par Opérateur par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Efficience par OPERATEUR par chaine |
| **Description & Règle de Gestion** | (Minutes produites / minutes présence) × 100 |
| **Source & Système** | G.PRO |
| **Cible** | ≥ 90% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Combo Bar/Line |

---

## F-REQ-202 — Efficience par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Efficience PAR CHAINE |
| **Description & Règle de Gestion** | [(Quantité déclaré par chaine × SOT) / (Effectif de la chaine × minutes présence)] × 100 |
| **Source & Système** | G.PRO + GPRO consulting |
| **Cible** | > 85% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Gauge Chart (Jauge) / par période |

---

## F-REQ-203 — Efficience Cumulée Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Efficience Cumulée chaine |
| **Description & Règle de Gestion** | (Somme des minutes produites pour le mois en cours / Somme des minutes présence pour le mois en cours) × 100 |
| **Source & Système** | G.PRO + GPRO consulting |
| **Cible** | > 85% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Line Chart (Courbe) |

---

## F-REQ-204 — OWE par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | OWE par chaine |
| **Description & Règle de Gestion** | [(Quantité déclaré par chaine × SAM) / (Effectif de la chaine × minutes présence)] × 100 |
| **Source & Système** | G.PRO + GPRO consulting |
| **Cible** | > 70% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-205 — WIP par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | WIP par chaine |
| **Description & Règle de Gestion** | (Quantité engagement par chaine) − (Quantité Sortie par chaine poste 93) |
| **Source & Système** | G.PRO |
| **Cible** | ≤ 1/2 cadence |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-206 — WIP Optimal

| Champ | Valeur |
|-------|--------|
| **KPI** | WIP OPTIMAL |
| **Description & Règle de Gestion** | Quantité engagement (par chaine par article par OF) − Quantité Sortie coupe |
| **Source & Système** | G.PRO |
| **Cible** | ≥ 1,5 × cadence chaine |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Area Chart (Graph. aires) |

---

## F-REQ-207 — Arrêts Non Planifiés par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Arrêts non planifiés par chaine |
| **Description & Règle de Gestion** | Lost time |
| **Source & Système** | G.PRO |
| **Cible** | < 10 minutes |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Chronologie (Timeline) / par période + liste de motifs pour tout arrêt non planifié |

---

## F-REQ-208 — Efficience Départage par Opératrice

| Champ | Valeur |
|-------|--------|
| **KPI** | Efficience Départage PAR OPERATRICE |
| **Description & Règle de Gestion** | (Minutes produites poste 221 / Minutes présence) × 100 |
| **Source & Système** | G.PRO |
| **Cible** | > 85% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Combo Bar/Line / par période |

---

## F-REQ-209 — Efficience Vignettes par Opératrice

| Champ | Valeur |
|-------|--------|
| **KPI** | Efficience Vignettes PAR OPERATRICE |
| **Description & Règle de Gestion** | (Minutes produites poste 213 / Minutes présence) × 100 |
| **Source & Système** | G.PRO |
| **Cible** | > 85% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Combo Bar/Line / par période |

---

## F-REQ-210 — Top Opérateurs Coupe

| Champ | Valeur |
|-------|--------|
| **KPI** | Top opérateurs coupe |
| **Description & Règle de Gestion** | [(Quantité produite indiv × temps d'opération) / minute présence déclaré)] × 100 |
| **Source & Système** | G.PRO |
| **Cible** | ≥ 90% |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Horizontal Bar Chart |

---

## F-REQ-211 — SAM (Temps Standard Alloué) par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | SAM (Temps standard alloué) par chaine |
| **Description & Règle de Gestion** | Temps standard alloué |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-212 — SOT (Temps Article Fournisseur) par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | SOT (Temps article fournisseur) par chaine |
| **Description & Règle de Gestion** | Le temps d'article de fournisseur |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-213 — Effectifs par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Effectifs par chaine |
| **Description & Règle de Gestion** | Nombre d'opérateurs exigé |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-214 — Code Article par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Code article par chaine |
| **Description & Règle de Gestion** | Code conception de l'article |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-215 — Désignation d'Article par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Designation d'article par chaine |
| **Description & Règle de Gestion** | Description |
| **Source & Système** | GPRO consulting |
| **Cible** | — |
| **Fréquence d'actualisation** | Instantané |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-216 — Taux d'Archivage Suivi Paquets par Chaîne

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux d'archivage suivi paquets par chaine |
| **Description & Règle de Gestion** | (Nbre des OF soldés archivés / nbr des Ofs soldés) × 100 |
| **Source & Système** | Base suivi production |
| **Cible** | 85% |
| **Fréquence d'actualisation** | Journalière |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-217 — Taux de Fiabilité des Données sur Système par OF

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de fiabilité des donnés sur système par OF |
| **Description & Règle de Gestion** | Différence entre tagging réel et sortie fin chaine |
| **Source & Système** | GPRO |
| **Cible** | 95% |
| **Fréquence d'actualisation** | Journalière |
| **Type de graphique** | Gauge Chart (Jauge) |

---

## F-REQ-218 — Taux de Respect du Temps Estimé par Article

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux de respect du temps estimé par ARTICLE |
| **Description & Règle de Gestion** | Temps cotation − Temps prod = / > 0 minute |
| **Source & Système** | Base rendement + Logiciel Cotation |
| **Cible** | 90% |
| **Fréquence d'actualisation** | Journalière |
| **Type de graphique** | Big Number avec couleur |

---

## F-REQ-219 — Taux des Temps Acceptés dès la Première Version par Article

| Champ | Valeur |
|-------|--------|
| **KPI** | Taux des temps acceptés dès la première version par ARTICLE |
| **Description & Règle de Gestion** | (Nbr des demandes de négociation − Nbr des gammes déchiffrage) × 100 |
| **Source & Système** | Fichier déchiffrage + logiciel cotation |
| **Cible** | ≥ 80% |
| **Fréquence d'actualisation** | Hebdomadaire |
| **Type de graphique** | Big Number avec couleur |

---

> **Légende :**
> - **SAM** = Standard Allowed Minute (Temps standard alloué)
> - **SOT** = Supplier Operation Time (Temps article fournisseur)
> - **OWE** = Overall Work Efficiency
> - **WIP** = Work In Progress
> - **OF** = Ordre de Fabrication
> - **DDA** = Depuis Début d'Année
> - **GTD** = ?
> - **RFID** = Radio Frequency Identification
