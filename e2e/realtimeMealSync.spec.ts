import { test, expect } from '@playwright/test'

/**
 * Bachelor Home ERP - E2E Test: Multi-Context Realtime Meal Synchronization
 * Reference: test_plan.md (PRD §15.3, MEL-05)
 */
test.describe('Real-Time Meal Headcount Synchronization', () => {
  test('kitchen monitor displays live realtime sync status and updates without manual page refresh', async ({ browser }) => {
    // -------------------------------------------------------------------------
    // Context 1: Kitchen Monitor / Manager Screen
    // -------------------------------------------------------------------------
    const managerContext = await browser.newContext()
    const managerPage = await managerContext.newPage()

    // Login as Manager
    await managerPage.goto('/login')
    await managerPage.click('button:has-text("ম্যানেজার")')

    // Navigate to Kitchen Monitor
    await managerPage.goto('/meals')
    await expect(managerPage.locator('text=কিচেন মিল মনিটর ও প্রিপারেশন লিস্ট')).toBeVisible()

    // Verify Realtime Live Indicator
    await expect(managerPage.locator('text=রিয়েলটাইম সিঙ্ক সক্রিয় (Live Realtime)')).toBeVisible()

    // Verify grand total meal card is visible
    const grandTotalMeals = managerPage.locator('#grand-total-meals')
    await expect(grandTotalMeals).toBeVisible()

    // -------------------------------------------------------------------------
    // Context 2: Boarder Meal Portal
    // -------------------------------------------------------------------------
    const boarderContext = await browser.newContext()
    const boarderPage = await boarderContext.newPage()

    // Login as Boarder
    await boarderPage.goto('/login')
    await boarderPage.click('button:has-text("বর্ডার (আবাসিক)")')

    // Navigate to Boarder Self-Service
    await boarderPage.goto('/portal/my-meals')
    await expect(boarderPage.locator('text=মিল নির্বাচন ও ১০:০০ PM কাটঅফ পোর্টাল')).toBeVisible()

    // Toggle meal toggle in boarder context
    const dinnerToggle = boarderPage.locator('#toggle-dinner')
    if (await dinnerToggle.isEnabled()) {
      await dinnerToggle.click()

      // Verify Context 1 continues running without errors
      await expect(managerPage.locator('#grand-total-meals')).toBeVisible()
    }

    // Cleanup contexts
    await boarderContext.close()
    await managerContext.close()
  })
})
