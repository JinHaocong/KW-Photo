# MT Photos Desktop 接口-页面-交互覆盖矩阵

本文用于回答“设计稿是否涉及所有接口”。结论先放前面：当前 `mt-photos-desktop-prototype.html` 覆盖了核心页面和主链路，但没有把 PRD 9/10 章显式列出的 209 个唯一接口逐项做成完整 UI。

本矩阵以 `MT-Photos-Desktop-PRD.md` 第 9、10 章为准。第 17 章“接口依赖总览”只列出 67 个唯一接口，属于 MVP/总览摘录，不能作为全量接口清单。

## 覆盖级别

| 状态 | 含义 |
| --- | --- |
| 已设计 | 原型里已有明确页面、操作入口、状态反馈或弹层。 |
| 入口级 | 原型有导航或按钮入口，但没有展开完整列表、表单、异常态。 |
| 待补 | 当前原型没有对应界面，需要新增页面或交互。 |
| 需探测 | 依赖服务端能力、授权或配置，UI 需要先做能力检测和降级。 |

## 全量矩阵

| PRD 模块 | 页面/区域 | 接口 | 当前覆盖 | 需要补充的交互 |
| --- | --- | --- | --- | --- |
| 9.1 服务端连接与账号 | 登录页、服务端配置、会话管理 | `GET /api-info`<br>`POST /auth/rsa`<br>`POST /auth/login`<br>`POST /auth/refresh`<br>`GET /gateway/userInfo`<br>`POST /auth/auth_code` | 待补 | 新增首次连接页、服务端地址检测、登录表单、版本兼容提示、token 刷新失败回登录、auth_code 失效重试提示。 |
| 9.2 照片时间线 | 照片时间线、月份栏、照片墙、最近添加 | `GET /gateway/timeline`<br>`GET /gateway/filesInTimelineCount`<br>`POST /gateway/timelineMonth`<br>`GET /gateway/filesInTimelineV2`<br>`POST /gateway/dayFiles`<br>`POST /gateway/dayFileMore`<br>`GET /gateway/{type}/{md5}`<br>`GET /gateway/recentFiles` | 已设计 | 需要补真实 loading、空月、分页加载更多、缩略图失败、虚拟滚动占位、图库切换刷新态。 |
| 9.3 文件预览 | 图片/视频/Live Photo 预览器 | `GET /gateway/file/{id}/{md5}`<br>`GET /gateway/{type}/{md5}`<br>`GET /gateway/fileDownload/{id}/{md5}`<br>`GET /gateway/flv/{id}/{md5}`<br>`POST /gateway/transcode`<br>`POST /gateway/getTranscodeError`<br>`GET /gateway/fileMotion/{id}/{md5}`<br>`POST /gateway/livePhotoMovCheck` | 已设计 / 入口级 | 图片预览已设计；需要补视频播放器、转码中/失败原因、Live Photo 动图切换、原图下载统计、媒体授权失效重试。 |
| 9.4 文件详情与编辑 | 右侧详情面板、文件编辑弹窗 | `GET /gateway/fileInfoById/{id}`<br>`GET /gateway/fileInfo/{id}/{md5}`<br>`GET /gateway/exifInfo/{id}`<br>`GET /gateway/fileInfoRT/{id}`<br>`GET /gateway/ocrInfo/{id}`<br>`POST /gateway/updateFileDate`<br>`POST /gateway/updateFileName`<br>`POST /gateway/editFileExtra`<br>`POST /gateway/editFileGps`<br>`POST /gateway/resetFileGps`<br>`POST /gateway/editFileRotate` | 已设计 / 入口级 | 详情展示已设计；需要补拍摄日期、文件名、描述、GPS、旋转编辑表单，以及保存中、保存失败、权限不足状态。 |
| 9.5 搜索 | 搜索页、全局搜索、CLIP 语义搜索、高级筛选 | `POST /gateway/searchTips`<br>`POST /gateway/search`<br>`POST /gateway/searchV2`<br>`POST /gateway/searchResultTipsBox`<br>`POST /gateway/extra/make`<br>`POST /gateway/extra/models`<br>`GET /gateway/extra/models`<br>`POST /gateway/extra/lens`<br>`GET /gateway/extra/lens`<br>`POST /gateway/extra/placeL1`<br>`POST /gateway/extra/placeL2`<br>`POST /gateway/extra/placeL3`<br>`POST /gateway/CLIP_status`<br>`POST /gateway/searchCLIP`<br>`POST /gateway/searchCLIPV2` | 入口级 / 需探测 | 需要补搜索建议下拉、结果页、无结果、搜索历史、高级筛选抽屉、CLIP 能力检测、不支持原因、语义搜索结果继续筛选。 |
| 9.6 相册 | 相册列表、相册详情、相册编辑、自动相册 | `GET /api-album`<br>`POST /api-album`<br>`GET /api-album/{id}`<br>`PATCH /api-album/{id}`<br>`PUT /api-album/{id}`<br>`DELETE /api-album/{id}`<br>`GET /api-album/filesV2/{id}`<br>`GET /api-album/filesFlat/{id}`<br>`POST /api-album/addFileToAlbum`<br>`POST /api-album/removeFileFromAlbum`<br>`GET /api-album/fileInAlbumsList/{id}`<br>`GET /api-album/link/{id}`<br>`POST /api-album/link/{id}`<br>`DELETE /api-album/link/{id}`<br>`POST /api-album/linkSyncFiles/{id}` | 已设计 / 入口级 | 相册卡片和加入相册入口已设计；需要补相册详情、编辑/删除确认、移除文件、设置封面、自动相册规则、规则同步结果。 |
| 9.7 标签 | 标签页、文件标签、批量标签 | `GET /api-tag`<br>`POST /api-tag`<br>`GET /api-tag/tag/{id}`<br>`PATCH /api-tag/tag/{id}`<br>`PUT /api-tag/tag/{id}`<br>`POST /api-tag/hideTag`<br>`POST /api-tag/hideEmptyTags`<br>`GET /gateway/fileTags/{id}`<br>`POST /api-tag/editFileTag`<br>`POST /api-tag/fileAddTags`<br>`POST /api-tag/fileDelTagsInDb`<br>`POST /api-tag/saveToExif` | 入口级 | 右侧标签展示和批量标签入口已设计；需要补标签管理页、隐藏空标签、文件标签编辑、批量加/删、写入 EXIF 进度和失败列表。 |
| 9.8 分享 | 分享管理、创建分享、分享给我、相册分享、文件分享 | `GET /api-share`<br>`GET /api-share/{id}`<br>`GET /api-share/shareToMe`<br>`GET /api-share/albumInfo/{albumId}`<br>`GET /api-share/albumFiles/{albumId}`<br>`GET /api-share/albumFilesFlat/{albumId}`<br>`POST /api-share`<br>`PATCH /api-share/{id}`<br>`PUT /api-share/{id}`<br>`DELETE /api-share/{id}`<br>`POST /api-share/createFilesLink`<br>`POST /api-share/getFilesLink/{id}`<br>`POST /api-share/updateFilesLink/{id}`<br>`POST /api-share/delFilesLink/{id}`<br>`POST /api-share/filesLink/list`<br>`POST /api-share/filesLink/list/{id}` | 已设计 / 入口级 | 创建文件分享和分享列表已设计；需要补分享详情、分享给我、相册分享协作者、编辑分享、删除分享、文件链接列表、复制失败和过期态。 |
| 9.9 上传 | 上传中心、分块上传、分享链接内上传 | `POST /gateway/checkPathForUpload`<br>`POST /gateway/upload`<br>`POST /gateway/uploadV2`<br>`POST /gateway/scanAfterUpload`<br>`POST /gateway/uploadChunk/check`<br>`POST /gateway/uploadChunk/upload`<br>`POST /gateway/uploadChunk/uploadWeb`<br>`POST /gateway/uploadChunk/uploadBin`<br>`POST /gateway/uploadChunk/merge`<br>`POST /gateway/uploadChunk/mergeStatus`<br>`POST /gateway/uploadForShare`<br>`POST /gateway/uploadChunk/checkInShare`<br>`POST /gateway/uploadChunk/uploadWebInShare`<br>`POST /gateway/uploadChunk/mergeInShare`<br>`POST /gateway/uploadChunk/mergeStatusForShare`<br>`POST /gateway/scanAfterUploadInShare` | 已设计 / 入口级 | 上传队列和进度已设计；需要补重复检查结果、小文件/大文件策略、分块失败重试、merge 轮询、扫描完成统计、分享链接内上传独立页。 |
| 9.10 下载 | 单文件下载、批量下载、打包任务 | `GET /gateway/fileDownload/{id}/{md5}`<br>`POST /gateway/fileDownloadStat/{id}/{md5}`<br>`POST /gateway/filesInfo`<br>`GET /gateway/fileZIP/{downloadKey}` | 入口级 | 需要补下载中心、单文件下载状态、批量打包中、打包失败、下载记录、文件大小预估。 |
| 9.11 地图 | 地图页、地区照片 | `GET /gateway/mapType`<br>`GET /gateway/mapCenter`<br>`GET /gateway/mapboxToken`<br>`GET /gateway/maptilerToken`<br>`GET /gateway/allFilesForMap`<br>`GET /gateway/allFilesForMapDirect`<br>`GET /gateway/addressCountByCity`<br>`GET /gateway/addressCountByDistrict/{city}`<br>`GET /gateway/addressCountByTownship/{city}/{district}`<br>`GET /gateway/filesInAddress`<br>`GET /gateway/filesInAddressV2` | 待补 / 需探测 | 需要补地图 provider 探测、token 缺失降级、地图聚合点、城市/区县/街道列表、地区照片结果页。 |
| 9.12 人物 | 人物列表、人物详情、人物管理 | `GET /gateway/peopleList`<br>`GET /gateway/people/{id}`<br>`GET /gateway/peopleFileList`<br>`GET /gateway/peopleFileListV2`<br>`PATCH /gateway/people/{id}`<br>`PUT /gateway/people/{id}`<br>`POST /gateway/people/merge`<br>`POST /gateway/people/split/{id}`<br>`POST /gateway/multiHidePeople`<br>`PATCH /gateway/reassignPeopleFile/{id}` | 待补 / 需探测 | 需要补人脸能力检测、人物头像墙、人物详情照片墙、改名、合并、拆分、隐藏、重新分配照片。 |
| 9.13 隐私相册 | 隐私相册验证、隐私文件管理 | `POST /gateway/passwordCode`<br>`POST /gateway/filesInHide`<br>`POST /gateway/hideFiles`<br>`POST /gateway/cancelHideFiles` | 待补 | 需要补隐私验证弹窗、锁定后重验、隐私相册照片墙、移入/移出隐私、退出清缓存提示。 |
| 9.14 相似照片清理 | 相似照片组、保留项选择、忽略/删除 | `POST /gateway/findSimilarFiles`<br>`POST /gateway/deleteSimilarFiles`<br>`POST /gateway/hideSimilarFiles`<br>`POST /gateway/cancelHideSimilarFiles`<br>`POST /gateway/similarFilesInHide` | 待补 | 需要补相似组对比视图、默认保留建议、用户选择保留项、删除确认、忽略/取消忽略、隐藏相似组。 |
| 9.15 回收站 | 回收站列表、恢复、永久删除 | `GET /gateway/filesInTrashFlat`<br>`PATCH /gateway/files`<br>`PUT /gateway/files`<br>`POST /gateway/deleteFilesPermanently`<br>`GET /gateway/deleteFilesPermanentlyStatus` | 已设计 / 入口级 | 回收站入口和删除确认已设计；需要补回收站列表真实状态、恢复结果、永久删除强确认、永久删除轮询进度。 |
| 9.16 文件夹视图 | 文件夹树、文件夹管理、整理任务 | `GET /gateway/folders/root`<br>`GET /gateway/folders/{id}`<br>`GET /gateway/foldersV2/{id}`<br>`GET /gateway/folderFiles/{id}`<br>`GET /gateway/folderBreadcrumbs/{id}`<br>`POST /gateway/folders/create`<br>`POST /gateway/folderPathEdit`<br>`PATCH /gateway/setFolderCover/{id}`<br>`POST /gateway/folder_files_move/preview`<br>`POST /gateway/folder_files_move/move`<br>`POST /gateway/folder_files_move/status`<br>`POST /gateway/folders/delete_empty` | 待补 | 需要补文件夹树、面包屑、文件夹照片墙、创建/重命名/移动、设置封面、整理预览、移动进度、删除空文件夹确认。 |
| 10.1 图库管理 | 管理中心/图库管理 | `GET /gallery`<br>`GET /gallery/all`<br>`POST /gallery`<br>`GET /gallery/{id}`<br>`PATCH /gallery/{id}`<br>`DELETE /gallery/{id}`<br>`GET /gallery/stat/{id}`<br>`GET /gallery/scan/{id}`<br>`POST /gallery/findDuplicateFiles`<br>`POST /gallery/skippedFolderLogs` | 已设计 / 入口级 | 管理中心浮层和图库扫描列表已设计；需要补创建/编辑/删除图库、图库统计、扫描状态、重复文件、跳过日志。 |
| 10.2 用户管理 | 管理中心/用户管理 | `POST /users`<br>`GET /users`<br>`GET /users/{id}`<br>`PATCH /users/{id}`<br>`DELETE /users/{id}`<br>`PATCH /users/resetPwd/{id}`<br>`GET /users/userIdNameList` | 入口级 | 需要补用户表格、新建/编辑/删除、重置密码、权限隔离、用户选择器。 |
| 10.3 API Key 管理 | 设置/API Key、管理中心/API Key | `GET /api-keys`<br>`POST /api-keys`<br>`GET /api-keys/{id}`<br>`PATCH /api-keys/{id}`<br>`DELETE /api-keys/{id}`<br>`POST /api-keys/{id}/regenerate`<br>`GET /api-keys-admin`<br>`POST /api-keys-admin`<br>`GET /api-keys-admin/{id}`<br>`PATCH /api-keys-admin/{id}`<br>`DELETE /api-keys-admin/{id}`<br>`POST /api-keys-admin/{id}/regenerate` | 待补 | 需要补个人 API Key 列表、管理员 API Key 列表、新建、编辑、删除、重新生成、密钥只展示一次。 |
| 10.4 后台任务 | 管理中心/任务监控 | `GET /fileTask/jobs/active`<br>`GET /fileTask/jobs/completed`<br>`GET /fileTask/jobs/waiting`<br>`GET /fileTask/jobs/paused`<br>`GET /fileTask/jobs/failed`<br>`GET /fileTask/jobs/Counts`<br>`GET /fileTask/job/subData`<br>`GET /fileTask/{id}`<br>`POST /fileTask/jobs/pause`<br>`POST /fileTask/jobs/resume` | 入口级 | 需要补任务状态 tabs、任务数量统计、任务详情、子数据、失败原因、暂停/恢复队列。 |
| 10.5 系统状态与配置 | 管理中心/系统状态、设置/授权 | `POST /system-config/systemStatus`<br>`GET /system-config`<br>`PATCH /system-config`<br>`GET /system-config/{key}`<br>`POST /system-config/patchMulti`<br>`POST /system-config/getLogs`<br>`POST /system-config/clearLogs`<br>`POST /system-config/test/ocrApi`<br>`POST /system-config/db/prepareCLIP`<br>`POST /system-config/dbReIndex`<br>`POST /system-config/dbReIndexInfo`<br>`GET /gateway/licenseInfo`<br>`POST /gateway/bindLicense`<br>`POST /gateway/verifyAuthOnline` | 入口级 / 需探测 | 需要补系统状态卡片、配置表单、日志查看/清空、OCR 测试、CLIP 准备、索引重建进度、授权状态、绑定授权、在线验证。 |

## 当前原型已覆盖的产品体验

- 主工作台结构：左侧导航、顶部工具栏、中心照片墙、右侧详情面板。
- 照片时间线：月份栏、日期分组、照片卡片、选择态、视图切换。
- 预览器：双击预览、上一张/下一张、缩放、旋转、详情。
- 批量操作：加入相册、添加标签、下载、分享、删除入口。
- 分享：创建分享弹窗，含描述、过期时间、密码、EXIF、下载权限。
- 上传：上传中心抽屉、拖拽区域、上传队列、玻璃进度条。
- 回收站：删除确认、回收站入口。
- 管理中心：图库扫描/任务/用户/系统配置的统一浮层入口。
- 搜索：全局搜索框、命令面板、CLIP 入口。
- 主题：12 主题切换、右下角彩蛋 FAB。

## 下一步补设计建议

1. 先补 V1.0 必需但当前缺口大的页面：登录/服务端配置、搜索结果页、文件编辑弹窗、下载中心、相册详情。
2. 再补 V1.1 整理增强：高级筛选、标签管理、隐私相册、相似照片、文件夹视图。
3. 再补 V1.2 智能浏览：人物页、地图页、CLIP 不支持/处理中/失败降级态。
4. 最后补 V1.3 管理中心细页：图库、用户、API Key、后台任务、系统配置、日志和授权。

