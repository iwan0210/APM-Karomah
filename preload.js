const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    handle: (channel, func) => ipcRenderer.on(channel, (_, ...args) => func(...args)),
    mysql: (query) => ipcRenderer.invoke('mysql', query),
    rujukan: (data) => ipcRenderer.invoke('rujukan', data),
    sep: (data) => ipcRenderer.invoke('sep', data),
    taskId: (data) => ipcRenderer.invoke('taskId', data),
    addAntrean: (data) => ipcRenderer.invoke('addAntrean', data),
})