import { useEffect } from "react";

// Le site est une SPA : index.html ne fournit qu'un titre/description par
// défaut, identiques sur toutes les routes. Ce hook les personnalise par
// page pour un meilleur référencement (résultats de recherche, partages).
export const usePageSeo = (title: string, description?: string) => {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", description);
  }, [title, description]);
};
