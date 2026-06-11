// Deterministic mock data for BACOVET dashboard.
// Swap with real Novacity API calls once x-api-key is provided.

export type Status = "green" | "orange" | "red";

export function statusFor(value: number, target: number, kind: "min" | "max" = "min"): Status {
  if (kind === "min") {
    if (value >= target) return "green";
    if (value >= target - 3) return "orange";
    return "red";
  }
  if (value <= target - 1) return "green";
  if (value <= target) return "orange";
  return "red";
}

// ---- Quality ----
export const quality = {
  rftToday: 97.2,
  brBundlingToday: 4.3,
  brPrintToday: 5.6,
  brCglYear: 3.8,
  rftYear: 96.8,
  brBundlingYear: 4.1,
  brByStage: [
    { stage: "CGL", value: 3.8 },
    { stage: "AQL", value: 2.1 },
    { stage: "Bundling", value: 4.3 },
    { stage: "Print", value: 5.6 },
    { stage: "Accessoires", value: 1.9 },
    { stage: "Composants", value: 2.7 },
  ],
  trend: Array.from({ length: 11 }, (_, i) => ({
    mois: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov"][i],
    rft: 95 + Math.sin(i / 2) * 2 + i * 0.15,
    br: 4.5 + Math.cos(i / 2) * 0.6,
  })),
  alerts: [
    { type: "BR PRINT CRITIQUE", of: "OF-4402", time: "08:42", level: "red" as const },
    { type: "RFT EN BAISSE", of: "OF-4391", time: "08:15", level: "orange" as const },
    { type: "AQL VALIDÉ", of: "OF-4388", time: "07:58", level: "green" as const },
    { type: "BUNDLING ALERT", of: "OF-4385", time: "07:30", level: "orange" as const },
  ],
  paretoRft: [
    { op: "Op-93 Surfilage", qty: 142 },
    { op: "Op-47 Assemblage", qty: 98 },
    { op: "Op-12 Pose poche", qty: 76 },
    { op: "Op-65 Ourlet", qty: 54 },
    { op: "Op-21 Surpiqûre", qty: 38 },
  ],
  paretoColis: [
    { item: "Tâche", count: 64 },
    { item: "Couture ouverte", count: 51 },
    { item: "Trou", count: 33 },
    { item: "Mesure HS", count: 22 },
    { item: "Étiquette", count: 14 },
  ],
};

// ---- Production ----
export const production = {
  chains: [
    { id: "CH1", of: "OF-4402", article: "ART-880-NB", sam: 14.2, effectif: 22, objectif: 980, eff: 88.5, owe: 74.2, wip: 320, arrets: 6 },
    { id: "CH2", of: "OF-4391", article: "ART-721-QU", sam: 12.8, effectif: 24, objectif: 1100, eff: 82.1, owe: 68.4, wip: 410, arrets: 14 },
    { id: "CH3", of: "OF-4388", article: "ART-540-TB", sam: 16.0, effectif: 20, objectif: 850, eff: 91.3, owe: 78.0, wip: 280, arrets: 4 },
  ],
  stoppages: [
    { chaine: "CH1", motif: "MAINT", start: 9.5, duration: 0.6 },
    { chaine: "CH2", motif: "MATIERE", start: 10.2, duration: 1.4 },
    { chaine: "CH2", motif: "QUALITE", start: 13.1, duration: 0.5 },
    { chaine: "CH3", motif: "MAINT", start: 14.5, duration: 0.3 },
  ],
  ofProgress: [
    { of: "OF-4402", pct: 68, statut: "en_cours" },
    { of: "OF-4391", pct: 42, statut: "en_cours" },
    { of: "OF-4388", pct: 91, statut: "en_cours" },
    { of: "OF-4377", pct: 100, statut: "terminé" },
  ],
  soByOf: [
    { of: "OF-4402", realise: 680, restant: 320 },
    { of: "OF-4391", realise: 420, restant: 580 },
    { of: "OF-4388", realise: 770, restant: 80 },
  ],
  topOperators: Array.from({ length: 10 }, (_, i) => ({
    nom: ["A. Belhaj", "S. Karoui", "M. Trabelsi", "N. Saidi", "I. Mansouri", "L. Bouzid", "K. Hammami", "R. Jemal", "F. Triki", "Y. Chaouch"][i],
    eff: 95 - i * 1.3,
  })),
  effPerOp: Array.from({ length: 10 }, (_, i) => ({
    nom: ["A.B", "S.K", "M.T", "N.S", "I.M", "L.B", "K.H", "R.J", "F.T", "Y.C"][i],
    minutes: 380 + Math.round(Math.cos(i) * 60),
  })),
  wip7d: Array.from({ length: 7 }, (_, i) => ({
    date: `J-${6 - i}`,
    sortie: 900 + Math.round(Math.sin(i) * 120),
    engagement: 1100 + Math.round(Math.cos(i) * 100),
  })),
  effCumul: Array.from({ length: 28 }, (_, i) => ({
    jour: i + 1,
    eff: 82 + Math.sin(i / 3) * 6,
  })),
  serigraphie: [
    { article: "ART-880-NB", entree: 1200, sortie: 980 },
    { article: "ART-721-QU", entree: 900, sortie: 870 },
    { article: "ART-540-TB", entree: 1500, sortie: 1320 },
    { article: "ART-310-DM", entree: 700, sortie: 540 },
  ],
};

// ---- Logistics ----
export const logistics = {
  dot: 94.2,
  hot: 96.5,
  respectPlan: 92.8,
  leadTime: 32,
  nextExport: "16:30 — Conteneur EXP-2241",
  rotation: { accessoires: 4.2, tissu: 3.1, fg: 5.4 },
  stockMort: { accessoires: 7.8, tissu: 9.4, fg: 3.1 },
  occupation: { accessoires: 78, tissu: 84, fg: 71 },
  provenance: [
    { name: "Chine", value: 4200 },
    { name: "France", value: 1850 },
    { name: "Turquie", value: 920 },
    { name: "Non renseigné", value: 310 },
  ],
  brand: [
    { name: "NABAIJI", value: 1200 },
    { name: "DOMYOS", value: 1800 },
    { name: "KALENJI", value: 950 },
    { name: "KIPSTA", value: 780 },
    { name: "QUECHUA", value: 1500 },
    { name: "TRIBORD", value: 640 },
    { name: "WEDZE", value: 420 },
    { name: "AUTRE", value: 310 },
  ],
  typologie: [
    { name: "Cordon", value: 540 },
    { name: "Élastique", value: 820 },
    { name: "Coque", value: 230 },
    { name: "Cintre", value: 410 },
    { name: "Emballage", value: 1100 },
    { name: "Anti-glisse", value: 180 },
    { name: "Étiquette", value: 720 },
    { name: "Autres", value: 980 },
  ],
  livrees: { accessoires: 84, tissu: 78, fg: 91 },
  delai: { accessoires: 1.2, tissu: 1.6, fg: 0.9 },
  ofList: [
    { of: "OF-4402", avancement: 68, prevue: 1000, realisee: 680, statut: "en_cours", engagement: 820 },
    { of: "OF-4391", avancement: 42, prevue: 1000, realisee: 420, statut: "en_cours", engagement: 540 },
    { of: "OF-4388", avancement: 91, prevue: 850, realisee: 770, statut: "en_cours", engagement: 840 },
    { of: "OF-4377", avancement: 100, prevue: 600, realisee: 600, statut: "terminé", engagement: 600 },
    { of: "OF-4365", avancement: 12, prevue: 1200, realisee: 144, statut: "en_cours", engagement: 200 },
  ],
  couverture: {
    chaine: [{ name: "CH1", jours: 12 }, { name: "CH2", jours: 8 }, { name: "CH3", jours: 14 }],
    coupe: [{ name: "ART-880", jours: 9 }, { name: "ART-721", jours: 6 }, { name: "ART-540", jours: 11 }],
    seri: [{ name: "ART-880", jours: 7 }, { name: "ART-721", jours: 4 }, { name: "ART-540", jours: 10 }],
  },
  stock: [
    { code: "MP-1042", des: "Tissu coton 220g", famille: "Tissu", couleur: "Noir", qte: 4200, res: 1200 },
    { code: "MP-2017", des: "Élastique 20mm", famille: "Fourniture", couleur: "Blanc", qte: 8500, res: 2400 },
    { code: "MP-3308", des: "Cordon polyester", famille: "Fourniture", couleur: "Bleu", qte: 1200, res: 300 },
    { code: "MP-4421", des: "Étiquette tissée DOMYOS", famille: "Étiquette", couleur: "—", qte: 18000, res: 5400 },
    { code: "MP-5102", des: "Zip métal 60cm", famille: "Accessoire", couleur: "Argent", qte: 2200, res: 900 },
  ],
};

// ---- Development ----
export const development = {
  rft: 96.4,
  livraison: 93.8,
  fiabilite: 98.7,
  reclamations: 1.6,
  decifrage: 87.2,
  etalonnage: 100,
  fiabiliteTrend: Array.from({ length: 12 }, (_, i) => ({
    mois: ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"][i],
    valeur: 96 + Math.sin(i / 2) * 1.8,
  })),
};

// ---- Admin ----
export const adminData = {
  apis: [
    { name: "ERP DIVA", status: "ok", last: "il y a 12 s" },
    { name: "GPRO-PROD", status: "ok", last: "il y a 22 s" },
    { name: "Google Drive", status: "ok", last: "il y a 1 min" },
    { name: "Novacity API", status: "ok", last: "il y a 8 s" },
  ],
  users: [
    { name: "Ahmed Belhaj", role: "Responsable Production", email: "a.belhaj@bacovet.com", active: true },
    { name: "Sonia Karoui", role: "Responsable Qualité", email: "s.karoui@bacovet.com", active: true },
    { name: "Mehdi Trabelsi", role: "Chef d'Atelier", email: "m.trabelsi@bacovet.com", active: true },
    { name: "Nadia Saidi", role: "Méthodes / Planning", email: "n.saidi@bacovet.com", active: false },
    { name: "IT Admin", role: "Administrateur", email: "it@bacovet.com", active: true },
  ],
  logs: [
    { t: "10:42:11", lvl: "INFO", msg: "Synchronisation API Production réussie – 245 enregistrements" },
    { t: "10:41:02", lvl: "WARN", msg: "Latence détectée sur API Logistique – 850ms" },
    { t: "10:39:45", lvl: "SYSTEM", msg: "Sauvegarde automatique base de données terminée" },
    { t: "10:35:20", lvl: "USER", msg: "Connexion utilisateur s.karoui@bacovet.com" },
    { t: "10:30:00", lvl: "INFO", msg: "Job q/efficience_chaine exécuté (200 OK)" },
    { t: "10:25:14", lvl: "ERROR", msg: "Échec temporaire q/lost_time – retry réussi" },
  ],
  screens: [
    { name: "Atelier 1", online: true, view: "Production / Confection" },
    { name: "Atelier 2", online: true, view: "Production / Confection" },
    { name: "Coupe", online: true, view: "Production / Coupe" },
    { name: "Sérigraphie", online: false, view: "Production / Sérigraphie" },
    { name: "Qualité", online: true, view: "Qualité (100)" },
    { name: "Logistique", online: true, view: "Logistique (300)" },
  ],
};
