/** Download or share backup on mobile browsers (iOS often ignores `<a download>`). */
export async function saveBackupBlob(
  encrypted: string,
  fileName: string,
): Promise<{ ok: true; filePath: string } | { ok: false }> {
  const blob = new Blob([encrypted], { type: 'application/octet-stream' })
  const file = new File([blob], fileName, { type: 'application/octet-stream' })

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'DentAssist Pro',
        text: fileName,
      })
      return { ok: true, filePath: fileName }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false }
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { ok: true, filePath: fileName }
}
