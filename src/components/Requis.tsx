// Astérisque rouge des champs obligatoires (06/11), partout sur le site.
// L'astérisque est dessiné en CSS (hors du texte du libellé) ; le lecteur d'écran entend « obligatoire ».
const Requis = () => (
  <>
    <span className="ml-0.5 text-red-700 after:content-['*']" aria-hidden="true" />
    <span className="sr-only"> (obligatoire)</span>
  </>
);

export default Requis;
