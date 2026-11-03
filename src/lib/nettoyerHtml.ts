// Nettoyage du HTML des descriptions d'ateliers (voir `texteRiche.ts`).
// Fichier à part pour que DOMPurify ne soit chargé que par les pages qui
// affichent ou modifient une description mise en forme.
import DOMPurify from "dompurify";
import { estHtml, texteVersHtml } from "./texteRiche";

const BALISES = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3",
  "ul", "ol", "li", "blockquote", "a", "hr",
];
const ATTRIBUTS = ["href", "target", "rel", "style"];

let crochetsInstalles = false;
function installerCrochets() {
  if (crochetsInstalles) return;
  crochetsInstalles = true;
  DOMPurify.addHook("afterSanitizeAttributes", (noeud) => {
    // Seul l'alignement du texte est gardé dans `style`.
    if (noeud.hasAttribute("style")) {
      const alignement = /text-align:\s*(left|center|right|justify)/i.exec(noeud.getAttribute("style") ?? "");
      if (alignement) noeud.setAttribute("style", `text-align: ${alignement[1].toLowerCase()}`);
      else noeud.removeAttribute("style");
    }
    // Liens : http(s), mailto ou tel seulement, ouverts dans un nouvel onglet.
    if (noeud.tagName === "A") {
      const href = noeud.getAttribute("href") ?? "";
      if (!/^(https?:|mailto:|tel:)/i.test(href)) {
        noeud.removeAttribute("href");
      } else {
        noeud.setAttribute("target", "_blank");
        noeud.setAttribute("rel", "noopener noreferrer nofollow");
      }
    }
  });
}

/** Nettoie un HTML : ne garde que les balises de mise en forme autorisées. */
export function nettoyerHtml(html: string): string {
  installerCrochets();
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: BALISES, ALLOWED_ATTR: ATTRIBUTS });
}

/** Valeur stockée → HTML à charger dans l'éditeur. */
export function versHtmlEditeur(valeur: string | null | undefined): string {
  if (!valeur) return "";
  return estHtml(valeur) ? nettoyerHtml(valeur) : texteVersHtml(valeur);
}

/** HTML de l'éditeur → valeur à enregistrer (null si la description est vide). */
export function htmlAEnregistrer(html: string): string | null {
  // Paragraphes vides en fin de texte (l'éditeur en ajoute un après une liste) : retirés.
  const propre = nettoyerHtml(html).trim().replace(/(<p>(\s|<br>)*<\/p>)+$/, "");
  if (!propre) return null;
  const corps = new DOMParser().parseFromString(propre, "text/html").body;
  const aDuTexte = (corps.textContent ?? "").trim() !== "" || !!corps.querySelector("hr");
  return aDuTexte ? propre : null;
}
