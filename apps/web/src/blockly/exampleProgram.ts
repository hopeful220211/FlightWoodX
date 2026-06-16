/**
 * 「从示例开始」载入的入门示例程序（Blockly XML）。
 *
 * 一段最简单、孩子一眼能懂的飞行：起飞 → 向前飞 → 亮绿灯 → 降落。
 * 字段名与 blockly/blocks.ts 的积木定义一一对应。
 */
export const EXAMPLE_PROGRAM_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="drone_takeoff" x="40" y="40">
    <field name="ALTITUDE">100</field>
    <next>
      <block type="drone_move">
        <field name="DIRECTION">forward</field>
        <field name="DISTANCE">100</field>
        <field name="SPEED">30</field>
        <next>
          <block type="drone_led">
            <field name="R">0</field>
            <field name="G">255</field>
            <field name="B">0</field>
            <next>
              <block type="drone_land"></block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>
`.trim()
