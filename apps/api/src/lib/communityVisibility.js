const mongoose = require('mongoose')
const CommunityPost = require('../models/CommunityPost')

// Resolve visibility at read time so withdrawing a design also removes its old
// community post from every listing. Existing posts and reactions are retained.
// Only legacy projects without a design reference may use Project.visibility.
function publicProjectStages(prefix = '') {
  const field = name => `$${prefix ? `${prefix}.` : ''}${name}`
  return [
    { $lookup: { from: 'dronedesigns', localField: `${prefix ? `${prefix}.` : ''}designId`, foreignField: '_id', as: '_visibilityDesign' } },
    { $set: { _visibilityDesign: { $arrayElemAt: ['$_visibilityDesign', 0] } } },
    { $match: { $expr: { $cond: [
        { $ne: [{ $ifNull: [field('designId'), null] }, null] },
        { $and: [
          { $eq: ['$_visibilityDesign.ownerId', field('ownerId')] },
          { $eq: ['$_visibilityDesign.visibility', 'public'] },
        ] },
        { $eq: [field('visibility'), 'public'] },
    ] } } },
    { $unset: '_visibilityDesign' },
  ]
}

function publicPostStages() {
  return [
    { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: '_visibilityProject' } },
    { $unwind: '$_visibilityProject' },
    { $match: { $expr: { $eq: ['$authorId', '$_visibilityProject.ownerId'] } } },
    ...publicProjectStages('_visibilityProject'),
    { $unset: '_visibilityProject' },
  ]
}

async function countPublicPosts(match = {}) {
  const rows = await CommunityPost.aggregate([{ $match: match }, ...publicPostStages(), { $count: 'total' }])
  return rows[0]?.total || 0
}

async function isPublicPost(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return false
  const rows = await CommunityPost.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(id)) } },
    ...publicPostStages(),
    { $limit: 1 },
    { $project: { _id: 1 } },
  ])
  return rows.length > 0
}

module.exports = { publicProjectStages, publicPostStages, countPublicPosts, isPublicPost }
