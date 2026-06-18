# Manuel Ultime : Dashboard Qualité (Série 100) — UI, UX & Logique

Ce document est le guide de référence absolu pour la page Qualité. Il fusionne les spécifications techniques (backend/data) avec les directives de design (UI) et les comportements utilisateur (UX).

---

## SOMMAIRE
1. [PHILOSOPHIE DESIGN & UX GÉNÉRALE](#ux-generale)
2. [SECTION A : GRID DES KPI (LES 16 CARTES)](#section-a)
3. [SECTION B : MODAL DE DÉTAIL (INTERACTIVITÉ PROFONDE)](#section-b)
4. [SECTION C : VISUALISATIONS DYNAMIQUES (CHARTS)](#section-c)
5. [SECTION D : CLASSEMENT QP (PODIUMS)](#section-d)
6. [SECTION E : SYSTÈME D'ALERTES & FEEDBACK VISUEL](#section-e)
7. [SECTION F : EXPORT & ACTIONS GLOBALES](#section-f)
8. [ARCHITECTURE TECHNIQUE & MAPPING DATA](#architecture)

---

<a name="ux-generale"></a>
## 1. PHILOSOPHIE DESIGN & UX GÉNÉRALE
- **Thème :** Dark Mode industriel, utilisant des bordures subtiles (`border-border`) et des fonds de cartes contrastés (`bg-card`).
- **Typographie :** Utilisation de polices Monospace pour les valeurs numériques (Tabular Numerals) afin d'assurer l'alignement vertical lors du rafraîchissement des données.
- **Responsive :** Grid adaptatif. 4 colonnes sur Desktop, 2 sur Tablette, 1 sur Mobile.
- **Feedback :** Chaque interaction (clic sur carte, onglet) déclenche un changement d'état visuel immédiat.

---

<a name="section-a"></a>
## 2. SECTION A : GRID DES KPI (LES 16 CARTES)

### 2.1. Anatomie d'une Carte KPI (Composant `KpiCard`)
Chaque carte est un conteneur interactif avec les états suivants :
- **Default :** Fond sombre, texte gris clair.
- **Hover :** Ring lumineux (`ring-primary/30`) et léger changement de fond.
- **Loading :** Animation Pulse (Skeleton) masquant les valeurs réelles.
- **Alert :** Animation "Flash" (clignotement doux) pour les statuts Rouge/Orange.

### 2.2. Détail des Champs par Carte (16 instances)
| Zone | Description UI/UX |
| :--- | :--- |
| **Bordure Latérale** | Barre colorée à gauche (4px) reflétant le statut (Vert/Orange/Rouge/Gris). |
| **Label** | Texte en majuscules, espacement large (tracking-wider), font-mono. |
| **Valeur** | Taille XL (2xl), Font-bold, Tabular-nums. Symbole `%` inclus. |
| **Cible** | Petit texte en bas à gauche indiquant le seuil à atteindre. |
| **Sparkline** | Mini-graphique (SVG) en bas de carte montrant la tendance des 7 derniers jours/mois. |
| **Source/Freq** | Label discret en bas à droite indiquant l'origine des données (DIVA, GPRO, DRIVE). |

---

<a name="section-b"></a>
## 3. SECTION B : MODAL DE DÉTAIL (INTERACTIVITÉ PROFONDE)

Le composant `KpiDetailModal` est une fenêtre modale centrée (Overlay 50% noir) offrant une transparence totale sur le calcul.

### 3.1. Header du Modal
- **Badge ID :** Affiche le code exigence (ex: F-REQ-101) sur fond primaire.
- **Titre :** Nom complet de l'indicateur en gras.
- **Actions :** Bouton "Fermer" (X) et bouton d'export contextuel.

### 3.2. Body : Les "Stat Boxes"
Trois grands blocs horizontaux :
1. **Valeur Actuelle :** La donnée brute rafraîchie.
2. **Cible :** Rappel visuel du contrat qualité (ex: ≤ 5%).
3. **Statut :** Badge textuel avec icône (🟢, 🟠, 🔴).

### 3.3. Logic Visualization (La "Boîte à Outils")
- **Formule :** Visualisation style "Calculatrice" : `[Numérateur] ÷ [Dénominateur] × 100`.
- **Source :** Liste technique incluant le nom de la table SQL et l'heure de la dernière synchronisation réussie.
- **Règles d'Alerte :** Rappel écrit des seuils de basculement de couleur.

---

<a name="section-c"></a>
## 4. SECTION C : VISUALISATIONS DYNAMIQUES (CHARTS)

### 4.1. Bar Chart "Taux de Rejet par Étape"
- **Barres :** Coins arrondis (`radius-4`). La couleur de chaque barre est liée au statut de l'étape.
- **Tooltip :** Custom Tooltip affichant la valeur exacte au survol avec un fond flouté (glassmorphism).
- **Reference Line :** Ligne horizontale pointillée (Orange) fixée à 5% pour le benchmark visuel.

### 4.2. Pareto Tabs (Le "Multi-Chart")
Système d'onglets (`Tabs`) pour commuter entre 3 vues sans recharger la page.
- **Composant :** `ComposedChart` mélangeant Barres (valeurs individuelles) et Ligne (pourcentage cumulé).
- **UX :** Axe Y gauche pour les quantités, Axe Y droit (invisible mais calculé) pour le 0-100% du Pareto.

---

<a name="section-d"></a>
## 5. SECTION D : CLASSEMENT QP (PODIUMS)

### 5.1. Composant `QpTeamPodium`
Deux listes côte à côte : "Meilleure Équipe" et "Équipe à Améliorer".
- **Design :** Liste classée (1, 2, 3) avec des badges de score.
- **Score Visualizer :** Affiche le score sur le total maximum (ex: 7/7 ou 4/4).
- **Indicateurs de réussite :** Petites icônes ou textes colorés pour BR GTD, Bundling et RFT.

---

<a name="section-e"></a>
## 6. SECTION E : SYSTÈME D'ALERTES & FEEDBACK VISUEL

### 6.1. Le Panneau d'Alertes
- **Localisation :** Colonne de droite, sous le graphique principal.
- **Comportement :** Liste scrollable des 8 dernières anomalies détectées.
- **UX :** Chaque alerte est cliquable (lien logique vers la carte concernée).
- **Couleurs d'Alerte :** Badge de statut (TrafficBadge) clignotant si l'alerte est de niveau "Rouge".

---

<a name="section-f"></a>
## 7. SECTION F : EXPORT & ACTIONS GLOBALES

### 7.1. Export Excel (XLSX)
- **Global :** Bouton dans le Header de la page exportant tous les KPI de la grille.
- **Contextuel :** Bouton dans le modal exportant uniquement la ventilation (breakdown) de l'indicateur sélectionné.
- **UX :** Génération instantanée côté client via la bibliothèque `xlsx`, téléchargement nommé dynamiquement avec la date.

---

## 8. ARCHITECTURE TECHNIQUE & MAPPING DATA (RÉSUMÉ)

| Composant UI | Source API | Logique Backend (Controller) |
| :--- | :--- | :--- |
| `KpiCard` | `/quality/kpis` | Calcule les ratios via `KpiComputeService`. |
| `BarChart` | `/quality/br-chart` | Formate les 7 étapes de contrôle qualité. |
| `Podiums` | `/quality/qp-teams` | Applique la pondération (5-3-3-1) et le tie-breaker. |
| `Pareto` | `/quality/pareto/*` | Agrège SQL `vw_defects` et tables Drive. |
| `Alerts` | `client-side` | Comparaison en temps réel `value` vs `threshold`. |
