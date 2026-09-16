import { expect, type Locator, type Page } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly backpackAddButton: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByText('Products', { exact: true });
    this.backpackAddButton = page.getByRole('button', { name: 'Add to cart', exact: true }).first();
    this.cartLink = page.getByRole('link', { name: /shopping cart/i });
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory\.html/);
    await expect(this.title).toBeVisible();
  }

  async addFirstProductToCart(): Promise<void> {
    await this.backpackAddButton.click();
  }

  async openCart(): Promise<void> {
    await this.page.locator('[data-test="shopping-cart-link"]').click();
    await expect(this.page).toHaveURL(/cart\.html/);
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Checkout' }).click();
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
  }

  async expectDashboardTooEarly(): Promise<void> {
    await expect(this.title).toBeVisible({ timeout: 1500 });
  }

  async expectCartItemCount(count: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(count));
  }
}
