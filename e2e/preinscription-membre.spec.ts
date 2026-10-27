import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({
  id: "cccccccc-0000-4000-8000-000000000001",
  prenom: "Marie",
  nom: "Dupont",
  email: "marie@exemple.fr",
  telephone: "0601020304",
  role: "membre",
});

test("un membre se pré-inscrit depuis son espace avec les informations de son compte", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/ateliers");

  // Même libellé que sur l'accueil : « Pré-inscription », jamais « S'inscrire ».
  await expect(page.getByText("S'inscrire")).toHaveCount(0);
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  await page.getByRole("dialog").or(page.locator("div.fixed")).getByRole("button", { name: "Pré-inscription" }).click();

  // Fenêtre commune avec l'accueil, identité du compte déjà remplie et non modifiable.
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription" });
  await expect(fenetre.getByLabel("Prénom", { exact: true })).toHaveValue("Marie");
  await expect(fenetre.getByLabel("Nom", { exact: true })).toHaveValue("Dupont");
  await expect(fenetre.getByLabel("Nom", { exact: true })).toHaveAttribute("readonly", "");
  await expect(fenetre.getByLabel("E-mail", { exact: true })).toHaveValue("marie@exemple.fr");
  await expect(fenetre.getByLabel("Téléphone", { exact: true })).toHaveValue("0601020304");
  await remplirPreInscription(fenetre);
  await fenetre.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();

  // Rattachée au compte : aucun champ « invité » n'est envoyé.
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    utilisateur_id: MEMBRE.id,
    telephone_invite: "0601020304",
    date_naissance: null,
    autorisation_image: true,
    accord_whatsapp: false,
  }]);
});

const LIGNE_ADMIN = {
  id: "dddddddd-0000-4000-8000-000000000001",
  atelier_id: ATELIER_TEST.id,
  utilisateur_id: MEMBRE.id,
  prenom_invite: null,
  nom_invite: null,
  email_invite: null,
  telephone_invite: null,
  date_naissance: null,
  statut: "en_attente",
  statut_paiement: "en_attente",
  inscrit_le: new Date().toISOString(),
  ateliers: { id: ATELIER_TEST.id, titre: ATELIER_TEST.titre, date_atelier: ATELIER_TEST.date_atelier, heure_debut: "14:00:00", lieu: "Gagny", adresse: null },
  utilisateurs: { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304", role: "membre" },
};

test("l'administration voit l'identité du membre pré-inscrit, regroupée par atelier", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  await mockSupabase(page, { profil: admin, inscriptions: [LIGNE_ADMIN] });
  await connecterEn(page, admin);
  await page.goto("/admin/pre-inscriptions");

  // L'atelier a une demande à traiter : son bloc est ouvert.
  await expect(page.getByRole("button", { name: new RegExp(ATELIER_TEST.titre) })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("1 à traiter")).toBeVisible();
  await expect(page.getByText("Marie Dupont", { exact: true })).toBeVisible();
  await expect(page.getByText(/marie@exemple\.fr/)).toBeVisible();

  // Le détail s'ouvre dans une fenêtre à onglets.
  await page.getByRole("button", { name: "Ouvrir la pré-inscription de Marie Dupont" }).click();
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription de Marie Dupont" });
  await expect(fenetre.getByText("0601020304")).toBeVisible();
  await fenetre.getByRole("tab", { name: "Paiement" }).click();
  await expect(fenetre.getByRole("button", { name: "En attente", pressed: true })).toBeVisible();
});

test("depuis « Inscrits » : l'atelier visé est ouvert, validation en un clic, historique", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  const mock = await mockSupabase(page, {
    profil: admin,
    inscriptions: [LIGNE_ADMIN],
    logs: [{ action: "inscription.validate", auteur: "Christelle", horodatage: new Date().toISOString() }],
  });
  await connecterEn(page, admin);
  await page.goto(`/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);

  await expect(page.getByText(/Vous arrivez depuis/)).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(ATELIER_TEST.titre) })).toHaveAttribute("aria-expanded", "true");

  // Paiement non réglé : la validation est bloquée, sauf dérogation motivée (enregistrée par la base).
  await page.getByRole("button", { name: "Valider Marie Dupont" }).click();
  const derogation = page.getByRole("dialog", { name: "Valider sans paiement" });
  await expect(derogation.getByText("Paiement non réglé")).toBeVisible();
  expect(mock.updates.inscriptions ?? []).toHaveLength(0);
  await derogation.getByRole("button", { name: "Valider sans paiement" }).click();
  expect(mock.rpc.valider_sans_paiement ?? []).toHaveLength(0); // motif obligatoire
  await derogation.getByLabel("Motif").fill("Règlement en espèces sur place");
  await derogation.getByRole("button", { name: "Valider sans paiement" }).click();
  await expect.poll(() => mock.rpc.valider_sans_paiement?.[0]).toMatchObject({
    p_inscription: LIGNE_ADMIN.id, p_motif: "Règlement en espèces sur place",
  });

  // Après la validation, la fenêtre s'ouvre sur « Messages » avec le message de validation prêt à envoyer.
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription de Marie Dupont" });
  await expect(fenetre.getByRole("tab", { name: "Messages", selected: true })).toBeVisible();
  await expect(fenetre.getByText("Pré-inscription validée : le message est prêt")).toBeVisible();
  await fenetre.getByRole("tab", { name: "Historique" }).click();
  await expect(fenetre.getByText("Pré-inscription reçue")).toBeVisible();
  await expect(fenetre.getByText("Pré-inscription validée")).toBeVisible();

  await fenetre.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Tout afficher" }).click();
  await expect(page.getByText(/Vous arrivez depuis/)).toHaveCount(0);
});

test("valider depuis la liste fait apparaître le mail de validation, prêt à envoyer", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  const reglee = { ...LIGNE_ADMIN, statut_paiement: "non_requis" };
  const modeles = [
    { cle: "validation_mail_sujet", valeur: "Votre pré-inscription est validée ✨" },
    { cle: "validation_mail_corps", valeur: "Bonjour {prenom}, votre pré-inscription à « {titre} » du {date} à {heure} ({lieu}) est validée." },
  ];
  const mock = await mockSupabase(page, { profil: admin, inscriptions: [reglee], modeles });
  await connecterEn(page, admin);
  // Pas de vraie fenêtre : on relève l'adresse que le site ouvre.
  await page.addInitScript(() => {
    window.open = (url?: string | URL) => { (window as unknown as { __ouvert?: string }).__ouvert = String(url); return null; };
  });
  await page.goto("/admin/pre-inscriptions");

  await page.getByRole("button", { name: "Valider Marie Dupont" }).click();
  await expect.poll(() => mock.updates.inscriptions?.[0]).toMatchObject({ statut: "confirme" });

  // La fenêtre s'ouvre sur le message : destinataire connu, objet et texte remplis.
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription de Marie Dupont" });
  await expect(fenetre.getByRole("tab", { name: "Messages", selected: true })).toBeVisible();
  await expect(fenetre.getByText("Pré-inscription validée : le message est prêt")).toBeVisible();
  await expect(fenetre.getByLabel("Objet")).toHaveValue("Votre pré-inscription est validée ✨");
  await expect(fenetre.getByLabel("Message")).toHaveValue(/Bonjour Marie, votre pré-inscription à « .+ » du .+ à 14:00 \(Gagny\) est validée\./);

  // Gmail dans le navigateur, pour les messageries qui n'ouvrent rien avec un lien « mailto ».
  await fenetre.getByRole("button", { name: "Ouvrir dans Gmail" }).click();
  const adresse = await page.evaluate(() => (window as unknown as { __ouvert?: string }).__ouvert ?? "");
  expect(adresse).toContain("https://mail.google.com/mail/?view=cm");
  expect(adresse).toContain("to=marie%40exemple.fr");
  expect(adresse).toContain("su=Votre%20pr%C3%A9-inscription");
});
