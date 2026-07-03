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
  plugins: [react()],
  optimizeDeps: {
    include: [...ASTRYX, '@heroicons/react/24/outline', '@heroicons/react/24/solid', 'lucide-react', 'react', 'react-dom', 'react-dom/client'],
  },
})
