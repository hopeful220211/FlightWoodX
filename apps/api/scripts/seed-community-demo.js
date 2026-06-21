/**
 * seed-community-demo.js — 往社区放 2 条示例作品（RFC-017 P0 演示数据）。
 *
 * 用途：让负责人打开社区页面能直接走「列表 → 详情 → 点赞」，不必先自己发布。
 * 幂等：可重复执行，按 email / (owner,name) / (author,project) 去重，不会重复插入。
 * 可识别：示例账号统一用 @flightwoodx.local 邮箱 + profile.displayName='示例账号'，
 *         便于事后一键清理（清理需军师拍板，本脚本不删任何数据）。
 *
 * 运行：cd apps/api && node scripts/seed-community-demo.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../src/models/User')
const Project = require('../src/models/Project')
const CommunityPost = require('../src/models/CommunityPost')

// 真作品截图取自 apps/web/public（前端按根路径直接服务，URL 用相对路径即可跨端口生效）
const DEMO = [
  {
    email: 'demo-lin@flightwoodx.local',
    username: '林一帆',
    projectName: '环形护翼无人机',
    coverUrl: '/resource/picture/student_works/work01.png',
    title: '环形护翼无人机',
    description:
      '给四个螺旋桨都套上了一圈木质护罩，这样撞到墙也不会断桨。机身用十字主板对称拼接，配重压得很低，飞起来特别稳。',
  },
  {
    email: 'demo-su@flightwoodx.local',
    username: '苏小航',
    projectName: '飞燕·展翼四轴',
    coverUrl: '/resource/picture/student_works/work03.png',
    title: '飞燕·展翼四轴',
    description:
      '想做一架像燕子一样张开翅膀的无人机，机臂用镂空花纹减轻重量，前后两片大翼是用半体护罩拼出来的。第一次试飞就成功啦！',
  },
]

const DEMO_PASSWORD = 'fwxdemo123'

async function findOrCreateUser(spec) {
  let user = await User.findOne({ email: spec.email })
  if (user) return user
  user = new User({
    email: spec.email,
    username: spec.username,
    password: DEMO_PASSWORD, // 经 pre-save 钩子加密
    role: 'student',
    profile: { displayName: '示例账号' },
  })
  await user.save()
  return user
}

async function findOrCreateProject(ownerId, spec) {
  let proj = await Project.findOne({ ownerId, name: spec.projectName })
  if (!proj) {
    proj = await Project.create({
      ownerId,
      name: spec.projectName,
      coverUrl: spec.coverUrl,
      visibility: 'public',
    })
  } else if (proj.coverUrl !== spec.coverUrl || proj.visibility !== 'public') {
    proj.coverUrl = spec.coverUrl
    proj.visibility = 'public'
    await proj.save()
  }
  return proj
}

async function findOrCreatePost(authorId, projectId, spec) {
  // 唯一索引 (authorId, projectId) 兜底，find-or-create 防并发重复
  let post = await CommunityPost.findOne({ authorId, projectId })
  if (!post) {
    post = await CommunityPost.create({
      authorId,
      projectId,
      title: spec.title,
      description: spec.description,
    })
  }
  return post
}

;(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected. Seeding 2 demo community posts (idempotent)...\n')
  for (const spec of DEMO) {
    const user = await findOrCreateUser(spec)
    const proj = await findOrCreateProject(user._id, spec)
    const post = await findOrCreatePost(user._id, proj._id, spec)
    console.log(`✓ ${spec.username} → 《${spec.title}》`)
    console.log(`  post id: ${post._id}`)
    console.log(`  详情页:  /community/${post._id}\n`)
  }
  await mongoose.disconnect()
  console.log('Done. 打开 /community 即可看到这 2 条作品。')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
