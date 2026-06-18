const cors = require('cors');
const express = require('express');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

function jitter(base, variance = 0.15) {
  return Math.round(base * (1 + (Math.random() * 2 - 1) * variance));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

const CHAINS = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8', 'CH9', 'CH10', 'CH11', 'CH12', 'CH13', 'CH14', 'CH15'];
const ARTICLES = Array.from({ length: 100 }, (_, i) => `ART-${String(i + 1).padStart(4, '0')}`);
const DESIGNS = [
  'T-shirt Basic Coton', 'Polos Classique Manches', 'Robe Ete Legere',
  'Veste Hiver Doublure', 'Sweat Confort Coton', 'Short Sport Respirant',
  'Pantalon Casual Serge', 'Chemise Formelle Popeline', 'Gilet Travail Oxygene',
  'Cardigan Chaud Laine', 'Blouse Elegante Soie', 'Jupe Flare Taffetas',
  'Tunique Relax Jersey', 'Tricot Chaud Coton', 'Bluse Soie Pure',
  'Combinaison Tendance', 'Babygrow Coton Bio', 'Manteau Long Laine',
  'Parka Chaud Imbibe', 'Blazer Suit Melange', 'Pantalon Formel Serge',
  'Jean Classique Denim', 'Legging Sport Elasthanne', 'Capri Casual Coton',
  'Haut Ete Georgette', 'Robe Soiree Taffetas', 'Chemise Linen Naturel',
  'Veste Denim Wash', 'Gilet Pique Oxygene', 'Sweat a Fermeture',
];

function generateChainPlanning() {
  const data = [];
  for (const chaine of CHAINS) {
    const numOFs = randomInt(2, 4);
    for (let i = 0; i < numOFs; i++) {
      const ofNum = `OF-${randomInt(10000, 99999)}`;
      data.push({
        chaine,
        of_numero: ofNum,
        qte_of: jitter(1200, 0.3),
        objectif_journalier: jitter(800, 0.2),
        cadence_moyenne: (randomInt(800, 1400) / 10).toFixed(1),
        cadence_hebdo: (randomInt(5000, 9000) / 10).toFixed(1),
      });
    }
  }
  return data;
}

function generateArticleMaster() {
  return ARTICLES.map((code, i) => ({
    code_article: code,
    designation: DESIGNS[i % DESIGNS.length],
    sam_min: (randomInt(30, 120) / 10).toFixed(1),
    sot_min: (randomInt(50, 200) / 10).toFixed(1),
    effectif_requis: randomInt(10, 50),
  }));
}

function generateOfDates() {
  const today = new Date();
  const data = [];
  for (let i = 0; i < 50; i++) {
    const ofNum = `OF-${randomInt(10000, 99999)}`;
    const chaine = CHAINS[randomInt(0, CHAINS.length - 1)];
    const bpd = new Date(today);
    bpd.setDate(bpd.getDate() - randomInt(0, 30));
    const epd = new Date(bpd);
    epd.setDate(epd.getDate() + randomInt(3, 14));
    const ehd = new Date(epd);
    ehd.setDate(ehd.getDate() + randomInt(1, 7));
    data.push({
      of_numero: ofNum,
      chaine,
      bpd: formatDate(bpd),
      epd: formatDate(epd),
      ehd: formatDate(ehd),
    });
  }
  return data;
}

function generateSuiviPaquets() {
  const data = [];
  for (let i = 0; i < 50; i++) {
    const ofNum = `OF-${randomInt(10000, 99999)}`;
    data.push({
      of_numero: ofNum,
      est_solde: Math.random() > 0.4 ? 1 : 0,
      est_archive: Math.random() > 0.6 ? 1 : 0,
    });
  }
  return data;
}

const ENDPOINTS = {
  'chain-planning': generateChainPlanning,
  'article-master': generateArticleMaster,
  'of-dates': generateOfDates,
  'suivi-paquets': generateSuiviPaquets,
};

// Auth middleware — accepts any x-api-key in mock mode
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }
  next();
});

app.get('/api/v1/:endpoint', (req, res) => {
  const { endpoint } = req.params;
  const generator = ENDPOINTS[endpoint];

  if (!generator) {
    return res.status(404).json({
      success: false,
      error: `Unknown endpoint: ${endpoint}`,
    });
  }

  const data = generator();

  res.json({
    success: true,
    data,
    count: data.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gpro-consulting-mock', port: PORT });
});

app.listen(PORT, () => {
  console.log(`GPRO Consulting mock server running on http://127.0.0.1:${PORT}`);
});
