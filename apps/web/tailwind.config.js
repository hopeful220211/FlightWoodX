/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── 天蓝主色系（PPT 色调提取：天空蓝底 + 云白过渡） ── */
        sky: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dbfe',
          300: '#7cbffd',
          400: '#4aa3f0',
          500: '#2b88db',   // 主品牌蓝
          600: '#1c6cba',
          700: '#175798',
          800: '#174a7e',
          900: '#193e69',
          950: '#112845',
        },
        /* ── 木色辅助系（保留原 wood，微调使其更暖与天蓝互补） ── */
        wood: {
          50: '#faf6f0',
          100: '#f0e6d6',
          200: '#e0ccb0',
          300: '#cba87a',
          400: '#b8864f',
          500: '#a67038',
          600: '#8a5a2e',
          700: '#6e4626',
          800: '#5a3a22',
          900: '#4a3020',
        },
        /* ── ink / paper 保持不变（中性灰与暖白纸） ── */
        ink: {
          950: '#0f0f0f',
          900: '#1A1A1A',
          800: '#2B2B2B',
          700: '#3D3D3D',
          600: '#5C5C5C',
          500: '#737373',
          400: '#8A8A8A',
          300: '#B0B0B0',
          200: '#D4D4D4',
          100: '#ECECEC',
        },
        paper: {
          50: '#FAF8F4',
          100: '#F3EFE8',
          200: '#E8E2D8',
        },
        /* ── 语义色 ── */
        accent: {
          sky: '#4AA3F0',     // 与 sky-400 同步
          leaf: '#3EB489',
          gold: '#D4A74A',
          spark: '#1E9BFF',   // RFC-020：唯一高饱和点睛蓝（<5% 面积，仅按钮/编号/关键数字/关键词）
        },
        /* ── RFC-020：浅色交替区块面（不上深色） ── */
        surface: {
          white: '#F5F9FF',
          ice: '#EAF2FB',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['MiSans', 'system-ui', 'sans-serif'],
        display: ['"DingTalk JinBuTi"', 'MiSans', 'system-ui', 'sans-serif'],
        /* ── RFC-020：英文/数字展示字体（标题、大数据），中文正文仍走 sans ── */
        grotesk: ['MiSans', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      /* ── RFC-020：流体字号令牌（映射 index.css 的 CSS 变量，便于 text-hero 等直接用） ── */
      fontSize: {
        hero: ['var(--fs-hero)', { lineHeight: '1', letterSpacing: '-0.3px' }],
        h2: ['var(--fs-h2)', { lineHeight: '1.05' }],
        h3: ['var(--fs-h3)', { lineHeight: '1.1' }],
        'title-sm': ['var(--fs-title-sm)', { lineHeight: '1.2' }],
        body: ['var(--fs-body)', { lineHeight: '1.5' }],
        label: ['var(--fs-label)', { lineHeight: '1', letterSpacing: '1.2px' }],
        stat: ['var(--fs-stat)', { lineHeight: '1' }],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,.06)',
        lift: '0 14px 40px rgba(0,0,0,.12)',
        'sky-glow': '0 8px 30px rgba(42,136,219,.18)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        /* ── RFC-020：胶囊/卡片/标签圆角 ── */
        pill: '40px',
        card: '20px',
        tag: '10px',
      },
      backgroundImage: {
        'sky-gradient': 'linear-gradient(180deg, #e0efff 0%, #f0f7ff 50%, #ffffff 100%)',
        'sky-hero': 'linear-gradient(180deg, #5ca8f5 0%, #7cbffd 22%, #a7d2fc 48%, #cfe6fe 74%, #eef6ff 100%)',
        'wood-warm': 'linear-gradient(135deg, #faf6f0 0%, #f0e6d6 100%)',
      },
    },
  },
  plugins: [],
}
