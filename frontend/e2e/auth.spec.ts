import { test, expect } from '@playwright/test'

/**
 * Bachelor Home ERP - E2E Test: Authentication & Role Redirection
 * Reference: test_plan.md (PRD §15.4, SEC-01)
 */
test.describe('Authentication & Role Redirection Flow', () => {
  test('renders login page correctly with branding, form, and quick demo credentials', async ({ page }) => {
    await page.goto('/login')

    // Verify Title & Branding
    await expect(page.locator('text=সানফ্লাওয়ার হোস্টেল')).toBeVisible()
    await expect(page.locator('text=অ্যাকাউন্টে সাইন ইন')).toBeVisible()

    // Form Fields
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Registration and recovery links
    await expect(page.locator('text=পাসওয়ার্ড ভুলে গেছেন?')).toBeVisible()
    await expect(page.locator('text=নতুন বর্ডার রেজিস্ট্রেশন')).toBeVisible()

    // Demo role buttons
    await expect(page.locator('button', { hasText: 'এডমিন / মালিক' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'ম্যানেজার' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'বর্ডার (আবাসিক)' })).toBeVisible()
  })

  test('redirects Boarder user directly to Boarder Meal Portal', async ({ page }) => {
    await page.goto('/login')

    // Click Quick Demo login for Boarder
    await page.click('button:has-text("বর্ডার (আবাসিক)")')

    // Should redirect to /portal/my-meals
    await expect(page).toHaveURL(/\/portal\/my-meals/)
    await expect(page.locator('text=মিল নির্বাচন ও ১০:০০ PM কাটঅফ পোর্টাল')).toBeVisible()
  })

  test('redirects Admin user to Main Operations Dashboard', async ({ page }) => {
    await page.goto('/login')

    // Click Quick Demo login for Super Admin
    await page.click('button:has-text("এডমিন / মালিক")')

    // Should redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=সানফ্লাওয়ার হোস্টেল - সেন্ট্রাল ড্যাশবোর্ড')).toBeVisible()
  })

  test('strictly enforces Applicant isolation to application status page', async ({ page }) => {
    await page.goto('/login')

    // Switch to APPLICANT using the bottom role switcher
    const applicantBtn = page.locator('aside[aria-label="Role preview bar"] button', { hasText: 'আবেদনকারী' })
    if (await applicantBtn.isVisible()) {
      await applicantBtn.click()
    } else {
      await page.goto('/portal/my-application')
    }

    // Attempting to visit staff expenses or accommodation should redirect away
    await page.goto('/expenses')
    await expect(page).toHaveURL(/\/portal\/my-application/)
  })

  test('logs out successfully and blocks access to protected routes', async ({ page }) => {
    await page.goto('/dashboard')

    // Click Guest/Logout button in dev bar or header
    const guestBtn = page.locator('aside[aria-label="Role preview bar"] button', { hasText: 'গেস্ট' })
    await guestBtn.click()

    // Try navigating back to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
