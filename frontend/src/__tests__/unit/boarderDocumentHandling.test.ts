import { describe, it, expect } from 'vitest'
import { getDocumentSignedUrl } from '@/features/boarders/api/useBoarders'

describe('boarderDocumentHandling.test.ts - NID & Profile Document URLs', () => {
  it('returns empty string when filePath is empty, null, or undefined', async () => {
    expect(await getDocumentSignedUrl('')).toBe('')
    // @ts-expect-error testing falsy
    expect(await getDocumentSignedUrl(null)).toBe('')
    // @ts-expect-error testing falsy
    expect(await getDocumentSignedUrl(undefined)).toBe('')
  })

  it('filters out old stock/demo unsplash document images', async () => {
    const demoUrl = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
    expect(await getDocumentSignedUrl(demoUrl)).toBe('')
  })

  it('filters out old mock application-nid.jpg fallback path', async () => {
    expect(await getDocumentSignedUrl('boarder-docs/application-nid.jpg')).toBe('')
    expect(await getDocumentSignedUrl('boarder-docs/application-nid.png')).toBe('')
  })

  it('returns data URLs (base64) directly for instant real uploaded document preview', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
    expect(await getDocumentSignedUrl(dataUrl)).toBe(dataUrl)

    const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr'
    expect(await getDocumentSignedUrl(pdfDataUrl)).toBe(pdfDataUrl)
  })

  it('returns external valid https URLs directly', async () => {
    const validUrl = 'https://example.com/documents/nid_card_scan.jpg'
    expect(await getDocumentSignedUrl(validUrl)).toBe(validUrl)
  })
})
