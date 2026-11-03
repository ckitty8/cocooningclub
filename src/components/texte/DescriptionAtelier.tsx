// Affiche la description d'un atelier : HTML mis en forme (nettoyé) ou ancien texte brut.
import { useMemo } from "react";
import { estHtml } from "@/lib/texteRiche";
import { nettoyerHtml } from "@/lib/nettoyerHtml";

interface Props {
  texte: string | null | undefined;
  className?: string;
}

export default function DescriptionAtelier({ texte, className = "" }: Props) {
  const html = useMemo(() => (texte && estHtml(texte) ? nettoyerHtml(texte) : null), [texte]);
  if (!texte) return null;
  if (html === null) return <p className={`whitespace-pre-line ${className}`}>{texte}</p>;
  return <div className={`texte-riche ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
