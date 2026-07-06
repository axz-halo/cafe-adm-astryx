import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// astryx 서브패스는 미리 프리번들 — 새 import 추가 시 재최적화로 인한
// 이중 React 인스턴스(Invalid hook call) 재발을 방지한다.
const ASTRYX = [
  'AppShell', 'TopNav', 'SideNav', 'Layout', 'Grid', 'Card', 'Center', 'Stack', 'Text', 'Button', 'IconButton',
  'ButtonGroup', 'Badge', 'StatusDot', 'Divider', 'Icon', 'ProgressBar', 'Collapsible', 'EmptyState', 'MetadataList',
  'List', 'SegmentedControl', 'CheckboxInput', 'Selector', 'ToggleButton', 'PowerSearch', 'Table', 'Resizable',
  'hooks', 'Avatar', 'Thumbnail', 'Token', 'TextInput', 'Pagination', 'Switch', 'AlertDialog', 'Dialog', 'Popover',
  'RadioList', 'Tooltip', 'Toast', 'Banner', 'Timestamp', 'Skeleton', 'Spinner', 'NavIcon', 'Section', 'Link', 'theme', 'Kbd',
].map((c) => `@astryxdesign/core/${c}`)

// https://vite.dev/config/
export default defineConfig({
  base: './', // GitHub Pages 서브경로에서도 자산 경로가 맞도록 상대 경로
  plugins: [react()],
  optimizeDeps: {
    include: [...ASTRYX, '@heroicons/react/24/outline', '@heroicons/react/24/solid', 'lucide-react', 'react', 'react-dom', 'react-dom/client'],
  },
  // 실데이터 연동: /api → proxy_server.py(5871) → cbt2-cafe-popular-api.dev (사내망)
  // 배포본(GitHub Pages)에는 /api가 없어 각 뷰가 목데이터로 폴백한다.
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5871', changeOrigin: true },
      '/img': { target: 'http://localhost:5871', changeOrigin: true }, // 카페 첨부 이미지 중계(핫링크 우회)
    },
  },
})
