/**
 * novacity-client.js
 * ──────────────────────────────────────────────────────────────
 *  Universal Novacity API client.
 *  Works against the mock server AND the real API — same code.
 *
 *  USAGE
 *  ─────
 *  import { NovacityClient } from './novacity-client.js';
 *
 *  const api = new NovacityClient({
 *    baseUrl: 'http://localhost:3001',  // ← mock
 *    apiKey:  'mock-dev-key',
 *  });
 *
 *  // Switch to production:
 *  const api = new NovacityClient({
 *    baseUrl: 'https://api.novacity.yourcompany.com',
 *    apiKey:  process.env.NOVACITY_API_KEY,
 *  });
 * ──────────────────────────────────────────────────────────────
 */

export class NovacityClient {
  /**
   * @param {object} opts
   * @param {string} opts.baseUrl  - e.g. 'http://localhost:3001'
   * @param {string} opts.apiKey   - value for x-api-key header
   * @param {string} [opts.jwt]    - Bearer token for admin routes
   */
  constructor({ baseUrl, apiKey, jwt = "" }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.jwt = jwt;
  }

  // ── internal fetch ──────────────────────────────────────────

  async _get(path, params = {}, admin = false) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const headers = admin ? { Authorization: `Bearer ${this.jwt}` } : { "x-api-key": this.apiKey };

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Section 2 — Configured endpoints ───────────────────────

  /**
   * GET /api/data/:nom
   * @param {string} nom     - endpoint slug (e.g. 'wip_chaine')
   * @param {object} [opts]  - { limit, offset }
   */
  getData(nom, { limit = 100, offset = 0 } = {}) {
    return this._get(`/api/data/${nom}`, { limit, offset });
  }

  // ── Section 3 — SQL queries ─────────────────────────────────

  /**
   * GET /api/data/q/:slug
   * @param {string} slug    - query slug (e.g. 'wip_chaine')
   * @param {object} [opts]  - { limit, offset }
   */
  getQuery(slug, { limit = 100, offset = 0 } = {}) {
    return this._get(`/api/data/q/${slug}`, { limit, offset });
  }

  // ── Section 4 — Admin jobs ──────────────────────────────────

  /** GET /api/admin/jobs */
  listJobs() {
    return this._get("/api/admin/jobs", {}, true);
  }

  /** GET /api/admin/jobs/:id/run */
  runJob(id) {
    return this._get(`/api/admin/jobs/${id}/run`, {}, true);
  }

  // ── Health ──────────────────────────────────────────────────

  health() {
    return fetch(`${this.baseUrl}/health`).then((r) => r.json());
  }

  // ── Convenience shortcuts (named endpoints) ─────────────────

  // SDT
  getItemTrxEnq(opts) {
    return this.getData("itemtrxenq", opts);
  }
  getVwItemTrx(opts) {
    return this.getData("vwitemtrx", opts);
  }
  getLostType(opts) {
    return this.getData("losttype", opts);
  }
  getLostTimeTrx(opts) {
    return this.getData("losttimetrx", opts);
  }

  // QCM
  getRoverEffectiveness(opts) {
    return this.getData("rovereffectiveness", opts);
  }
  getProduction(opts) {
    return this.getData("production", opts);
  }
  getInlineVsEndline(opts) {
    return this.getData("inlinevsendlinecomparison", opts);
  }
  getEmpDefectEff(opts) {
    return this.getData("empdefecteff", opts);
  }
  getVwDefect(opts) {
    return this.getData("vwdefect", opts);
  }
  getRejectQte(opts) {
    return this.getData("reject_qte", opts);
  }
  getQcmDefectTrx(opts) {
    return this.getData("qcmdefecttrx", opts);
  }
  getCheckPassQte(opts) {
    return this.getData("checkpassqte", opts);
  }

  // DIVATEX
  getMpFamille(opts) {
    return this.getData("mp_famille", opts);
  }
  getMp(opts) {
    return this.getData("mp", opts);
  }
  getOfabrication(opts) {
    return this.getData("ofabrication", opts);
  }
  getMouvement(opts) {
    return this.getData("mouvement", opts);
  }
  getMpConteneur(opts) {
    return this.getData("mpconteneur", opts);
  }
  getArticlesColis(opts) {
    return this.getData("articlescolis", opts);
  }
  getDetailColis(opts) {
    return this.getData("detailcolis", opts);
  }
  getExpeditions(opts) {
    return this.getData("expeditions", opts);
  }
  getVueStock(opts) {
    return this.getData("vue_stock", opts);
  }
  getDivaStock(opts) {
    return this.getData("diva_stock", opts);
  }

  // Common queries (shortcuts)
  getWipChaine(opts) {
    return this.getQuery("wip_chaine", opts);
  }
  getEfficience(opts) {
    return this.getQuery("efficience_chaine", opts);
  }
  getEtatAvancement(opts) {
    return this.getQuery("etat_avancement", opts);
  }
  getLostTime(opts) {
    return this.getQuery("lost_time", opts);
  }
  getTagingReel(opts) {
    return this.getQuery("taging_reel", opts);
  }
  getQteProduite(opts) {
    return this.getQuery("qte_produite", opts);
  }
  getMinutesPresence(opts) {
    return this.getQuery("minutes_presence", opts);
  }
  getMinutesProduites(opts) {
    return this.getQuery("minutes_produites", opts);
  }
  getTempsOperation(opts) {
    return this.getQuery("temps_operation", opts);
  }
  getDashboardUnifie(opts) {
    return this.getQuery("requete_unifiee_dashboard_tout-en-un", opts);
  }
  getStockMoyen(opts) {
    return this.getQuery("stock_moyen", opts);
  }
  getQteTotalStock(opts) {
    return this.getQuery("quantite_totale_du_stock", opts);
  }
  getStockParFamille(opts) {
    return this.getQuery("quantite_par_famille", opts);
  }
  getStockParProvenance(opts) {
    return this.getQuery("quantite_par_provenance_total", opts);
  }
  getStockParTypologie(opts) {
    return this.getQuery("quantite_par_typologie_fournitures", opts);
  }
}

// ── Default export (singleton pattern for SPA) ───────────────

const IS_PRODUCTION = import.meta?.env?.VITE_API_MODE === "production";

export const novacity = new NovacityClient({
  baseUrl: IS_PRODUCTION
    ? import.meta?.env?.VITE_API_BASE_URL || "https://api.novacity.bacovet.com"
    : "http://localhost:3001",
  apiKey: IS_PRODUCTION ? import.meta?.env?.VITE_API_KEY || "" : "mock-dev-key",
});
