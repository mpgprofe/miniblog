import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la portada lista las entradas publicadas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'CampusBlog', level: 1 })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Por ' })).toHaveCount(5);
});

test('el buscador filtra por título', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Buscar entradas por título').fill('Express');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Express');
});

test('búsqueda sin resultados muestra un mensaje', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Buscar entradas por título').fill('zzzz');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText('No hay entradas que coincidan.')).toBeVisible();
});

test('accesibilidad: sin violaciones detectables por axe', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
});
