import type { NavigationItem, WorkspacePage } from './types';

export const PAGE_COPY: Record<WorkspacePage, [string, string]> = {
  photos: ['时间线', '按月份和日期浏览图库，支持虚拟滚动、多选和批量整理。'],
  recent: ['最近添加', '按添加时间倒序查看新导入文件，快速完成整理和分享。'],
  albums: ['相册', '创建、编辑、分享相册，并管理自动相册规则。'],
  folders: ['文件夹', '按真实目录浏览、上传、设置封面和移动整理文件。'],
  people: ['人物', '查看人物头像墙，合并、拆分和隐藏识别结果。'],
  search: ['搜索', '关键词、OCR、EXIF、标签和语义搜索统一入口。'],
  tags: ['标签', '查看全部标签，支持隐藏空标签和批量写入 EXIF。'],
  map: ['地图', '按城市、区县和街道浏览带 GPS 的照片。'],
  upload: ['上传中心', '多文件队列、分块上传、失败重试和扫描反馈。'],
  share: ['分享管理', '管理我创建的分享和别人分享给我的内容。'],
  trash: ['回收站', '恢复文件，或对高风险永久删除进行二次确认。'],
  hidden: ['隐私相册', '验证后浏览隐藏文件，并支持移入或取消隐藏。'],
  admin: ['管理中心', '仅管理员可见，用于图库、用户、任务和系统维护。'],
  settings: ['设置', '服务端、缓存、主题、安全和快捷键配置。'],
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { page: 'photos', icon: '▦', label: '时间线' },
  { page: 'recent', icon: '◷', label: '最近添加' },
  { page: 'albums', icon: '▣', label: '相册' },
  { page: 'folders', icon: '▤', label: '文件夹' },
  { page: 'people', icon: '◎', label: '人物' },
  { page: 'map', icon: '⌖', label: '地图' },
  { page: 'search', icon: '⌕', label: '搜索' },
  { page: 'tags', icon: '#', label: '标签' },
  { page: 'upload', icon: '⇧', label: '上传中心' },
  { page: 'share', icon: '⤴', label: '分享管理' },
  { page: 'trash', icon: '⌫', label: '回收站' },
  { page: 'hidden', icon: '◒', label: '隐私相册' },
  { page: 'admin', icon: '⚙', label: '管理中心', adminOnly: true },
  { page: 'settings', icon: '◌', label: '设置' },
];
