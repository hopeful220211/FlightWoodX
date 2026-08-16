const mongoose = require('mongoose')

// 积木编程器产物。对齐 @fwx/shared 的 Program 类型（RFC-011 §2.4）。
// 同时存 Blockly 原始 XML 与编译后的指令协议 IR（commandProgram）。
// commandProgram 用 Mixed 落地，其结构由 @fwx/shared 的 CommandProgramSchema 校验。
const ProgramSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    blocklyXml: { type: String, required: true },
    commandProgram: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Program', ProgramSchema)
