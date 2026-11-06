import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("Formulaire de contact : « Répondre dans Gmail » ouvre la réponse prête", async ({ page, context }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, {
    profil: admin,
    messagesContact: [{
      id: "eeeeeeee-0000-4000-8000-000000000001", prenom: null, nom: null, email: "lucie@exemple.fr", telephone: "06 00 00 00 00",
      message: null, cree_le: "2026-11-03T10:00:00Z", lu: false,
      reponses: { Nom: "Durand", Email: "lucie@exemple.fr", Message: "Bonjour\nSuper site.", "Prénom": "Lucie" },
    }],
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecterEn(page, admin);
  await page.goto("/admin/formulaire");
  await page.getByRole("button", { name: "Messages reçus" }).click();
  await page.getByText("Durand lucie@exemple.fr").click();
  await context.route("https://mail.google.com/**", r => r.fulfill({ body: "gmail" }));
  const [gmail] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Répondre dans Gmail" }).click()]);
  await gmail.waitForLoadState();
  const url = new URL(gmail.url());
  expect(url.searchParams.get("to")).toBe("lucie@exemple.fr");
  expect(url.searchParams.get("su")).toBe("Votre message au Cocooning Club");
  expect(url.searchParams.get("body")).toContain("Bonjour Lucie,");
  await expect.poll(() => mock.updates.contact_messages?.[0]).toEqual({ lu: true });
});
