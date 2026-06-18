const cors = require('cors');
const express = require('express');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

function jitter(base, variance = 0.15) {
  return Math.round(base * (1 + (Math.random() * 2 - 1) * variance));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

function generateDateRange(daysBack) {
  const dates = [];
  const today = new Date();
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

const CHAINS = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8', 'CH9', 'CH10', 'CH11', 'CH12', 'CH13', 'CH14', 'CH15'];
const MODELS = ['T-SHIRT BASIC', 'POLO CLASSIC', 'DRESS SUMMER', 'JACKET WINTER', 'HOODIE COMFORT', 'SHORTS SPORT', 'PANTS CASUAL', 'SHIRT FORMAL', 'VEST WORK', 'CARDIGAN WARM', 'BLOUSE ELEGANT', 'SKIRT FLARE', 'TUNIC RELAX', 'SWEATER KNIT', 'BLOUSE SILK', 'JUMPSUIT TREND', 'ROMPER BABY', 'COAT LONG', 'PARKA WARM', 'BLAZER SUIT', 'TROUSER FORMAL', 'JEANS CLASSIC', 'LEGgings SPORT', 'CAPRI CASUAL', 'TOP SUMMER', 'DRESS EVENING', 'SHIRT LINEN', 'JACKET DENIM', 'VEST QUILTED', 'HOODIE ZIP'];
const ARTICLES = Array.from({ length: 50 }, (_, i) => `ART-${String(i + 1).padStart(4, '0')}`);

function generateBrSheetData() {
  const dates = generateDateRange(90);
  const rows = [['date', 'nb_inspections', 'nb_rejets']];
  for (const d of dates) {
    const insp = jitter(130, 0.3);
    const rejets = randomInt(2, Math.max(3, Math.round(insp * 0.08)));
    rows.push([formatDate(d), String(insp), String(rejets)]);
  }
  return rows;
}

function generateDotHotData() {
  const dates = generateDateRange(60);
  const rows = [['date', 'of', 'type', 'qte_commandee', 'qte_livree_on_time']];
  for (const d of dates) {
    const ofsPerDay = randomInt(5, 10);
    for (let i = 0; i < ofsPerDay; i++) {
      const ofNum = `OF-${randomInt(10000, 99999)}`;
      const type = Math.random() > 0.45 ? 'DOT' : 'HOT';
      const qteCmd = jitter(1500, 0.4);
      const rate = (randomInt(70, 100)) / 100;
      const qteLivree = Math.round(qteCmd * rate);
      rows.push([formatDate(d), ofNum, type, String(qteCmd), String(qteLivree)]);
    }
  }
  return rows;
}

function generateDevelopmentData() {
  const dates = generateDateRange(90);
  const rows = [['date', 'modele', 'statut_validation', 'date_livraison_prevue', 'date_livraison_reelle', 'nomenclature_valide', 'est_reclamation']];
  for (const d of dates) {
    for (let i = 0; i < 3; i++) {
      const modele = MODELS[randomInt(0, MODELS.length - 1)];
      const statuses = ['OK', 'NOK', 'PENDING'];
      const statut = statuses[randomInt(0, 2)];
      const prevue = new Date(d);
      prevue.setDate(prevue.getDate() + randomInt(14, 60));
      const reelle = statut === 'OK' ? new Date(prevue) : null;
      if (reelle) reelle.setDate(reelle.getDate() + randomInt(-5, 10));
      const nomValide = Math.random() > 0.3 ? 1 : 0;
      const reclam = Math.random() > 0.85 ? 1 : 0;
      rows.push([
        formatDate(d), modele, statut,
        formatDate(prevue),
        statut !== 'PENDING' ? formatDate(reelle) : '',
        String(nomValide), String(reclam),
      ]);
    }
  }
  return rows;
}

function generateGammesData() {
  const rows = [['article', 'nb_gammes_total', 'nb_gammes_acceptees_v1']];
  for (const art of ARTICLES) {
    const total = randomInt(5, 20);
    const accepted = randomInt(Math.max(1, total - 8), total);
    rows.push([art, String(total), String(accepted)]);
  }
  return rows;
}

function generateCotationData() {
  const dates = generateDateRange(30);
  const rows = [['article', 'temps_cotation_min', 'temps_production_min', 'date']];
  for (const art of ARTICLES) {
    for (let i = 0; i < 5; i++) {
      const d = dates[randomInt(0, dates.length - 1)];
      const cotation = (randomInt(20, 150) / 10).toFixed(1);
      // Sometimes production exceeds cotation (respect), sometimes not
      const production = Math.random() > 0.2
        ? (randomInt(20, 150) / 10).toFixed(1)
        : (randomInt(150, 300) / 10).toFixed(1);
      rows.push([art, cotation, production, formatDate(d)]);
    }
  }
  return rows;
}

const SHEET_DATA = {
  br_print: generateBrSheetData,
  br_care_label: generateBrSheetData,
  br_accessoires: generateBrSheetData,
  br_compo: generateBrSheetData,
  inspection_commande: generateBrSheetData,
  dot_hot: generateDotHotData,
  development: generateDevelopmentData,
  gammes: generateGammesData,
  cotation: generateCotationData,
};

// Google Sheets API v4 compatible endpoint
// GET /v4/spreadsheets/:spreadsheetId/values/:range
app.get('/v4/spreadsheets/:spreadsheetId/values/:range', (req, res) => {
  const { spreadsheetId, range } = req.params;
  const generator = SHEET_DATA[spreadsheetId];

  if (!generator) {
    return res.status(404).json({
      error: {
        code: 404,
        message: `Spreadsheet '${spreadsheetId}' not found`,
        status: 'NOT_FOUND',
      },
    });
  }

  const values = generator();

  res.json({
    range: `${range}`,
    majorDimension: 'ROWS',
    values: values,
  });
});

// Alias: also accept sheet name as spreadsheetId directly
// GET /api/sheets/:sheetName — returns same Google Sheets format
app.get('/api/sheets/:sheetName', (req, res) => {
  const { sheetName } = req.params;
  const generator = SHEET_DATA[sheetName];

  if (!generator) {
    return res.status(404).json({
      error: {
        code: 404,
        message: `Sheet '${sheetName}' not found`,
        status: 'NOT_FOUND',
      },
    });
  }

  const values = generator();

  res.json({
    range: `${sheetName}!A:Z`,
    majorDimension: 'ROWS',
    values: values,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'google-drive-mock', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Google Drive mock server running on http://127.0.0.1:${PORT}`);
});
