/**
 * Browser-native image compressor using HTML5 Canvas & Object URLs.
 * Automatically resizes high-resolution smartphone camera photos (e.g. 10MB - 30MB)
 * down to crisp, web-optimized JPEG format (~200KB - 600KB) with max dimension of 1600px.
 * Preserves voucher receipt text legibility while eliminating mobile memory crashes,
 * storage quota rejection, and upload timeouts.
 */
export async function compressVoucherImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<File> {
  // If not an image (e.g. PDF), return original file untouched
  if (!file.type.startsWith('image/')) {
    return file
  }

  // If already a tiny image under 400KB, return as-is
  if (file.size < 400 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    // Use ObjectURL instead of FileReader to avoid 30MB base64 string memory allocation
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // safe fallback to original on error
    }

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let width = img.width
      let height = img.height

      // Calculate aspect-ratio-preserved bounding box
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      // Fill clean white background in case of transparent PNG/WebP
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const cleanName = (file.name || 'voucher_photo').replace(/\.[^/.]+$/, '')
          const compressedFile = new File([blob], `${cleanName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.src = objectUrl
  })
}

/**
 * Browser-native profile photo compressor & square cropper.
 * Resizes smartphone camera photos down to an optimized 600x600 avatar (~30KB-90KB)
 * and returns both the File (for Storage upload) and a Base64 Data URL (for instant preview/fallback).
 */
export async function compressProfilePhoto(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.85
): Promise<{ file: File; dataUrl: string }> {
  // If not an image, return original file with standard dataUrl
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve({ file, dataUrl: (reader.result as string) || '' })
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onloadend = () => resolve({ file, dataUrl: (reader.result as string) || '' })
      reader.readAsDataURL(file)
    }

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let width = img.width
      let height = img.height

      // Calculate square center crop dimensions
      const minDimension = Math.min(width, height)
      const cropX = (width - minDimension) / 2
      const cropY = (height - minDimension) / 2

      const targetWidth = Math.min(minDimension, maxWidth)
      const targetHeight = Math.min(minDimension, maxHeight)

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        const reader = new FileReader()
        reader.onloadend = () => resolve({ file, dataUrl: (reader.result as string) || '' })
        reader.readAsDataURL(file)
        return
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetWidth, targetHeight)
      // Center crop square avatar
      ctx.drawImage(
        img,
        cropX,
        cropY,
        minDimension,
        minDimension,
        0,
        0,
        targetWidth,
        targetHeight
      )

      const dataUrl = canvas.toDataURL('image/jpeg', quality)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, dataUrl })
            return
          }
          const cleanName = (file.name || 'avatar').replace(/\.[^/.]+$/, '')
          const compressedFile = new File([blob], `${cleanName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve({ file: compressedFile, dataUrl })
        },
        'image/jpeg',
        quality
      )
    }

    img.src = objectUrl
  })
}
