NOVACITY API 
Réponses JSON — Endpoints configurés & Requêtes SQL personnalisées 
Version 1.2 — 2026-04-28 
1. Introduction 
Ce document présente les réponses JSON attendues pour chacune des routes de l'API 
Novacity exposées aux prestataires : 
• Section 2 — 22 endpoints configurés (tables et vues des bases DIVATEX, SDT et QCM), 
exposés via /api/data/:nom. 
• Section 3 — 36 requêtes SQL personnalisées, exposées via /api/data/q/:nom. 
• Section 4 — 39 jobs planifiés (cron), gérés en interne par les administrateurs via 
/api/admin/jobs. 
Toutes les routes exigent l'en-tête d'authentification x-api-key: <clé_prestataire>. Les 
réponses sont paginées via les paramètres query limit (défaut 100, max 500 pour les 
endpoints, 1000 pour les requêtes) et offset (défaut 0). 
Chaque réponse renvoie un booléen success ainsi que le nombre de lignes (count) et le 
tableau data. Les exemples ci-dessous sont représentatifs ; les valeurs et volumes réels 
dépendent de la donnée présente dans les bases cibles au moment de l'appel. 
2. Endpoints configurés 
Les endpoints configurés exposent dynamiquement une table ou une vue d'une source, en 
restreignant les colonnes visibles. Le filtre date est désactivé (none) pour l'ensemble des 
endpoints listés ci-dessous (cf. capture admin). 
2.1  ItemTrxEnq  (SDT) 
GET 
/api/data/itemtrxenq?limit=100&offset=0 
x-api-key 
Source : SDT 
Objet : vwItemTrxEnq  (view) 
Colonnes : IsSplit, SONo, TransactionID, ItemNo, OpNo 
Filtre date : none 
Réponse (JSON) 
{ 
"success": true, 
"endpoint": "itemtrxenq", 
"label": "ItemTrxEnq", 
"source": "SDT", 
"object": "vwItemTrxEnq", 
"object_type": "view", 
"columns": [ 
"IsSplit", 
"SONo", 
"TransactionID", 
"ItemNo", 
"OpNo" 
], 
"date_filter": "none", 
"count": 3, 
"data": [ 
{ 
"IsSplit": 0, 
      "SONo": "SO-2026-0417", 
      "TransactionID": 10238451, 
      "ItemNo": "ART-001", 
      "OpNo": "OP10" 
    }, 
    { 
      "IsSplit": 1, 
      "SONo": "SO-2026-0418", 
      "TransactionID": 10238452, 
      "ItemNo": "ART-002", 
      "OpNo": "OP20" 
    }, 
    { 
      "IsSplit": 0, 
      "SONo": "SO-2026-0419", 
      "TransactionID": 10238453, 
      "ItemNo": "ART-003", 
      "OpNo": "OP30" 
    } 
  ] 
} 
 
2.2  vwItemTrx  (SDT) 
GET /api/data/vwitemtrx?limit=100&offset=0 x-api-key 
Source : SDT 
Objet : vwItemTrx  (view) 
Colonnes : TransactionID, LogDate, ShiftCode, ProdGroup 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "vwitemtrx", 
  "label": "vwItemTrx", 
  "source": "SDT", 
  "object": "vwItemTrx", 
  "object_type": "view", 
  "columns": [ 
    "TransactionID", 
    "LogDate", 
    "ShiftCode", 
    "ProdGroup" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "TransactionID": 55410, 
      "LogDate": "2026-04-20T06:45:12.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01" 
    }, 
    { 
      "TransactionID": 55411, 
      "LogDate": "2026-04-20T07:02:33.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G02" 
    }, 
    { 
      "TransactionID": 55412, 
      "LogDate": "2026-04-20T14:15:00.000Z", 
      "ShiftCode": "S2", 
      "ProdGroup": "G01" 
    } 
  ] 
} 
 
2.3  LostType  (SDT) 
GET /api/data/losttype?limit=100&offset=0 x-api-key 
Source : SDT 
Objet : vwLostType  (view) 
Colonnes : LostTypeID, LostTypeCode, LostTypeDesc 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "losttype", 
  "label": "LostType", 
  "source": "SDT", 
  "object": "vwLostType", 
  "object_type": "view", 
  "columns": [ 
    "LostTypeID", 
    "LostTypeCode", 
    "LostTypeDesc" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LostTypeID": 1, 
      "LostTypeCode": "MAINT", 
      "LostTypeDesc": "Arrêt maintenance" 
    }, 
    { 
      "LostTypeID": 2, 
      "LostTypeCode": "MATIERE", 
      "LostTypeDesc": "Rupture matière" 
    }, 
    { 
      "LostTypeID": 3, 
      "LostTypeCode": "QUALITE", 
      "LostTypeDesc": "Problème qualité" 
    } 
  ] 
} 
 
2.4  LostTimeTrx  (SDT) 
GET /api/data/losttimetrx?limit=100&offset=0 x-api-key 
Source : SDT 
Objet : vwLostTimeTrx  (view) 
Colonnes : LogDate, ShiftCode, ProdGroup, EmployeeNo 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "losttimetrx", 
  "label": "LostTimeTrx", 
  "source": "SDT", 
  "object": "vwLostTimeTrx", 
  "object_type": "view", 
  "columns": [ 
    "LogDate", 
    "ShiftCode", 
    "ProdGroup", 
    "EmployeeNo" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LogDate": "2026-04-20T08:12:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01", 
      "EmployeeNo": "EMP0123" 
    }, 
    { 
      "LogDate": "2026-04-20T10:44:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G02", 
      "EmployeeNo": "EMP0456" 
    }, 
    { 
      "LogDate": "2026-04-20T13:05:00.000Z", 
      "ShiftCode": "S2", 
      "ProdGroup": "G01", 
      "EmployeeNo": "EMP0789" 
    } 
  ] 
} 
 
2.5  RoverEffectiveness  (QCM) 
GET /api/data/rovereffectiveness?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : vwRoverEffectiveness  (view) 
Colonnes : LOGDATE, ShiftCode, SHORTNAME, MONO 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "rovereffectiveness", 
  "label": "RoverEffectiveness", 
  "source": "QCM", 
  "object": "vwRoverEffectiveness", 
  "object_type": "view", 
  "columns": [ 
    "LOGDATE", 
    "ShiftCode", 
    "SHORTNAME", 
    "MONO" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH1", 
      "MONO": 92.5 
    }, 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "SHORTNAME": "CH1", 
      "MONO": 88.1 
    }, 
    { 
      "LOGDATE": "2026-04-21T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH2", 
      "MONO": 90.3 
    } 
  ] 
} 
 
2.6  Production  (QCM) 
GET /api/data/production?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : vwProduction  (view) 
Colonnes : LogDate, ShiftCode, ProdGroup, LoginManp 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "production", 
  "label": "Production", 
  "source": "QCM", 
  "object": "vwProduction", 
  "object_type": "view", 
  "columns": [ 
    "LogDate", 
    "ShiftCode", 
    "ProdGroup", 
    "LoginManp" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01", 
      "LoginManp": "manp_a" 
    }, 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "ProdGroup": "G02", 
      "LoginManp": "manp_b" 
    }, 
    { 
      "LogDate": "2026-04-21T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01", 
      "LoginManp": "manp_c" 
    } 
  ] 
} 
 
2.7  InlineVSEndlineComparison  (QCM) 
GET /api/data/inlinevsendlinecomparison?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : vwInlineVSEndlineComparison  (view) 
Colonnes : LOGDATE, ShiftCode, SHORTNAME, OPERA 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "inlinevsendlinecomparison", 
  "label": "InlineVSEndlineComparison", 
  "source": "QCM", 
  "object": "vwInlineVSEndlineComparison", 
  "object_type": "view", 
  "columns": [ 
    "LOGDATE", 
    "ShiftCode", 
    "SHORTNAME", 
    "OPERA" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH1", 
      "OPERA": "OP010" 
    }, 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH1", 
      "OPERA": "OP020" 
    }, 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "SHORTNAME": "CH2", 
      "OPERA": "OP010" 
    } 
  ] 
} 
 
2.8  EmpDefectEff  (QCM) 
GET /api/data/empdefecteff?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : vwEmpDefectEff  (view) 
Colonnes : LogDate, ShiftCode, ProdGroup, EmployeeNo 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "empdefecteff", 
  "label": "EmpDefectEff", 
  "source": "QCM", 
  "object": "vwEmpDefectEff", 
  "object_type": "view", 
  "columns": [ 
    "LogDate", 
    "ShiftCode", 
    "ProdGroup", 
    "EmployeeNo" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01", 
      "EmployeeNo": "EMP0123" 
    }, 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G02", 
      "EmployeeNo": "EMP0456" 
    }, 
    { 
      "LogDate": "2026-04-21T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "ProdGroup": "G01", 
      "EmployeeNo": "EMP0789" 
    } 
  ] 
} 
 
2.9  vwDefect  (QCM) 
GET /api/data/vwdefect?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : vwDefect  (view) 
Colonnes : LOGDATE, ShiftCode, ProdGroup, OpNo, Qty 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "vwdefect", 
  "label": "vwDefect", 
  "source": "QCM", 
  "object": "vwDefect", 
  "object_type": "view", 
  "columns": [ 
    "LOGDATE", 
    "ShiftCode", 
    "ProdGroup", 
    "OpNo", 
    "Qty" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G01", 
      "OpNo": "OP10", 
      "Qty": 4 
    }, 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "ProdGroup": "G02", 
      "OpNo": "OP20", 
      "Qty": 2 
    }, 
    { 
      "LOGDATE": "2026-04-21T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "ProdGroup": "G01", 
      "OpNo": "OP30", 
      "Qty": 7 
    } 
  ] 
} 
 
2.10  reject_qte  (QCM) 
GET /api/data/reject_qte?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : RejectQty  (view) 
Colonnes : LogDate, ShiftCode, SHORTNAME, STYLECODE 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "reject_qte", 
  "label": "reject_qte", 
  "source": "QCM", 
  "object": "RejectQty", 
  "object_type": "view", 
  "columns": [ 
    "LogDate", 
    "ShiftCode", 
    "SHORTNAME", 
    "STYLECODE" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH1", 
      "STYLECODE": "STY-A01" 
    }, 
    { 
      "LogDate": "2026-04-20T00:00:00.000Z", 
      "ShiftCode": "S2", 
      "SHORTNAME": "CH1", 
      "STYLECODE": "STY-A02" 
    }, 
    { 
      "LogDate": "2026-04-21T00:00:00.000Z", 
      "ShiftCode": "S1", 
      "SHORTNAME": "CH2", 
      "STYLECODE": "STY-B01" 
    } 
  ] 
} 
 
2.11  qcmdefecttrx  (QCM) 
GET /api/data/qcmdefecttrx?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : QCMDefectTrx  (view) 
Colonnes : LOGDATE, ShiftCode, GROUPID, TicketID, ITEMID 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "qcmdefecttrx", 
  "label": "qcmdefecttrx", 
  "source": "QCM", 
  "object": "QCMDefectTrx", 
  "object_type": "view", 
  "columns": [ 
    "LOGDATE", 
    "ShiftCode", 
    "GROUPID", 
    "TicketID", 
    "ITEMID" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LOGDATE": "2026-04-20T09:00:00.000Z", 
      "ShiftCode": "S1", 
      "GROUPID": "G01", 
      "TicketID": "TK-10001", 
      "ITEMID": "IT-A01" 
    }, 
    { 
      "LOGDATE": "2026-04-20T10:15:00.000Z", 
      "ShiftCode": "S1", 
      "GROUPID": "G02", 
      "TicketID": "TK-10002", 
      "ITEMID": "IT-A02" 
    }, 
    { 
      "LOGDATE": "2026-04-21T08:30:00.000Z", 
      "ShiftCode": "S2", 
      "GROUPID": "G01", 
      "TicketID": "TK-10003", 
      "ITEMID": "IT-B01" 
    } 
  ] 
} 
 
2.12  checkpassqte  (QCM) 
GET /api/data/checkpassqte?limit=100&offset=0 x-api-key 
Source : QCM 
Objet : QCCheckPassQty  (view) 
Colonnes : LOGDATE, SHORTNAME, ShiftCode, DefectPct 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "checkpassqte", 
  "label": "checkpassqte", 
  "source": "QCM", 
  "object": "QCCheckPassQty", 
  "object_type": "view", 
  "columns": [ 
    "LOGDATE", 
    "SHORTNAME", 
    "ShiftCode", 
    "DefectPct" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "SHORTNAME": "CH1", 
      "ShiftCode": "S1", 
      "DefectPct": 1.23 
    }, 
    { 
      "LOGDATE": "2026-04-20T00:00:00.000Z", 
      "SHORTNAME": "CH1", 
      "ShiftCode": "S2", 
      "DefectPct": 0.85 
    }, 
    { 
      "LOGDATE": "2026-04-21T00:00:00.000Z", 
      "SHORTNAME": "CH2", 
      "ShiftCode": "S1", 
      "DefectPct": 2.1 
    } 
  ] 
} 
 
2.13  mp_famille  (DIVATEX) 
GET /api/data/mp_famille?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : mp_famille  (table) 
Colonnes : IDMPFamille, Famille, Etat, Code, Ordre, Type 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "mp_famille", 
  "label": "mp_famille", 
  "source": "DIVATEX", 
  "object": "mp_famille", 
  "object_type": "table", 
  "columns": [ 
    "IDMPFamille", 
    "Famille", 
    "Etat", 
    "Code", 
    "Ordre", 
    "Type" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDMPFamille": 1, 
      "Famille": "Coton", 
      "Etat": 1, 
      "Code": "COT", 
      "Ordre": 1, 
      "Type": "M" 
    }, 
    { 
      "IDMPFamille": 2, 
      "Famille": "Lin", 
      "Etat": 1, 
      "Code": "LIN", 
      "Ordre": 2, 
      "Type": "M" 
    }, 
    { 
      "IDMPFamille": 3, 
      "Famille": "Polyester", 
      "Etat": 1, 
      "Code": "POL", 
      "Ordre": 3, 
      "Type": "M" 
    } 
  ] 
} 
 
2.14  mp  (DIVATEX) 
GET /api/data/mp?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : mp  (table) 
Colonnes : IDMPFamille, IDMP, Description, Commentaire 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "mp", 
  "label": "mp", 
  "source": "DIVATEX", 
  "object": "mp", 
  "object_type": "table", 
  "columns": [ 
    "IDMPFamille", 
    "IDMP", 
    "Description", 
    "Commentaire" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDMPFamille": 1, 
      "IDMP": 1001, 
      "Description": "Coton blanc 180g", 
      "Commentaire": "Stock principal" 
    }, 
    { 
      "IDMPFamille": 1, 
      "IDMP": 1002, 
      "Description": "Coton ecru 200g", 
      "Commentaire": null 
    }, 
    { 
      "IDMPFamille": 2, 
      "IDMP": 1101, 
      "Description": "Lin naturel 150g", 
      "Commentaire": "Import" 
    } 
  ] 
} 
 
2.15  ofabrication  (DIVATEX) 
GET /api/data/ofabrication?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : ofabrication  (table) 
Colonnes : IDOFabrication, OFabrication, DtDebut, DtFin 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "ofabrication", 
  "label": "ofabrication", 
  "source": "DIVATEX", 
  "object": "ofabrication", 
  "object_type": "table", 
  "columns": [ 
    "IDOFabrication", 
    "OFabrication", 
    "DtDebut", 
    "DtFin" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDOFabrication": 7845, 
      "OFabrication": "OF-2026-0412", 
      "DtDebut": "2026-04-12T06:00:00.000Z", 
      "DtFin": "2026-04-15T18:00:00.000Z" 
    }, 
    { 
      "IDOFabrication": 7846, 
      "OFabrication": "OF-2026-0413", 
      "DtDebut": "2026-04-13T06:00:00.000Z", 
      "DtFin": null 
    }, 
    { 
      "IDOFabrication": 7847, 
      "OFabrication": "OF-2026-0414", 
      "DtDebut": "2026-04-14T06:00:00.000Z", 
      "DtFin": null 
    } 
  ] 
} 
 
2.16  mouvement  (DIVATEX) 
GET /api/data/mouvement?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : mouvement  (table) 
Colonnes : IDBonLivraisonAchat, IDSynchronisation, IDMvt 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "mouvement", 
  "label": "mouvement", 
  "source": "DIVATEX", 
  "object": "mouvement", 
  "object_type": "table", 
  "columns": [ 
    "IDBonLivraisonAchat", 
    "IDSynchronisation", 
    "IDMvt" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDBonLivraisonAchat": 4521, 
      "IDSynchronisation": 8812, 
      "IDMvt": 100234 
    }, 
    { 
      "IDBonLivraisonAchat": 4522, 
      "IDSynchronisation": 8813, 
      "IDMvt": 100235 
    }, 
    { 
      "IDBonLivraisonAchat": 4523, 
      "IDSynchronisation": 8814, 
      "IDMvt": 100236 
    } 
  ] 
} 
 
2.17  mpconteneur  (DIVATEX) 
GET 
/api/data/mpconteneur?limit=100&offset=0 
x-api-key 
Source : DIVATEX 
Objet : mp_conteneur  (table) 
Colonnes : IDMPFamille, IDMP_Conteneur, NumConteneur 
Filtre date : none 
Réponse (JSON) 
{ 
} 
"success": true, 
"endpoint": "mpconteneur", 
"label": "mpconteneur", 
"source": "DIVATEX", 
"object": "mp_conteneur", 
"object_type": "table", 
"columns": [ 
"IDMPFamille", 
"IDMP_Conteneur", 
"NumConteneur" 
], 
"date_filter": "none", 
"count": 3, 
"data": [ 
{ 
"IDMPFamille": 1, 
"IDMP_Conteneur": 5001, 
"NumConteneur": "CTN-AB1234" 
}, 
{ 
"IDMPFamille": 1, 
"IDMP_Conteneur": 5002, 
"NumConteneur": "CTN-AB1235" 
}, 
{ 
"IDMPFamille": 2, 
"IDMP_Conteneur": 5101, 
"NumConteneur": "CTN-CD9876" 
} 
] 
2.18  articlescolis  (DIVATEX) 
GET 
/api/data/articlescolis?limit=100&offset=0 
x-api-key 
Source : DIVATEX 
Objet : articlecolis  (table) 
Colonnes : IDArticleColis, IDColis, IDArticle, IDAr_Couleur 
Filtre date : none 
Réponse (JSON) 
{ 
"success": true, 
"endpoint": "articlescolis", 
"label": "articlescolis", 
"source": "DIVATEX", 
"object": "articlecolis", 
"object_type": "table", 
"columns": [ 
    "IDArticleColis", 
    "IDColis", 
    "IDArticle", 
    "IDAr_Couleur" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDArticleColis": 30001, 
      "IDColis": 2001, 
      "IDArticle": 501, 
      "IDAr_Couleur": 12 
    }, 
    { 
      "IDArticleColis": 30002, 
      "IDColis": 2001, 
      "IDArticle": 502, 
      "IDAr_Couleur": 12 
    }, 
    { 
      "IDArticleColis": 30003, 
      "IDColis": 2002, 
      "IDArticle": 503, 
      "IDAr_Couleur": 7 
    } 
  ] 
} 
 
2.19  detail colis  (DIVATEX) 
GET /api/data/detailcolis?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : detailcolis  (table) 
Colonnes : IDDetailColis, IDColis, IdTaille, LibTaille, Qtte 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "detailcolis", 
  "label": "detail colis", 
  "source": "DIVATEX", 
  "object": "detailcolis", 
  "object_type": "table", 
  "columns": [ 
    "IDDetailColis", 
    "IDColis", 
    "IdTaille", 
    "LibTaille", 
    "Qtte" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDDetailColis": 70001, 
      "IDColis": 2001, 
      "IdTaille": 3, 
      "LibTaille": "M", 
      "Qtte": 12 
    }, 
    { 
      "IDDetailColis": 70002, 
      "IDColis": 2001, 
      "IdTaille": 4, 
      "LibTaille": "L", 
      "Qtte": 10 
    }, 
    { 
      "IDDetailColis": 70003, 
      "IDColis": 2002, 
      "IdTaille": 5, 
      "LibTaille": "XL", 
      "Qtte": 8 
    } 
  ] 
} 
 
2.20  expeditions  (DIVATEX) 
GET /api/data/expeditions?limit=100&offset=0 x-api-key 
Source : DIVATEX 
Objet : expedition  (table) 
Colonnes : IDExpedition, LibExpedition, DateCreation 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "expeditions", 
  "label": "expeditions", 
  "source": "DIVATEX", 
  "object": "expedition", 
  "object_type": "table", 
  "columns": [ 
    "IDExpedition", 
    "LibExpedition", 
    "DateCreation" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDExpedition": 901, 
      "LibExpedition": "EXP-2026-0401", 
      "DateCreation": "2026-04-01T09:00:00.000Z" 
    }, 
    { 
      "IDExpedition": 902, 
      "LibExpedition": "EXP-2026-0408", 
      "DateCreation": "2026-04-08T11:30:00.000Z" 
    }, 
    { 
      "IDExpedition": 903, 
      "LibExpedition": "EXP-2026-0415", 
      "DateCreation": "2026-04-15T14:45:00.000Z" 
    } 
  ] 
} 
 
2.21  vue_stock  (DIVATEX) 
GET 
/api/data/vue_stock?limit=100&offset=0 
x-api-key 
Source : DIVATEX 
Objet : v_stockmp  (view) 
Colonnes : idmp, codemp, designation, Couleur, Famille 
Filtre date : none 
Réponse (JSON) 
{ 
} 
"success": true, 
"endpoint": "vue_stock", 
"label": "vue_stock", 
"source": "DIVATEX", 
"object": "v_stockmp", 
"object_type": "view", 
"columns": [ 
"idmp", 
"codemp", 
"designation", 
"Couleur", 
"Famille" 
], 
"date_filter": "none", 
"count": 3, 
"data": [ 
{ 
"idmp": 1001, 
"codemp": "MP-001", 
"designation": "Coton blanc 180g", 
"Couleur": "Blanc", 
"Famille": "Coton" 
}, 
{ 
"idmp": 1002, 
"codemp": "MP-002", 
"designation": "Coton ecru 200g", 
"Couleur": "Ecru", 
"Famille": "Coton" 
}, 
{ 
} 
] 
"idmp": 1101, 
"codemp": "MP-101", 
"designation": "Lin naturel 150g", 
"Couleur": "Beige", 
"Famille": "Lin" 
2.22  diva  (DIVATEX) 
GET 
/api/data/diva_stock?limit=100&offset=0 
x-api-key 
Source : DIVATEX 
Objet : mvtstock  (table) 
Colonnes : IDMvtStock, IDMP, IDMagasin, Qtte, qtteReserve 
Filtre date : none 
Réponse (JSON) 
{ 
  "success": true, 
  "endpoint": "diva_stock", 
  "label": "diva", 
  "source": "DIVATEX", 
  "object": "mvtstock", 
  "object_type": "table", 
  "columns": [ 
    "IDMvtStock", 
    "IDMP", 
    "IDMagasin", 
    "Qtte", 
    "qtteReserve" 
  ], 
  "date_filter": "none", 
  "count": 3, 
  "data": [ 
    { 
      "IDMvtStock": 880012, 
      "IDMP": 1001, 
      "IDMagasin": 1, 
      "Qtte": 500, 
      "qtteReserve": 120 
    }, 
    { 
      "IDMvtStock": 880013, 
      "IDMP": 1002, 
      "IDMagasin": 1, 
      "Qtte": 220, 
      "qtteReserve": 0 
    }, 
    { 
      "IDMvtStock": 880014, 
      "IDMP": 1101, 
      "IDMagasin": 2, 
      "Qtte": 75, 
      "qtteReserve": 50 
    } 
  ] 
} 
 
3. Requêtes SQL personnalisées 
Les requêtes SQL personnalisées sont des SELECT / WITH stockés côté administration et 
exécutés sur la source associée. Le prestataire y accède par le slug de la requête. Toutes 
les requêtes listées ci-dessous sont actives. 
3.1  colis_total_3var  (DIVATEX) 
GET /api/data/q/colis_total_3var?limit=100&offset=0 x-api-key 
Slug : colis_total_3var 
Source : DIVATEX 
État : Actif 
Totaux colis agrégés sur 3 variables. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "colis_total_3var", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "commande": "CMD-2026-0101", 
      "article": "ART-001", 
      "couleur": "Blanc", 
      "total_colis": 24, 
      "total_pieces": 288 
    }, 
    { 
      "commande": "CMD-2026-0101", 
      "article": "ART-002", 
      "couleur": "Noir", 
      "total_colis": 12, 
      "total_pieces": 144 
    }, 
    { 
      "commande": "CMD-2026-0102", 
      "article": "ART-003", 
      "couleur": "Rouge", 
      "total_colis": 18, 
      "total_pieces": 216 
    } 
  ] 
} 
 
3.2  packets_rejetes  (DIVATEX) 
GET /api/data/q/packets_rejetes?limit=100&offset=0 x-api-key 
Slug : packets_rejetes 
Source : DIVATEX 
État : Actif 
Liste des paquets rejetés. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "packets_rejetes", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "IDColis": 2001, 
      "reference": "PK-0001", 
      "motif": "Défaut couture", 
      "qtte": 12, 
      "date_rejet": "2026-04-19T10:12:00.000Z" 
    }, 
    { 
      "IDColis": 2005, 
      "reference": "PK-0005", 
      "motif": "Erreur taille", 
      "qtte": 8, 
      "date_rejet": "2026-04-19T13:40:00.000Z" 
    }, 
    { 
      "IDColis": 2011, 
"reference": "PK-0011", 
"motif": "Tache tissu", 
"qtte": 4, 
"date_rejet": "2026-04-20T09:05:00.000Z" 
} 
] 
} 
3.3  wip_chaine  (SDT) 
GET 
/api/data/q/wip_chaine?limit=100&offset=0 
Slug : wip_chaine 
Source : SDT 
État : Actif 
x-api-key 
Work In Progress par chaîne de production. 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "wip_chaine", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"chaine": "CH1", 
"en_cours": 1820, 
"entree_jour": 420, 
"sortie_jour": 390 
}, 
{ 
"chaine": "CH2", 
"en_cours": 945, 
"entree_jour": 310, 
"sortie_jour": 305 
}, 
{ 
"chaine": "CH3", 
"en_cours": 1200, 
"entree_jour": 280, 
"sortie_jour": 260 
} 
] 
3.4  taging_reel  (SDT) 
GET 
/api/data/q/taging_reel?limit=100&offset=0 
x-api-key 
Slug : taging_reel 
Source : SDT 
État : Actif 
Tagging réel constaté. 
Réponse (JSON) 
{ 
"success": true, 
  "query": "taging_reel", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "chaine": "CH1", 
      "shift": "S1", 
      "tag_theorique": 1500, 
      "tag_reel": 1478, 
      "ecart_pct": -1.47 
    }, 
    { 
      "chaine": "CH2", 
      "shift": "S1", 
      "tag_theorique": 1200, 
      "tag_reel": 1205, 
      "ecart_pct": 0.42 
    }, 
    { 
      "chaine": "CH1", 
      "shift": "S2", 
      "tag_theorique": 1500, 
      "tag_reel": 1420, 
      "ecart_pct": -5.33 
    } 
  ] 
} 
 
3.5  etat_avancement  (SDT) 
GET /api/data/q/etat_avancement?limit=100&offset=0 x-api-key 
Slug : etat_avancement 
Source : SDT 
État : Actif 
État d'avancement des OF. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "etat_avancement", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "of": "OF-2026-0412", 
      "avancement_pct": 78.2, 
      "quantite_prevue": 3000, 
      "quantite_realisee": 2346, 
      "statut": "en_cours" 
    }, 
    { 
      "of": "OF-2026-0413", 
      "avancement_pct": 42.5, 
      "quantite_prevue": 2500, 
      "quantite_realisee": 1062, 
      "statut": "en_cours" 
    }, 
{ 
"of": "OF-2026-0414", 
"avancement_pct": 100, 
"quantite_prevue": 1800, 
"quantite_realisee": 1800, 
"statut": "termine" 
} 
] 
} 
3.6  efficience_chaine  (SDT) 
GET 
/api/data/q/efficience_chaine?limit=100&offset=0 
x-api-key 
Slug : efficience_chaine 
Source : SDT 
État : Actif 
Efficience par chaîne. 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "efficience_chaine", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"chaine": "CH1", 
"date": "2026-04-20", 
"heures_prod": 8, 
"heures_standards": 7.12, 
"efficience_pct": 89 
}, 
{ 
"chaine": "CH2", 
"date": "2026-04-20", 
"heures_prod": 8, 
"heures_standards": 6.88, 
"efficience_pct": 86 
}, 
{ 
"chaine": "CH1", 
"date": "2026-04-21", 
"heures_prod": 8, 
"heures_standards": 7.28, 
"efficience_pct": 91 
} 
] 
3.7  minutes_presence  (SDT) 
GET 
/api/data/q/minutes_presence?limit=100&offset=0 
Slug : minutes_presence 
Source : SDT 
État : Actif 
x-api-key 
Minutes de présence par employé/jour. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "minutes_presence", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "employe": "EMP0123", 
      "date": "2026-04-20", 
      "minutes_presence": 468, 
      "chaine": "CH1" 
    }, 
    { 
      "employe": "EMP0456", 
      "date": "2026-04-20", 
      "minutes_presence": 452, 
      "chaine": "CH1" 
    }, 
    { 
      "employe": "EMP0789", 
      "date": "2026-04-20", 
      "minutes_presence": 480, 
      "chaine": "CH2" 
    } 
  ] 
} 
 
3.8  minutes_produites  (SDT) 
GET /api/data/q/minutes_produites?limit=100&offset=0 x-api-key 
Slug : minutes_produites 
Source : SDT 
État : Actif 
Minutes produites par employé/jour. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "minutes_produites", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "employe": "EMP0123", 
      "date": "2026-04-20", 
      "minutes_produites": 412, 
      "chaine": "CH1" 
    }, 
    { 
      "employe": "EMP0456", 
      "date": "2026-04-20", 
      "minutes_produites": 395, 
      "chaine": "CH1" 
    }, 
{ 
"employe": "EMP0789", 
"date": "2026-04-20", 
"minutes_produites": 441, 
"chaine": "CH2" 
} 
] 
} 
3.9  temps_operation  (SDT) 
GET 
/api/data/q/temps_operation?limit=100&offset=0 
x-api-key 
Slug : temps_operation 
Source : SDT 
État : Actif 
Temps par opération. 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "temps_operation", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"operation": "OP10", 
"temps_standard_s": 42, 
"temps_reel_s": 45.2, 
"ecart_pct": 7.62 
}, 
{ 
"operation": "OP20", 
"temps_standard_s": 38.5, 
"temps_reel_s": 36.8, 
"ecart_pct": -4.42 
}, 
{ 
"operation": "OP30", 
"temps_standard_s": 55, 
"temps_reel_s": 58.3, 
"ecart_pct": 6 
} 
] 
3.10  lost_time  (SDT) 
GET 
/api/data/q/lost_time?limit=100&offset=0 
x-api-key 
Slug : lost_time 
Source : SDT 
État : Actif 
Temps perdu par motif. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "lost_time", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "motif": "MAINT", 
      "minutes_perdues": 45 
    }, 
    { 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "motif": "MATIERE", 
      "minutes_perdues": 22 
    }, 
    { 
      "date": "2026-04-20", 
      "chaine": "CH2", 
      "motif": "QUALITE", 
      "minutes_perdues": 18 
    } 
  ] 
} 
 
3.11  qte_produite  (SDT) 
GET /api/data/q/qte_produite?limit=100&offset=0 x-api-key 
Slug : qte_produite 
Source : SDT 
État : Actif 
Quantité produite par chaîne/jour. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "qte_produite", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "shift": "S1", 
      "quantite": 1478 
    }, 
    { 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "shift": "S2", 
      "quantite": 1420 
    }, 
    { 
      "date": "2026-04-20", 
      "chaine": "CH2", 
      "shift": "S1", 
} 
"quantite": 1205 
] 
} 
3.12  qte_entree_serigraphie  (SDT) 
GET 
/api/data/q/qte_entree_serigraphie?limit=100&offset=0 
x-api-key 
Slug : qte_entree_serigraphie 
Source : SDT 
État : Actif 
Quantités entrées en sérigraphie. 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "qte_entree_serigraphie", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"date": "2026-04-20", 
"article": "ART-001", 
"couleur": "Blanc", 
"quantite": 620 
}, 
{ 
"date": "2026-04-20", 
"article": "ART-002", 
"couleur": "Noir", 
"quantite": 310 
}, 
{ 
"date": "2026-04-21", 
"article": "ART-003", 
"couleur": "Rouge", 
"quantite": 450 
} 
] 
3.13  Quantité départage (par chaine par article par OF)  (SDT) 
GET 
/api/data/q/qte_depart_chaine_article_of?limit=100&offset=0 
Slug : qte_depart_chaine_article_of 
Source : SDT 
État : Actif 
Quantité répartie par chaîne / article / OF. 
Réponse (JSON) 
{ 
"success": true, 
"query": "qte_depart_chaine_article_of", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
x-api-key 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "of": "OF-2026-0412", 
      "chaine": "CH1", 
      "article": "ART-001", 
      "quantite": 1200 
    }, 
    { 
      "of": "OF-2026-0412", 
      "chaine": "CH2", 
      "article": "ART-001", 
      "quantite": 600 
    }, 
    { 
      "of": "OF-2026-0413", 
      "chaine": "CH1", 
      "article": "ART-002", 
      "quantite": 900 
    } 
  ] 
} 
 
3.14  sortie serigraphie  (SDT) 
GET /api/data/q/sortie_serigraphie?limit=100&offset=0 x-api-key 
Slug : sortie_serigraphie 
Source : SDT 
État : Actif 
Sorties de sérigraphie. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "sortie_serigraphie", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "date": "2026-04-20", 
      "article": "ART-001", 
      "couleur": "Blanc", 
      "quantite": 598 
    }, 
    { 
      "date": "2026-04-20", 
      "article": "ART-002", 
      "couleur": "Noir", 
      "quantite": 302 
    }, 
    { 
      "date": "2026-04-21", 
      "article": "ART-003", 
      "couleur": "Rouge", 
      "quantite": 438 
    } 
  ] 
} 
3.15  Quantité engagement  (SDT) 
GET 
/api/data/q/qte_engagement?limit=100&offset=0 
x-api-key 
Slug : qte_engagement 
Source : SDT 
État : Actif 
Quantité engagée par commande/OF. 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "qte_engagement", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"commande": "CMD-2026-0101", 
"of": "OF-2026-0412", 
"article": "ART-001", 
"quantite_engagee": 1800 
}, 
{ 
"commande": "CMD-2026-0102", 
"of": "OF-2026-0413", 
"article": "ART-002", 
"quantite_engagee": 900 
}, 
{ 
"commande": "CMD-2026-0103", 
"of": "OF-2026-0414", 
"article": "ART-003", 
"quantite_engagee": 1800 
} 
] 
3.16  sortie coupe par commande  (SDT) 
GET 
/api/data/q/sortie_coupe?limit=100&offset=0 
Slug : sortie_coupe 
Source : SDT 
État : Actif 
x-api-key 
Sorties de coupe agrégées par commande. 
Réponse (JSON) 
{ 
"success": true, 
"query": "sortie_coupe", 
"prestataire": "Prestataire Alpha", 
"count": 3, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"commande": "CMD-2026-0101", 
      "date": "2026-04-18", 
      "quantite_coupee": 1820 
    }, 
    { 
      "commande": "CMD-2026-0102", 
      "date": "2026-04-19", 
      "quantite_coupee": 910 
    }, 
    { 
      "commande": "CMD-2026-0103", 
      "date": "2026-04-20", 
      "quantite_coupee": 1800 
    } 
  ] 
} 
 
3.17  Quantité produite indiv/jours  (SDT) 
GET /api/data/q/qte_produite_indiv_jour?limit=100&offset=0 x-api-key 
Slug : qte_produite_indiv_jour 
Source : SDT 
État : Actif 
Quantité produite par individu et par jour. 
Réponse (JSON) 
{ 
  "success": true, 
  "query": "qte_produite_indiv_jour", 
  "prestataire": "Prestataire Alpha", 
  "count": 3, 
  "limit": 100, 
  "offset": 0, 
  "data": [ 
    { 
      "employe": "EMP0123", 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "quantite": 412, 
      "minutes_produites": 412 
    }, 
    { 
      "employe": "EMP0456", 
      "date": "2026-04-20", 
      "chaine": "CH1", 
      "quantite": 395, 
      "minutes_produites": 395 
    }, 
    { 
      "employe": "EMP0789", 
      "date": "2026-04-20", 
      "chaine": "CH2", 
      "quantite": 441, 
      "minutes_produites": 441 
    } 
  ] 
} 
3.18  pieces_ok_de_premier_coup_jour_en_cours  (QCM) 
GET /api/data/q/pieces_ok_de_premier_coup_jour_en_cours?limit=100&offset=0 
Slug : pieces_ok_de_premier_coup_jour_en_cours 
Source : QCM 
État : Actif 
Pièces OK de premier coup (jour en cours). 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "pieces_ok_de_premier_coup_jour_en_cours", 
"prestataire": "Prestataire Alpha", 
"count": 1, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"FirstPassToday": 2947 
} 
] 
3.19  pieces_produites_jour_en_cours  (QCM) 
x-api
key 
GET 
/api/data/q/pieces_produites_jour_en_cours?limit=100&offset=0 
Slug : pieces_produites_jour_en_cours 
Source : QCM 
État : Actif 
Pièces produites (jour en cours). 
x-api-key 
Réponse (JSON) 
{ 
} 
"success": true, 
"query": "pieces_produites_jour_en_cours", 
"prestataire": "Prestataire Alpha", 
"count": 1, 
"limit": 100, 
"offset": 0, 
"data": [ 
{ 
"ProducedToday": 80 
} 
] 
3.20  rejets_suite_inspection_paquet_jour_en_cours  (QCM) 
GET /api/data/q/rejets_suite_inspection_paquet_jour_en_cours?limit=100&offset=0 
x
api
key 
Slug : rejets_suite_inspection_paquet_jour_en_cours 
Source : QCM 
État : Inactif 
Rejets paquet suite inspection (jour en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "rejets_suite_inspection_paquet_jour_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "BundleRejectToday": 0 
      } 
   ] 
} 
 
3.21  inspections_paquet_jour_en_cours  (QCM) 
GET /api/data/q/inspections_paquet_jour_en_cours?limit=100&offset=0 x-api-key 
Slug : inspections_paquet_jour_en_cours 
Source : QCM 
État : Inactif 
Inspections paquet (jour en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "inspections_paquet_jour_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "BundleInspectedToday": 0 
      } 
   ] 
} 
 
3.22  pieces_ok_de_premier_coup_annee_en_cours  (QCM) 
GET /api/data/q/pieces_ok_de_premier_coup_annee_en_cours?limit=100&offset=0 x
api
key 
Slug : pieces_ok_de_premier_coup_annee_en_cours 
Source : QCM 
État : Actif 
Pièces OK de premier coup (année en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "pieces_ok_de_premier_coup_annee_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "FirstPassYear": 1664359 
      } 
   ] 
} 
 
3.23  pieces_produites_annee_en_cours  (QCM) 
GET /api/data/q/pieces_produites_annee_en_cours?limit=100&offset=0 x-api-key 
Slug : pieces_produites_annee_en_cours 
Source : QCM 
État : Actif 
Pièces produites (année en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "pieces_produites_annee_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "ProducedYear": 882644 
      } 
   ] 
} 
 
3.24  rejets_suite_inspection_paquet_annee_en_cours  (QCM) 
GET /api/data/q/rejets_suite_inspection_paquet_annee_en_cours?limit=100&offset=0 x
api
key 
Slug : rejets_suite_inspection_paquet_annee_en_cours 
Source : QCM 
État : Inactif 
Rejets paquet suite inspection (année en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "rejets_suite_inspection_paquet_annee_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "BundleRejectYear": 0 
      } 
   ] 
} 
 
3.25  inspections_paquet_annee_en_cours  (QCM) 
GET /api/data/q/inspections_paquet_annee_en_cours?limit=100&offset=0 x-api-key 
Slug : inspections_paquet_annee_en_cours 
Source : QCM 
État : Inactif 
Inspections paquet (année en cours). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "inspections_paquet_annee_en_cours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "BundleInspectedYear": 2 
      } 
   ] 
} 
 
3.26  requete_unifiee_dashboard_tout-en-un  (QCM) 
GET /api/data/q/requete_unifiee_dashboard_tout-en
un?limit=100&offset=0 
x-api-key 
Slug : requete_unifiee_dashboard_tout-en-un 
Source : QCM 
État : Inactif 
Dashboard unifié (KPIs jour + année en une seule requête). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "requete_unifiee_dashboard_tout-en-un", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "FirstPassToday": 2947, 
         "ProducedToday": 80, 
         "BundleRejectToday": 0, 
         "BundleInspectedToday": 0, 
         "FirstPassYear": 1664359, 
         "ProducedYear": 882644, 
         "BundleRejectYear": 0, 
         "BundleInspectedYear": 2 
      } 
   ] 
} 
 
3.27  stock_moyen  (DIVATEX) 
GET /api/data/q/stock_moyen?limit=100&offset=0 x-api-key 
Slug : stock_moyen 
Source : DIVATEX 
État : Actif 
Stock moyen calculé sur la vue v_stockmp. 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "stock_moyen", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "StockMoyen": 38035.07, 
         "NbLignesStock": 4261 
      } 
   ] 
} 
 
3.28  articles_sans_mouvement_durant_365_jours  (DIVATEX) 
GET /api/data/q/articles_sans_mouvement_durant_365_jours?limit=100&offset=0 x
api
key 
Slug : articles_sans_mouvement_durant_365_jours 
Source : DIVATEX 
État : Actif 
Nombre d'articles et quantité totale sans mouvement de stock depuis 365 jours. 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "articles_sans_mouvement_durant_365_jours", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "NbArticles_SansMvt_365j": 843, 
         "Qtte_SansMvt_365j": 147329728.72 
      } 
   ] 
} 
 
3.29  quantite_totale_du_stock  (DIVATEX) 
GET /api/data/q/quantite_totale_du_stock?limit=100&offset=0 x-api-key 
Slug : quantite_totale_du_stock 
Source : DIVATEX 
État : Actif 
Quantité totale du stock (somme de Qtte_Stock sur v_stockmp). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "quantite_totale_du_stock", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "Quantite_Totale_Stock": 162067420.25 
      } 
   ] 
} 
 
3.30  capacite_de_stockage_en_nombre_de_conteneurs  (DIVATEX) 
GET /api/data/q/capacite_de_stockage_en_nombre_de_conteneurs?limit=100&offset=0 x
api
key 
Slug : capacite_de_stockage_en_nombre_de_conteneurs 
Source : DIVATEX 
État : Actif 
Capacité de stockage exprimée en nombre de conteneurs (total et ventilation par état). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "capacite_de_stockage_en_nombre_de_conteneurs", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "Total_Conteneurs": 132228, 
         "Conteneurs_Actifs": "42864", 
         "Conteneurs_Consommes": "88499", 
         "Conteneurs_Supprimes": "865" 
      } 
   ] 
} 
 
3.31  nombre_de_rouleaux  (DIVATEX) 
GET /api/data/q/nombre_de_rouleaux?limit=100&offset=0 x-api-key 
Slug : nombre_de_rouleaux 
Source : DIVATEX 
État : Actif 
Nombre de rouleaux (conteneurs actifs de famille TISSU). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "nombre_de_rouleaux", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "NbRouleaux": 39031 
      } 
   ] 
} 
 
3.32  
nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel  
(DIVATEX) 
GET /api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel?limit=100&offset=0
Slug : nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel 
Source : DIVATEX 
État : Actif 
Nombre d'OFs livrés et ventilation par site de transfert coupe (Boumerdes / Jemmel). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "NbOF_Livres_Total": 4270, 
         "OF_AvecTransfertCoupe": 2411, 
         "OF_AvecTransfertCoupeJemmel": 805, 
         "OF_AvecTransfertCoupe_Total": 3213 
      } 
   ] 
} 
 
3.33  moyenne_date_de_transfert_date_de_reservation  (DIVATEX) 
GET /api/data/q/moyenne_date_de_transfert_date_de_reservation?limit=100&offset=0 x
api
key 
Slug : moyenne_date_de_transfert_date_de_reservation 
Source : DIVATEX 
État : Actif 
Moyenne en jours de l'écart (date de transfert vers coupe − date de réservation). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "moyenne_date_de_transfert_date_de_reservation", 
   "prestataire": "Prestataire Alpha", 
   "count": 1, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "MoyenneJours": "4.16", 
         "NbOFConsideres": 6576 
      } 
   ] 
} 
 
3.34  quantite_par_provenance_total  (DIVATEX) 
GET /api/data/q/quantite_par_provenance_total?limit=100&offset=0 x-api-key 
Slug : quantite_par_provenance_total 
Source : DIVATEX 
État : Actif 
Quantité de stock par provenance (pays du fournisseur), total inclus (rollup). 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "quantite_par_provenance_total", 
   "prestataire": "Prestataire Alpha", 
   "count": 4, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "Provenance": "Chine", 
         "Quantite": 38700, 
         "NbArticles": 7 
      }, 
      { 
         "Provenance": "France", 
         "Quantite": 112576, 
         "NbArticles": 2 
      }, 
      { 
         "Provenance": "NON RENSEIGNE", 
         "Quantite": 161916144.25, 
         "NbArticles": 2114 
      }, 
      { 
         "Provenance": null, 
         "Quantite": 162067420.25, 
         "NbArticles": 2123 
      } 
   ] 
} 
 
3.35  quantite_par_famille  (DIVATEX) 
GET /api/data/q/quantite_par_famille?limit=100&offset=0 x-api-key 
Slug : quantite_par_famille 
Source : DIVATEX 
État : Actif 
Quantité de stock par famille FG (NABAIJI, DOMYOS, …), total inclus. 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "quantite_par_famille", 
   "prestataire": "Prestataire Alpha", 
   "count": 10, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "FamilleFG": "AUTRE", 
         "Quantite": 160427351.85 
      }, 
      { 
         "FamilleFG": "DOMYOS", 
         "Quantite": 70864 
      }, 
      { 
         "FamilleFG": "KALENJI", 
         "Quantite": 54271 
      }, 
      { 
         "FamilleFG": "KIPSTA", 
         "Quantite": 408392.4 
      }, 
      { 
         "FamilleFG": "NABAIJI", 
         "Quantite": 336827 
      }, 
      { 
         "FamilleFG": "OLAIAN", 
         "Quantite": 121725 
      }, 
      { 
         "FamilleFG": "QUECHUA", 
         "Quantite": 275442 
      }, 
      { 
         "FamilleFG": "TRIBORD", 
         "Quantite": 14538 
      }, 
      { 
         "FamilleFG": "WEDZE", 
         "Quantite": 358009 
      }, 
      { 
         "FamilleFG": null, 
         "Quantite": 162067420.25 
      } 
   ] 
} 
 
3.36  quantite_par_typologie_fournitures  (DIVATEX) 
GET /api/data/q/quantite_par_typologie_fournitures?limit=100&offset=0 x-api-key 
Slug : quantite_par_typologie_fournitures 
Source : DIVATEX 
État : Actif 
Quantité de stock par typologie de fournitures (sous-famille MP), total inclus. Échantillon des 10 
premières typologies sur 37. 
Réponse (JSON) 
{ 
   "success": true, 
   "query": "quantite_par_typologie_fournitures", 
   "prestataire": "Prestataire Alpha", 
   "count": 10, 
   "limit": 100, 
   "offset": 0, 
   "data": [ 
      { 
         "Typologie": "ACCESSOIR", 
         "Quantite": 86807, 
         "NbArticles": 3 
      }, 
      { 
         "Typologie": "ANA HANGTAG PEMPE", 
         "Quantite": 2080, 
         "NbArticles": 1 
      }, 
      { 
         "Typologie": "ANNEAU", 
         "Quantite": 61440, 
         "NbArticles": 5 
      }, 
      { 
         "Typologie": "ANTIGLISE", 
         "Quantite": 30792.8, 
         "NbArticles": 6 
      }, 
      { 
         "Typologie": "BILLET", 
         "Quantite": 35868.24, 
         "NbArticles": 4 
      }, 
      { 
         "Typologie": "CIENTRE", 
         "Quantite": 1237428, 
         "NbArticles": 10 
      }, 
      { 
         "Typologie": "COQUE", 
         "Quantite": 449071, 
         "NbArticles": 66 
      }, 
      { 
         "Typologie": "CORDON", 
         "Quantite": 457758.69, 
         "NbArticles": 93 
      }, 
      { 
         "Typologie": "ELASTIQUE", 
         "Quantite": 1313886.88, 
         "NbArticles": 65 
      }, 
      { 
         "Typologie": "EMBALLAGE", 
         "Quantite": 228930, 
         "NbArticles": 34 
      } 
   ] 
} 
 
4. Jobs planifiés 
Les jobs planifiés exécutent automatiquement, selon une expression cron, l'une des 
requêtes SQL personnalisées de la section 3. Ils sont gérés exclusivement par les 
administrateurs via /api/admin/jobs (authentification JWT). Les prestataires n'y accèdent pas 
directement : ils consomment uniquement les routes /api/data et /api/data/q décrites plus 
haut. 
À l'instant de cette publication, 39 jobs sont configurés sur le serveur. Tous tournent à la 
fréquence */1 * * * * (chaque minute) et appellent une seule requête (run_query). Le résultat 
renvoyé par l'exécution suit exactement la forme de la réponse de la requête référencée — 
se reporter à la sous-section §3 indiquée dans le tableau §4.3. 
4.1  Listing des jobs 
GET /api/admin/jobs Bearer JWT 
Renvoie la liste de tous les jobs configurés. Chaque job indique son cron schedule, le slug de la 
requête appelée (action_ref) et son dernier état d'exécution. 
Réponse (JSON) 
{ 
   "success": true, 
   "data": [ 
      { 
         "id": 43, 
         "nom": "qte par typologie fourniture", 
         "label": "qte par typologie fourniture", 
         "schedule": "*/1 * * * *", 
         "action_type": "run_query", 
         "action_ref": "quantite_par_typologie_fournitures", 
         "actif": true, 
         "last_run": "2026-04-28T08:29:09.089Z", 
         "last_status": "ok", 
         "last_message": "Requête exécutée : 37 ligne(s) retournée(s).", 
         "created_at": "2026-04-28T08:14:11.994Z" 
      } 
   ] 
} 
 
4.2  Exécution manuelle d'un job 
GET /api/admin/jobs/:id/run Bearer JWT 
Force l'exécution immédiate d'un job sans attendre son déclencheur cron. La réponse expose le 
statut, la quantité retournée et les données renvoyées par la requête appelée. 
Réponse (JSON) 
{ 
   "success": true, 
   "status": "ok", 
   "message": "Requête exécutée : 1 ligne(s) retournée(s).", 
   "ran_at": "2026-04-28T08:30:12.034Z", 
   "data": [ 
      { 
         "StockMoyen": 38035.07, 
         "NbLignesStock": 4261 
      } 
   ] 
} 
 
4.3  Catalogue des 39 jobs 
Le tableau ci-dessous liste tous les jobs configurés à ce jour. Chaque ligne indique l'id 
interne, le nom donné par l'administrateur, la planification cron et la requête référencée (le 
résultat renvoyé par le job suit exactement la forme de la réponse de cette requête). 
id Nom Cron Requête appelée (→ section §3) 
25 colis */1 * * * 
* colis_total_3var (§3.1) 
26 packet rejeter */1 * * * 
* packets_rejetes (§3.2) 
27 wip */1 * * * 
* wip_chaine (§3.3) 
28 taging */1 * * * 
* taging_reel (§3.4) 
29 etat avancement */1 * * * 
* etat_avancement (§3.5) 
30 etat davancement */1 * * * 
* etat_avancement (§3.5) 
31 eff/ch */1 * * * 
* efficience_chaine (§3.6) 
32 min presence */1 * * * 
* minutes_presence (§3.7) 
33 min produite */1 * * * 
* minutes_produites (§3.8) 
34 temp d'opération */1 * * * 
* temps_operation (§3.9) 
35 lost time */1 * * * 
* lost_time (§3.10) 
36 qte produite */1 * * * 
* qte_produite (§3.11) 
37 qte sergraphie */1 * * * 
* qte_entree_serigraphie (§3.12) 
38 qte depart chaine */1 * * * 
* qte_depart_chaine_article_of (§3.13) 
39 sortie serigraphe */1 * * * 
* sortie_serigraphie (§3.14) 
40 qte engagement */1 * * * 
* qte_engagement (§3.15) 
41 sortie coupe */1 * * * 
* sortie_coupe (§3.16) 
42 qte produite par jour */1 * * * 
* qte_produite_indiv_jour (§3.17) 
43 qte par typologie 
fourniture */1 * * * 
* quantite_par_typologie_fournitures (§3.36) 
44 qte par famille */1 * * * 
* quantite_par_famille (§3.35) 
45 qte par provenance */1 * * * 
* quantite_par_provenance_total (§3.34) 
46 moyene date */1 * * * 
* moyenne_date_de_transfert_date_de_reservation (§3.33) 
47 nbre dof livree */1 * * * 
* nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel 
(§3.32) 
48 nbre roulot */1 * * * 
* nombre_de_rouleaux (§3.31) 
49 capacité stockage */1 * * * 
* capacite_de_stockage_en_nombre_de_conteneurs (§3.30) 
50 qte total stock */1 * * * 
* quantite_totale_du_stock (§3.29) 
51 article sans mouvement */1 * * * 
* articles_sans_mouvement_durant_365_jours (§3.28) 
52 stock moyen */1 * * * 
* stock_moyen (§3.27) 
53 unifié */1 * * * 
* requete_unifiee_dashboard_tout-en-un (§3.26) 
54 inspection packet annes 
en cours */1 * * * 
* inspections_paquet_annee_en_cours (§3.25) 
55 rejet suite ionspection */1 * * * 
* rejets_suite_inspection_paquet_annee_en_cours (§3.24) 
56 inspection annes en 
cours */1 * * * 
* inspections_paquet_annee_en_cours (§3.25) 
57 rejet anne sen cours */1 * * * 
* rejets_suite_inspection_paquet_annee_en_cours (§3.24) 
58 piece en cours */1 * * * 
* pieces_produites_annee_en_cours (§3.23) 
59 piece ok */1 * * * 
* pieces_ok_de_premier_coup_annee_en_cours (§3.22) 
60 inspection packet */1 * * * 
* inspections_paquet_jour_en_cours (§3.21) 
61 rejet jour e,n cours */1 * * * 
* rejets_suite_inspection_paquet_jour_en_cours (§3.20) 
62 piece produit jour */1 * * * 
* pieces_produites_jour_en_cours (§3.19) 
63 colis total */1 * * * 
* colis_total_3var (§3.1) 