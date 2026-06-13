export type KpiKey =
  | "br_cgl"
  | "br_gtd_jour"
  | "rft_jour"
  | "br_bundling_jour"
  | "br_gtd_dda"
  | "rft_annee"
  | "br_bundling_annee"
  | "br_print"
  | "br_print_dda"
  | "br_care_label_jour"
  | "br_care_label_dda"
  | "br_accessoires_jour"
  | "br_accessoires_dda"
  | "br_compo_jour"
  | "br_compo_dda";

export interface KpiDetailConfig {
  id: string;
  label: string;
  description: string;
  formula: {
    numerator: { label: string; field: string };
    denominator: { label: string; field: string };
    multiplier: number;
    resultUnit: string;
  };
  target: { value: number; operator: "<=" | ">=" };
  thresholds: {
    green: string;
    orange: string;
    red: string;
    grey?: string;
  };
  source: {
    system: "DIVA" | "QCM" | "DRIVE" | "N/A";
    novacityEndpoint: string | null;
    mysqlTable: string | null;
    frequency: string;
    status: "live" | "pending" | "inactive" | "google_drive";
  };
  breakdownAvailable: boolean;
  trendAvailable: boolean;
  period: "jour" | "annee";
  exportFields: string[];
}

export const KPI_DETAIL_CONFIG: Record<KpiKey, KpiDetailConfig> = {
  br_cgl: {
    id: "101",
    label: "BR CGL — Inspection Commande (Annuel)",
    description:
      "Taux de pièces rejetées lors du contrôle final de commande depuis le début de l'année",
    formula: {
      numerator: {
        label: "Nombre de rejets inspection commande annuel",
        field: "br_reject_year",
      },
      denominator: {
        label: "Nombre d'inspections commande annuel",
        field: "br_inspected_year",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
      grey: "En attente — données DIVA non exposées",
    },
    source: {
      system: "DIVA",
      novacityEndpoint: null,
      mysqlTable: null,
      frequency: "En attente",
      status: "pending",
    },
    breakdownAvailable: false,
    trendAvailable: false,
    period: "annee",
    exportFields: ["kpi_id", "valeur", "cible", "statut"],
  },

  br_gtd_jour: {
    id: "102",
    label: "BR GTD — Contrôle fin de ligne (Aujourd'hui)",
    description:
      "Taux de pièces rejetées au contrôle fin de ligne ce jour, par chaîne de production",
    formula: {
      numerator: {
        label: "Rejets contrôle GTD (aujourd'hui)",
        field: "avg_defect_pct",
      },
      denominator: {
        label: "(Moyenne — pas un ratio)",
        field: "AVG(defect_pct)",
      },
      multiplier: 1,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
    },
    source: {
      system: "QCM",
      novacityEndpoint: "checkpassqte",
      mysqlTable: "check_pass_qte",
      frequency: "Temps réel",
      status: "live",
    },
    breakdownAvailable: true,
    trendAvailable: true,
    period: "jour",
    exportFields: ["chain", "defect_pct", "status", "target"],
  },

  rft_jour: {
    id: "104",
    label: "RFT — Right First Time (Aujourd'hui)",
    description:
      "Pourcentage de pièces conformes produites du premier coup ce jour",
    formula: {
      numerator: {
        label: "Pièces OK premier coup (aujourd'hui)",
        field: "first_pass_today",
      },
      denominator: {
        label: "Pièces produites (aujourd'hui)",
        field: "produced_today",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 98, operator: ">=" },
    thresholds: {
      green: "≥ 98%",
      orange: "95% – 98%",
      red: "< 95%",
    },
    source: {
      system: "QCM",
      novacityEndpoint:
        "pieces_ok_de_premier_coup_jour_en_cours + pieces_produites_jour_en_cours",
      mysqlTable: "pieces_ok_jour + pieces_produites_jour",
      frequency: "Temps réel",
      status: "live",
    },
    breakdownAvailable: false,
    trendAvailable: true,
    period: "jour",
    exportFields: ["date", "first_pass_today", "produced_today", "rft_pct"],
  },

  br_bundling_jour: {
    id: "106",
    label: "BR Bundling — Inspection Paquet (Aujourd'hui)",
    description:
      "Taux de paquets rejetés lors de l'inspection bundling ce jour",
    formula: {
      numerator: {
        label: "Rejets inspection paquet (aujourd'hui)",
        field: "bundle_reject",
      },
      denominator: {
        label: "Inspections paquet (aujourd'hui)",
        field: "bundle_inspected",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
      grey: "Activation requise — requêtes Novacity inactives (B-01)",
    },
    source: {
      system: "QCM",
      novacityEndpoint:
        "rejets_suite_inspection_paquet_jour_en_cours + inspections_paquet_jour_en_cours (inactif)",
      mysqlTable: "rejets_inspection_paquet (period=jour)",
      frequency: "Temps réel",
      status: "inactive",
    },
    breakdownAvailable: false,
    trendAvailable: false,
    period: "jour",
    exportFields: ["date", "bundle_reject", "bundle_inspected", "br_pct"],
  },

  br_gtd_dda: {
    id: "103",
    label: "BR GTD DDA — Contrôle fin de ligne (Annuel)",
    description:
      "Taux de rejet fin de ligne cumulé depuis le début de l'année par chaîne",
    formula: {
      numerator: {
        label: "Rejets GTD (depuis début d'année)",
        field: "avg_defect_pct_year",
      },
      denominator: {
        label: "(Moyenne annuelle — pas un ratio)",
        field: "AVG(defect_pct) YEAR",
      },
      multiplier: 1,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
    },
    source: {
      system: "QCM",
      novacityEndpoint: "checkpassqte (filtre YEAR)",
      mysqlTable: "check_pass_qte",
      frequency: "Temps réel",
      status: "live",
    },
    breakdownAvailable: true,
    trendAvailable: true,
    period: "annee",
    exportFields: ["month", "avg_defect_pct", "status"],
  },

  rft_annee: {
    id: "105",
    label: "RFT DDA — Right First Time (Annuel)",
    description:
      "Pourcentage de pièces conformes du premier coup depuis le début de l'année",
    formula: {
      numerator: {
        label: "Pièces OK premier coup (année)",
        field: "first_pass_year",
      },
      denominator: {
        label: "Pièces produites (année)",
        field: "produced_year",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 98, operator: ">=" },
    thresholds: {
      green: "≥ 98%",
      orange: "95% – 98%",
      red: "< 95%",
    },
    source: {
      system: "QCM",
      novacityEndpoint:
        "pieces_ok_de_premier_coup_annee_en_cours + pieces_produites_annee_en_cours",
      mysqlTable: "pieces_ok_annee + pieces_produites_annee",
      frequency: "Temps réel",
      status: "live",
    },
    breakdownAvailable: false,
    trendAvailable: true,
    period: "annee",
    exportFields: ["year", "first_pass_year", "produced_year", "rft_pct"],
  },

  br_bundling_annee: {
    id: "107",
    label: "BR Bundling DDA — Inspection Paquet (Annuel)",
    description: "Taux de paquets rejetés depuis le début de l'année",
    formula: {
      numerator: {
        label: "Rejets inspection paquet (année)",
        field: "bundle_reject_year",
      },
      denominator: {
        label: "Inspections paquet (année)",
        field: "bundle_inspected_year",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
      grey: "Activation requise — requêtes Novacity inactives (B-01)",
    },
    source: {
      system: "QCM",
      novacityEndpoint: "inactif",
      mysqlTable: "rejets_inspection_paquet (period=annee)",
      frequency: "Temps réel",
      status: "inactive",
    },
    breakdownAvailable: false,
    trendAvailable: false,
    period: "annee",
    exportFields: ["date", "bundle_reject", "bundle_inspected", "br_pct"],
  },

  br_print: {
    id: "108",
    label: "BR Print — Inspection Livraison Sérigraphie (Aujourd'hui)",
    description:
      "Taux de rejet lors de l'inspection de livraison sérigraphie ce jour",
    formula: {
      numerator: {
        label: "Rejets inspection sérigraphie (aujourd'hui)",
        field: "—",
      },
      denominator: {
        label: "Inspections sérigraphie (aujourd'hui)",
        field: "—",
      },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: {
      green: "< 4%",
      orange: "4% – 5%",
      red: "> 5%",
      grey: "Source Google Drive — mise à jour 4×/jour, non connectée",
    },
    source: {
      system: "DRIVE",
      novacityEndpoint: null,
      mysqlTable: null,
      frequency: "4×/jour",
      status: "google_drive",
    },
    breakdownAvailable: false,
    trendAvailable: false,
    period: "jour",
    exportFields: ["date", "br_print_pct"],
  },

  br_print_dda: {
    id: "109",
    label: "BR Print DDA — Inspection Sérigraphie (Annuel)",
    description: "Taux de rejet sérigraphie cumulé depuis le début de l'année",
    formula: {
      numerator: { label: "Rejets inspection sérigraphie (année)", field: "—" },
      denominator: { label: "Inspections sérigraphie (année)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "annee",
    exportFields: ["date", "br_print_dda_pct"],
  },

  br_care_label_jour: {
    id: "110",
    label: "BR Care Label — Inspection Étiquette (Aujourd'hui)",
    description: "Taux de rejet lors de l'inspection care label ce jour",
    formula: {
      numerator: { label: "Rejets care label (aujourd'hui)", field: "—" },
      denominator: { label: "Inspections care label (aujourd'hui)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "jour",
    exportFields: ["date", "br_care_label_pct"],
  },

  br_care_label_dda: {
    id: "111",
    label: "BR Care Label DDA — Inspection Étiquette (Annuel)",
    description: "Taux de rejet care label cumulé depuis le début de l'année",
    formula: {
      numerator: { label: "Rejets care label (année)", field: "—" },
      denominator: { label: "Inspections care label (année)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "annee",
    exportFields: ["date", "br_care_label_dda_pct"],
  },

  br_accessoires_jour: {
    id: "112",
    label: "BR Accessoires — Inspection Accessoires (Aujourd'hui)",
    description: "Taux de rejet lors de l'inspection accessoires ce jour",
    formula: {
      numerator: { label: "Rejets accessoires (aujourd'hui)", field: "—" },
      denominator: { label: "Inspections accessoires (aujourd'hui)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "jour",
    exportFields: ["date", "br_accessoires_pct"],
  },

  br_accessoires_dda: {
    id: "113",
    label: "BR Accessoires DDA — Inspection Accessoires (Annuel)",
    description: "Taux de rejet accessoires cumulé depuis le début de l'année",
    formula: {
      numerator: { label: "Rejets accessoires (année)", field: "—" },
      denominator: { label: "Inspections accessoires (année)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "annee",
    exportFields: ["date", "br_accessoires_dda_pct"],
  },

  br_compo_jour: {
    id: "114",
    label: "BR Compo — Inspection Composants (Aujourd'hui)",
    description: "Taux de rejet lors de l'inspection composants ce jour",
    formula: {
      numerator: { label: "Rejets composants (aujourd'hui)", field: "—" },
      denominator: { label: "Inspections composants (aujourd'hui)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "jour",
    exportFields: ["date", "br_compo_pct"],
  },

  br_compo_dda: {
    id: "115",
    label: "BR Compo DDA — Inspection Composants (Annuel)",
    description: "Taux de rejet composants cumulé depuis le début de l'année",
    formula: {
      numerator: { label: "Rejets composants (année)", field: "—" },
      denominator: { label: "Inspections composants (année)", field: "—" },
      multiplier: 100,
      resultUnit: "%",
    },
    target: { value: 5, operator: "<=" },
    thresholds: { green: "< 4%", orange: "4% – 5%", red: "> 5%", grey: "Source Google Drive — non connectée" },
    source: { system: "DRIVE", novacityEndpoint: null, mysqlTable: null, frequency: "4×/jour", status: "google_drive" },
    breakdownAvailable: false, trendAvailable: false, period: "annee",
    exportFields: ["date", "br_compo_dda_pct"],
  },
};
