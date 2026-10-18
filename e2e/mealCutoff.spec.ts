import { test, expect } from '@playwright/test'

/**
 * Bachelor Home ERP - E2E Test: Meal 10:00 PM Asia/Dhaka Cutoff Engine
 * Reference: test_plan.md (PRD §15.3, MEL-02, MEL-03)
 */
test.describe('Meal 10:00 PM Asia/Dhaka Cutoff Engine', () => {
  test('locks next-day meal toggles after 10:00 PM Asia/Dhaka (22:00:00)', async ({ page }) => {
    // 1. Mock system time to 10:05:00 PM Asia/Dhaka (+06:00)
    await page.clock.setFixedTime(new Date('2026-10-15T22:05:00+06:00'))

    // 2. Open Meal Portal as Boarder
    await page.goto('/login')
    await page.click('button:has-text("বর্ডার (আবাসিক)")')
    await page.goto('/portal/my-meals')

    // 3. Verify Page Loaded
    await expect(page.locator('text=মিল নির্বাচন ও ১০:০০ PM কাটঅফ পোর্টাল')).toBeVisible()

    // 4. Verify Cutoff Passed Banner & Zero Countdown
    await expect(page.locator('text=কাটঅফ সময় অতিক্রান্ত হয়েছে')).toBeVisible()
    await expect(page.locator('text=লকড (Locked)')).toBeVisible()

    // 5. Verify meal toggles for tomorrow are disabled
    const lunchToggle = page.locator('#toggle-lunch')
    const dinnerToggle = page.locator('#toggle-dinner')

    await expect(lunchToggle).toBeDisabled()
    await expect(dinnerToggle).toBeDisabled()
  })

  test('allows next-day meal toggles before 10:00 PM Asia/Dhaka (< 22:00:00)', async ({ page }) => {
    // 1. Mock system time to 07:30:00 PM Asia/Dhaka (Before Cutoff)
    await page.clock.setFixedTime(new Date('2026-10-15T19:30:00+06:00'))

    // 2. Open Meal Portal as Boarder
    await page.goto('/login')
    await page.click('button:has-text("বর্ডার (আবাসিক)")')
    await page.goto('/portal/my-meals')

    // 3. Verify Cutoff Active Countdown
    await expect(page.locator('text=পরিবর্তন সক্রিয় (Unlocked)')).toBeVisible()
    await expect(page.locator('text=বাকি আছে')).toBeVisible()

    // 4. Verify meal toggle is enabled
    const dinnerToggle = page.locator('#toggle-dinner')
    await expect(dinnerToggle).toBeEnabled()

    // 5. Toggle dinner and verify interaction works cleanly
    await dinnerToggle.click()
  })
})
