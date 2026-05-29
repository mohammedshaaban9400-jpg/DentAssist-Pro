import { useEffect, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Desktop polish: suppress accidental selection on chrome, allow text in fields;
 * disable native context menu except where explicitly allowed.
 */
export function NativeAppChrome({ children }: Props) {
  const isWebBuild = import.meta.env.VITE_TARGET === 'web'

  useEffect(() => {
    if (isWebBuild) return
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return
      if (el.isContentEditable) return
      if (el.closest('[data-allow-contextmenu]')) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    return () => document.removeEventListener('contextmenu', onContextMenu)
  }, [isWebBuild])

  return (
    <div className="flex h-full min-h-0 flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_select]:select-text [&_[contenteditable='true']]:select-text">
      {children}
    </div>
  )
}
