// API Adresse du gouvernement français (data.gouv.fr) : gratuite, sans clé,
// ouverte en CORS. Utilisée pour proposer des suggestions d'adresses postales
// au fur et à mesure de la saisie.
export interface AdresseSuggestion {
  label: string;
}

export const searchAdresse = async (query: string, signal?: AbortSignal): Promise<AdresseSuggestion[]> => {
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
    { signal }
  );
  if (!res.ok) throw new Error(`API Adresse: ${res.status}`);
  const data = await res.json();
  const features = (data?.features ?? []) as { properties?: { label?: string } }[];
  return features
    .map(f => f.properties?.label)
    .filter((label): label is string => !!label)
    .map(label => ({ label }));
};
