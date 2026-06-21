/**
 * seed-community-demo.js — 往社区播种一批正式示例作品（RFC-017 P2 演示数据）。
 *
 * 目标：让社区「铺满、看起来是活的」——多位小创作者、~28 件作品（复用 6 张真作品图）、
 * 点赞分级（热门榜有真实排序）、收藏 / 评论 / 关注俱全。新用户进来也不空。
 *
 * 幂等：可重复执行，按 email / (owner,name) / (author,project) / 唯一索引去重，不会重复插入。
 * 可识别：示例账号统一 @flightwoodx.local 邮箱 + profile.displayName='示例账号'，便于事后清理。
 * 本脚本不删任何数据。
 *
 * 运行：cd apps/api && node scripts/seed-community-demo.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../src/models/User')
const Project = require('../src/models/Project')
const CommunityPost = require('../src/models/CommunityPost')
const Reaction = require('../src/models/Reaction')
const Comment = require('../src/models/Comment')
const Follow = require('../src/models/Follow')

const IMG = (n) => `/resource/picture/student_works/work0${n}.png` // 1..6

// 8 位小创作者
const AUTHORS = [
  { key: 'lin', email: 'demo-lin@flightwoodx.local', username: '林一帆' },
  { key: 'su', email: 'demo-su@flightwoodx.local', username: '苏小航' },
  { key: 'wang', email: 'demo-wang@flightwoodx.local', username: '王梓豪' },
  { key: 'chen', email: 'demo-chen@flightwoodx.local', username: '陈思齐' },
  { key: 'zhao', email: 'demo-zhao@flightwoodx.local', username: '赵欣怡' },
  { key: 'zhou', email: 'demo-zhou@flightwoodx.local', username: '周天行' },
  { key: 'wu', email: 'demo-wu@flightwoodx.local', username: '吴芮萱' },
  { key: 'he', email: 'demo-he@flightwoodx.local', username: '何思源' },
]

// 28 个标题（带一点创作感）
const TITLES = [
  '环形护翼无人机', '飞燕·展翼四轴', '回字方阵四轴', '蝶舞·镂空花臂', '星环护笼无人机', '双层云梯机架',
  '风隼·竞速四轴', '木鸢·仿生扑翼', '蜂巢护框无人机', '青鸟·轻量竞速', '北斗·稳定平台', '游隼 Mk.2',
  '鲲鹏·载重机架', '萤火·夜航灯架', '蜻蜓·细臂四轴', '麒麟·重装护笼', '云雀·迷你四轴', '玄鸟·对称机身',
  '锦鲤·圆弧护罩', '苍隼·折叠机臂', '银杏·叶脉机臂', '海燕·穿越机', '木棉·花瓣护框', '雨燕·竞速版',
  '朱雀·火焰涂装', '白鹭·长腿落架', '飞鱼·水陆两栖架', '鹊桥·双联机身',
]

const DESCS = [
  '给四个螺旋桨都套上了一圈木质护罩，撞到墙也不会断桨，配重压得很低，飞起来特别稳。',
  '机臂用镂空花纹减轻重量，前后两片大翼像燕子张开翅膀，第一次试飞就成功啦！',
  '四个方形护框把螺旋桨稳稳框住，中间用井字主板，从课桌上掉下来都没坏。',
  '机臂上刻满镂空花纹，又轻又好看，老师说像一件木雕艺术品。',
  '用细木条编了一个五角星形球状护笼，怎么撞都不怕，飞起来像一颗小星星。',
  '上下两层机架，下层放电池配重、上层装电机，重心稳，载重也更大。',
]

const N = 28

const DEMO_PASSWORD = 'fwxdemo123'

// 确定性「随机」（避免 Math.random，保证可复现 + 幂等）
function hash(i, salt) {
  let h = 2166136261 ^ salt
  const s = String(i)
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619)
  return Math.abs(h)
}

async function findOrCreateUser(spec) {
  let user = await User.findOne({ email: spec.email })
  if (user) return user
  user = new User({
    email: spec.email,
    username: spec.username,
    password: DEMO_PASSWORD,
    role: 'student',
    profile: { displayName: '示例账号' },
  })
  await user.save()
  return user
}

async function findOrCreateProject(ownerId, name, coverUrl) {
  let proj = await Project.findOne({ ownerId, name })
  if (!proj) {
    proj = await Project.create({ ownerId, name, coverUrl, visibility: 'public' })
  } else if (proj.coverUrl !== coverUrl || proj.visibility !== 'public') {
    proj.coverUrl = coverUrl
    proj.visibility = 'public'
    await proj.save()
  }
  return proj
}

async function findOrCreatePost(authorId, projectId, title, description) {
  let post = await CommunityPost.findOne({ authorId, projectId })
  if (!post) post = await CommunityPost.create({ authorId, projectId, title, description })
  return post
}

async function upsertReaction(userId, postId, type) {
  await Reaction.updateOne(
    { userId, targetType: 'communityPost', targetId: postId, type },
    { $setOnInsert: { userId, targetType: 'communityPost', targetId: postId, type } },
    { upsert: true },
  )
}

;(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected. Seeding ~28 community works (idempotent)...\n')

  const users = {}
  for (const a of AUTHORS) users[a.key] = await findOrCreateUser(a)
  const keys = AUTHORS.map((a) => a.key)

  const posts = []
  for (let i = 0; i < N; i++) {
    const authorKey = keys[i % keys.length]
    const author = users[authorKey]
    const cover = IMG((i % 6) + 1)
    const title = TITLES[i % TITLES.length]
    const desc = DESCS[i % DESCS.length]
    const proj = await findOrCreateProject(author._id, title, cover)
    const post = await findOrCreatePost(author._id, proj._id, title, desc)
    posts.push({ post, authorKey })

    // 点赞分级：0..13，确定性分布（造出热门榜排序差异）
    const likeTarget = hash(i, 7) % 14
    const favTarget = hash(i, 13) % 5
    const likers = keys.filter((k) => k !== authorKey)
    for (let j = 0; j < likeTarget && j < likers.length * 2; j++) {
      const liker = likers[(hash(i, 17) + j) % likers.length]
      if (liker !== authorKey) await upsertReaction(users[liker]._id, post._id, 'like')
    }
    for (let j = 0; j < favTarget && j < likers.length; j++) {
      const faver = likers[(hash(i, 23) + j) % likers.length]
      if (faver !== authorKey) await upsertReaction(users[faver]._id, post._id, 'favorite')
    }
  }
  console.log(`✓ ${posts.length} works seeded`)

  // 关注：每位创作者关注后面 2 位（环形），造出关注网络
  let fCount = 0
  for (let i = 0; i < keys.length; i++) {
    for (const d of [1, 2]) {
      const f = users[keys[i]]._id
      const t = users[keys[(i + d) % keys.length]]._id
      const r = await Follow.updateOne(
        { followerId: f, followeeId: t },
        { $setOnInsert: { followerId: f, followeeId: t } },
        { upsert: true },
      )
      if (r.upsertedCount) fCount++
    }
  }
  console.log(`✓ follows ensured (+${fCount} new)`)

  // 评论：给前 8 件作品各 1-2 条
  const SAMPLE_COMMENTS = [
    '这个设计太聪明了，撞墙也不怕！', '造型好优雅，我也想试试。', '镂空花纹是怎么刻的呀？',
    '十字主板这个思路我学到了，谢谢分享！', '配重压得真低，难怪这么稳。', '像科幻片里的飞行器！',
  ]
  let cCount = 0
  for (let i = 0; i < 8 && i < posts.length; i++) {
    const target = posts[i].post
    const commenter = keys[(i + 3) % keys.length]
    if (commenter === posts[i].authorKey) continue
    const body = SAMPLE_COMMENTS[i % SAMPLE_COMMENTS.length]
    const exists = await Comment.findOne({ authorId: users[commenter]._id, targetId: target._id, body })
    if (!exists) {
      await Comment.create({
        targetType: 'communityPost', targetId: target._id,
        authorId: users[commenter]._id, body, moderation: 'approved',
      })
      cCount++
    }
  }
  console.log(`✓ ${cCount} new comments`)

  await mongoose.disconnect()
  console.log('\nDone. 打开 /community 看铺满的作品墙。')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
