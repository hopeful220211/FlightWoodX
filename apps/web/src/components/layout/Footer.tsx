import { NavLink } from 'react-router'

const productLinks = [
  { label: '设计工作台', to: '/design' },
  { label: '社区作品', to: '/community' },
]

const companyLinks = [
  { label: '关于我们', to: '#' },
  { label: '联系我们', to: '#' },
  { label: '加入我们', to: '#' },
]

export function Footer() {
  return (
    <footer className="bg-sky-950 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-white">FlightWoodX</h3>
            <p className="mt-2 text-sm text-sky-300/70 leading-relaxed">
              动手造，会飞的。<br/>
              设计 · 搭建 · 分享
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-sky-200 mb-3">产品</h4>
            <ul className="space-y-2">
              {productLinks.map(link => (
                <li key={link.label}>
                  <NavLink to={link.to} className="text-sm text-sky-400/70 hover:text-white transition-colors">
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-sky-200 mb-3">公司</h4>
            <ul className="space-y-2">
              {companyLinks.map(link => (
                <li key={link.label}>
                  <a href={link.to} className="text-sm text-sky-400/70 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-sky-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-sky-400/60">
            © 2026 芬奇答奥（重庆）科技有限公司
          </p>
          <p className="text-sm text-sky-400/60">
            ICP 备案号（待备案）
          </p>
        </div>
      </div>
    </footer>
  )
}
