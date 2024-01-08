const { app, BrowserWindow, ipcMain, screen } = require('electron')
const url = require('url')
const path = require('path')
const mysql = require('mysql2')

let win, antrianWorker, APMWorker

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db'
})

const createWindow = (width, height) => {
    win = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'app/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    win.setMenu(null)

    antrianWorker = new BrowserWindow({
        width: 303,
        height: 303,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    antrianWorker.loadURL(url.format({
        pathname: path.join(__dirname, 'worker/antrian.html'),
        protocol: 'file:',
        slashes: true
    }))

    antrianWorker.setMenu(null)
    antrianWorker.hide()

    APMWorker = new BrowserWindow({
        width: 303,
        height: 303,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    APMWorker.loadURL(url.format({
        pathname: path.join(__dirname, 'worker/APM.html'),
        protocol: 'file:',
        slashes: true
    }))

    APMWorker.setMenu(null)
    APMWorker.hide()

    win.on('closed', _ => {
        app.quit()
    })
}

app.whenReady().then(() => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    createWindow(width * 2 / 3, height)
})

app.on('window-all-closed', () => {
    app.quit()
})

ipcMain.on('antrianPrint', (_, content) => {
    antrianWorker.webContents.send('antrianPrint', content)
})

ipcMain.on('antrianReadyToPrint', async (_) => {
    antrianWorker.webContents.print({ silent: true })
})

ipcMain.on('APMPrint', (_, content) => {
    APMWorker.webContents.send('APMPrint', content)
})

ipcMain.on('APMReadyToPrint', (_) => {
    APMWorker.webContents.print({ silent: true })
})

ipcMain.handle('mysql',
    (_, query) => new Promise((resolve, reject) => {

        pool.getConnection((err, conn) => {
            if (err) {
                conn.release()
                reject(err)
            }
            if (typeof query === "object") {
                conn.query(query.sql, query.values, (err, rows, _) => {
                    if (err) {
                        console.log(err)
                        conn.release()
                        reject(err)
                    }
                    conn.release()
                    resolve(rows)
                })
            }

            conn.query(query, (err, rows, _) => {
                if (err) {
                    console.log(err)
                    conn.release()
                    reject(err)
                }
                conn.release()
                resolve(rows)
            })
        })
    })
)