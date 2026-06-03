const mongoose = require('mongoose')

// 零件库条目（KitItem）。对齐 @fwx/shared 的 KitItem 类型（RFC-011 §2.4）。
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
