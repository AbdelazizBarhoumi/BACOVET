/**
 * ============================================================
 *  NOVACITY MOCK API SERVER  —  v1.2
 * ============================================================
 *  Mirrors the full Novacity API contract:
 *    • 22 configured endpoints   /api/data/:nom
 *    • 36 SQL queries            /api/data/q/:slug
 *    • Admin jobs                /api/admin/jobs
 *
 *  When the real backend is ready:
 *    1. Change BASE_URL in your front-end to point to the real server
 *    2. Replace the mock x-api-key with a real key
 *    Done — zero other changes needed.
 * ============================================================
 */

const cors = require("cors");
const express = require("express");
const app = express();

// ── Config ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MOCK_APIKEY = process.env.MOCK_APIKEY || "mock-dev-key"; // accept any value in permissive mode
const STRICT_AUTH = false; // set true to enforce exact MOCK_APIKEY match

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Auth guard ────────────────────────────────────────────────
app.use((req, res, next) => {
  // Public routes — no auth required
  if (req.path === "/" || req.path === "/health") return next();

  // Admin routes use Bearer JWT
  if (req.path.startsWith("/api/admin")) {
    const auth = req.headers["authorization"] || "";
    if (STRICT_AUTH && !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Missing Bearer token" });
    }
    return next();
  }
  const key = req.headers["x-api-key"];
  if (STRICT_AUTH && key !== MOCK_APIKEY) {
    return res.status(401).json({ success: false, error: "Invalid x-api-key" });
  }
  if (!key) {
    return res.status(401).json({ success: false, error: "Missing x-api-key header" });
  }
  next();
});

// ── Helpers ───────────────────────────────────────────────────

/** Returns an ISO date-time string offset by `daysAgo` from today */
function dt(daysAgo = 0, hour = 8, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

/** Today's date as YYYY-MM-DD */
function today(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

/** Apply limit / offset pagination to a data array */
function paginate(data, limit, offset) {
  const l = Math.min(parseInt(limit) || 100, 1000);
  const o = parseInt(offset) || 0;
  return data.slice(o, o + l);
}

/** Slight random variation so live-refresh feels alive */
function jitter(base, pct = 5) {
  const factor = 1 + (Math.random() * 2 - 1) * (pct / 100);
  return Math.round(base * factor * 100) / 100;
}

// ── Mock data generators ──────────────────────────────────────

const CHAINS = ["CH1", "CH2", "CH3", "CH4"];
const SHIFTS = ["S1", "S2"];
const GROUPS = ["G01", "G02", "G03"];
const EMPLOYEES = ["EMP0123", "EMP0456", "EMP0789", "EMP1011", "EMP1213"];
const OPS = ["OP10", "OP20", "OP30", "OP40"];
const ARTICLES = ["ART-0001", "ART-0002", "ART-0003", "ART-0004"];
const COLORS = ["Blanc", "Noir", "Rouge", "Bleu", "Ecru", "Beige"];
const STYLES = ["STY-A01", "STY-A02", "STY-B01", "STY-B02"];
const OFS = ["OF-2026-0412", "OF-2026-0413", "OF-2026-0414", "OF-2026-0415"];
const CMDS = ["CMD-2026-0101", "CMD-2026-0102", "CMD-2026-0103"];

function repeat(n, fn) {
  return Array.from({ length: n }, (_, i) => fn(i));
}

// ─────────────────────────────────────────────────────────────
//  SECTION 2 — 22 CONFIGURED ENDPOINTS
// ─────────────────────────────────────────────────────────────

const ENDPOINTS = {
  itemtrxenq: {
    label: "ItemTrxEnq",
    source: "SDT",
    object: "vwItemTrxEnq",
    object_type: "view",
    columns: ["IsSplit", "SONo", "TransactionID", "ItemNo", "OpNo"],
    generate: (n) =>
      repeat(n, (i) => ({
        IsSplit: i % 3 === 1 ? 1 : 0,
        SONo: `SO-2026-0${417 + i}`,
        TransactionID: 10238451 + i,
        ItemNo: ARTICLES[i % ARTICLES.length],
        OpNo: OPS[i % OPS.length],
      })),
  },

  vwitemtrx: {
    label: "vwItemTrx",
    source: "SDT",
    object: "vwItemTrx",
    object_type: "view",
    columns: ["TransactionID", "LogDate", "ShiftCode", "ProdGroup"],
    generate: (n) =>
      repeat(n, (i) => ({
        TransactionID: 55410 + i,
        LogDate: dt(Math.floor(i / 4), 6 + (i % 8)),
        ShiftCode: SHIFTS[i % 2],
        ProdGroup: GROUPS[i % GROUPS.length],
      })),
  },

  losttype: {
    label: "LostType",
    source: "SDT",
    object: "vwLostType",
    object_type: "view",
    columns: ["LostTypeID", "LostTypeCode", "LostTypeDesc"],
    generate: () => [
      { LostTypeID: 1, LostTypeCode: "MAINT", LostTypeDesc: "Arrêt maintenance" },
      { LostTypeID: 2, LostTypeCode: "MATIERE", LostTypeDesc: "Rupture matière" },
      { LostTypeID: 3, LostTypeCode: "QUALITE", LostTypeDesc: "Problème qualité" },
      { LostTypeID: 4, LostTypeCode: "ELECTR", LostTypeDesc: "Panne électrique" },
      { LostTypeID: 5, LostTypeCode: "PERSON", LostTypeDesc: "Absence opérateur" },
    ],
  },

  losttimetrx: {
    label: "LostTimeTrx",
    source: "SDT",
    object: "vwLostTimeTrx",
    object_type: "view",
    columns: ["LogDate", "ShiftCode", "ProdGroup", "EmployeeNo"],
    generate: (n) =>
      repeat(n, (i) => ({
        LogDate: dt(Math.floor(i / 3), 8 + (i % 6)),
        ShiftCode: SHIFTS[i % 2],
        ProdGroup: GROUPS[i % GROUPS.length],
        EmployeeNo: EMPLOYEES[i % EMPLOYEES.length],
      })),
  },

  rovereffectiveness: {
    label: "RoverEffectiveness",
    source: "QCM",
    object: "vwRoverEffectiveness",
    object_type: "view",
    columns: ["LOGDATE", "ShiftCode", "SHORTNAME", "MONO"],
    generate: (n) =>
      repeat(n, (i) => ({
        LOGDATE: dt(Math.floor(i / 4)),
        ShiftCode: SHIFTS[i % 2],
        SHORTNAME: CHAINS[i % CHAINS.length],
        MONO: jitter(90, 5),
      })),
  },

  production: {
    label: "Production",
    source: "QCM",
    object: "vwProduction",
    object_type: "view",
    columns: ["LogDate", "ShiftCode", "ProdGroup", "LoginManp"],
    generate: (n) =>
      repeat(n, (i) => ({
        LogDate: dt(Math.floor(i / 4)),
        ShiftCode: SHIFTS[i % 2],
        ProdGroup: GROUPS[i % GROUPS.length],
        LoginManp: `manp_${String.fromCharCode(97 + (i % 5))}`,
      })),
  },

  inlinevsendlinecomparison: {
    label: "InlineVSEndlineComparison",
    source: "QCM",
    object: "vwInlineVSEndlineComparison",
    object_type: "view",
    columns: ["LOGDATE", "ShiftCode", "SHORTNAME", "OPERA"],
    generate: (n) =>
      repeat(n, (i) => ({
        LOGDATE: dt(Math.floor(i / 4)),
        ShiftCode: SHIFTS[i % 2],
        SHORTNAME: CHAINS[i % CHAINS.length],
        OPERA: OPS[i % OPS.length],
      })),
  },

  empdefecteff: {
    label: "EmpDefectEff",
    source: "QCM",
    object: "vwEmpDefectEff",
    object_type: "view",
    columns: ["LogDate", "ShiftCode", "ProdGroup", "EmployeeNo"],
    generate: (n) =>
      repeat(n, (i) => ({
        LogDate: dt(Math.floor(i / 3)),
        ShiftCode: SHIFTS[i % 2],
        ProdGroup: GROUPS[i % GROUPS.length],
        EmployeeNo: EMPLOYEES[i % EMPLOYEES.length],
      })),
  },

  vwdefect: {
    label: "vwDefect",
    source: "QCM",
    object: "vwDefect",
    object_type: "view",
    columns: ["LOGDATE", "ShiftCode", "ProdGroup", "OpNo", "Qty"],
    generate: (n) =>
      repeat(n, (i) => ({
        LOGDATE: dt(Math.floor(i / 4)),
        ShiftCode: SHIFTS[i % 2],
        ProdGroup: GROUPS[i % GROUPS.length],
        OpNo: OPS[i % OPS.length],
        Qty: Math.floor(Math.random() * 10) + 1,
      })),
  },

  reject_qte: {
    label: "reject_qte",
    source: "QCM",
    object: "RejectQty",
    object_type: "view",
    columns: ["LogDate", "ShiftCode", "SHORTNAME", "STYLECODE"],
    generate: (n) =>
      repeat(n, (i) => ({
        LogDate: dt(Math.floor(i / 4)),
        ShiftCode: SHIFTS[i % 2],
        SHORTNAME: CHAINS[i % CHAINS.length],
        STYLECODE: STYLES[i % STYLES.length],
      })),
  },

  qcmdefecttrx: {
    label: "qcmdefecttrx",
    source: "QCM",
    object: "QCMDefectTrx",
    object_type: "view",
    columns: ["LOGDATE", "ShiftCode", "GROUPID", "TicketID", "ITEMID"],
    generate: (n) =>
      repeat(n, (i) => ({
        LOGDATE: dt(Math.floor(i / 4), 9 + (i % 4)),
        ShiftCode: SHIFTS[i % 2],
        GROUPID: GROUPS[i % GROUPS.length],
        TicketID: `TK-${10001 + i}`,
        ITEMID: `IT-${String.fromCharCode(65 + (i % 3))}0${(i % 9) + 1}`,
      })),
  },

  checkpassqte: {
    label: "checkpassqte",
    source: "QCM",
    object: "QCCheckPassQty",
    object_type: "view",
    columns: ["LOGDATE", "SHORTNAME", "ShiftCode", "DefectPct"],
    generate: (n) =>
      repeat(n, (i) => ({
        LOGDATE: dt(Math.floor(i / 4)),
        SHORTNAME: CHAINS[i % CHAINS.length],
        ShiftCode: SHIFTS[i % 2],
        DefectPct: jitter(1.5, 30),
      })),
  },

  mp_famille: {
    label: "mp_famille",
    source: "DIVATEX",
    object: "mp_famille",
    object_type: "table",
    columns: ["IDMPFamille", "Famille", "Etat", "Code", "Ordre", "Type"],
    generate: () => [
      { IDMPFamille: 1, Famille: "Coton", Etat: 1, Code: "COT", Ordre: 1, Type: "M" },
      { IDMPFamille: 2, Famille: "Lin", Etat: 1, Code: "LIN", Ordre: 2, Type: "M" },
      { IDMPFamille: 3, Famille: "Polyester", Etat: 1, Code: "POL", Ordre: 3, Type: "M" },
      { IDMPFamille: 4, Famille: "Élasthanne", Etat: 1, Code: "ELA", Ordre: 4, Type: "M" },
      { IDMPFamille: 5, Famille: "TISSU", Etat: 1, Code: "TIS", Ordre: 5, Type: "T" },
    ],
  },

  mp: {
    label: "mp",
    source: "DIVATEX",
    object: "mp",
    object_type: "table",
    columns: ["IDMPFamille", "IDMP", "Description", "Commentaire"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDMPFamille: (i % 5) + 1,
        IDMP: 1001 + i,
        Description: `Tissu réf. ${1001 + i} — ${COLORS[i % COLORS.length]}`,
        Commentaire: i % 4 === 0 ? "Stock principal" : i % 4 === 1 ? "Import" : null,
      })),
  },

  ofabrication: {
    label: "ofabrication",
    source: "DIVATEX",
    object: "ofabrication",
    object_type: "table",
    columns: ["IDOFabrication", "OFabrication", "DtDebut", "DtFin"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDOFabrication: 7845 + i,
        OFabrication: `OF-2026-0${412 + i}`,
        DtDebut: dt(14 - i * 2, 6),
        DtFin: i % 3 === 0 ? dt(12 - i * 2, 18) : null,
      })),
  },

  mouvement: {
    label: "mouvement",
    source: "DIVATEX",
    object: "mouvement",
    object_type: "table",
    columns: ["IDBonLivraisonAchat", "IDSynchronisation", "IDMvt"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDBonLivraisonAchat: 4521 + i,
        IDSynchronisation: 8812 + i,
        IDMvt: 100234 + i,
      })),
  },

  mpconteneur: {
    label: "mpconteneur",
    source: "DIVATEX",
    object: "mp_conteneur",
    object_type: "table",
    columns: ["IDMPFamille", "IDMP_Conteneur", "NumConteneur"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDMPFamille: (i % 5) + 1,
        IDMP_Conteneur: 5001 + i,
        NumConteneur: `CTN-${String.fromCharCode(65 + (i % 3))}${String.fromCharCode(65 + ((i + 1) % 3))}${1234 + i}`,
      })),
  },

  articlescolis: {
    label: "articlescolis",
    source: "DIVATEX",
    object: "articlecolis",
    object_type: "table",
    columns: ["IDArticleColis", "IDColis", "IDArticle", "IDAr_Couleur"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDArticleColis: 30001 + i,
        IDColis: 2001 + Math.floor(i / 3),
        IDArticle: 501 + (i % 10),
        IDAr_Couleur: (i % 15) + 1,
      })),
  },

  detailcolis: {
    label: "detail colis",
    source: "DIVATEX",
    object: "detailcolis",
    object_type: "table",
    columns: ["IDDetailColis", "IDColis", "IdTaille", "LibTaille", "Qtte"],
    generate: (n) => {
      const sizes = [
        { id: 1, lib: "XS" },
        { id: 2, lib: "S" },
        { id: 3, lib: "M" },
        { id: 4, lib: "L" },
        { id: 5, lib: "XL" },
        { id: 6, lib: "XXL" },
      ];
      return repeat(n, (i) => ({
        IDDetailColis: 70001 + i,
        IDColis: 2001 + Math.floor(i / 4),
        IdTaille: sizes[i % sizes.length].id,
        LibTaille: sizes[i % sizes.length].lib,
        Qtte: [8, 10, 12, 14, 10, 6][i % 6],
      }));
    },
  },

  expeditions: {
    label: "expeditions",
    source: "DIVATEX",
    object: "expedition",
    object_type: "table",
    columns: ["IDExpedition", "LibExpedition", "DateCreation"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDExpedition: 901 + i,
        LibExpedition: `EXP-2026-0${401 + i * 7 > 431 ? ((401 + i * 7) % 30) + 1 : 401 + i * 7}`,
        DateCreation: dt(30 - i * 5, 9, 30),
      })),
  },

  vue_stock: {
    label: "vue_stock",
    source: "DIVATEX",
    object: "v_stockmp",
    object_type: "view",
    columns: ["idmp", "codemp", "designation", "Couleur", "Famille"],
    generate: (n) =>
      repeat(n, (i) => {
        const familles = ["Coton", "Lin", "Polyester", "Élasthanne", "TISSU"];
        return {
          idmp: 1001 + i,
          codemp: `MP-${String(i + 1).padStart(3, "0")}`,
          designation: `Tissu ${familles[i % familles.length]} ${COLORS[i % COLORS.length]} ${150 + (i % 5) * 25}g`,
          Couleur: COLORS[i % COLORS.length],
          Famille: familles[i % familles.length],
        };
      }),
  },

  diva_stock: {
    label: "diva",
    source: "DIVATEX",
    object: "mvtstock",
    object_type: "table",
    columns: ["IDMvtStock", "IDMP", "IDMagasin", "Qtte", "qtteReserve"],
    generate: (n) =>
      repeat(n, (i) => ({
        IDMvtStock: 880012 + i,
        IDMP: 1001 + (i % 50),
        IDMagasin: (i % 3) + 1,
        Qtte: Math.floor(Math.random() * 1000) + 50,
        qtteReserve: Math.floor(Math.random() * 200),
      })),
  },
};

// ─────────────────────────────────────────────────────────────
//  SECTION 3 — 36 SQL QUERIES
// ─────────────────────────────────────────────────────────────

const QUERIES = {
  colis_total_3var: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CMDS.flatMap((cmd) =>
        ARTICLES.slice(0, 2).map((art, j) => ({
          commande: cmd,
          article: art,
          couleur: COLORS[j],
          total_colis: Math.floor(jitter(18, 20)),
          total_pieces: Math.floor(jitter(216, 20)),
        })),
      ),
  },

  packets_rejetes: {
    prestataire: "Prestataire Alpha",
    generate: () => {
      const motifs = [
        "Défaut couture",
        "Erreur taille",
        "Tache tissu",
        "Mauvais coloris",
        "Défaut broderie",
      ];
      return repeat(10, (i) => ({
        IDColis: 2001 + i * 4,
        reference: `PK-${String(i + 1).padStart(4, "0")}`,
        motif: motifs[i % motifs.length],
        qtte: Math.floor(Math.random() * 15) + 2,
        date_rejet: dt(i % 3, 9 + i, 0),
      }));
    },
  },

  wip_chaine: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CHAINS.map((ch, i) => ({
        chaine: ch,
        en_cours: Math.floor(jitter(1200, 15)),
        entree_jour: Math.floor(jitter(380, 10)),
        sortie_jour: Math.floor(jitter(355, 10)),
        of: OFS[i % OFS.length],
        article: ARTICLES[i % ARTICLES.length],
      })),
  },

  taging_reel: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CHAINS.flatMap((ch) =>
        SHIFTS.map((sh) => {
          const theorique = 1500;
          const reel = Math.floor(jitter(theorique, 5));
          return {
            chaine: ch,
            shift: sh,
            tag_theorique: theorique,
            tag_reel: reel,
            ecart_pct: parseFloat((((reel - theorique) / theorique) * 100).toFixed(2)),
          };
        }),
      ),
  },

  etat_avancement: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      OFS.map((of, i) => {
        const prevue = [3000, 2500, 1800, 2200][i];
        const pct = [78.2, 42.5, 100, 61.3][i];
        return {
          of,
          avancement_pct: pct,
          quantite_prevue: prevue,
          quantite_realisee: Math.round((prevue * pct) / 100),
          statut: pct >= 100 ? "termine" : "en_cours",
        };
      }),
  },

  efficience_chaine: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CHAINS.flatMap((ch) =>
        [0, 1].map((daysAgo) => ({
          chaine: ch,
          date: today(daysAgo),
          heures_prod: 8,
          heures_standards: parseFloat(jitter(7.1, 5).toFixed(2)),
          efficience_pct: Math.floor(jitter(88, 5)),
        })),
      ),
  },

  minutes_presence: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      EMPLOYEES.flatMap((emp) =>
        [0, 1].map((daysAgo) => ({
          employe: emp,
          date: today(daysAgo),
          minutes_presence: Math.floor(jitter(465, 5)),
          chaine: CHAINS[Math.floor(Math.random() * CHAINS.length)],
        })),
      ),
  },

  minutes_produites: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      EMPLOYEES.flatMap((emp) =>
        [0, 1].map((daysAgo) => ({
          employe: emp,
          date: today(daysAgo),
          minutes_produites: Math.floor(jitter(415, 8)),
          chaine: CHAINS[Math.floor(Math.random() * CHAINS.length)],
        })),
      ),
  },

  temps_operation: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      OPS.map((op) => {
        const standard = { OP10: 42, OP20: 38.5, OP30: 55, OP40: 47 }[op] || 45;
        const reel = parseFloat(jitter(standard, 8).toFixed(1));
        return {
          operation: op,
          temps_standard_s: standard,
          temps_reel_s: reel,
          ecart_pct: parseFloat((((reel - standard) / standard) * 100).toFixed(2)),
        };
      }),
  },

  lost_time: {
    prestataire: "Prestataire Alpha",
    generate: () => {
      const motifs = ["MAINT", "MATIERE", "QUALITE", "ELECTR", "PERSON"];
      return CHAINS.flatMap((ch) =>
        motifs.slice(0, 3).map((m) => ({
          date: today(),
          chaine: ch,
          motif: m,
          minutes_perdues: Math.floor(Math.random() * 45) + 5,
        })),
      );
    },
  },

  qte_produite: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CHAINS.flatMap((ch) =>
        SHIFTS.map((sh) => ({
          date: today(),
          chaine: ch,
          shift: sh,
          quantite: Math.floor(jitter(1400, 8)),
        })),
      ),
  },

  qte_entree_serigraphie: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      ARTICLES.map((art, i) => ({
        date: today(i % 2),
        article: art,
        couleur: COLORS[i],
        quantite: Math.floor(jitter(500, 12)),
      })),
  },

  qte_depart_chaine_article_of: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      OFS.flatMap((of) =>
        CHAINS.slice(0, 2).map((ch) => ({
          of,
          chaine: ch,
          article: ARTICLES[OFS.indexOf(of) % ARTICLES.length],
          quantite: Math.floor(jitter(900, 15)),
        })),
      ),
  },

  sortie_serigraphie: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      ARTICLES.map((art, i) => ({
        date: today(i % 2),
        article: art,
        couleur: COLORS[i],
        quantite: Math.floor(jitter(460, 10)),
      })),
  },

  qte_engagement: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CMDS.map((cmd, i) => ({
        commande: cmd,
        of: OFS[i % OFS.length],
        article: ARTICLES[i % ARTICLES.length],
        quantite_engagee: Math.floor(jitter(1500, 10)),
      })),
  },

  sortie_coupe: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      CMDS.map((cmd, i) => ({
        commande: cmd,
        date: today(i + 1),
        quantite_coupee: Math.floor(jitter(1800, 5)),
      })),
  },

  qte_produite_indiv_jour: {
    prestataire: "Prestataire Alpha",
    generate: () =>
      EMPLOYEES.map((emp, i) => ({
        employe: emp,
        date: today(),
        chaine: CHAINS[i % CHAINS.length],
        quantite: Math.floor(jitter(415, 8)),
        minutes_produites: Math.floor(jitter(415, 8)),
      })),
  },

  pieces_ok_de_premier_coup_jour_en_cours: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ FirstPassToday: Math.floor(jitter(2947, 3)) }],
  },

  pieces_produites_jour_en_cours: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ ProducedToday: Math.floor(jitter(3020, 5)) }],
  },

  rejets_suite_inspection_paquet_jour_en_cours: {
    prestataire: "Prestataire Alpha",
    actif: false,
    generate: () => [{ BundleRejectToday: Math.floor(Math.random() * 3) }],
  },

  inspections_paquet_jour_en_cours: {
    prestataire: "Prestataire Alpha",
    actif: false,
    generate: () => [{ BundleInspectedToday: Math.floor(Math.random() * 5) }],
  },

  pieces_ok_de_premier_coup_annee_en_cours: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ FirstPassYear: Math.floor(jitter(1664359, 1)) }],
  },

  pieces_produites_annee_en_cours: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ ProducedYear: Math.floor(jitter(1700000, 1)) }],
  },

  rejets_suite_inspection_paquet_annee_en_cours: {
    prestataire: "Prestataire Alpha",
    actif: false,
    generate: () => [{ BundleRejectYear: Math.floor(Math.random() * 10) }],
  },

  inspections_paquet_annee_en_cours: {
    prestataire: "Prestataire Alpha",
    actif: false,
    generate: () => [{ BundleInspectedYear: Math.floor(Math.random() * 20) + 2 }],
  },

  "requete_unifiee_dashboard_tout-en-un": {
    prestataire: "Prestataire Alpha",
    actif: false,
    generate: () => [
      {
        FirstPassToday: Math.floor(jitter(2947, 3)),
        ProducedToday: Math.floor(jitter(3020, 5)),
        BundleRejectToday: Math.floor(Math.random() * 3),
        BundleInspectedToday: Math.floor(Math.random() * 5),
        FirstPassYear: Math.floor(jitter(1664359, 1)),
        ProducedYear: Math.floor(jitter(1700000, 1)),
        BundleRejectYear: Math.floor(Math.random() * 10),
        BundleInspectedYear: Math.floor(Math.random() * 20) + 2,
      },
    ],
  },

  stock_moyen: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ StockMoyen: jitter(38035.07, 2), NbLignesStock: 4261 }],
  },

  articles_sans_mouvement_durant_365_jours: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ NbArticles_SansMvt_365j: 843, Qtte_SansMvt_365j: jitter(147329728.72, 1) }],
  },

  quantite_totale_du_stock: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ Quantite_Totale_Stock: jitter(162067420.25, 0.5) }],
  },

  capacite_de_stockage_en_nombre_de_conteneurs: {
    prestataire: "Prestataire Alpha",
    generate: () => [
      {
        Total_Conteneurs: 132228,
        Conteneurs_Actifs: String(Math.floor(jitter(42864, 2))),
        Conteneurs_Consommes: String(Math.floor(jitter(88499, 1))),
        Conteneurs_Supprimes: "865",
      },
    ],
  },

  nombre_de_rouleaux: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ NbRouleaux: Math.floor(jitter(39031, 3)) }],
  },

  nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel: {
    prestataire: "Prestataire Alpha",
    generate: () => [
      {
        NbOF_Livres_Total: 4270,
        OF_AvecTransfertCoupe: 2411,
        OF_AvecTransfertCoupeJemmel: 805,
        OF_AvecTransfertCoupe_Total: 3213,
      },
    ],
  },

  moyenne_date_de_transfert_date_de_reservation: {
    prestataire: "Prestataire Alpha",
    generate: () => [{ MoyenneJours: String(jitter(4.16, 5).toFixed(2)), NbOFConsideres: 6576 }],
  },

  quantite_par_provenance_total: {
    prestataire: "Prestataire Alpha",
    generate: () => [
      { Provenance: "Chine", Quantite: jitter(38700, 5), NbArticles: 7 },
      { Provenance: "France", Quantite: jitter(112576, 3), NbArticles: 2 },
      { Provenance: "NON RENSEIGNE", Quantite: jitter(161916144.25, 1), NbArticles: 2114 },
      { Provenance: null, Quantite: jitter(162067420.25, 1), NbArticles: 2123 },
    ],
  },

  quantite_par_famille: {
    prestataire: "Prestataire Alpha",
    generate: () => [
      { FamilleFG: "AUTRE", Quantite: jitter(160427351.85, 1) },
      { FamilleFG: "DOMYOS", Quantite: jitter(70864, 3) },
      { FamilleFG: "KALENJI", Quantite: jitter(54271, 3) },
      { FamilleFG: "KIPSTA", Quantite: jitter(408392.4, 2) },
      { FamilleFG: "NABAIJI", Quantite: jitter(336827, 2) },
      { FamilleFG: "OLAIAN", Quantite: jitter(121725, 2) },
      { FamilleFG: "QUECHUA", Quantite: jitter(275442, 2) },
      { FamilleFG: "TRIBORD", Quantite: jitter(14538, 2) },
      { FamilleFG: "WEDZE", Quantite: jitter(358009, 2) },
      { FamilleFG: null, Quantite: jitter(162067420.25, 1) },
    ],
  },

  quantite_par_typologie_fournitures: {
    prestataire: "Prestataire Alpha",
    generate: () => [
      { Typologie: "ACCESSOIR", Quantite: jitter(86807, 3), NbArticles: 3 },
      { Typologie: "ANA HANGTAG PEMPE", Quantite: jitter(2080, 3), NbArticles: 1 },
      { Typologie: "ANNEAU", Quantite: jitter(61440, 3), NbArticles: 5 },
      { Typologie: "ANTIGLISE", Quantite: jitter(30792.8, 3), NbArticles: 6 },
      { Typologie: "BILLET", Quantite: jitter(35868.24, 3), NbArticles: 4 },
      { Typologie: "CIENTRE", Quantite: jitter(1237428, 2), NbArticles: 10 },
      { Typologie: "COQUE", Quantite: jitter(449071, 2), NbArticles: 66 },
      { Typologie: "CORDON", Quantite: jitter(457758.69, 2), NbArticles: 93 },
      { Typologie: "ELASTIQUE", Quantite: jitter(1313886.88, 2), NbArticles: 65 },
      { Typologie: "EMBALLAGE", Quantite: jitter(228930, 2), NbArticles: 34 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — JOBS
// ─────────────────────────────────────────────────────────────

const JOBS_CATALOGUE = [
  { id: 25, nom: "colis", action_ref: "colis_total_3var" },
  { id: 26, nom: "packet rejeter", action_ref: "packets_rejetes" },
  { id: 27, nom: "wip", action_ref: "wip_chaine" },
  { id: 28, nom: "taging", action_ref: "taging_reel" },
  { id: 29, nom: "etat avancement", action_ref: "etat_avancement" },
  { id: 30, nom: "etat davancement", action_ref: "etat_avancement" },
  { id: 31, nom: "eff/ch", action_ref: "efficience_chaine" },
  { id: 32, nom: "min presence", action_ref: "minutes_presence" },
  { id: 33, nom: "min produite", action_ref: "minutes_produites" },
  { id: 34, nom: "temp d'opération", action_ref: "temps_operation" },
  { id: 35, nom: "lost time", action_ref: "lost_time" },
  { id: 36, nom: "qte produite", action_ref: "qte_produite" },
  { id: 37, nom: "qte sergraphie", action_ref: "qte_entree_serigraphie" },
  { id: 38, nom: "qte depart chaine", action_ref: "qte_depart_chaine_article_of" },
  { id: 39, nom: "sortie serigraphe", action_ref: "sortie_serigraphie" },
  { id: 40, nom: "qte engagement", action_ref: "qte_engagement" },
  { id: 41, nom: "sortie coupe", action_ref: "sortie_coupe" },
  { id: 42, nom: "qte produite par jour", action_ref: "qte_produite_indiv_jour" },
  { id: 43, nom: "qte par typologie fourniture", action_ref: "quantite_par_typologie_fournitures" },
  { id: 44, nom: "qte par famille", action_ref: "quantite_par_famille" },
  { id: 45, nom: "qte par provenance", action_ref: "quantite_par_provenance_total" },
  { id: 46, nom: "moyene date", action_ref: "moyenne_date_de_transfert_date_de_reservation" },
  {
    id: 47,
    nom: "nbre dof livree",
    action_ref: "nombre_d_ofs_livres_avec_date_de_transfert_coupe_coupe_jemmel",
  },
  { id: 48, nom: "nbre roulot", action_ref: "nombre_de_rouleaux" },
  { id: 49, nom: "capacité stockage", action_ref: "capacite_de_stockage_en_nombre_de_conteneurs" },
  { id: 50, nom: "qte total stock", action_ref: "quantite_totale_du_stock" },
  { id: 51, nom: "article sans mouvement", action_ref: "articles_sans_mouvement_durant_365_jours" },
  { id: 52, nom: "stock moyen", action_ref: "stock_moyen" },
  { id: 53, nom: "unifié", action_ref: "requete_unifiee_dashboard_tout-en-un" },
  {
    id: 54,
    nom: "inspection packet annes en cours",
    action_ref: "inspections_paquet_annee_en_cours",
  },
  {
    id: 55,
    nom: "rejet suite ionspection",
    action_ref: "rejets_suite_inspection_paquet_annee_en_cours",
  },
  { id: 56, nom: "inspection annes en cours", action_ref: "inspections_paquet_annee_en_cours" },
  {
    id: 57,
    nom: "rejet anne sen cours",
    action_ref: "rejets_suite_inspection_paquet_annee_en_cours",
  },
  { id: 58, nom: "piece en cours", action_ref: "pieces_produites_annee_en_cours" },
  { id: 59, nom: "piece ok", action_ref: "pieces_ok_de_premier_coup_annee_en_cours" },
  { id: 60, nom: "inspection packet", action_ref: "inspections_paquet_jour_en_cours" },
  {
    id: 61,
    nom: "rejet jour en cours",
    action_ref: "rejets_suite_inspection_paquet_jour_en_cours",
  },
  { id: 62, nom: "piece produit jour", action_ref: "pieces_produites_jour_en_cours" },
  { id: 63, nom: "colis", action_ref: "colis_total_3var" },
  { id: 64, nom: "Google Drive Sync (Accessoires)", action_ref: "quantite_par_typologie_fournitures" },
  { id: 65, nom: "Spreadsheet Import (BR Print)", action_ref: "packets_rejetes" },
  ];

// ─────────────────────────────────────────────────────────────
//  ROUTES — /api/data/:nom
// ─────────────────────────────────────────────────────────────

app.get("/api/data/:nom", (req, res) => {
  const nom = req.params.nom.toLowerCase();
  const def = ENDPOINTS[nom];
  if (!def) {
    return res.status(404).json({ success: false, error: `Endpoint '${nom}' not found` });
  }

  const raw = def.generate(200); // generate a pool of 200 rows
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const data = paginate(raw, limit, offset);

  res.json({
    success: true,
    endpoint: nom,
    label: def.label,
    source: def.source,
    object: def.object,
    object_type: def.object_type,
    columns: def.columns,
    date_filter: "none",
    count: data.length,
    data,
  });
});

// ─────────────────────────────────────────────────────────────
//  ROUTES — /api/data/q/:slug
// ─────────────────────────────────────────────────────────────

app.get("/api/data/q/:slug", (req, res) => {
  const slug = req.params.slug;
  const def = QUERIES[slug];
  if (!def) {
    return res.status(404).json({ success: false, error: `Query '${slug}' not found` });
  }

  const raw = def.generate();
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const data = paginate(raw, Math.min(limit, 1000), offset);

  res.json({
    success: true,
    query: slug,
    prestataire: def.prestataire,
    count: data.length,
    limit: Math.min(limit, 1000),
    offset,
    data,
  });
});

// ─────────────────────────────────────────────────────────────
//  ROUTES — /api/admin/jobs
// ─────────────────────────────────────────────────────────────

app.get("/api/admin/jobs", (req, res) => {
  const jobs = JOBS_CATALOGUE.map((j) => ({
    id: j.id,
    nom: j.nom,
    label: j.nom,
    schedule: "*/1 * * * *",
    action_type: "run_query",
    action_ref: j.action_ref,
    actif: true,
    last_run: new Date(Date.now() - Math.floor(Math.random() * 10 * 60 * 1000)).toISOString(),
    last_status: "ok",
    last_message: `Requête exécutée : ${(QUERIES[j.action_ref]?.generate() || []).length} ligne(s) retournée(s).`,
    created_at: "2026-04-28T08:14:11.994Z",
  }));
  res.json({ success: true, data: jobs });
});

app.get("/api/admin/jobs/:id/run", (req, res) => {
  const id = parseInt(req.params.id);
  const job = JOBS_CATALOGUE.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ success: false, error: `Job ${id} not found` });
  }
  const data = QUERIES[job.action_ref]?.generate() || [];
  res.json({
    success: true,
    status: "ok",
    message: `Requête exécutée : ${data.length} ligne(s) retournée(s).`,
    ran_at: new Date(Date.now() - Math.floor(Math.random() * 10 * 60 * 1000)).toISOString(),
    data,
  });
});

// ─────────────────────────────────────────────────────────────
//  HEALTH + INDEX
// ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "MOCK",
    endpoints: Object.keys(ENDPOINTS).length,
    queries: Object.keys(QUERIES).length,
    jobs: JOBS_CATALOGUE.length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Novacity Mock API",
    version: "1.2",
    mode: "🟡 MOCK — replace BASE_URL to switch to production",
    docs: {
      configured_endpoints: `/api/data/:nom   (${Object.keys(ENDPOINTS).length} available)`,
      custom_queries: `/api/data/q/:slug   (${Object.keys(QUERIES).length} available)`,
      admin_jobs: "/api/admin/jobs",
    },
    available_endpoints: Object.keys(ENDPOINTS),
    available_queries: Object.keys(QUERIES),
  });
});

// ─────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║   NOVACITY MOCK API  —  🟡 MOCK MODE     ║");
  console.log(`  ║   http://localhost:${PORT}                  ║`);
  console.log("  ║                                          ║");
  console.log(`  ║   Endpoints : ${Object.keys(ENDPOINTS).length}                          ║`);
  console.log(`  ║   Queries   : ${Object.keys(QUERIES).length}                          ║`);
  console.log(`  ║   Jobs      : ${JOBS_CATALOGUE.length}                          ║`);
  console.log("  ╚══════════════════════════════════════════╝");
  console.log("");
  console.log("  Pass any value as  x-api-key  header.");
  console.log("  Admin routes accept any  Bearer <token>.");
  console.log("");
});
