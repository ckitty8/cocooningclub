// Mesures exécutées DANS la page par les audits d'accessibilité et de mise en page.
// Aucune dépendance : le calcul de contraste suit la formule WCAG 2.x (luminance relative).
import type { Page } from "@playwright/test";

export interface TexteIllisible {
  texte: string;
  selecteur: string;
  ratio: number;
  exige: number;
  couleur: string;
  fond: string;
}

export interface Debordement {
  selecteur: string;
  largeur: number;
  texte: string;
}

/** Texte dont le contraste est inférieur au niveau AA (4,5 ; 3 pour un grand texte). */
export const contrastesInsuffisants = (page: Page): Promise<TexteIllisible[]> =>
  page.evaluate(() => {
    type RGBA = [number, number, number, number];
    const analyser = (css: string): RGBA => {
      const m = css.match(/rgba?\(([^)]+)\)/);
      if (!m) {
        // Couleurs modernes (color(srgb …), oklch…) : on passe par un canvas pour obtenir du sRGB.
        const c = document.createElement("canvas").getContext("2d")!;
        c.fillStyle = "#000"; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
        const d = c.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      }
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p[3] ?? 1];
    };
    const melange = (dessus: RGBA, dessous: RGBA): RGBA => {
      const a = dessus[3] + dessous[3] * (1 - dessus[3]);
      if (a === 0) return [0, 0, 0, 0];
      const f = (i: number) => (dessus[i] * dessus[3] + dessous[i] * dessous[3] * (1 - dessus[3])) / a;
      return [f(0), f(1), f(2), a];
    };
    const lum = ([r, g, b]: RGBA) => {
      const c = [r, g, b].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratioDe = (a: RGBA, b: RGBA) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const fondDe = (el: Element): RGBA => {
      const pile: RGBA[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== "none") return [128, 128, 128, 0]; // image ou dégradé : non mesurable, ignoré
        pile.push(analyser(s.backgroundColor));
        if (pile[pile.length - 1][3] === 1) break;
      }
      return pile.reduceRight((dessous, dessus) => melange(dessus, dessous), [255, 255, 255, 1] as RGBA);
    };
    const selecteur = (el: Element) => {
      const morceaux: string[] = [];
      for (let n: Element | null = el; n && morceaux.length < 3 && n.tagName !== "BODY"; n = n.parentElement) {
        morceaux.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
      }
      return morceaux.join(" > ");
    };

    const resultats: TexteIllisible[] = [];
    const vus = new Set<string>();
    const noeuds = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = noeuds.nextNode(); n; n = noeuds.nextNode()) {
      const texte = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!texte || !el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.visibility === "hidden" || s.display === "none" || r.width === 0 || r.height === 0 || Number(s.opacity) === 0) continue;
      if ((el as HTMLElement).closest("[disabled], [aria-disabled='true']")) continue; // exemption WCAG : composant désactivé
      const fond = fondDe(el);
      if (fond[3] === 0) continue;
      const couleur = analyser(s.color);
      const texteMelange = melange([couleur[0], couleur[1], couleur[2], couleur[3] * Number(s.opacity)], fond);
      const px = parseFloat(s.fontSize);
      const gras = Number(s.fontWeight) >= 700;
      const exige = px >= 24 || (px >= 18.66 && gras) ? 3 : 4.5;
      const ratio = ratioDe(texteMelange, fond);
      if (ratio + 0.005 < exige) {
        const cle = selecteur(el) + "|" + texte.slice(0, 30);
        if (vus.has(cle)) continue;
        vus.add(cle);
        resultats.push({
          texte: texte.slice(0, 50), selecteur: selecteur(el), ratio: Math.round(ratio * 100) / 100, exige,
          couleur: s.color, fond: `rgb(${fond.slice(0, 3).map(Math.round).join(",")})`,
        });
      }
    }
    return resultats;
  });

/** Éléments visibles qui dépassent à droite de l'écran (cause d'un défilement horizontal de la page). */
export const debordements = (page: Page): Promise<{ pageLarge: boolean; elements: Debordement[] }> =>
  page.evaluate(() => {
    const largeurEcran = document.documentElement.clientWidth;
    const elements: Debordement[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.right <= largeurEcran + 1) continue;
      // Un élément dans une zone qui défile volontairement (tableau, carrousel) n'est pas un défaut.
      let defile = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { defile = true; break; }
      }
      if (defile) continue;
      elements.push({
        selecteur: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""),
        largeur: Math.round(r.right), texte: (el.textContent ?? "").trim().slice(0, 40),
      });
    }
    return { pageLarge: document.documentElement.scrollWidth > largeurEcran + 1, elements: elements.slice(0, 8) };
  });

/** Boutons et liens trop petits pour un doigt (< 24 px de côté, seuil WCAG 2.2 AA) sur téléphone. */
export const ciblesTropPetites = (page: Page): Promise<{ selecteur: string; taille: string; texte: string }[]> =>
  page.evaluate(() => {
    const res: { selecteur: string; taille: string; texte: string }[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]"))) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.display === "none" || s.visibility === "hidden" || r.width === 0 || r.height === 0) continue;
      if (el.closest("p, li, span") && el.tagName === "A" && s.display === "inline") continue; // lien dans une phrase : exempté
      if (r.width < 24 || r.height < 24) {
        res.push({
          selecteur: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""),
          taille: `${Math.round(r.width)}×${Math.round(r.height)}`,
          texte: ((el as HTMLElement).innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30),
        });
      }
    }
    return res.slice(0, 10);
  });
