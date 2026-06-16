/**
 * FlightWoodX 自定义无人机积木块定义。
 *
 * 每个积木对应 @fwx/shared CommandProtocol 中的一个 Command type。
 * 分为四组：
 *   1. 行为积木（takeoff / land / move / rotate / hover / led）
 *   2. 传感器积木（sensor_value — 产出 Condition 的一半）
 *   3. 逻辑积木（waitUntil / lockAxis / ifElse）
 *   4. 循环积木（repeat / while）
 */
import * as Blockly from 'blockly'

// ===== 颜色 =====
const COLOR_ACTION = '#4AA3F0'   // sky-400
const COLOR_SENSOR = '#3EB489'   // accent-leaf
const COLOR_LOGIC = '#D4A74A'    // accent-gold
const COLOR_LOOP = '#a67038'     // wood-500

// ===== 1. 行为积木 =====

Blockly.Blocks['drone_takeoff'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('起飞到').appendField(new Blockly.FieldNumber(100, 10, 500, 10), 'ALTITUDE').appendField('厘米')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('无人机起飞到指定高度')
  },
}

Blockly.Blocks['drone_land'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('降落')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('无人机降落')
  },
}

Blockly.Blocks['drone_move'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('移动')
      .appendField(new Blockly.FieldDropdown([
        ['前', 'forward'], ['后', 'back'], ['左', 'left'],
        ['右', 'right'], ['上', 'up'], ['下', 'down'],
      ]), 'DIRECTION')
      .appendField(new Blockly.FieldNumber(50, 1, 1000, 1), 'DISTANCE')
      .appendField('厘米')
    this.appendDummyInput().appendField('速度').appendField(new Blockly.FieldNumber(30, 1, 200, 1), 'SPEED').appendField('cm/s')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('向指定方向移动指定距离')
  },
}

Blockly.Blocks['drone_rotate'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('旋转').appendField(new Blockly.FieldNumber(90, -360, 360, 1), 'DEGREES').appendField('度')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('正数=顺时针，负数=逆时针')
  },
}

Blockly.Blocks['drone_hover'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('悬停').appendField(new Blockly.FieldNumber(1000, 100, 30000, 100), 'DURATION').appendField('毫秒')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('在当前位置悬停指定时间')
  },
}

Blockly.Blocks['drone_led'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('LED 灯')
      .appendField('R').appendField(new Blockly.FieldNumber(0, 0, 255, 1), 'R')
      .appendField('G').appendField(new Blockly.FieldNumber(0, 0, 255, 1), 'G')
      .appendField('B').appendField(new Blockly.FieldNumber(0, 0, 255, 1), 'B')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_ACTION)
    this.setTooltip('设置 LED 颜色 (RGB 0-255)')
  },
}

// ===== 2. 传感器 / 条件积木 =====

Blockly.Blocks['drone_condition'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['前方距离(cm)', 'frontDistanceCm'],
        ['下方距离(cm)', 'downDistanceCm'],
        ['电池(%)', 'battery'],
      ]), 'SENSOR')
      .appendField(new Blockly.FieldDropdown([['<', '<'], ['>', '>'], ['==', '==']], undefined), 'OP')
      .appendField(new Blockly.FieldNumber(30, 0, 10000, 1), 'VALUE')
    this.setOutput(true, 'Condition')
    this.setColour(COLOR_SENSOR)
    this.setTooltip('传感器条件（用于 等待直到 / 如果 / 当…循环）')
  },
}

// ===== 3. 逻辑积木 =====

Blockly.Blocks['drone_wait_until'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Condition').appendField('等待直到')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_LOGIC)
    this.setTooltip('暂停执行直到条件满足')
  },
}

Blockly.Blocks['drone_lock_axis'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('锁定轴')
      .appendField(new Blockly.FieldCheckbox('TRUE'), 'FORWARD').appendField('前后')
      .appendField(new Blockly.FieldCheckbox('FALSE'), 'LATERAL').appendField('左右')
      .appendField(new Blockly.FieldCheckbox('FALSE'), 'VERTICAL').appendField('上下')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_LOGIC)
    this.setTooltip('锁定指定运动轴（避障时锁定前后，只能左右移动）')
  },
}

Blockly.Blocks['drone_if_else'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Condition').appendField('如果')
    this.appendStatementInput('THEN').appendField('那么')
    this.appendStatementInput('ELSE').appendField('否则')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_LOGIC)
    this.setTooltip('如果条件成立执行"那么"，否则执行"否则"')
  },
}

// ===== 4. 循环积木 =====

Blockly.Blocks['drone_repeat'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('重复').appendField(new Blockly.FieldNumber(4, 1, 100, 1), 'TIMES').appendField('次')
    this.appendStatementInput('BODY').appendField('执行')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_LOOP)
    this.setTooltip('重复执行指定次数')
  },
}

Blockly.Blocks['drone_while'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Condition').appendField('当')
    this.appendStatementInput('BODY').appendField('循环执行')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(COLOR_LOOP)
    this.setTooltip('当条件满足时一直循环')
  },
}

// ===== 5. 开始（程序锚点 / hat 块） =====

Blockly.Blocks['drone_start'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('▶ 开始')
    // 只有 next、没有 previous → 是个顶部圆帽，只能当链首，不能被塞进别处
    this.setNextStatement(true, null)
    this.setStyle('start_blocks') // hat:'cap' + 颜色来自 DRONE_THEME
    this.setTooltip('程序从这里开始')
  },
}

// 注：工具箱（JSON）与主题已迁到 blockly/blocklyTheme.ts
