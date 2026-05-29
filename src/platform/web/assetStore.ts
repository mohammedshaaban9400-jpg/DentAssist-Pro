const DB_NAME = 'dentassist-pro-assets'
const STORE = 'blobs'

type AssetRow = { path: string; mime: string; data: ArrayBuffer }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'path' })
      }
    }
  })
}

export async function deleteAsset(relativePath: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(relativePath)
  })
  db.close()
}

export async function putAsset(relativePath: string, mime: string, data: ArrayBuffer): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put({ path: relativePath, mime, data } satisfies AssetRow)
  })
  db.close()
}

export async function readAssetDataUrl(relativePath: string): Promise<string> {
  const db = await openDb()
  const row = await new Promise<AssetRow | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error)
    const req = tx.objectStore(STORE).get(relativePath)
    req.onsuccess = () => resolve(req.result as AssetRow | undefined)
    req.onerror = () => reject(req.error)
  })
  db.close()
  if (!row) throw new Error('Asset not found')
  const bytes = new Uint8Array(row.data)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  const b64 = btoa(binary)
  return `data:${row.mime};base64,${b64}`
}

export async function listAssetPaths(): Promise<string[]> {
  const db = await openDb()
  const paths = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error)
    const req = tx.objectStore(STORE).getAllKeys()
    req.onsuccess = () => resolve((req.result as string[]) ?? [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return paths
}

export async function clearAssets(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).clear()
  })
  db.close()
}

export async function restoreAssets(
  files: { path: string; data: string }[],
  mimeForPath: (rel: string) => string,
): Promise<void> {
  await clearAssets()
  for (const file of files) {
    if (!file?.path) continue
    const normalized = file.path.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized.startsWith('app_data/')) continue
    const binary = atob(file.data)
    const buf = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
    await putAsset(normalized, mimeForPath(normalized), buf.buffer)
  }
}

export function mimeFromPath(rel: string): string {
  const ext = rel.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}
