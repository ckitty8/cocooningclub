// Éditeur WYSIWYG (Tiptap) de la description complète d'un atelier.
// Produit du HTML, nettoyé avant d'être remonté au formulaire (`nettoyerHtml`).
import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Heading3, Italic, Link2, List,
  ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline, Undo2, type LucideIcon,
} from "lucide-react";
import { nettoyerHtml, versHtmlEditeur } from "@/lib/nettoyerHtml";

interface Props {
  valeur: string;
  onChange: (html: string) => void;
  /** id du libellé du champ (le libellé ne peut pas pointer un bloc éditable avec htmlFor). */
  libelleId?: string;
  placeholder?: string;
}

function Bouton({ icone: Icone, titre, actif, onClick, desactive }: {
  icone: LucideIcon; titre: string; actif?: boolean; desactive?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      disabled={desactive}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        actif ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      }`}
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

function demanderLien(editor: Editor) {
  const actuel = editor.getAttributes("link").href as string | undefined;
  const saisi = window.prompt("Adresse du lien (laisser vide pour retirer le lien)", actuel ?? "https://");
  if (saisi === null) return;
  const url = saisi.trim();
  if (!url || url === "https://") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const complete = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
  editor.chain().focus().extendMarkRange("link").setLink({ href: complete }).run();
}

function BarreOutils({ editor }: { editor: Editor }) {
  const etat = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      gras: e.isActive("bold"),
      italique: e.isActive("italic"),
      souligne: e.isActive("underline"),
      barre: e.isActive("strike"),
      titre: e.isActive("heading", { level: 2 }),
      sousTitre: e.isActive("heading", { level: 3 }),
      puces: e.isActive("bulletList"),
      numeros: e.isActive("orderedList"),
      citation: e.isActive("blockquote"),
      lien: e.isActive("link"),
      gauche: e.isActive({ textAlign: "left" }),
      centre: e.isActive({ textAlign: "center" }),
      droite: e.isActive({ textAlign: "right" }),
      annuler: e.can().undo(),
      retablir: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const sep = <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
  return (
    <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
      <Bouton icone={Heading2} titre="Titre" actif={etat.titre} onClick={() => c().toggleHeading({ level: 2 }).run()} />
      <Bouton icone={Heading3} titre="Sous-titre" actif={etat.sousTitre} onClick={() => c().toggleHeading({ level: 3 }).run()} />
      {sep}
      <Bouton icone={Bold} titre="Gras" actif={etat.gras} onClick={() => c().toggleBold().run()} />
      <Bouton icone={Italic} titre="Italique" actif={etat.italique} onClick={() => c().toggleItalic().run()} />
      <Bouton icone={Underline} titre="Souligné" actif={etat.souligne} onClick={() => c().toggleUnderline().run()} />
      <Bouton icone={Strikethrough} titre="Barré" actif={etat.barre} onClick={() => c().toggleStrike().run()} />
      {sep}
      <Bouton icone={List} titre="Liste à puces" actif={etat.puces} onClick={() => c().toggleBulletList().run()} />
      <Bouton icone={ListOrdered} titre="Liste numérotée" actif={etat.numeros} onClick={() => c().toggleOrderedList().run()} />
      <Bouton icone={Quote} titre="Citation" actif={etat.citation} onClick={() => c().toggleBlockquote().run()} />
      <Bouton icone={Minus} titre="Ligne de séparation" onClick={() => c().setHorizontalRule().run()} />
      {sep}
      <Bouton icone={AlignLeft} titre="Aligner à gauche" actif={etat.gauche} onClick={() => c().setTextAlign("left").run()} />
      <Bouton icone={AlignCenter} titre="Centrer" actif={etat.centre} onClick={() => c().setTextAlign("center").run()} />
      <Bouton icone={AlignRight} titre="Aligner à droite" actif={etat.droite} onClick={() => c().setTextAlign("right").run()} />
      {sep}
      <Bouton icone={Link2} titre="Lien" actif={etat.lien} onClick={() => demanderLien(editor)} />
      {sep}
      <Bouton icone={Undo2} titre="Annuler" desactive={!etat.annuler} onClick={() => c().undo().run()} />
      <Bouton icone={Redo2} titre="Rétablir" desactive={!etat.retablir} onClick={() => c().redo().run()} />
    </div>
  );
}

export default function EditeurTexteRiche({ valeur, onChange, libelleId, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
    ],
    content: versHtmlEditeur(valeur),
    editorProps: {
      attributes: {
        class: "texte-riche min-h-[10rem] max-h-[24rem] overflow-y-auto px-3 py-2.5 text-sm focus:outline-none",
        ...(libelleId ? { "aria-labelledby": libelleId } : {}),
        ...(placeholder ? { "aria-placeholder": placeholder } : {}),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => onChange(nettoyerHtml(e.isEmpty ? "" : e.getHTML())),
  });

  // Le formulaire change d'atelier (modifier / dupliquer / nouveau) : recharger le contenu.
  useEffect(() => {
    if (!editor) return;
    const courant = nettoyerHtml(editor.isEmpty ? "" : editor.getHTML());
    const attendu = versHtmlEditeur(valeur);
    if (courant !== attendu && valeur !== courant) editor.commands.setContent(attendu, { emitUpdate: false });
  }, [editor, valeur]);

  return (
    <div className="rounded-xl border bg-background focus-within:ring-2 focus-within:ring-primary">
      {editor && <BarreOutils editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
