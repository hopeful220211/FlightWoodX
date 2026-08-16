const mongoose = require('mongoose')

// 采购物料条目（KitItem）。对齐 @fwx/shared 的 KitItem 类型（RFC-011 §2.4）。
// ⚠️ RFC-016 §2.7 / RFC-019 §4.4：此 Mongo 'Part' 是采购 BOM，**不是拼装零件**，
//    不参与零件库页面浏览；可拼装零件的唯一来源是 @fwx/parts-schema 的 registry。
// 价格以「分」存储（priceCents），避免浮点误差。
const PartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['motor', 'prop', 'flightController', 'sensor', 'wood'],
      required: true,
    },
    spec: { type: String, required: true },
    priceCents: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Part', PartSchema)
