import { expect, test } from "@playwright/test";

test("the app opens on the invite-only sign-in screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: /Welcome back to the table/i })).toBeVisible();
  await expect(page.getByText(/Only invited members can enter/i)).toBeVisible();
});

test("club and demo surfaces require a session", async ({ page }) => {
  for (const path of ["/club", "/demo"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in\?reason=session-required$/);
    await expect(page.getByRole("heading", { name: /Welcome back to the table/i })).toBeVisible();
  }
});
