// Description « mise en forme » des ateliers (éditeur WYSIWYG d'Admin → Ateliers).
//
// La colonne `ateliers.description` contient soit du texte brut (anciennes
// descriptions, retours à la ligne conservés), soit du HTML produit par
// l'éditeur. Tout HTML est NETTOYÉ (liste blanche de balises) à l'enregistrement
// ET à l'affichage : la base est lisible par le public, rien d'autre que la mise
// en forme prévue ne doit pouvoir s'afficher.

/** Vrai si la valeur ressemble à du HTML produit par l'éditeur. */
export function estHtml(valeur: string | null | undefined): boolean {
  return !!valeur && /<(p|h[23]|ul|ol|li|blockquote|strong|em|u|s|a|br|hr)[\s>/]/i.test(valeur);
}

function echapper(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Texte brut → HTML (un paragraphe par bloc, retours à la ligne gardés). */
export function texteVersHtml(texte: string): string {
  return texte
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((bloc) => bloc.trim())
    .filter(Boolean)
    .map((bloc) => `<p>${echapper(bloc).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** HTML ou texte → texte brut (tuiles, données structurées pour Google). */
export function versTexteBrut(valeur: string | null | undefined): string {
  if (!valeur) return "";
  if (!estHtml(valeur)) return valeur.trim();
  // DOMParser construit un document inerte : aucun script ni image n'est exécuté ou chargé.
  const html = valeur
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[23]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\n(?=• )/g, "\n")
    .trim();
}
