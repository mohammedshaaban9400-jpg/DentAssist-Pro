import fs from 'fs'

const o = '<' + 'div'
const c = '</' + 'div>'

const src = `import { forwardRef, type ReactNode } from 'react'

export function ListPageLayout({ children }: { children: ReactNode }) {
  return (
    ${o} className="list-page flex h-[calc(100%+1.5rem)] flex-col overflow-hidden bg-white -m-3 sm:-m-5 sm:h-[calc(100%+2.5rem)] md:-m-8 md:h-[calc(100%+4rem)]">
      {children}
    ${c}
  )
}

export function ListPageHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <header className={\`list-page-header \${className}\`.trim()}>{children}</header>
}

export function ListPageToolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return ${o} className={\`list-page-toolbar \${className}\`.trim()}>{children}${c}
}

export function ListPageBand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return ${o} className={\`list-page-band \${className}\`.trim()}>{children}${c}
}

export function MobileCardList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return ${o} className={\`mobile-card-list \${className}\`.trim()}>{children}${c}
}

export const DesktopTableScroll = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function DesktopTableScroll({ children }, ref) {
    return ${o} ref={ref} className="desktop-table-scroll">{children}${c}
  },
)

export function DesktopTablePane({ children }: { children: ReactNode }) {
  return ${o} className="desktop-table-pane">{children}${c}
}

export function MobileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={\`mobile-card \${className}\`.trim()}>{children}</article>
}

export function MobileCardActions({ children }: { children: ReactNode }) {
  return ${o} className="mobile-card-actions">{children}${c}
}

export function MobileEmptyState({ icon: Icon, children }: { icon: React.ElementType; children: ReactNode }) {
  return (
    ${o} className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-400">
      <Icon className="size-10 text-slate-300" aria-hidden />
      {children}
    ${c}
  )
}
`

fs.writeFileSync('src/components/layout/ListPageLayout.tsx', src)
console.log('ok')
