export interface FeaturedWork {
  id: string
  name: string
  authorName: string
  createdAt: string
  likes: number
  thumbnailUrl: string
  description: string
}

const cover = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#93c5fd"/></linearGradient></defs><rect width="100%" height="100%" rx="24" fill="url(#g)"/><circle cx="110" cy="120" r="46" fill="#1d4ed8" opacity=".15"/><circle cx="470" cy="270" r="70" fill="#1d4ed8" opacity=".10"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Noto Sans SC" font-size="26" fill="#1e3a8a">${label}</text></svg>`,
  )}`

export const featuredWorks: FeaturedWork[] = [
  {
    id: 'fw_01',
    name: '竹影一号',
    authorName: '小林',
    createdAt: '2026-01-05',
    likes: 128,
    thumbnailUrl: cover('竹影一号'),
    description: '轻量机身 + 加大机翼，稳定起飞。',
  },
  {
    id: 'fw_02',
    name: '榫卯飞翼',
    authorName: '小陈',
    createdAt: '2026-01-08',
    likes: 96,
    thumbnailUrl: cover('榫卯飞翼'),
    description: '模块化机翼组装，便于快速调整。',
  },
  {
    id: 'fw_03',
    name: '木工小队·探索者',
    authorName: '小周',
    createdAt: '2026-01-10',
    likes: 152,
    thumbnailUrl: cover('探索者'),
    description: '连接件加固，抗扭表现更好（模拟）。',
  },
  {
    id: 'fw_04',
    name: 'AirWood Mini',
    authorName: '小汪',
    createdAt: '2026-01-12',
    likes: 81,
    thumbnailUrl: cover('AirWood Mini'),
    description: '更紧凑的布局，适合室内展示。',
  },
  {
    id: 'fw_05',
    name: 'TechWing',
    authorName: '小赵',
    createdAt: '2026-01-14',
    likes: 110,
    thumbnailUrl: cover('TechWing'),
    description: '轻量机翼 + 尾翼加固片，稳中求快。',
  },
  {
    id: 'fw_06',
    name: '榫卯小火箭',
    authorName: '小宋',
    createdAt: '2026-01-16',
    likes: 73,
    thumbnailUrl: cover('小火箭'),
    description: '推重比占位评估优秀（模拟）。',
  },
]

