import { forwardRef, type ReactNode } from 'react'

export function ListPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="list-page flex min-h-0 flex-col bg-white -m-3 sm:-m-5 md:-m-8 md:h-[calc(100%+4rem)] md:overflow-hidden">
      {children}
    </div>
  )
}

export function ListPageHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <header className={`list-page-header ${className}`.trim()}>{children}</header>
}

export function ListPageToolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`list-page-toolbar ${className}`.trim()}>{children}</div>
}

export function ListPageBand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`list-page-band ${className}`.trim()}>{children}</div>
}

export function MobileCardList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mobile-card-list ${className}`.trim()}>{children}</div>
}

export const DesktopTableScroll = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function DesktopTableScroll({ children }, ref) {
    return <div ref={ref} className="desktop-table-scroll">{children}</div>
  },
)

export function DesktopTablePane({ children }: { children: ReactNode }) {
  return <div className="desktop-table-pane">{children}</div>
}

export function MobileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`mobile-card ${className}`.trim()}>{children}</article>
}

export function MobileCardActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mobile-card-actions ${className}`.trim()}>{children}</div>
}

export function MobileEmptyState({ icon: Icon, children }: { icon: React.ElementType; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-400">
      <Icon className="size-10 text-slate-300" aria-hidden />
      {children}
    </div>
  )
}
