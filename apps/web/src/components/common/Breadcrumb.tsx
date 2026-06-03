import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-400">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="shrink-0" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-sky-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-ink-700' : ''}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
