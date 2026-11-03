import { describe, expect, it } from "vitest";
import { estHtml, texteVersHtml, versTexteBrut } from "./texteRiche";
import { htmlAEnregistrer, nettoyerHtml, versHtmlEditeur } from "./nettoyerHtml";

describe("description mise en forme des ateliers", () => {
  it("reconnaît le HTML de l'éditeur et laisse le texte brut tel quel", () => {
    expect(estHtml("<p>Bonjour</p>")).toBe(true);
    expect(estHtml("Matinée coworking <3 et photos")).toBe(false);
    expect(estHtml(null)).toBe(false);
  });

  it("convertit un ancien texte brut en paragraphes pour l'éditeur", () => {
    expect(texteVersHtml("Ligne 1\nLigne 2\n\nBloc <2>")).toBe("<p>Ligne 1<br>Ligne 2</p><p>Bloc &lt;2&gt;</p>");
    expect(versHtmlEditeur("Le concept : une matinée")).toBe("<p>Le concept : une matinée</p>");
  });

  it("retire scripts, événements, styles et liens dangereux", () => {
    const sale = '<p onclick="x()" style="color:red;text-align:center">Hé <script>alert(1)</script><img src=x onerror=alert(1)>'
      + '<a href="javascript:alert(1)">lien</a> <a href="https://exemple.fr">ok</a></p>';
    const propre = nettoyerHtml(sale);
    expect(propre).not.toMatch(/script|onerror|onclick|img|javascript|color/);
    expect(propre).toContain('style="text-align: center"');
    expect(propre).toContain('<a href="https://exemple.fr" target="_blank" rel="noopener noreferrer nofollow">ok</a>');
  });

  it("garde la mise en forme prévue", () => {
    const html = "<h2>Titre</h2><p><strong>gras</strong> <em>it</em> <u>s</u> <s>b</s></p><ul><li><p>a</p></li></ul><blockquote><p>c</p></blockquote><hr>";
    expect(nettoyerHtml(html)).toBe(html);
  });

  it("n'enregistre pas une description vide", () => {
    expect(htmlAEnregistrer("")).toBeNull();
    expect(htmlAEnregistrer("<p></p>")).toBeNull();
    expect(htmlAEnregistrer("<p> </p><p></p>")).toBeNull();
    expect(htmlAEnregistrer("<p>Atelier</p>")).toBe("<p>Atelier</p>");
    expect(htmlAEnregistrer("<ul><li><p>a</p></li></ul><p></p>")).toBe("<ul><li><p>a</p></li></ul>");
  });

  it("donne un texte brut lisible (tuiles, données pour Google)", () => {
    expect(versTexteBrut("<h2>Le concept</h2><p>Matin &amp; après-midi</p><ul><li><p>Photos</p></li><li><p>Vidéos</p></li></ul>"))
      .toBe("Le concept\nMatin & après-midi\n• Photos\n• Vidéos");
    expect(versTexteBrut("  Texte simple  ")).toBe("Texte simple");
  });
});
