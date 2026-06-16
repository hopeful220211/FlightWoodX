import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-sky-900 lg:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-base text-sky-700">{description}</p>}
      </div>
      {actions && <div className="mt-3 flex items-center gap-3 sm:mt-0">{actions}</div>}
    </div>
  )
}
