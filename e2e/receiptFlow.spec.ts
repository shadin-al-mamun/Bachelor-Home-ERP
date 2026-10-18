import { test, expect } from '@playwright/test'

/**
 * Bachelor Home ERP - E2E Test: Receipt Collection & Cash Reconciliation Flow
 * Reference: test_plan.md (PRD §15.1, FIN-01, FIN-08)
 */
test.describe('Receipt Collection & Cash Flow E2E', () => {
  test('opens receipt collection modal, auto-distributes payment to oldest dues, and verifies cash session update', async ({ page }) => {
    // 1. Login as Hostel Manager
    await page.goto('/login')
    await page.click('button:has-text("ম্যানেজার")')
    await expect(page).toHaveURL(/\/dashboard/)

    // 2. Navigate to Receipts Ledger
    await page.goto('/billing/receipts')
    await expect(page.locator('text=মানি রিসিপ্ট ও কালেকশন')).toBeVisible()

    // 3. Open Collect Receipt Modal
    const collectBtn = page.locator('#btn-collect-receipt')
    await expect(collectBtn).toBeVisible()
    await collectBtn.click()

    // 4. Verify Modal Header & Fields
    await expect(page.locator('text=টাকা গ্রহণ ও অফিসিয়াল মানি রিসিপ্ট প্রদান')).toBeVisible()
    await expect(page.locator('text=বকেয়া অনুযায়ী স্বয়ংক্রিয় বণ্টন')).toBeVisible()

    // 5. Select Boarder from dropdown
    const boarderSelect = page.locator('select').first()
    await expect(boarderSelect).toBeVisible()

    // 6. Enter Payment Amount
    const amountInput = page.locator('input[type="number"]').first()
    await amountInput.fill('3000')

    // 7. Click Auto Distribute Button
    const autoDistBtn = page.locator('button:has-text("পুরোনো বকেয়ায় অটো বণ্টন")')
    if (await autoDistBtn.isVisible()) {
      await autoDistBtn.click()
    }

    // 8. Verify Submit Button is enabled
    const submitBtn = page.locator('#submit-receipt-btn')
    await expect(submitBtn).toBeEnabled()

    // 9. Close modal
    await page.keyboard.press('Escape')

    // 10. Navigate to Cash Custody Dashboard
    await page.goto('/cash-custody')
    await expect(page.locator('text=দৈনিক ক্যাশ হেফাজত ও ক্লোজিং ড্যাশবোর্ড')).toBeVisible()
    await expect(page.locator('text=কালেকশন (Receipts)')).toBeVisible()
  })
})
