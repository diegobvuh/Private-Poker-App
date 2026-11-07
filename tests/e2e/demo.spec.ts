import { expect, test } from "@playwright/test";

test("dealer cockpit controls are functional", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Table view" })).toBeVisible();
  await page.getByRole("button", { name: /Buy-in \/ rebuy/i }).click();
  await expect(page.getByRole("heading", { name: "Buy-in or rebuy" })).toBeVisible();
  await page.getByRole("button", { name: "Record entry" }).click();
  await expect(page.getByRole("status")).toContainText("recorded");
  await page.getByRole("button", { name: /Money ledger/i }).click();
  await expect(page.getByRole("heading", { name: "Money ledger" })).toBeVisible();
});

test("practice games are clearly nonredeemable", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: /Practice room/i }).click();
  await expect(page.getByText("ZERO CASH VALUE")).toBeVisible();
  await page.getByRole("button", { name: /Blackjack/i }).click();
  await expect(page.getByRole("dialog")).toContainText("no cash value");
});
