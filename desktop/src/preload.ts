import { contextBridge, ipcRenderer } from 'electron';

const desktopBridge = {
  getRuntimeInfo: () => ipcRenderer.invoke('kwphoto:desktop:get-runtime-info'),
  localCache: {
    clear: (params: { scope?: string | null }) => ipcRenderer.invoke('kwphoto:cache:clear', params),
    deleteFolder: (params: { folderScopeKey: string }) => ipcRenderer.invoke('kwphoto:cache:delete-folder', params),
    fetchMedia: (params: { url: string }) => ipcRenderer.invoke('kwphoto:cache:fetch-media', params),
    listRecords: (params: { scope?: string | null }) => ipcRenderer.invoke('kwphoto:cache:list-records', params),
    readRecord: (params: { key: string }) => ipcRenderer.invoke('kwphoto:cache:read-record', params),
    storageInfo: () => ipcRenderer.invoke('kwphoto:cache:storage-info'),
    writeRecord: (params: { blobBytes: number[] | null; record: unknown }) => (
      ipcRenderer.invoke('kwphoto:cache:write-record', params)
    ),
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('kwphotoDesktop', desktopBridge);
