# MT Photos Desktop 桌面端相册应用 PRD

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 产品名称 | MT Photos Desktop |
| 文档类型 | 产品需求文档 PRD |
| 目标平台 | macOS / Windows / Linux 桌面端 |
| 依赖服务 | MT Photos 服务端 API |
| API 文档来源 | `https://mtmt.tech/api/` |
| OpenAPI 地址 | `https://demo.mtmt.tech/api-json` |
| API 信息 | OpenAPI 3.0，371 个 path，418 个 operation，27 个 schema |
| 服务端版本 | `1.51.0 #7760A`，基于 2026-04-29 拉取结果 |

## 2. 产品背景

MT Photos 当前服务端已经具备照片时间线、相册、分享、标签、人物识别、地图、上传、下载、回收站、文件夹、图库管理、系统任务等完整 API 能力。桌面端应用的目标不是重建后端，而是以已有 API 为基础，提供更适合大屏和批量操作的照片管理体验。

相比 Web 或移动端，桌面端更适合以下场景：

- 大量照片快速浏览、筛选、拖拽、批量管理。
- 多文件上传、分块上传、上传失败重试。
- 图片、视频、Live Photo、EXIF、OCR、GPS、标签等元数据集中查看。
- 批量下载、打包、删除、恢复、移动、整理。
- 管理员进行图库扫描、用户管理、任务监控和系统维护。

## 3. 产品定位

MT Photos Desktop 是一个连接 MT Photos 服务端的桌面相册管理客户端，面向个人、家庭 NAS 用户、摄影素材管理用户和系统管理员，提供完整的照片浏览、整理、分享、上传、搜索和维护能力。

产品核心价值：

- 高效浏览：大图库下按时间线、相册、人物、地图、文件夹快速浏览。
- 高效整理：批量加入相册、加标签、删除、恢复、隐藏、下载、分享。
- 智能发现：支持 OCR、EXIF、地点、人物、相似图、CLIP 语义搜索。
- 安全管理：支持隐私相册、分享权限、删除确认、管理员权限隔离。
- 运维友好：管理员可处理图库扫描、任务队列、系统状态和日志。

## 4. 目标用户

### 4.1 普通用户

使用桌面端查看自己的照片和视频，创建相册、搜索内容、下载原图、分享给他人。

核心诉求：

- 快速找到照片。
- 轻松整理相册。
- 安全分享照片。
- 能上传和下载原图。

### 4.2 摄影和素材管理用户

拥有大量图片、视频或素材，需要按设备、镜头、地点、日期、标签、人物、相似图进行整理。

核心诉求：

- 批量操作效率高。
- EXIF 信息完整可见。
- 支持标签和相册体系。
- 支持相似图清理和语义搜索。

### 4.3 家庭 NAS 用户

通过自托管服务管理家庭照片，希望桌面端承担集中备份和管理入口。

核心诉求：

- 可配置自己的服务端地址。
- 支持大文件和批量上传。
- 支持家庭成员分享。
- 支持隐私相册和回收站。

### 4.4 管理员

负责 MT Photos 服务端的图库、用户、后台任务、系统配置和日志维护。

核心诉求：

- 查看图库状态。
- 扫描图库。
- 管理用户权限。
- 查看后台任务和失败原因。
- 维护系统配置和日志。

## 5. 产品目标

### 5.1 业务目标

- 提供完整桌面端照片管理闭环。
- 提升大图库浏览和批量整理效率。
- 降低用户使用自建服务端的门槛。
- 将管理员高频维护操作集中到桌面端。

### 5.2 用户目标

- 用户可以在 3 分钟内完成服务端连接和登录。
- 用户可以在 5 秒内打开任意月份照片列表。
- 用户可以通过搜索、地图、人物、标签、相册快速找到目标照片。
- 用户可以安全地批量删除、恢复、下载和分享文件。

### 5.3 技术目标

- 尽量复用现有 MT Photos API。
- 对服务端能力做探测，不强依赖某个可选能力。
- 对大图库场景使用虚拟滚动、懒加载和本地缓存。
- 对上传、下载、删除等长任务提供进度反馈和失败重试。

## 6. 产品范围

### 6.1 MVP 范围

第一期必须完成以下闭环：

- 服务端配置与登录。
- 当前用户信息和权限识别。
- 照片时间线浏览。
- 图片、视频、Live Photo 基础预览。
- 文件详情、EXIF、OCR、标签查看。
- 相册创建、编辑、删除、加入文件、移除文件。
- 普通搜索。
- 上传文件、分块上传、上传进度。
- 下载单文件、批量打包下载。
- 创建文件分享和相册分享。
- 删除、回收站、恢复。
- 基础设置。

### 6.2 增强范围

第二期增强：

- 地图相册。
- 人物相册。
- 标签批量管理。
- 隐私相册。
- 相似照片清理。
- 文件夹视图。
- 文件日期、名称、GPS、旋转等编辑能力。
- CLIP 语义搜索。

### 6.3 管理员范围

第三期管理员能力：

- 图库管理。
- 图库扫描。
- 用户管理。
- API Key 管理。
- 后台任务监控。
- 系统状态、日志、配置。
- OCR、人脸、CLIP、索引等高级维护能力。

### 6.4 暂不纳入范围

- 不重新实现服务端。
- 不在本地重新构建独立照片数据库。
- 不承诺离线完整浏览原图。
- 不自研人脸识别、OCR、CLIP 模型，仅消费服务端已有能力。
- 不绕过服务端权限访问本地磁盘文件。

## 7. 整体信息架构

### 7.1 主导航

桌面端采用左侧导航 + 顶部工具栏 + 中央内容区 + 右侧详情面板的结构。

左侧主导航：

- 照片
- 最近添加
- 相册
- 文件夹
- 人物
- 地图
- 标签
- 搜索
- 分享
- 上传
- 回收站
- 隐私相册
- 管理中心，仅管理员显示
- 设置

### 7.2 顶部工具栏

顶部工具栏根据当前页面变化，通用能力包括：

- 当前服务端名称。
- 当前图库筛选。
- 全局搜索入口。
- 日期跳转。
- 视图切换：时间线、网格、列表。
- 批量选择状态。
- 上传、下载、分享等快捷按钮。

### 7.3 右侧详情面板

选中单个文件时展示：

- 基本信息。
- EXIF 信息。
- OCR 识别内容。
- 标签。
- 所属相册。
- GPS 和地点。
- 人物识别结果。
- 文件处理状态。

选中多个文件时展示：

- 已选数量。
- 总大小。
- 批量操作按钮。
- 批量标签、相册、下载、删除、隐藏、分享入口。

## 8. 核心业务流程

### 8.1 首次连接流程

1. 用户打开应用。
2. 输入服务端地址。
3. 客户端调用 `/api-info` 检查服务可用性。
4. 用户输入账号密码。
5. 客户端调用 `/auth/rsa` 获取公钥。
6. 客户端调用 `/auth/login` 登录。
7. 客户端调用 `/gateway/userInfo` 获取用户信息。
8. 客户端调用 `/auth/auth_code` 获取媒体访问授权码。
9. 进入照片时间线首页。

异常处理：

- 服务端不可访问：提示检查服务端地址和网络。
- 登录失败：提示账号或密码错误。
- 服务端版本不兼容：提示当前版本可能不支持部分功能。
- auth_code 获取失败：允许进入应用，但媒体预览不可用并提示重新认证。

### 8.2 浏览照片流程

1. 用户进入“照片”页面。
2. 客户端调用 `/gateway/timeline` 获取月份统计。
3. 用户点击某个月份。
4. 客户端调用 `/gateway/timelineMonth` 或 `/gateway/filesInTimelineV2` 获取文件列表。
5. 照片墙按日期分组展示。
6. 缩略图通过 `/gateway/{type}/{md5}` 懒加载。
7. 点击照片进入预览器。
8. 预览器通过 `/gateway/file/{id}/{md5}` 加载高清预览或原图。

### 8.3 整理相册流程

1. 用户在照片墙多选文件。
2. 点击“加入相册”。
3. 客户端调用 `/api-album` 获取相册列表。
4. 用户选择已有相册或新建相册。
5. 新建相册调用 `POST /api-album`。
6. 加入相册调用 `POST /api-album/addFileToAlbum`。
7. 操作成功后更新当前文件的所属相册状态。

### 8.4 分享流程

文件分享：

1. 用户选择一个或多个文件。
2. 点击“创建分享”。
3. 设置过期时间、密码、是否显示 EXIF、是否允许下载。
4. 客户端调用 `POST /api-share/createFilesLink`。
5. 生成分享链接并复制。

相册分享：

1. 用户进入相册详情。
2. 点击“分享相册”。
3. 设置分享参数。
4. 客户端调用 `POST /api-share`。
5. 分享创建成功后进入“我的分享”管理。

### 8.5 上传流程

1. 用户拖拽文件或文件夹到上传页。
2. 客户端解析文件列表。
3. 对每个文件调用 `/gateway/checkPathForUpload` 或 `/gateway/uploadChunk/check` 检查是否已存在。
4. 小文件可使用 `/gateway/upload` 或 `/gateway/uploadV2`。
5. 大文件使用分块上传：
   - `/gateway/uploadChunk/check`
   - `/gateway/uploadChunk/uploadWeb`
   - `/gateway/uploadChunk/merge`
   - `/gateway/uploadChunk/mergeStatus`
6. 上传完成后调用 `/gateway/scanAfterUpload`。
7. 展示上传成功、失败、跳过、重复文件统计。

### 8.6 删除与恢复流程

删除：

1. 用户选择文件。
2. 点击删除。
3. 二次确认。
4. 调用 `DELETE /gateway/files`。
5. 文件进入回收站。

恢复：

1. 用户进入回收站。
2. 客户端调用 `/gateway/filesInTrashFlat`。
3. 用户选择文件恢复。
4. 调用 `PATCH /gateway/files`。

永久删除：

1. 用户在回收站选择文件。
2. 点击永久删除。
3. 强提示不可恢复。
4. 调用 `POST /gateway/deleteFilesPermanently`。
5. 使用 `/gateway/deleteFilesPermanentlyStatus` 查询状态。

## 9. 功能需求

### 9.1 服务端连接与账号

#### FR-001 服务端配置

用户可以新增、编辑、删除服务端配置。

字段：

- 服务名称。
- 服务端地址。
- 备注。
- 是否默认连接。

验收标准：

- 输入服务端地址后可以检测连接状态。
- 地址为空或格式错误时不能保存。
- 切换服务端后清理当前用户会话和媒体缓存。

依赖接口：

- `GET /api-info`

#### FR-002 登录与会话

用户可以使用账号密码登录服务端。

验收标准：

- 登录成功后进入照片首页。
- token 过期时可以自动刷新。
- 刷新失败时回到登录页。
- 支持退出登录。

依赖接口：

- `POST /auth/rsa`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /gateway/userInfo`

#### FR-003 媒体授权码

客户端需要获取 auth_code 用于访问图片、视频和下载接口。

验收标准：

- 登录后自动获取 auth_code。
- auth_code 过期前自动刷新。
- 媒体请求失败且疑似 auth_code 过期时自动重试一次。

依赖接口：

- `POST /auth/auth_code`

### 9.2 照片时间线

#### FR-010 时间线统计

用户可以按月份查看照片数量。

验收标准：

- 月份列表展示每月照片数量。
- 支持按图库筛选。
- 切换图库后统计数据刷新。

依赖接口：

- `GET /gateway/timeline`
- `GET /gateway/filesInTimelineCount`

#### FR-011 月份照片墙

用户可以查看某个月份的照片和视频。

验收标准：

- 按日期分组展示。
- 支持虚拟滚动。
- 支持缩略图懒加载。
- 支持多选和框选。

依赖接口：

- `POST /gateway/timelineMonth`
- `GET /gateway/filesInTimelineV2`
- `POST /gateway/dayFiles`
- `POST /gateway/dayFileMore`
- `GET /gateway/{type}/{md5}`

#### FR-012 最近添加

用户可以查看最近添加的文件。

验收标准：

- 按添加时间倒序展示。
- 支持进入预览和批量操作。

依赖接口：

- `GET /gateway/recentFiles`

### 9.3 文件预览

#### FR-020 图片预览器

用户可以查看图片高清预览和原图。

能力：

- 上一张、下一张。
- 放大、缩小、适应窗口、实际大小。
- 旋转预览。
- 下载原图。
- 查看信息面板。

依赖接口：

- `GET /gateway/file/{id}/{md5}`
- `GET /gateway/{type}/{md5}`
- `GET /gateway/fileDownload/{id}/{md5}`

#### FR-021 视频预览器

用户可以播放视频文件。

能力：

- 播放、暂停、进度条、音量。
- 加载转码视频。
- 转码失败时展示错误原因。

依赖接口：

- `GET /gateway/file/{id}/{md5}`
- `GET /gateway/flv/{id}/{md5}`
- `POST /gateway/transcode`
- `POST /gateway/getTranscodeError`

#### FR-022 Live Photo 预览

用户可以查看 Live Photo 的照片和动态视频部分。

依赖接口：

- `GET /gateway/fileMotion/{id}/{md5}`
- `POST /gateway/livePhotoMovCheck`

### 9.4 文件详情与编辑

#### FR-030 文件详情

选中文件后展示完整文件信息。

展示内容：

- 文件名。
- 文件类型。
- 文件大小。
- 文件路径。
- 所属图库。
- 拍摄时间。
- 修改时间。
- MD5。
- 宽高。
- 视频时长。
- 处理状态。

依赖接口：

- `GET /gateway/fileInfoById/{id}`
- `GET /gateway/fileInfo/{id}/{md5}`

#### FR-031 EXIF 信息

展示相机品牌、型号、镜头、光圈、快门、ISO、焦距等信息。

依赖接口：

- `GET /gateway/exifInfo/{id}`
- `GET /gateway/fileInfoRT/{id}`

#### FR-032 OCR 信息

展示图片 OCR 识别文本。

依赖接口：

- `GET /gateway/ocrInfo/{id}`

#### FR-033 编辑文件信息

用户可以编辑部分文件元数据。

能力：

- 修改拍摄日期。
- 修改文件名称。
- 编辑额外描述。
- 编辑 GPS。
- 重置 GPS。
- 旋转文件。

依赖接口：

- `POST /gateway/updateFileDate`
- `POST /gateway/updateFileName`
- `POST /gateway/editFileExtra`
- `POST /gateway/editFileGps`
- `POST /gateway/resetFileGps`
- `POST /gateway/editFileRotate`

### 9.5 搜索

#### FR-040 普通搜索

用户可以按关键词搜索照片。

验收标准：

- 输入关键词时展示搜索建议。
- 搜索结果支持照片墙展示。
- 搜索结果支持批量操作。

依赖接口：

- `POST /gateway/searchTips`
- `POST /gateway/search`
- `POST /gateway/searchV2`
- `POST /gateway/searchResultTipsBox`

#### FR-041 高级筛选

用户可以按日期、图库、相机品牌、设备型号、镜头、地点、分类、标签等筛选。

依赖接口：

- `POST /gateway/extra/make`
- `POST /gateway/extra/models`
- `GET /gateway/extra/models`
- `POST /gateway/extra/lens`
- `GET /gateway/extra/lens`
- `POST /gateway/extra/placeL1`
- `POST /gateway/extra/placeL2`
- `POST /gateway/extra/placeL3`

#### FR-042 CLIP 语义搜索

当服务端支持 CLIP 时，用户可以使用自然语言搜索。

示例：

- 海边日落。
- 有猫的照片。
- 蓝色天空。
- 婚礼合影。

验收标准：

- 先检测 CLIP 状态。
- 不支持时隐藏语义搜索入口或展示不可用原因。
- 搜索结果支持继续筛选和批量操作。

依赖接口：

- `POST /gateway/CLIP_status`
- `POST /gateway/searchCLIP`
- `POST /gateway/searchCLIPV2`

### 9.6 相册

#### FR-050 相册列表

用户可以查看自己的相册列表。

展示内容：

- 相册名称。
- 封面。
- 文件数量。
- 时间范围。
- 是否隐藏。

依赖接口：

- `GET /api-album`

#### FR-051 相册管理

用户可以创建、编辑、删除相册。

依赖接口：

- `POST /api-album`
- `GET /api-album/{id}`
- `PATCH /api-album/{id}`
- `PUT /api-album/{id}`
- `DELETE /api-album/{id}`

#### FR-052 相册文件管理

用户可以查看相册文件、添加文件、移除文件。

依赖接口：

- `GET /api-album/filesV2/{id}`
- `GET /api-album/filesFlat/{id}`
- `POST /api-album/addFileToAlbum`
- `POST /api-album/removeFileFromAlbum`
- `GET /api-album/fileInAlbumsList/{id}`

#### FR-053 自动相册配置

用户可以查看和维护相册自动更新配置。

依赖接口：

- `GET /api-album/link/{id}`
- `POST /api-album/link/{id}`
- `DELETE /api-album/link/{id}`
- `POST /api-album/linkSyncFiles/{id}`

### 9.7 标签

#### FR-060 标签列表

用户可以查看全部标签。

依赖接口：

- `GET /api-tag`

#### FR-061 标签管理

用户可以创建、编辑、隐藏标签。

依赖接口：

- `POST /api-tag`
- `GET /api-tag/tag/{id}`
- `PATCH /api-tag/tag/{id}`
- `PUT /api-tag/tag/{id}`
- `POST /api-tag/hideTag`
- `POST /api-tag/hideEmptyTags`

#### FR-062 文件标签管理

用户可以给文件添加或删除标签。

依赖接口：

- `GET /gateway/fileTags/{id}`
- `POST /api-tag/editFileTag`
- `POST /api-tag/fileAddTags`
- `POST /api-tag/fileDelTagsInDb`
- `POST /api-tag/saveToExif`

### 9.8 分享

#### FR-070 我的分享

用户可以查看自己创建的分享。

依赖接口：

- `GET /api-share`
- `GET /api-share/{id}`

#### FR-071 分享给我的

用户可以查看别人分享给自己的内容。

依赖接口：

- `GET /api-share/shareToMe`
- `GET /api-share/albumInfo/{albumId}`
- `GET /api-share/albumFiles/{albumId}`
- `GET /api-share/albumFilesFlat/{albumId}`

#### FR-072 创建相册分享

用户可以创建相册分享。

配置项：

- 是否开启链接访问。
- 访问密码。
- 过期时间。
- 可查看用户。
- 可协作用户。

依赖接口：

- `POST /api-share`
- `PATCH /api-share/{id}`
- `PUT /api-share/{id}`
- `DELETE /api-share/{id}`

#### FR-073 创建文件分享

用户可以为一个或多个文件创建分享链接。

配置项：

- 描述。
- 密码。
- 过期时间。
- 是否显示 EXIF。
- 是否允许下载。

依赖接口：

- `POST /api-share/createFilesLink`
- `POST /api-share/getFilesLink/{id}`
- `POST /api-share/updateFilesLink/{id}`
- `POST /api-share/delFilesLink/{id}`
- `POST /api-share/filesLink/list`
- `POST /api-share/filesLink/list/{id}`

### 9.9 上传

#### FR-080 拖拽上传

用户可以拖拽文件或文件夹上传。

验收标准：

- 支持多文件队列。
- 支持上传前重复检查。
- 支持上传进度。
- 支持失败重试。
- 支持上传完成后触发扫描。

依赖接口：

- `POST /gateway/checkPathForUpload`
- `POST /gateway/upload`
- `POST /gateway/uploadV2`
- `POST /gateway/scanAfterUpload`

#### FR-081 分块上传

大文件自动使用分块上传。

依赖接口：

- `POST /gateway/uploadChunk/check`
- `POST /gateway/uploadChunk/upload`
- `POST /gateway/uploadChunk/uploadWeb`
- `POST /gateway/uploadChunk/uploadBin`
- `POST /gateway/uploadChunk/merge`
- `POST /gateway/uploadChunk/mergeStatus`

#### FR-082 分享链接内上传

如果用户打开支持上传的分享链接，可以上传文件到分享相册。

依赖接口：

- `POST /gateway/uploadForShare`
- `POST /gateway/uploadChunk/checkInShare`
- `POST /gateway/uploadChunk/uploadWebInShare`
- `POST /gateway/uploadChunk/mergeInShare`
- `POST /gateway/uploadChunk/mergeStatusForShare`
- `POST /gateway/scanAfterUploadInShare`

### 9.10 下载

#### FR-090 单文件下载

用户可以下载文件原图。

依赖接口：

- `GET /gateway/fileDownload/{id}/{md5}`
- `POST /gateway/fileDownloadStat/{id}/{md5}`

#### FR-091 批量下载

用户可以选择多个文件打包下载。

依赖接口：

- `POST /gateway/filesInfo`
- `GET /gateway/fileZIP/{downloadKey}`

### 9.11 地图

#### FR-100 地图照片

用户可以在地图上查看有 GPS 信息的照片。

依赖接口：

- `GET /gateway/mapType`
- `GET /gateway/mapCenter`
- `GET /gateway/mapboxToken`
- `GET /gateway/maptilerToken`
- `GET /gateway/allFilesForMap`
- `GET /gateway/allFilesForMapDirect`

#### FR-101 地区照片

用户可以按城市、区县、街道查看照片。

依赖接口：

- `GET /gateway/addressCountByCity`
- `GET /gateway/addressCountByDistrict/{city}`
- `GET /gateway/addressCountByTownship/{city}/{district}`
- `GET /gateway/filesInAddress`
- `GET /gateway/filesInAddressV2`

### 9.12 人物

#### FR-110 人物列表

用户可以查看识别出来的人物。

依赖接口：

- `GET /gateway/peopleList`

#### FR-111 人物详情

用户可以查看某个人物关联的照片。

依赖接口：

- `GET /gateway/people/{id}`
- `GET /gateway/peopleFileList`
- `GET /gateway/peopleFileListV2`

#### FR-112 人物管理

用户可以修改人物信息、合并人物、拆分人物、隐藏人物。

依赖接口：

- `PATCH /gateway/people/{id}`
- `PUT /gateway/people/{id}`
- `POST /gateway/people/merge`
- `POST /gateway/people/split/{id}`
- `POST /gateway/multiHidePeople`
- `PATCH /gateway/reassignPeopleFile/{id}`

### 9.13 隐私相册

#### FR-120 访问隐私相册

用户需要验证密码后才能访问隐私相册。

依赖接口：

- `POST /gateway/passwordCode`
- `POST /gateway/filesInHide`

#### FR-121 隐私文件管理

用户可以将文件移入或移出隐私相册。

依赖接口：

- `POST /gateway/hideFiles`
- `POST /gateway/cancelHideFiles`

安全要求：

- 退出隐私相册后清理本地预览缓存。
- 隐私相册内容不进入全局最近浏览记录。
- 应用锁定后需要重新验证。

### 9.14 相似照片清理

#### FR-130 查找相似照片

用户可以查找相似照片组。

依赖接口：

- `POST /gateway/findSimilarFiles`

#### FR-131 处理相似照片

用户可以删除、忽略或取消忽略相似照片。

依赖接口：

- `POST /gateway/deleteSimilarFiles`
- `POST /gateway/hideSimilarFiles`
- `POST /gateway/cancelHideSimilarFiles`
- `POST /gateway/similarFilesInHide`

交互要求：

- 默认不自动删除。
- 每组照片需要用户选择保留项。
- 删除前必须二次确认。

### 9.15 回收站

#### FR-140 查看回收站

用户可以查看已删除文件。

依赖接口：

- `GET /gateway/filesInTrashFlat`

#### FR-141 恢复文件

用户可以从回收站恢复文件。

依赖接口：

- `PATCH /gateway/files`
- `PUT /gateway/files`

#### FR-142 永久删除

用户可以永久删除回收站文件。

依赖接口：

- `POST /gateway/deleteFilesPermanently`
- `GET /gateway/deleteFilesPermanentlyStatus`

### 9.16 文件夹视图

#### FR-150 文件夹浏览

用户可以按服务端文件夹结构浏览照片。

依赖接口：

- `GET /gateway/folders/root`
- `GET /gateway/folders/{id}`
- `GET /gateway/foldersV2/{id}`
- `GET /gateway/folderFiles/{id}`
- `GET /gateway/folderBreadcrumbs/{id}`

#### FR-151 文件夹管理

用户可以创建、重命名、移动、删除文件夹。

依赖接口：

- `POST /gateway/folders/create`
- `POST /gateway/folderPathEdit`
- `PATCH /gateway/setFolderCover/{id}`

#### FR-152 文件整理

用户可以预览并执行文件夹整理。

依赖接口：

- `POST /gateway/folder_files_move/preview`
- `POST /gateway/folder_files_move/move`
- `POST /gateway/folder_files_move/status`
- `POST /gateway/folders/delete_empty`

## 10. 管理中心需求

管理中心仅管理员可见。是否展示入口以 `/gateway/userInfo` 返回的用户角色为准。

### 10.1 图库管理

功能：

- 查看图库列表。
- 创建图库。
- 编辑图库。
- 删除图库。
- 查看图库统计。
- 扫描图库。
- 查找重复文件。
- 查看跳过扫描的文件夹日志。

依赖接口：

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

### 10.2 用户管理

功能：

- 创建用户。
- 查看用户列表。
- 修改用户。
- 删除用户。
- 重置用户密码。

依赖接口：

- `POST /users`
- `GET /users`
- `GET /users/{id}`
- `PATCH /users/{id}`
- `DELETE /users/{id}`
- `PATCH /users/resetPwd/{id}`
- `GET /users/userIdNameList`

### 10.3 API Key 管理

功能：

- 普通用户管理自己的 API Key。
- 管理员管理全部用户 API Key。

依赖接口：

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

### 10.4 后台任务

功能：

- 查看执行中、等待中、已完成、失败、暂停任务。
- 查看任务数量统计。
- 暂停或恢复任务队列。
- 查看任务详情和子数据。

依赖接口：

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

### 10.5 系统状态与配置

功能：

- 查看系统状态。
- 查看和修改系统配置。
- 获取和清空日志。
- 测试 OCR 配置。
- 准备 CLIP 表。
- 重建数据库索引。
- 查看授权状态。

依赖接口：

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

## 11. 权限设计

### 11.1 普通用户权限

普通用户可使用：

- 照片浏览。
- 相册管理。
- 标签管理。
- 搜索。
- 分享。
- 上传。
- 下载。
- 回收站。
- 隐私相册。
- 个人设置。

普通用户不可见：

- 管理中心。
- 图库创建和删除。
- 用户管理。
- 系统配置。
- 全局后台任务管理。
- 管理员回收站。

### 11.2 管理员权限

管理员额外可使用：

- 图库管理。
- 用户管理。
- 任务管理。
- 系统配置。
- 日志查看。
- 数据库索引维护。
- OCR、CLIP、人脸识别维护。

### 11.3 权限降级

如果用户访问无权限接口：

- 前端不展示入口。
- 已打开页面显示“无权限访问”。
- 不把接口错误展示为系统异常。

## 12. 交互设计要求

### 12.1 批量选择

照片墙支持：

- 点击选择。
- Shift 连选。
- 框选。
- 全选当前日期。
- 全选当前搜索结果。

批量操作包括：

- 加入相册。
- 添加标签。
- 下载。
- 分享。
- 删除。
- 移入隐私相册。
- 从相册移除。

### 12.2 右键菜单

文件右键菜单：

- 打开预览。
- 下载原图。
- 加入相册。
- 添加标签。
- 分享。
- 查看详情。
- 复制文件信息。
- 删除。

相册右键菜单：

- 打开。
- 编辑。
- 分享。
- 删除。
- 设置封面。

### 12.3 快捷键

建议支持：

| 快捷键 | 行为 |
| --- | --- |
| `Space` | 打开或关闭预览 |
| `Esc` | 退出预览或取消选择 |
| `Cmd/Ctrl + F` | 聚焦搜索 |
| `Cmd/Ctrl + A` | 全选当前列表 |
| `Delete` | 删除所选文件 |
| `Cmd/Ctrl + S` | 保存当前编辑 |
| `← / →` | 预览上一张/下一张 |
| `+ / -` | 放大/缩小 |

### 12.4 状态反馈

所有耗时操作必须展示状态：

- 上传中。
- 下载中。
- 删除中。
- 恢复中。
- 打包中。
- 扫描中。
- 转码中。
- 索引处理中。

失败时展示：

- 失败原因。
- 是否可重试。
- 失败文件列表。

## 13. 非功能需求

### 13.1 性能

- 支持 10 万级照片库。
- 时间线和照片墙必须使用虚拟滚动。
- 缩略图按视口懒加载。
- 同一文件缩略图请求需要去重。
- 文件详情按需加载。
- 大图预览前优先显示缩略图占位。

### 13.2 缓存

可缓存内容：

- 服务端配置。
- 当前用户信息。
- 图库列表。
- 相册列表。
- 时间线月份统计。
- 已加载缩略图。
- 搜索历史。

不可长期缓存内容：

- 隐私相册媒体。
- 明文密码。
- 分享访问密码。
- 已退出账号的 token。

### 13.3 安全

- token、API Key、刷新凭证使用系统安全存储。
- 删除、永久删除、路径移动、文件夹整理必须二次确认。
- 隐私相册退出后清空敏感缓存。
- 不在日志中输出 token、auth_code、API Key。
- 服务端地址切换时隔离账号数据。

### 13.4 可靠性

- 网络异常时保留已加载数据。
- 上传和下载支持失败重试。
- 长任务支持刷新后恢复查询。
- 服务端返回 401 时自动刷新 token。
- auth_code 失效时自动重新获取。

### 13.5 兼容性

- 支持 macOS、Windows、Linux。
- 支持深色模式。
- 支持高 DPI 屏幕。
- 支持系统代理。
- 服务端能力不足时按模块降级。

## 14. 数据对象

### 14.1 文件 File

核心字段：

- `id`：文件 ID。
- `fileName`：文件名称。
- `fileType`：文件类型。
- `filePath`：文件路径。
- `fileSize`：文件大小。
- `galleryIds`：所属图库 ID。
- `tokenAt`：拍摄日期。
- `mtime`：修改日期。
- `MD5`：文件 MD5。
- `duration`：视频时长。
- `width` / `height`：宽高。
- `orientation` / `rotation` / `m_rotate`：方向和旋转。
- `status`：文件处理状态。
- `proxyStatus`：代理文件状态。
- `previewStatus`：预览状态。
- `peopleDescriptorStatus`：人脸识别状态。
- `categoryStatus`：场景分类状态。
- `ocrStatus`：OCR 状态。
- `clipStatus`：CLIP 状态。
- `transcodeStatus`：转码状态。
- `similarStatus`：相似图状态。
- `isLivePhotosVideo`：是否 Live Photo 视频。
- `isScreenshot`：是否截图。
- `isScreenRecord`：是否录屏。
- `isSelfie`：是否自拍。
- `extra`：部分 EXIF 信息。
- `gps`：GPS 坐标。
- `gpsInfo`：逆地理位置信息。
- `folderId`：文件夹 ID。

### 14.2 相册 Album

核心字段：

- `name`：相册名称。
- `weights`：排序权重。
- `count`：文件数量。
- `cover`：封面。
- `startTime`：开始时间。
- `endTime`：结束时间。
- `files`：文件列表。
- `ignore_files`：排除文件。
- `auto_files`：自动关联文件。
- `sort_type`：排序类型。
- `deleted`：是否删除。
- `hide`：是否隐藏。
- `theme`：主题。

### 14.3 分享 Share

相册分享字段：

- `userId`。
- `albumId`。
- `link`。
- `linkPwd`。
- `key`。
- `isSingleFile`。
- `linkEndTime`。
- `vUserIds`。
- `cUserIds`。

文件分享字段：

- `files`。
- `count`。
- `cover`。
- `desc`。
- `showExif`。
- `showDownload`。

## 15. 版本规划

### 15.1 V1.0 MVP

目标：形成普通用户完整使用闭环。

包含：

- 服务端配置与登录。
- 照片时间线。
- 图片和视频预览。
- 文件详情、EXIF、OCR、标签查看。
- 相册管理。
- 普通搜索。
- 上传。
- 下载。
- 分享。
- 删除、回收站、恢复。
- 基础设置。

不包含：

- 地图。
- 人物。
- CLIP 搜索。
- 文件夹整理。
- 管理中心。

### 15.2 V1.1 整理增强

目标：提升照片整理效率。

包含：

- 标签批量管理。
- 高级筛选。
- 隐私相册。
- 相似照片清理。
- 文件元数据编辑。
- 文件夹视图。

### 15.3 V1.2 智能浏览

目标：强化智能发现能力。

包含：

- 人物相册。
- 地图相册。
- CLIP 语义搜索。
- OCR 搜索增强。
- 场景分类浏览。

### 15.4 V1.3 管理中心

目标：覆盖管理员维护场景。

包含：

- 图库管理。
- 用户管理。
- API Key 管理。
- 后台任务。
- 系统状态。
- 日志。
- OCR、CLIP、人脸、索引维护。

## 16. 验收指标

### 16.1 功能验收

- 用户可以完成登录、浏览、预览、上传、下载、分享、删除、恢复完整流程。
- 用户可以创建相册并添加文件。
- 用户可以搜索到目标照片。
- 用户可以查看文件详情、EXIF、OCR 和标签。
- 管理员账号可以看到管理中心，普通账号不可见。

### 16.2 性能验收

- 10 万文件库下，时间线首屏加载不超过 3 秒。
- 月份照片墙切换不超过 2 秒开始渲染首屏。
- 缩略图滚动无明显卡顿。
- 批量选择 1000 个文件时界面仍可操作。

### 16.3 稳定性验收

- 网络断开后应用不崩溃。
- token 过期后可自动刷新。
- auth_code 过期后媒体请求可自动恢复。
- 上传失败可重试。
- 长任务可恢复查询进度。

## 17. 接口依赖总览

### 17.1 登录与用户

- `GET /api-info`
- `POST /auth/rsa`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/auth_code`
- `GET /gateway/userInfo`

### 17.2 照片浏览

- `GET /gateway/timeline`
- `POST /gateway/timelineMonth`
- `GET /gateway/filesInTimelineV2`
- `GET /gateway/filesInTimelineCount`
- `POST /gateway/dayFiles`
- `POST /gateway/dayFileMore`
- `GET /gateway/recentFiles`
- `GET /gateway/{type}/{md5}`
- `GET /gateway/file/{id}/{md5}`

### 17.3 文件详情

- `GET /gateway/fileInfoById/{id}`
- `GET /gateway/fileInfo/{id}/{md5}`
- `GET /gateway/exifInfo/{id}`
- `GET /gateway/ocrInfo/{id}`
- `GET /gateway/fileTags/{id}`

### 17.4 相册

- `GET /api-album`
- `POST /api-album`
- `GET /api-album/{id}`
- `PATCH /api-album/{id}`
- `DELETE /api-album/{id}`
- `GET /api-album/filesV2/{id}`
- `POST /api-album/addFileToAlbum`
- `POST /api-album/removeFileFromAlbum`

### 17.5 搜索

- `POST /gateway/searchTips`
- `POST /gateway/search`
- `POST /gateway/searchV2`
- `POST /gateway/searchCLIPV2`
- `POST /gateway/CLIP_status`

### 17.6 上传与下载

- `POST /gateway/checkPathForUpload`
- `POST /gateway/upload`
- `POST /gateway/uploadV2`
- `POST /gateway/uploadChunk/check`
- `POST /gateway/uploadChunk/uploadWeb`
- `POST /gateway/uploadChunk/merge`
- `POST /gateway/uploadChunk/mergeStatus`
- `POST /gateway/scanAfterUpload`
- `GET /gateway/fileDownload/{id}/{md5}`
- `GET /gateway/fileZIP/{downloadKey}`

### 17.7 分享

- `GET /api-share`
- `POST /api-share`
- `PATCH /api-share/{id}`
- `DELETE /api-share/{id}`
- `POST /api-share/createFilesLink`
- `POST /api-share/updateFilesLink/{id}`
- `POST /api-share/delFilesLink/{id}`

### 17.8 标签、人物、地图

- `GET /api-tag`
- `POST /api-tag`
- `POST /api-tag/fileAddTags`
- `POST /api-tag/fileDelTagsInDb`
- `GET /gateway/peopleList`
- `GET /gateway/peopleFileListV2`
- `GET /gateway/allFilesForMap`
- `GET /gateway/filesInAddressV2`

### 17.9 管理员

- `GET /gallery`
- `POST /gallery`
- `GET /gallery/scan/{id}`
- `GET /users`
- `POST /users`
- `GET /fileTask/jobs/active`
- `GET /fileTask/jobs/Counts`
- `POST /system-config/systemStatus`
- `POST /system-config/getLogs`

## 18. 风险与待确认事项

### 18.1 接口细节待确认

部分接口文档只声明 `object`，未完整暴露请求体字段，需要在开发前通过真实请求或服务端代码确认：

- 搜索接口请求体。
- 分块上传字段。
- 删除和恢复文件请求体。
- 相似照片处理请求体。
- 自动相册规则字段。
- 文件夹整理字段。

### 18.2 服务端能力差异

以下能力依赖服务端配置或授权状态：

- CLIP 搜索。
- OCR。
- 人脸识别。
- 地图 token。
- 视频转码。
- 硬件加速。
- 授权订阅。

桌面端必须做能力探测和降级。

### 18.3 大图库性能风险

如果图库达到数十万文件，需要重点优化：

- 时间线分页。
- 缩略图并发控制。
- 本地缓存淘汰。
- 详情请求合并。
- 搜索结果虚拟滚动。

### 18.4 高风险操作

以下操作需要二次确认和可见进度：

- 永久删除。
- 文件夹移动。
- 文件路径编辑。
- 删除图库。
- 删除用户。
- 清空日志。
- 数据库索引重建。
- 系统配置修改。

## 19. 附录：推荐桌面端页面清单

| 页面 | MVP | 说明 |
| --- | --- | --- |
| 登录页 | 是 | 服务端配置、登录、连接检查 |
| 照片时间线 | 是 | 首页核心页面 |
| 预览器 | 是 | 图片、视频、Live Photo |
| 文件详情面板 | 是 | 基本信息、EXIF、OCR、标签 |
| 相册列表 | 是 | 用户相册 |
| 相册详情 | 是 | 相册文件列表和管理 |
| 搜索页 | 是 | 普通搜索 |
| 上传中心 | 是 | 队列、进度、失败重试 |
| 下载中心 | 是 | 下载任务和记录 |
| 分享管理 | 是 | 我的分享、分享给我 |
| 回收站 | 是 | 恢复、永久删除 |
| 设置页 | 是 | 服务端、缓存、主题、安全 |
| 标签页 | 否 | V1.1 |
| 隐私相册 | 否 | V1.1 |
| 相似照片 | 否 | V1.1 |
| 文件夹视图 | 否 | V1.1 |
| 人物页 | 否 | V1.2 |
| 地图页 | 否 | V1.2 |
| 管理中心 | 否 | V1.3 |

