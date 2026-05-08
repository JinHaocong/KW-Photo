# MT Photos API 本地接口文档

> 生成时间：2026年5月8日 15:24:42（Asia/Shanghai）
> 文档壳页：https://mtmt.tech/api/
> OpenAPI 快照来源：https://demo.mtmt.tech/api-json
> 服务信息来源：https://demo.mtmt.tech/api-info?type=all

## 快照信息

- OpenAPI 版本：3.0.0
- 服务端版本：1.51.0 (7760A)
- Path 数量：371
- Operation 数量：418
- Schema 数量：27
- 本地 JSON 快照：`design/mt-photos-openapi.snapshot.json`

## 使用说明

- 这份文档根据 OpenAPI JSON 自动生成，适合本地快速查接口、字段和鉴权要求。
- `https://mtmt.tech/api/` 是文档壳页；接口结构以 `https://demo.mtmt.tech/api-json` 快照为准。
- 实际运行时 API Base URL 可由应用配置切换，不应写死为 demo 域名。
- 若后续需要确认最新接口，请重新拉取 OpenAPI JSON 并重新生成本文件。

## 模块索引

| 模块 | 接口数 |
| --- | ---: |
| gateway - 前端API请求主要的入口 | 188 |
| api-share 分享管理 | 38 |
| api-album 相册 | 26 |
| system-config - 系统配置 | 23 |
| gallery 仅限管理员调用 | 21 |
| fileTask 仅限管理员调用 | 17 |
| install-初始化 | 17 |
| api-tag 标签管理 | 13 |
| files 仅限管理员调用 | 12 |
| people-base 仅限管理员调用 | 12 |
| people-descriptor 仅限管理员调用 | 11 |
| users 仅限管理员调用 | 8 |
| API Key 管理 | 6 |
| API Key管理 - 仅限管理员调用 | 6 |
| people 仅限管理员调用 | 6 |
| 服务端信息+用户登录 | 5 |
| folder 仅限管理员调用 | 5 |
| file-delete-log - 文件删除日志 | 4 |

## 文件处理状态字段

以下字段来自 `File` schema。它们是文件处理状态，不是文件夹卡片状态。

| 字段 | 说明 |
| --- | --- |
| status | 文件处理状态：0未处理，1处理中，2处理成功，-1出错，-10已删除 |
| proxyStatus | 代理文件状态：0未处理，1处理中，2已处理，12忽略，-1出错 |
| previewStatus | 预览状态：0未处理，1处理中，2已处理，-1出错 |
| peopleDescriptorStatus | 人脸描述符状态：0未处理，1处理中，2已处理，-1出错 |
| categoryStatus | 场景分类状态：0未处理，1处理中，2已处理，-1出错 |
| ocrStatus | OCR状态：0未处理，1处理中，2已处理，-1出错 |
| clipStatus | CLIP特征状态：0未处理，1处理中，2已处理，-1出错 |
| transcodeStatus | 转码状态：0未处理，1处理中，2已处理，12忽略，-1出错 |
| similarStatus | 相似图状态：0未处理，1处理中，2已处理，-1出错 |

## 接口列表

### gateway - 前端API请求主要的入口

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/gateway/test` | 测试接口 | api-key；Bearer Token |
| `GET` | `/gateway/userInfo` | 用户信息-当前登录用户 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTimeline` | 所有文件 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTimelineV2` | 所有文件-时间线 | api-key；Bearer Token |
| `GET` | `/gateway/timeline` | 照片-时间线按月分组统计数 | api-key；Bearer Token |
| `POST` | `/gateway/timelineMonth` | 照片-时间线 月数据 | api-key；Bearer Token |
| `GET` | `/gateway/myGalleryList` | 用户的图库列表 | api-key；Bearer Token |
| `POST` | `/gateway/galleryNames` | 获取图库名称 | api-key；Bearer Token |
| `POST` | `/gateway/dayFileMore` | 单天剩余文件 | api-key；Bearer Token |
| `POST` | `/gateway/dayFiles` | 某一天的所有文件 | api-key；Bearer Token |
| `POST` | `/gateway/filesInfo` | 下载前查询文件信息 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTimelineCount` | 时间线中所有文件的数量 | api-key；Bearer Token |
| `POST` | `/gateway/folderFilesInDisk` | 查看文件夹文件 - 实时读取硬盘文件列表 | api-key；Bearer Token |
| `POST` | `/gateway/annualData` | 获取年度统计数据 | api-key；Bearer Token |
| `POST` | `/gateway/refreshFileDescriptorBatch` | 刷新照片人脸 | api-key；Bearer Token |
| `POST` | `/gateway/getTranscodeError` | 查询转码错误信息 | api-key；Bearer Token |
| `POST` | `/gateway/addFaceRect` | 手动添加人脸识别框 | api-key；Bearer Token |
| `GET` | `/gateway/fileInfo/{id}/{md5}` | 显示文件的详细信息 | api-key；Bearer Token |
| `GET` | `/gateway/fileInfoById/{id}` | 显示文件的详细信息 | api-key；Bearer Token |
| `GET` | `/gateway/exifInfo/{id}` | 显示文件的exif信息 | api-key；Bearer Token |
| `GET` | `/gateway/fileTags/{id}` | 文件的标签列表 | api-key；Bearer Token |
| `POST` | `/gateway/extra/make` | 获取照片包含的相机品牌列表 | api-key；Bearer Token |
| `GET` | `/gateway/extra/models` | 获取照片包含的设备列表 | api-key；Bearer Token |
| `POST` | `/gateway/extra/models` | 获取照片包含的设备列表 | api-key；Bearer Token |
| `GET` | `/gateway/extra/lens` | 获取照片包含的镜头列表 | api-key；Bearer Token |
| `POST` | `/gateway/extra/lens` | 获取照片包含的镜头列表 | api-key；Bearer Token |
| `POST` | `/gateway/extra/placeL1` | 获取地点列表 - 省 | api-key；Bearer Token |
| `POST` | `/gateway/extra/placeL2` | 获取地点列表 - 市 | api-key；Bearer Token |
| `POST` | `/gateway/extra/placeL3` | 获取地点列表 - 区 | api-key；Bearer Token |
| `GET` | `/gateway/ocrInfo/{id}` | 显示文件的OCR结果 | api-key；Bearer Token |
| `POST` | `/gateway/filesPath` | 获取指定ids文件的地址 | api-key；Bearer Token |
| `POST` | `/gateway/filesInMD5` | 根据MD5查询文件列表 | api-key；Bearer Token |
| `GET` | `/gateway/refreshFileThumbs/{id}` | 刷新文件的缩略图 | api-key；Bearer Token |
| `POST` | `/gateway/uploadFileThumbs/{id}` | 上传文件缩略图 | api-key；Bearer Token |
| `POST` | `/gateway/uploadFileThumbsForApp/{id}` | App上传文件缩略图 | api-key；Bearer Token |
| `POST` | `/gateway/HDThumbsConfig` | 获取高清缩略图配置 | api-key；Bearer Token |
| `POST` | `/gateway/uploadFileHDThumbs/{id}` | 上传高清缩略图 | api-key；Bearer Token |
| `POST` | `/gateway/transcode` | 触发视频转码 | api-key；Bearer Token |
| `GET` | `/gateway/fileInfoRT/{id}` | 获取文件最新EXIF信息 | api-key；Bearer Token |
| `POST` | `/gateway/refreshFileDescriptor` | 刷新照片人脸 | api-key；Bearer Token |
| `POST` | `/gateway/fileStat/{id}/{md5}` | 检查文件是否存在 | api-key；Bearer Token |
| `GET` | `/gateway/fileStreamLink/{id}` | 获取串流地址 | api-key；Bearer Token |
| `GET` | `/gateway/stream/{auth_code}/{name}` | 下载文件原图 | api-key；Bearer Token |
| `GET` | `/gateway/streamV2/{name}` | 下载文件原图V2 | api-key；Bearer Token |
| `GET` | `/gateway/file/{id}/{md5}` | 显示文件原图 | api-key；Bearer Token |
| `GET` | `/gateway/fileForApi/{id}/{md5}` | 显示文件的大图 - 已废弃 | api-key；Bearer Token |
| `GET` | `/gateway/fileMotion/{id}/{md5}` | 显示动态照片的视频部分 | api-key；Bearer Token |
| `GET` | `/gateway/flv/{id}/{md5}` | 视频实时转码为flv | api-key；Bearer Token |
| `GET` | `/gateway/jpeg/{md5}` | 显示heic图片的详情 | api-key；Bearer Token |
| `GET` | `/gateway/fileDownload/{id}/{md5}` | 下载文件的原图 | api-key；Bearer Token |
| `POST` | `/gateway/fileDownloadStat/{id}/{md5}` | 获取下载文件的大小 | api-key；Bearer Token |
| `GET` | `/gateway/fileZIP/{downloadKey}` | 打包下载文件 | api-key；Bearer Token |
| `GET` | `/gateway/addressCountByCity` | 以市为单位的照片数量 | api-key；Bearer Token |
| `GET` | `/gateway/addressCountByDistrict/{city}` | 以区、县为单位的照片数量 | api-key；Bearer Token |
| `GET` | `/gateway/addressCountByTownship/{city}/{district}` | 以村、街道为单位的照片数量 | api-key；Bearer Token |
| `GET` | `/gateway/filesInAddress` | 对应地区下的所有照片 | api-key；Bearer Token |
| `GET` | `/gateway/filesInAddressV2` | 对应地区下的所有照片 | api-key；Bearer Token |
| `GET` | `/gateway/classifyTopList` | 按事物场景分类 | api-key；Bearer Token |
| `GET` | `/gateway/classifyFileList` | 按事物场景分类-文件列表 | api-key；Bearer Token |
| `POST` | `/gateway/editFileClassify` | 修改文件智能分类属性 | api-key；Bearer Token |
| `GET` | `/gateway/filesInCategoriesV2` | 按类型分类的文件列表 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTrash` | 回收站中的文件 - 已废弃 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTrashV2` | 回收站中的文件 - 已废弃 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTrashFlat` | 回收站中的文件 | api-key；Bearer Token |
| `POST` | `/gateway/findSimilarFiles` | 查找相似文件 | api-key；Bearer Token |
| `GET` | `/gateway/filesInTrashAdmin` | 管理员-查看全部用户在回收站中的文件 | api-key；Bearer Token |
| `POST` | `/gateway/findFilesWithInvalidGps` | 管理员-查看无法识别的GPS坐标 | api-key；Bearer Token |
| `POST` | `/gateway/hideFiles` | 添加照片到隐私相册中 | api-key；Bearer Token |
| `POST` | `/gateway/cancelHideFiles` | 从隐私相册内移出 | api-key；Bearer Token |
| `POST` | `/gateway/passwordCode` | 验证用户密码，验证通过后返回passwordCode 用于访问 /gateway/filesInHide | api-key；Bearer Token |
| `POST` | `/gateway/filesInHide` | 隐私相册中的照片 | api-key；Bearer Token |
| `GET` | `/gateway/recentFiles` | 最近添加的文件 | api-key；Bearer Token |
| `GET` | `/gateway/peopleList` | 人物列表 | api-key；Bearer Token |
| `GET` | `/gateway/people/{id}` | 人物详情 | api-key；Bearer Token |
| `PUT` | `/gateway/people/{id}` | 修改人物详情 - patch兼容 | api-key；Bearer Token |
| `PATCH` | `/gateway/people/{id}` | 修改人物详情 | api-key；Bearer Token |
| `POST` | `/gateway/multiHidePeople` | 一键显示或隐藏人物 | api-key；Bearer Token |
| `POST` | `/gateway/peopleNames` | 获取人物名称 | api-key；Bearer Token |
| `PUT` | `/gateway/reassignPeopleFile/{id}` | 修改人物详情 - patch兼容 | api-key；Bearer Token |
| `PATCH` | `/gateway/reassignPeopleFile/{id}` | 修改人物详情 | api-key；Bearer Token |
| `POST` | `/gateway/editFileDescriptor` | 修改人物详情 | api-key；Bearer Token |
| `GET` | `/gateway/peopleFileList` | 人物关联的文件列表 | api-key；Bearer Token |
| `GET` | `/gateway/peopleFileListV2` | 人物关联的文件列表 | api-key；Bearer Token |
| `GET` | `/gateway/peopleDescriptorList` | 人脸特征列表 - 管理员可调用 | api-key；Bearer Token |
| `GET` | `/gateway/descriptorDistanceList` | 特征相似度列表 - 管理员可调用 | api-key；Bearer Token |
| `GET` | `/gateway/cache` | cache value - 管理员可调用 | api-key；Bearer Token |
| `GET` | `/gateway/peopleInFileInfo` | 照片识别的人脸信息 | api-key；Bearer Token |
| `POST` | `/gateway/people/merge` | 合并人物 | api-key；Bearer Token |
| `POST` | `/gateway/people/split/{id}` | 拆分人物 | api-key；Bearer Token |
| `POST` | `/gateway/people/distance` | 计算people下descriptor的distance - 管理员可调用 | api-key；Bearer Token |
| `PUT` | `/gateway/files` | 从回收站恢复 - patch兼容 | api-key；Bearer Token |
| `PATCH` | `/gateway/files` | 从回收站恢复 | api-key；Bearer Token |
| `DELETE` | `/gateway/files` | 删除 | api-key；Bearer Token |
| `POST` | `/gateway/deleteFilesPermanently` | 从回收站删除 | api-key；Bearer Token |
| `GET` | `/gateway/deleteFilesPermanentlyStatus` | 获取永久删除文件状态 | api-key；Bearer Token |
| `POST` | `/gateway/deleteSimilarFiles` | 删除相似文件 | api-key；Bearer Token |
| `POST` | `/gateway/hideSimilarFiles` | 忽略相似照片 | api-key；Bearer Token |
| `POST` | `/gateway/cancelHideSimilarFiles` | 取消忽略相似照片 | api-key；Bearer Token |
| `POST` | `/gateway/similarFilesInHide` | 忽略相似照片列表 | api-key；Bearer Token |
| `POST` | `/gateway/user/pwd` | 修改自己的密码 | api-key；Bearer Token |
| `POST` | `/gateway/user/delete` | 用户申请注销账号 | api-key；Bearer Token |
| `POST` | `/gateway/user/cover` | 自定义 自动相册的封面 | api-key；Bearer Token |
| `POST` | `/gateway/otp/generate` | 生成双因素认证 | api-key；Bearer Token |
| `POST` | `/gateway/otp/verify` | 验证双因素认证 | api-key；Bearer Token |
| `POST` | `/gateway/otp/disable` | 禁用双因素认证 | api-key；Bearer Token |
| `GET` | `/gateway/lang` | 获取系统语言 | api-key；Bearer Token |
| `GET` | `/gateway/mapCenter` | 获取mapbox 的 accessToken | api-key；Bearer Token |
| `GET` | `/gateway/mapboxToken` | 获取mapbox 的 accessToken | api-key；Bearer Token |
| `GET` | `/gateway/maptilerToken` | 获取maptiler 的 accessToken | api-key；Bearer Token |
| `GET` | `/gateway/mapType` | 获取地图的类型 | api-key；Bearer Token |
| `GET` | `/gateway/staticmap/amap/{location}` | 获取高德静态地图url | api-key；Bearer Token |
| `GET` | `/gateway/amap/test/{key}/{secret}` | 测试高德开放平台api key 私钥是否有效 | api-key；Bearer Token |
| `GET` | `/gateway/qqmap/test/{key}/{secret}` | 测试腾讯地图api key 私钥是否有效 | api-key；Bearer Token |
| `GET` | `/gateway/tianmap/test/{key}` | 测试天地图api key是否有效 | api-key；Bearer Token |
| `GET` | `/gateway/mapbox/test/{token}` | 测试 mapbox api key 是否有效 | api-key；Bearer Token |
| `GET` | `/gateway/maptiler/test/{token}` | 测试 maptilerapi key 是否有效 | api-key；Bearer Token |
| `GET` | `/gateway/allFilesForMap` | 地图上的照片 | api-key；Bearer Token |
| `GET` | `/gateway/allFilesForMapDirect` | 地图上的照片-原始坐标 | api-key；Bearer Token |
| `POST` | `/gateway/areaFilesMD5` | 根据文件ID列表获取文件信息 | api-key；Bearer Token |
| `POST` | `/gateway/fileInIds` | 根据文件ID列表获取文件详情 | api-key；Bearer Token |
| `POST` | `/gateway/enableFileBackup` | 启用文件备份功能 | api-key；Bearer Token |
| `POST` | `/gateway/changeAppUploadStatus` | 通知服务器是否在备份文件 | api-key；Bearer Token |
| `POST` | `/gateway/checkFileId` | 判断文件是否存在 | api-key；Bearer Token |
| `POST` | `/gateway/resetFileStatus` | 请求重置异常状态文件 | api-key；Bearer Token |
| `GET` | `/gateway/backupDist/root` | 备份目的地-根目录 | api-key；Bearer Token |
| `GET` | `/gateway/backupDist/sub` | 备份目的地-子目录 | api-key；Bearer Token |
| `GET` | `/gateway/backupDist/refresh` | 备份目的地-刷新 | api-key；Bearer Token |
| `POST` | `/gateway/backupDist/verify` | 备份目的地-验证 | api-key；Bearer Token |
| `POST` | `/gateway/checkPathForUpload` | 上传文件前，检查文件在服务端是否存在 | api-key；Bearer Token |
| `POST` | `/gateway/upload` | 上传文件 - multipart方式 | api-key；Bearer Token |
| `POST` | `/gateway/uploadForShare` | 上传文件 - multipart方式 - 网页分享链接 | api-key；Bearer Token |
| `POST` | `/gateway/uploadV2` | 上传文件 - Binary方式 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/check` | 上传文件 - 分块上传前检查 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/checkInShare` | 分块上传-检查(分享链接) | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/upload` | 分块上传 - multipart | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/merge` | 分块上传 - 完成后触发合并文件 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/mergeStatus` | 分块上传 - 获取合并进度状态 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/mergeInShare` | 分块上传 - 完成后触发合并文件 - 分享链接中 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/mergeStatusForShare` | 分块上传 - 获取合并进度状态 - 分享链接中使用 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/uploadBin` | 分块上传 - 上传文件-binary content 上传方式 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/uploadWeb` | 分块上传-网页端 | api-key；Bearer Token |
| `POST` | `/gateway/uploadChunk/uploadWebInShare` | 分块上传-网页端(分享链接) | api-key；Bearer Token |
| `POST` | `/gateway/echo` | 测试回显 | api-key；Bearer Token |
| `GET` | `/gateway/licenseInfo` | 订阅信息 - 管理员可调用 | api-key；Bearer Token |
| `GET` | `/gateway/trail` | 开始试用 - 管理员可调用 | api-key；Bearer Token |
| `POST` | `/gateway/bindLicense` | 使用激活码-添加订阅 - 管理员可调用 | api-key；Bearer Token |
| `POST` | `/gateway/verifyAuthOnline` | 触发联网验证 - 管理员可调用 | api-key；Bearer Token |
| `POST` | `/gateway/coordinate/convert` | gps坐标转为autonavi | api-key；Bearer Token |
| `POST` | `/gateway/coordinate/parse` | 自动处理从 腾讯、高德地图坐标拾取器中粘贴的值 | api-key；Bearer Token |
| `GET` | `/gateway/folders/root` | 文件夹视图-顶级 | api-key；Bearer Token |
| `GET` | `/gateway/folderInfo/{id}` | 文件夹-信息 | api-key；Bearer Token |
| `GET` | `/gateway/folderSubFile/{id}` | 文件夹-获取当前及下级文件夹文件 id、MD5 | api-key；Bearer Token |
| `POST` | `/gateway/folderAutoCover/{id}` | 文件夹-自动设置空封面的文件夹，显示下级文件夹的文件 | api-key；Bearer Token |
| `GET` | `/gateway/folders/{id}` | 文件夹视图-文件夹详情 | api-key；Bearer Token |
| `GET` | `/gateway/foldersV2/{id}` | 文件夹视图-文件夹详情 | api-key；Bearer Token |
| `GET` | `/gateway/folderFiles/{id}` | 文件夹视图-文件夹详情-文件列表 | api-key；Bearer Token |
| `GET` | `/gateway/folderBreadcrumbs/{id}` | 文件夹地址的面包屑 | api-key；Bearer Token |
| `POST` | `/gateway/folders/create` | 文件夹视图-新建文件夹 | api-key；Bearer Token |
| `POST` | `/gateway/folderPathEdit` | 文件夹视图-重命名、移动、删除 | api-key；Bearer Token |
| `POST` | `/gateway/filePathEdit` | 文件路径编辑 | api-key；Bearer Token |
| `POST` | `/gateway/folder_files_move/preview` | 整理文件夹下的文件 - 预览移动路径 | api-key；Bearer Token |
| `POST` | `/gateway/folder_files_move/move` | 整理文件夹下的文件 - 移动文件 | api-key；Bearer Token |
| `POST` | `/gateway/folders/delete_empty` | 删除文件夹下面的 空文件夹 | api-key；Bearer Token |
| `POST` | `/gateway/folder_files_move/status` | 整理文件夹 获取处理进度 | api-key；Bearer Token |
| `PUT` | `/gateway/setFolderCover/{id}` | 修改文件夹封面 - 兼容PATCH | api-key；Bearer Token |
| `PATCH` | `/gateway/setFolderCover/{id}` | 修改文件夹封面 | api-key；Bearer Token |
| `POST` | `/gateway/scanAfterUpload` | 更新刚上传的文件的状态 | api-key；Bearer Token |
| `POST` | `/gateway/scanAfterUploadInShare` | 更新刚上传的文件的状态 - 分享的链接中 | api-key；Bearer Token |
| `POST` | `/gateway/folderDebugInfo` | 获取文件夹的调试信息 - 管理员可调用 | api-key；Bearer Token |
| `POST` | `/gateway/updateFileDate` | 更新文件的拍摄日期 | api-key；Bearer Token |
| `POST` | `/gateway/updateFileName` | 修改文件的名称 | api-key；Bearer Token |
| `POST` | `/gateway/editFileExtra` | 编辑文件额外信息 | api-key；Bearer Token |
| `POST` | `/gateway/editFileGps` | 编辑文件GPS信息 | api-key；Bearer Token |
| `POST` | `/gateway/resetFileGps` | 重置文件GPS信息 | api-key；Bearer Token |
| `POST` | `/gateway/editFileRotate` | 旋转文件 | api-key；Bearer Token |
| `POST` | `/gateway/searchTips` | 搜索提示 | api-key；Bearer Token |
| `POST` | `/gateway/search` | 搜索 | api-key；Bearer Token |
| `POST` | `/gateway/searchCLIP` | 搜索-CLIP | api-key；Bearer Token |
| `POST` | `/gateway/searchV2` | 搜索-v2 | api-key；Bearer Token |
| `POST` | `/gateway/searchResultTipsBox` | 搜索结果提示框 | api-key；Bearer Token |
| `POST` | `/gateway/searchCLIPV2` | 搜索-CLIP | api-key；Bearer Token |
| `POST` | `/gateway/memory` | 那年今日 | api-key；Bearer Token |
| `POST` | `/gateway/memoryWeekFileList` | 往年照片 - 一周 - 文件列表 | api-key；Bearer Token |
| `POST` | `/gateway/CLIP_status` | 是否可以用使用CLIP搜索 | api-key；Bearer Token |
| `POST` | `/gateway/nongLi` | 获取阳历日期的农历日期 | api-key；Bearer Token |
| `POST` | `/gateway/livePhotoMovCheck` | 检查livePhoto视频部分是否正确 | api-key；Bearer Token |
| `POST` | `/gateway/uploadForLivePhotoMov/{photoMD5}/{videoMD5}` | 上传动态照片视频部分 | api-key；Bearer Token |
| `GET` | `/gateway/{type}/{md5}` | 显示文件的缩略图 | api-key；Bearer Token |

<details>
<summary>GET /gateway/test - 测试接口</summary>

- OperationId: `GatewayController_test`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回的固定测试结果；application/json { n: number }

</details>

<details>
<summary>GET /gateway/userInfo - 用户信息-当前登录用户</summary>

- OperationId: `GatewayController_getUserInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回用户信息；application/json { id: number, username: string, uid: string, isAdmin: boolean, otpEnable: boolean }

</details>

<details>
<summary>GET /gateway/filesInTimeline - 所有文件 `deprecated`</summary>

- OperationId: `GatewayController_findAllFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| _t | query | 否 | number | 时间戳 |

**请求体**

无。

**响应**

- `200`: 返回文件列表；application/json Array<{ id: number, MD5: string, fileName: string, filePath: string, tokenAt: string }>

</details>

<details>
<summary>GET /gateway/filesInTimelineV2 - 所有文件-时间线</summary>

- OperationId: `GatewayController_findAllFilesV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 否 | string | 多个图库ID，用下划线分隔 |
| galleryId | query | 否 | number | 单个图库ID |
| _t | query | 否 | number | 时间戳 |

**请求体**

无。

**响应**

- `200`: 返回文件列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string, fileType: string }>

</details>

<details>
<summary>GET /gateway/timeline - 照片-时间线按月分组统计数</summary>

- OperationId: `GatewayController_getTimelineData`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| platform | query | 否 | string | 平台类型 |
| galleryIds | query | 否 | string | 多个图库ID，用下划线分隔 |
| galleryId | query | 否 | number | 单个图库ID |

**请求体**

无。

**响应**

- `200`: 返回按月统计数据；application/json Array<{ month: string, count: number }>

</details>

<details>
<summary>POST /gateway/timelineMonth - 照片-时间线 月数据</summary>

- OperationId: `GatewayController_getTimelineMonthData`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { galleryId: number, galleryIds: string, platform: string, month: string, monthList: string[] }

**响应**

- `200`: 返回月份数据；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string }>

</details>

<details>
<summary>GET /gateway/myGalleryList - 用户的图库列表</summary>

- OperationId: `GatewayController_userGalleryList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回图库列表；application/json Array<{ id: number, name: string, forUpload: boolean, multi: boolean }>

</details>

<details>
<summary>POST /gateway/galleryNames - 获取图库名称</summary>

- OperationId: `GatewayController_getGalleryNames`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { galleryIds: number[] }

**响应**

- `200`: 返回图库名称列表；application/json Array<{ id: number, name: string }>

</details>

<details>
<summary>POST /gateway/dayFileMore - 单天剩余文件</summary>

- OperationId: `GatewayController_findDayFileMore`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[], inTrash: boolean, order: string }

**响应**

- `200`: 返回剩余文件列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string }>

</details>

<details>
<summary>POST /gateway/dayFiles - 某一天的所有文件</summary>

- OperationId: `GatewayController_dayAllFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { tokenAtStart: number, tokenAtEnd: number, galleryIds: number[] }

**响应**

- `200`: 返回文件列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string }>

</details>

<details>
<summary>POST /gateway/filesInfo - 下载前查询文件信息</summary>

- OperationId: `GatewayController_findFilesInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[], albumId: number, type: string }

**响应**

- `200`: 返回文件信息列表；application/json Array<{ id: number, MD5: string, fileName: string, fileSize: number, fileType: string, ... }>

</details>

<details>
<summary>GET /gateway/filesInTimelineCount - 时间线中所有文件的数量</summary>

- OperationId: `GatewayController_findAllFilesNum`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| _t | query | 否 | number | 时间戳 |

**请求体**

无。

**响应**

- `200`: 返回文件数量；application/json { count: number }

</details>

<details>
<summary>POST /gateway/folderFilesInDisk - 查看文件夹文件 - 实时读取硬盘文件列表</summary>

- OperationId: `GatewayControllerPart1_folderFilesInDisk`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number }

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/annualData - 获取年度统计数据</summary>

- OperationId: `GatewayControllerPart1_annualData`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { year: number }

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/refreshFileDescriptorBatch - 刷新照片人脸</summary>

- OperationId: `GatewayControllerPart1_refreshFileDescriptor`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/getTranscodeError - 查询转码错误信息</summary>

- OperationId: `GatewayControllerPart1_getTranscodeError`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { inputFilePath: string }

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/addFaceRect - 手动添加人脸识别框</summary>

- OperationId: `GatewayControllerPart1_addFaceRect`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: string, x: number, y: number, w: number, h: number }

**响应**

- `201`: -

</details>

<details>
<summary>GET /gateway/fileInfo/{id}/{md5} - 显示文件的详细信息</summary>

- OperationId: `GatewayControllerPart2_getFileDetail`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| md5 | path | 是 | string | 文件MD5值 |
| albumId | query | 否 | string | 相册ID（可选） |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息；application/json { id: number, MD5: string, fileName: string, filePath: string, fileSize: number, fileType: string, tokenAt: string, width: number, height: number, livePhotosVideoId: number }
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/fileInfoById/{id} - 显示文件的详细信息</summary>

- OperationId: `GatewayControllerPart2_getFileServerPath`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| albumId | query | 否 | number | 相册ID（可选） |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息；application/json { id: number, MD5: string, fileName: string, filePath: string, fileSize: number, fileType: string, tokenAt: string }

</details>

<details>
<summary>GET /gateway/exifInfo/{id} - 显示文件的exif信息</summary>

- OperationId: `GatewayControllerPart2_fileExifInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回EXIF信息；application/json { Make: string, Model: string, DateTimeOriginal: string, ExposureTime: string, FNumber: string, ISOSpeedRatings: number, FocalLength: string, GPSLatitude: number, GPSLongitude: number }

</details>

<details>
<summary>GET /gateway/fileTags/{id} - 文件的标签列表</summary>

- OperationId: `GatewayControllerPart2_findFileTags`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回标签列表；application/json Array<{ id: number, name: string, color: string }>

</details>

<details>
<summary>POST /gateway/extra/make - 获取照片包含的相机品牌列表</summary>

- OperationId: `GatewayControllerPart2_fileExtraMake`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回相机品牌列表；application/json Array<{ make: string, count: number }>

</details>

<details>
<summary>GET /gateway/extra/models - 获取照片包含的设备列表</summary>

- OperationId: `GatewayControllerPart2_fileExtraModels`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回设备型号列表；application/json Array<{ model: string, count: number }>

</details>

<details>
<summary>POST /gateway/extra/models - 获取照片包含的设备列表</summary>

- OperationId: `GatewayControllerPart2_fileExtraModelsWithMake`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { make: string }

**响应**

- `200`: 返回设备型号列表；application/json Array<{ model: string, count: number }>

</details>

<details>
<summary>GET /gateway/extra/lens - 获取照片包含的镜头列表</summary>

- OperationId: `GatewayControllerPart2_fileExtraLens`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回镜头列表；application/json Array<{ lens: string, count: number }>

</details>

<details>
<summary>POST /gateway/extra/lens - 获取照片包含的镜头列表</summary>

- OperationId: `GatewayControllerPart2_fileExtraLensWithModel`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { make: string, model: string }

**响应**

- `200`: 返回镜头列表；application/json Array<{ lens: string, count: number }>

</details>

<details>
<summary>POST /gateway/extra/placeL1 - 获取地点列表 - 省</summary>

- OperationId: `GatewayControllerPart2_filePlaceL1`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回省份列表；application/json Array<{ province: string, count: number }>

</details>

<details>
<summary>POST /gateway/extra/placeL2 - 获取地点列表 - 市</summary>

- OperationId: `GatewayControllerPart2_filePlaceL2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { province: string }

**响应**

- `200`: 返回城市列表；application/json Array<{ city: string, count: number }>

</details>

<details>
<summary>POST /gateway/extra/placeL3 - 获取地点列表 - 区</summary>

- OperationId: `GatewayControllerPart2_filePlaceL3`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { province: string, city: string }

**响应**

- `200`: 返回区县列表；application/json Array<{ district: string, count: number }>

</details>

<details>
<summary>GET /gateway/ocrInfo/{id} - 显示文件的OCR结果</summary>

- OperationId: `GatewayControllerPart2_fileOcrInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| albumId | query | 否 | number | 相册ID（可选） |

**请求体**

无。

**响应**

- `200`: 返回OCR识别结果列表；application/json Array<{ id: number, text: string, confidence: number, box: string }>

</details>

<details>
<summary>POST /gateway/filesPath - 获取指定ids文件的地址</summary>

- OperationId: `GatewayControllerPart2_filesPath`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回文件路径列表；application/json Array<{ id: number, filePath: string, fileName: string }>

</details>

<details>
<summary>POST /gateway/filesInMD5 - 根据MD5查询文件列表</summary>

- OperationId: `GatewayControllerPart2_filesInMD5`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { MD5: string }

**响应**

- `200`: 返回文件路径列表；application/json Array<{ id: number, filePath: string, fileName: string }>

</details>

<details>
<summary>GET /gateway/refreshFileThumbs/{id} - 刷新文件的缩略图</summary>

- OperationId: `GatewayControllerPart2_refreshFileThumbs`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| videoSec | query | 否 | number | 视频截图秒数（可选） |

**请求体**

无。

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/uploadFileThumbs/{id} - 上传文件缩略图</summary>

- OperationId: `GatewayControllerPart2_uploadFileThumbs`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

- `multipart/form-data`: { file: string }

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/uploadFileThumbsForApp/{id} - App上传文件缩略图</summary>

- OperationId: `GatewayControllerPart2_uploadFileThumbsForApp`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

- `multipart/form-data`: { file: string }

**响应**

- `200`: 返回处理结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/HDThumbsConfig - 获取高清缩略图配置</summary>

- OperationId: `GatewayControllerPart2_getHDThumbsConfig`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回高清缩略图配置；application/json { enabled: boolean, quality: number, maxWidth: number, maxHeight: number, configTargetFolder: boolean }

</details>

<details>
<summary>POST /gateway/uploadFileHDThumbs/{id} - 上传高清缩略图</summary>

- OperationId: `GatewayControllerPart2_uploadFileHdThumbs`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

- `multipart/form-data`: { file: string }

**响应**

- `200`: 返回处理结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/transcode - 触发视频转码</summary>

- OperationId: `GatewayControllerPart2_transcodeFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, fileIds: number[], albumId: number, galleryId: number, force: boolean }

**响应**

- `200`: 返回转码任务结果；application/json { n: number, code: string, transcodeStatus: number }

</details>

<details>
<summary>GET /gateway/fileInfoRT/{id} - 获取文件最新EXIF信息</summary>

- OperationId: `GatewayControllerPart2_getFileInfoRealTime`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回EXIF差异数据；application/json { id: number, MD5: string, fileName: string, width: number, height: number, exifInfo: object }

</details>

<details>
<summary>POST /gateway/refreshFileDescriptor - 刷新照片人脸</summary>

- OperationId: `GatewayControllerPart2_refreshFileDescriptor`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { id: number }

**响应**

- `200`: 返回刷新结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/fileStat/{id}/{md5} - 检查文件是否存在</summary>

- OperationId: `GatewayControllerPart2_statOneFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| md5 | path | 是 | string | 文件MD5值 |

**请求体**

无。

**响应**

- `200`: 返回文件状态信息；application/json { size: number, ino: number, mtime: string, ctime: string, message: string }

</details>

<details>
<summary>GET /gateway/fileStreamLink/{id} - 获取串流地址</summary>

- OperationId: `GatewayControllerPart2_fileStreamLink`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| shareAlbumId | query | 否 | number | 分享相册ID（可选） |

**请求体**

无。

**响应**

- `200`: 返回串流地址；application/json { link: string, ttl: number }

</details>

<details>
<summary>GET /gateway/stream/{auth_code}/{name} - 下载文件原图</summary>

- OperationId: `GatewayControllerPart2_fileStreamPlay`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| auth_code | path | 是 | string | 授权码 |
| name | path | 是 | string | 文件名 |

**请求体**

无。

**响应**

- `200`: 返回文件流
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/streamV2/{name} - 下载文件原图V2</summary>

- OperationId: `GatewayControllerPart2_fileStreamPlayV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| auth_code | query | 是 | string | 授权码 |
| type | query | 否 | string | 类型：transcode-转码文件 |
| name | path | 是 | string | 文件名 |

**请求体**

无。

**响应**

- `200`: 返回文件流
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/file/{id}/{md5} - 显示文件原图</summary>

- OperationId: `GatewayControllerPart2_renderFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| md5 | path | 是 | string | 文件MD5值 |
| albumId | query | 否 | number | 相册ID（可选） |
| auth_code | query | 是 | string | 授权码 |
| type | query | 否 | string | 类型：proxy-预览图、hd-高清预览图、ori-原图、transcode-视频的转码文件、motion-动态照片视频 |

**请求体**

无。

**响应**

- `200`: 返回文件流
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/fileForApi/{id}/{md5} - 显示文件的大图 - 已废弃 `deprecated`</summary>

- OperationId: `GatewayControllerPart2_renderFileForOpen`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |
| md5 | path | 是 | string | - |
| api_key | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件内容
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/fileMotion/{id}/{md5} - 显示动态照片的视频部分</summary>

- OperationId: `GatewayControllerPart2_renderMotionPhoto`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| md5 | path | 是 | string | 文件MD5值 |
| albumId | query | 否 | number | 相册ID（可选） |
| auth_code | query | 是 | string | 授权码 |
| app | query | 否 | string | 应用类型：ios \| android \| oh \| web |
| type | query | 否 | string | 类型：photo-照片部分、video-视频部分 |

**请求体**

无。

**响应**

- `200`: 返回动态照片的视频部分
- `404`: 文件未找到或不是动态照片

</details>

<details>
<summary>GET /gateway/flv/{id}/{md5} - 视频实时转码为flv</summary>

- OperationId: `GatewayControllerPart2_renderFileFlv`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |
| md5 | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回FLV视频流
- `404`: 文件未找到

</details>

<details>
<summary>GET /gateway/jpeg/{md5} - 显示heic图片的详情</summary>

- OperationId: `GatewayControllerPart2_renderImgWebp`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| md5 | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回HEIC转换后的JPEG图片
- `404`: 文件不存在

</details>

<details>
<summary>GET /gateway/fileDownload/{id}/{md5} - 下载文件的原图</summary>

- OperationId: `GatewayControllerPart2_downloadFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |
| md5 | path | 是 | string | 文件MD5值 |
| albumId | query | 否 | number | 相册ID（可选） |
| auth_code | query | 是 | string | 认证码 |

**请求体**

无。

**响应**

- `200`: 返回文件内容
- `404`: 文件未找到

</details>

<details>
<summary>POST /gateway/fileDownloadStat/{id}/{md5} - 获取下载文件的大小</summary>

- OperationId: `GatewayControllerPart2_downloadStatFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |
| md5 | path | 是 | string | - |
| type | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件大小；application/json { fileSize: number }

</details>

<details>
<summary>GET /gateway/fileZIP/{downloadKey} - 打包下载文件</summary>

- OperationId: `GatewayControllerPart2_downloadZIP`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| downloadKey | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回ZIP文件流
- `404`: 下载密钥无效或已过期

</details>

<details>
<summary>GET /gateway/addressCountByCity - 以市为单位的照片数量</summary>

- OperationId: `GatewayControllerPart2_addressCountByCity`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |
| type | query | 是 | type | - |

**请求体**

无。

**响应**

- `200`: 返回按市统计的照片数量；application/json Array<{ city: string, count: number, cover: string }>

</details>

<details>
<summary>GET /gateway/addressCountByDistrict/{city} - 以区、县为单位的照片数量</summary>

- OperationId: `GatewayControllerPart2_addressCountByDistrict`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| city | path | 是 | string | - |
| galleryIds | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按区县统计的照片数量；application/json Array<{ district: string, count: number, cover: string }>

</details>

<details>
<summary>GET /gateway/addressCountByTownship/{city}/{district} - 以村、街道为单位的照片数量</summary>

- OperationId: `GatewayControllerPart2_addressCountByTownship`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| city | path | 是 | string | - |
| district | path | 是 | string | - |
| galleryIds | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按村街道统计的照片数量；application/json Array<{ township: string, count: number, cover: string }>

</details>

<details>
<summary>GET /gateway/filesInAddress - 对应地区下的所有照片 `deprecated`</summary>

- OperationId: `GatewayControllerPart2_filesInAddress`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| type | query | 是 | string | - |
| city | query | 是 | string | - |
| district | query | 否 | string | - |
| township | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回指定地区的照片列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string }>

</details>

<details>
<summary>GET /gateway/filesInAddressV2 - 对应地区下的所有照片</summary>

- OperationId: `GatewayControllerPart2_filesInAddressV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |
| type | query | 是 | string | - |
| city | query | 是 | string | - |
| district | query | 否 | string | - |
| township | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回指定地区的照片列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/classifyTopList - 按事物场景分类</summary>

- OperationId: `GatewayControllerPart2_classifyTopList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |
| type | query | 是 | type | - |

**请求体**

无。

**响应**

- `200`: 返回按场景分类的照片列表；application/json Array<{ id: number, name: string, count: number, cover: string }>

</details>

<details>
<summary>GET /gateway/classifyFileList - 按事物场景分类-文件列表</summary>

- OperationId: `GatewayControllerPart2_classifyFileList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |
| id | query | 否 | string | - |
| cid | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回分类下的照片列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>POST /gateway/editFileClassify - 修改文件智能分类属性</summary>

- OperationId: `GatewayControllerPart2_editFileClassify`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, cid: number, fileIds: number[] }

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>GET /gateway/filesInCategoriesV2 - 按类型分类的文件列表</summary>

- OperationId: `GatewayControllerPart2_filesInCategoriesV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |
| type | query | 是 | string enum | ["screenshots","selfies","videos","livePhotos","pano","largeFile"] |

**请求体**

无。

**响应**

- `200`: 返回按类型分类的文件列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/filesInTrash - 回收站中的文件 - 已废弃 `deprecated`</summary>

- OperationId: `GatewayControllerPart2_filesInTrash`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回回收站文件列表；application/json Array<{ id: number, MD5: string, fileName: string, deleteAt: string }>

</details>

<details>
<summary>GET /gateway/filesInTrashV2 - 回收站中的文件 - 已废弃 `deprecated`</summary>

- OperationId: `GatewayControllerPart2_filesInTrashV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回回收站文件列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/filesInTrashFlat - 回收站中的文件</summary>

- OperationId: `GatewayControllerPart2_filesInTrashFlat`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| showName | query | 否 | boolean | - |

**请求体**

无。

**响应**

- `200`: 返回回收站文件列表；application/json Array<{ id: number, MD5: string, fileName: string, deleteAt: string, tokenAt: string }>

</details>

<details>
<summary>POST /gateway/findSimilarFiles - 查找相似文件</summary>

- OperationId: `GatewayControllerPart2_findDuplicateFilesWithGalleryIds`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { galleryIds: number[] }

**响应**

- `200`: 返回相似文件列表；application/json Array<{ md5: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/filesInTrashAdmin - 管理员-查看全部用户在回收站中的文件</summary>

- OperationId: `GatewayControllerPart2_filesInTrashAdmin`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| showName | query | 否 | boolean | - |

**请求体**

无。

**响应**

- `200`: 返回全部用户回收站文件列表；application/json Array<{ id: number, MD5: string, fileName: string, deleteAt: string, userId: number }>

</details>

<details>
<summary>POST /gateway/findFilesWithInvalidGps - 管理员-查看无法识别的GPS坐标</summary>

- OperationId: `GatewayControllerPart2_findFilesWithInvalidGps`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { pageNo: number, pageSize: number }

**响应**

- `200`: 返回无法识别GPS的文件列表；application/json { count: number, list: object[] }

</details>

<details>
<summary>POST /gateway/hideFiles - 添加照片到隐私相册中</summary>

- OperationId: `GatewayControllerPart3_addHideFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回处理结果；application/json { identifiers: object[] }

</details>

<details>
<summary>POST /gateway/cancelHideFiles - 从隐私相册内移出</summary>

- OperationId: `GatewayControllerPart3_cancelHideFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回处理结果；application/json { affected: number }

</details>

<details>
<summary>POST /gateway/passwordCode - 验证用户密码，验证通过后返回passwordCode 用于访问 /gateway/filesInHide</summary>

- OperationId: `GatewayControllerPart3_pwdCode`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { password: string, passwordEnc: string }

**响应**

- `200`: 返回密码验证结果；application/json { passwordCode: string, msg: string }

</details>

<details>
<summary>POST /gateway/filesInHide - 隐私相册中的照片</summary>

- OperationId: `GatewayControllerPart3_filesInHide`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { passwordCode: string }

**响应**

- `200`: 返回隐私相册照片列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/recentFiles - 最近添加的文件</summary>

- OperationId: `GatewayControllerPart3_filesRecent`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回最近添加的文件列表；application/json Array<{ id: number, MD5: string, fileName: string, filePath: string, tokenAt: string }>

</details>

<details>
<summary>GET /gateway/peopleList - 人物列表</summary>

- OperationId: `GatewayControllerPart3_peopleList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 是 | string | 图库ID筛选 |
| type | query | 是 | string | 类型筛选 |

**请求体**

无。

**响应**

- `200`: 返回人物列表；application/json Array<{ id: number, name: string, cover: string, fileNum: number, isHide: boolean }>

</details>

<details>
<summary>GET /gateway/people/{id} - 人物详情</summary>

- OperationId: `GatewayControllerPart3_peopleInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回人物详情；application/json { id: number, name: string, cover: string, fileNum: number, baseIds: number[], isHide: boolean }

</details>

<details>
<summary>PUT /gateway/people/{id} - 修改人物详情 - patch兼容</summary>

- OperationId: `GatewayControllerPart3_updatePeopleInfo_put`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

- `application/json`: UpdatePeopleDto: { id: number, name: string, cover: number, count: number, isHide: boolean, ... }

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>PATCH /gateway/people/{id} - 修改人物详情</summary>

- OperationId: `GatewayControllerPart3_updatePeopleInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

- `application/json`: UpdatePeopleDto: { id: number, name: string, cover: number, count: number, isHide: boolean, ... }

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/multiHidePeople - 一键显示或隐藏人物</summary>

- OperationId: `GatewayControllerPart3_multiHidePeople`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { peopleFileNum: number, hideLTE: boolean, showGT: boolean }

**响应**

- `200`: 返回处理结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/peopleNames - 获取人物名称</summary>

- OperationId: `GatewayControllerPart3_getPeopleNames`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { peopleIds: number[] }

**响应**

- `200`: 返回人物名称列表；application/json Array<{ id: number, name: string }>

</details>

<details>
<summary>PUT /gateway/reassignPeopleFile/{id} - 修改人物详情 - patch兼容</summary>

- OperationId: `GatewayControllerPart3_reassignPeopleFile_put`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

无。

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>PATCH /gateway/reassignPeopleFile/{id} - 修改人物详情</summary>

- OperationId: `GatewayControllerPart3_reassignPeopleFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

- `application/json`: { type: string, fileIds: number[] }

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/editFileDescriptor - 修改人物详情</summary>

- OperationId: `GatewayControllerPart3_editFileDescriptor`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, baseId: number, descriptorId: number, boxId: number, targetPeopleId: number, fileIds: number[] }

**响应**

- `200`: 返回处理结果；application/json { n: number, code: string, msg: string }

</details>

<details>
<summary>GET /gateway/peopleFileList - 人物关联的文件列表</summary>

- OperationId: `GatewayControllerPart3_peopleFileList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| peopleId | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回人物关联的文件列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: string }>

</details>

<details>
<summary>GET /gateway/peopleFileListV2 - 人物关联的文件列表</summary>

- OperationId: `GatewayControllerPart3_peopleFileListV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| peopleId | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回人物关联的文件列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /gateway/peopleDescriptorList - 人脸特征列表 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart3_peopleDescriptorList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pageSize | query | 否 | number | - |
| pageNo | query | 否 | number | - |
| descriptorId | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回人脸特征列表；application/json { count: number, list: object[] }

</details>

<details>
<summary>GET /gateway/descriptorDistanceList - 特征相似度列表 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart3_descriptorDistanceList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pageSize | query | 否 | number | - |
| pageNo | query | 否 | number | - |
| threshold | query | 否 | number | - |
| descriptorId | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回特征相似度列表；application/json { count: number, n: number, list: object[] }

</details>

<details>
<summary>GET /gateway/cache - cache value - 管理员可调用</summary>

- OperationId: `GatewayControllerPart3_getCacheValue`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回缓存值；application/json { key: string, value: object }

</details>

<details>
<summary>GET /gateway/peopleInFileInfo - 照片识别的人脸信息</summary>

- OperationId: `GatewayControllerPart3_peopleInFileInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| fileId | query | 否 | string | - |
| peopleId | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回照片识别的人脸信息；application/json Array<{ distance: number, descriptorInfo: object }>

</details>

<details>
<summary>POST /gateway/people/merge - 合并人物</summary>

- OperationId: `GatewayControllerPart3_mergePeople`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { peopleIds: string[] }

**响应**

- `200`: 返回合并结果；application/json { msg: string }

</details>

<details>
<summary>POST /gateway/people/split/{id} - 拆分人物</summary>

- OperationId: `GatewayControllerPart3_resetUserPeople`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回拆分结果；application/json { msg: string }

</details>

<details>
<summary>POST /gateway/people/distance - 计算people下descriptor的distance - 管理员可调用</summary>

- OperationId: `GatewayControllerPart3_calcPeopleDistance`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { peopleId: string }

**响应**

- `200`: 返回特征距离计算结果；application/json { descriptorIds: number[], result: object[], code: string, msg: string }

</details>

<details>
<summary>PUT /gateway/files - 从回收站恢复 - patch兼容</summary>

- OperationId: `GatewayControllerPart3_restoreFiles_put`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回恢复结果；application/json { affected: number }

</details>

<details>
<summary>PATCH /gateway/files - 从回收站恢复</summary>

- OperationId: `GatewayControllerPart3_restoreFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回恢复结果；application/json { affected: number }

</details>

<details>
<summary>DELETE /gateway/files - 删除</summary>

- OperationId: `GatewayControllerPart3_deleteFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回删除结果；application/json { deleteIds: number[], identifiers: object[], code: string }

</details>

<details>
<summary>POST /gateway/deleteFilesPermanently - 从回收站删除</summary>

- OperationId: `GatewayControllerPart3_deleteFromTrash`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回永久删除结果；application/json { ids: number[], code: string, msg: string }

</details>

<details>
<summary>GET /gateway/deleteFilesPermanentlyStatus - 获取永久删除文件状态</summary>

- OperationId: `GatewayControllerPart3_deleteFilesPermanentlyStatus`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回删除进度信息；application/json { i: number, len: number }

</details>

<details>
<summary>POST /gateway/deleteSimilarFiles - 删除相似文件</summary>

- OperationId: `GatewayControllerPart3_deleteSimilarFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[], checkItems: object[] }

**响应**

- `200`: 返回删除结果；application/json { deleteIds: number[], identifiers: object[], code: string, path: string }

</details>

<details>
<summary>POST /gateway/hideSimilarFiles - 忽略相似照片</summary>

- OperationId: `GatewayControllerPart3_hideSimilarFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回忽略结果；application/json { fileIds: number[], identifiers: object[] }

</details>

<details>
<summary>POST /gateway/cancelHideSimilarFiles - 取消忽略相似照片</summary>

- OperationId: `GatewayControllerPart3_cancelHideSimilarFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回取消忽略结果；application/json { affected: number }

</details>

<details>
<summary>POST /gateway/similarFilesInHide - 忽略相似照片列表</summary>

- OperationId: `GatewayControllerPart3_similarFilesInHide`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回忽略的相似照片列表；application/json Array<{ md5: string, files: object[] }>

</details>

<details>
<summary>POST /gateway/user/pwd - 修改自己的密码</summary>

- OperationId: `GatewayControllerPart3_userUpdatePwd`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { oldPwd: string, newPwd: string }

**响应**

- `200`: 返回修改密码结果；application/json { affected: number, code: string }

</details>

<details>
<summary>POST /gateway/user/delete - 用户申请注销账号</summary>

- OperationId: `GatewayControllerPart3_userUpdateDelete`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum, pwd: string }

**响应**

- `200`: 返回注销账号状态；application/json { status: boolean, code: string }

</details>

<details>
<summary>POST /gateway/user/cover - 自定义 自动相册的封面</summary>

- OperationId: `GatewayControllerPart3_userUpdateCover`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, type2: string, md5: string }

**响应**

- `200`: 返回设置封面结果；application/json { affected: number, code: string, msg: string }

</details>

<details>
<summary>POST /gateway/otp/generate - 生成双因素认证</summary>

- OperationId: `GatewayControllerPart3_otpGen`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { domain: string }

**响应**

- `200`: 返回双因素认证密钥和二维码；application/json { secret: string, uri: string, userName: string }

</details>

<details>
<summary>POST /gateway/otp/verify - 验证双因素认证</summary>

- OperationId: `GatewayControllerPart3_otpVerify`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { secret: string, token: string }

**响应**

- `200`: 返回验证结果；application/json { n: number, code: string, msg: string }

</details>

<details>
<summary>POST /gateway/otp/disable - 禁用双因素认证</summary>

- OperationId: `GatewayControllerPart3_otpDisable`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { token: string }

**响应**

- `200`: 返回禁用结果；application/json { n: number, code: string, msg: string }

</details>

<details>
<summary>GET /gateway/lang - 获取系统语言</summary>

- OperationId: `GatewayControllerPart4_getSysLang`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回系统语言信息；application/json { arch: string, platform: string, IS_ELECTRON: boolean, value: string }

</details>

<details>
<summary>GET /gateway/mapCenter - 获取mapbox 的 accessToken</summary>

- OperationId: `GatewayControllerPart4_getMapCenter`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回地图中心坐标；application/json { center: number[] }

</details>

<details>
<summary>GET /gateway/mapboxToken - 获取mapbox 的 accessToken</summary>

- OperationId: `GatewayControllerPart4_getMapboxToken`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回地图配置信息；application/json { amapWebKey: string, amapWebCode: string, lang: string, type: string, token: string, maptilerToken: string, center: number[] }

</details>

<details>
<summary>GET /gateway/maptilerToken - 获取maptiler 的 accessToken</summary>

- OperationId: `GatewayControllerPart4_getMaptilerToken`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回Maptiler配置信息；application/json { amapWebKey: string, amapWebCode: string, lang: string, type: string, token: string, center: number[] }

</details>

<details>
<summary>GET /gateway/mapType - 获取地图的类型</summary>

- OperationId: `GatewayControllerPart4_getMapType`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回地图类型；application/json { type: string }

</details>

<details>
<summary>GET /gateway/staticmap/amap/{location} - 获取高德静态地图url</summary>

- OperationId: `GatewayControllerPart4_staticMapAmap`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| location | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回高德静态地图URL；application/json { url: string }

</details>

<details>
<summary>GET /gateway/amap/test/{key}/{secret} - 测试高德开放平台api key 私钥是否有效</summary>

- OperationId: `GatewayControllerPart4_testAmapApiKey`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | - |
| secret | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回测试结果；application/json { success: boolean, msg: string }

</details>

<details>
<summary>GET /gateway/qqmap/test/{key}/{secret} - 测试腾讯地图api key 私钥是否有效</summary>

- OperationId: `GatewayControllerPart4_testQQmapApiKey`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | - |
| secret | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回测试结果；application/json { success: boolean, msg: string }

</details>

<details>
<summary>GET /gateway/tianmap/test/{key} - 测试天地图api key是否有效</summary>

- OperationId: `GatewayControllerPart4_testTianDiTuApiKey`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回测试结果；application/json { success: boolean, msg: string }

</details>

<details>
<summary>GET /gateway/mapbox/test/{token} - 测试 mapbox api key 是否有效</summary>

- OperationId: `GatewayControllerPart4_testMapboxApiToken`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| token | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回测试结果；application/json { success: boolean, msg: string }

</details>

<details>
<summary>GET /gateway/maptiler/test/{token} - 测试 maptilerapi key 是否有效</summary>

- OperationId: `GatewayControllerPart4_testMaptilerApiToken`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| token | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回测试结果；application/json { success: boolean, msg: string }

</details>

<details>
<summary>GET /gateway/allFilesForMap - 地图上的照片</summary>

- OperationId: `GatewayControllerPart4_getAllFilesForMap`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回地图上的照片坐标列表；application/json Array<{ id: number, lat: number, lng: number }>

</details>

<details>
<summary>GET /gateway/allFilesForMapDirect - 地图上的照片-原始坐标</summary>

- OperationId: `GatewayControllerPart4_getFilesForMapDirect`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回地图上的照片原始坐标列表；application/json Array<{ id: number, lat: number, lng: number }>

</details>

<details>
<summary>POST /gateway/areaFilesMD5 - 根据文件ID列表获取文件信息</summary>

- OperationId: `GatewayControllerPart4_getFileMD5List`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回文件MD5列表；application/json Array<{ id: number, MD5: string, fileName: string, tokenAt: number, duration: number }>

</details>

<details>
<summary>POST /gateway/fileInIds - 根据文件ID列表获取文件详情</summary>

- OperationId: `GatewayControllerPart4_getFileInIds`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回文件详情列表（按日期分组）；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>POST /gateway/enableFileBackup - 启用文件备份功能</summary>

- OperationId: `GatewayControllerPart4_enableFileBackup`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回备份文件夹信息；application/json { id: number, path: string }

</details>

<details>
<summary>POST /gateway/changeAppUploadStatus - 通知服务器是否在备份文件</summary>

- OperationId: `GatewayControllerPart4_changeAppUploadStatus`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { status: boolean, distId: number }

**响应**

- `200`: 返回处理结果；application/json { success: boolean }

</details>

<details>
<summary>POST /gateway/checkFileId - 判断文件是否存在</summary>

- OperationId: `GatewayControllerPart4_checkFileId`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: string }

**响应**

- `200`: 返回文件是否存在；application/json { exist: boolean }

</details>

<details>
<summary>POST /gateway/resetFileStatus - 请求重置异常状态文件</summary>

- OperationId: `GatewayControllerPart4_fixFileStatus`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回重置结果；application/json { success: boolean, code: string, msg: string }

</details>

<details>
<summary>GET /gateway/backupDist/root - 备份目的地-根目录</summary>

- OperationId: `GatewayControllerPart4_backupDistRoot`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回备份目的地根目录列表；application/json Array<{ id: number, path: string }>

</details>

<details>
<summary>GET /gateway/backupDist/sub - 备份目的地-子目录</summary>

- OperationId: `GatewayControllerPart4_backupDistSubDir`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pid | query | 是 | number | 父文件夹ID |

**请求体**

无。

**响应**

- `200`: 返回子目录列表；application/json Array<{ id: number, name: string, path: string }>

</details>

<details>
<summary>GET /gateway/backupDist/refresh - 备份目的地-刷新</summary>

- OperationId: `GatewayControllerPart4_backupDistRefreshDir`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pid | query | 是 | number | 文件夹ID |

**请求体**

无。

**响应**

- `200`: 返回刷新结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/backupDist/verify - 备份目的地-验证</summary>

- OperationId: `GatewayControllerPart4_backupDistVerify`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { pathList: object }

**响应**

- `200`: 返回验证结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/checkPathForUpload - 上传文件前，检查文件在服务端是否存在</summary>

- OperationId: `GatewayControllerPart4_checkPathForUpload`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ctime: number, deviceName: string, dist_id: number, duplicate: number enum, fileName: string, name_type: string enum, md5: string, size: number, v: string }

**响应**

- `200`: 返回文件检查结果；application/json { id: number, msg: string, abort: boolean, code: string }

</details>

<details>
<summary>POST /gateway/upload - 上传文件 - multipart方式</summary>

- OperationId: `GatewayControllerPart4_uploadFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回上传结果；application/json { id: number, msg: string, abort: boolean }

</details>

<details>
<summary>POST /gateway/uploadForShare - 上传文件 - multipart方式 - 网页分享链接</summary>

- OperationId: `GatewayControllerPart4_uploadFileForShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回上传结果；application/json { id: number, msg: string, abort: boolean }

</details>

<details>
<summary>POST /gateway/uploadV2 - 上传文件 - Binary方式</summary>

- OperationId: `GatewayControllerPart4_uploadFileV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回上传结果；application/json { id: number, msg: string }

</details>

<details>
<summary>POST /gateway/uploadChunk/check - 上传文件 - 分块上传前检查</summary>

- OperationId: `GatewayControllerPart4_uploadChunkCheck`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileName: string, deviceName: string, ctime: number, dist_id: number, source_folder_path: string enum, duplicate: number enum, name_type: string enum, MD5: string, uploadKey: string, size: number, ... }

**响应**

- `200`: 返回分块上传检查结果；application/json { id: number, chunkIndex: number, msg: string, abort: boolean, code: string }

</details>

<details>
<summary>POST /gateway/uploadChunk/checkInShare - 分块上传-检查(分享链接)</summary>

- OperationId: `GatewayControllerPart4_uploadChunkCheckInShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分块上传检查结果；application/json { id: number, fileNameForSave: string, fileExist: boolean, existParts: string[], galleryId: number, msg: string, abort: boolean }

</details>

<details>
<summary>POST /gateway/uploadChunk/upload - 分块上传 - multipart</summary>

- OperationId: `GatewayControllerPart4_uploadChunkUpload`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分块上传结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/uploadChunk/merge - 分块上传 - 完成后触发合并文件</summary>

- OperationId: `GatewayControllerPart4_uploadChunkMerge`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回合并结果；application/json { id: number, msg: string }

</details>

<details>
<summary>POST /gateway/uploadChunk/mergeStatus - 分块上传 - 获取合并进度状态</summary>

- OperationId: `GatewayControllerPart4_uploadChunkMergeStatus`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回合并进度信息；application/json { type: string, fileName: string, step: string, fileSize: number }

</details>

<details>
<summary>POST /gateway/uploadChunk/mergeInShare - 分块上传 - 完成后触发合并文件 - 分享链接中</summary>

- OperationId: `GatewayControllerPart4_uploadChunkMergeInShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/uploadChunk/mergeStatusForShare - 分块上传 - 获取合并进度状态 - 分享链接中使用</summary>

- OperationId: `GatewayControllerPart4_uploadChunkMergeStatusForShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回合并进度信息；application/json { type: string, fileName: string, step: string, fileSize: number }

</details>

<details>
<summary>POST /gateway/uploadChunk/uploadBin - 分块上传 - 上传文件-binary content 上传方式</summary>

- OperationId: `GatewayControllerPart4_uploadChunkBin`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: -

</details>

<details>
<summary>POST /gateway/uploadChunk/uploadWeb - 分块上传-网页端</summary>

- OperationId: `GatewayControllerPart4_uploadChunkWeb`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分块上传结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/uploadChunk/uploadWebInShare - 分块上传-网页端(分享链接)</summary>

- OperationId: `GatewayControllerPart4_uploadChunkWebInShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分块上传结果；application/json { n: number, msg: string, abort: boolean }

</details>

<details>
<summary>POST /gateway/echo - 测试回显</summary>

- OperationId: `GatewayControllerPart4_echo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { key: string, value: string }

**响应**

- `200`: 返回测试结果；application/json { n: number }

</details>

<details>
<summary>GET /gateway/licenseInfo - 订阅信息 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart4_licenseInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回订阅信息；application/json { startTime: string, endTime: string, clientId: string, orderId: string, offlineMode: boolean, liveAuthMsg: string }

</details>

<details>
<summary>GET /gateway/trail - 开始试用 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart4_startTrail`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回试用结果；application/json { msg: string, n: number }

</details>

<details>
<summary>POST /gateway/bindLicense - 使用激活码-添加订阅 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart4_bindLicense`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { license: string }

**响应**

- `200`: 返回激活结果；application/json { msg: string, n: number }

</details>

<details>
<summary>POST /gateway/verifyAuthOnline - 触发联网验证 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart4_forceVerifyCpStatusLive`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回验证结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/coordinate/convert - gps坐标转为autonavi</summary>

- OperationId: `GatewayControllerPart4_coordinateConvert`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { latitude: number, longitude: number }

**响应**

- `200`: 返回转换后的坐标；application/json { type: string, latitude: number, longitude: number }

</details>

<details>
<summary>POST /gateway/coordinate/parse - 自动处理从 腾讯、高德地图坐标拾取器中粘贴的值</summary>

- OperationId: `GatewayControllerPart4_coordinateAutoParse`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { latitude: number, longitude: number }

**响应**

- `200`: 返回处理后的坐标；application/json { latitude: number, longitude: number }

</details>

<details>
<summary>GET /gateway/folders/root - 文件夹视图-顶级</summary>

- OperationId: `GatewayControllerPart5_folderTopList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回顶级文件夹列表；application/json { path: string, folderList: object[], fileList: -[] }

</details>

<details>
<summary>GET /gateway/folderInfo/{id} - 文件夹-信息</summary>

- OperationId: `GatewayControllerPart5_folderInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件夹信息；application/json { id: number, name: string, path: string, subFolders: number[], cover: string, s_cover: string, subFileNum: number, isTop: boolean }

</details>

<details>
<summary>GET /gateway/folderSubFile/{id} - 文件夹-获取当前及下级文件夹文件 id、MD5</summary>

- OperationId: `GatewayControllerPart5_folderSubFile`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |
| count | query | 否 | number | - |

**请求体**

无。

**响应**

- `200`: 返回文件列表；application/json Array<{ id: number, MD5: string }>

</details>

<details>
<summary>POST /gateway/folderAutoCover/{id} - 文件夹-自动设置空封面的文件夹，显示下级文件夹的文件</summary>

- OperationId: `GatewayControllerPart5_folderAutoCover`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回处理结果；application/json { n: number }

</details>

<details>
<summary>GET /gateway/folders/{id} - 文件夹视图-文件夹详情 `deprecated`</summary>

- OperationId: `GatewayControllerPart5_folderViewDetail`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件夹详情；application/json { path: string, folderList: object[], fileList: -[] }

</details>

<details>
<summary>GET /gateway/foldersV2/{id} - 文件夹视图-文件夹详情</summary>

- OperationId: `GatewayControllerPart5_folderViewDetailV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件夹详情；application/json { path: string, folderList: object[], fileList: -[], trashNum: number }

</details>

<details>
<summary>GET /gateway/folderFiles/{id} - 文件夹视图-文件夹详情-文件列表</summary>

- OperationId: `GatewayControllerPart5_folderFileInTimeline`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |
| withSub | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表；application/json { result: object[], totalCount: number, duplicateFiles: object }

</details>

<details>
<summary>GET /gateway/folderBreadcrumbs/{id} - 文件夹地址的面包屑</summary>

- OperationId: `GatewayControllerPart5_folderBreadcrumbs`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

无。

**响应**

- `200`: 返回面包屑导航列表；application/json Array<{ id: number, name: string, path: string }>

</details>

<details>
<summary>POST /gateway/folders/create - 文件夹视图-新建文件夹</summary>

- OperationId: `GatewayControllerPart5_folderCreate`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回创建结果；application/json { n: number, msg: string, id: number }

</details>

<details>
<summary>POST /gateway/folderPathEdit - 文件夹视图-重命名、移动、删除</summary>

- OperationId: `GatewayControllerPart5_folderEdit`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, folderId: number, distId: number, name: string }

**响应**

- `200`: 返回操作结果；application/json { n: number, code: string, path: string }

</details>

<details>
<summary>POST /gateway/filePathEdit - 文件路径编辑</summary>

- OperationId: `GatewayControllerPart5_filePathEdit`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum, fileIds: number[], distId: number, overwrite: number enum }

**响应**

- `200`: 返回操作结果；application/json { n: number, code: string, duplicateFiles: string[] }

</details>

<details>
<summary>POST /gateway/folder_files_move/preview - 整理文件夹下的文件 - 预览移动路径</summary>

- OperationId: `GatewayControllerPart5_folder_files_move_preview`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number, folderNameType: string, fileNameType: string }

**响应**

- `200`: 返回预览结果；application/json { msg: string, needMoveFiles: -[], moveToPath: object }

</details>

<details>
<summary>POST /gateway/folder_files_move/move - 整理文件夹下的文件 - 移动文件</summary>

- OperationId: `GatewayControllerPart5_folder_files_move_run`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number, folderNameType: string, fileNameType: string, deleteEmptyFolder: boolean }

**响应**

- `200`: 返回移动任务结果；application/json { n: number, taskId: string, msg: string }

</details>

<details>
<summary>POST /gateway/folders/delete_empty - 删除文件夹下面的 空文件夹</summary>

- OperationId: `GatewayControllerPart5_folder_delete_empty`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number }

**响应**

- `200`: 返回删除结果；application/json { deletedFolders: string[], code: string }

</details>

<details>
<summary>POST /gateway/folder_files_move/status - 整理文件夹 获取处理进度</summary>

- OperationId: `GatewayControllerPart5_folder_files_move_status`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number }

**响应**

- `200`: 返回处理进度；application/json { type: string, progress: number, total: number, done: boolean }

</details>

<details>
<summary>PUT /gateway/setFolderCover/{id} - 修改文件夹封面 - 兼容PATCH</summary>

- OperationId: `GatewayControllerPart5_setFolderCover_put`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

无。

**响应**

- `200`: 返回修改结果；application/json { n: number }

</details>

<details>
<summary>PATCH /gateway/setFolderCover/{id} - 修改文件夹封面</summary>

- OperationId: `GatewayControllerPart5_setFolderCover`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | - |

**请求体**

- `application/json`: { s_cover: string }

**响应**

- `200`: 返回修改结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/scanAfterUpload - 更新刚上传的文件的状态</summary>

- OperationId: `GatewayControllerPart5_scanAfterUpload`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回更新结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/scanAfterUploadInShare - 更新刚上传的文件的状态 - 分享的链接中</summary>

- OperationId: `GatewayControllerPart5_scanAfterUploadInShare`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回更新结果；application/json { n: number, msg: string }

</details>

<details>
<summary>POST /gateway/folderDebugInfo - 获取文件夹的调试信息 - 管理员可调用</summary>

- OperationId: `GatewayControllerPart5_folderDebugInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { folderId: number }

**响应**

- `200`: 返回文件夹调试信息；application/json { folder: object, items: -[], diskData: object, msg: string }

</details>

<details>
<summary>POST /gateway/updateFileDate - 更新文件的拍摄日期</summary>

- OperationId: `GatewayControllerPart5_updateFileDate`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回更新结果；application/json { n: number, code: string }

</details>

<details>
<summary>POST /gateway/updateFileName - 修改文件的名称</summary>

- OperationId: `GatewayControllerPart5_updateFileName`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: number, fileName: string }

**响应**

- `200`: 返回修改结果；application/json { n: number, code: string, path: string }

</details>

<details>
<summary>POST /gateway/editFileExtra - 编辑文件额外信息</summary>

- OperationId: `GatewayControllerPart5_editFileDesc`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: number, type: string enum, value: string }

**响应**

- `200`: 返回编辑结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/editFileGps - 编辑文件GPS信息</summary>

- OperationId: `GatewayControllerPart5_editFileGPS`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: number, latitude: number, longitude: number, type: string enum }

**响应**

- `200`: 返回编辑结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/resetFileGps - 重置文件GPS信息</summary>

- OperationId: `GatewayControllerPart5_resetFileGps`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `200`: 返回重置结果；application/json { n: number }

</details>

<details>
<summary>POST /gateway/editFileRotate - 旋转文件</summary>

- OperationId: `GatewayControllerPart5_editFileRotate`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: number, deg: number enum }

**响应**

- `200`: 返回旋转结果；application/json { n: number, MD5: string, code: string }

</details>

<details>
<summary>POST /gateway/searchTips - 搜索提示</summary>

- OperationId: `GatewayControllerPart5_searchTips`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { key: string, type: string enum }

**响应**

- `200`: 返回搜索提示列表；application/json Array<{ id: number, name: string, type: string }>

</details>

<details>
<summary>POST /gateway/search - 搜索</summary>

- OperationId: `GatewayControllerPart5_searchFiles`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { key: string, model: string, lens: string, rating: number, tokenAtStart: number, tokenAtEnd: number, mtimeStart: number, mtimeEnd: number, widthMin: number, widthMax: number, ... }

**响应**

- `200`: 返回搜索结果；application/json { result: object[], totalCount: number, list: -[] }

</details>

<details>
<summary>POST /gateway/searchCLIP - 搜索-CLIP</summary>

- OperationId: `GatewayControllerPart5_getCLIPTextMatchedId`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { key: string, imgId: number, count: number }

**响应**

- `200`: 返回CLIP搜索结果；application/json { list: object[], totalCount: number }

</details>

<details>
<summary>POST /gateway/searchV2 - 搜索-v2</summary>

- OperationId: `GatewayControllerPart5_searchFilesV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { galleryIds: number[], searchType: string, searchKey: string, placeL1: string, placeL2: string, placeL3: string, tagUseOr: boolean, tags: number[], peopleUseOr: boolean, people: number[], ... }

**响应**

- `200`: 返回搜索结果；application/json { result: object[] }

</details>

<details>
<summary>POST /gateway/searchResultTipsBox - 搜索结果提示框</summary>

- OperationId: `GatewayControllerPart5_searchResultTipsBox`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { id: number, type: string, searchKey: string }

**响应**

- `200`: 返回提示信息；application/json { text: string, highlights: -[] }

</details>

<details>
<summary>POST /gateway/searchCLIPV2 - 搜索-CLIP</summary>

- OperationId: `GatewayControllerPart5_searchCLIPV2`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { galleryIds: number[], searchKey: string, count: number, imgId: number, placeL1: string, placeL2: string, placeL3: string, tags: number[], tagUseOr: boolean, people: number[], ... }

**响应**

- `200`: 返回CLIP搜索结果；application/json { list: object[], totalCount: number }

</details>

<details>
<summary>POST /gateway/memory - 那年今日</summary>

- OperationId: `GatewayControllerPart5_getMemoryList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { month: number, date: number, galleryId: string, galleryIds: string }

**响应**

- `200`: 返回那年今日的照片列表；application/json Array<{ year: number, date: string, files: -[] }>

</details>

<details>
<summary>POST /gateway/memoryWeekFileList - 往年照片 - 一周 - 文件列表</summary>

- OperationId: `GatewayControllerPart5_memoryWeekFileList`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { year: number, month: number, date: number, range: number, galleryIds: number[] }

**响应**

- `200`: 返回往年同期照片；application/json { result: object[] }

</details>

<details>
<summary>POST /gateway/CLIP_status - 是否可以用使用CLIP搜索</summary>

- OperationId: `GatewayControllerPart5_searchCLIPStatus`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回CLIP状态；application/json { active: boolean }

</details>

<details>
<summary>POST /gateway/nongLi - 获取阳历日期的农历日期</summary>

- OperationId: `GatewayControllerPart5_getNongLiInfo`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { time: number }

**响应**

- `200`: 返回农历日期信息；application/json { year: number, month: number, day: number, monthCn: string, dayCn: string }

</details>

<details>
<summary>POST /gateway/livePhotoMovCheck - 检查livePhoto视频部分是否正确</summary>

- OperationId: `GatewayControllerPart5_livePhotoMovCheck`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileMd5List: string[] }

**响应**

- `200`: 返回动态照片视频检查结果；application/json { videoIdx: object, videoList: object[] }

</details>

<details>
<summary>POST /gateway/uploadForLivePhotoMov/{photoMD5}/{videoMD5} - 上传动态照片视频部分</summary>

- OperationId: `GatewayControllerPart5_uploadForLivePhotoMov`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| photoMD5 | path | 是 | string | - |
| videoMD5 | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回上传结果；application/json { n: number, msg: string, abort: boolean }

</details>

<details>
<summary>GET /gateway/{type}/{md5} - 显示文件的缩略图</summary>

- OperationId: `GatewayControllerPartEnd_renderThumb`
- Tag: gateway - 前端API请求主要的入口
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| type | path | 是 | string | 缩略图类型：h220-PC缩略图, s260-app缩略图, preview-视频前5s的动图, poster-视频封面, proxy-预览图, portrait-人物封面, live_preview-动态照片预览 |
| md5 | path | 是 | string | 文件MD5值 |
| albumId | query | 否 | string | 相册ID，如果在相册内需要 |
| id | query | 否 | number | 文件ID ，可选 |
| auth_code | query | 是 | string | 授权码 |

**请求体**

无。

**响应**

- `200`: 返回缩略图文件流
- `404`: 文件未找到

</details>

### api-share 分享管理

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-share` | 我的分享列表 | api-key；Bearer Token |
| `POST` | `/api-share` | 创建分享 | api-key；Bearer Token |
| `GET` | `/api-share/shareToMe` | 分享给我的列表 | api-key；Bearer Token |
| `GET` | `/api-share/users` | 查询可分享的用户列表 | api-key；Bearer Token |
| `GET` | `/api-share/link/{id}` | 查询 相册的分享链接 key | api-key；Bearer Token |
| `GET` | `/api-share/visit/album/{key}` | 根据链接分享的key获取相册的信息 | api-key；Bearer Token |
| `GET` | `/api-share/album/{id}` | 开启分享相册时，查询这个相册是否有分享信息 | api-key；Bearer Token |
| `GET` | `/api-share/albumInfo/{albumId}` | 打开他人分享的相册时，根据albumId，获取相册的信息 | api-key；Bearer Token |
| `GET` | `/api-share/albumFiles/{albumId}` | 打开他人分享的相册时，根据albumId，获取相册的文件列表 | api-key；Bearer Token |
| `GET` | `/api-share/albumFilesFlat/{albumId}` | 打开他人分享的相册时，根据albumId，获取相册的文件列表 - 平铺列表 | api-key；Bearer Token |
| `POST` | `/api-share/dayFileMoreForUser` | 单天剩余文件 - 已登录用户 | api-key；Bearer Token |
| `POST` | `/api-share/dayFileMore` | 单天剩余文件 - 链接 | api-key；Bearer Token |
| `GET` | `/api-share/album/link/{id}` | 获取相册的自动更新配置 | api-key；Bearer Token |
| `POST` | `/api-share/album/link/{id}` | 添加 相册 自动配置 | api-key；Bearer Token |
| `DELETE` | `/api-share/album/link/{id}` | 删除 分享的相册 自动配置 | api-key；Bearer Token |
| `GET` | `/api-share/visit/albumFiles/{key}` | 查询相册分享链接的文件列表 - 网页使用 | api-key；Bearer Token |
| `GET` | `/api-share/visit/albumFilesFlat/{key}` | 查询相册分享链接的文件列表 | api-key；Bearer Token |
| `GET` | `/api-share/fileInfo/{albumId}/{fileId}` | 显示文件的详细信息 - 检查共享权限 | api-key；Bearer Token |
| `GET` | `/api-share/fileInfoByKey/{key}/{fileId}` | 查询相册分享链接的文件详情 | api-key；Bearer Token |
| `GET` | `/api-share/amap/{key}/{location}` | 获取高德静态地图url | api-key；Bearer Token |
| `POST` | `/api-share/filesInfo` | 下载前查询文件信息 - 分享的链接 | api-key；Bearer Token |
| `POST` | `/api-share/addFileToAlbum` | 添加文件到分享相册 | api-key；Bearer Token |
| `POST` | `/api-share/removeFileFromAlbum` | 从分享相册移除文件 | api-key；Bearer Token |
| `GET` | `/api-share/{id}` | 查询分享信息 | api-key；Bearer Token |
| `PUT` | `/api-share/{id}` | 更新分享信息(PUT) | api-key；Bearer Token |
| `PATCH` | `/api-share/{id}` | 更新分享信息 | api-key；Bearer Token |
| `DELETE` | `/api-share/{id}` | 删除分享 | api-key；Bearer Token |
| `POST` | `/api-share/createFilesLink` | 创建分享 - 文件链接分享 | api-key；Bearer Token |
| `POST` | `/api-share/getFilesLink/{id}` | 查询分享 - 文件链接分享 | api-key；Bearer Token |
| `POST` | `/api-share/updateFilesLink/{id}` | 修改分享 - 文件链接分享 | api-key；Bearer Token |
| `POST` | `/api-share/delFilesLink/{id}` | 删除分享 - 文件链接分享 | api-key；Bearer Token |
| `POST` | `/api-share/filesLink/count` | 我的分享列表 - 链接分享的文件 - 数量 | api-key；Bearer Token |
| `POST` | `/api-share/filesLink/list` | 我的分享列表 - 链接分享的文件 - 列表 | api-key；Bearer Token |
| `POST` | `/api-share/filesLink/list/{id}` | 我的分享列表 - 链接分享的文件 - 文件列表 | api-key；Bearer Token |
| `POST` | `/api-share/visit/filesLink/{key}` | 根据链接分享的key获取file的信息 | api-key；Bearer Token |
| `POST` | `/api-share/visit/filesLinkFiles/{key}` | 查询链接分享链接的文件列表 | api-key；Bearer Token |
| `POST` | `/api-share/linkFileInfoByKey/{key}/{fileId}` | 查询文件分享链接的文件详情 | api-key；Bearer Token |
| `POST` | `/api-share/linkFileInfoAmap/{key}/{location}` | 获取高德静态地图url - 文件分享链接 | api-key；Bearer Token |

<details>
<summary>GET /api-share - 我的分享列表</summary>

- OperationId: `ShareController_findAll`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回我分享的相册列表；application/json Array<{ id: number, name: string, cover: string, count: number, userId: number }>

</details>

<details>
<summary>POST /api-share - 创建分享</summary>

- OperationId: `ShareController_create`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateShareDto: { userId: number, albumId: number, link: boolean, linkPwd: string, key: string, ... }

**响应**

- `201`: 创建分享成功；application/json { id: number }

</details>

<details>
<summary>GET /api-share/shareToMe - 分享给我的列表</summary>

- OperationId: `ShareController_findAllShareToMe`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分享给我的相册列表；application/json Array<{ id: number, name: string, cover: string, count: number, userId: number, ... }>

</details>

<details>
<summary>GET /api-share/users - 查询可分享的用户列表</summary>

- OperationId: `ShareController_findUsers`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回可分享的用户列表；application/json Array<{ id: number, username: string }>

</details>

<details>
<summary>GET /api-share/link/{id} - 查询 相册的分享链接 key</summary>

- OperationId: `ShareController_createShare`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回相册的分享链接key；application/json { key: string, id: number }

</details>

<details>
<summary>GET /api-share/visit/album/{key} - 根据链接分享的key获取相册的信息</summary>

- OperationId: `ShareController_getShareInfo`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回相册信息；application/json { id: number, name: string, cover: string, count: number, expires_in: number, auth_code: string, showUpload: boolean, uploadFolderId: number, uploadFolderName: string, uploadMaxSize: number, ... }

</details>

<details>
<summary>GET /api-share/album/{id} - 开启分享相册时，查询这个相册是否有分享信息</summary>

- OperationId: `ShareController_findOneByAlbumId`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回相册的分享信息；application/json { id: number, albumId: number, userId: number, link: boolean, key: string, linkPwd: string, vUserIds: number[], cUserIds: number[] }

</details>

<details>
<summary>GET /api-share/albumInfo/{albumId} - 打开他人分享的相册时，根据albumId，获取相册的信息</summary>

- OperationId: `ShareController_findAlbumInfoByAlbumId`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| albumId | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回相册详细信息；application/json { id: number, name: string, cover: string, count: number, userId: number, shareId: number, collaborator: boolean, files: number[] }

</details>

<details>
<summary>GET /api-share/albumFiles/{albumId} - 打开他人分享的相册时，根据albumId，获取相册的文件列表</summary>

- OperationId: `ShareController_findAlbumFilesByAlbumId`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| albumId | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表；application/json Array<{ date: string, files: object[] }>

</details>

<details>
<summary>GET /api-share/albumFilesFlat/{albumId} - 打开他人分享的相册时，根据albumId，获取相册的文件列表 - 平铺列表</summary>

- OperationId: `ShareController_findAlbumFilesFlatByAlbumId`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| albumId | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回平铺的文件列表；application/json Array<{ id: number, fileName: string, fileType: string, tokenAt: string, width: number, ... }>

</details>

<details>
<summary>POST /api-share/dayFileMoreForUser - 单天剩余文件 - 已登录用户</summary>

- OperationId: `ShareController_dayFileMoreForUser`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: number, ids: number[] }

**响应**

- `200`: 返回指定ID的文件列表；application/json Array<{ id: number, fileName: string, fileType: string, tokenAt: string, width: number, ... }>

</details>

<details>
<summary>POST /api-share/dayFileMore - 单天剩余文件 - 链接</summary>

- OperationId: `ShareController_findDayFileMore`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { key: string, pwd: string, ids: number[] }

**响应**

- `200`: 返回指定ID的文件列表；application/json Array<{ id: number, fileName: string, fileType: string, tokenAt: string, width: number, ... }>

</details>

<details>
<summary>GET /api-share/album/link/{id} - 获取相册的自动更新配置</summary>

- OperationId: `ShareController_findAutoLinkList`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回相册的自动更新配置列表；application/json Array<{ id: number, type: string, value: object, exclude: boolean }>

</details>

<details>
<summary>POST /api-share/album/link/{id} - 添加 相册 自动配置</summary>

- OperationId: `ShareController_addAutoLink`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: { type: string, value: string, exclude: boolean }

**响应**

- `201`: 添加结果；application/json { n: number, message: string, statusCode: number }

</details>

<details>
<summary>DELETE /api-share/album/link/{id} - 删除 分享的相册 自动配置</summary>

- OperationId: `ShareController_delAutoLink`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: { linkId: number }

**响应**

- `200`: 删除结果；application/json { n: number }

</details>

<details>
<summary>GET /api-share/visit/albumFiles/{key} - 查询相册分享链接的文件列表 - 网页使用</summary>

- OperationId: `ShareController_findAlbumFilesByKey`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表或错误信息；application/json Array<{ date: string, files: object[] }> \| { msg: string }

</details>

<details>
<summary>GET /api-share/visit/albumFilesFlat/{key} - 查询相册分享链接的文件列表</summary>

- OperationId: `ShareController_findAlbumFilesByKeyFlat`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回平铺的文件列表或错误信息；application/json Array<{ id: number, fileName: string, fileType: string, tokenAt: string }> \| { msg: string }

</details>

<details>
<summary>GET /api-share/fileInfo/{albumId}/{fileId} - 显示文件的详细信息 - 检查共享权限</summary>

- OperationId: `ShareController_getFileDetail`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| albumId | path | 是 | number | 相册ID |
| fileId | path | 是 | number | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息；application/json { id: number, fileName: string, fileType: string, fileSize: number, width: number, height: number, tokenAt: string, gps: string, gpsInfo: object, livePhotosVideoId: number, ... }

</details>

<details>
<summary>GET /api-share/fileInfoByKey/{key}/{fileId} - 查询相册分享链接的文件详情</summary>

- OperationId: `ShareController_getFileDetailByKey`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| fileId | path | 是 | number | 文件ID |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息或错误信息；application/json { id: number, fileName: string, fileType: string, fileSize: number, width: number, ... } \| { msg: string }

</details>

<details>
<summary>GET /api-share/amap/{key}/{location} - 获取高德静态地图url</summary>

- OperationId: `ShareController_staticMapAmap`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| location | path | 是 | string | GPS坐标(经度,纬度) |

**请求体**

无。

**响应**

- `200`: 返回高德静态地图URL；application/json { url: string }

</details>

<details>
<summary>POST /api-share/filesInfo - 下载前查询文件信息 - 分享的链接</summary>

- OperationId: `ShareController_getFilesInfo`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[], key: string, pwd: string, type: string }

**响应**

- `200`: 返回文件信息列表；application/json { list: object[], msg: string }

</details>

<details>
<summary>POST /api-share/addFileToAlbum - 添加文件到分享相册</summary>

- OperationId: `ShareController_addFileToAlbum`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: number, files: number[] }

**响应**

- `200`: 返回添加结果；application/json { n: number }

</details>

<details>
<summary>POST /api-share/removeFileFromAlbum - 从分享相册移除文件</summary>

- OperationId: `ShareController_removeFileFromAlbum`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: number, files: number[] }

**响应**

- `200`: 返回移除结果；application/json { n: number }

</details>

<details>
<summary>GET /api-share/{id} - 查询分享信息</summary>

- OperationId: `ShareController_findOne`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

无。

**响应**

- `200`: 返回分享信息；application/json { id: number, albumId: number, userId: number, link: boolean, key: string, vUserIds: number[], cUserIds: number[] }

</details>

<details>
<summary>PUT /api-share/{id} - 更新分享信息(PUT)</summary>

- OperationId: `ShareController_update_put`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

- `application/json`: UpdateShareDto: { userId: number, albumId: number, link: boolean, linkPwd: string, key: string, ... }

**响应**

- `200`: 返回更新结果；application/json { id: number }

</details>

<details>
<summary>PATCH /api-share/{id} - 更新分享信息</summary>

- OperationId: `ShareController_update`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

- `application/json`: UpdateShareDto: { userId: number, albumId: number, link: boolean, linkPwd: string, key: string, ... }

**响应**

- `200`: 返回更新结果；application/json { id: number }

</details>

<details>
<summary>DELETE /api-share/{id} - 删除分享</summary>

- OperationId: `ShareController_remove`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

无。

**响应**

- `200`: 返回删除结果；application/json { n: number }

</details>

<details>
<summary>POST /api-share/createFilesLink - 创建分享 - 文件链接分享</summary>

- OperationId: `ShareController_createFileLink`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateShareFilesDto: { userId: number, files: string[], count: number, albumId: number, cover: string, ... }

**响应**

- `201`: 返回创建的文件分享信息；application/json { id: number, key: string, cover: string }

</details>

<details>
<summary>POST /api-share/getFilesLink/{id} - 查询分享 - 文件链接分享</summary>

- OperationId: `ShareController_getShareFileLinkInfo`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

无。

**响应**

- `200`: 返回文件分享信息；application/json { id: number, key: string, cover: string, count: number, files: number[], showExif: boolean, showDownload: boolean }

</details>

<details>
<summary>POST /api-share/updateFilesLink/{id} - 修改分享 - 文件链接分享</summary>

- OperationId: `ShareController_updateFileLink`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

- `application/json`: UpdateShareFilesDto: { userId: number, files: string[], count: number, albumId: number, cover: string, ... }

**响应**

- `200`: 返回更新结果；application/json { id: number }

</details>

<details>
<summary>POST /api-share/delFilesLink/{id} - 删除分享 - 文件链接分享</summary>

- OperationId: `ShareController_delFileLink`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

无。

**响应**

- `200`: 返回删除结果；application/json { n: number }

</details>

<details>
<summary>POST /api-share/filesLink/count - 我的分享列表 - 链接分享的文件 - 数量</summary>

- OperationId: `ShareController_countAllSingleFiles`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分享文件数量和封面列表；application/json { count: number, cover: string[] }

</details>

<details>
<summary>POST /api-share/filesLink/list - 我的分享列表 - 链接分享的文件 - 列表</summary>

- OperationId: `ShareController_findAllSingleFiles`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回分享文件列表；application/json Array<{ id: number, cover: string, count: number, showExif: boolean, showDownload: boolean, ... }>

</details>

<details>
<summary>POST /api-share/filesLink/list/{id} - 我的分享列表 - 链接分享的文件 - 文件列表</summary>

- OperationId: `ShareController_getFileLinkFiles`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 分享ID |

**请求体**

无。

**响应**

- `200`: 返回分享文件列表；application/json Array<{ id: number, fileName: string, fileType: string, tokenAt: string, width: number, ... }>

</details>

<details>
<summary>POST /api-share/visit/filesLink/{key} - 根据链接分享的key获取file的信息</summary>

- OperationId: `ShareController_getFileShareInfo`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件分享信息或错误信息；application/json { expires_in: number, auth_code: string, showExif: boolean, showDownload: boolean, file: object, msg: string }

</details>

<details>
<summary>POST /api-share/visit/filesLinkFiles/{key} - 查询链接分享链接的文件列表</summary>

- OperationId: `ShareController_findShareFileListByKey`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表或错误信息；application/json Array<{ date: string, files: object[] }> \| { msg: string }

</details>

<details>
<summary>POST /api-share/linkFileInfoByKey/{key}/{fileId} - 查询文件分享链接的文件详情</summary>

- OperationId: `ShareController_getLinkFileDetailByKey`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| fileId | path | 是 | number | 文件ID |
| pwd | query | 否 | string | - |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息或错误信息；application/json { id: number, fileName: string, fileType: string, fileSize: number, width: number, ... } \| { msg: string }

</details>

<details>
<summary>POST /api-share/linkFileInfoAmap/{key}/{location} - 获取高德静态地图url - 文件分享链接</summary>

- OperationId: `ShareController_linkFileInfoAmap`
- Tag: api-share 分享管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 分享链接key |
| location | path | 是 | string | GPS坐标(经度,纬度) |

**请求体**

无。

**响应**

- `200`: 返回高德静态地图URL；application/json { url: string }

</details>

### api-album 相册

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-album` | 我的相册列表 | api-key；Bearer Token |
| `POST` | `/api-album` | 新建相册 | api-key；Bearer Token |
| `GET` | `/api-album/{id}` | 相册详情 | api-key；Bearer Token |
| `PUT` | `/api-album/{id}` | 修改相册 - patch兼容 | api-key；Bearer Token |
| `PATCH` | `/api-album/{id}` | 修改相册 | api-key；Bearer Token |
| `DELETE` | `/api-album/{id}` | 删除相册 | api-key；Bearer Token |
| `GET` | `/api-album/files/{id}` | 相册文件列表 | api-key；Bearer Token |
| `GET` | `/api-album/filesV2/{id}` | 相册文件列表 - 时间线 | api-key；Bearer Token |
| `GET` | `/api-album/ignoreFiles/{id}` | 相册排除的文件列表 - 时间线 - 曾经在相册内手动移出的照片 | api-key；Bearer Token |
| `GET` | `/api-album/filesFlat/{id}` | 相册文件列表 - 给PhotosFlatList用的精简数据版 | api-key；Bearer Token |
| `GET` | `/api-album/fileInAlbums/{id}` | 文件在哪些相册中 - 返回相册id | api-key；Bearer Token |
| `GET` | `/api-album/fileInAlbumsList/{id}` | 文件在哪些相册中 - 返回相册信息 | api-key；Bearer Token |
| `POST` | `/api-album/checkForFavorites` | 检查【收藏夹】 相册是否已经创建过 | api-key；Bearer Token |
| `POST` | `/api-album/addFileToAlbum` | 添加文件至相册中 | api-key；Bearer Token |
| `POST` | `/api-album/removeFileFromAlbum` | 将文件从相册中删除 | api-key；Bearer Token |
| `GET` | `/api-album/link/{id}` | 相册的自动更新配置 | api-key；Bearer Token |
| `POST` | `/api-album/link/{id}` | 添加 相册 自动配置 | api-key；Bearer Token |
| `DELETE` | `/api-album/link/{id}` | 删除 相册 自动配置 | api-key；Bearer Token |
| `POST` | `/api-album/linkSyncFiles/{id}` | 相册 自动关联 更新文件 | api-key；Bearer Token |
| `POST` | `/api-album/hlinkAlbum` | 相册硬链接 - 触发同步 | api-key；Bearer Token |
| `POST` | `/api-album/addAlbumHLink` | 相册 硬链接 创建- admin only | api-key；Bearer Token |
| `POST` | `/api-album/updateAlbumHLink` | 相册 硬链接 更新- admin only | api-key；Bearer Token |
| `POST` | `/api-album/delAlbumHLink` | 相册 硬链接 - admin only | api-key；Bearer Token |
| `GET` | `/api-album/getAlbumHardLinkByAlbumId/{id}` | 相册 硬链接 | api-key；Bearer Token |
| `GET` | `/api-album/getAlbumHardLinkById/{id}` | 相册 硬链接 | api-key；Bearer Token |
| `POST` | `/api-album/findAllForHardLink/list` | 硬链接 显示的全部相册列表 - admin only | api-key；Bearer Token |

<details>
<summary>GET /api-album - 我的相册列表</summary>

- OperationId: `AlbumController_findAll`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回相册列表；application/json Array<{ id: number, name: string, cover: string, count: number, startTime: string, ... }>

</details>

<details>
<summary>POST /api-album - 新建相册</summary>

- OperationId: `AlbumController_create`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateAlbumDto: { name: string, weights: number, count: number, cover: string, startTime: string, ... }

**响应**

- `201`: 创建成功；application/json { id: number, name: string, count: number }

</details>

<details>
<summary>GET /api-album/{id} - 相册详情</summary>

- OperationId: `AlbumController_findOne`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |
| tzOffset | query | 否 | number | 客户端时区，比如 UTC+8 为 -480 |

**请求体**

无。

**响应**

- `200`: 返回相册详情；application/json { id: number, name: string, cover: string, count: number, weights: number, startTime: string, endTime: string, theme: string, extra_time1: string, files: number[], ... }

</details>

<details>
<summary>PUT /api-album/{id} - 修改相册 - patch兼容</summary>

- OperationId: `AlbumController_update_put`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: UpdateAlbumDto: { name: string, weights: number, count: number, cover: string, startTime: string, ... }

**响应**

- `200`: 修改成功；application/json { affected: number }

</details>

<details>
<summary>PATCH /api-album/{id} - 修改相册</summary>

- OperationId: `AlbumController_update`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: UpdateAlbumDto: { name: string, weights: number, count: number, cover: string, startTime: string, ... }

**响应**

- `200`: 修改成功；application/json { affected: number }

</details>

<details>
<summary>DELETE /api-album/{id} - 删除相册</summary>

- OperationId: `AlbumController_remove`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 删除成功；application/json { affected: number }

</details>

<details>
<summary>GET /api-album/files/{id} - 相册文件列表 `deprecated`</summary>

- OperationId: `AlbumController_findAlbumFiles`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回文件列表（已废弃）；application/json Array<{ id: number, MD5: string, tokenAt: string }>

</details>

<details>
<summary>GET /api-album/filesV2/{id} - 相册文件列表 - 时间线</summary>

- OperationId: `AlbumController_findAlbumFilesV2`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |
| listVer | query | 否 | string | 列表版本，v2时返回更多文件 |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表；application/json { result: object[], duplicateFiles: object, totalCount: number }

</details>

<details>
<summary>GET /api-album/ignoreFiles/{id} - 相册排除的文件列表 - 时间线 - 曾经在相册内手动移出的照片</summary>

- OperationId: `AlbumController_findAlbumIgnoreFilesV2`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的排除文件列表；application/json { result: object[], duplicateFiles: object, totalCount: number }

</details>

<details>
<summary>GET /api-album/filesFlat/{id} - 相册文件列表 - 给PhotosFlatList用的精简数据版</summary>

- OperationId: `AlbumController_findAlbumFilesFlat`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回精简的文件列表；application/json Array<{ id: number, MD5: string }>

</details>

<details>
<summary>GET /api-album/fileInAlbums/{id} - 文件在哪些相册中 - 返回相册id</summary>

- OperationId: `AlbumController_fileInAlbums`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回包含该文件的相册ID数组；application/json Array<number>

</details>

<details>
<summary>GET /api-album/fileInAlbumsList/{id} - 文件在哪些相册中 - 返回相册信息</summary>

- OperationId: `AlbumController_fileInAlbumsList`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回包含该文件的相册信息列表；application/json Array<{ id: number, name: string, cover: string, weights: number, count: number, ... }>

</details>

<details>
<summary>POST /api-album/checkForFavorites - 检查【收藏夹】 相册是否已经创建过</summary>

- OperationId: `AlbumController_checkAlbumForFav`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 返回收藏夹相册信息；application/json { id: number, name: string, cover: string, count: number }

</details>

<details>
<summary>POST /api-album/addFileToAlbum - 添加文件至相册中</summary>

- OperationId: `AlbumController_addFileToAlbum`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: string, files: string[] }

**响应**

- `201`: 添加成功；application/json { id: number, name: string, count: number }

</details>

<details>
<summary>POST /api-album/removeFileFromAlbum - 将文件从相册中删除</summary>

- OperationId: `AlbumController_removeFileFromAlbum`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: string, files: string[] }

**响应**

- `201`: 删除成功；application/json { id: number, name: string, count: number }

</details>

<details>
<summary>GET /api-album/link/{id} - 相册的自动更新配置</summary>

- OperationId: `AlbumController_findAutoLinkList`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `200`: 返回自动更新配置列表；application/json Array<{ id: number, type: string enum, value: string, exclude: boolean }>

</details>

<details>
<summary>POST /api-album/link/{id} - 添加 相册 自动配置</summary>

- OperationId: `AlbumController_addAutoLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: { type: string enum, value: string, exclude: boolean }

**响应**

- `201`: 添加成功；application/json { n: number }

</details>

<details>
<summary>DELETE /api-album/link/{id} - 删除 相册 自动配置</summary>

- OperationId: `AlbumController_delAutoLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

- `application/json`: { linkId: number }

**响应**

- `200`: 删除成功；application/json { n: number }

</details>

<details>
<summary>POST /api-album/linkSyncFiles/{id} - 相册 自动关联 更新文件</summary>

- OperationId: `AlbumController_syncAutoLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 相册ID |

**请求体**

无。

**响应**

- `201`: 同步成功；application/json { n: number }

</details>

<details>
<summary>POST /api-album/hlinkAlbum - 相册硬链接 - 触发同步</summary>

- OperationId: `AlbumController_hlinkAlbum`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { id: number }

**响应**

- `201`: 同步成功；application/json { success: boolean, msg: string }

</details>

<details>
<summary>POST /api-album/addAlbumHLink - 相册 硬链接 创建- admin only</summary>

- OperationId: `AlbumController_addAlbumHLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: number, dest: string, folder_name_type: string enum, file_name_type: string enum }

**响应**

- `201`: 创建成功；application/json { id: number, albumId: number, dest: string, folder_name_type: string, file_name_type: string }

</details>

<details>
<summary>POST /api-album/updateAlbumHLink - 相册 硬链接 更新- admin only</summary>

- OperationId: `AlbumController_updateAlbumHLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { id: number, dest: string, folder_name_type: string enum, file_name_type: string enum }

**响应**

- `201`: 更新成功；application/json { affected: number }

</details>

<details>
<summary>POST /api-album/delAlbumHLink - 相册 硬链接 - admin only</summary>

- OperationId: `AlbumController_delAlbumHLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { albumId: number, id: number }

**响应**

- `201`: 删除成功；application/json { affected: number }

</details>

<details>
<summary>GET /api-album/getAlbumHardLinkByAlbumId/{id} - 相册 硬链接</summary>

- OperationId: `AlbumController_getAlbumHardLinkByAlbumId`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 相册ID或"all" |

**请求体**

无。

**响应**

- `200`: 返回相册的硬链接配置列表；application/json Array<{ id: number, dest: string, folder_name_type: string, file_name_type: string, msg: string, ... }>

</details>

<details>
<summary>GET /api-album/getAlbumHardLinkById/{id} - 相册 硬链接</summary>

- OperationId: `AlbumController_getAlbumHardLinkById`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 硬链接ID |

**请求体**

无。

**响应**

- `200`: 返回硬链接详情；application/json { id: number, dest: string, folder_name_type: string, file_name_type: string, msg: string, success_count: number, total_count: number, run_time: string, update_time: string }

</details>

<details>
<summary>POST /api-album/findAllForHardLink/list - 硬链接 显示的全部相册列表 - admin only</summary>

- OperationId: `AlbumController_findAllForHardLink`
- Tag: api-album 相册
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { userIds: number[] }

**响应**

- `201`: 返回相册列表；application/json Array<{ id: number, name: string, userId: number }>

</details>

### system-config - 系统配置

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/system-config` | 获取所有系统配置 - adminOnly | api-key；Bearer Token |
| `PATCH` | `/system-config` | 更新系统配置 - adminOnly | api-key；Bearer Token |
| `GET` | `/system-config/{key}` | 根据key获取系统配置 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/patchMulti` | 批量修改图库设置配置值 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/getFFmpegHWList` | 获取FFmpeg硬件加速列表 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/pgDump` | 数据库备份 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/systemStatus` | 获取系统状态 | api-key；Bearer Token |
| `POST` | `/system-config/changeTableVecLength` | 修改数据库向量的长度 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/getTableVecLength` | 获取数据库向量长度 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/test/ocrApi` | 测试OCR API配置 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/db/prepareCLIP` | 准备CLIP表 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/db/prepareFaceRegV2` | 准备人脸识别V2表 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/switchUseFaceRegV2` | 切换人脸识别版本 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/configInfo` | 获取配置信息 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/dbReIndex` | 重建数据库索引 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/dbReIndexInfo` | 获取数据库重建索引进度 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/dbReIndexForTZ` | 重新生成时区相关的index索引 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/getLibheifVersion` | 获取libheif版本 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/libheifVersion` | 切换libheif版本 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/offlineID` | 获取离线ID - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/verifyAuthOnlineInBrowser` | 在线验证授权 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/getLogs` | 获取日志 - adminOnly | api-key；Bearer Token |
| `POST` | `/system-config/clearLogs` | 清空日志 - adminOnly | api-key；Bearer Token |

<details>
<summary>GET /system-config - 获取所有系统配置 - adminOnly</summary>

- OperationId: `SystemConfigController_findAll`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回所有系统配置列表；application/json Array<{ id: number, key: string, value: string, type: string, description: string, ... }>

</details>

<details>
<summary>PATCH /system-config - 更新系统配置 - adminOnly</summary>

- OperationId: `SystemConfigController_updateByValue`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateSystemConfigDto: { key: string, value: string, hide: boolean }

**响应**

- `200`: 更新配置成功；application/json { success: boolean, message: string }

</details>

<details>
<summary>GET /system-config/{key} - 根据key获取系统配置 - adminOnly</summary>

- OperationId: `SystemConfigController_findByKey`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 配置键名 |

**请求体**

无。

**响应**

- `200`: 返回指定key的配置信息；application/json { id: number, key: string, value: string, type: string, description: string, created_at: string, updated_at: string }

</details>

<details>
<summary>POST /system-config/patchMulti - 批量修改图库设置配置值 - adminOnly</summary>

- OperationId: `SystemConfigController_patchMultiForFront`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: Array<->

**响应**

- `200`: 批量修改配置成功；application/json { n: number }

</details>

<details>
<summary>POST /system-config/getFFmpegHWList - 获取FFmpeg硬件加速列表 - adminOnly</summary>

- OperationId: `SystemConfigController_getFFmpeg_HWList`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回FFmpeg硬件加速列表；application/json Array<{ name: string, value: string, available: boolean }>

</details>

<details>
<summary>POST /system-config/pgDump - 数据库备份 - adminOnly</summary>

- OperationId: `SystemConfigController_pgDump`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 数据库备份成功；application/json { n: number, distPath: string }

</details>

<details>
<summary>POST /system-config/systemStatus - 获取系统状态</summary>

- OperationId: `SystemConfigController_systemStatus`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回系统状态信息；application/json { pgEnable: boolean, redisEnable: boolean }

</details>

<details>
<summary>POST /system-config/changeTableVecLength - 修改数据库向量的长度 - adminOnly</summary>

- OperationId: `SystemConfigController_changeTableVecLength`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum, len: number enum }

**响应**

- `200`: 修改向量长度成功；application/json { success: boolean, message: string }

</details>

<details>
<summary>POST /system-config/getTableVecLength - 获取数据库向量长度 - adminOnly</summary>

- OperationId: `SystemConfigController_getTableVecLength`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum }

**响应**

- `200`: 返回数据库向量长度；application/json { len: number }

</details>

<details>
<summary>POST /system-config/test/ocrApi - 测试OCR API配置 - adminOnly</summary>

- OperationId: `SystemConfigController_testOcrApiConfig`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { uri: string, api_key: string, type: string enum }

**响应**

- `200`: 测试OCR API配置成功；application/json { pass: boolean, err: string, response: object }

</details>

<details>
<summary>POST /system-config/db/prepareCLIP - 准备CLIP表 - adminOnly</summary>

- OperationId: `SystemConfigController_prepareForClip`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: CLIP表准备完成；application/json { success: boolean, message: string }

</details>

<details>
<summary>POST /system-config/db/prepareFaceRegV2 - 准备人脸识别V2表 - adminOnly</summary>

- OperationId: `SystemConfigController_prepareFaceRegV2`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 人脸识别V2表准备完成；application/json { success: boolean, message: string }

</details>

<details>
<summary>POST /system-config/switchUseFaceRegV2 - 切换人脸识别版本 - adminOnly</summary>

- OperationId: `SystemConfigController_switchUseFaceRegV2`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { open: boolean }

**响应**

- `200`: 切换人脸识别版本成功；application/json { key: string, value: string }

</details>

<details>
<summary>POST /system-config/configInfo - 获取配置信息 - adminOnly</summary>

- OperationId: `SystemConfigController_configInfo`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回系统配置信息；application/json { cacheVer: number, faceRegVer: string, categoryOneId: number, cpuThreadNum: number, taskMaxThreadNum: number, faceApiConfig: object, dbTZ: string }

</details>

<details>
<summary>POST /system-config/dbReIndex - 重建数据库索引 - adminOnly</summary>

- OperationId: `SystemConfigController_dbReIndex`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回重建索引的数量；application/json { n: number }

</details>

<details>
<summary>POST /system-config/dbReIndexInfo - 获取数据库重建索引进度 - adminOnly</summary>

- OperationId: `SystemConfigController_dbReIndexInfo`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回数据库重建索引进度；application/json { progress: number, status: string, startTime: number }

</details>

<details>
<summary>POST /system-config/dbReIndexForTZ - 重新生成时区相关的index索引 - adminOnly</summary>

- OperationId: `SystemConfigController_dbReIndexForTZ`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回重新生成时区索引的结果；application/json { success: boolean, message: string }

</details>

<details>
<summary>POST /system-config/getLibheifVersion - 获取libheif版本 - adminOnly</summary>

- OperationId: `SystemConfigController__getLibheifVersion`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回libheif版本信息；application/json { version: string, list: string[] }

</details>

<details>
<summary>POST /system-config/libheifVersion - 切换libheif版本 - adminOnly</summary>

- OperationId: `SystemConfigController__switchLibheifVersion`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileName: string enum }

**响应**

- `200`: 切换libheif版本成功；application/json { n: number }

</details>

<details>
<summary>POST /system-config/offlineID - 获取离线ID - adminOnly</summary>

- OperationId: `SystemConfigController_postOfflineID`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回离线ID信息；application/json { offlineId: string }

</details>

<details>
<summary>POST /system-config/verifyAuthOnlineInBrowser - 在线验证授权 - adminOnly</summary>

- OperationId: `SystemConfigController_verifyAuthOnlineInBrowser`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum, data: object }

**响应**

- `200`: 获取验证数据；application/json { params: object, response: object }

</details>

<details>
<summary>POST /system-config/getLogs - 获取日志 - adminOnly</summary>

- OperationId: `SystemConfigController_getLogsInMem`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回内存中的日志；application/json { data: object[] }

</details>

<details>
<summary>POST /system-config/clearLogs - 清空日志 - adminOnly</summary>

- OperationId: `SystemConfigController_clearLogsInMem`
- Tag: system-config - 系统配置
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 清空日志成功；application/json { n: number }

</details>

### gallery 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/gallery/rootDirs` | 获取根目录列表 | Bearer Token；api-key |
| `GET` | `/gallery/subDirs` | 获取子目录列表 | Bearer Token；api-key |
| `POST` | `/gallery/findDuplicateFiles` | 查找重复文件 | Bearer Token；api-key |
| `GET` | `/gallery/findDeletedFiles` | 查找已删除文件 | Bearer Token；api-key |
| `POST` | `/gallery/exportDeletedFiles` | 导出已删除文件的预览图 | Bearer Token；api-key |
| `POST` | `/gallery/exportDeletedFiles/stat` | 导出已删除文件的预览图 - 进度查询 | Bearer Token；api-key |
| `POST` | `/gallery/deleteDuplicateFiles` | 删除重复文件 | Bearer Token；api-key |
| `POST` | `/gallery/folderPathRebase` | 文件夹路径重置检查 | Bearer Token；api-key |
| `GET` | `/gallery` | 获取所有图库 | Bearer Token；api-key |
| `POST` | `/gallery` | 创建图库 | Bearer Token；api-key |
| `GET` | `/gallery/all` | 获取所有图库（含隐藏） | Bearer Token；api-key |
| `GET` | `/gallery/galleryUsers` | 获取图库用户列表 | Bearer Token；api-key |
| `GET` | `/gallery/stat/{id}` | 获取图库统计信息 | Bearer Token；api-key |
| `GET` | `/gallery/scan/{id}` | 扫描图库 | Bearer Token；api-key |
| `GET` | `/gallery/{id}` | 获取单个图库信息 | Bearer Token；api-key |
| `PATCH` | `/gallery/{id}` | 更新图库信息 | Bearer Token；api-key |
| `DELETE` | `/gallery/{id}` | 删除图库 | Bearer Token；api-key |
| `POST` | `/gallery/updateWeights` | 更新图库权重 | Bearer Token；api-key |
| `POST` | `/gallery/createFolders` | 批量创建文件夹 | Bearer Token；api-key |
| `POST` | `/gallery/func_exclude` | 获取功能排除的图库ID | Bearer Token；api-key |
| `POST` | `/gallery/skippedFolderLogs` | 获取跳过扫描的文件夹日志 | Bearer Token；api-key |

<details>
<summary>GET /gallery/rootDirs - 获取根目录列表</summary>

- OperationId: `GalleryController_findRootDirs`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回根目录列表；application/json Array<string>

</details>

<details>
<summary>GET /gallery/subDirs - 获取子目录列表</summary>

- OperationId: `GalleryController_findSubDirs`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| path | query | 是 | string | 父目录路径 |

**请求体**

无。

**响应**

- `200`: 返回子目录列表；application/json Array<string>

</details>

<details>
<summary>POST /gallery/findDuplicateFiles - 查找重复文件</summary>

- OperationId: `GalleryController_findDuplicateFilesWithGalleryIds`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { galleryIds: number[] }

**响应**

- `200`: 返回重复文件列表；application/json Array<{ id: number, name: string, path: string, gallery_ids: number[], md5: string, ... }>

</details>

<details>
<summary>GET /gallery/findDeletedFiles - 查找已删除文件</summary>

- OperationId: `GalleryController_findDeletedFiles`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回按日期分组的已删除文件列表；application/json { result: object[], duplicateFiles: object, totalCount: number, ver: number }

</details>

<details>
<summary>POST /gallery/exportDeletedFiles - 导出已删除文件的预览图</summary>

- OperationId: `GalleryController_exportDeletedFiles`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `201`: -

</details>

<details>
<summary>POST /gallery/exportDeletedFiles/stat - 导出已删除文件的预览图 - 进度查询</summary>

- OperationId: `GalleryController_exportDeletedFilesStat`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `201`: -

</details>

<details>
<summary>POST /gallery/deleteDuplicateFiles - 删除重复文件</summary>

- OperationId: `GalleryController_deleteDuplicateFiles`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { id: number, MD5: string, galleryIds: number[] }

**响应**

- `200`: 返回删除结果；application/json { n: number } \| { code: string enum, path: string }

</details>

<details>
<summary>POST /gallery/folderPathRebase - 文件夹路径重置检查</summary>

- OperationId: `GalleryController_folderPathRebase`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { id: number, newPath: string }

**响应**

- `200`: 返回路径重置检查结果；application/json { fileResult: object, folderResult: object } \| { code: string enum }

</details>

<details>
<summary>GET /gallery - 获取所有图库</summary>

- OperationId: `GalleryController_findAll`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回图库列表（不含隐藏图库）；application/json Array<{ id: number, name: string, cover: number, fileDeleteOnlyAdmin: boolean, folders: object[] }>

</details>

<details>
<summary>POST /gallery - 创建图库</summary>

- OperationId: `GalleryController_create`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: CreateGalleryDto: { name: string, cover: number, weights: number, hide: boolean, folders: string[], ... }

**响应**

- `201`: 返回创建的图库信息；application/json { id: number, name: string, cover: number, weights: number, fileDeleteOnlyAdmin: boolean, hide: boolean, func_exclude: string[], folders: object[] }

</details>

<details>
<summary>GET /gallery/all - 获取所有图库（含隐藏）</summary>

- OperationId: `GalleryController_findAllWithHidden`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回图库列表（含隐藏图库）；application/json Array<{ id: number, name: string, cover: number, hide: boolean, weights: number, ... }>

</details>

<details>
<summary>GET /gallery/galleryUsers - 获取图库用户列表</summary>

- OperationId: `GalleryController_findAllGalleryUsers`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回图库用户列表；application/json Array<{ galleryId: number, userId: number }>

</details>

<details>
<summary>GET /gallery/stat/{id} - 获取图库统计信息</summary>

- OperationId: `GalleryController_statOne`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 图库ID，特殊值：list-返回图库列表，all-返回所有图库统计 |

**请求体**

无。

**响应**

- `200`: 返回统计信息；application/json Array<{ id: number, name: string, hide: boolean }> \| { photo: number, video: number, totalSize: number }

</details>

<details>
<summary>GET /gallery/scan/{id} - 扫描图库</summary>

- OperationId: `GalleryController_scanGallery`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 图库ID |
| type | query | 否 | - | 扫描类型 |

**请求体**

无。

**响应**

- `200`: 返回扫描结果；application/json { scanResult: string, msg: string }

</details>

<details>
<summary>GET /gallery/{id} - 获取单个图库信息</summary>

- OperationId: `GalleryController_findOne`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 图库ID |

**请求体**

无。

**响应**

- `200`: 返回图库详细信息；application/json { id: number, name: string, cover: number, weights: number, fileDeleteOnlyAdmin: boolean, hide: boolean, func_exclude: string[], folders: object[] }

</details>

<details>
<summary>PATCH /gallery/{id} - 更新图库信息</summary>

- OperationId: `GalleryController_update`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 图库ID |

**请求体**

- `application/json`: UpdateGalleryDto: { name: string, cover: number, weights: number, hide: boolean, folders: string[], ... }

**响应**

- `200`: 返回更新结果；application/json { id: number, name: string, cover: number, weights: number, fileDeleteOnlyAdmin: boolean, hide: boolean, func_exclude: string[] }

</details>

<details>
<summary>DELETE /gallery/{id} - 删除图库</summary>

- OperationId: `GalleryController_remove`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 图库ID |

**请求体**

无。

**响应**

- `200`: 返回删除结果；application/json { raw: object[], affected: number }

</details>

<details>
<summary>POST /gallery/updateWeights - 更新图库权重</summary>

- OperationId: `GalleryController_updateWeights`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { id: number, weights: number }

**响应**

- `200`: 返回更新结果；application/json { generatedMaps: object[], raw: object[], affected: number }

</details>

<details>
<summary>POST /gallery/createFolders - 批量创建文件夹</summary>

- OperationId: `GalleryController_createFolders`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { folders: string[] }

**响应**

- `200`: 返回创建结果；application/json Array<{ id: number, name: string, path: string }>

</details>

<details>
<summary>POST /gallery/func_exclude - 获取功能排除的图库ID</summary>

- OperationId: `GalleryController_getFuncExcludeIds`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { type: string }

**响应**

- `200`: 返回排除的图库ID列表或详细配置；application/json Array<number> \| Array<{ id: number, name: string, hide: boolean, func_exclude: string[] }>

</details>

<details>
<summary>POST /gallery/skippedFolderLogs - 获取跳过扫描的文件夹日志</summary>

- OperationId: `GalleryController_getSkippedFolderLogs`
- Tag: gallery 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回跳过扫描的文件夹日志列表；application/json Array<{ folderPath: string, msg: string }>

</details>

### fileTask 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `POST` | `/fileTask/addTask` | 创建后台任务 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/active` | 获取正在执行的任务列表 | api-key；Bearer Token |
| `GET` | `/fileTask/job/subData` | 获取任务进度子数据 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/completed` | 获取已完成任务列表 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/waiting` | 获取等待中任务列表 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/paused` | 获取已暂停任务列表 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/failed` | 获取失败任务列表 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/isPaused` | 检查任务队列是否已暂停 | api-key；Bearer Token |
| `POST` | `/fileTask/jobs/pause` | 暂停任务队列 | api-key；Bearer Token |
| `POST` | `/fileTask/jobs/resume` | 恢复任务队列 | api-key；Bearer Token |
| `GET` | `/fileTask/jobs/Counts` | 获取各状态任务数量统计 | api-key；Bearer Token |
| `GET` | `/fileTask/resetAllGpsInfo` | 重置所有GPS信息 | api-key；Bearer Token |
| `GET` | `/fileTask/checkLicense` | 检查许可证状态 | api-key；Bearer Token |
| `GET` | `/fileTask/client/{name}` | 获取浏览器辅助处理模型文件 | api-key；Bearer Token |
| `GET` | `/fileTask/client/dist/{name}` | 获取浏览器辅助处理模型文件（dist目录） | api-key；Bearer Token |
| `GET` | `/fileTask/client/dist/{type}/{name}` | 获取浏览器辅助处理模型文件（dist子目录） | api-key；Bearer Token |
| `GET` | `/fileTask/{id}` | 根据ID获取任务详情 | api-key；Bearer Token |

<details>
<summary>POST /fileTask/addTask - 创建后台任务</summary>

- OperationId: `FileTaskController_addTask`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string enum, info: object, force: boolean }

**响应**

- `200`: 清空所有任务成功；application/json { success: boolean }
- `201`: 任务创建成功；application/json { id: string, name: string, data: object, opts: object }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/active - 获取正在执行的任务列表</summary>

- OperationId: `FileTaskController_getActiveJobs`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回正在执行的任务列表；application/json { jobs: object[], subData: object, THUMB_TASK_MAX_NUM: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/job/subData - 获取任务进度子数据</summary>

- OperationId: `FileTaskController_getJobSubData`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回任务进度子数据；application/json { stage: object, data: object }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/completed - 获取已完成任务列表</summary>

- OperationId: `FileTaskController_getCompleted`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| end | query | 否 | number | 结束索引 |
| start | query | 否 | number | 起始索引 |

**请求体**

无。

**响应**

- `200`: 返回已完成的任务列表；application/json Array<{ id: string, name: string, data: object, timestamp: number, finishedOn: number, ... }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/waiting - 获取等待中任务列表</summary>

- OperationId: `FileTaskController_getWaiting`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| end | query | 否 | number | 结束索引 |
| start | query | 否 | number | 起始索引 |

**请求体**

无。

**响应**

- `200`: 返回等待中的任务列表；application/json Array<{ id: string, name: string, data: object, timestamp: number, delayed: number }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/paused - 获取已暂停任务列表</summary>

- OperationId: `FileTaskController_getPaused`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| end | query | 否 | number | 结束索引 |
| start | query | 否 | number | 起始索引 |

**请求体**

无。

**响应**

- `200`: 返回已暂停的任务列表；application/json Array<{ id: string, name: string, data: object, timestamp: number }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/failed - 获取失败任务列表</summary>

- OperationId: `FileTaskController_getFailed`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| end | query | 否 | number | 结束索引 |
| start | query | 否 | number | 起始索引 |

**请求体**

无。

**响应**

- `200`: 返回失败的任务列表；application/json Array<{ id: string, name: string, data: object, timestamp: number, failedReason: string, ... }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/isPaused - 检查任务队列是否已暂停</summary>

- OperationId: `FileTaskController_isPaused`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回任务队列是否已暂停；application/json boolean
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>POST /fileTask/jobs/pause - 暂停任务队列</summary>

- OperationId: `FileTaskController_pause`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 暂停成功；application/json { success: boolean }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>POST /fileTask/jobs/resume - 恢复任务队列</summary>

- OperationId: `FileTaskController_resume`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 恢复成功；application/json { success: boolean }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/jobs/Counts - 获取各状态任务数量统计</summary>

- OperationId: `FileTaskController_getJobCounts`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回各状态任务数量统计；application/json { active: number, completed: number, failed: number, delayed: number, waiting: number, paused: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/resetAllGpsInfo - 重置所有GPS信息</summary>

- OperationId: `FileTaskController_resetAllGpsInfo`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: GPS重置任务已创建；application/json { id: string, name: string, data: object }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/checkLicense - 检查许可证状态</summary>

- OperationId: `FileTaskController_checkCpInfo`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 许可证检查完成；application/json { n: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /fileTask/client/{name} - 获取浏览器辅助处理模型文件 `deprecated`</summary>

- OperationId: `FileTaskController_getTfTaskFiles`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| name | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回模型文件内容
- `302`: 未授权时重定向到登录页
- `404`: 文件不存在或路径越权

</details>

<details>
<summary>GET /fileTask/client/dist/{name} - 获取浏览器辅助处理模型文件（dist目录） `deprecated`</summary>

- OperationId: `FileTaskController_getTfTaskFiles2`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| name | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回dist目录下的模型文件内容
- `404`: 文件不存在或路径越权

</details>

<details>
<summary>GET /fileTask/client/dist/{type}/{name} - 获取浏览器辅助处理模型文件（dist子目录） `deprecated`</summary>

- OperationId: `FileTaskController_getTfTaskFiles3`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| type | path | 是 | string | - |
| name | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回dist子目录下的模型文件内容
- `404`: 文件不存在或路径越权

</details>

<details>
<summary>GET /fileTask/{id} - 根据ID获取任务详情</summary>

- OperationId: `FileTaskController_findOne`
- Tag: fileTask 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回任务详情；application/json { id: string, name: string, data: object, timestamp: number, processedOn: number, finishedOn: number, progress: number, returnvalue: object, failedReason: string, stacktrace: string[] }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: 任务不存在

</details>

### install-初始化

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/install/status` | 获取安装状态 | 未声明 |
| `POST` | `/install/createAdminAccount` | 创建管理员用户 | 未声明 |
| `GET` | `/install/rootDirs` | 获取根目录列表 | 未声明 |
| `GET` | `/install/subDirs` | 获取子目录列表 | 未声明 |
| `POST` | `/install/createFolders` | 批量创建文件夹 | 未声明 |
| `GET` | `/install/gallery` | 获取图库列表 | 未声明 |
| `POST` | `/install/gallery` | 创建图库 | 未声明 |
| `PATCH` | `/install/gallery/{id}` | 更新图库 | 未声明 |
| `DELETE` | `/install/gallery/{id}` | 删除图库 | 未声明 |
| `GET` | `/install/gallery/scan/{id}` | 扫描图库 | 未声明 |
| `PATCH` | `/install/system-config` | 更新系统配置 | 未声明 |
| `GET` | `/install/system-config/{key}` | 获取系统配置 | 未声明 |
| `POST` | `/install/upgrade` | 手动升级 | 未声明 |
| `POST` | `/install/autoUpgrade` | 自动升级 | 未声明 |
| `GET` | `/install/memory` | 获取内存使用情况 | Bearer Token |
| `POST` | `/install/reload` | 重载服务 | Bearer Token |
| `GET` | `/install/trail` | 开始试用 | 未声明 |

<details>
<summary>GET /install/status - 获取安装状态</summary>

- OperationId: `InstallController_findStatus`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回安装状态；application/json { isInstalled: boolean }

</details>

<details>
<summary>POST /install/createAdminAccount - 创建管理员用户</summary>

- OperationId: `InstallController_create`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: CreateUserDto: { username: string, email: string, password: string, otp_secret: string, isAdmin: boolean, ... }

**响应**

- `201`: 创建成功；application/json { success: boolean }

</details>

<details>
<summary>GET /install/rootDirs - 获取根目录列表</summary>

- OperationId: `InstallController_findRootDirs`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回根目录列表；application/json Array<{ name: string, path: string }>

</details>

<details>
<summary>GET /install/subDirs - 获取子目录列表</summary>

- OperationId: `InstallController_findSubDirs`
- Tag: install-初始化
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| path | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回子目录列表；application/json Array<{ name: string, path: string }>

</details>

<details>
<summary>POST /install/createFolders - 批量创建文件夹</summary>

- OperationId: `InstallController_createFolders`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: { folders: string[] }

**响应**

- `201`: 创建成功；application/json Array<{ id: number, name: string, path: string }>

</details>

<details>
<summary>GET /install/gallery - 获取图库列表</summary>

- OperationId: `InstallController_getGalleryList`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回图库列表；application/json Array<{ id: number, name: string, cover: number, folders: object[] }>

</details>

<details>
<summary>POST /install/gallery - 创建图库</summary>

- OperationId: `InstallController_createGallery`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: CreateGalleryDto: { name: string, cover: number, weights: number, hide: boolean, folders: string[], ... }

**响应**

- `201`: 创建成功；application/json { id: number, name: string }

</details>

<details>
<summary>PATCH /install/gallery/{id} - 更新图库</summary>

- OperationId: `InstallController_updateGallery`
- Tag: install-初始化
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 图库ID |

**请求体**

- `application/json`: UpdateGalleryDto: { name: string, cover: number, weights: number, hide: boolean, folders: string[], ... }

**响应**

- `200`: 更新成功；application/json { id: number, name: string }

</details>

<details>
<summary>DELETE /install/gallery/{id} - 删除图库</summary>

- OperationId: `InstallController_deleteGallery`
- Tag: install-初始化
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 图库ID |

**请求体**

无。

**响应**

- `200`: 删除成功；application/json { raw: object, affected: number }

</details>

<details>
<summary>GET /install/gallery/scan/{id} - 扫描图库</summary>

- OperationId: `InstallController_scanGallery`
- Tag: install-初始化
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 图库ID |

**请求体**

无。

**响应**

- `200`: 扫描成功；application/json { n: number }

</details>

<details>
<summary>PATCH /install/system-config - 更新系统配置</summary>

- OperationId: `InstallController_updateByKey`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: CreateSystemConfigDto: { key: string, value: string, hide: boolean }

**响应**

- `200`: 更新成功；application/json { key: string, value: string }

</details>

<details>
<summary>GET /install/system-config/{key} - 获取系统配置</summary>

- OperationId: `InstallController_findByKey`
- Tag: install-初始化
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| key | path | 是 | string | 配置键名 |

**请求体**

无。

**响应**

- `200`: 返回系统配置；application/json { key: string, value: string }

</details>

<details>
<summary>POST /install/upgrade - 手动升级</summary>

- OperationId: `InstallController_update`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 升级成功；application/json { success: boolean } \| { code: number, msg: string }

</details>

<details>
<summary>POST /install/autoUpgrade - 自动升级</summary>

- OperationId: `InstallController_autoUpgrade`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: { version: string, build: string, SHA1: string }

**响应**

- `200`: 升级成功；application/json { success: boolean }
- `400`: 错误的更新链接或SHA1值验证失败

</details>

<details>
<summary>GET /install/memory - 获取内存使用情况</summary>

- OperationId: `InstallController_memoryUsage`
- Tag: install-初始化
- Auth: Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回内存使用情况；application/json { rss: number, heapTotal: number, heapUsed: number, external: number, arrayBuffers: number }

</details>

<details>
<summary>POST /install/reload - 重载服务</summary>

- OperationId: `InstallController_reloadServer`
- Tag: install-初始化
- Auth: Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 重载成功；application/json { result: string }

</details>

<details>
<summary>GET /install/trail - 开始试用</summary>

- OperationId: `InstallController_startTrail`
- Tag: install-初始化
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回试用信息；application/json { trial: boolean }

</details>

### api-tag 标签管理

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-tag` | 获取标签列表 | api-key；Bearer Token |
| `POST` | `/api-tag` | 创建标签 | api-key；Bearer Token |
| `GET` | `/api-tag/tag/{id}` | 获取标签详情 | api-key；Bearer Token |
| `PUT` | `/api-tag/tag/{id}` | 更新标签（PUT） | api-key；Bearer Token |
| `PATCH` | `/api-tag/tag/{id}` | 更新标签（PATCH） | api-key；Bearer Token |
| `GET` | `/api-tag/files/{id}` | 获取标签关联的文件列表 | api-key；Bearer Token |
| `POST` | `/api-tag/editFileTag` | 编辑文件标签 | api-key；Bearer Token |
| `POST` | `/api-tag/fileAddTags` | 批量为文件添加标签 | api-key；Bearer Token |
| `POST` | `/api-tag/fileDelTagsInDb` | 批量删除文件标签（仅数据库） | api-key；Bearer Token |
| `POST` | `/api-tag/saveToExif` | 批量保存标签到 EXIF | api-key；Bearer Token |
| `POST` | `/api-tag/hideTag` | 隐藏空标签 | api-key；Bearer Token |
| `POST` | `/api-tag/hideEmptyTags` | 隐藏所有空标签 | api-key；Bearer Token |
| `POST` | `/api-tag/tagNames` | 根据 ID 获取标签名称 | api-key；Bearer Token |

<details>
<summary>GET /api-tag - 获取标签列表</summary>

- OperationId: `TagController_findAll`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| galleryIds | query | 否 | string | 图库 ID 列表（逗号分隔），不传则使用用户所有图库 |
| type | query | 否 | string | 类型：all 或不传，为 all 时返回最多 10000 条 |

**请求体**

无。

**响应**

- `200`: 返回标签列表；application/json Array<{ id: number, name: string, is_hide: boolean }>
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag - 创建标签</summary>

- OperationId: `TagController_create`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateTagDto: { name: string }

**响应**

- `201`: 创建成功，返回创建的标签信息；application/json { id: number, name: string, is_hide: boolean }
- `401`: 未授权访问

</details>

<details>
<summary>GET /api-tag/tag/{id} - 获取标签详情</summary>

- OperationId: `TagController_findTagDetail`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 标签 ID |

**请求体**

无。

**响应**

- `200`: 返回标签详情；application/json { id: number, name: string, is_hide: boolean }
- `401`: 未授权访问
- `403`: 无权访问该标签

</details>

<details>
<summary>PUT /api-tag/tag/{id} - 更新标签（PUT）</summary>

- OperationId: `TagController_updateTag_put`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 标签 ID |

**请求体**

- `application/json`: { is_hide: boolean }

**响应**

- `200`: 返回更新结果；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>PATCH /api-tag/tag/{id} - 更新标签（PATCH）</summary>

- OperationId: `TagController_updateTag`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 标签 ID |

**请求体**

- `application/json`: { is_hide: boolean }

**响应**

- `200`: 返回更新结果；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>GET /api-tag/files/{id} - 获取标签关联的文件列表</summary>

- OperationId: `TagController_findTagFiles`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 标签 ID |
| galleryIds | query | 是 | string | - |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表；application/json Array<{ date: string, files: object[] }>
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag/editFileTag - 编辑文件标签</summary>

- OperationId: `TagController_editFileTag`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { type: string, fileId: number, tagId: number, tagName: string }

**响应**

- `201`: 操作成功，返回结果；application/json { id: number } \| { n: number } \| { msg: string }
- `401`: 未授权访问或无权修改该文件

</details>

<details>
<summary>POST /api-tag/fileAddTags - 批量为文件添加标签</summary>

- OperationId: `TagController_fileAddTags`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileId: number, tagIds: number[] }

**响应**

- `201`: 添加成功；application/json { n: number } \| { msg: string }
- `401`: 未授权访问或无权修改该文件

</details>

<details>
<summary>POST /api-tag/fileDelTagsInDb - 批量删除文件标签（仅数据库）</summary>

- OperationId: `TagController_fileDelTagsInDb`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[], tagIds: number[] }

**响应**

- `201`: 删除成功；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag/saveToExif - 批量保存标签到 EXIF</summary>

- OperationId: `TagController_saveToExif`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { fileIds: number[] }

**响应**

- `201`: 保存成功；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag/hideTag - 隐藏空标签</summary>

- OperationId: `TagController_hideTag`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { tagId: number }

**响应**

- `201`: 隐藏成功；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag/hideEmptyTags - 隐藏所有空标签</summary>

- OperationId: `TagController_hideEmptyTags`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 操作成功；application/json { n: number }
- `401`: 未授权访问

</details>

<details>
<summary>POST /api-tag/tagNames - 根据 ID 获取标签名称</summary>

- OperationId: `TagController_getTagNames`
- Tag: api-tag 标签管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { tagIds: number[] }

**响应**

- `201`: 返回标签名称列表；application/json Array<{ id: number, name: string }>
- `401`: 未授权访问

</details>

### files 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `POST` | `/files/triggerBoundaryEvolution` | 触发边界演变 | api-key；Bearer Token |
| `POST` | `/files/resetFile/{id}` | 重置文件状态 | api-key；Bearer Token |
| `GET` | `/files/faceReg/{md5}` | 根据MD5获取文件人脸描述符 | api-key；Bearer Token |
| `GET` | `/files/count/{type}/{md5}` | 按MD5统计文件数量 | api-key；Bearer Token |
| `POST` | `/files/ocr/info` | 获取OCR任务信息 | api-key；Bearer Token |
| `POST` | `/files/ocr/task` | 获取OCR任务列表 | api-key；Bearer Token |
| `POST` | `/files/ocr/result` | 提交OCR识别结果 | api-key；Bearer Token |
| `POST` | `/files/ocr/resetStatus` | 重置OCR状态 | api-key；Bearer Token |
| `GET` | `/files/{id}` | 获取单个文件信息 | api-key；Bearer Token |
| `PATCH` | `/files/{id}` | 更新文件信息 | api-key；Bearer Token |
| `POST` | `/files/broTaskFileList` | 获取浏览器任务文件列表 | api-key；Bearer Token |
| `POST` | `/files/findInGpsDistrict` | 根据行政区划或坐标测试地理位置识别 | api-key；Bearer Token |

<details>
<summary>POST /files/triggerBoundaryEvolution - 触发边界演变</summary>

- OperationId: `FilesController__triggerBoundaryEvolution`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { adcode: string, township: string }

**响应**

- `200`: 边界演变处理完成或跳过（点数不足/正在处理中）；application/json { n: number, msg: string }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/resetFile/{id} - 重置文件状态</summary>

- OperationId: `FilesController_resetStatus`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

无。

**响应**

- `200`: 重置成功；application/json { affected: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /files/faceReg/{md5} - 根据MD5获取文件人脸描述符</summary>

- OperationId: `FilesController_findFilePeopleDescriptorByMd5`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| md5 | path | 是 | string | 文件MD5值 |

**请求体**

无。

**响应**

- `200`: 返回人脸描述符信息；application/json { hasReg: boolean, list: object[] }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /files/count/{type}/{md5} - 按MD5统计文件数量</summary>

- OperationId: `FilesController_countFileByMD5`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| type | path | 是 | string | 类型标识，需为COUNT_CHECK |
| md5 | path | 是 | string | 文件MD5值 |

**请求体**

无。

**响应**

- `200`: 返回文件数量；application/json
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/ocr/info - 获取OCR任务信息</summary>

- OperationId: `FilesController_getOcrInfo`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回OCR任务统计；application/json { inProcess: number, total: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/ocr/task - 获取OCR任务列表</summary>

- OperationId: `FilesController_getOcrTask`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回OCR任务列表；application/json { items: object[], MD5HasAdded: object, ignoreNum: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/ocr/result - 提交OCR识别结果</summary>

- OperationId: `FilesController_saveOcrResult`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { MD5: string, files: number[], results: object[] }

**响应**

- `200`: 返回更新结果；application/json { raw: object, affected: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/ocr/resetStatus - 重置OCR状态</summary>

- OperationId: `FilesController_resetOcrStatus`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回更新结果；application/json { raw: object, affected: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /files/{id} - 获取单个文件信息</summary>

- OperationId: `FilesController_findOne`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

无。

**响应**

- `200`: 返回文件详细信息；application/json File: { id: number, fileName: string, fileType: string, filePath: string, fileSize: number, ... }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>PATCH /files/{id} - 更新文件信息</summary>

- OperationId: `FilesController_update`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | 文件ID |

**请求体**

- `application/json`: UpdateFileDto: { fileName: string, fileType: string, filePath: string, fileSize: number, tokenAt: string, ... }

**响应**

- `200`: 返回更新后的文件信息；application/json File: { id: number, fileName: string, fileType: string, filePath: string, fileSize: number, ... }
- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /files/broTaskFileList - 获取浏览器任务文件列表 `deprecated`</summary>

- OperationId: `FilesController_getBrowserTaskFileList`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { passCode: string, type: string, pageNo: number, pageSize: number }

**响应**

- `200`: 返回文件列表；application/json Array<{ id: number, MD5: string, proxyStatus: number, width: number, height: number, ... }>

</details>

<details>
<summary>POST /files/findInGpsDistrict - 根据行政区划或坐标测试地理位置识别</summary>

- OperationId: `FilesController_findInGpsDistrict`
- Tag: files 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { lat: number, lng: number, adcode: string, type: string, token: string }

**响应**

- `200`: 返回地理位置信息；application/json object
- `401`: 未授权访问
- `403`: 无权限访问

</details>

### people-base 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/people-base/count` | 获取人物基础总数 | Bearer Token；api-key |
| `GET` | `/people-base/findForGenPeople` | 获取待生成人物的PeopleBase列表 | Bearer Token；api-key |
| `GET` | `/people-base/distance` | 计算两个人物基础之间的距离 | Bearer Token；api-key |
| `GET` | `/people-base/findAllPeopleBaseForMerge` | 分页获取所有人物基础列表（用于合并） | Bearer Token；api-key |
| `GET` | `/people-base/findAllMergerPeopleBase` | 获取所有已合并的人物基础列表 | Bearer Token；api-key |
| `GET` | `/people-base/findPeopleBaseFiles` | 根据人物基础ID获取关联的文件列表 | Bearer Token；api-key |
| `POST` | `/people-base/findFileMD5ByFileIds` | 根据文件ID列表获取MD5值（用于显示封面） | Bearer Token；api-key |
| `POST` | `/people-base/findBaseInfoByIds` | 根据人物基础ID列表获取基础信息 - adminOnly | Bearer Token；api-key |
| `POST` | `/people-base/adminMergeBaseIds` | 合并人物基础 - adminOnly | Bearer Token；api-key |
| `POST` | `/people-base/adminSetBaseId` | 设置人物基础（合并或更新名称）- adminOnly | Bearer Token；api-key |
| `GET` | `/people-base/baseInFileInfo` | 获取人物基础对应照片识别的人脸信息 - adminOnly | Bearer Token；api-key |
| `POST` | `/people-base/getNameFromPeople` | 根据人物基础ID获取人物名称 - adminOnly | Bearer Token；api-key |

<details>
<summary>GET /people-base/count - 获取人物基础总数</summary>

- OperationId: `PeopleBaseController_count`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回人物基础总数；application/json number

</details>

<details>
<summary>GET /people-base/findForGenPeople - 获取待生成人物的PeopleBase列表</summary>

- OperationId: `PeopleBaseController_findForGenPeople`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回待生成人物的PeopleBase列表；application/json Array<{ id: number, type: number, fileIds: number[] }>

</details>

<details>
<summary>GET /people-base/distance - 计算两个人物基础之间的距离</summary>

- OperationId: `PeopleBaseController_baseIdDistance`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id2 | query | 否 | number | 人物基础ID2 |
| id1 | query | 否 | number | 人物基础ID1 |

**请求体**

无。

**响应**

- `200`: 返回两个人物基础之间的平均距离值（0-1之间，越小越相似）；application/json number

</details>

<details>
<summary>GET /people-base/findAllPeopleBaseForMerge - 分页获取所有人物基础列表（用于合并）</summary>

- OperationId: `PeopleBaseController_findAllPeopleBase`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pageSize | query | 否 | number | 每页数量 |
| pageNo | query | 否 | number | 页码 |

**请求体**

无。

**响应**

- `200`: 返回人物基础列表；application/json Array<{ baseId: number, id: number, count: number, files: number[], vec_low: string, ... }>

</details>

<details>
<summary>GET /people-base/findAllMergerPeopleBase - 获取所有已合并的人物基础列表</summary>

- OperationId: `PeopleBaseController_findAllMergerPeopleBase`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回已合并的人物基础列表；application/json Array<{ id: number, name: string, base_ids: number[], user_id: number }>

</details>

<details>
<summary>GET /people-base/findPeopleBaseFiles - 根据人物基础ID获取关联的文件列表</summary>

- OperationId: `PeopleBaseController_findPeopleBaseFiles`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | query | 是 | number | 人物基础ID |

**请求体**

无。

**响应**

- `200`: 返回按日期分组的文件列表；application/json Array<{ day: string, addr: object, list: object[], ids: number[] }>

</details>

<details>
<summary>POST /people-base/findFileMD5ByFileIds - 根据文件ID列表获取MD5值（用于显示封面）</summary>

- OperationId: `PeopleBaseController_findMD5ByIds`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回文件MD5信息列表；application/json Array<{ id: number, md5: string, width: number, height: number }>

</details>

<details>
<summary>POST /people-base/findBaseInfoByIds - 根据人物基础ID列表获取基础信息 - adminOnly</summary>

- OperationId: `PeopleBaseController_findBaseInfoByIds`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 返回人物基础信息列表；application/json Array<{ baseId: number, count: number, files: number[], x: number, y: number, ... }>

</details>

<details>
<summary>POST /people-base/adminMergeBaseIds - 合并人物基础 - adminOnly</summary>

- OperationId: `PeopleBaseController_adminMergeBaseIds`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { targetId: number, ids: number[] }

**响应**

- `200`: 合并成功；application/json { n: number }

</details>

<details>
<summary>POST /people-base/adminSetBaseId - 设置人物基础（合并或更新名称）- adminOnly</summary>

- OperationId: `PeopleBaseController_adminSetBaseId`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { baseId: number, ids: number[], type: string enum, name: string }

**响应**

- `200`: 操作成功；application/json { n: number }

</details>

<details>
<summary>GET /people-base/baseInFileInfo - 获取人物基础对应照片识别的人脸信息 - adminOnly</summary>

- OperationId: `PeopleBaseController_peopleInFileInfo`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| fileId | query | 否 | string | 文件ID |
| baseId | query | 否 | string | 人物基础ID |

**请求体**

无。

**响应**

- `200`: 返回人脸信息列表；application/json Array<{ distance: number, descriptorInfo: object }>

</details>

<details>
<summary>POST /people-base/getNameFromPeople - 根据人物基础ID获取人物名称 - adminOnly</summary>

- OperationId: `PeopleBaseController_getNameFromPeople`
- Tag: people-base 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: { peopleBaseId: number }

**响应**

- `200`: 返回人物名称；application/json { name: string }

</details>

### people-descriptor 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `POST` | `/people-descriptor` | 创建人物特征描述 | api-key；Bearer Token |
| `GET` | `/people-descriptor/info` | 获取人脸识别任务信息（浏览器辅助识别用） | api-key；Bearer Token |
| `POST` | `/people-descriptor/resetFileStatus` | 重置文件人脸识别状态 | api-key；Bearer Token |
| `POST` | `/people-descriptor/itemDistV2` | 计算两个特征描述之间的距离（V2版本） | api-key；Bearer Token |
| `POST` | `/people-descriptor/faceRegTask` | 获取人脸识别任务列表（浏览器辅助识别用） | api-key；Bearer Token |
| `POST` | `/people-descriptor/faceRegResult` | 保存人脸识别结果（浏览器辅助识别用） | api-key；Bearer Token |
| `POST` | `/people-descriptor/findDescriptorOfFileForPeople` | 查找人物对应的特征描述 | api-key；Bearer Token |
| `POST` | `/people-descriptor/findLikelyBase0Descriptor` | 查找相似的未匹配人物特征描述 | api-key；Bearer Token |
| `GET` | `/people-descriptor/findDescriptorOfFile/{fileId}` | 获取文件的人脸特征描述列表 | api-key；Bearer Token |
| `GET` | `/people-descriptor/{id}` | 根据ID获取人物特征描述 | api-key；Bearer Token |
| `PATCH` | `/people-descriptor/{id}` | 更新人物特征描述 | api-key；Bearer Token |

<details>
<summary>POST /people-descriptor - 创建人物特征描述</summary>

- OperationId: `PeopleDescriptorController_create`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreatePeopleDescriptorDto: { box: Box, files: string[], vec_low: string[], vec_high: string[], pass: boolean }

**响应**

- `201`: 创建成功；application/json { id: number, files: number[], pass: boolean, peopleBaseId: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /people-descriptor/info - 获取人脸识别任务信息（浏览器辅助识别用） `deprecated`</summary>

- OperationId: `PeopleDescriptorController_getInfo`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 获取成功；application/json { inProcess: number, total: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/resetFileStatus - 重置文件人脸识别状态</summary>

- OperationId: `PeopleDescriptorController_resetFileStatus`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { ids: number[] }

**响应**

- `200`: 重置成功；application/json { raw: object, affected: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/itemDistV2 - 计算两个特征描述之间的距离（V2版本）</summary>

- OperationId: `PeopleDescriptorController_itemDistV2`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { id1: number, id2: number }

**响应**

- `200`: 计算成功；application/json { distance: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/faceRegTask - 获取人脸识别任务列表（浏览器辅助识别用） `deprecated`</summary>

- OperationId: `PeopleDescriptorController_getTfTaskFiles`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 获取成功；application/json { items: object[], MD5HasAdded: object, ignoreNum: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/faceRegResult - 保存人脸识别结果（浏览器辅助识别用） `deprecated`</summary>

- OperationId: `PeopleDescriptorController_saveFaceRegResult`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { MD5: string, scale: number, width: number, height: number, files: number[], result: object[] }

**响应**

- `200`: 保存成功；application/json { pass: boolean, ids: number[] }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/findDescriptorOfFileForPeople - 查找人物对应的特征描述</summary>

- OperationId: `PeopleDescriptorController_findDescriptorOfFileForPeople`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { peopleBaseIds: number[], fileId: number }

**响应**

- `200`: 查询成功；application/json Array<{ id: number, files: number[], pass: boolean, peopleBaseId: number, box: object }>
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /people-descriptor/findLikelyBase0Descriptor - 查找相似的未匹配人物特征描述</summary>

- OperationId: `PeopleDescriptorController_adminFindLikelyNoMatchedDescriptor`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { descriptorId: number, vec: string, distance: number }

**响应**

- `200`: 查询成功；application/json Array<{ id: number, files: number[], pass: boolean, peopleBaseId: number, box: object, ... }>
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /people-descriptor/findDescriptorOfFile/{fileId} - 获取文件的人脸特征描述列表</summary>

- OperationId: `PeopleDescriptorController_findDescriptorOfFile`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| fileId | path | 是 | number | 文件ID |

**请求体**

无。

**响应**

- `200`: 查询成功；application/json Array<{ id: number, files: number[], pass: boolean, peopleBaseId: number, box: object, ... }>
- `401`: 未授权访问

</details>

<details>
<summary>GET /people-descriptor/{id} - 根据ID获取人物特征描述</summary>

- OperationId: `PeopleDescriptorController_findOne`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 特征描述ID |

**请求体**

无。

**响应**

- `200`: 查询成功；application/json { id: number, files: number[], pass: boolean, peopleBaseId: number, box: object }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>PATCH /people-descriptor/{id} - 更新人物特征描述</summary>

- OperationId: `PeopleDescriptorController_update`
- Tag: people-descriptor 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 特征描述ID |

**请求体**

- `application/json`: UpdatePeopleDescriptorDto: { box: Box, files: string[], vec_low: string[], vec_high: string[], pass: boolean }

**响应**

- `200`: 更新成功；application/json { id: number, files: number[], pass: boolean, peopleBaseId: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

### users 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `PATCH` | `/users/resetSuperAdminPwd` | 重置管理员密码 | api-key；Bearer Token |
| `GET` | `/users` | 用户列表 | api-key；Bearer Token |
| `POST` | `/users` | 创建用户 | api-key；Bearer Token |
| `GET` | `/users/{id}` | 用户信息 | api-key；Bearer Token |
| `PATCH` | `/users/{id}` | 更新用户信息 | api-key；Bearer Token |
| `DELETE` | `/users/{id}` | 删除用户 | api-key；Bearer Token |
| `PATCH` | `/users/resetPwd/{id}` | 重置用户密码 | api-key；Bearer Token |
| `GET` | `/users/userIdNameList` | 获取全部用户的 id、uid、username | api-key；Bearer Token |

<details>
<summary>PATCH /users/resetSuperAdminPwd - 重置管理员密码</summary>

- OperationId: `UsersController_resetSuperAdminPwd`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { check: string }

**响应**

- `200`: 重置结果；application/json { n: number }

</details>

<details>
<summary>GET /users - 用户列表</summary>

- OperationId: `UsersController_findAll`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回用户列表；application/json Array<{ id: number, uid: string, username: string, email: string, isAdmin: boolean, ... }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>POST /users - 创建用户</summary>

- OperationId: `UsersController_create`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateUserDto: { username: string, email: string, password: string, otp_secret: string, isAdmin: boolean, ... }

**响应**

- `201`: 用户创建成功；application/json { success: boolean }
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /users/{id} - 用户信息</summary>

- OperationId: `UsersController_findOne`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 用户ID |

**请求体**

无。

**响应**

- `200`: 返回用户详情；application/json User: { id: number, uid: string, username: string, email: string, password: string, ... }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: 用户不存在

</details>

<details>
<summary>PATCH /users/{id} - 更新用户信息</summary>

- OperationId: `UsersController_update`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 用户ID |

**请求体**

- `application/json`: UpdateUserDto: { username: string, email: string, password: string, otp_secret: string, isAdmin: boolean, ... }

**响应**

- `200`: 用户信息更新成功；application/json User: { id: number, uid: string, username: string, email: string, password: string, ... }
- `400`: 请求参数错误或用户名已被使用
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>DELETE /users/{id} - 删除用户</summary>

- OperationId: `UsersController_remove`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 用户ID |

**请求体**

无。

**响应**

- `200`: 用户删除成功；application/json { success: boolean }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: 用户不存在

</details>

<details>
<summary>PATCH /users/resetPwd/{id} - 重置用户密码</summary>

- OperationId: `UsersController_resetPwd`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 用户ID |

**请求体**

无。

**响应**

- `200`: 密码重置成功，返回新密码；application/json { password: string }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /users/userIdNameList - 获取全部用户的 id、uid、username</summary>

- OperationId: `UsersController_findIdMap`
- Tag: users 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回用户简要信息列表；application/json Array<{ id: number, uid: string, username: string }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

### API Key 管理

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-keys` | 获取当前用户的 API Key 列表 | api-key；Bearer Token |
| `POST` | `/api-keys` | 创建新的 API Key | api-key；Bearer Token |
| `GET` | `/api-keys/{id}` | 获取当前用户的单个 API Key | api-key；Bearer Token |
| `PATCH` | `/api-keys/{id}` | 更新当前用户的 API Key | api-key；Bearer Token |
| `DELETE` | `/api-keys/{id}` | 删除当前用户的 API Key | api-key；Bearer Token |
| `POST` | `/api-keys/{id}/regenerate` | 重新生成当前用户的 API Key | api-key；Bearer Token |

<details>
<summary>GET /api-keys - 获取当前用户的 API Key 列表</summary>

- OperationId: `ApiKeyController_findAll`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回当前用户的所有 API Key 列表；application/json Array<{ id: string, userId: number, name: string, isActive: boolean, expiresAt: string, ... }>
- `401`: 未授权

</details>

<details>
<summary>POST /api-keys - 创建新的 API Key</summary>

- OperationId: `ApiKeyController_create`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { name: string, expiresAt: string, remark: string }

**响应**

- `201`: API Key 创建成功，plainKey 仅返回一次，请妥善保存；application/json { id: string, name: string, plainKey: string, expiresAt: string, createdAt: string }
- `401`: 未授权

</details>

<details>
<summary>GET /api-keys/{id} - 获取当前用户的单个 API Key</summary>

- OperationId: `ApiKeyController_findOne`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `200`: 返回 API Key 详情；application/json { id: string, userId: number, name: string, isActive: boolean, expiresAt: string, remark: string, createdAt: string, updatedAt: string, lastUsedAt: string }
- `401`: 未授权
- `404`: API Key 不存在

</details>

<details>
<summary>PATCH /api-keys/{id} - 更新当前用户的 API Key</summary>

- OperationId: `ApiKeyController_update`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

- `application/json`: { name: string, isActive: boolean, expiresAt: string, remark: string }

**响应**

- `200`: API Key 更新成功；application/json { success: boolean }
- `401`: 未授权
- `404`: API Key 不存在或更新失败

</details>

<details>
<summary>DELETE /api-keys/{id} - 删除当前用户的 API Key</summary>

- OperationId: `ApiKeyController_remove`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `200`: API Key 删除成功；application/json { success: boolean }
- `401`: 未授权
- `404`: API Key 不存在

</details>

<details>
<summary>POST /api-keys/{id}/regenerate - 重新生成当前用户的 API Key</summary>

- OperationId: `ApiKeyController_regenerate`
- Tag: API Key 管理
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `201`: API Key 重新生成成功，旧的 Key 已失效；application/json { id: string, plainKey: string }
- `401`: 未授权
- `404`: API Key 不存在

</details>

### API Key管理 - 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-keys-admin` | 获取所有用户的 API Key 列表（管理员） | api-key；Bearer Token |
| `POST` | `/api-keys-admin` | 为指定用户创建 API Key（管理员） | api-key；Bearer Token |
| `GET` | `/api-keys-admin/{id}` | 获取单个 API Key（管理员） | api-key；Bearer Token |
| `PATCH` | `/api-keys-admin/{id}` | 更新 API Key（管理员） | api-key；Bearer Token |
| `DELETE` | `/api-keys-admin/{id}` | 删除 API Key（管理员） | api-key；Bearer Token |
| `POST` | `/api-keys-admin/{id}/regenerate` | 重新生成 API Key（管理员） | api-key；Bearer Token |

<details>
<summary>GET /api-keys-admin - 获取所有用户的 API Key 列表（管理员）</summary>

- OperationId: `ApiKeyAdminController_findAll`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| userId | query | 否 | number | 按用户ID筛选 |

**请求体**

无。

**响应**

- `200`: 返回所有用户的 API Key 列表；application/json Array<{ id: string, userId: number, name: string, isActive: boolean, expiresAt: string, ... }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>POST /api-keys-admin - 为指定用户创建 API Key（管理员）</summary>

- OperationId: `ApiKeyAdminController_create`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: { userId: number, name: string, expiresAt: string, remark: string }

**响应**

- `201`: API Key 创建成功，plainKey 仅返回一次，请妥善保存；application/json { id: string, userId: number, name: string, plainKey: string, expiresAt: string, createdAt: string, message: string }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /api-keys-admin/{id} - 获取单个 API Key（管理员）</summary>

- OperationId: `ApiKeyAdminController_findOne`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `200`: 返回 API Key 详情；application/json { id: string, userId: number, name: string, isActive: boolean, expiresAt: string, remark: string, createdAt: string, updatedAt: string, lastUsedAt: string }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: API Key 不存在

</details>

<details>
<summary>PATCH /api-keys-admin/{id} - 更新 API Key（管理员）</summary>

- OperationId: `ApiKeyAdminController_update`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

- `application/json`: { name: string, isActive: boolean, expiresAt: string, remark: string }

**响应**

- `200`: API Key 更新成功；application/json { success: boolean }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: API Key 不存在或更新失败

</details>

<details>
<summary>DELETE /api-keys-admin/{id} - 删除 API Key（管理员）</summary>

- OperationId: `ApiKeyAdminController_remove`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `200`: API Key 删除成功；application/json { success: boolean }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: API Key 不存在

</details>

<details>
<summary>POST /api-keys-admin/{id}/regenerate - 重新生成 API Key（管理员）</summary>

- OperationId: `ApiKeyAdminController_regenerate`
- Tag: API Key管理 - 仅限管理员调用
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | string | API Key ID |

**请求体**

无。

**响应**

- `201`: API Key 重新生成成功，旧的 Key 已失效；application/json { id: string, plainKey: string, message: string }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）
- `404`: API Key 不存在

</details>

### people 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/people` | 获取所有人物列表 | Bearer Token；api-key |
| `POST` | `/people` | 创建人物 | Bearer Token；api-key |
| `GET` | `/people/base/{id}` | 根据人物基础ID获取人物列表 | Bearer Token；api-key |
| `GET` | `/people/{id}` | 根据ID获取人物详情 | Bearer Token；api-key |
| `PATCH` | `/people/{id}` | 更新人物信息 | Bearer Token；api-key |
| `DELETE` | `/people/{id}` | 删除人物 | Bearer Token；api-key |

<details>
<summary>GET /people - 获取所有人物列表</summary>

- OperationId: `PeopleController_findAll`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回所有人物列表；application/json Array<{ id: number, name: string, userId: number, cover: number, isHide: boolean, ... }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>POST /people - 创建人物</summary>

- OperationId: `PeopleController_create`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: CreatePeopleDto: { id: number, name: string, cover: number, count: number, isHide: boolean, ... }

**响应**

- `201`: 人物创建成功；application/json { id: number, name: string, userId: number, cover: number, isHide: boolean, baseIds: number[], count: number, ver: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /people/base/{id} - 根据人物基础ID获取人物列表</summary>

- OperationId: `PeopleController_findById`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 人物基础ID |

**请求体**

无。

**响应**

- `200`: 返回人物列表；application/json Array<{ id: number, base_ids: number[], user_id: number }>
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>GET /people/{id} - 根据ID获取人物详情</summary>

- OperationId: `PeopleController_findOne`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 人物ID |

**请求体**

无。

**响应**

- `200`: 返回人物详情；application/json { id: number, name: string, userId: number, cover: number, isHide: boolean, baseIds: number[], count: number, ver: number, fileIds: number[] }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>PATCH /people/{id} - 更新人物信息</summary>

- OperationId: `PeopleController_update`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 人物ID |

**请求体**

- `application/json`: UpdatePeopleDto: { id: number, name: string, cover: number, count: number, isHide: boolean, ... }

**响应**

- `200`: 人物信息更新成功；application/json { id: number, name: string, userId: number, cover: number, isHide: boolean, baseIds: number[], count: number, ver: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

<details>
<summary>DELETE /people/{id} - 删除人物</summary>

- OperationId: `PeopleController_remove`
- Tag: people 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 人物ID |

**请求体**

无。

**响应**

- `200`: 人物删除成功；application/json { raw: object, affected: number }
- `401`: 未授权
- `403`: 无权限（需要管理员权限）

</details>

### 服务端信息+用户登录

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/api-info` | 获取 API 信息 | 未声明 |
| `POST` | `/auth/rsa` | 获取RSA公钥 | 未声明 |
| `POST` | `/auth/login` | 登录 | 未声明 |
| `POST` | `/auth/refresh` | 刷新token | 未声明 |
| `POST` | `/auth/auth_code` | 获取auth_code，有效时间为24小时内 | 未声明 |

<details>
<summary>GET /api-info - 获取 API 信息</summary>

- OperationId: `AppController_getInfo`
- Tag: 服务端信息+用户登录
- Auth: 未声明

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| type | query | 否 | - | 可选值: all 或留空 |

**请求体**

无。

**响应**

- `200`: 返回服务端信息；application/json { version: string, build: string, activated: boolean, arch: string, platform: string, tzOffset: number, faceRegVer: string, dbStatus: string }

</details>

<details>
<summary>POST /auth/rsa - 获取RSA公钥</summary>

- OperationId: `AppController_getLoginRSAKeys`
- Tag: 服务端信息+用户登录
- Auth: 未声明

**参数**

无。

**请求体**

无。

**响应**

- `200`: 返回RSA公钥用于登录密码加密；application/json { publicKey: string, ver: number }

</details>

<details>
<summary>POST /auth/login - 登录</summary>

- OperationId: `AppController_login`
- Tag: 服务端信息+用户登录
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: { username: string, password: string, otp: string, dev: boolean }

**响应**

- `200`: 登录成功；application/json { username: string, id: number, uid: string, isAdmin: boolean, access_token: string, refresh_token: string, expires_in: number, auth_code: string }

</details>

<details>
<summary>POST /auth/refresh - 刷新token</summary>

- OperationId: `AppController_refreshToken`
- Tag: 服务端信息+用户登录
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: { token: string, ver: number }

**响应**

- `200`: 刷新成功；application/json { access_token: string, refresh_token: string, expires_in: number, auth_code: string }
- `401`: 未授权，需要重新登录

</details>

<details>
<summary>POST /auth/auth_code - 获取auth_code，有效时间为24小时内</summary>

- OperationId: `AppController_getAuthCode`
- Tag: 服务端信息+用户登录
- Auth: 未声明

**参数**

无。

**请求体**

- `application/json`: { refresh_token: string, api_key: string }

**响应**

- `200`: 获取成功；application/json { auth_code: string }

</details>

### folder 仅限管理员调用

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/folder` | 获取文件夹列表 | Bearer Token；api-key |
| `POST` | `/folder` | 创建文件夹 | Bearer Token；api-key |
| `GET` | `/folder/{id}` | 获取单个文件夹 | Bearer Token；api-key |
| `PATCH` | `/folder/{id}` | 更新文件夹 | Bearer Token；api-key |
| `DELETE` | `/folder/{id}` | 删除文件夹 | Bearer Token；api-key |

<details>
<summary>GET /folder - 获取文件夹列表</summary>

- OperationId: `FoldersController_findAll`
- Tag: folder 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pageNo | query | 否 | number | 页码，默认1 |
| pageSize | query | 否 | number | 每页数量，默认10 |

**请求体**

无。

**响应**

- `200`: 查询成功；application/json Array<Folder: { id: number, name: string, path: string, ino: string, cover: string, ... }>
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>POST /folder - 创建文件夹</summary>

- OperationId: `FoldersController_create`
- Tag: folder 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

无。

**请求体**

- `application/json`: CreateFolderDto: { name: string, path: string, cover: string, s_cover: string, ino: string, ... }

**响应**

- `201`: 创建成功；application/json Folder: { id: number, name: string, path: string, ino: string, cover: string, ... }
- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>GET /folder/{id} - 获取单个文件夹</summary>

- OperationId: `FoldersController_findOne`
- Tag: folder 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件夹ID |

**请求体**

无。

**响应**

- `200`: 查询成功；application/json Folder: { id: number, name: string, path: string, ino: string, cover: string, ... }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>PATCH /folder/{id} - 更新文件夹</summary>

- OperationId: `FoldersController_update`
- Tag: folder 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件夹ID |

**请求体**

- `application/json`: UpdateFolderDto: { name: string, path: string, cover: string, s_cover: string, ino: string, ... }

**响应**

- `200`: 更新成功；application/json Folder: { id: number, name: string, path: string, ino: string, cover: string, ... }
- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 无权限访问

</details>

<details>
<summary>DELETE /folder/{id} - 删除文件夹</summary>

- OperationId: `FoldersController_remove`
- Tag: folder 仅限管理员调用
- Auth: Bearer Token；api-key

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 文件夹ID |

**请求体**

无。

**响应**

- `200`: 删除成功；application/json { raw: object, affected: number }
- `401`: 未授权访问
- `403`: 无权限访问

</details>

### file-delete-log - 文件删除日志

| 方法 | 路径 | 摘要 | 鉴权 |
| --- | --- | --- | --- |
| `GET` | `/file-delete-log` | 分页查询文件删除日志 | api-key；Bearer Token |
| `POST` | `/file-delete-log` | 创建文件删除日志 | api-key；Bearer Token |
| `GET` | `/file-delete-log/{id}` | 根据ID查询删除日志 | api-key；Bearer Token |
| `POST` | `/file-delete-log/clearData` | 清空所有删除日志 | api-key；Bearer Token |

<details>
<summary>GET /file-delete-log - 分页查询文件删除日志</summary>

- OperationId: `FileDeleteLogController_findAll`
- Tag: file-delete-log - 文件删除日志
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| pageSize | query | 否 | number | 每页数量，默认为20 |
| pageNo | query | 否 | number | 页码，默认为1 |

**请求体**

无。

**响应**

- `200`: 返回日志列表和总数；application/json { count: number, list: object[] }
- `401`: 未授权访问
- `403`: 无管理员权限

</details>

<details>
<summary>POST /file-delete-log - 创建文件删除日志</summary>

- OperationId: `FileDeleteLogController_create`
- Tag: file-delete-log - 文件删除日志
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

- `application/json`: CreateFileDeleteLogDto: { path: string, userId: number, type: number }

**响应**

- `201`: 创建成功，返回创建的日志记录；application/json { id: number, filePath: string, fileName: string, fileSize: number, deleteTime: string, userId: number }
- `401`: 未授权访问
- `403`: 无管理员权限

</details>

<details>
<summary>GET /file-delete-log/{id} - 根据ID查询删除日志</summary>

- OperationId: `FileDeleteLogController_findOne`
- Tag: file-delete-log - 文件删除日志
- Auth: api-key；Bearer Token

**参数**

| 名称 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| id | path | 是 | number | 日志ID |

**请求体**

无。

**响应**

- `200`: 返回日志详情；application/json { id: number, filePath: string, fileName: string, fileSize: number, deleteTime: string, userId: number }
- `401`: 未授权访问
- `403`: 无管理员权限
- `404`: 日志不存在

</details>

<details>
<summary>POST /file-delete-log/clearData - 清空所有删除日志</summary>

- OperationId: `FileDeleteLogController_clearAllData`
- Tag: file-delete-log - 文件删除日志
- Auth: api-key；Bearer Token

**参数**

无。

**请求体**

无。

**响应**

- `201`: 清空成功；application/json { raw: object, affected: number }
- `401`: 未授权访问
- `403`: 无管理员权限

</details>

## Schemas

### Box

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| x | number | 是 | - | - |
| y | number | 是 | - | - |
| width | number | 是 | - | - |
| height | number | 是 | - | - |

### CreateAlbumDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 是 | - | - |
| weights | number | 否 | - | - |
| count | number | 否 | - | - |
| cover | string | 否 | - | - |
| startTime | string | 否 | - | - |
| endTime | string | 否 | - | - |
| files | string[] | 否 | - | - |
| ignore_files | string[] | 否 | - | - |
| auto_files | string[] | 否 | - | - |
| sort_type | string | 否 | - | - |
| deleted | boolean | 否 | - | - |
| hide | boolean | 否 | - | - |
| theme | string | 否 | - | - |
| extra_time1 | string | 否 | - | - |

### CreateFileDeleteLogDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| path | string | 是 | 文件原始路径 | /upload/admin/test.png |
| userId | number | 是 | 删除文件的用户ID | 1 |
| type | number | 否 | 删除类型：1-用户删除, 2-重复文件清理, 3-删除文件夹 | 1 |

### CreateFolderDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 是 | - | - |
| path | string | 是 | - | - |
| cover | string | 否 | - | - |
| s_cover | string | 否 | - | - |
| ino | string | 否 | - | - |
| subFolders | string[] | 否 | - | - |
| subFileNum | number | 否 | - | - |
| files | string[] | 否 | - | - |
| isDeleted | boolean | 否 | - | - |

### CreateGalleryDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 是 | - | - |
| cover | number | 否 | - | - |
| weights | number | 否 | - | - |
| hide | boolean | 是 | - | - |
| folders | string[] | 是 | - | - |
| userIds | number | 否 | - | - |
| func_exclude | string[] | 否 | - | - |

### CreatePeopleDescriptorDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| box | Box | 是 | - | - |
| files | string[] | 是 | - | - |
| vec_low | string[] | 是 | - | - |
| vec_high | string[] | 是 | - | - |
| pass | boolean | 是 | - | - |

### CreatePeopleDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| id | number | 是 | - | - |
| name | string | 是 | - | - |
| cover | number | 是 | - | - |
| count | number | 是 | - | - |
| isHide | boolean | 是 | - | - |
| userId | number | 是 | - | - |
| ver | number | 是 | - | - |
| baseIds | string[] | 是 | - | - |
| files | object | 是 | - | - |

### CreateShareDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| userId | number | 是 | - | - |
| albumId | number | 是 | - | - |
| link | boolean | 是 | - | - |
| linkPwd | string | 是 | - | - |
| key | string | 是 | - | - |
| isSingleFile | boolean | 是 | - | - |
| linkEndTime | string | 否 | - | - |
| vUserIds | string[] | 否 | - | - |
| cUserIds | string[] | 否 | - | - |

### CreateShareFilesDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| userId | number | 是 | - | - |
| files | string[] | 是 | - | - |
| count | number | 是 | - | - |
| albumId | number | 是 | - | - |
| cover | string | 是 | - | - |
| link | boolean | 是 | - | - |
| linkPwd | string | 是 | - | - |
| key | string | 是 | - | - |
| desc | string | 是 | - | - |
| linkEndTime | string | 否 | - | - |
| showExif | boolean | 是 | - | - |
| showDownload | boolean | 是 | - | - |

### CreateSystemConfigDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| key | string | 是 | - | - |
| value | string | 是 | - | - |
| hide | boolean | 否 | - | - |

### CreateTagDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 是 | 标签名称 | 旅行 |

### CreateUserDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| username | string | 是 | - | - |
| email | string | 否 | - | - |
| password | string | 是 | - | - |
| otp_secret | string | 是 | - | - |
| isAdmin | boolean | 是 | - | - |
| isEnabled | boolean | 是 | - | - |
| isSuperAdmin | boolean | 否 | - | - |
| galleries | string[] | 否 | - | - |

### File

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| id | number | 是 | 文件ID | id |
| fileName | string | 是 | 文件名称 | IMG_108.HEIC |
| fileType | string | 是 | 文件类型 | HEIC |
| filePath | string | 是 | 文件路径 | E:\photos\IMG_108.HEIC |
| fileSize | number | 是 | 文件大小（字节） | 1024000 |
| galleryIds | string[] | 是 | 所属图库ID列表 | [1,2] |
| tokenAt | string | 是 | 拍摄日期 | - |
| mtime | string | 是 | 最后修改日期 | - |
| MD5 | string | 是 | 文件MD5值 | a1b2c3d4e5f6... |
| duration | number | 是 | 视频时长（秒） | 10.5 |
| width | number | 是 | 图片/视频宽度 | 1920 |
| height | number | 是 | 图片/视频高度 | 1080 |
| orientation | number | 是 | EXIF方向信息 | 1 |
| rotation | number | 是 | 旋转角度 | 90 |
| m_rotate | number | 是 | 手动旋转角度 | 180 |
| status | number | 是 | 文件处理状态：0未处理，1处理中，2处理成功，-1出错，-10已删除 | 2 |
| proxyStatus | number | 是 | 代理文件状态：0未处理，1处理中，2已处理，12忽略，-1出错 | 2 |
| previewStatus | number | 是 | 预览状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| peopleDescriptorStatus | number | 是 | 人脸描述符状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| categoryStatus | number | 是 | 场景分类状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| ocrStatus | number | 是 | OCR状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| clipStatus | number | 是 | CLIP特征状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| transcodeStatus | number | 是 | 转码状态：0未处理，1处理中，2已处理，12忽略，-1出错 | 2 |
| similarStatus | number | 是 | 相似图状态：0未处理，1处理中，2已处理，-1出错 | 2 |
| similar_value | string | 是 | 相似图标识值 | abc123def456 |
| livePhotosVideoId | number | 是 | 关联的livePhotos 文件id | 1 |
| isLivePhotosVideo | boolean | 是 | 是否为Live Photo的视频文件 | false |
| live_photo_UUID | string | 是 | Live Photo的UUID | A1B2C3D4-E5F6-7890 |
| isScreenshot | boolean | 是 | 是否为截图 | false |
| isScreenRecord | boolean | 是 | 是否为屏幕录制 | false |
| isSelfie | boolean | 是 | 是否为自拍 | false |
| extra | FileExtra | 是 | 部分exif信息 | {"id":25227,"FNumber":1.8,"ISO":320,"ExposureTime":"1/60","FocalLength":"4.2 mm","FocalLengthIn35mmFormat":"26 mm","M... |
| gps | FileGPS | 是 | gps信息 | {"id":2020,"latitude":"30.242995","longitude":"120.096970","altitude":"11.212236","infoId":1021} |
| gpsInfo | FileGPSInfo | 是 | gps逆地理位置信息 | {"id":4934,"name":"","province":"浙江省","city":"杭州市","district":"西湖区","township":"西湖街道","adcode":"156330106","autoNavi"... |
| folderId | number | 是 | 所属文件夹ID | 1 |

### FileExtra

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |

### FileGPS

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |

### FileGPSInfo

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |

### Folder

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| id | number | 是 | 文件夹ID | id |
| name | string | 是 | 文件夹的名称 | 风景 |
| path | string | 是 | 文件夹的路径 | 风景 |
| ino | string | 是 | 文件夹的inode值 | 21392098230558585 |
| cover | string | 是 | 文件夹的封面 | md5,md5 |
| s_cover | string | 是 | 指定的文件夹的封面 | md5,md5 |
| subFileNum | number | 是 | 子文件数量 | 0 |
| isDeleted | boolean | 是 | 是否为被删除 | false |

### UpdateAlbumDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 否 | - | - |
| weights | number | 否 | - | - |
| count | number | 否 | - | - |
| cover | string | 否 | - | - |
| startTime | string | 否 | - | - |
| endTime | string | 否 | - | - |
| files | string[] | 否 | - | - |
| ignore_files | string[] | 否 | - | - |
| auto_files | string[] | 否 | - | - |
| sort_type | string | 否 | - | - |
| deleted | boolean | 否 | - | - |
| hide | boolean | 否 | - | - |
| theme | string | 否 | - | - |
| extra_time1 | string | 否 | - | - |

### UpdateFileDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| fileName | string | 否 | - | - |
| fileType | string | 否 | - | - |
| filePath | string | 否 | - | - |
| fileSize | number | 否 | - | - |
| tokenAt | string | 否 | - | - |
| mtime | string | 否 | - | - |
| MD5 | string | 否 | - | - |
| galleryIds | string[] | 否 | - | - |
| duration | number | 否 | - | - |
| width | number | 否 | - | - |
| height | number | 否 | - | - |
| orientation | number | 否 | - | - |
| rotation | number | 否 | - | - |
| m_rotate | number | 否 | - | - |
| isLivePhotosVideo | boolean | 否 | - | - |
| livePhotosVideoId | number | 否 | - | - |
| folderId | number | 否 | - | - |
| status | number enum | 否 | - | [-1,0,1,2] |
| proxyStatus | number enum | 否 | - | [-1,0,1,2] |
| previewStatus | number enum | 否 | - | [-1,0,1,2] |
| peopleDescriptorStatus | number enum | 否 | - | [-1,0,1,2] |
| categoryStatus | number enum | 否 | - | [-1,0,1,2] |
| ocrStatus | number enum | 否 | - | [-1,0,1,2] |
| clipStatus | number enum | 否 | - | [-1,0,1,2] |
| transcodeStatus | number enum | 否 | - | [-1,0,1,2,12] |
| similarStatus | number enum | 否 | - | [-1,0,1,2] |
| similar_value | string | 否 | - | - |
| live_photo_UUID | string | 否 | - | - |
| extra | object | 否 | - | - |
| gps | object | 否 | - | - |
| gpsInfo | object | 否 | - | - |

### UpdateFolderDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 否 | - | - |
| path | string | 否 | - | - |
| cover | string | 否 | - | - |
| s_cover | string | 否 | - | - |
| ino | string | 否 | - | - |
| subFolders | string[] | 否 | - | - |
| subFileNum | number | 否 | - | - |
| files | string[] | 否 | - | - |
| isDeleted | boolean | 否 | - | - |

### UpdateGalleryDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| name | string | 否 | - | - |
| cover | number | 否 | - | - |
| weights | number | 否 | - | - |
| hide | boolean | 否 | - | - |
| folders | string[] | 否 | - | - |
| userIds | number | 否 | - | - |
| func_exclude | string[] | 否 | - | - |

### UpdatePeopleDescriptorDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| box | Box | 否 | - | - |
| files | string[] | 否 | - | - |
| vec_low | string[] | 否 | - | - |
| vec_high | string[] | 否 | - | - |
| pass | boolean | 否 | - | - |

### UpdatePeopleDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| id | number | 否 | - | - |
| name | string | 否 | - | - |
| cover | number | 否 | - | - |
| count | number | 否 | - | - |
| isHide | boolean | 否 | - | - |
| userId | number | 否 | - | - |
| ver | number | 否 | - | - |
| baseIds | string[] | 否 | - | - |
| files | object | 否 | - | - |

### UpdateShareDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| userId | number | 否 | - | - |
| albumId | number | 否 | - | - |
| link | boolean | 否 | - | - |
| linkPwd | string | 否 | - | - |
| key | string | 否 | - | - |
| isSingleFile | boolean | 否 | - | - |
| linkEndTime | string | 否 | - | - |
| vUserIds | string[] | 否 | - | - |
| cUserIds | string[] | 否 | - | - |

### UpdateShareFilesDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| userId | number | 否 | - | - |
| files | string[] | 否 | - | - |
| count | number | 否 | - | - |
| albumId | number | 否 | - | - |
| cover | string | 否 | - | - |
| link | boolean | 否 | - | - |
| linkPwd | string | 否 | - | - |
| key | string | 否 | - | - |
| desc | string | 否 | - | - |
| linkEndTime | string | 否 | - | - |
| showExif | boolean | 否 | - | - |
| showDownload | boolean | 否 | - | - |

### UpdateUserDto

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| username | string | 否 | - | - |
| email | string | 否 | - | - |
| password | string | 否 | - | - |
| otp_secret | string | 否 | - | - |
| isAdmin | boolean | 否 | - | - |
| isEnabled | boolean | 否 | - | - |
| isSuperAdmin | boolean | 否 | - | - |
| galleries | string[] | 否 | - | - |

### User

| 字段 | 类型 | 必填 | 说明 | 示例 / 枚举 |
| --- | --- | --- | --- | --- |
| id | number | 是 | 用户ID | id |
| uid | string | 是 | 用户uuid | id |
| username | string | 是 | 用户名 | nero |
| email | string | 是 | 电子邮箱地址 | example@example.com |
| password | string | 是 | 登录密码 | 123456 |
| otp_secret | string | 是 | 2FA密钥 | base32 |
| isAdmin | boolean | 是 | 是否为管理员 | false |
| isSuperAdmin | boolean | 是 | 是否为超级管理员 | false |
| isEnabled | boolean | 是 | 是否可用 | true |
