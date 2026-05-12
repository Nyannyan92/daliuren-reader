import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#1a1410',
        'bg-card': '#241b14',
        primary: {
          DEFAULT: '#c8a96a',
          light: '#e0c084',
          muted: '#3d2f1f',
        },
        accent: '#b03a3a',
        ink: {
          DEFAULT: '#f5ead4',
          secondary: '#d4c5a3',
          muted: '#8a7a5e',
        },
        border: '#3d2f1f',
        success: '#7da55a',
        warning: '#d4a14a',
        danger: '#c45a5a',
      },
      fontFamily: {
        sans: [
          'Noto Sans SC',
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        serif: [
          'Noto Serif SC',
          'Songti SC',
          'SimSun',
          'serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
