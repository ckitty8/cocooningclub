// Textes des pages « espace » (Papotages, Créatifs, Business), pensées pour répondre aux recherches du type
// « ateliers créatifs pour femmes à Gagny ». Ils ne reprennent que ce que le site dit déjà de chaque
// espace : pas de tarif, de niveau requis ni de programme qui n'aurait pas été validé par l'association.

export type SlugEspace = "papotages" | "creatifs" | "business";

export interface SectionEspace {
  titre: string;
  paragraphes: string[];
}

export interface PageEspace {
  slug: SlugEspace;
  chemin: string;
  nom: string;
  surtitre: string;
  /** Titre principal (H1) : le mot que les internautes tapent dans Google. */
  titre: string;
  accroche: string;
  sections: SectionEspace[];
}

export const PAGES_ESPACES: Record<SlugEspace, PageEspace> = {
  papotages: {
    slug: "papotages",
    chemin: "/papotages",
    nom: "Papotages",
    surtitre: "Notre espace rencontres",
    titre: "Papotages : des rencontres entre femmes autour d'un café",
    accroche: "Des rencontres informelles pour échanger, se confier et créer du lien autour d'un café.",
    sections: [
      {
        titre: "Un rendez-vous pour souffler et se rencontrer",
        paragraphes: [
          "Les Papotages sont l'espace le plus simple du Cocooning Club : on se retrouve entre femmes autour d'un café pour discuter, se confier et créer du lien.",
          "Pas besoin de savoir faire quoi que ce soit : il suffit d'avoir envie de rencontrer d'autres femmes, près de chez soi, à Gagny, Chelles ou Le Raincy.",
        ],
      },
      {
        titre: "Une ambiance bienveillante",
        paragraphes: [
          "Comme dans tous nos espaces, l'ambiance est bienveillante, conviviale et sans pression. Chacune participe à son rythme et trouve sa place.",
        ],
      },
      {
        titre: "Pour qui ?",
        paragraphes: [
          "Pour toutes les femmes qui ont envie de sortir de l'isolement du quotidien, de rencontrer du monde ou simplement de prendre un moment pour elles.",
        ],
      },
    ],
  },
  creatifs: {
    slug: "creatifs",
    chemin: "/creatifs",
    nom: "Créatifs",
    surtitre: "Notre espace création",
    titre: "Ateliers créatifs entre femmes : peinture, bougie, macramé, poterie…",
    accroche: "Des ateliers manuels pour se reconnecter à soi, entre femmes.",
    sections: [
      {
        titre: "Faire de ses mains",
        paragraphes: [
          "Chaque atelier créatif propose une activité manuelle différente : peinture, bougie, macramé, poterie… On crée, on essaie et on échange dans une ambiance conviviale, à Gagny, Chelles ou Le Raincy.",
        ],
      },
      {
        titre: "Se reconnecter à soi",
        paragraphes: [
          "Prendre le temps de créer, c'est aussi prendre un moment pour soi, loin du rythme du quotidien, et le partager avec d'autres femmes.",
        ],
      },
      {
        titre: "Pour qui ?",
        paragraphes: [
          "Pour toutes celles qui ont envie de découvrir une activité créative, de se faire plaisir ou de rencontrer d'autres femmes autour d'un projet manuel.",
        ],
      },
    ],
  },
  business: {
    slug: "business",
    chemin: "/business",
    nom: "Business",
    surtitre: "Notre espace entrepreneuriat",
    titre: "Ateliers business pour femmes : entreprendre entourée",
    accroche: "Entrepreneuriat, développement professionnel et personnel : des ateliers pour avancer entourée.",
    sections: [
      {
        titre: "Avancer ensemble",
        paragraphes: [
          "L'espace Business du Cocooning Club réunit des femmes qui entreprennent, se lancent ou réfléchissent à leur parcours. Les ateliers abordent l'entrepreneuriat ainsi que le développement professionnel et personnel, à Gagny, Chelles ou Le Raincy.",
        ],
      },
      {
        titre: "L'entraide avant tout",
        paragraphes: [
          "Le Cocooning Club repose sur l'entraide : on y partage ses questions, ses idées et ses expériences, dans une ambiance bienveillante et sans pression.",
        ],
      },
      {
        titre: "Pour qui ?",
        paragraphes: [
          "Pour les entrepreneuses, celles qui portent un projet, ou celles qui veulent faire grandir leur activité ou faire le point sur leur parcours.",
        ],
      },
    ],
  },
};

export const ORDRE_ESPACES: SlugEspace[] = ["papotages", "creatifs", "business"];
