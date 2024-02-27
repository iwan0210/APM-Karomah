require('dotenv').config()
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const url = require('url')
const path = require('path')
const mysql = require('mysql2')
const axios = require('axios')
const CryptoJS = require('crypto-js')
const LZString = require('lz-string')

let win, antrianWorker, APMWorker

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

const {
    BPJS_CONST_ID,
    BPJS_SECRET,
    BPJS_USER_KEY_ANTREAN,
    BPJS_USER_KEY_VCLAIM,
    BPJS_BASE_URL
} = process.env

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
    win.webContents.openDevTools()

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

        console.log("#### sql query ####")
        console.log(query)

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
                    console.log(rows)
                    console.log('')
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
                console.log(rows)
                console.log('')
                resolve(rows)
            })
        })
    })
)

ipcMain.handle('rujukan',
    (_, data) => new Promise((resolve, reject) => {
        const serviceUrl = BPJS_BASE_URL + 'vclaim-rest'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = genSignature(timestamp)
        const header = genVClaimHeader(signature, timestamp)
        const url = (data.type == 1) ? serviceUrl + `/Rujukan/${data.noRujukan}` : serviceUrl + `/Rujukan/RS/${data.noRujukan}`
        axios({
            method: 'get',
            url: url,
            headers: header
        })
            .then(res => {
                const enctyptedData = res.data
                const response = decrypt(enctyptedData.metaData, enctyptedData.response, timestamp)
                console.log("#### ws cek rujukan ####")
                console.log(response)
                console.log('')
                resolve(response)
            })
            .catch(err => {
                console.log(err)
                reject(err)
            })
    })
)

ipcMain.handle('sep',
    (_, data) => new Promise((resolve, reject) => {
        const url = BPJS_BASE_URL + 'vclaim-rest/SEP/2.0/insert'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = genSignature(timestamp)
        const header = genVClaimHeader(signature, timestamp)
        axios({
            method: 'post',
            url: url,
            headers: header,
            data: data
        })
            .then(res => {
                const enctyptedData = res.data
                const response = decrypt(enctyptedData.metaData, enctyptedData.response, timestamp)
                console.log("#### ws add sep ####")
                console.log(response)
                console.log('')
                resolve(response)
            })
            .catch(err => {
                console.log(err)
                reject(err)
            })
    })
)

ipcMain.handle('taskId',
    (_, data) => new Promise((resolve, reject) => {
        const url = BPJS_BASE_URL + 'antreanrs/antrean/updatewaktu'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = genSignature(timestamp)
        const header = genHeader(signature, timestamp)
        axios({
            method: 'post',
            url: url,
            headers: header,
            data: data
        })
            .then(res => {
                console.log("#### ws add TaskId ####")
                console.log(res.data)
                console.log('')
                resolve(res.data)
            })
            .catch(err => {
                console.log(err)
                reject(err)
            })
    })
)

ipcMain.handle('addAntrean', 
    (_, data) => new Promise((resolve, reject) => {
        const url = BPJS_BASE_URL + 'antreanrs/antrean/add'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = genSignature(timestamp)
        const header = genHeader(signature, timestamp)
        axios({
            method: 'post',
            url: url,
            headers: header,
            data: data
        })
            .then(res => {
                console.log("#### ws add antrean ####")
                console.log(res.data)
                console.log('')
                resolve(res.data)
            })
            .catch(err => {
                console.log(err)
                reject(err)
            })
    })
)

const genSignature = (timestamp) => CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${BPJS_CONST_ID}&${timestamp}`, BPJS_SECRET))

const genHeader = (signature, timestamp) => {
    return {
        'Content-Type': 'application/json',
        'X-cons-id': BPJS_CONST_ID,
        'X-timestamp': timestamp,
        'X-signature': signature,
        'user_key': BPJS_USER_KEY_ANTREAN
    }
}

const genVClaimHeader = (signature, timestamp) => {
    return {
        'Content-Type': 'application/json',
        'X-cons-id': BPJS_CONST_ID,
        'X-timestamp': timestamp,
        'X-signature': signature,
        'user_key': BPJS_USER_KEY_VCLAIM
    }
}

const decrypt = (metadata, response, timestamp) => {
    if (response != null) {
        const passphrase = BPJS_CONST_ID + BPJS_SECRET + timestamp
        const key = CryptoJS.enc.Hex.parse(CryptoJS.SHA256(passphrase).toString())
        const iv = CryptoJS.enc.Hex.parse(CryptoJS.SHA256(passphrase).toString().slice(0, 32))
        const decrypted = CryptoJS.AES.decrypt(response, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return {
            "metadata": metadata,
            "response": JSON.parse(LZString.decompressFromEncodedURIComponent(decrypted))
        }
    }
    return {
        "metadata": metadata,
        "response": null
    }

}