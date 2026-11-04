import { expect, test, type Page } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

// Événement Google Analytics « pre_inscription » : envoyé seulement quand la pré-inscription est enregistrée,
// avec le consentement aux cookies statistiques, et sans aucune donnée personnelle.

const accepterCookies = (page: Page) =>
  page.addInitScript(() => {
    window.localStorage.setItem("cc_consentement", JSON.stringify({ audience: true, date: new Date().toISOString() }));
  });
const evenements = (page: Page) =>
  page.evaluate(() => (window.dataLayer ?? []).map(e => Array.from(e as ArrayLike<unknown>)).filter(a => a[0] === "event" && a[1] === "pre_inscription"));
const remplir = (page: Page) =>
  remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "oui" });
const envoyer = (page: Page) => page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, r => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
});

test("pré-inscription enregistrée + cookies acceptés : un seul événement pre_inscription, sans donnée personnelle", async ({ page }) => {
  await mockSupabase(page, { sansChoixCookies: true });
  await accepterCookies(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  expect(await evenements(page)).toEqual([]); // rien tant que rien n'est envoyé
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();

  const ev = await evenements(page);
  expect(ev).toHaveLength(1);
  expect(ev[0][2]).toEqual({ page_path: "/inscription", page_location: expect.stringMatching(/\/inscription$/) });
  expect(JSON.stringify(ev)).not.toMatch(/Léa|Martin|lea@exemple|06 11|aaaaaaaa/);
});

test("cookies refusés : aucun événement, même si la pré-inscription est enregistrée", async ({ page }) => {
  const mock = await mockSupabase(page); // choix « refusé » déjà fait
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toHaveLength(1);
  expect(await evenements(page)).toEqual([]);
});

test("clic sur le bouton avec un formulaire incomplet, ou doublon refusé : aucun événement", async ({ page }) => {
  const mock = await mockSupabase(page, { sansChoixCookies: true });
  await accepterCookies(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);

  await envoyer(page); // formulaire vide : erreurs de saisie, rien n'est envoyé
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeHidden();
  expect(await evenements(page)).toEqual([]);

  mock.pannes.doublon = true; // la base répond « une pré-inscription existe déjà »
  await remplir(page);
  await envoyer(page);
  await expect(page.getByText(/existe déjà|déjà inscrite|déjà/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeHidden();
  expect(await evenements(page)).toEqual([]);
});
