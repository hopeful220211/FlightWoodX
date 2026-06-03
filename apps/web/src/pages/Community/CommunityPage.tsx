import { useNavigate } from 'react-router-dom'
import { Heart, GitFork, Eye, Search } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'

const samplePosts = [
  { id: '1', title: '森林守望者 — 四轴避障飞行', author: '小明', likes: 42, forks: 8, img: '/resource/picture/student_works/work01.png' },
  { id: '2', title: '天际穿梭号 — 竞速赛道版', author: '小红', likes: 37, forks: 5, img: '/resource/picture/student_works/work02.png' },
  { id: '3', title: '竹蜻蜓 X — 极简三轴', author: '小华', likes: 25, forks: 12, img: '/resource/picture/student_works/work03.png' },
  { id: '4', title: '木鸢一号 — 仿古造型', author: '小李', likes: 19, forks: 3, img: '/resource/picture/student_works/work04.png' },
  { id: '5', title: '云雀探索者 — 传感器达人', author: '小张', likes: 31, forks: 7, img: '/resource/picture/student_works/work05.png' },
  { id: '6', title: '星辰号 — LED 灯光秀', author: '小王', likes: 22, forks: 4, img: '/resource/picture/student_works/work06.png' },
]

export function CommunityPage() {
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="社区作品库"
        description="浏览、点赞、Fork 其他创作者的无人机作品"
      />

      {/* Search */}
      <div className="max-w-md">
        <Input placeholder="搜索作品..." className="pl-10" />
      </div>

      {/* Posts grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {samplePosts.map((post) => (
          <Card
            key={post.id}
            className="cursor-pointer overflow-hidden"
            onClick={() => nav(`/community/${post.id}`)}
          >
            <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-sky-50 -mx-4 -mt-4 mb-4">
              <img
                src={post.img}
                alt={post.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <h3 className="font-semibold text-ink-900 truncate">{post.title}</h3>
            <p className="text-sm text-ink-400 mt-0.5">{post.author}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1"><Heart size={12} />{post.likes}</span>
              <span className="inline-flex items-center gap-1"><GitFork size={12} />{post.forks}</span>
              <span className="inline-flex items-center gap-1"><Eye size={12} />查看</span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
