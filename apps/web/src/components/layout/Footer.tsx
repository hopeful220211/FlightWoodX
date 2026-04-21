import { NavLink } from 'react-router-dom'

const productLinks = [
  { label: '学习中心', to: '/learn' },
  { label: '设计工作台', to: '/design' },
  { label: '作品展示', to: '/gallery' },
]

const resourceLinks = [
  { label: '教师支持', to: '#' },
  { label: '教案下载', to: '#' },
  { label: '常见问题', to: '#' },
]

const companyLinks = [
  { label: '关于我们', to: '#' },
  { label: '联系我们', to: '#' },
  { label: '加入我们', to: '#' },
]

export function Footer() {
  return (
    <footer className="bg-ink-900 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-paper-50">FlightWoodX</h3>
            <p className="mt-2 text-sm text-ink-400 leading-relaxed">
              动手造，会飞的。
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-paper-100 mb-3">产品</h4>
            <ul className="space-y-2">
              {productLinks.map(link => (
                <li key={link.label}>
                  <NavLink to={link.to} className="text-sm text-ink-400 hover:text-paper-50 transition-colors">
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-paper-100 mb-3">资源</h4>
            <ul className="space-y-2">
              {resourceLinks.map(link => (
                <li key={link.label}>
                  <a href={link.to} className="text-sm text-ink-400 hover:text-paper-50 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-paper-100 mb-3">公司</h4>
            <ul className="space-y-2">
              {companyLinks.map(link => (
                <li key={link.label}>
                  <a href={link.to} className="text-sm text-ink-400 hover:text-paper-50 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-400">
            © 2026 芬奇答奥（重庆）科技有限公司
          </p>
          <p className="text-sm text-ink-400">
            ICP 备案号（待备案）
          </p>
        </div>
      </div>
    </footer>
  )
}
