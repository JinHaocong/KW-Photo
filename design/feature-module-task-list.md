# MT Photos Desktop 功能模块任务清单

本文用于把 `MT-Photos-Desktop-PRD.md`、`design/mt-photos-desktop-prototype.html`、`design/api-ui-coverage-matrix.md`、现有适配站点和 style-vault 规格收敛成后续前端项目可执行的功能模块 list。

## 输入基线

- 本地 PRD：`MT-Photos-Desktop-PRD.md`，包含桌面端产品范围、信息架构、MVP/增强/管理员能力。
- 本地 UI 设计稿：`design/mt-photos-desktop-prototype.html`，已定义 Sage 风格的照片工作台、详情面板、上传抽屉、分享弹窗、管理浮层等核心体验。
- 本地接口覆盖矩阵：`design/api-ui-coverage-matrix.md`，以 PRD 9/10 章 209 个唯一接口为主线标注页面覆盖程度。
- 现有适配网站：[https://d.mtmt.tech/folders](https://d.mtmt.tech/folders)，作为功能参照，不作为视觉照搬对象。
- OpenAPI 文档：[https://demo.mtmt.tech/api-json](https://demo.mtmt.tech/api-json)，接口规模为 371 path / 418 operation。
- 当前工程：`React 19 + TypeScript + Vite + Tailwind v4 + Ant Design 6 + Electron + Expo`，目标覆盖 Web、macOS、Windows、iOS。

## 设计取向

- 视觉系统采用 Sage Multi-Theme Data Platform：左侧工作台导航、细灰阶层次、用户可切换主题色、Inter 字体、AntD 重型组件、Tailwind 轻量结构。
- 现网 `/folders` 的左侧导航、文件夹卡片、封面预览、数量 badge、刷新/上传/列表/置顶等动作作为功能参照；新客户端需要重构为更适合桌面批量整理的工作台，而不是复制现网的布局和绿色视觉。
- 所有长任务都必须有进度、失败原因、重试或刷新入口，尤其是上传、扫描、转码、批量移动、永久删除、索引重建。
- 所有可选能力必须先探测再展示，包括 CLIP、地图 token、人脸、OCR、授权、管理员权限、隐私相册口令。
- 首期实现优先闭环：连接登录、Shell、文件夹、照片墙、预览详情、上传下载、分享删除。

## 里程碑拆分

| 阶段 | 目标 | 主要模块 |
| --- | --- | --- |
| P0 | 工程与跨端底座 | 路由、状态、API Client、Electron 能力、主题系统、错误处理 |
| P1 | 连接与登录闭环 | 服务端配置、登录、token 刷新、用户权限 |
| P2 | 工作台骨架 | AppShell、导航、图库切换、命令面板、全局搜索入口 |
| P3 | 文件夹优先版本 | 根文件夹、子文件夹、文件夹照片墙、上传到文件夹、整理任务 |
| P4 | 照片浏览与预览 | 时间线、最近添加、照片墙、详情、图片/视频/Live Photo 预览 |
| P5 | 整理闭环 | 相册、标签、批量操作、删除/回收站、下载 |
| P6 | 分享与上传增强 | 分享管理、分享链接上传、分块上传、下载中心 |
| P7 | 智能浏览 | 搜索、CLIP、人物、地图、相似照片、隐私相册 |
| P8 | 管理中心 | 图库、用户、API Key、任务、系统配置、日志、授权 |
| P9 | 质量与发布 | 性能、缓存、安全、测试、打包、跨端适配 |

## P0 工程与跨端底座

### 目标

建立一套能同时服务 Web、macOS、Windows、iOS 的前端基础设施，让后续模块只关心业务，不重复处理请求、鉴权、主题、错误和跨端差异。

### 主要页面/组件

- `AppProvider`：全局注入主题、用户、服务端配置、运行平台。
- `ApiClient`：统一 baseUrl、token、refresh、错误码、下载流。
- `RouteRegistry`：主导航、子路由、管理员路由、分享公开路由。
- `TaskCenter`：长任务通知、后台任务状态、失败重试。
- `PlatformBridge`：Electron 桌面文件选择、保存、通知能力，以及移动端 Expo 能力适配。

### 接口

- 通用鉴权与用户接口：`GET /api-info`、`POST /auth/rsa`、`POST /auth/login`、`POST /auth/refresh`、`GET /gateway/userInfo`。
- 所有模块共享缩略图/文件接口：`GET /gateway/{type}/{md5}`、`GET /gateway/file/{id}/{md5}`、`GET /gateway/fileDownload/{id}/{md5}`。

### 任务清单

- [ ] 定义 `ApiEnvelope<T>`、分页模型、错误模型、长任务模型。
- [ ] 封装 `request<T>()`，支持 token 注入、401 refresh、重试、取消请求。
- [ ] 建立接口模块边界：`auth`、`gallery`、`files`、`folders`、`albums`、`tags`、`shares`、`admin`、`system`。
- [ ] 建立运行平台检测：Web / macOS / Windows / iOS。
- [ ] 统一图片 URL 生成器，避免组件直接拼 `/gateway/s260/{md5}`。
- [ ] 统一下载处理：Web 用浏览器下载，Electron 用保存对话框和文件系统能力。
- [ ] 统一错误提示：业务错误 toast，长任务错误进入任务中心，权限错误落到页面空态。
- [ ] 建立基础测试：API Client refresh、主题切换、路由守卫。

### 验收标准

- `pnpm type-check`、`pnpm build` 通过。
- 未登录访问受保护页面会进入登录页。
- token 过期后能自动 refresh；refresh 失败才回登录。
- Web 和 Electron 环境能复用同一套路由与 UI。

## P1 服务端连接与登录

### 目标

用户首次打开时可以配置服务端地址、检测服务端版本、完成登录，并恢复到上次访问的主工作台。

### 主要页面/组件

- 首次连接页：服务端 URL 输入、检测按钮、版本/兼容性状态。
- 登录页：用户名、密码、记住我、两步验证码入口。
- 会话恢复状态：启动 loading、失败重登、离线提示。
- 用户菜单：用户信息、管理员入口、退出登录。

### 接口

- `GET /api-info`
- `POST /auth/rsa`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /gateway/userInfo`
- `POST /auth/auth_code`

### 任务清单

- [ ] 实现服务端地址配置和本地持久化。
- [ ] 连接前校验 URL 协议、尾斜杠、跨域可用性。
- [ ] 请求 `GET /api-info` 展示服务端版本、API 版本、兼容提示。
- [ ] 登录前请求 RSA 公钥，按服务端要求加密密码。
- [ ] 登录成功后保存 access token、refresh token、过期时间。
- [ ] 识别两步验证：需要验证码时进入验证码输入态。
- [ ] 登录失败区分用户名密码错误、服务端不可达、版本不兼容、验证码错误。
- [ ] 用户信息落入全局 store，包含管理员权限、用户名、头像或首字母。
- [ ] 退出登录清理 token、用户信息、隐私相册临时状态。

### 验收标准

- 首次打开没有服务端地址时必须进入连接页。
- 登录成功后进入照片或上次页面。
- refresh 失败不会卡在空白页。
- 普通用户看不到管理中心入口。

## P2 工作台 Shell 与导航

### 目标

构建应用的长期稳定结构：左侧导航、顶部工具栏、主内容区、右侧详情区、命令面板、主题切换和彩蛋入口。

### 主要页面/组件

- `AppShell`
- `SidebarNavigation`
- `TopToolbar`
- `ThemeSwitcher`
- `GallerySwitcher`
- `CommandPalette`
- `RightInspector`
- `RevolverFab`

### 参考现网

现网 `/folders` 左侧有主导航、照片库、管理分组；顶部有全局搜索、以文搜图、筛选、用户菜单。新版本保留这些信息结构，但按 Sage 风格做成桌面工作台，突出批量整理效率和右侧检查器。

### 接口

- `GET /gateway/userInfo`
- `GET /gateway/myGalleryList`
- `GET /gateway/timeline`
- `POST /gateway/memory`

### 任务清单

- [ ] 建立主导航：照片、最近添加、相册、文件夹、人物、地图、标签、搜索、分享、上传、回收站、隐私相册、设置。
- [ ] 管理员才显示：管理中心、用户管理、图库管理、管理工具、系统配置。
- [ ] 顶部加入图库切换、全局搜索、CLIP 搜索入口、刷新、上传、视图切换。
- [ ] 主题切换支持 12 色，但默认只暴露 4 个常用色，完整颜色放在更多菜单。
- [ ] 命令面板支持页面跳转、常用操作、最近搜索。
- [ ] 右侧详情面板支持单文件、多文件、文件夹、任务四种上下文。
- [ ] 全局快捷键：搜索、命令面板、上传、选择模式、详情开关。
- [ ] 彩蛋 FAB 保留，但不干扰核心照片操作。

### 验收标准

- 导航、工具栏、详情面板在 1280px 宽度下不重叠。
- 主题切换能影响 CTA、选中态、focus ring、进度条。
- 管理员和普通用户的导航权限正确。

## P3 文件夹视图

### 目标

优先完成用户点名的 `/folders` 体验：查看根文件夹、进入子文件夹、浏览文件夹照片、上传到指定文件夹、创建/重命名/设置封面/整理移动，并提供比现网更强的桌面批量管理体验。

### 参考现网

现网 `/folders` 登录后展示：

- 左侧导航：照片、文件夹、探索、分享、收藏夹、相册、回收站、相似照片、隐藏文件、用户管理、图库管理、管理工具、系统配置。
- 顶部搜索：`用一段描述来寻找照片：烟花`，旁边有 `以文搜图`、筛选、用户入口。
- 内容区标题：`全部`。
- 文件夹卡片：如 `lfw`、`demo`，展示封面/多图拼贴和数量 badge。
- 右上动作：刷新、上传、列表视图、置顶。

### 新风格规划

- 左侧沿用 Sage 工作台导航。
- 主区顶部为文件夹路径面包屑、当前文件夹统计、刷新、上传、创建文件夹、整理工具。
- 内容区支持两级视图：文件夹卡片网格 + 当前文件照片墙。
- 右侧检查器展示选中文件夹信息、路径、文件数量、封面、最近扫描状态、整理动作。
- 卡片 hover 出现快捷操作：进入、上传、设为封面、重命名、移动、删除空文件夹。

### 主要页面/组件

- `FoldersPage`
- `FolderCardGrid`
- `FolderBreadcrumb`
- `FolderToolbar`
- `FolderFileWall`
- `FolderInspector`
- `CreateFolderModal`
- `RenameFolderModal`
- `MoveFilesPreviewDrawer`
- `FolderUploadDrawer`

### 接口

- 根与子级：
  - `GET /gateway/folders/root`
  - `GET /gateway/folders/{id}`
  - `GET /gateway/foldersV2/{id}`
  - `GET /gateway/folderBreadcrumbs/{id}`
- 文件夹文件：
  - `GET /gateway/folderFiles/{id}`
  - `GET /gateway/{type}/{md5}`
  - `GET /gateway/file/{id}/{md5}`
- 创建与编辑：
  - `POST /gateway/folders/create`
  - `POST /gateway/folderPathEdit`
  - `PATCH /gateway/setFolderCover/{id}`
  - `POST /gateway/folders/delete_empty`
- 整理移动：
  - `POST /gateway/folder_files_move/preview`
  - `POST /gateway/folder_files_move/move`
  - `POST /gateway/folder_files_move/status`
- 上传到文件夹：
  - `POST /gateway/checkPathForUpload`
  - `POST /gateway/upload`
  - `POST /gateway/uploadV2`
  - `POST /gateway/uploadChunk/check`
  - `POST /gateway/uploadChunk/upload`
  - `POST /gateway/uploadChunk/uploadWeb`
  - `POST /gateway/uploadChunk/uploadBin`
  - `POST /gateway/uploadChunk/merge`
  - `POST /gateway/uploadChunk/mergeStatus`
  - `POST /gateway/scanAfterUpload`

### 任务清单

- [ ] 接入 `GET /gateway/folders/root`，渲染根文件夹网格。
- [ ] 支持进入子文件夹，URL 带 `folderId`，刷新后可恢复。
- [ ] 接入面包屑，支持返回上级和回根目录。
- [ ] 文件夹卡片支持封面图、四宫格 fallback、数量 badge、路径 tooltip。
- [ ] 文件夹卡片支持空态、封面加载失败、权限不足、扫描中状态。
- [ ] 工具栏支持刷新、上传到当前文件夹、创建文件夹、网格/列表切换。
- [ ] 文件夹详情进入照片墙，复用照片卡片、选择态、预览器、右侧详情。
- [ ] 创建文件夹弹窗校验同名、非法路径、权限错误。
- [ ] 重命名/路径编辑弹窗展示影响范围和服务端返回错误。
- [ ] 设置封面支持从当前文件夹照片中选择，成功后更新卡片封面。
- [ ] 删除空文件夹必须二次确认；非空时展示不可删除原因。
- [ ] 文件移动先调用 preview，展示预计移动数量、冲突、跳过项，再执行 move。
- [ ] 移动任务执行后轮询 status，进入任务中心并支持后台运行。
- [ ] 上传抽屉默认绑定当前文件夹路径，上传完成后触发 scan 和列表刷新。
- [ ] 大文件上传走分块，小文件走普通上传；失败项可单独重试。
- [ ] 支持拖拽文件到文件夹卡片或当前文件夹空白区触发上传。
- [ ] 支持文件夹右键菜单或更多菜单：进入、上传、重命名、设封面、整理、删除空文件夹。
- [ ] 右侧检查器展示文件夹路径、数量、封面、最近上传、整理任务、快捷操作。

### 验收标准

- 未登录访问 `/folders` 会跳登录，登录后回到 `/folders`。
- 根文件夹与子文件夹刷新后状态一致。
- 上传到文件夹后能看到上传队列、扫描状态和最终刷新结果。
- 移动整理任务不会阻塞页面，可在任务中心查看进度。
- 文件夹卡片与现网功能等价，但视觉符合 Sage 风格。

## P4 照片时间线、最近添加与照片墙

### 目标

实现大图库浏览主链路：时间线、月份/日期分组、最近添加、照片墙、懒加载、虚拟滚动、选择模式。

### 主要页面/组件

- `PhotosTimelinePage`
- `RecentFilesPage`
- `TimelineMonthRail`
- `PhotoGrid`
- `PhotoCard`
- `SelectionToolbar`
- `VirtualizedMasonry`

### 接口

- `GET /gateway/timeline`
- `GET /gateway/filesInTimelineCount`
- `POST /gateway/timelineMonth`
- `GET /gateway/filesInTimelineV2`
- `POST /gateway/dayFiles`
- `POST /gateway/dayFileMore`
- `GET /gateway/recentFiles`
- `GET /gateway/{type}/{md5}`

### 任务清单

- [ ] 时间线按年/月/日期分组加载。
- [ ] 支持月份栏快速定位。
- [ ] 支持最近添加独立页面。
- [ ] 照片墙支持网格密度切换、缩略图尺寸切换。
- [ ] 缩略图加载失败显示文件类型 fallback。
- [ ] 滚动到底自动加载更多，加载中保持布局稳定。
- [ ] 支持单选、多选、Shift 范围选择、全选当前日期。
- [ ] 选择后显示批量工具栏：相册、标签、下载、分享、删除、隐藏。
- [ ] 照片卡片显示收藏、视频、Live Photo、隐私、已分享等状态角标。

### 验收标准

- 5000 张缩略图滚动不卡顿。
- 加载更多不会重复请求同一分页。
- 选择态跨日期分组准确。

## P5 文件预览与详情编辑

### 目标

用户可以快速预览图片、视频、Live Photo，查看和编辑文件详情、EXIF、OCR、标签、GPS、旋转等信息。

### 主要页面/组件

- `MediaViewer`
- `ImagePreview`
- `VideoPreview`
- `LivePhotoPreview`
- `FileInspector`
- `ExifPanel`
- `OcrPanel`
- `EditFileInfoModal`
- `GpsEditor`

### 接口

- `GET /gateway/file/{id}/{md5}`
- `GET /gateway/{type}/{md5}`
- `GET /gateway/fileDownload/{id}/{md5}`
- `GET /gateway/flv/{id}/{md5}`
- `POST /gateway/transcode`
- `POST /gateway/getTranscodeError`
- `GET /gateway/fileMotion/{id}/{md5}`
- `POST /gateway/livePhotoMovCheck`
- `GET /gateway/fileInfoById/{id}`
- `GET /gateway/fileInfo/{id}/{md5}`
- `GET /gateway/exifInfo/{id}`
- `GET /gateway/fileInfoRT/{id}`
- `GET /gateway/ocrInfo/{id}`
- `POST /gateway/updateFileDate`
- `POST /gateway/updateFileName`
- `POST /gateway/editFileExtra`
- `POST /gateway/editFileGps`
- `POST /gateway/resetFileGps`
- `POST /gateway/editFileRotate`

### 任务清单

- [ ] 双击照片打开预览器，支持上一张/下一张。
- [ ] 图片支持缩放、适应屏幕、原始大小、旋转展示。
- [ ] 视频支持普通播放；不支持格式时触发转码并展示进度。
- [ ] Live Photo 支持动图/静图切换。
- [ ] 详情面板按基本信息、EXIF、OCR、标签、相册、地点分组。
- [ ] 文件名、日期、描述、GPS、旋转提供编辑入口。
- [ ] OCR 为空、EXIF 为空、GPS 不存在时有明确空态。
- [ ] 保存失败时保留用户输入，不关闭弹窗。
- [ ] 权限不足时隐藏编辑按钮，只允许查看。

### 验收标准

- 预览器可以从照片、文件夹、相册、搜索结果、分享详情复用。
- 编辑成功后列表卡片和详情面板同步刷新。
- 视频转码失败能展示服务端错误原因。

## P6 相册

### 目标

实现相册列表、相册详情、创建编辑、删除、加入/移除文件、相册分享和自动相册规则同步。

### 主要页面/组件

- `AlbumsPage`
- `AlbumDetailPage`
- `AlbumFormModal`
- `AddToAlbumModal`
- `AlbumRuleStepper`
- `AlbumSharePanel`

### 接口

- `GET /api-album`
- `POST /api-album`
- `GET /api-album/{id}`
- `PATCH /api-album/{id}`
- `PUT /api-album/{id}`
- `DELETE /api-album/{id}`
- `GET /api-album/filesV2/{id}`
- `GET /api-album/filesFlat/{id}`
- `POST /api-album/addFileToAlbum`
- `POST /api-album/removeFileFromAlbum`
- `GET /api-album/fileInAlbumsList/{id}`
- `GET /api-album/link/{id}`
- `POST /api-album/link/{id}`
- `DELETE /api-album/link/{id}`
- `POST /api-album/linkSyncFiles/{id}`
- `POST /api-album/checkForFavorites`

### 任务清单

- [ ] 相册列表支持普通相册、收藏夹、自动相册分组。
- [ ] 相册卡片展示封面、名称、数量、更新时间、分享状态。
- [ ] 新建/编辑相册支持名称、描述、权限、规则配置。
- [ ] 相册详情复用照片墙和批量选择工具。
- [ ] 批量加入相册支持新建相册快捷入口。
- [ ] 从相册移除文件要与删除文件区分。
- [ ] 自动相册规则同步展示结果和失败原因。
- [ ] 收藏夹入口接入现网已有收藏能力。

### 验收标准

- 加入/移除相册后文件详情里的所属相册同步更新。
- 删除相册必须二次确认，不删除实际文件。

## P7 搜索与高级筛选

### 目标

实现普通搜索、搜索建议、高级筛选、以文搜图、CLIP 能力探测和搜索结果继续整理。

### 主要页面/组件

- `SearchPage`
- `SearchInput`
- `SearchTipsDropdown`
- `AdvancedFilterDrawer`
- `ClipSearchPanel`
- `SearchResultGrid`

### 接口

- `POST /gateway/searchTips`
- `POST /gateway/search`
- `POST /gateway/searchV2`
- `POST /gateway/searchResultTipsBox`
- `POST /gateway/extra/make`
- `POST /gateway/extra/models`
- `GET /gateway/extra/models`
- `POST /gateway/extra/lens`
- `GET /gateway/extra/lens`
- `POST /gateway/extra/placeL1`
- `POST /gateway/extra/placeL2`
- `POST /gateway/extra/placeL3`
- `POST /gateway/CLIP_status`
- `POST /gateway/searchCLIP`
- `POST /gateway/searchCLIPV2`

### 任务清单

- [ ] 顶部搜索输入支持建议、历史、快捷清空。
- [ ] 搜索结果页支持照片墙、列表、按时间排序。
- [ ] 高级筛选支持时间、相机、镜头、地点、文件类型、大小、标签、人物。
- [ ] CLIP 搜索前调用状态接口，未启用时展示配置引导。
- [ ] 语义搜索支持自然语言输入和结果二次筛选。
- [ ] 无结果时展示放宽筛选建议。
- [ ] 搜索结果支持批量加入相册、标签、分享、下载、删除。

### 验收标准

- 搜索建议不会阻塞输入。
- CLIP 未启用时不会显示假结果。
- 筛选条件可从 URL 恢复。

## P8 上传与下载

### 目标

完成桌面端高频文件传输体验：拖拽上传、文件夹上传、大文件分块、分享链接上传、扫描、下载、批量打包和进度中心。

### 主要页面/组件

- `UploadDrawer`
- `UploadDropzone`
- `UploadQueue`
- `DownloadCenter`
- `TransferTaskItem`
- `ConflictResolver`

### 接口

- 上传：
  - `POST /gateway/checkPathForUpload`
  - `POST /gateway/upload`
  - `POST /gateway/uploadV2`
  - `POST /gateway/scanAfterUpload`
  - `POST /gateway/uploadChunk/check`
  - `POST /gateway/uploadChunk/upload`
  - `POST /gateway/uploadChunk/uploadWeb`
  - `POST /gateway/uploadChunk/uploadBin`
  - `POST /gateway/uploadChunk/merge`
  - `POST /gateway/uploadChunk/mergeStatus`
- 分享链接上传：
  - `POST /gateway/uploadForShare`
  - `POST /gateway/uploadChunk/checkInShare`
  - `POST /gateway/uploadChunk/uploadWebInShare`
  - `POST /gateway/uploadChunk/mergeInShare`
  - `POST /gateway/uploadChunk/mergeStatusForShare`
  - `POST /gateway/scanAfterUploadInShare`
- 下载：
  - `GET /gateway/fileDownload/{id}/{md5}`
  - `POST /gateway/fileDownloadStat/{id}/{md5}`
  - `POST /gateway/filesInfo`
  - `GET /gateway/fileZIP/{downloadKey}`

### 任务清单

- [ ] 上传入口支持全局上传、上传到当前文件夹、上传到分享链接。
- [ ] 上传前做路径和重复文件检查。
- [ ] 小文件直传，大文件分块上传。
- [ ] 分块上传支持暂停、失败重试、merge 状态轮询。
- [ ] 上传完成后触发扫描，并展示新增/跳过/失败数量。
- [ ] Electron 桌面支持选择文件夹和多文件。
- [ ] 下载中心展示单文件、批量打包、失败项。
- [ ] 批量下载前调用文件信息接口估算体积。
- [ ] 下载原图时补充下载统计。

### 验收标准

- 大文件上传刷新页面后不会误显示成功。
- 批量下载打包中有明确等待状态。
- 分享链接上传和登录态上传的接口路径隔离。

## P9 分享

### 目标

支持创建、编辑、删除分享，查看分享给我，管理文件链接，公开分享页和相册分享。

### 主要页面/组件

- `SharesPage`
- `CreateShareModal`
- `ShareDetailPage`
- `PublicSharePage`
- `FileLinkManager`
- `SharePermissionPanel`

### 接口

- `GET /api-share`
- `GET /api-share/{id}`
- `GET /api-share/shareToMe`
- `GET /api-share/albumInfo/{albumId}`
- `GET /api-share/albumFiles/{albumId}`
- `GET /api-share/albumFilesFlat/{albumId}`
- `POST /api-share`
- `PATCH /api-share/{id}`
- `PUT /api-share/{id}`
- `DELETE /api-share/{id}`
- `POST /api-share/createFilesLink`
- `POST /api-share/getFilesLink/{id}`
- `POST /api-share/updateFilesLink/{id}`
- `POST /api-share/delFilesLink/{id}`
- `POST /api-share/filesLink/list`
- `POST /api-share/filesLink/list/{id}`

### 任务清单

- [ ] 从照片墙/详情/相册发起创建分享。
- [ ] 分享表单支持标题、描述、密码、过期时间、下载权限、EXIF 可见性。
- [ ] 分享列表展示有效期、访问状态、文件数量、是否有密码。
- [ ] 分享详情支持复制链接、编辑、删除、查看文件。
- [ ] 分享给我独立 tab，权限受限时只读。
- [ ] 文件链接列表支持更新和删除。
- [ ] 公开分享页支持密码输入、相册/文件浏览、下载权限判断。

### 验收标准

- 过期或密码错误的分享有独立状态页。
- 删除分享不会删除源文件。

## P10 标签

### 目标

实现标签浏览、标签管理、文件标签编辑、批量加删标签、隐藏标签和写入 EXIF。

### 主要页面/组件

- `TagsPage`
- `TagDetailPage`
- `TagManagerTable`
- `FileTagEditor`
- `BatchTagModal`
- `ExifWriteProgress`

### 接口

- `GET /api-tag`
- `POST /api-tag`
- `GET /api-tag/tag/{id}`
- `PATCH /api-tag/tag/{id}`
- `PUT /api-tag/tag/{id}`
- `POST /api-tag/hideTag`
- `POST /api-tag/hideEmptyTags`
- `GET /gateway/fileTags/{id}`
- `POST /api-tag/editFileTag`
- `POST /api-tag/fileAddTags`
- `POST /api-tag/fileDelTagsInDb`
- `POST /api-tag/saveToExif`

### 任务清单

- [ ] 标签页展示标签云、列表、数量、隐藏状态。
- [ ] 标签详情复用照片墙。
- [ ] 单文件详情支持编辑标签。
- [ ] 多文件批量添加/删除标签。
- [ ] 标签管理支持新建、重命名、隐藏、隐藏空标签。
- [ ] 写入 EXIF 需要展示进度和失败列表。

### 验收标准

- 批量标签操作后选中文件详情同步更新。
- 隐藏标签不影响已有照片关联，只影响展示。

## P11 删除、回收站与恢复

### 目标

建立可恢复删除和永久删除闭环，避免误删，支持批量恢复和永久删除进度。

### 主要页面/组件

- `TrashPage`
- `DeleteConfirmModal`
- `PermanentDeleteModal`
- `RestoreResultToast`

### 接口

- `GET /gateway/filesInTrashFlat`
- `PATCH /gateway/files`
- `PUT /gateway/files`
- `POST /gateway/deleteFilesPermanently`
- `GET /gateway/deleteFilesPermanentlyStatus`

### 任务清单

- [ ] 删除默认进入回收站，确认弹窗说明可恢复。
- [ ] 回收站列表支持筛选、预览、恢复、永久删除。
- [ ] 永久删除必须强确认，展示不可恢复说明。
- [ ] 永久删除轮询状态并进入任务中心。
- [ ] 恢复后从回收站移除，并在来源列表刷新。

### 验收标准

- 普通删除和永久删除文案不能混淆。
- 永久删除中关闭弹窗后任务仍可查看。

## P12 隐私相册

### 目标

实现隐私相册验证、隐藏文件浏览、移入/移出隐私，并确保退出或锁定后清理敏感状态。

### 主要页面/组件

- `PrivacyGateModal`
- `HiddenFilesPage`
- `PrivacySessionBanner`
- `MoveToHiddenModal`

### 接口

- `POST /gateway/passwordCode`
- `POST /gateway/filesInHide`
- `POST /gateway/hideFiles`
- `POST /gateway/cancelHideFiles`

### 任务清单

- [ ] 进入隐私相册前弹出密码验证。
- [ ] 验证成功后建立短期隐私会话。
- [ ] 隐私照片墙禁用普通缩略图缓存泄露。
- [ ] 支持批量移入隐私和取消隐藏。
- [ ] 退出登录、切换服务端、超时后清理隐私状态。

### 验收标准

- 未验证不能通过 URL 直接进入隐私文件列表。
- 隐私会话过期后需要重新验证。

## P13 相似照片清理

### 目标

帮助用户查看相似照片组，选择保留项，批量删除、隐藏或取消隐藏。

### 主要页面/组件

- `SimilarGroupsPage`
- `SimilarCompareView`
- `KeepSuggestion`
- `SimilarDeleteConfirm`

### 接口

- `POST /gateway/findSimilarFiles`
- `POST /gateway/deleteSimilarFiles`
- `POST /gateway/hideSimilarFiles`
- `POST /gateway/cancelHideSimilarFiles`
- `POST /gateway/similarFilesInHide`

### 任务清单

- [ ] 相似组列表展示组数量、相似度、推荐保留项。
- [ ] 对比视图展示分辨率、大小、时间、路径、EXIF。
- [ ] 用户必须明确选择保留项后才能批量删除。
- [ ] 支持隐藏相似组，隐藏列表可恢复。
- [ ] 删除前展示影响数量和不可恢复说明。

### 验收标准

- 不允许默认全删一组相似照片。
- 隐藏相似组与删除源文件完全区分。

## P14 人物、地图与智能浏览

### 目标

补齐智能浏览模块：人物列表、人物详情、合并拆分、地图聚合、地区照片和智能探索。

### 主要页面/组件

- `PeoplePage`
- `PeopleDetailPage`
- `MergePeopleModal`
- `MapPage`
- `AddressBrowser`
- `ExplorePage`

### 接口

- 人物：
  - `GET /gateway/peopleList`
  - `GET /gateway/people/{id}`
  - `GET /gateway/peopleFileList`
  - `GET /gateway/peopleFileListV2`
  - `PATCH /gateway/people/{id}`
  - `PUT /gateway/people/{id}`
  - `POST /gateway/people/merge`
  - `POST /gateway/people/split/{id}`
  - `POST /gateway/multiHidePeople`
  - `PATCH /gateway/reassignPeopleFile/{id}`
- 地图：
  - `GET /gateway/mapType`
  - `GET /gateway/mapCenter`
  - `GET /gateway/mapboxToken`
  - `GET /gateway/maptilerToken`
  - `GET /gateway/allFilesForMap`
  - `GET /gateway/allFilesForMapDirect`
  - `GET /gateway/addressCountByCity`
  - `GET /gateway/addressCountByDistrict/{city}`
  - `GET /gateway/addressCountByTownship/{city}/{district}`
  - `GET /gateway/filesInAddress`
  - `GET /gateway/filesInAddressV2`

### 任务清单

- [ ] 人物页先做能力探测，没有人脸数据时展示管理引导。
- [ ] 人物头像墙展示名称、照片数量、隐藏状态。
- [ ] 人物详情复用照片墙和详情面板。
- [ ] 支持人物改名、合并、拆分、隐藏、重新分配照片。
- [ ] 地图页探测 provider 和 token，缺失时降级为地区列表。
- [ ] 地图聚合点支持缩放、城市/区县/街道下钻。
- [ ] 地区照片结果页支持继续筛选和批量整理。

### 验收标准

- 地图 token 缺失不会导致页面空白。
- 人物合并/拆分操作有确认和结果反馈。

## P15 管理中心

### 目标

为管理员提供图库、用户、API Key、后台任务、系统配置、日志、授权、索引维护等能力。

### 主要页面/组件

- `AdminLayout`
- `GalleryManagePage`
- `UserManagePage`
- `ApiKeyManagePage`
- `FileTaskPage`
- `SystemConfigPage`
- `LogViewer`
- `LicensePanel`

### 接口

- 图库管理：
  - `GET /gallery`
  - `GET /gallery/all`
  - `POST /gallery`
  - `GET /gallery/{id}`
  - `PATCH /gallery/{id}`
  - `DELETE /gallery/{id}`
  - `GET /gallery/stat/{id}`
  - `GET /gallery/scan/{id}`
  - `POST /gallery/findDuplicateFiles`
  - `POST /gallery/skippedFolderLogs`
- 用户管理：
  - `POST /users`
  - `GET /users`
  - `GET /users/{id}`
  - `PATCH /users/{id}`
  - `DELETE /users/{id}`
  - `PATCH /users/resetPwd/{id}`
  - `GET /users/userIdNameList`
- API Key：
  - `GET /api-keys`
  - `POST /api-keys`
  - `GET /api-keys/{id}`
  - `PATCH /api-keys/{id}`
  - `DELETE /api-keys/{id}`
  - `POST /api-keys/{id}/regenerate`
  - `GET /api-keys-admin`
  - `POST /api-keys-admin`
  - `GET /api-keys-admin/{id}`
  - `PATCH /api-keys-admin/{id}`
  - `DELETE /api-keys-admin/{id}`
  - `POST /api-keys-admin/{id}/regenerate`
- 后台任务：
  - `GET /fileTask/jobs/active`
  - `GET /fileTask/jobs/completed`
  - `GET /fileTask/jobs/waiting`
  - `GET /fileTask/jobs/paused`
  - `GET /fileTask/jobs/failed`
  - `GET /fileTask/jobs/Counts`
  - `GET /fileTask/job/subData`
  - `GET /fileTask/{id}`
  - `POST /fileTask/jobs/pause`
  - `POST /fileTask/jobs/resume`
- 系统配置：
  - `POST /system-config/systemStatus`
  - `GET /system-config`
  - `PATCH /system-config`
  - `GET /system-config/{key}`
  - `POST /system-config/patchMulti`
  - `POST /system-config/getLogs`
  - `POST /system-config/clearLogs`
  - `POST /system-config/test/ocrApi`
  - `POST /system-config/db/prepareCLIP`
  - `POST /system-config/dbReIndex`
  - `POST /system-config/dbReIndexInfo`
  - `GET /gateway/licenseInfo`
  - `POST /gateway/bindLicense`
  - `POST /gateway/verifyAuthOnline`

### 任务清单

- [ ] 管理中心统一使用 AntD Table/Form/Modal，外层保持 Sage 布局。
- [ ] 图库列表展示路径、状态、文件数量、扫描状态、上次扫描时间。
- [ ] 图库新增/编辑/删除需要权限校验和风险确认。
- [ ] 图库扫描接入长任务中心，支持查看跳过日志和重复文件。
- [ ] 用户管理支持创建、编辑、删除、重置密码、用户选择器。
- [ ] API Key 只在创建/重生成时展示一次，离开后不可再明文查看。
- [ ] 后台任务按 active/completed/waiting/paused/failed 分类。
- [ ] 任务详情展示子数据、失败原因、暂停/恢复动作。
- [ ] 系统配置支持分组编辑、批量保存、保存前差异确认。
- [ ] 日志查看支持时间、级别、关键词筛选和清空确认。
- [ ] OCR 测试、CLIP 准备、索引重建都进入长任务或状态轮询。
- [ ] 授权页展示 license 状态、绑定、在线验证结果。

### 验收标准

- 非管理员无法进入管理路由。
- 高风险操作都有确认、结果反馈和失败详情。
- 长任务离开页面后仍可从任务中心追踪。

## P16 设置、安全与个人能力

### 目标

补齐个人设置、安全、API Key、两步验证、主题、缓存、下载路径、年度报告等用户侧能力。

### 主要页面/组件

- `SettingsPage`
- `SecuritySettings`
- `PersonalApiKeys`
- `ThemeSettings`
- `CacheSettings`
- `AnnualReportPage`

### 参考现网

现网路由中存在 `/twoFA`、`/manageApiKey`、`/annualReport`、`/memoryFiles`、`/memoryWeekFiles` 等页面。它们可以作为后续功能吸收对象，但首期只实现对主流程有价值的设置项。

### 接口

- `GET /api-keys`
- `POST /api-keys`
- `PATCH /api-keys/{id}`
- `DELETE /api-keys/{id}`
- `POST /api-keys/{id}/regenerate`
- `POST /auth/auth_code`
- `POST /gateway/memory`
- `GET /gateway/licenseInfo`

### 任务清单

- [ ] 设置页展示服务端地址、当前用户、版本信息。
- [ ] 支持主题色、密度、缩略图尺寸、详情面板默认开关。
- [ ] 支持个人 API Key 管理。
- [ ] 支持两步验证入口，按服务端实际能力补流程。
- [ ] 支持缓存清理：缩略图缓存、搜索历史、隐私状态。
- [ ] Electron 桌面支持默认下载目录设置。
- [ ] 年度报告和回忆页面作为增强入口，后续接入现网能力。

### 验收标准

- 设置修改有即时反馈或保存按钮，不混用。
- 清缓存不会清理登录态，退出登录才清理 token。

## P17 性能、缓存、安全与测试

### 目标

保证桌面端在大图库、跨端打包、长任务和权限场景下稳定可交付。

### 任务清单

- [ ] 照片墙使用虚拟滚动或窗口化渲染。
- [ ] 图片请求支持懒加载、并发控制、失败重试。
- [ ] 缩略图 URL、文件详情、相册列表、标签列表做合理缓存和失效。
- [ ] 上传、下载、移动、删除、转码、索引重建统一进入任务中心。
- [ ] 所有 destructive action 必须二次确认。
- [ ] 所有公开分享页面必须和登录态 API Client 隔离。
- [ ] token、隐私相册口令、API Key 明文不进日志。
- [ ] Playwright 覆盖登录、文件夹、照片预览、上传、分享、删除、管理权限。
- [ ] 单测覆盖 API Client、URL 生成器、任务轮询、上传策略。
- [ ] 建立 Web、macOS、Windows、iOS 打包检查清单。
- [ ] 建立接口覆盖追踪脚本，确保 PRD 9/10 章接口都有归属模块。

### 验收标准

- 典型大图库滚动、预览、批量选择没有明显掉帧。
- 断网、401、403、500 都有可理解的用户反馈。
- 打包前必须通过 type-check、build、关键 Playwright 用例。

## 现网扩展能力吸收清单

从现有网站脚本和路由可见，除了 PRD 9/10 章主接口，还存在一些后续可吸收能力。它们不阻塞首期，但需要在信息架构中预留入口。

- `/gateway/memory`、`/memoryFiles`、`/memoryWeekFiles`：回忆/周回顾。
- `/annualReport`：年度报告。
- `/gateway/folderAutoCover/{id}`：文件夹自动封面。
- `/gateway/folderFilesInDisk`：磁盘文件夹文件视图。
- `/gallery/createFolders`：图库批量创建文件夹。
- `/gallery/exportDeletedFiles`：导出删除文件。
- `/gallery/updateWeights`：图库权重更新。
- `/api-share/filesLink/count`：文件链接数量统计。
- `/gateway/uploadFileHDThumbs`、`/gateway/uploadFileThumbs`：上传缩略图相关能力。
- `/gateway/otp/*`、`/twoFA`：两步验证。

## 首批建议拆分顺序

1. P0 工程底座：先把 API Client、路由守卫、主题、任务中心固定下来。
2. P1 登录闭环：没有登录闭环，后续所有接口调试都会重复返工。
3. P2 工作台 Shell：导航、全局搜索、主题、详情面板是所有页面的容器。
4. P3 文件夹视图：用户已明确点名 `/folders`，并且现网有可参照功能，适合作为第一条真实业务闭环。
5. P4/P5 照片墙与预览详情：文件夹进入照片后必须能继续预览、查看详情和整理。
6. P8/P9 上传下载分享：补齐文件夹和照片管理的核心动作。
7. P6/P10/P11 相册、标签、回收站：形成整理闭环。
8. P7/P12/P13/P14 智能与隐私增强：按服务端能力探测逐步放开。
9. P15/P16 管理与设置：管理员能力复杂，放到主流程稳定后集中推进。

## 引用链与取舍

引用链：`styles/saas-tool/sage-multitheme-data-platform` 通过 `uses` 递归读取 token → component → block → page → style 共 37 个资产，本次没有 product 层 `refs`；取舍：现网 `/folders` 只作为功能和接口参照，视觉、信息架构和交互密度按 Sage 多主题工作台重构，不照搬现网站点的绿色 Web 端样式。
