import { useEffect } from "react";
import { Check, Minus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { COLONNES_MATRICE, MATRICE, ROLES, type ColonneMatrice } from "@/lib/roles";

const libelleColonne = (colonne: ColonneMatrice) => (colonne === "visiteur" ? "Visiteur" : ROLES[colonne].libelle);

const MatriceRoles = () => {
  useEffect(() => {
    document.title = "Matrice des rôles · Cocooning Club";
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Matrice des rôles</h1>
        <p className="mt-1 text-muted-foreground">
          Ce que chaque rôle peut voir et faire sur le site. Elle est construite à partir des mêmes règles que celles
          qui protègent les pages : elle est toujours à jour.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(COLONNES_MATRICE.filter(c => c !== "visiteur") as Exclude<ColonneMatrice, "visiteur">[]).map(role => (
          <div key={role} className="rounded-2xl border bg-card p-4">
            <p className="font-body font-medium text-foreground">{ROLES[role].libelle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ROLES[role].description}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th scope="col" className="sticky left-0 z-10 bg-muted px-4 py-3 text-left font-medium text-foreground">
                Page ou action
              </th>
              {COLONNES_MATRICE.map(colonne => (
                <th key={colonne} scope="col" className="px-3 py-3 text-center font-medium text-foreground">
                  {libelleColonne(colonne)}
                </th>
              ))}
            </tr>
          </thead>
          {MATRICE.map(section => (
            <tbody key={section.titre}>
              <tr className="border-b bg-muted/20">
                <th scope="colgroup" colSpan={COLONNES_MATRICE.length + 1} className="px-4 py-2.5 text-left">
                  <span className="font-semibold text-foreground">{section.titre}</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{section.description}</span>
                </th>
              </tr>
              {section.lignes.map(ligne => (
                <tr key={ligne.libelle} className="border-b last:border-b-0">
                  <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-normal text-foreground">
                    {ligne.libelle}
                    {ligne.detail && <span className="mt-0.5 block text-xs text-muted-foreground">{ligne.detail}</span>}
                  </th>
                  {COLONNES_MATRICE.map(colonne => {
                    const autorise = ligne.acces.includes(colonne);
                    return (
                      <td key={colonne} className="px-3 py-2.5 text-center">
                        {autorise ? (
                          <Check className="mx-auto h-4 w-4 text-green-600" aria-label="Autorisé" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Refusé" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Lecture seule : les droits se modifient dans le code et dans les règles de la base de données, pas ici. Le
        statut de créateur est réservé à une seule adresse et ne peut être attribué que depuis le SQL editor de Supabase.
      </p>
    </AdminLayout>
  );
};

export default MatriceRoles;
