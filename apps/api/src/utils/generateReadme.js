/**
 * Generate README.txt for the export ZIP package.
 */
function generateReadme({ designName, username, date, partList }) {
  return `你好，这里是你设计的飞机的零件文件！

设计名：${designName}
设计者：${username}
设计日期：${date}
零件总数：${partList.length} 个

📋 怎么用这些文件？
1. 把所有 .dxf 文件交给激光切割机操作员
2. 操作员会按图纸切出每一片木头
3. 切完后，你可以照着 FlightWoodX 上的设计，把零件拼起来！

📁 文件清单：
${partList.map(p => `  - ${p.name}.dxf${p.count > 1 ? ` × ${p.count}` : ''}`).join('\n')}

💡 小贴士：
- 多个相同零件文件名末尾的 _001、_002 是序号，方便区分
- 如果有零件丢失或损坏，可以联系老师重新切一份
- 切割完成后，记得在 FlightWoodX 上分享你的飞机！

—— FlightWoodX 团队
`
}

module.exports = { generateReadme }
