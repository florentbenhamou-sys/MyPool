import { expect, test } from "@playwright/test";

/** Parcours métier principaux, sur téléphone (375 px). */
test.use({ viewport: { width: 375, height: 812 } });

test("saisie rapide en salon : entité + contact + vecteur", async ({ page }) => {
  const name = `Salon Test ${Date.now()}`;
  await page.goto("/entities/new");
  await page.getByLabel(/Nom de l'entité/).fill(name);
  await page.getByLabel("Prénom").fill("Marie");
  await page.getByLabel("Nom", { exact: true }).fill("Curie");
  await page.getByLabel("E-mail").fill("marie.curie@example.com");
  await page.getByLabel("Téléphone").fill("+33 6 11 22 33 44");
  await page.getByLabel("Événement").fill("Salon SAP Inside");
  await page.getByLabel("Notes").fill("Intéressée par MDG");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("marie.curie@example.com")).toBeVisible();
});

test("e-mail obligatoire si un contact est saisi", async ({ page }) => {
  await page.goto("/entities/new");
  await page.getByLabel(/Nom de l'entité/).fill("Sans email");
  await page.getByLabel("Prénom").fill("Jean");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/entities\/new/);
});

test("proposition : produit, souscription avec remise, synthèse recalculée", async ({ page }) => {
  await page.goto("/proposals/new");
  await page.getByLabel(/Choisir l'entité/).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Ajouter un produit" }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption({ index: 1 });
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("button", { name: "Ajouter une souscription" })).toBeVisible();

  // Souscription en saisie libre : 1000 € remisé de 20 % → 800 €
  await page.getByRole("button", { name: "Ajouter une souscription" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Code").fill("TEST-SUB");
  await dialog.getByLabel("Description").fill("Souscription de test");
  await dialog.getByLabel(/Prix catalogue/).fill("1000");
  await dialog.getByLabel("Remise (%)").fill("20");
  await expect(dialog.getByText("800,00")).toBeVisible();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden();

  // La barre de synthèse mobile affiche le nouveau total annuel.
  await expect(page.getByText(/800,00\s€/).first()).toBeVisible();
});
