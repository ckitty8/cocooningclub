import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const invitee = (n: number, p: Record<string, unknown>) => ({
  id: `dddddddd-0000-4000-8000-00000000000${n}`, atelier_id: ATELIER_TEST.id, utilisateur_id: null,
  telephone_invite: null, statut: "confirme", statut_paiement: "en_attente", inscrit_le: `2026-11-0${n}T10:00:00Z`,
  autorisation_image: true, accord_whatsapp: true, ateliers: { titre: "Journée Création Instagram", date_atelier: "2026-11-05" }, ...p,
});

test("Membres : les personnes pré-inscrites sans compte sont visibles à part et un compte se crée depuis leur ligne", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    inscriptions: [
      invitee(1, { prenom_invite: "Sophie", nom_invite: "Allain", email_invite: "sophie.allain@free.fr", telephone_invite: "0601020304" }),
      invitee(2, { prenom_invite: "Cristina", nom_invite: "Canto", email_invite: "contact@inkcanto.fr" }),
    ],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");

  // Le filtre « Inscrits » montre directement les participantes sans compte (aucun compte Inscrit ici).
  await page.locator("select").first().selectOption("inscrit");
  await expect(page.getByText("Aucun résultat")).toHaveCount(0);

  const ligne = page.getByRole("row", { name: /Sophie Allain/ });
  await expect(ligne).toBeVisible();
  await expect(ligne.getByText("Journée Création Instagram")).toBeVisible();
  await expect(page.getByRole("row", { name: /Cristina Canto/ })).toBeVisible();

  await ligne.getByRole("button", { name: "Créer un compte" }).filter({ visible: true }).click();
  const fenetre = page.locator("div.fixed").filter({ hasText: "Créer un membre" });
  await expect(fenetre.locator("input[type=email]")).toHaveValue("sophie.allain@free.fr");
  await expect(fenetre.locator("input").first()).toHaveValue("Sophie");
});
