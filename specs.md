CONFIDENTIAL 
Cahier des Charges : Solution 
Dashboard de Pilotage 
Opérationnel – BACOVET 
Description 
Version 
Date 
Création du document 1.0 
Modifiée par 
10/02/2026 
Validée par 
Bouhlel 
Mahmoud 
Modification selon 
Teamplate-ON
16022026 
2.0 
16/02/2026 
Bouhlel 
Mahmoud 
Bouhlel 
Mahmoud 
Last Version 
2.1 
27/02/2026 
Bouhlel 
Mahmoud 
Validated version 
Ben Hadjmbarek 
Nourhane 
2.2 
05/03/2026 
Bouhlel 
Mahmoud 
Ben Hadjmbarek 
Nourhane 
Bouhlel 
Mahmoud 
1 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
Glossaire Technique et Métier 
OF : Ordre de Fabrication. 
BR: Blocking Rate (Taux de Rejet) 
RFT: Right First Time 
STRH: Standard Time per Standard Hour 
GPRO : Système de suivi de production en place. 
DIVA: Système ERP  
KPI: Key Performance Indicator 
STRH: Standard Time per Standard Hour 
GTD: General Terme Delivery  
AQL: Acceptable Quality Level 
DOT: Delivery On Time 
HOT: Handover On Time 
LT: Lead Time (LT)  
RBAC: Role-Based Access Control 
API (Middleware): Application Programming Interface 
2 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
3 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
 
1. Introduction et Contexte 
Ce projet, vise à doter BACOVET d'un outil de pilotage en temps réel pour remédier 
au manque de visibilité sur la production confection, coupe, qualité et la logistique. 
2. Parties Prenantes et Utilisateurs 
Profil Rôle Fonctionnel Droits d'accès 
Direction Pilotage stratégique Lecture (KPI consolidés) 
Responsable 
Production 
Supervision globale Lecture (Tous KPI ateliers) 
Chef d'atelier Pilotage terrain Lecture (Avancement OF, 
Efficience, Prod) 
Responsable 
Qualité 
Suivi conformité Lecture (Tous KPI qualité) 
IT / Administrateur Gestion système Lecture/Écriture (Config, 
Users) 
Méthodes / 
Planning 
Optimisation Lecture (Efficience, Qualité, 
Respect Planif) 
Coupe  Pilotage/Supervision/Analyse Lecture (Tous) 
 
2. Définition du Scope (Périmètre du Projet) 
Le projet de Dashboard BACOVET couvre l'ensemble de la chaîne de valeur, de 
l'achat des matières premières jusqu'à l'exportation des produits finis, en passant par 
le développement et la production. 
2.1. Périmètre Opérationnel (Zones et Ateliers) 
La solution sera déployée et segmentée selon les zones géographiques et 
opérationnelles suivantes : 
• Atelier Confection  
• Atelier Coupe 
• Atelier Sérigraphie  
2.2. Périmètre Fonctionnel (Processus Métiers) 
Le système doit couvrir les processus critiques identifiés dans la cartographie : 
• Pilotage de la Performance : Suivi en temps réel de l'avancement des 
Ordres de Fabrication (OF), du rendement des lignes et de l'efficience. 
• Maîtrise de la Qualité : Monitoring des taux de rejet à chaque étape. 
CONFIDENTIAL 
• Optimisation Logistique : Visibilité sur l’affectation instantanée, les ruptures 
d'accessoires et le respect des dates de livraison. 
• Aide à la Décision : Mise en place d'alertes visuelles en cas de dérive par 
rapport aux objectifs cibles. 
2.3. Périmètre Technique (Sources de Données) 
Le Dashboard agira comme une couche de visualisation unifiée (Single Source of 
Truth) consolidant les données issues de : 
• Systèmes ERP & Production : DIVA (Qualité/prod/stock) et GPRO
Prod/Planning (Efficience, Production), GPRO consulting. 
• Outils Collaboratifs : Google Drive / Google Sheets (Inspections, Suivi 
spécifique). 
2.4. Hors Scope (Exclusions) 
Sauf mention contraire ultérieure, les éléments suivants ne font pas partie du 
périmètre initial : 
• La saisie directe des données de production dans le dashboard n’est pas 
possible (le dashboard est un outil de consultation, pas de saisie). 
3. Spécifications Détaillées des Exigences 
Fonctionnelles (F-REQ) 
Ces exigences décrivent les fonctions que le système doit exécuter. 
3.1. Architecture de Données et Sources (F-REQ-DAT) 
• F-REQ- DAT -001 : Connectivité Multi-sources. Le système doit extraire 
automatiquement ou semi-automatiquement les données des systèmes suivants : 
o ERP DIVA. 
o GPRO-Prod / Planning. 
o Google Drive / Sheets. 
o GPRO Consulting  
• F-REQ- DAT-002 : Pour garantir la fiabilité des KPI et pallier l'hétérogénéité des 
sources, la solution reposera sur une couche d'intégration (Middleware API). 
• Rôle de l'API : Elle servira de connecteur universel pour extraire, transformer et 
charger (ETL) les variables issues des fichiers Excel et Google Sheets vers une 
base de données centrale. 
• Consolidation : L'API agrégera ces données avec celles issues de l'ERP DIVA et 
de GPRO pour permettre un calcul unifié des KPI. 
4 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
5 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
 
 
 
# Variable  KPI Système source 
1 Nombre de rejet suite contrôle colis au 
niveau Contrôle RFID DDA 
BR GTD DDA DIVA 
2 Nombre de contrôle RFID colis DDA BR GTD DDA DIVA 
3 Nombre de rejet suite contrôle RFID 
colis (ce jour : jour en cours) 
BR GTD DIVA 
4 Nombre de contrôle RFID colis (ce jour : 
jour en cours) 
BR GTD DIVA 
5 Nombre des pièces Ok de premier coup RFT (Prod) G.PRO 
6 Nombre des pièces produites  RFT(Prod) G.PRO 
7 Nombre de rejet suite inspection Paquet 
(ce jour : jour en cours) 
BR Bundling G.PRO 
8 Nombre d'inspection Paquet (ce jour : 
jour en cours) 
BR Bundling G.PRO 
9 Nombre de rejets suite inspection 
livraison sérigraphie (ce jour : jour en 
cours) 
BR Print Drive 
10 Nombre d'inspections sérigraphie (ce 
jour : jour en cours) 
BR Print Drive 
11 Nombre de rejet suite inspection 
livraison sérigraphie annuel 
BR Print DDA Drive 
12 Nombre d'inspection livraison 
sérigraphie annuel 
BR Print DDA Drive 
13 Nombre d'inspection commande annuel BR  DRIVE 
14 Nombre de rejet suite inspection 
commande annuel 
BR DRIVE 
15 Nombre des pièces Ok de premier coup 
annuel 
RFT DDA G.PRO 
16 Nombre des pièces produites annuel RFT DDA G.PRO 
17 Nombre de rejet suite inspection Paquet 
Annuel 
BR Bundling DDA G.PRO 
18 Nombre d'inspection Paquet annuel BR Bundling DDA G.PRO 
19 Nombre de rejet suite inspection 
livraison vignettes (ce jour : jour en 
cours) 
BR Care Label DRIVE 
20 Nombre d'inspection livraison vignettes 
(ce jour : jour en cours) 
BR Care Label DRIVE 
21 Nombre de rejet suite inspection 
livraison vignettes annuel 
BR Care Label DDA DRIVE 
22 Nombre d'inspection livraison vignettes 
annuel 
BR Care Label DDA DRIVE 
23 Nombre de rejet suite inspection 
livraison accessoires (ce jour : jour en 
cours) 
BR Accessoires DRIVE 
24 Nombre d'inspection livraison 
accessoires (ce jour : jour en cours) 
BR Accessoires DRIVE 
25 Nombre de rejet suite inspection 
livraison accessoires annuel 
BR Accessoires DDA DRIVE 
26 Nombre d'inspection livraison 
accessoires annuel 
BR Accessoires DDA DRIVE 
CONFIDENTIAL 
6 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
27 Nombre de rejet suite inspection 
livraison Compo 
BR Compo DRIVE 
28 Nombre d'inspection livraison Compo BR Compo DRIVE 
29 Nombre de rejet suite inspection 
livraison Compo annuel 
BR Compo DDA DRIVE 
30 Nombre d'inspection livraison Compo 
annuel 
BR Compo DDA DRIVE 
31 Nombre des OF soldés archivés Taux d’archivage suivi paquets Base suivi 
production 
32 Ofs soldés Taux d’archivage suivi paquets Base suivi 
production 
33 Nombre d’opérateurs exigé Effectifs GPRO consulting 
34 Quantité OF ou OFs Quantité OF ou OFs GPRO consulting 
35 Quantité produite déclaré par OF 
encours production 
Taux d'avancement OF GPRO consulting 
36 Quantité OF Taux d'avancement OF GPRO consulting 
37 Quantité déclaré par chaine Efficience PAR CHAINE G.PRO + GPRO 
consulting 
38 Quantité déclaré par chaine OWE PAR CHAINE  G.PRO + GPRO 
consulting 
39 Quantité produite indiv Top opérateurs G.PRO 
40 Qté engagé Couverture chaine GPRO consulting 
41 Qté planifié Couverture chaine GPRO consulting 
42 Quantité Sortie coupe WIP OPTIMAL G.PRO 
43 Quantité engagement WIP OPTIMAL G.PRO 
44 Quantité Sortie sérigraphie 241 WIP OPTIMAL G.PRO 
45 Quantité départage (par chaine par 
article par OF) 
WIP OPTIMAL G.PRO 
46 Quantité entré sérigraphie 236 Couverture sérigraphie  G.PRO 
47 Quantité produite 239 Couverture sérigraphie G.PRO 
48 Numéro Ordre de Fabrication encours 
production 
 OF ou OFs confection GPRO consulting 
49 Numéro Ordre de Fabrication lancés 
crée sur G.PRO 
OF encours ou OFs coupe G.PRO consulting 
50 Date de début de la commande encours BPD (Begening Production Date 
par OF par chaine 
GPRO consulting 
51 Date de fin prévue de la commande 
encours en fonction de la quantité 
réalisée et la cadence allouée 
EPD (End Production Date) par 
OF par chaine 
GPRO consulting 
52 La date d’export prévue de la 
commande encours 
EHD par OF par chaine GPRO consulting 
53 Le temps d’article de fournisseur SOT GPRO consulting 
54 Temps standard alloué SAM GPRO consulting 
55 Temps d’opération Top opérateurs G.PRO 
56 Minutes présence Efficience Cumulé   G.PRO + GPRO 
consulting 
57 Minutes présence  OWE PAR CHAINE  GPRO consulting 
CONFIDENTIAL 
7 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
58 Minutes présence Efficience Cumulé CHAINE  GPRO consulting 
59 Minutes produites  Efficience Cumulé CHAINE  G.PRO 
60 Minutes présence déclaé Top opérateurs  G.PRO 
61 Minutes produites   Efficience Cumulée CHAINE G.PRO 
62 Minutes produites poste 221 Efficience Départage PAR 
OPERATRICE 
G.PRO 
63 Minutes produites poste 213 Efficience Vignettes PAR 
OPERATRICE 
G.PRO 
64 Objectif prévu journalier Objectif par ARTICLE GPRO consulting 
65 Minutes présence Efficience par OPERATEUR G.PRO 
66 Minutes présence Efficience Départage PAR 
OPERATRICE 
G.PRO 
67 Minutes présence Efficience Vignettes PAR 
OPERATRICE 
G.PRO 
68 Lost time Arrêt non planifiés G.PRO 
69 L’état d’avancement des commandes 
par point de contrôle 
SO Progress PAR OF  G.PRO 
70 Description Désignation d'article GPRO consulting 
71 Cadence hebdomadaire moyenne Couverture coupe  DIVA / GPRO 
consulting 
72 Cadence moyenne Couverture chaine  GPRO consulting 
73 Code conception de l'article Code article GPRO consulting 
74 Pareto defects RFT (ce jour : jour en 
cours) 
Pareto defects RFT G.PRO 
75 Pareto defects Inspection Colis (ce jour 
: jour en cours) 
Pareto defects Inspection Colis 
(BR IN + BR CGL) 
DIVA +DRIVE 
76 Top 3 chaine de production ayant la 
mellieure performance qualité 
Best QP DIVA+DRIVE+ 
G.PRO 
77 Les 3 chaines de production ayant une 
performance à suivre et à améliorer 
Bad QP DIVA+DRIVE+ 
G.PRO 
78 Tagging réel Taux de fiabilité des donnés sur 
système par OF 
GPRO 
79 Sortie fin chaine Taux de fiabilité des donnés sur 
système par OF 
Base suivi 
production 
80 Temps cotation Taux de respect du temps estimé 
par ARTICLE 
Logiciel Cotation 
(Excel) 
81 Temps production Taux de respect du temps estimé 
par ARTICLE 
Base rendement  
82 Gammes déchiffrage Taux des temps acceptés dès la 
première version par ARTICLE 
Fichier déchiffrage 
83 Gammes déchiffrage Taux des temps acceptés dès la 
première version par ARTICLE 
Logiciel cotation 
84 Quantité livrée à temps DOT Cape / drive 
85 Quantité commandée (ordered QT) DOT GPRO consulting 
86 Quantité livrée à temps HOT Cape / drive 
87 Quantité commandée HOT GPRO consulting 
88 Quantité réalisée Taux de respect planification G.PRO 
89 Objectif journalier Taux de respect planification G.PRO / drive  
90 STRH Lead time total Drive 
91 LT Transport Lead time total Carnet -data fixe - 
(lieux de liv) 
CONFIDENTIAL 
8 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
92 Nombre des modèles validé de 1er coup RFT (RIGHT FIRST TIME) Drive 
93 Totale des modèles envoyés 
 
RFT (RIGHT FIRST TIME) Drive 
94 Nombre des modèles envoyés 
 
Taux de respect de livraison a 
date 
Drive 
95 Totales des modèles envoyés 
 
Taux de respect de livraison a 
date 
Drive 
96 Nombre des nomenclature validé et 
fiable 
Taux de fiabilité de nomenclature Drive 
97 Totale  Taux de fiabilité de nomenclature Drive 
98 Nombre des modelés réclamés %réclamations de la production Drive 
99 Totales des modèles  %réclamations de la production Drive 
100 Quantité physique Taux de fiabilité stock DIVA / DRIVE 
101 Quantité dans le système Taux de fiabilité stock DIVA / DRIVE 
102 Coût des marchandises Taux de rotation stock DIVA 
103 Stock moyen Taux de rotation stock DIVA 
104 Valeur des articles sans mouvement 
durant 365 
Taux de stock mort DIVA 
105 La valeur totale du stock Taux de stock mort DIVA 
106 Capacité de stockage en nombre des 
Colis 
Taux d'occupation DIVA 
107 Nombre de rouleaux Taux d'occupation DIVA 
108 Nombre de commandes livrée dont la 
date de transfert (transfert coupe) + 
(Transfert coupe jemmel) 
Taux de commandes livrées à 
temps 
DIVA 
109 Moyen (date de transfert -date de 
réservation) 
Délai de livraison d'une 
commande 
DIVA 
110 Valeur par provenance STOCK/provenance DIVA 
111 Valeur totale de stock STOCK/provenance DIVA 
112 Valeur Par famille FG (ex : NABAIJI ; 
DOMYOS ; …) 
STOCK/Brand DIVA 
113 Valeur totale de stock STOCK/Brand  DIVA 
114 Valeur par Typologie fournitures STOCK/Typologie DIVA 
115 Valeur totale de stock STOCK/Typologie DIVA 
116 Qté coupé Couverture Coupe GPRO consulting 
117 Qté lancé Couverture Coupe GPRO consulting 
118 Quantité Sortie par chaine poste 93 WIP par chaine G.PRO 
119 Quantité engagement par chaine WIP par chaine G.PRO 
 
 
 
 
 
 
 
 
 
CONFIDENTIAL 
9 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
 
 
 
3.2. Groupe : Performance Qualité (Série 100) 
ID Exigence 
(KPI) 
Description & Règle 
de Gestion 
Source 
& 
Système 
Cible Fréquence 
d’actualisation 
Type de 
graphique  
F-REQ
101 
BR Nombre de rejet suite 
inspection commande / 
Nombre d'inspection 
commande *100 (dès 
le début de l'année 
jusqu'à présent) 
DIVA <=5% Temps réel      Big 
Number      
avec 
couleur 
F-REQ
102 
BR GTD  Nombre de rejet suite 
contrôle par chaine de 
production / Nombre 
de contrôle par chaine 
de production *100(ce 
jour : jour en cours) 
DIVA 
(Base de 
données) 
/gpro 
cosulting  
<=5% Temps réel Big Number      
avec 
couleur 
F-REQ
103 
BR GTD 
DDA 
Nombre de rejet suite 
contrôle RFID colis / 
Nombre de contrôle 
RFID colis annuel *100 
(par chaine de 
production dès le 
début de l'année 
jusqu'à présent) 
DIVA 
(Base de 
données) 
<=5% Temps réel     Line Chart 
(Courbe)+ 
Big Number 
avec 
couleur 
 
F-REQ
104 
RFT Nombre des pièces Ok 
de premier coup par 
chaine de production / 
Nombre des pièces 
produites par chaine de 
production *100 (ce 
jour : jour en cours) 
gpro
prod  
≥ 98% Temps réel Big Number 
avec 
couleur 
F-REQ
105 
RFT DDA Nombre des pièces Ok 
de premier coup par 
chaine de production / 
Nombre des pièces 
produites par chaine de 
production *100 (dès le 
début de l'année 
jusqu'à présent) 
gpro
prod 
≥ 98% Temps réel Line Chart 
(Courbe)+ 
Big Number 
avec 
couleur 
 
F-REQ
106 
BR 
Bundling 
Nombre de rejet suite 
inspection Paquet / 
Nombre d'inspection 
Paquet *100 (ce jour : 
le jour en cours) 
gpro
prod 
(Excel) 
<=5% Temps réel Big Number 
avec 
couleur 
CONFIDENTIAL 
10 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ
107 
BR 
Bundling 
DDA 
Nombre de rejet suite 
inspection Paquet / 
Nombre d'inspection 
Paquet *100 (dès le 
début de l'année 
jusqu'à présent) 
gpro
prod 
<=5% Temps réel Line Chart 
(Courbe) + 
Big Number 
avec 
couleur 
 
F-REQ
108 
BR Print Nombre de rejet suite 
inspection livraison 
sérigraphie / Nombre 
d'inspection livraison 
sérigraphie *100 (ce 
jour : le jour en cours) 
DRIVE <=5% 4 fois par jour Big Number 
avec 
couleur 
F-REQ
109 
BR Print 
DDA 
Nombre de rejet suite 
inspection livraison 
sérigraphie / Nombre 
d'inspection livraison 
sérigraphie *100 (dès 
le début de l'année 
jusqu'à présent) 
DRIVE <=5% 4 fois par jour Line Chart 
(Courbe) + 
Big Number 
avec 
couleur 
 
F-REQ
110 
BR Care 
Label 
Nombre de rejet suite 
inspection livraison 
vignettes / Nombre 
d'inspection livraison 
vignettes *100 (ce jour 
: le jour en cours) 
DRIVE <=5% 4 fois par jour Big Number 
avec 
couleur 
F-REQ
111 
BR Care 
Label DDA 
Nombre de rejet suite 
inspection livraison 
vignettes / Nombre 
d'inspection livraison 
vignettes *100 (dès le 
début de l'année 
jusqu'à présent) 
DRIVE <=5% 4 fois par jour Line Chart 
(Courbe) + 
Big Number 
avec 
couleur 
 
F-REQ
112 
BR 
Accessoires 
Nombre de rejet suite 
inspection livraison 
accessoires / Nombre 
d'inspection livraison 
accessoires *100 (ce 
jour : le jour en cours) 
DRIVE <=5% 4 fois par jour Big Number 
avec 
couleur 
F-REQ
113 
BR 
Accessoires 
DDA 
Nombre de rejet suite 
inspection livraison 
accessoires / Nombre 
d'inspection livraison 
accessoires *100 (dès 
le début de l'année 
jusqu'à présent) 
DRIVE <=5% 4 fois par jour Line Chart 
(Courbe) + 
Big Number 
avec 
couleur 
 
F-REQ
114 
BR Compo Nombre de rejet suite 
inspection livraison 
Compo / Nombre 
d'inspection livraison 
Compo *100 (ce jour : 
le jour en cours) 
DRIVE <=5% 4 fois par jour Big Number 
avec 
couleur 
CONFIDENTIAL 
11 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
 
• Note explicative pour les KPIs F-REQ-118 (Best QP Team) et F-REQ-119 
(Low QP Team)  
o 0 : Objectif non atteint 
o 1 : Objectif atteint 
 
 
 
 
 
 
3.3. Groupe : Performance de Production & Flux (Série 200) 
F-REQ
115 
BR Compo 
DDA 
Nombre de rejet suite 
inspection livraison 
Compo / Nombre 
d'inspection livraison 
Compo *100 (dès le 
début de l'année 
jusqu'à présent) 
DRIVE <=5% 4 fois par jour Line Chart 
(Courbe) + 
Big Number 
avec 
couleur 
 
F-REQ
116 
Pareto 
defects 
Pareto defects au 
niveau opération gpro
prod 93+100+102 (ce 
jour : jour en cours) 
gpro
prod 
 Temps réel Pareto 
Chart 
(Interactif) 
F-REQ
117 
Pareto 
defects FG 
Pareto defects 
Inspection AQL Colis + 
Contôle RFID (ce jour : 
jour en cours) 
DIVA 
+DRIVE 
 Temps réel Pareto 
Chart 
(Interactif) 
F-REQ
118 
Best QP 
team 
Top 3 chaine de 
production ayant la 
meilleure performance 
qualité ((0/1) BR *5 + 
(0/1) BR IN *3 + (0/1) 
BR GTD *3 + (0/1) RFT 
*1) 
DIVA 
+DRIVE 
 Temps réel Podium ou 
Top 3 List 
 
F-REQ
119 
 
 
 
Low QP 
team 
 
 
 
 
Les 3 chaines de 
production ayant une 
performance à suivre 
et à améliorer ((0/1) BR 
*5 + (0/1) BR IN *3 + 
(0/1) BR GTD *3 + (0/1) 
RFT *1) 
DIVA 
+DRIVE 
 Temps réel Podium ou 
Top 3 List 
ID Exigence 
(KPI) 
Description & Règle 
de Gestion 
Source 
& 
Système 
Cibl
e 
Fréquence 
d’actualisation 
Type de 
graphique  
CONFIDENTIAL 
12 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ
201 
 
Efficience par 
OPERATEUR 
par chaine 
(Minutes produites / 
minutes présence) * 
100 
G.PRO >=90
%  
Instantané Combo 
Bar/Line 
F-REQ
202 
Efficience 
PAR CHAINE 
[(Quantité déclaré par 
chaine * SOT) / (Effectif 
de la chaine * minutes 
présence)] * 100 
G.PRO + 
GPRO 
consultin
g 
>85
%  
Instantané Gauge Chart 
(Jauge) / par 
période  
F-REQ
203 
Efficience 
Cumulée 
chaine  
(Somme des minutes 
produites pour le mois 
encours / Somme des 
minutes présence pour 
le mois encours) * 100 
G.PRO + 
GPRO 
consultin
g 
>85
%  
Instantané Line Chart 
(Courbe) 
F-REQ
204 
OWE par 
chaine 
[(Quantité déclaré par 
chaine * SAM) / 
(Effectif de la chaine * 
minutes présence)] * 
100 
G.PRO + 
GPRO 
consultin
g 
>70
% 
Instantané Big Number 
avec couleur 
F-REQ
205 
WIP par 
chaine 
(Quantité Sortie par 
chaine poste 93) – 
(Quantité engagement 
par chaine)  
 G.PRO <= 
1/2 
cade
nce 
Instantané Gauge Chart 
(Jauge) 
F-REQ
206 
WIP OPTIMAL Quantité Sortie coupe - 
quantité engagement 
(par chaine par article 
par OF) 
G.PRO >= 
1,5*
cade
nce 
chai
ne 
Instantané Area Chart 
(Graph. 
aires) 
F-REQ
207 
Arrêts non 
planifiés par 
chaine 
Lost time G.PRO < 10 
minu
tes 
Instantané Chronologie 
(Timeline) / 
par 
période+ 
liste de 
motifs pour 
tout arrêt 
non planifié  
 
 
F-REQ
208 
Efficience 
Départage 
PAR 
OPERATRICE 
(Minutes produites 
poste 221 / Minutes 
présence) * 100 
G.PRO >85
%  
Instantané Combo 
Bar/Line / 
par période 
F-REQ
209 
Efficience 
Vignettes 
PAR 
OPERATRICE 
(Minutes produites 
poste 213 / Minutes 
présence) * 100 
G.PRO >85
%  
Instantané Combo 
Bar/Line/ 
par période 
F-REQ
210 
Top 
opérateurs 
coupe 
[(Quantité produite 
indiv * temps 
d’opération) / minute 
présence déclaré)] * 
100 
G.PRO >= 
90% 
Instantané Horizontal 
Bar Chart 
CONFIDENTIAL 
13 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
 
3.4. Groupe : Logistique, Planning (Série 300) 
 
ID Exigence 
(KPI) 
Description & 
Règle de Gestion 
Source & 
Système 
Cible Fréquence 
d’actualisa
tion 
Type de 
graphique  
F-REQ-301 OF ou OFs 
confection 
par CHAINE 
Numéro Ordre de 
Fabrication 
encours production 
GPRO 
consulting 
 Instantané Big Number 
avec 
couleur+List
e de OF en 
cours non 
soldés 
 
F-REQ
211 
SAM (Temps 
standard 
alloué) par 
chaine 
Temps standard 
alloué 
GPRO 
consultin
g 
 Instantané Big Number 
avec couleur 
F-REQ
212 
SOT (Temps 
article 
fournisseur) 
par chaine 
Le temps d’article de 
fournisseur 
GPRO 
consultin
g 
 Instantané Big Number 
avec couleur 
F-REQ
213 
Effectifs par 
chaine 
Nombre d’opérateurs 
exigé 
GPRO 
consultin
g 
 Instantané Big Number 
avec couleur 
F-REQ
214 
Code article 
par chaine 
Code conception de 
l'article 
GPRO 
consultin
g 
 Instantané Big Number 
avec couleur 
F-REQ
215 
Designation 
d'article par 
chaine 
Description GPRO 
consultin
g 
 Instantané Big Number 
avec couleur 
F-REQ
216 
Taux 
d’archivage 
suivi paquets 
par chaine 
(Nbre des OF soldés 
archivés / nbr des Ofs 
soldés) *100 
 Base 
suivi 
productio
n 
85% Journalière Gauge Chart 
(Jauge) 
F-REQ
217 
Taux de 
fiabilité des 
donnés sur 
système par 
OF 
Différence entre 
tagging réel et sortie 
fin chaine 
GPRO 95% Journalière Gauge Chart 
(Jauge 
F-REQ
218 
Taux de 
respect du 
temps estimé 
par ARTICLE 
Temps cotation - 
Temps prod = / > 0 
minute 
Base 
rendeme
nt + 
Logiciel 
Cotation 
90% Chaque 
nouveau 
démarrage 
Big Number 
avec couleur 
F-REQ
219 
Taux des 
temps 
acceptés dès 
la première 
version par 
ARTICLE 
(Nbr des demandes de 
négociation - Nbr des 
gammes déchiffrage) * 
100 
Fichier 
déchiffrag
e + 
logiciel 
cotation 
≥80
% 
Fichier 
déchiffrage + 
logiciel 
cotation 
Big Number 
avec couleur 
CONFIDENTIAL 
14 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-302 OF 
encours ou 
OFs coupe 
Numéro Ordre de 
Fabrication lancés 
crée sur G.PRO 
GPRO 
CONSULT
ING 
 Instantané Big Number 
avec 
couleur+List
e de OF en 
cours non 
soldés 
 
F-REQ-303 Quantité 
OF ou OFs 
par ARTICLE 
Quantité OF ou 
OFs 
GPRO 
consulting 
 Instantané Big Number 
avec 
couleur+List
e de OF en 
cours non 
soldés 
 
F-REQ-304 SO 
Progress 
par OF 
L’état 
d’avancement des 
commandes par 
point de contrôle 
G.PRO  Instantané Bar Chart 
(par chaîne) 
F-REQ-305 Taux 
d'avancem
ent OF par 
OF par 
chaine 
(Quantité produite 
déclaré / Quantité 
OF) *100 
GPRO 
consulting 
 Instantané Donut Chart 
(Anneau) 
F-REQ-306 BPD 
(Beginning 
Production 
Date) par 
OF par 
chaine 
Date de début de 
la commande 
encours 
G.PRO 
consulting 
 Instantané Big Number 
avec couleur 
F-REQ-307 EPD (End 
Production 
Date) par 
OF par 
chaine 
Date de fin prévue 
de la commande 
encours en fonction 
de la quantité 
réalisée et la 
cadence allouée 
GPRO 
consulting 
 Instantané Big Number 
avec couleur 
F-REQ-308 EHD par OF 
par chaine 
La date d’export 
prévue de la 
commande encours 
GPRO 
consulting 
 Instantané Big Number 
avec couleur 
F-REQ-309 COUVERT
URE 
Sérigraphi
e  
Quantié entré 
sérigraphie 236 - 
quantité produite 
239 
G.PRO > 
cadenc
e 
hebdo
madair
e 
moyen
ne 
Instantané Bar Chart 
(par chaîne) 
F-REQ-310 Couverture 
chaine  
(Qté engagé - Qté 
planifié) / cadence 
moyenne 
GPRO 
consulting 
> 10 
jours 
Instantané  Bar Chart 
(par chaîne) 
CONFIDENTIAL 
15 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-311 Couverture 
Coupe 
(Qté lancé - Qté 
coupé) / cadence 
hebdomadaire 
moyenne 
DIVA / 
GPRO 
consulting 
> 
cadenc
e 
hebdo
madair
e 
moyen
ne 
 Big Number 
avec couleur 
F-REQ-312 Objectif par 
chaine 
Objectif prévu 
journalier 
GPRO 
consulting 
 Instantané Big Number 
avec couleur 
F-REQ-313 Taux de 
fiabilité 
stock 
accessoire
s  
Quantité physique / 
Quantité dans le 
système *100 
DIVA / 
DRIVE 
>99,5
% 
Journalier Jauge 
Radiale 
F-REQ-314 Taux de 
fiabilité 
stock 
tissu  
Quantité physique / 
Quantité dans le 
système *100 
DIVA / 
DRIVE 
>99,5
% 
Journalier Jauge 
Radiale 
F-REQ-315 Taux de 
fiabilité 
stock FG 
Quantité physique / 
Quantité dans le 
système *100 
DRIVE / 
DIVA 
>99,5
% 
Journalier Jauge 
Radiale 
F-REQ-316 Taux de 
rotation 
stock 
accessoire
s  
Coût des 
marchandises / Stock 
moyen 
DIVA  Temps réel Jauge 
Radiale 
F-REQ-317 Taux de 
rotation 
stock 
tissu  
Coût des 
marchandises / Stock 
moyen 
DIVA  Temps réel Jauge 
Radiale 
F-REQ-318 Taux de 
rotation 
stock FG 
Coût des 
marchandises / Stock 
moyen 
DIVA  Temps réel Jauge 
Radiale 
F-REQ-319 Taux de 
stock mort 
accessoire
s  
Valeur des articles 
sans mouvement 
durant 365 / la 
valeur total du stock 
*100 
DIVA  Temps réel Big Number 
avec couleur 
F-REQ-320 Taux de 
stock mort 
tissu  
Valeur des articles 
sans mouvement 
durant 365 / la 
valeur total du stock 
*100 
DIVA  Temps réel Big Number 
avec couleur 
F-REQ-321 Taux de 
stock mort 
stock FG 
Valeur des articles 
sans mouvement 
durant 365 / la 
valeur total du stock 
*100 
DIVA  Temps réel Big Number 
avec couleur 
CONFIDENTIAL 
16 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-322 Taux 
d'occupati
on 
Accessoire
s 
Nombre de rouleaux 
/ Capacité de 
stockage en nombre 
des Colis *100 
DIVA <=85% Temps réel Gauge Chart 
(Jauge) 
F-REQ-323 Taux 
d'occupati
on tissu  
Nombre de rouleaux 
/ Capacité de 
stockage en nombre 
des Colis *100 
DIVA <=85% Temps réel Gauge Chart 
(Jauge) 
F-REQ-324 Taux 
d'occupati
on stock 
FG 
Nombre de rouleaux 
/ Capacité de 
stockage en nombre 
des Colis *100 
DIVA <=85% Temps réel Gauge Chart 
(Jauge) 
F-REQ-325 Taux de 
commande
s livrées à 
temps 
Accessoire
s 
Nombre de 
commandes livrée 
dont la date de 
transfert (transfert 
coupe + transfert 
coupe Jemmel) 
DIVA >= 
80% 
Temps réel Big Number 
avec couleur 
F-REQ-326 Taux de 
commande
s livrées à 
temps 
tissu  
Nombre de 
commandes livrée 
dont la date de 
transfert (transfert 
coupe + transfert 
coupe Jemmel) 
DIVA >= 
80% 
Temps réel Big Number 
avec couleur 
F-REQ-327 Taux de 
commande
s livrées à 
temps 
stock FG 
Nombre de 
commandes livrée 
dont la date de 
transfert (transfert 
coupe + transfert 
coupe Jemmel) 
DIVA >= 
80% 
Temps réel Big Number 
avec couleur 
F-REQ-328 Délai de 
livraison 
d'une 
commande 
Accessoire
s 
Moyen (date de 
transfert -date de 
réservation) 
DIVA 1 jour Temps réel Big Number 
avec couleur 
FREQ-329 Délai de 
livraison 
d'une 
commande 
tissu  
Moyen (date de 
transfert -date de 
réservation) 
DIVA 1 jour Temps réel Big Number 
avec couleur 
F-REQ-330 Délai de 
livraison 
d'une 
commande 
stock FG 
Moyen (date de 
transfert -date de 
réservation) 
DIVA 1 jour Temps réel Big Number 
avec couleur 
F-REQ-331 STOCK/Ty
pologie 
Valeur par Typologie 
fournitures / Valeur 
total de stock *100 
DIVA  Temps réel Pie Chart 
(Secteurs) 
CONFIDENTIAL 
17 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-332 STOCK/pro
venance 
Valeur par 
provenance / Valeur 
total Stock * 100  
DIVA  Temps réel Pie Chart 
(Secteurs) 
F-REQ-333 STOCK/Bra
nd 
Valeur Par famille FG 
(ex : NABAIJI ; 
DOMYOS ; …) / 
Valeur Total Stock 
*100 
DIVA  Temps réel Pie Chart 
(Secteurs) 
F-REQ-334 DOT 
(Delivery) 
(QT livrée on time/ 
ordered QT) *100 
gpro
planning/c
arnet 
≥ 95% Temps réel Line Chart 
(Courbe) 
F-REQ-335 HOT 
(Handover) 
(QT livrée on time/ 
ordered QT) *100 
gpro
planning/c
arnet 
≥ 95% Temps réel Line Chart 
(Courbe) 
F-REQ-336 Respect 
Planif. 
(qte réaliser / 
objectif journalier) 
par chaine de 
montage  
gpro
planning/c
arnet 
≥ 95% Temps réel Line Chart 
(Courbe) 
F-REQ-337 Lead Time 
Global 
STRH + LT 
TRANSPORT 
gpro
planning/c
arnet 
32 
jours 
Temps réel Big Number 
avec couleur 
 
Note : Pour la vue logistique KPI OF en cours (F-REQ-302) et Taux d’avancement OF par 
OF par chaîne (F-REQ-305). Il est également important d’avoir la possibilité d’afficher toutes 
les commandes qui se déroulent dans l’atelier. 
 
3.5. Groupe :  Développement (Série 350) 
ID Exigence (KPI) Description & 
Règle de 
Gestion 
Source & 
Système 
Cible Fréquence 
d’actualisation 
Type de 
graphique  
F
REQ
350 
RFT (RIGHT 
FIRST TIME) 
Nb des modèles 
validé de 1er coup 
/ Total des 
modelés envoyées 
Drive ≥ 95% Mensuel Big Number 
avec couleur 
F
REQ
351 
Taux de 
respect de 
livraison a 
date  
Nb des modèles 
env a date /totales 
des modèles env 
Drive ≥ 95% Mensuel Gauge Chart 
(Jauge) 
F
REQ
352 
Taux de fiabilité 
de 
nomenclature 
Nb des 
nomenclatures 
validé et fiable / 
totales 
Drive ≥ 98% Mensuel Line Chart 
mensuel 
CONFIDENTIAL 
18 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F
REQ
353 
%réclamations 
de la production 
Nb des modèles 
réclamés /totales 
des modèles 
Drive < 2% Mensuel Scatter Plot 
(Nuage) 
 
4. Exigences d'Affichage et de Consultation (F-REQ-DS) 
ID Titre Description de l'exigence 
F-REQ-400 Vue d’Authentification Une vue d’authentification selon le rôle du user 
identifié 
F-REQ-401 Vue d’Administration Une vue de configuration pour les administrateurs 
F-REQ-402 Vue Performance Qualité  
 
Affichage mural des KPI Qualité (F-REQ-101… 119) 
F-REQ-403 Vue Production  
         - Vue confection  
 
         - Vue coupe  
 
         - Vue sérigraphie  
Affichage mural en ateliers (confection, coupe, 
sérigraphie) des KPI production  
F-REQ-404 Vue Méthodes  Affichage Mural des indicateurs méthodes (F-REQ
216…219). 
F-REQ-405 Vue Logistique & 
Planning  
Affichage mural en entrepôt des KPI DOT/HOT (F
REQ-301, 337). 
F-REQ-406 Vue Développement  Consultation des KPI Déchiffrage et RFT 
Développement. (F-REQ-350, 353). 
F-REQ-407 Filtrage Dynamique Capacité de filtrer chaque KPI par Marque (Brand), 
Ligne et OF. 
F-REQ-408 Alerte Visuelle Changement de couleur (Vert/Orange/Rouge) si le KPI 
dévie de la cible définie. 
F-REQ-409 Export   Une fonction d’export qui permet de télécharger les 
données du KPI au format Excel 
   
3.6. Assignation des Specs par vue  
Cette section présente la répartition des spécifications fonctionnelles F-REQ selon les 
différentes vues. 
La répartition détaillée des spécifications fonctionnelles par vue est présentée dans 
l’Annexe1 
 
Note Importante relative aux Prototypes Visuels 
CONFIDENTIAL 
19 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
Objet : Précision sur la nature des figures et maquettes présentées dans ce cahier des 
charges. 
Toutes les figures, captures d’écran et prototypes interactifs présentés dans cette 
spécification (notamment pour les exigences F-REQ-401 à F-REQ-405) sont fournis 
exclusivement à titre de prototype. 
Objectifs de ces visuels : 
1. Cadrage de la Conception : Offrir une première orientation concrète sur 
l'organisation des informations et l'ergonomie de la solution (User Interface). 
2. Validation Fonctionnelle : Confirmer la présence des indicateurs clés (KPI) et des 
fonctionnalités attendues avant le développement. 
3. Expérience Utilisateur (UX) : Illustrer les principes de lisibilité à distance (NF-REQ
507) et la navigation par profil. 
Réserves : 
• Identité Visuelle : La charte graphique finale (couleurs exactes, polices de 
caractères, logos officiels) pourra être ajustée lors de la phase de design UI détaillée 
pour s'aligner sur l'identité de marque de BACOVET. 
• Contenu des Données : Les données chiffrées affichées sont fictives et servent 
uniquement à simuler le comportement du dashboard en conditions réelles. 
• Évolutivité : L'agencement final pourra être optimisé en fonction des contraintes 
techniques des terminaux d'affichage (TV industrielles, tablettes). 
Cette note garantit que la validation de ce document porte sur les fonctionnalités et la 
structure, tout en laissant une flexibilité créative pour la réalisation finale 
 
F-REQ
400 
Vue d’Authentification Une vue d’authentification selon le rôle du user 
identifié 
 
CONFIDENTIAL 
Détails de l'Affinement (Comportement Post-Login) 
Le système doit disposer d'un portail d'entrée unique sécurisé, ce module agit comme un 
aiguillage métier. Une fois les identifiants validés, le système doit charger un profil 
utilisateur spécifique (Role-Based Access Control - RBAC) qui définit dynamiquement 
l'interface, les données visibles et les fonctionnalités autorisées. 
1. Redirection Contextuelle : * L'utilisateur n'arrive pas sur une page d'accueil 
générique. Le système doit le rediriger vers la série (100, 200, 300, 350) 
correspondant à son département d'origine. 
o Exemple : Un Responsable Logistique est directement dirigé vers la Série 
300. 
2. UI Masking (Masquage d'Interface) : 
o Le menu de navigation latéral doit être filtré. Un utilisateur ne verra que les 
onglets de séries pour lesquels il possède des droits de lecture (selon la 
matrice des droits définie au point 2 du CDC). 
o Les boutons d'action critiques (Export PDF, Configuration API, Paramètres 
système) ne doivent apparaître que pour les profils à privilèges élevés 
(Direction, IT). 
3. Audit et Session (NF-REQ-505/502) : 
o L'identifiant (ID) de l'utilisateur doit être affiché en permanence sur l'interface 
pour garantir la responsabilité des actions. 
o La session doit expirer automatiquement après une période d'inactivité ou à la 
fin d'un shift standard (8 heures). 
20 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
F-REQ
401 
Vue d’Administration 
Une vue de configuration pour les administrateurs 
Cette interface est l'unique point d'entrée pour la configuration technique du système. Elle 
est conçue pour permettre une gestion "No-Code" de l'infrastructure. 
Pilier 1 : Supervision des Flux (Pipeline Monitoring) 
• Monitoring Temps Réel : Statut de connexion (Online/Offline) des API GPRO et des 
connecteurs Google Sheets. 
• Fraîcheur des Données : Affichage du "Time since last sync" pour garantir que les 
décisions terrain sont basées sur des données récentes. 
Pilier 2 : Gestion des Écrans (NF-REQ-503) 
• Mapping Physique : Identification et configuration de chaque terminal (TV 
Confection, Écran Coupe, etc.). 
• Contrôle à distance : Capacité de définir quel dashboard est projeté sur quel écran. 
Pilier 3 : Journal d'Audit & Identité (NF-REQ-505 & IAM) 
• Traçabilité : Historique complet des accès et des changements de configuration. 
21 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
• Gestion des Accès : Création de comptes, réinitialisation de mots de passe et 
définition granulaire des droits par série (100 à 400). 
F-REQ
402 
Vue Performance 
Qualité 
Affichage mural des KPI Qualité (F-REQ-101… 
119) 
Cette vue est destinée aux écrans industriels installés dans les zones de contrôle. Elle 
agrège les données issues des exigences F-REQ-101 à 109 pour offrir une lecture 
instantanée de la conformité du jour. 
1. Indicateurs Critiques (Top-Level KPI) : 
o Taux de Rejet (Blocking Rate) : Affichage en grand format avec code 
couleur (Vert < 4%, Orange 4-5%, Rouge > 5%). 
o RFT (Right First Time) : Pourcentage de produits conformes du premier 
coup. 
22 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
2. Analyse des Défauts (Pareto Dynamique) : 
o Visualisation des 3 types de défauts les plus fréquents (ex: couture ouverte, 
tâche, mesure) pour orienter les actions correctives immédiates. 
3. Conformité Visuelle (NF-REQ-507) : 
o Contraste élevé pour une lecture à 5 mètres. 
o Alertes visuelles clignotantes en cas de dépassement de seuil critique sur un 
OF (Ordre de Fabrication) spécifique. 
F-REQ
403 
Vue : Performance de 
Production & Flux 
Affichage mural en ateliers (confection, 
coupe, sérigraphie) des KPI production 
Cette vue est destinée aux écrans muraux des lignes de confection et des zones de coupe. 
Elle agrège les données de production  pour motiver les équipes et identifier les goulots 
d'étranglement en temps réel. 
1. Indicateurs de Cadence (Production Live) : 
o Efficience Globale (%) : Comparaison entre le temps passé et le temps 
standard produit (STRH). 
o Quantité Produite vs Objectif : Jauge visuelle de l'avancement de la 
journée. 
23 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
2. Suivi des Flux (Avancement OF) : 
o Visualisation de l'état de l'Ordre de Fabrication (OF) en cours. 
o Décompte du reste à produire pour finaliser la commande. 
3. Conformité Visuelle (NF-REQ-507) : 
o Lecture haute visibilité (5 mètres). 
o Code couleur "Trafic Light" : Vert (Objectif atteint), Orange (Retard léger), 
Rouge (Arrêt de ligne ou retard critique). 
24 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
F-REQ
405 
Vue Logistique & 
Planning  
Affichage mural en entrepôt des KPI DOT/HOT 
(F-REQ-301, 337). 
Cette vue est optimisée pour les terminaux d'affichage en entrepôt. Elle transforme les 
données de planification en objectifs visuels clairs pour les équipes de préparation et 
d'export. 
1. Indicateurs de Performance de Livraison : 
o DOT (Delivery On Time) : Taux de commandes expédiées à la date prévue. 
o HOT (Handover On Time) : Respect du créneau de remise au transporteur. 
2. État des Expéditions du Jour : 
o Volume de colis/pièces préparés vs prévus. 
o Décompte des camions en attente ou en cours de chargement. 
3. Alerte Priorité (Planning) : 
o Mise en évidence des commandes "Urgent Export" dont le délai approche de 
l'échéance critique. 
25 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
F-REQ
406 
Vue Développement  
Consultation des KPI Déchiffrage et RFT 
Développement. (F-REQ-350, 356). 
Cette vue est destinée aux bureaux d'études, aux équipes méthodes et au département 
développement. Elle permet de mesurer l'efficacité de la phase de prototypage avant le 
lancement en grande série. 
1. Indicateurs de Performance Développement : 
o RFT Développement (F-REQ-350) : Pourcentage de prototypes validés dès 
le premier échantillon (Right First Time Dev). 
o Taux de respect de livraison a date (F-REQ-351) : La capacité du service 
Développement & Prototype à livrer les modèles dans les délais convenus. 
2. Suivi de l'Amélioration Continue : 
o Complexité vs Efficience : Corrélation entre la difficulté technique d'un 
modèle et l'efficience attendue en ligne. 
3. Visualisation Analytique : 
o Graphiques de tendance sur les temps de mise au point (Lead-time Dev). 
26 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
27 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
5. Spécifications Détaillées des Exigences non
Fonctionnelles (NF-REQ) 
 
5.1. Gestion des Accès et Authentification (F-REQ-SEC) 
NF-REQ-501 : Le système doit implémenter un contrôle d'accès basé sur les rôles (RBAC - 
Role Based Access Control). L'accès à l'écriture est strictement réservé aux fonctions 
d'administration technique pour garantir l'intégrité des KPI calculés via l'API. 
Profil Utilisateur Rôle Fonctionnel Type d'accès Périmètre de Visibilité (KPI) 
IT / 
Administrateur 
Gestion du 
système 
Lecture / 
Écriture 
Accès total (Config, Users, 
Logs, API) 
Direction Pilotage 
stratégique 
Lecture 
seule 
KPI consolidés (Vue globale 
entreprise) 
Resp. 
Production 
Supervision 
globale 
Lecture 
seule 
Tous les KPI Ateliers et Flux 
GPRO 
Chef d'Atelier Pilotage terrain Lecture 
seule 
Avancement OF, Efficience, 
Production locale 
Resp. Qualité Maîtrise 
conformité 
Lecture 
seule 
Tous les KPI Qualité (CGL, 
AQL, Rejets) 
Méthodes Optimisation flux Lecture 
seule 
Efficience, Qualité, Équilibrage, 
Polyvalence 
Planning / 
Coupe 
Ordonnancement Lecture 
seule 
DOT, HOT, Lead Time, Respect 
Planification 
 
Action autorisée pour les profils "Lecture" : Filtrer les données, consulter les analyses 
approfondies (drill-down) et exporter les rapports. 
5.2. Exigences d'Administration Système (NF-REQ-ADM) 
• NF-REQ-502 : Authentification. Chaque utilisateur doit s'identifier via un couple 
Login/Mot de passe unique.  
• NF-REQ-503 Gestion de la Configuration des Écrans Le système doit fournir une 
interface d'administration permettant de configurer individuellement chaque point 
d'affichage (TV/Écran industriel) selon la zone (Confection, Coupe, Entrepôts, etc.). 
• NF-REQ-505 : Traçabilité (Logs). Le système doit enregistrer toutes les tentatives 
de connexion et les modifications de configuration effectuées par le profil IT dans un 
journal d'audit infalsifiable. 
• NF-REQ-506 : Supervision des flux API. Un tableau de bord d'administration doit 
permettre à l'IT de vérifier en temps réel l'état des synchronisations entre les fichiers 
Excel/Google Sheets et la base de données centrale. 
5.3. Accessibilité et Usabilité (NF-REQ-USE) 
CONFIDENTIAL 
• NF-REQ-507 : Lisibilité Terrain. Les dashboards destinés aux écrans muraux 
(Confection, Coupe, Entrepôts) doivent être conçus avec un contraste élevé et une 
typographie permettant une lecture sans ambiguïté à une distance de 5 mètres. 
• NF-REQ-508 : Rafraîchissement. L'interface doit supporter des fréquences de mise 
à jour automatiques. 
• NF-REQ-509 : Langues. L'interface utilisateur doit être disponible en Français 
(langue principale) avec une option de terminologie technique métier adaptée au 
secteur de la confection.olà 
28 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
CONFIDENTIAL 
29 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
Annexe 1 
Vue Production Priorité 01 
  
Vue Production  
ID   KPI première priorité   Vue 
confection  
Vue 
coupe  
Vue 
sérigraphie 
F-REQ-102 BR GTD   
F-REQ-104 RFT(Prod)    
F-REQ-106 BR AQL     
F-REQ-106 BR Bundling    
F-REQ-108 BR Print     
F-REQ-201 Efficience par OPERATEUR   
F-REQ-202 Efficience PAR CHAINE   
F-REQ-203 Efficience Cumulée chaine    
F-REQ-204 
OWE(Performance de la veille (en 
%) par rapport SAM)   
F-REQ-205 WIP    
F-REQ-206 WIP OPTIMAL   
F-REQ-207 Arrêt non planifiés   
F-REQ-208 
Efficience Départage PAR 
OPERATRICE    
F-REQ-209 
Efficience Vignettes PAR 
OPERATRICE    
F-REQ-210 Top opérateurs   
F-REQ-211 SAM (Temps standard alloué)   
F-REQ-212 SOT (Temps article fournisseur)   
F-REQ-213 Effectifs   
F-REQ-214 Code article   
F-REQ-215 Designation d'article   
F-REQ-301 OF ou OFs confection   
F-REQ-302 OF encours ou OFs coupe    
F-REQ-303 Quantité OF ou OFs   
CONFIDENTIAL 
30 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-304 SO Progress   
F-REQ-305 Taux d'avencement OF   
F-REQ-306 BPD (Beginning Production Date)   
F-REQ-307 EPD (End Production Date)   
F-REQ-308 EHD   
F-REQ-309 COUVERTURE Sérigraphie    
F-REQ-310 Couverture chaine    
F-REQ-311 Couverture Coupe    
F-REQ-312 Objectif   
 
Vue qualité Méthode logistique et Dev Priorité 02 
 
ssID  KPI seconde priorité  Vue 
Qualité  
Vue 
Méthodes 
Vue 
Logistique et 
planning  
Vue 
Développement  
F-REQ-101 BR      
F-REQ-104 RFT      
F-REQ-105 RFT DDA       
F-REQ-106 BR Bundling      
F-REQ-107 BR Bundling DDA      
F-REQ-108 BR Print       
F-REQ-109 BR Print DDA      
F-REQ-102 BR GTD      
F-REQ-1O3 BR GTD DDA      
F-REQ-110 BR Care Label      
F-REQ-111 BR Care Label DDA      
F-REQ-112 BR Accessoires      
F-REQ-113 BR Accessoires DDA      
F-REQ-114 BR Compo      
F-REQ-115 BR Compo DDA      
F-REQ-116 Pareto defects      
F-REQ-117 Pareto defects FG      
F-REQ-118 Best QP team      
F-REQ-119 Low QP team      
CONFIDENTIAL 
31 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-218 
Taux d’archivage suivi 
paquets     
F-REQ-219 
Taux de fiabilité des 
donnés sur système      
F-REQ-220 
Taux de respect du 
temps estimé      
F-REQ-221 
Taux des temps 
acceptés dès le 
premier version      
F-REQ-314 
Taux de fiabilité stock 
accessoires       
F-REQ-315 
Taux de fiabilité stock 
tissu        
F-REQ-316 
Taux de fiabilité stock 
FG       
F-REQ-317 
Taux de rotation stock 
acccessoires        
F-REQ-318 
Taux de rotation stock 
tissu        
F-REQ-319 
Taux de rotation stock 
FG       
F-REQ-320 
Taux de stock mort 
acccessoires        
F-REQ-321 
Taux de stock mort 
tissu        
F-REQ-322 
Taux de stock mort 
stock FG       
F-REQ-323 
Taux d'occupation 
Accessoires       
F-REQ-324 
Taux d'occupation 
tissu        
F-REQ-325 
Taux d'occupation 
stock FG       
F-REQ-326 
Taux de commandes 
livrées à temps 
Accessoires       
F-REQ-327 
Taux de commandes 
livrées à temps tissu        
F-REQ-328 
Taux de commandes 
livrées à temps stock 
FG       
F-REQ-329 
Délai de livraison d'une 
commande 
Accessoires       
F-REQ-330 
Délai de livraison d'une 
commande tissu        
F-REQ-331 
Délai de livraison d'une 
commande stock FG       
F-REQ-332 STOCK/Typologie       
F-REQ-333 STOCK/provenance       
CONFIDENTIAL 
32 
Cahier des Charges : Solution Dashboard de Pilotage Opérationnel – BACOVET-Validated Version 
F-REQ-334 STOCK/Brand       
F-REQ-335 DOT (Delivery)       
F-REQ-336 HOT (Handover)       
F-REQ-337 Respect Planif       
F-REQ-338 Lead Time Global       
F-REQ-350 RFT (RIGHT FIRST TIME)       
F-REQ-351 
Taux de respect de 
livraison a date        
F-REQ-352 
Taux de fiabilité de 
nomenclature       
F-REQ-353 
%réclamations de la 
production       
 