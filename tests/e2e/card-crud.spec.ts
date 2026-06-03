import { expect, test, type Page } from '@playwright/test';

const BOARD_ID = '00000000-0000-4000-a000-000000000001';
const COLUMN_ID = '00000000-0000-4000-a000-000000000010';

function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

async function openAddCardForm(page: Page) {
  await page.getByRole('button', { name: 'Add card to To Do' }).click();
  await expect(page.getByLabel('Card Title *')).toBeVisible();
}

async function createCardThroughUi(page: Page, title: string, description: string) {
  await openAddCardForm(page);
  await page.getByLabel('Card Title *').fill(title);
  await page.getByLabel('Description (optional)').fill(description);

  const createResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes(`/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/cards`)
  ));
  await page.getByRole('button', { name: 'Create Card' }).click();
  const createResponse = await createResponsePromise;

  expect(createResponse.status()).toBe(201);
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(description, { exact: true }).first()).toBeVisible();

  const body = await createResponse.json() as { card: { id: string; position: number } };
  return body.card;
}

async function openCardDetail(page: Page, title: string) {
  await page.getByText(title, { exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add card to To Do' })).toBeVisible();
});

test('Create Card workflow', async ({ page }) => {
  const title = uniqueTitle('E2E Create');
  const description = 'Created card persists after refresh';

  await createCardThroughUi(page, title, description);

  await page.reload();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(description, { exact: true }).first()).toBeVisible();
});

test('View Card Detail workflow', async ({ page }) => {
  const title = uniqueTitle('E2E Detail');
  const description = 'Detail view shows persisted card data';

  const card = await createCardThroughUi(page, title, description);
  const detailResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'GET'
    && response.url().includes(`/api/cards/${card.id}`)
  ));
  await openCardDetail(page, title);
  const detailResponse = await detailResponsePromise;

  expect(detailResponse.status()).toBe(200);
  await expect(page.getByRole('dialog')).toContainText(description);
  await expect(page.getByRole('dialog')).toContainText(`Position: ${card.position}`);

  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.reload();
  await openCardDetail(page, title);
  await expect(page.getByRole('dialog')).toContainText(description);
});

test('Edit Card workflow', async ({ page }) => {
  const title = uniqueTitle('E2E Edit Original');
  const updatedTitle = uniqueTitle('E2E Edit Updated');
  const updatedDescription = 'Updated description persists after refresh';

  const card = await createCardThroughUi(page, title, 'Original edit description');
  await openCardDetail(page, title);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title *').fill(updatedTitle);
  await dialog.getByLabel('Description').fill(updatedDescription);

  const updateResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'PUT'
    && response.url().includes(`/api/cards/${card.id}`)
  ));
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  const updateResponse = await updateResponsePromise;

  expect(updateResponse.status()).toBe(200);
  await expect(dialog.getByRole('heading', { name: updatedTitle })).toBeVisible();
  await expect(dialog).toContainText(updatedDescription);

  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.reload();
  await expect(page.getByText(updatedTitle, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(updatedDescription, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

test('Delete Card workflow', async ({ page }) => {
  const title = uniqueTitle('E2E Delete');
  const description = 'Deleted card should not reappear after refresh';

  const card = await createCardThroughUi(page, title, description);
  await openCardDetail(page, title);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.delete-card-confirmation')).toContainText(`Are you sure you want to delete ${title}?`);

  const deleteResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'DELETE'
    && response.url().includes(`/api/cards/${card.id}`)
  ));
  await page.locator('.delete-card-confirmation').getByRole('button', { name: 'Delete' }).click();
  const deleteResponse = await deleteResponsePromise;

  expect(deleteResponse.status()).toBe(204);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});
