const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    handle: (channel, func) => ipcRenderer.on(channel, (_, ...args) => func(...args)),
    mysql: (query) => ipcRenderer.invoke('mysql', query)
})