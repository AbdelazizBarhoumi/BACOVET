export type KpiSeed = {
  kpi: string;
  name: string;
  variable: string;
  cible_operator?: string;
  cible_value?: number | null;
  cible_is_percentage?: boolean;
  refresh_frequency?: string;
};

export const KPI_SEED: KpiSeed[] = [
  { "kpi": "F-REQ-101", "name": "BR", "variable": "Nombre de rejet suite inspection commande", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-101", "name": "BR", "variable": "Nombre d'inspection commande", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-102", "name": "BR GTD", "variable": "Nombre de rejet suite contrôle par chaîne de production", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-102", "name": "BR GTD", "variable": "Nombre de contrôle par chaîne de production", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-103", "name": "BR GTD DDA", "variable": "Nombre de rejet suite contrôle RFID colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-103", "name": "BR GTD DDA", "variable": "Nombre de contrôle RFID colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-104", "name": "RFT", "variable": "Nombre de pièces OK de premier coup par chaîne de production", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-104", "name": "RFT", "variable": "Nombre de pièces produites par chaîne de production", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-105", "name": "RFT DDA", "variable": "Nombre de pièces OK de premier coup par chaîne de production", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-105", "name": "RFT DDA", "variable": "Nombre de pièces produites par chaîne de production", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-106", "name": "BR Bundling", "variable": "Nombre de rejet suite inspection paquet", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-106", "name": "BR Bundling", "variable": "Nombre d'inspection paquet", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-107", "name": "BR Bundling DDA", "variable": "Nombre de rejet suite inspection paquet", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-107", "name": "BR Bundling DDA", "variable": "Nombre d'inspection paquet", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-108", "name": "BR Print", "variable": "Nombre de rejet suite inspection livraison sérigraphie", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-108", "name": "BR Print", "variable": "Nombre d'inspection livraison sérigraphie", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-109", "name": "BR Print DDA", "variable": "Nombre de rejet suite inspection livraison sérigraphie", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-109", "name": "BR Print DDA", "variable": "Nombre d'inspection livraison sérigraphie", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-110", "name": "BR Care Label", "variable": "Nombre de rejet suite inspection livraison vignettes", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-110", "name": "BR Care Label", "variable": "Nombre d'inspection livraison vignettes", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-111", "name": "BR Care Label DDA", "variable": "Nombre de rejet suite inspection livraison vignettes", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-111", "name": "BR Care Label DDA", "variable": "Nombre d'inspection livraison vignettes", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-112", "name": "BR Accessoires", "variable": "Nombre de rejet suite inspection livraison accessoires", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-112", "name": "BR Accessoires", "variable": "Nombre d'inspection livraison accessoires", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-113", "name": "BR Accessoires DDA", "variable": "Nombre de rejet suite inspection livraison accessoires", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-113", "name": "BR Accessoires DDA", "variable": "Nombre d'inspection livraison accessoires", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-114", "name": "BR Compo", "variable": "Nombre de rejet suite inspection livraison Compo", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-114", "name": "BR Compo", "variable": "Nombre d'inspection livraison Compo", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-115", "name": "BR Compo DDA", "variable": "Nombre de rejet suite inspection livraison Compo", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-115", "name": "BR Compo DDA", "variable": "Nombre d'inspection livraison Compo", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-116", "name": "Pareto defects", "variable": "Pareto defects au niveau opération", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-117", "name": "Pareto defects FG", "variable": "Défauts inspection AQL colis", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-117", "name": "Pareto defects FG", "variable": "Défauts contrôle RFID", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-118", "name": "Best QP team", "variable": "Top 3 chaine", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-119", "name": "Low QP team", "variable": "Les 3 chaines", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-120", "name": "BR IN", "variable": "Nombre de rejet suite inspection colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-120", "name": "BR IN", "variable": "Nombre d'inspection colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-121", "name": "BR IN DDA", "variable": "Nombre de rejet suite inspection AQL colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-121", "name": "BR IN DDA", "variable": "Nombre d'inspection AQL colis", "cible_operator": "<=", "cible_value": 5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-201", "name": "Efficience par OPERATEUR par chaine", "variable": "Minutes produites", "cible_operator": ">=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-201", "name": "Efficience par OPERATEUR par chaine", "variable": "Minutes présence", "cible_operator": ">=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-202", "name": "Efficience PAR CHAINE", "variable": "Quantité déclarée par chaîne", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-202", "name": "Efficience PAR CHAINE", "variable": "SOT", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-202", "name": "Efficience PAR CHAINE", "variable": "Effectif de la chaîne", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-202", "name": "Efficience PAR CHAINE", "variable": "Minutes présence", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-203", "name": "Efficience Cumulée chaine", "variable": "Minutes produites", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-203", "name": "Efficience Cumulée chaine", "variable": "Minutes présence", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-203", "name": "Efficience Cumulée chaine", "variable": "Mois en cours", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-204", "name": "OWE par chaine", "variable": "Quantité déclarée par chaîne", "cible_operator": ">", "cible_value": 70, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-204", "name": "OWE par chaine", "variable": "SAM", "cible_operator": ">", "cible_value": 70, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-204", "name": "OWE par chaine", "variable": "Effectif de la chaîne", "cible_operator": ">", "cible_value": 70, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-204", "name": "OWE par chaine", "variable": "Minutes présence", "cible_operator": ">", "cible_value": 70, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-205", "name": "WIP par chaine", "variable": "Quantité engagement par chaîne", "cible_operator": "<=", "cible_value": 0.5, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-205", "name": "WIP par chaine", "variable": "Quantité sortie par chaîne", "cible_operator": "<=", "cible_value": 0.5, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-206", "name": "WIP OPTIMAL", "variable": "Quantité engagement", "cible_operator": ">=", "cible_value": 1.5, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-206", "name": "WIP OPTIMAL", "variable": "Quantité sortie coupe", "cible_operator": ">=", "cible_value": 1.5, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-207", "name": "Arrêts non planifiés par chaine", "variable": "Temps d'arrêt", "cible_operator": "<", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-207", "name": "Arrêts non planifiés par chaine", "variable": "Motif d'arrêt", "cible_operator": "<", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-207", "name": "Arrêts non planifiés par chaine", "variable": "Période", "cible_operator": "<", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-208", "name": "Efficience Départage PAR OPERATRICE", "variable": "Minutes produites poste 221", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-208", "name": "Efficience Départage PAR OPERATRICE", "variable": "Minutes présence", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-209", "name": "Efficience Vignettes PAR OPERATRICE", "variable": "Minutes produites poste 213", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-209", "name": "Efficience Vignettes PAR OPERATRICE", "variable": "Minutes présence", "cible_operator": ">", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-210", "name": "Top opérateurs coupe", "variable": "Quantité produite individuelle", "cible_operator": ">=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-210", "name": "Top opérateurs coupe", "variable": "Temps d'opération", "cible_operator": ">=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-210", "name": "Top opérateurs coupe", "variable": "Minute présence déclarée", "cible_operator": ">=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-211", "name": "SAM (Temps standard alloué) par chaine", "variable": "Temps standard alloué", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-212", "name": "SOT (Temps article fournisseur) par chaine", "variable": "Temps article fournisseur", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-213", "name": "Effectifs par chaine", "variable": "Nombre d'opérateurs exigé", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-214", "name": "Code article par chaine", "variable": "Code conception de l'article", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-215", "name": "Designation d'article par chaine", "variable": "Description", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-216", "name": "Taux d'archivage", "variable": "Nombre des OF soldés archivés", "cible_operator": "=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-216", "name": "Taux d'archivage", "variable": "Nombre total des OF", "cible_operator": "=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-217", "name": "Taux de fiabilité des données sur système par OF", "variable": "Tagging réel", "cible_operator": "=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-217", "name": "Taux de fiabilité des données sur système par OF", "variable": "Sortie fin chaîne", "cible_operator": "=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-218", "name": "Taux de respect du temps estimé par ARTICLE", "variable": "Temps cotation", "cible_operator": "=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-218", "name": "Taux de respect du temps estimé par ARTICLE", "variable": "Temps production", "cible_operator": "=", "cible_value": 90, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-219", "name": "Taux des temps acceptés dès la première version par ARTICLE", "variable": "Demandes de négociation", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "weekly" },
  { "kpi": "F-REQ-219", "name": "Taux des temps acceptés dès la première version par ARTICLE", "variable": "Gammes déchiffrage", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "weekly" },

  { "kpi": "F-REQ-301", "name": "OF ou OFs confection par CHAINE", "variable": "Numéro Ordre de Fabrication", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-301", "name": "OF ou OFs confection par CHAINE", "variable": "OF en cours production", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-302", "name": "OF encours ou OFs coupe", "variable": "Numéro Ordre de Fabrication", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-302", "name": "OF encours ou OFs coupe", "variable": "OF lancés", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-302", "name": "OF encours ou OFs coupe", "variable": "OF créés sur G.PRO", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-303", "name": "Quantité OF ou OFs par ARTICLE", "variable": "Quantité OF", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-304", "name": "SO Progress par OF", "variable": "État d'avancement des commandes", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-304", "name": "SO Progress par OF", "variable": "Point de contrôle", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-305", "name": "Taux d'avancement OF par OF par chaine", "variable": "Quantité produite déclarée", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-305", "name": "Taux d'avancement OF par OF par chaine", "variable": "Quantité OF", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-306", "name": "BPD (Beginning Production Date) par OF par chaine", "variable": "Date de début de commande", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-307", "name": "EPD (End Production Date) par OF par chaine", "variable": "Date de fin prévue de production", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-307", "name": "EPD (End Production Date) par OF par chaine", "variable": "Quantité réalisée", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-307", "name": "EPD (End Production Date) par OF par chaine", "variable": "Cadence allouée", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-308", "name": "EHD par OF par chaine", "variable": "Date d'export prévue", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-308", "name": "EHD par OF par chaine", "variable": "Commande en cours", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-309", "name": "COUVERTURE Sérigraphie", "variable": "Quantité entrée sérigraphie 236", "cible_operator": ">", "cible_value": null, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-309", "name": "COUVERTURE Sérigraphie", "variable": "Quantité produite 239", "cible_operator": ">", "cible_value": null, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-310", "name": "Couverture chaine", "variable": "Quantité engagée", "cible_operator": ">", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-310", "name": "Couverture chaine", "variable": "Quantité planifiée", "cible_operator": ">", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-310", "name": "Couverture chaine", "variable": "Cadence moyenne", "cible_operator": ">", "cible_value": 10, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-311", "name": "Couverture Coupe", "variable": "Quantité lancée", "cible_operator": ">", "cible_value": null, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-311", "name": "Couverture Coupe", "variable": "Quantité coupée", "cible_operator": ">", "cible_value": null, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-311", "name": "Couverture Coupe", "variable": "Cadence hebdomadaire moyenne", "cible_operator": ">", "cible_value": null, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-312", "name": "Objectif par chaine", "variable": "Objectif journalier prévu", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-313", "name": "Taux de fiabilité stock accessoires", "variable": "Quantité physique", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-313", "name": "Taux de fiabilité stock accessoires", "variable": "Quantité système", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-314", "name": "Taux de fiabilité stock tissu", "variable": "Quantité physique", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-314", "name": "Taux de fiabilité stock tissu", "variable": "Quantité système", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-315", "name": "Taux de fiabilité stock FG", "variable": "Quantité physique", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },
  { "kpi": "F-REQ-315", "name": "Taux de fiabilité stock FG", "variable": "Quantité système", "cible_operator": ">", "cible_value": 99.5, "cible_is_percentage": true, "refresh_frequency": "daily" },

  { "kpi": "F-REQ-316", "name": "Taux de rotation stock accessoires", "variable": "Coût des marchandises", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-316", "name": "Taux de rotation stock accessoires", "variable": "Stock moyen", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-317", "name": "Taux de rotation stock tissu", "variable": "Coût des marchandises", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-317", "name": "Taux de rotation stock tissu", "variable": "Stock moyen", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-318", "name": "Taux de rotation stock FG", "variable": "Coût des marchandises", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-318", "name": "Taux de rotation stock FG", "variable": "Stock moyen", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-319", "name": "Taux de stock mort accessoires", "variable": "Valeur des articles sans mouvement durant 365 jours", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-319", "name": "Taux de stock mort accessoires", "variable": "Valeur totale du stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-320", "name": "Taux de stock mort tissu", "variable": "Valeur des articles sans mouvement durant 365 jours", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-320", "name": "Taux de stock mort tissu", "variable": "Valeur totale du stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-321", "name": "Taux de stock mort stock FG", "variable": "Valeur des articles sans mouvement durant 365 jours", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-321", "name": "Taux de stock mort stock FG", "variable": "Valeur totale du stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-322", "name": "Taux d'occupation Accessoires", "variable": "Nombre de rouleaux", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-322", "name": "Taux d'occupation Accessoires", "variable": "Capacité de stockage", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-323", "name": "Taux d'occupation tissu", "variable": "Nombre de rouleaux", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-323", "name": "Taux d'occupation tissu", "variable": "Capacité de stockage", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-324", "name": "Taux d'occupation stock FG", "variable": "Nombre de rouleaux", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-324", "name": "Taux d'occupation stock FG", "variable": "Capacité de stockage", "cible_operator": "<=", "cible_value": 85, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-325", "name": "Taux de commandes livrées à temps Accessoires", "variable": "Commandes livrées", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-325", "name": "Taux de commandes livrées à temps Accessoires", "variable": "Date de transfert", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-325", "name": "Taux de commandes livrées à temps Accessoires", "variable": "Transfert coupe", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-325", "name": "Taux de commandes livrées à temps Accessoires", "variable": "Transfert coupe Jemmel", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-326", "name": "Taux de commandes livrées à temps tissu", "variable": "Commandes livrées", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-326", "name": "Taux de commandes livrées à temps tissu", "variable": "Date de transfert", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-326", "name": "Taux de commandes livrées à temps tissu", "variable": "Transfert coupe", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-326", "name": "Taux de commandes livrées à temps tissu", "variable": "Transfert coupe Jemmel", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-327", "name": "Taux de commandes livrées à temps stock FG", "variable": "Commandes livrées", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-327", "name": "Taux de commandes livrées à temps stock FG", "variable": "Date de transfert", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-327", "name": "Taux de commandes livrées à temps stock FG", "variable": "Transfert coupe", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-327", "name": "Taux de commandes livrées à temps stock FG", "variable": "Transfert coupe Jemmel", "cible_operator": ">=", "cible_value": 80, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-328", "name": "Délai de livraison d'une commande Accessoires", "variable": "Date de transfert", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-328", "name": "Délai de livraison d'une commande Accessoires", "variable": "Date de réservation", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-329", "name": "Délai de livraison d'une commande tissu", "variable": "Date de transfert", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-329", "name": "Délai de livraison d'une commande tissu", "variable": "Date de réservation", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-330", "name": "Délai de livraison d'une commande stock FG", "variable": "Date de transfert", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-330", "name": "Délai de livraison d'une commande stock FG", "variable": "Date de réservation", "cible_operator": "=", "cible_value": 1, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-331", "name": "STOCK/Typologie", "variable": "Typologie fournitures", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-331", "name": "STOCK/Typologie", "variable": "Valeur stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-332", "name": "STOCK/provenance", "variable": "Provenance", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-332", "name": "STOCK/provenance", "variable": "Valeur stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-333", "name": "STOCK/Brand", "variable": "Famille FG", "refresh_frequency": "instant" },
  { "kpi": "F-REQ-333", "name": "STOCK/Brand", "variable": "Valeur stock", "refresh_frequency": "instant" },

  { "kpi": "F-REQ-334", "name": "DOT (Delivery)", "variable": "Quantité livrée", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-334", "name": "DOT (Delivery)", "variable": "Quantité commandée", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-335", "name": "HOT (Handover)", "variable": "Quantité livrée", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-335", "name": "HOT (Handover)", "variable": "Quantité commandée", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-336", "name": "Respect Planif.", "variable": "Quantité réalisée", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-336", "name": "Respect Planif.", "variable": "Objectif journalier", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-336", "name": "Respect Planif.", "variable": "Chaîne de montage", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-337", "name": "Lead Time Global", "variable": "STRH", "cible_operator": "=", "cible_value": 32, "cible_is_percentage": false, "refresh_frequency": "instant" },
  { "kpi": "F-REQ-337", "name": "Lead Time Global", "variable": "Lead Time Transport", "cible_operator": "=", "cible_value": 32, "cible_is_percentage": false, "refresh_frequency": "instant" },

  { "kpi": "F-REQ-350", "name": "RFT (RIGHT FIRST TIME)", "variable": "Nombre de modèles validés de premier coup", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "monthly" },
  { "kpi": "F-REQ-350", "name": "RFT (RIGHT FIRST TIME)", "variable": "Total des modèles envoyés", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "monthly" },

  { "kpi": "F-REQ-351", "name": "Taux de respect de livraison à date", "variable": "Nombre de modèles envoyés à date", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "monthly" },
  { "kpi": "F-REQ-351", "name": "Taux de respect de livraison à date", "variable": "Total des modèles envoyés", "cible_operator": ">=", "cible_value": 95, "cible_is_percentage": true, "refresh_frequency": "monthly" },

  { "kpi": "F-REQ-352", "name": "Taux de fiabilité de nomenclature", "variable": "Nombre de nomenclatures validées et fiables", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "monthly" },
  { "kpi": "F-REQ-352", "name": "Taux de fiabilité de nomenclature", "variable": "Total des nomenclatures", "cible_operator": ">=", "cible_value": 98, "cible_is_percentage": true, "refresh_frequency": "monthly" },

  { "kpi": "F-REQ-353", "name": "% réclamations de la production", "variable": "Nombre de modèles réclamés", "cible_operator": "<", "cible_value": 2, "cible_is_percentage": true, "refresh_frequency": "monthly" },
  { "kpi": "F-REQ-353", "name": "% réclamations de la production", "variable": "Total des modèles", "cible_operator": "<", "cible_value": 2, "cible_is_percentage": true, "refresh_frequency": "monthly" }
];