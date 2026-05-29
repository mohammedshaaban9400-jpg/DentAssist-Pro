/** Brand assets under `public/` (copied to dist / dist-web). */
const BASE = import.meta.env.BASE_URL

/** Full app logo (blue tile + tooth) — same as desktop `build/icon.png`. */
export const APP_LOGO_PNG = `${BASE}logo.png`
export const APP_FAVICON_PNG = `${BASE}favicon.png`

export function defaultAppLogoSrc(): string {
  return APP_LOGO_PNG
}

export function applyAppLogoFallback(img: HTMLImageElement): void {
  if (!img.src.includes('favicon.png')) {
    img.src = APP_FAVICON_PNG
    return
  }
  img.style.display = 'none'
}
