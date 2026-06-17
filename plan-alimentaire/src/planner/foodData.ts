import type { Food } from "./types";

export const FOODS: Food[] = [
  // ── PETIT-DÉJEUNER : protéines ──
  { id: "skyr_pd", nom: "Skyr nature 0%", kcalPer100g: 63, quantite: 150, kcalPortion: 95, categorie: "petit_dej_proteine" },
  { id: "fb_0", nom: "Fromage blanc 0%", kcalPer100g: 45, quantite: 150, kcalPortion: 68, categorie: "petit_dej_proteine" },
  { id: "yaourt_pd", nom: "Yaourt nature 0%", kcalPer100g: 50, quantite: 125, kcalPortion: 63, categorie: "petit_dej_proteine" },
  { id: "cottage", nom: "Cottage cheese", kcalPer100g: 98, quantite: 100, kcalPortion: 98, categorie: "petit_dej_proteine" },
  { id: "frais_stmoret", nom: "Fromage frais St Moret", kcalPer100g: 150, quantite: 50, kcalPortion: 75, categorie: "petit_dej_proteine" },
  { id: "jambon_blanc", nom: "Jambon blanc", kcalPer100g: 105, quantite: 60, kcalPortion: 63, categorie: "petit_dej_proteine" },
  { id: "jambon_pays", nom: "Jambon de pays", kcalPer100g: 145, quantite: 60, kcalPortion: 87, categorie: "petit_dej_proteine" },
  { id: "dinde_pd", nom: "Blanc de dinde", kcalPer100g: 100, quantite: 60, kcalPortion: 60, categorie: "petit_dej_proteine" },
  { id: "saumon_fume", nom: "Saumon fumé", kcalPer100g: 175, quantite: 50, kcalPortion: 88, categorie: "petit_dej_proteine" },
  { id: "oeuf_brouille", nom: "Œuf brouillé (2)", kcalPer100g: 143, quantite: 100, kcalPortion: 143, categorie: "petit_dej_proteine" },
  { id: "oeuf_poche", nom: "Œuf poché (1)", kcalPer100g: 143, quantite: 60, kcalPortion: 86, categorie: "petit_dej_proteine" },
  { id: "oeuf_dur", nom: "Œuf dur (1)", kcalPer100g: 143, quantite: 60, kcalPortion: 86, categorie: "petit_dej_proteine" },

  // ── PETIT-DÉJEUNER : glucides ──
  { id: "flocons_avoine", nom: "Flocons d'avoine (50g)", kcalPer100g: 372, quantite: 50, kcalPortion: 186, categorie: "petit_dej_glucide", daysAvailable: ["samedi", "dimanche"] },
  { id: "belvita2", nom: "BelVita ×2 (option légère)", kcalPer100g: 335, quantite: 25, kcalPortion: 84, categorie: "petit_dej_glucide", daysAvailable: ["mercredi"] },
  { id: "belvita4", nom: "BelVita ×4 (paquet complet)", kcalPer100g: 335, quantite: 50, kcalPortion: 168, categorie: "petit_dej_glucide", daysAvailable: ["jeudi"] },
  { id: "pain_complet", nom: "Pain complet (1 tranche)", kcalPer100g: 234, quantite: 30, kcalPortion: 70, categorie: "petit_dej_glucide" },
  { id: "biscottes_sarrasin", nom: "Biscottes sarrasin", kcalPer100g: 390, quantite: 25, kcalPortion: 98, categorie: "petit_dej_glucide" },
  { id: "krisprolls", nom: "Krisprolls", kcalPer100g: 375, quantite: 25, kcalPortion: 94, categorie: "petit_dej_glucide" },
  { id: "galette_riz_pd", nom: "Galette de riz", kcalPer100g: 375, quantite: 20, kcalPortion: 75, categorie: "petit_dej_glucide" },
  { id: "lait_pd", nom: "Lait demi-écrémé (200 ml)", kcalPer100g: 46, quantite: 200, kcalPortion: 92, categorie: "petit_dej_glucide" },
  { id: "pepites_choco", nom: "Pépites chocolat (10g)", kcalPer100g: 545, quantite: 10, kcalPortion: 55, categorie: "petit_dej_glucide" },

  // ── LÉGUMES ──
  { id: "haricots_verts", nom: "Haricots verts (180g)", kcalPer100g: 29, quantite: 180, kcalPortion: 52, categorie: "legume" },
  { id: "brocolis", nom: "Brocolis (180g)", kcalPer100g: 34, quantite: 180, kcalPortion: 61, categorie: "legume" },
  { id: "carottes", nom: "Carottes (180g)", kcalPer100g: 35, quantite: 180, kcalPortion: 63, categorie: "legume" },
  { id: "asperges", nom: "Asperges (180g)", kcalPer100g: 20, quantite: 180, kcalPortion: 36, categorie: "legume" },
  { id: "radis", nom: "Radis (180g)", kcalPer100g: 16, quantite: 180, kcalPortion: 29, categorie: "legume" },

  // ── CÉRÉALES ──
  { id: "riz_blanc", nom: "Riz blanc cuit (100g)", kcalPer100g: 130, quantite: 100, kcalPortion: 130, categorie: "cereale" },
  { id: "riz_complet", nom: "Riz complet cuit (100g)", kcalPer100g: 111, quantite: 100, kcalPortion: 111, categorie: "cereale" },
  { id: "quinoa", nom: "Quinoa cuit (100g)", kcalPer100g: 123, quantite: 100, kcalPortion: 123, categorie: "cereale" },
  { id: "boulgour", nom: "Boulgour cuit (100g)", kcalPer100g: 115, quantite: 100, kcalPortion: 115, categorie: "cereale" },
  { id: "ble", nom: "Blé cuit (100g)", kcalPer100g: 129, quantite: 100, kcalPortion: 129, categorie: "cereale" },
  { id: "patate_douce", nom: "Patate douce cuite (150g)", kcalPer100g: 86, quantite: 150, kcalPortion: 129, categorie: "cereale" },

  // ── LÉGUMINEUSES ──
  { id: "lentilles", nom: "Lentilles cuites (130g)", kcalPer100g: 116, quantite: 130, kcalPortion: 151, categorie: "legumineuse" },
  { id: "pois_chiches", nom: "Pois chiches cuits (130g)", kcalPer100g: 164, quantite: 130, kcalPortion: 213, categorie: "legumineuse" },
  { id: "haricots_rouges", nom: "Haricots rouges cuits (130g)", kcalPer100g: 127, quantite: 130, kcalPortion: 165, categorie: "legumineuse" },
  { id: "pois_casses", nom: "Pois cassés cuits (130g)", kcalPer100g: 118, quantite: 130, kcalPortion: 153, categorie: "legumineuse" },
  { id: "feves", nom: "Fèves cuites (130g)", kcalPer100g: 88, quantite: 130, kcalPortion: 114, categorie: "legumineuse" },
  { id: "petits_pois", nom: "Petits pois cuits (130g)", kcalPer100g: 81, quantite: 130, kcalPortion: 105, categorie: "legumineuse" },
  { id: "edamame", nom: "Edamame (130g)", kcalPer100g: 121, quantite: 130, kcalPortion: 157, categorie: "legumineuse" },
  { id: "haricots_blancs", nom: "Haricots blancs cuits (130g)", kcalPer100g: 139, quantite: 130, kcalPortion: 181, categorie: "legumineuse" },
  { id: "houmous", nom: "Houmous (100g)", kcalPer100g: 175, quantite: 100, kcalPortion: 175, categorie: "legumineuse" },

  // ── PROTÉINES MIDI ──
  { id: "poulet_m", nom: "Blanc de poulet (120g)", kcalPer100g: 110, quantite: 120, kcalPortion: 132, categorie: "proteine_midi" },
  { id: "dinde_m", nom: "Escalope dinde (120g)", kcalPer100g: 100, quantite: 120, kcalPortion: 120, categorie: "proteine_midi" },
  { id: "boeuf_5", nom: "Bœuf haché 5% (120g)", kcalPer100g: 135, quantite: 120, kcalPortion: 162, categorie: "proteine_midi" },
  { id: "saumon_m", nom: "Saumon — pavé (130g)", kcalPer100g: 186, quantite: 130, kcalPortion: 242, categorie: "proteine_midi" },
  { id: "cabillaud_m", nom: "Cabillaud (150g)", kcalPer100g: 82, quantite: 150, kcalPortion: 123, categorie: "proteine_midi" },
  { id: "thon_m", nom: "Thon en eau — boîte (130g)", kcalPer100g: 116, quantite: 130, kcalPortion: 151, categorie: "proteine_midi" },
  { id: "crevettes_m", nom: "Crevettes (130g)", kcalPer100g: 84, quantite: 130, kcalPortion: 109, categorie: "proteine_midi" },
  { id: "sardines_m", nom: "Sardines — boîte (100g)", kcalPer100g: 208, quantite: 100, kcalPortion: 208, categorie: "proteine_midi" },
  { id: "oeufs_m", nom: "Œufs entiers ×2", kcalPer100g: 143, quantite: 120, kcalPortion: 172, categorie: "proteine_midi" },

  // ── PROTÉINES SOIR ──
  { id: "poulet_s", nom: "Blanc de poulet (110g)", kcalPer100g: 110, quantite: 110, kcalPortion: 121, categorie: "proteine_soir" },
  { id: "dinde_s", nom: "Escalope dinde (110g)", kcalPer100g: 100, quantite: 110, kcalPortion: 110, categorie: "proteine_soir" },
  { id: "saumon_s", nom: "Saumon — pavé (120g)", kcalPer100g: 186, quantite: 120, kcalPortion: 223, categorie: "proteine_soir" },
  { id: "cabillaud_s", nom: "Cabillaud (130g)", kcalPer100g: 82, quantite: 130, kcalPortion: 107, categorie: "proteine_soir" },
  { id: "thon_s", nom: "Thon en eau (120g)", kcalPer100g: 116, quantite: 120, kcalPortion: 139, categorie: "proteine_soir" },
  { id: "crevettes_s", nom: "Crevettes (120g)", kcalPer100g: 84, quantite: 120, kcalPortion: 101, categorie: "proteine_soir" },
  { id: "sardines_s", nom: "Sardines — boîte (100g)", kcalPer100g: 208, quantite: 100, kcalPortion: 208, categorie: "proteine_soir" },

  // ── COLLATIONS / GOÛTER ──
  { id: "barre_cereales", nom: "Barre de céréales (25g)", kcalPer100g: 360, quantite: 25, kcalPortion: 90, categorie: "gouter" },
  { id: "skyr_col", nom: "Skyr nature 0% (150g)", kcalPer100g: 63, quantite: 150, kcalPortion: 95, categorie: "gouter" },
  { id: "yaourt_0", nom: "Yaourt 0% (125g)", kcalPer100g: 50, quantite: 125, kcalPortion: 63, categorie: "gouter" },
  { id: "fb_col", nom: "Fromage blanc 0% (150g)", kcalPer100g: 45, quantite: 150, kcalPortion: 68, categorie: "gouter" },
  { id: "galette_col", nom: "Galette de riz", kcalPer100g: 375, quantite: 20, kcalPortion: 75, categorie: "gouter" },
  { id: "amandes", nom: "Amandes ×10 (~15g)", kcalPer100g: 579, quantite: 15, kcalPortion: 87, categorie: "gouter" },
  { id: "beurre_cac", nom: "Beurre de cacahuète (15g)", kcalPer100g: 598, quantite: 15, kcalPortion: 90, categorie: "gouter" },
  { id: "yaourt_sl", nom: "Yaourt sans lactose (125g)", kcalPer100g: 55, quantite: 125, kcalPortion: 69, categorie: "gouter" },

  // ── DESSERTS ──
  { id: "kitkat_ball", nom: "KitKat Ball ×5 boules (20g)", kcalPer100g: 600, quantite: 20, kcalPortion: 120, categorie: "dessert" },
  { id: "delacre", nom: "Biscuits Delacre ×2 (40g)", kcalPer100g: 235, quantite: 40, kcalPortion: 94, categorie: "dessert" },
];

const LEGUMINEUSE_IDS = new Set(["lentilles","pois_chiches","haricots_rouges","pois_casses","feves","petits_pois","edamame","haricots_blancs","houmous"]);
const CEREALE_IDS = new Set(["riz_blanc","riz_complet","quinoa","boulgour","ble","patate_douce"]);

export const getFoodById = (id: string): Food | undefined => FOODS.find(f => f.id === id);

export const getFoodsByCategory = (cat: Food["categorie"], day?: string): Food[] =>
  FOODS.filter(f => {
    if (f.categorie !== cat) return false;
    if (f.daysAvailable && day && !f.daysAvailable.includes(day)) return false;
    return true;
  });

export const isLegumineuse = (id: string) => LEGUMINEUSE_IDS.has(id);
export const isCereale = (id: string) => CEREALE_IDS.has(id);

export const ALLERGEN_OPTIONS = [
  { id: "gluten", label: "Gluten" },
  { id: "lactose", label: "Lactose / Produits laitiers" },
  { id: "oeufs", label: "Œufs" },
  { id: "poisson", label: "Poisson" },
  { id: "fruits_mer", label: "Fruits de mer / crustacés" },
  { id: "noix", label: "Noix / Oléagineux" },
  { id: "porc", label: "Porc" },
  { id: "volaille", label: "Volaille" },
];
