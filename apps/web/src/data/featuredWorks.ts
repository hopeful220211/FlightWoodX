export interface FeaturedWork {
  id: string
  name: string
  authorName: string
  createdAt: string
  likes: number
  thumbnailUrl: string
  description: string
}

export const featuredWorks: FeaturedWork[] = [
  {
    id: 'fw_01',
    name: '竹影一号',
    authorName: '小林',
    createdAt: '2026-01-05',
    likes: 128,
    thumbnailUrl: '/resource/picture/student_works/work01.png',
    description: '轻量机身 + 加大机翼，稳定起飞。',
  },
  {
    id: 'fw_02',
    name: '榫卯飞翼',
    authorName: '小陈',
    createdAt: '2026-01-08',
    likes: 96,
    thumbnailUrl: '/resource/picture/student_works/work02.png',
    description: '模块化机翼组装，便于快速调整。',
  },
  {
    id: 'fw_03',
    name: '木工小队·探索者',
    authorName: '小周',
    createdAt: '2026-01-10',
    likes: 152,
    thumbnailUrl: '/resource/picture/student_works/work03.png',
    description: '连接件加固，抗扭表现更好（模拟）。',
  },
  {
    id: 'fw_04',
    name: 'AirWood Mini',
    authorName: '小汪',
    createdAt: '2026-01-12',
    likes: 81,
    thumbnailUrl: '/resource/picture/student_works/work04.png',
    description: '更紧凑的布局，适合室内展示。',
  },
  {
    id: 'fw_05',
    name: 'TechWing',
    authorName: '小赵',
    createdAt: '2026-01-14',
    likes: 110,
    thumbnailUrl: '/resource/picture/student_works/work05.png',
    description: '轻量机翼 + 尾翼加固片，稳中求快。',
  },
  {
    id: 'fw_06',
    name: '榫卯小火箭',
    authorName: '小宋',
    createdAt: '2026-01-16',
    likes: 73,
    thumbnailUrl: '/resource/picture/student_works/work06.png',
    description: '推重比占位评估优秀（模拟）。',
  },
]

