/**
 * seed-community-demo.js — 往社区播种一批示例作品（RFC-017 演示数据）。
 *
 * 目标：让社区页面「看起来是活的」——多位小创作者、6 件真作品、点赞/收藏/评论/关注俱全，
 * 热门榜有真实排序差异。便于负责人直接验收浏览/点赞/评论/收藏/关注全流程。
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

const IMG = (n) => `/resource/picture/student_works/${n}`

// 5 位小创作者
const AUTHORS = {
  lin: { email: 'demo-lin@flightwoodx.local', username: '林一帆' },
  su: { email: 'demo-su@flightwoodx.local', username: '苏小航' },
  wang: { email: 'demo-wang@flightwoodx.local', username: '王梓豪' },
  chen: { email: 'demo-chen@flightwoodx.local', username: '陈思齐' },
  zhao: { email: 'demo-zhao@flightwoodx.local', username: '赵欣怡' },
}

// 6 件作品（真实学生作品照片）。likers = 给它点赞的创作者，决定热门排序。
const WORKS = [
  {
    key: 'lin', cover: IMG('work01.png'), title: '环形护翼无人机',
    desc: '给四个螺旋桨都套上了一圈木质护罩，这样撞到墙也不会断桨。机身用十字主板对称拼接，配重压得很低，飞起来特别稳。',
    likers: ['su', 'wang', 'chen'], favers: ['zhao'],
  },
  {
    key: 'su', cover: IMG('work03.png'), title: '飞燕·展翼四轴',
    desc: '想做一架像燕子一样张开翅膀的无人机，机臂用镂空花纹减轻重量，前后两片大翼是用半体护罩拼出来的。第一次试飞就成功啦！',
    likers: ['lin', 'wang', 'chen', 'zhao'], favers: ['lin', 'chen'],
  },
  {
    key: 'wang', cover: IMG('work02.png'), title: '回字方阵四轴',
    desc: '四个方形护框把螺旋桨稳稳框住，像四个小窗户。中间用井字主板，特别结实，从课桌上掉下来都没坏！',
    likers: ['su', 'chen'], favers: [],
  },
  {
    key: 'chen', cover: IMG('work04.png'), title: '蝶舞·镂空花臂',
    desc: '机臂上刻满了镂空花纹，又轻又好看。马蹄形的脚架落地很稳，老师说像一件木雕艺术品。',
    likers: ['lin', 'su', 'zhao'], favers: ['su'],
  },
  {
    key: 'zhao', cover: IMG('work05.png'), title: '星环护笼无人机',
    desc: '用细木条编了一个五角星形的球状护笼，把整架无人机包在里面，怎么撞都不怕，飞起来像一颗会发光的小星星。',
    likers: ['lin', 'su', 'wang', 'chen'], favers: ['lin', 'su', 'wang'],
  },
  {
    key: 'wang', cover: IMG('work06.png'), title: '双层云梯机架',
    desc: '搭了上下两层机架：下面一层放电池配重，上面一层装电机，重心稳，能带的东西也更多。这是我的第二架作品。',
    likers: ['zhao'], favers: [],
  },
]

// 关注关系（follower → followee）
const FOLLOWS = [
  ['su', 'lin'], ['su', 'zhao'], ['lin', 'su'], ['lin', 'zhao'],
  ['wang', 'zhao'], ['chen', 'zhao'], ['chen', 'su'], ['zhao', 'su'],
]

// 评论：[在谁的作品上, 评论者, 内容]
const COMMENTS = [
  ['zhao', 'lin', '这个护笼也太酷了吧，像科幻片里的飞行器！'],
  ['zhao', 'su', '编木条一定很费功夫，做得真精致～'],
  ['su', 'chen', '展翼的造型好优雅，我也想试试做翅膀。'],
  ['lin', 'wang', '十字主板这个思路我学到了，谢谢分享！'],
  ['chen', 'zhao', '镂空花纹太好看了，是怎么刻的呀？'],
]

const DEMO_PASSWORD = 'fwxdemo123'

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
  if (!post) {
    post = await CommunityPost.create({ authorId, projectId, title, description })
  }
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
  console.log('Connected. Seeding rich community demo (idempotent)...\n')

  // 1) 用户
  const users = {}
  for (const [k, spec] of Object.entries(AUTHORS)) users[k] = await findOrCreateUser(spec)

  // 2) 作品 + 项目 + 点赞/收藏
  const postByAuthorKey = {}
  for (const w of WORKS) {
    const author = users[w.key]
    const proj = await findOrCreateProject(author._id, w.title, w.cover)
    const post = await findOrCreatePost(author._id, proj._id, w.title, w.desc)
    if (!postByAuthorKey[w.key]) postByAuthorKey[w.key] = post
    for (const lk of w.likers) await upsertReaction(users[lk]._id, post._id, 'like')
    for (const fv of w.favers) await upsertReaction(users[fv]._id, post._id, 'favorite')
    console.log(`✓ ${w.title} — ${author.username}  (${w.likers.length}👍 ${w.favers.length}⭐)  /community/${post._id}`)
  }

  // 3) 关注
  for (const [f, t] of FOLLOWS) {
    await Follow.updateOne(
      { followerId: users[f]._id, followeeId: users[t]._id },
      { $setOnInsert: { followerId: users[f]._id, followeeId: users[t]._id } },
      { upsert: true },
    )
  }
  console.log(`\n✓ ${FOLLOWS.length} follow edges`)

  // 4) 评论（按 (author,target,body) 去重）
  let cCount = 0
  for (const [onKey, byKey, body] of COMMENTS) {
    const target = postByAuthorKey[onKey]
    if (!target) continue
    const exists = await Comment.findOne({ authorId: users[byKey]._id, targetId: target._id, body })
    if (!exists) {
      await Comment.create({
        targetType: 'communityPost', targetId: target._id,
        authorId: users[byKey]._id, body, moderation: 'approved',
      })
      cCount++
    }
  }
  console.log(`✓ ${cCount} new comments`)

  await mongoose.disconnect()
  console.log('\nDone. 打开 /community 看完整作品墙。')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
