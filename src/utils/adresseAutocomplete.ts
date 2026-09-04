// Nominatim (OpenStreetMap) : gratuit, sans clé, ouvert en CORS. Contrairement
// à l'API Adresse du gouvernement (qui n'indexe que des adresses postales),
// Nominatim référence aussi les noms d'enseignes/commerces (ex: "Le Flow
// Bien-être"), ce qui donne des suggestions proches de celles de Google Maps.
export interface AdresseSuggestion {
  label: string;
}

interface NominatimResult {
  display_name?: string;
}

export const searchAdresse = async (query: string, signal?: AbortSignal): Promise<AdresseSuggestion[]> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=fr&accept-language=fr&limit=6`,
    { signal }
  );
  if (!res.ok) throw new Error(`Nominatim: ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  const seen = new Set<string>();
  const suggestions: AdresseSuggestion[] = [];
  for (const item of data) {
    const label = item.display_name;
    if (label && !seen.has(label)) {
      seen.add(label);
      suggestions.push({ label });
    }
  }
  return suggestions;
};
