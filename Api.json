{
  "info": {
    "_postman_id": "bacovet-novacity-api-v1-2",
    "name": "BACOVET — Novacity API v1.2",
    "description": "Collection complète pour l'API Novacity — BACOVET Dashboard.\n\n## Variables à configurer\n- `base_url` : URL de base du serveur Novacity (ex: https://api.novacity.bacovet.com)\n- `api_key` : Clé x-api-key fournie par Novacity\n- `jwt_token` : Token JWT pour les endpoints /api/admin (pré-fourni par Novacity)\n\n## Structure\n1. 📊 Endpoints Configurés (22) — tables/vues DIVATEX, SDT, QCM\n2. 🔍 Requêtes SQL Personnalisées (36) — via /api/data/q/:slug\n3. ⚙️ Admin Jobs (2) — via /api/admin/jobs (Bearer JWT)\n\n## Authentification\n- Endpoints data → header `x-api-key: {{api_key}}`\n- Endpoints admin → header `Authorization: Bearer {{jwt_token}}`\n\n⚠️ IMPORTANT — Pas de route de login dans cette API.\nLe x-api-key et le JWT sont des clés statiques fournies directement par Novacity.\nIl n'y a pas d'endpoint POST /login ou /auth dans cette API.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://your-novacity-server.com",
      "type": "string",
      "description": "URL de base du serveur Novacity — remplacer par la vraie URL"
    },
    {
      "key": "api_key",
      "value": "YOUR_X_API_KEY_HERE",
      "type": "string",
      "description": "Clé API fournie par Novacity (header x-api-key)"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_JWT_TOKEN_HERE",
      "type": "string",
      "description": "Token JWT pré-fourni par Novacity pour les routes /api/admin"
    }
  ],
  "item": [
    {
      "name": "⚠️ README — Lire en premier",
      "item": [
        {
          "name": "🔑 Pas de login — Explication",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}",
              "host": ["{{base_url}}"]
            },
            "description": "# Pourquoi il n'y a pas d'endpoint de login ?\n\nCette API utilise deux mécanismes d'authentification STATIQUES :\n\n## 1. x-api-key (pour tous les endpoints /api/data)\nUne clé fixe fournie par Novacity à l'équipe Bacovet.\nVous la mettez dans le header de chaque requête :\n```\nx-api-key: <votre_clé>\n```\nPas besoin de se connecter — la clé ne change pas (sauf révocation).\n\n## 2. Bearer JWT (pour les endpoints /api/admin)\nUn token JWT pré-généré et fourni par Novacity à l'administrateur IT.\nVous le mettez dans le header Authorization :\n```\nAuthorization: Bearer <votre_jwt>\n```\nCe token est aussi statique — il n'est pas obtenu via un login.\n\n## Conséquence pour le dashboard BACOVET\nL'écran de login du dashboard (MATRICULE / EID + mot de passe) est INDÉPENDANT de cette API.\nLa gestion des utilisateurs BACOVET (qui peut voir quoi) est une couche frontend.\nCette API ne connaît pas vos utilisateurs — elle ne connaît que la clé et le JWT.\n\n## Action requise\nDemander à Novacity de vous fournir :\n- La valeur de x-api-key\n- La valeur du JWT admin (et sa date d'expiration)\n- L'URL de base du serveur"
          },
          "response": []
        }
      ]
    },
    {
      "name": "📊 1 — Endpoints Configurés (22)",
      "description": "22 endpoints exposant dynamiquement une table ou vue d'une source (DIVATEX, SDT, QCM).\nTous requièrent le header x-api-key.\nFiltre date désactivé (none) pour tous.",
      "item": [
        {
          "name": "01 — ItemTrxEnq (SDT)",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "x-api-key",
                "value": "{{api_key}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/itemtrxenq?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "itemtrxenq"],
              "query": [
                { "key": "limit", "value": "100", "description": "Nombre max de lignes (défaut 100, max 500)" },
                { "key": "offset", "value": "0", "description": "Décalage pour pagination" }
              ]
            },
            "description": "Source: SDT | Objet: vwItemTrxEnq (view)\nChamps retournés: IsSplit, SONo, TransactionID, ItemNo, OpNo\n\nUsage dashboard: Données de transactions articles — référence croisée pour filtres OF/article."
          },
          "response": []
        },
        {
          "name": "02 — vwItemTrx (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/vwitemtrx?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "vwitemtrx"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: SDT | Objet: vwItemTrx (view)\nChamps retournés: TransactionID, LogDate, ShiftCode, ProdGroup\n\nUsage dashboard: Transactions de production par groupe et shift."
          },
          "response": []
        },
        {
          "name": "03 — LostType (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/losttype?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "losttype"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: SDT | Objet: vwLostType (view)\nChamps retournés: LostTypeID, LostTypeCode, LostTypeDesc\n\nValeurs connues: MAINT (Arrêt maintenance), MATIERE (Rupture matière), QUALITE (Problème qualité)\n\nUsage dashboard: Référentiel des motifs d'arrêt pour la timeline Production."
          },
          "response": []
        },
        {
          "name": "04 — LostTimeTrx (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/losttimetrx?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "losttimetrx"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: SDT | Objet: vwLostTimeTrx (view)\nChamps retournés: LogDate, ShiftCode, ProdGroup, EmployeeNo\n\nUsage dashboard: Transactions arrêts non planifiés (à compléter avec lost_time query pour minutes_perdues)."
          },
          "response": []
        },
        {
          "name": "05 — RoverEffectiveness (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/rovereffectiveness?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "rovereffectiveness"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: vwRoverEffectiveness (view)\nChamps retournés: LOGDATE, ShiftCode, SHORTNAME, MONO\n\nSHORTNAME = code chaîne (CH1, CH2…)\nMONO = valeur d'efficacité Rover\n\nUsage dashboard: Efficacité de contrôle qualité par chaîne et shift."
          },
          "response": []
        },
        {
          "name": "06 — Production (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/production?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "production"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: vwProduction (view)\nChamps retournés: LogDate, ShiftCode, ProdGroup, LoginManp\n\nUsage dashboard: Vue production par shift et groupe."
          },
          "response": []
        },
        {
          "name": "07 — InlineVsEndlineComparison (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/inlinevsendlinecomparison?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "inlinevsendlinecomparison"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: vwInlineVSEndlineComparison (view)\nChamps retournés: LOGDATE, ShiftCode, SHORTNAME, OPERA\n\nSHORTNAME = chaîne (CH1, CH2…)\nOPERA = code opération (OP010, OP020…)\n\nUsage dashboard: Graphique comparaison Inline vs Endline — Sprint 5 (tabs Coupe + Sérigraphie)."
          },
          "response": []
        },
        {
          "name": "08 — EmpDefectEff (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/empdefecteff?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "empdefecteff"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: vwEmpDefectEff (view)\nChamps retournés: LogDate, ShiftCode, ProdGroup, EmployeeNo\n\nUsage dashboard: Efficacité défauts par employé."
          },
          "response": []
        },
        {
          "name": "09 — vwDefect (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/vwdefect?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "vwdefect"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: vwDefect (view)\nChamps retournés: LOGDATE, ShiftCode, ProdGroup, OpNo, Qty\n\nOpNo = code opération\nQty = quantité de défauts\n\nUsage dashboard: Graphique défauts par opération (Sprint 3) + Pareto RFT (F-REQ-116)."
          },
          "response": []
        },
        {
          "name": "10 — RejectQte (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/reject_qte?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "reject_qte"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: RejectQty (view)\nChamps retournés: LogDate, ShiftCode, SHORTNAME, STYLECODE\n\nUsage dashboard: Quantités rejetées par chaîne et style."
          },
          "response": []
        },
        {
          "name": "11 — QcmDefectTrx (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/qcmdefecttrx?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "qcmdefecttrx"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: QCMDefectTrx (view)\nChamps retournés: LOGDATE, ShiftCode, GROUPID, TicketID, ITEMID\n\nITEMID = identifiant article défectueux\n\nUsage dashboard: Pareto Défauts Inspection (F-REQ-117) — grouper par ITEMID."
          },
          "response": []
        },
        {
          "name": "12 — CheckPassQte (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/checkpassqte?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "checkpassqte"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: QCM | Objet: QCCheckPassQty (view)\nChamps retournés: LOGDATE, SHORTNAME, ShiftCode, DefectPct\n\nDefectPct = taux de rejet % par chaîne et shift\n\nUsage dashboard: ⭐ CRITIQUE — Graphique BR par chaîne (Sprint 3), seuils ≤4% vert, 4-5% orange, >5% rouge."
          },
          "response": []
        },
        {
          "name": "13 — MpFamille (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/mp_famille?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "mp_famille"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: mp_famille (table)\nChamps retournés: IDMPFamille, Famille, Etat, Code, Ordre, Type\n\nValeurs exemple: Coton, Lin, Polyester\n\nUsage dashboard: Référentiel familles matières premières — filtre famille dans table stock."
          },
          "response": []
        },
        {
          "name": "14 — Mp (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/mp?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "mp"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: mp (table)\nChamps retournés: IDMPFamille, IDMP, Description, Commentaire\n\nJointure avec vue_stock via IDMP = idmp\n\nUsage dashboard: Description des matières premières."
          },
          "response": []
        },
        {
          "name": "15 — OFabrication (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/ofabrication?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "ofabrication"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: ofabrication (table)\nChamps retournés: IDOFabrication, OFabrication, DtDebut, DtFin\n\nDtFin = null → OF encore en cours\nDtFin = date → OF terminé\n\nUsage dashboard: Liste OF Coupe actifs (Sprint 5) — filtrer DtFin === null."
          },
          "response": []
        },
        {
          "name": "16 — Mouvement (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/mouvement?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "mouvement"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: mouvement (table)\nChamps retournés: IDBonLivraisonAchat, IDSynchronisation, IDMvt\n\nUsage dashboard: Mouvements de stock — référence interne."
          },
          "response": []
        },
        {
          "name": "17 — MpConteneur (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/mpconteneur?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "mpconteneur"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: mp_conteneur (table)\nChamps retournés: IDMPFamille, IDMP_Conteneur, NumConteneur\n\nUsage dashboard: Référence conteneurs matières premières."
          },
          "response": []
        },
        {
          "name": "18 — ArticlesColis (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/articlescolis?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "articlescolis"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: articlecolis (table)\nChamps retournés: IDArticleColis, IDColis, IDArticle, IDAr_Couleur\n\nUsage dashboard: Association articles ↔ colis — détail expandable dans table OF (Sprint 6)."
          },
          "response": []
        },
        {
          "name": "19 — DetailColis (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/detailcolis?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "detailcolis"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: detailcolis (table)\nChamps retournés: IDDetailColis, IDColis, IdTaille, LibTaille, Qtte\n\nLibTaille = S, M, L, XL…\n\nUsage dashboard: Détail tailles par colis."
          },
          "response": []
        },
        {
          "name": "20 — Expeditions (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/expeditions?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "expeditions"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: expedition (table)\nChamps retournés: IDExpedition, LibExpedition, DateCreation\n\nUsage dashboard: Historique expéditions — logistique."
          },
          "response": []
        },
        {
          "name": "21 — VueStock (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/vue_stock?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "vue_stock"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: v_stockmp (view)\nChamps retournés: idmp, codemp, designation, Couleur, Famille\n\nJointure avec diva_stock via idmp = IDMP pour obtenir quantités\n\nUsage dashboard: ⭐ Table stock recherchable (Sprint 6) — col. Code MP, Désignation, Famille, Couleur."
          },
          "response": []
        },
        {
          "name": "22 — DivaStock (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/diva_stock?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "diva_stock"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "Source: DIVATEX | Objet: mvtstock (table)\nChamps retournés: IDMvtStock, IDMP, IDMagasin, Qtte, qtteReserve\n\nQté Disponible = Qtte - qtteReserve\n\nUsage dashboard: ⭐ Jointure avec vue_stock pour colonnes Qté Stock, Qté Réservée, Qté Disponible."
          },
          "response": []
        }
      ]
    },
    {
      "name": "🔍 2 — Requêtes SQL Personnalisées (36)",
      "description": "36 requêtes SQL personnalisées via /api/data/q/:slug\nToutes requièrent le header x-api-key.\nMax pagination: limit=1000 (contrairement aux endpoints configurés max=500)\n\n⚠️ 5 requêtes sont marquées INACTIF — elles retournent une erreur ou données vides.",
      "item": [
        {
          "name": "🟢 Q-01 — colis_total_3var (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/colis_total_3var?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "colis_total_3var"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: commande, article, couleur, total_colis, total_pieces\n\nUsage dashboard: Détail colis dans table OF expandable (Sprint 6) — filtrer par commande."
          },
          "response": []
        },
        {
          "name": "🟢 Q-02 — packets_rejetes (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/packets_rejetes?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "packets_rejetes"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: IDColis, reference, motif, qtte, date_rejet\n\nUsage dashboard: ⭐ Table paquets rejetés Sérigraphie (Sprint 5) — filtrer par date_rejet = aujourd'hui, tri desc."
          },
          "response": []
        },
        {
          "name": "🟢 Q-03 — wip_chaine (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/wip_chaine?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "wip_chaine"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: chaine, en_cours, entree_jour, sortie_jour\n\nUsage dashboard: ⭐ Bandeau info chaînes (Sprint 4) + Filtre Ligne dans GlobalFilterBar (Sprint 7)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-04 — taging_reel (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/taging_reel?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "taging_reel"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: chaine, shift, tag_theorique, tag_reel, ecart_pct\n\necart_pct: négatif = moins que prévu, positif = plus que prévu\n⚠️ Seuils couleur: |ecart_pct| ≤2% vert, 2-5% orange, >5% rouge\n\nUsage dashboard: ⭐ F-REQ-217 — Table tagging Coupe (Sprint 5) + Jauge fiabilité page Méthodes (Sprint 7)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-05 — etat_avancement (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/etat_avancement?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "etat_avancement"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: of, avancement_pct, quantite_prevue, quantite_realisee, statut\n\nstatut: 'en_cours' | 'termine'\n\nUsage dashboard: ⭐ F-REQ-305 — Donuts avancement OF (Sprint 4) + Table OF Logistique (Sprint 6) + Filtre OF GlobalFilterBar (Sprint 7)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-06 — efficience_chaine (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/efficience_chaine?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "efficience_chaine"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: chaine, date, heures_prod, heures_standards, efficience_pct\n\n⚠️ Seuils: >85% vert, 70-85% orange, <70% rouge\n\nUsage dashboard: ⭐ F-REQ-202 — Jauges efficience par chaîne (Sprint 4) + F-REQ-203 Courbe efficience cumulée + Proxy tendance annuelle qualité (Sprint 3)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-07 — minutes_presence (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/minutes_presence?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "minutes_presence"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: employe, date, minutes_presence, chaine\n\nUsage dashboard: F-REQ-208/209 — Efficience Départage et Vignettes (Sprint 5). Dénominateur pour calcul efficience opératrice."
          },
          "response": []
        },
        {
          "name": "🟢 Q-08 — minutes_produites (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/minutes_produites?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "minutes_produites"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: employe, date, minutes_produites, chaine\n\nUsage dashboard: F-REQ-208/209 — Numérateur pour efficience opératrice. Jointure avec minutes_presence par employe+date."
          },
          "response": []
        },
        {
          "name": "🟢 Q-09 — temps_operation (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/temps_operation?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "temps_operation"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: operation, temps_standard_s, temps_reel_s, ecart_pct\n\nUsage dashboard: F-REQ-210 — Top opérateurs (Sprint 4). Utilisé dans la formule: (qte_produite × temps_operation) / minutes_presence."
          },
          "response": []
        },
        {
          "name": "🟢 Q-10 — lost_time (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/lost_time?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "lost_time"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: date, chaine, motif, minutes_perdues\n\nmotif: MAINT | MATIERE | QUALITE\n⚠️ Seuils: <10min vert, 10-30min orange, >30min rouge\n\nUsage dashboard: ⭐ F-REQ-207 — Carte Arrêts (Sprint 4) + Timeline arrêts non planifiés par chaîne."
          },
          "response": []
        },
        {
          "name": "🟢 Q-11 — qte_produite (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/qte_produite?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "qte_produite"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: date, chaine, shift, quantite\n\nUsage dashboard: ⭐ Carte Qté Produite Ce Jour (Sprint 4) — filtrer date=aujourd'hui, sommer quantite. Aussi Respect Planification (Sprint 6) F-REQ-336."
          },
          "response": []
        },
        {
          "name": "🟢 Q-12 — qte_entree_serigraphie (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/qte_entree_serigraphie?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "qte_entree_serigraphie"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: date, article, couleur, quantite\n\nUsage dashboard: ⭐ F-REQ-309 — Couverture Sérigraphie (Sprint 5). Jointure avec sortie_serigraphie par article+couleur.\nCouverture = qte_entree - qte_sortie"
          },
          "response": []
        },
        {
          "name": "🟢 Q-13 — qte_depart_chaine_article_of (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/qte_depart_chaine_article_of?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "qte_depart_chaine_article_of"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: of, chaine, article, quantite\n\nUsage dashboard: F-REQ-303 — Table Quantité Départage (Sprint 5, onglet Coupe). Grouper par OF."
          },
          "response": []
        },
        {
          "name": "🟢 Q-14 — sortie_serigraphie (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/sortie_serigraphie?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "sortie_serigraphie"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: date, article, couleur, quantite\n\nUsage dashboard: ⭐ F-REQ-309 — Couverture et Flux Sérigraphie (Sprint 5). Jointure avec qte_entree_serigraphie."
          },
          "response": []
        },
        {
          "name": "🟢 Q-15 — qte_engagement (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/qte_engagement?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "qte_engagement"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: commande, of, article, quantite_engagee\n\nUsage dashboard: ⭐ F-REQ-206 — WIP Optimal (Sprint 4) + F-REQ-311 — Couverture Coupe (Sprint 5).\nJointure avec sortie_coupe par commande."
          },
          "response": []
        },
        {
          "name": "🟢 Q-16 — sortie_coupe (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/sortie_coupe?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "sortie_coupe"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: commande, date, quantite_coupee\n\nUsage dashboard: ⭐ F-REQ-206 — WIP Optimal (Sprint 4) + F-REQ-311 — Couverture Coupe (Sprint 5).\nCouverture Coupe = (quantite_coupee - quantite_engagee) / cadence_hebdo"
          },
          "response": []
        },
        {
          "name": "🟢 Q-17 — qte_produite_indiv_jour (SDT)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/qte_produite_indiv_jour?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "qte_produite_indiv_jour"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: SDT\nChamps: employe, date, chaine, quantite, minutes_produites\n\nUsage dashboard: ⭐ F-REQ-210 — Top Opérateurs (Sprint 4). Filtrer date=aujourd'hui, trier minutes_produites desc, top 10."
          },
          "response": []
        },
        {
          "name": "🟢 Q-18 — pieces_ok_premier_coup_jour (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/pieces_ok_de_premier_coup_jour_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "pieces_ok_de_premier_coup_jour_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: QCM\nChamps: FirstPassToday (number)\n\nUsage dashboard: ⭐ F-REQ-104 — Carte RFT Ce Jour (Sprint 3).\nRFT = FirstPassToday / ProducedToday × 100\n⚠️ Si résultat >100% → afficher N/A (données anormales dans l'échantillon API)"
          },
          "response": []
        },
        {
          "name": "🟢 Q-19 — pieces_produites_jour (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/pieces_produites_jour_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "pieces_produites_jour_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: QCM\nChamps: ProducedToday (number)\n\n⚠️ L'échantillon API montre ProducedToday: 80 — valeur anormalement basse (données de test).\nToujours garder un guard: if ProducedToday === 0 → N/A\n\nUsage dashboard: ⭐ Dénominateur pour RFT Ce Jour (F-REQ-104, Sprint 3)."
          },
          "response": []
        },
        {
          "name": "🔴 Q-20 — [INACTIF] rejets_inspection_paquet_jour (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/rejets_suite_inspection_paquet_jour_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "rejets_suite_inspection_paquet_jour_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ❌ INACTIF — BLOCKER B-01\nChamps attendus: BundleRejectToday (number)\n\n⚠️ Cette requête est inactive. Contacter Novacity pour l'activer.\nSans elle, la carte BR Bundling Ce Jour (F-REQ-106, Sprint 3) affiche un placeholder gris.\n\nAction: Demander à l'admin Novacity d'activer le slug 'rejets_suite_inspection_paquet_jour_en_cours'."
          },
          "response": []
        },
        {
          "name": "🔴 Q-21 — [INACTIF] inspections_paquet_jour (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/inspections_paquet_jour_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "inspections_paquet_jour_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ❌ INACTIF — BLOCKER B-01\nChamps attendus: BundleInspectedToday (number)\n\n⚠️ Cette requête est inactive. Contacter Novacity pour l'activer.\nDénominateur pour BR Bundling Ce Jour (F-REQ-106)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-22 — pieces_ok_premier_coup_annee (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/pieces_ok_de_premier_coup_annee_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "pieces_ok_de_premier_coup_annee_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: QCM\nChamps: FirstPassYear (number) — ex: 1664359\n\nUsage dashboard: ⭐ F-REQ-105 — Carte RFT DDA Année (Sprint 3).\nRFT Année = FirstPassYear / ProducedYear × 100"
          },
          "response": []
        },
        {
          "name": "🟢 Q-23 — pieces_produites_annee (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/pieces_produites_annee_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "pieces_produites_annee_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: QCM\nChamps: ProducedYear (number) — ex: 882644\n\nUsage dashboard: ⭐ Dénominateur pour RFT Année (F-REQ-105, Sprint 3)."
          },
          "response": []
        },
        {
          "name": "🔴 Q-24 — [INACTIF] rejets_inspection_paquet_annee (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/rejets_suite_inspection_paquet_annee_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "rejets_suite_inspection_paquet_annee_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ❌ INACTIF — BLOCKER B-01\nChamps attendus: BundleRejectYear (number)\n\n⚠️ Inactive. Carte BR Bundling DDA (F-REQ-107) affiche placeholder gris jusqu'à activation."
          },
          "response": []
        },
        {
          "name": "🔴 Q-25 — [INACTIF] inspections_paquet_annee (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/inspections_paquet_annee_en_cours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "inspections_paquet_annee_en_cours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ❌ INACTIF — BLOCKER B-01\nChamps attendus: BundleInspectedYear (number)\n\n⚠️ Inactive. Dénominateur pour BR Bundling DDA (F-REQ-107)."
          },
          "response": []
        },
        {
          "name": "🔴 Q-26 — [INACTIF] requete_unifiee_dashboard (QCM)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/requete_unifiee_dashboard_tout-en-un?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "requete_unifiee_dashboard_tout-en-un"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ❌ INACTIF\nChamps si actif: FirstPassToday, ProducedToday, BundleRejectToday, BundleInspectedToday, FirstPassYear, ProducedYear, BundleRejectYear, BundleInspectedYear\n\nNote: Dashboard utilise les requêtes individuelles Q-18 à Q-25 à la place. Non bloquant."
          },
          "response": []
        },
        {
          "name": "🟢 Q-27 — stock_moyen (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/stock_moyen?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "stock_moyen"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: StockMoyen (38035.07), NbLignesStock (4261)\n\nUsage dashboard: F-REQ-316/317/318 — Jauges rotation stock (Sprint 6). Note: Coût marchandises non disponible dans l'API → afficher StockMoyen brut."
          },
          "response": []
        },
        {
          "name": "🟢 Q-28 — articles_sans_mouvement_365j (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/articles_sans_mouvement_durant_365_jours?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "articles_sans_mouvement_durant_365_jours"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: NbArticles_SansMvt_365j (843), Qtte_SansMvt_365j (147329728.72)\n\nUsage dashboard: ⭐ F-REQ-319/320/321 — Cartes Taux Stock Mort (Sprint 6).\nFormule: Qtte_SansMvt_365j / Quantite_Totale_Stock × 100"
          },
          "response": []
        },
        {
          "name": "🟢 Q-29 — quantite_totale_stock (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/quantite_totale_du_stock?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "quantite_totale_du_stock"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: Quantite_Totale_Stock (162067420.25)\n\n⚠️ Format FR: '162 067 420,25'\n\nUsage dashboard: ⭐ Dénominateur pour taux stock mort + header table stock (Sprint 6)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-30 — capacite_stockage_conteneurs (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/capacite_de_stockage_en_nombre_de_conteneurs?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "capacite_de_stockage_en_nombre_de_conteneurs"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: Total_Conteneurs (132228), Conteneurs_Actifs (\"42864\"), Conteneurs_Consommes (\"88499\"), Conteneurs_Supprimes (\"865\")\n\n⚠️ IMPORTANT: Conteneurs_Actifs, Conteneurs_Consommes, Conteneurs_Supprimes sont retournés comme STRINGS.\nAppliquer parseInt() dans api.js avant utilisation.\n\nUsage dashboard: ⭐ F-REQ-322/323/324 — Jauges occupation (Sprint 6).\nFormule: NbRouleaux / parseInt(Conteneurs_Actifs) × 100"
          },
          "response": []
        },
        {
          "name": "🟢 Q-31 — nombre_rouleaux (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/nombre_de_rouleaux?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "nombre_de_rouleaux"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: NbRouleaux (39031)\n\nUsage dashboard: ⭐ Numérateur pour taux occupation (Sprint 6).\n39031 / 42864 = ~91,1% → ORANGE/ROUGE"
          },
          "response": []
        },
        {
          "name": "🟢 Q-32 — nombre_ofs_livres_transfert (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: NbOF_Livres_Total (4270), OF_AvecTransfertCoupe (2411), OF_AvecTransfertCoupeJemmel (805), OF_AvecTransfertCoupe_Total (3213)\n\nUsage dashboard: ⭐ F-REQ-325/326/327 — Cartes Commandes livrées à temps (Sprint 6).\nFormule: 3213 / 4270 × 100 = ~75,2%"
          },
          "response": []
        },
        {
          "name": "🟢 Q-33 — moyenne_date_transfert_reservation (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/moyenne_date_de_transfert_date_de_reservation?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "moyenne_date_de_transfert_date_de_reservation"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: MoyenneJours (\"4.16\"), NbOFConsideres (6576)\n\n⚠️ IMPORTANT: MoyenneJours est retourné comme STRING.\nAppliquer parseFloat() dans api.js.\n\nUsage dashboard: ⭐ F-REQ-328/329/330 — Carte Délai de livraison (Sprint 6).\nSeuils: ≤1j vert, 1-3j orange, >3j rouge → 4,16j = ROUGE"
          },
          "response": []
        },
        {
          "name": "🟢 Q-34 — quantite_par_provenance (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/quantite_par_provenance_total?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "quantite_par_provenance_total"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: Provenance, Quantite, NbArticles\n\n⚠️ La dernière ligne retournée a Provenance: null — c'est le total rollup. FILTRER cette ligne côté frontend.\n\nUsage dashboard: ⭐ F-REQ-332 — Camembert STOCK/Provenance (Sprint 6)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-35 — quantite_par_famille (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/quantite_par_famille?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "quantite_par_famille"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: FamilleFG, Quantite\n\nValeurs: AUTRE, DOMYOS, KALENJI, KIPSTA, NABAIJI, OLAIAN, QUECHUA, TRIBORD, WEDZE\n⚠️ Dernière ligne FamilleFG: null = total rollup — FILTRER.\n⚠️ 'AUTRE' représente 160M/162M de la quantité totale.\n\nUsage dashboard: ⭐ F-REQ-333 — Camembert STOCK/Brand (Sprint 6) + Filtre Marque GlobalFilterBar (Sprint 7)."
          },
          "response": []
        },
        {
          "name": "🟢 Q-36 — quantite_par_typologie (DIVATEX)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "x-api-key", "value": "{{api_key}}", "type": "text" }
            ],
            "url": {
              "raw": "{{base_url}}/api/data/q/quantite_par_typologie_fournitures?limit=100&offset=0",
              "host": ["{{base_url}}"],
              "path": ["api", "data", "q", "quantite_par_typologie_fournitures"],
              "query": [
                { "key": "limit", "value": "100" },
                { "key": "offset", "value": "0" }
              ]
            },
            "description": "État: ACTIF | Source: DIVATEX\nChamps: Typologie, Quantite, NbArticles\n\nL'API renvoie un échantillon de 10 typologies sur 37 totales. Utiliser limit=1000 pour tout récupérer.\n\nUsage dashboard: ⭐ F-REQ-331 — Camembert STOCK/Typologie (Sprint 6). Grouper top 9, reste en 'Autres'."
          },
          "response": []
        }
      ]
    },
    {
      "name": "⚙️ 3 — Admin Jobs (JWT requis)",
      "description": "Endpoints d'administration — requièrent Authorization: Bearer {{jwt_token}}\nNE PAS utiliser x-api-key pour ces routes.",
      "item": [
        {
          "name": "ADM-01 — Lister tous les jobs (39)",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/admin/jobs",
              "host": ["{{base_url}}"],
              "path": ["api", "admin", "jobs"]
            },
            "description": "Retourne la liste des 39 jobs planifiés.\n\nChamps par job: id, nom, label, schedule (cron), action_type, action_ref (slug requête), actif, last_run, last_status, last_message, created_at\n\nTous les jobs tournent à */1 * * * * (chaque minute).\n\nUsage dashboard: ⭐ Panel Supervision API (Sprint 2 Admin). Vérifier last_status et last_run.\n\n⚠️ Jobs INACTIFS à signaler dans le banner Admin:\n- Job 60: inspections_paquet_jour_en_cours\n- Job 61: rejets_suite_inspection_paquet_jour_en_cours\n- Job 54: inspections_paquet_annee_en_cours\n- Job 55: rejets_suite_inspection_paquet_annee_en_cours"
          },
          "response": []
        },
        {
          "name": "ADM-02 — Exécuter un job manuellement",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/admin/jobs/:id/run",
              "host": ["{{base_url}}"],
              "path": ["api", "admin", "jobs", ":id", "run"],
              "variable": [
                {
                  "key": "id",
                  "value": "52",
                  "description": "ID du job à exécuter — ex: 52 (stock_moyen). Remplacer par l'ID voulu."
                }
              ]
            },
            "description": "Force l'exécution immédiate d'un job sans attendre son cron.\n\nRéponse: { success, status, message, ran_at, data }\nLa réponse data suit exactement le format de la requête SQL référencée par ce job.\n\nUsage dashboard: Bouton 'EXÉCUTER MAINTENANT' dans le panel Admin (Sprint 2). Afficher le message dans un toast.\n\nExemple IDs utiles:\n- 27 (wip_chaine)\n- 29 (etat_avancement)\n- 31 (efficience_chaine)\n- 35 (lost_time)\n- 52 (stock_moyen)"
          },
          "response": []
        }
      ]
    }
  ]
}