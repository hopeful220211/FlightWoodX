import type { Chapter } from '../types/learning'

export const courses: Chapter[] = [
  {
    id: 'ch_1',
    title: '第一章：认识榫卯',
    order: 1,
    lessons: [
      {
        id: 'l_1_1',
        chapterId: 'ch_1',
        title: '榫卯是什么？',
        order: 1,
        duration: 8,
        content:
          '## 榫卯是什么？\n\n榫卯是一种**不用钉子也能把木头牢牢连接**的结构。\n\n- **榫**：凸出来的部分\n- **卯**：凹进去的孔\n\n> 在无人机结构里，我们也能用类似的方式做模块化拼装。',
      },
      {
        id: 'l_1_2',
        chapterId: 'ch_1',
        title: '常见榫卯结构',
        order: 2,
        duration: 10,
        content:
          '## 常见结构\n\n- 直榫\n- 燕尾榫\n- 穿带榫\n\n思考：哪种结构更适合**抗拉**？哪种更适合**抗扭**？',
      },
      {
        id: 'l_1_3',
        chapterId: 'ch_1',
        title: '连接点与吸附的概念（预备）',
        order: 3,
        duration: 7,
        content:
          '## 连接点\n\n在设计里，我们会给零件设置“连接点”。\n\n- 连接点可以是榫头（tenon）或卯眼（mortise）\n- 未来 3D 模式里可以实现**吸附拼装**（本阶段先预留接口）',
      },
    ],
  },
  {
    id: 'ch_2',
    title: '第二章：无人机原理',
    order: 2,
    lessons: [
      {
        id: 'l_2_1',
        chapterId: 'ch_2',
        title: '什么是升力？',
        order: 1,
        duration: 9,
        content:
          '## 升力\n\n升力来自空气对机翼的作用。\n\n- 速度越快，升力通常越大\n- 角度变化也会影响升力\n\n> 在我们的木质无人机中，机翼形状与安装角度很关键。',
      },
      {
        id: 'l_2_2',
        chapterId: 'ch_2',
        title: '推力与推重比',
        order: 2,
        duration: 8,
        content:
          '## 推力与推重比\n\n推重比 = 总推力 / 总重量\n\n- 推重比越大，越容易起飞\n- 但重量过轻也可能不稳定\n\n本应用会给出一个**占位评估**（后续可升级为更真实的计算）。',
      },
      {
        id: 'l_2_3',
        chapterId: 'ch_2',
        title: '重心与稳定性',
        order: 3,
        duration: 10,
        content:
          '## 重心\n\n重心太靠前：机头容易下沉\n\n重心太靠后：容易失速或翻滚\n\n设计工作台会显示一个**重心占位信息**，帮助你形成概念。',
      },
    ],
  },
  {
    id: 'ch_3',
    title: '第三章：设计基础',
    order: 3,
    lessons: [
      {
        id: 'l_3_1',
        chapterId: 'ch_3',
        title: '从零件库开始',
        order: 1,
        duration: 6,
        content:
          '## 零件库\n\n零件库按类别组织：机身、机翼、尾翼、连接件等。\n\n你可以先从机身开始，再逐步补齐其它部件。',
      },
      {
        id: 'l_3_2',
        chapterId: 'ch_3',
        title: '模块化组装思路',
        order: 2,
        duration: 8,
        content:
          '## 模块化\n\n模块化可以让设计更快、更安全：\n\n- 易于替换\n- 易于测试\n- 易于维护\n\n这也是榫卯结构的优势之一。',
      },
      {
        id: 'l_3_3',
        chapterId: 'ch_3',
        title: '设计检查（概念）',
        order: 3,
        duration: 7,
        content:
          '## 设计检查\n\n本阶段我们先给出“模拟提示”，比如：\n\n- 重心偏移过大\n- 部件缺失\n\n后续可以升级为更严谨的规则系统。',
      },
    ],
  },
  {
    id: 'ch_4',
    title: '第四章：动手制作',
    order: 4,
    lessons: [
      {
        id: 'l_4_1',
        chapterId: 'ch_4',
        title: '木材与工具安全',
        order: 1,
        duration: 12,
        content:
          '## 安全第一\n\n- 在老师或家长指导下使用工具\n- 佩戴护目镜\n- 注意打磨与切割方向',
      },
      {
        id: 'l_4_2',
        chapterId: 'ch_4',
        title: '拼装与校准',
        order: 2,
        duration: 10,
        content:
          '## 拼装\n\n- 先做“干拼装”检查是否契合\n- 再进行固定与校准\n\n榫卯契合度会显著影响稳定性。',
      },
      {
        id: 'l_4_3',
        chapterId: 'ch_4',
        title: '重量控制小技巧',
        order: 3,
        duration: 8,
        content:
          '## 重量控制\n\n- 不必要的位置尽量减重\n- 强度关键位置保留材料\n\n轻，并不等于更好；要平衡强度与重量。',
      },
    ],
  },
  {
    id: 'ch_5',
    title: '第五章：试飞与调试',
    order: 5,
    lessons: [
      {
        id: 'l_5_1',
        chapterId: 'ch_5',
        title: '第一次试飞检查清单',
        order: 1,
        duration: 7,
        content:
          '## 检查清单\n\n- 结构是否牢固\n- 重心是否合理\n- 螺旋桨方向是否正确\n- 场地是否安全',
      },
      {
        id: 'l_5_2',
        chapterId: 'ch_5',
        title: '常见问题排查',
        order: 2,
        duration: 9,
        content:
          '## 排查\n\n- 机身抖动：检查连接是否松动\n- 起飞困难：推重比不足或角度不对\n- 偏航：左右重量或推力不平衡',
      },
      {
        id: 'l_5_3',
        chapterId: 'ch_5',
        title: '优化迭代：让它更稳更快',
        order: 3,
        duration: 10,
        content:
          '## 迭代\n\n每次调整只改一个变量：\n\n- 机翼角度\n- 重心位置\n- 部件重量\n\n记录你的每一次实验结果！',
      },
    ],
  },
]

