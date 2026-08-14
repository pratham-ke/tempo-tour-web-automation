import type { Page } from '@playwright/test';
import { buildRoute, routes } from '../../config/routes';

/**
 * Minimal Login page object for authentication setup only.
 * Based on tempo-tour-saas app/views/common/login.tpl (read-only inspection).
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(baseUrl: string): Promise<void> {
    const url = `${baseUrl.replace(/\/$/, '')}/${buildRoute(routes.login)}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  usernameInput() {
    return this.page.locator('#username');
  }

  passwordInput() {
    return this.page.locator('#password');
  }

  loginButton() {
    // Submit control has empty name attribute; value is LOGIN (login.tpl)
    return this.page.locator('input[type="submit"][value="LOGIN"]');
  }

  errorMessage() {
    return this.page.locator('.login_error_holder.error_msg');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput().waitFor({ state: 'visible' });
    await this.usernameInput().fill(username);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  /**
   * Successful non-CMA login redirects to common/calendar.
   * CMA users redirect to common/cmalist — also treated as authenticated.
   */
  async expectAuthenticatedLanding(): Promise<void> {
    await this.page.waitForURL(
      /index\.php\?route=common\/(calendar|cmalist)/,
      { timeout: 30_000 },
    );
    await this.usernameInput().waitFor({ state: 'hidden' }).catch(() => undefined);
  }
}
