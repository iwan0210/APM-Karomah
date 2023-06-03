const socket = new WebSocket('ws://192.168.120.100:8000')
const hari = ['AKHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
let numState = ""
let APMModal

if (document.getElementById('pendaftaran')) {
    APMModal = new bootstrap.Modal(document.getElementById('pendaftaran'))

    APMModal._element.addEventListener('hidden.bs.modal', _ => {
        numState = ""
        reloadNumInput()
        document.getElementById('numInput').focus()
        document.getElementById('numInput').setAttribute('onblur', 'this.focus();')
    })
}
if (document.getElementById('numInput')) {
    document.getElementById('numInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            numState = document.getElementById('numInput').value
            numInputSubmit()
        }
    })
}

const ambil = async () => {
    try {
        const antrian = parseInt(document.getElementById('jml_antrian').innerText) + 1
        document.getElementById('ambil').disabled = true

        const query = {
            sql: "UPDATE antrian_karomah SET jml_antrian = ? WHERE nama = 'pendaftaran'",
            values: [antrian]
        }
        await window.api.mysql(query)

        socket.send(JSON.stringify({ antrian: antrian }))
        window.api.send('antrianPrint', { antrian: antrian })
        document.getElementById('jml_antrian').innerText = antrian

        window.location = 'index.html'
    } catch (error) {
        document.getElementById('ambil').disabled = false
        window.location = 'index.html'
    }
}

const antrianTerakhir = async () => {
    try {
        const data = await window.api.mysql("SELECT jml_antrian FROM antrian_karomah WHERE nama='pendaftaran'")
        document.getElementById('jml_antrian').innerText = data[0].jml_antrian
    } catch (error) {
        window.location = 'index.html'
    }
}

const numpad = (num) => {
    if (num === 'delete') {
        if (numState !== "") {
            numState = numState.slice(0, -1)
            reloadNumInput()
        }
    } else if (num === 'done') {
        numInputSubmit()
    } else {
        numState += num
        reloadNumInput()
    }
}

const numInputSubmit = async () => {
    if (numState === "") {
        return
    }
    try {
        document.getElementById('numInput').removeAttribute('onblur')
        let query = {
            sql: "SELECT no_rkm_medis, nm_pasien, alamat FROM pasien WHERE no_rkm_medis = ? OR no_ktp = ? OR no_peserta = ?",
            values: [numState, numState, numState]
        }
        const dataPasien = await window.api.mysql(query)
        if (!dataPasien.length) {
            Swal.fire({
                icon: 'question',
                title: 'Not found??',
                text: 'Pasien tidak ditemukan, silahkan ambil antrian pendaftaran jika pasien baru',
                timerProgressBar: true,
                showConfirmButton: false,
                timer: 3000
            }).then(() => {
                clearInput()
                window.location = 'index.html'
            })
        } else {
            document.getElementById('noRM').value = dataPasien[0].no_rkm_medis
            document.getElementById('nama').value = dataPasien[0].nm_pasien
            document.getElementById('alamat').value = dataPasien[0].alamat
            document.getElementById('tanggal').value = new Date().toDateInputValue()

            const dataPenjab = await window.api.mysql("SELECT kd_pj, png_jawab FROM penjab WHERE status='1'")
            dataPenjab.forEach(arr => {
                const option = document.createElement('option')
                option.value = arr.kd_pj
                option.innerText = arr.png_jawab
                document.getElementById('penjamin').appendChild(option)
            })

            const today = new Date()
            query = {
                sql: "SELECT poliklinik.kd_poli, poliklinik.nm_poli FROM poliklinik JOIN jadwal ON poliklinik.kd_poli = jadwal.kd_poli WHERE poliklinik.status = '1' AND jadwal.hari_kerja = ?",
                values: [hari[today.getDay()]]
            }
            const dataPoli = await window.api.mysql(query)
            dataPoli.forEach(arr => {
                const option = document.createElement('option')
                option.value = arr.kd_poli
                option.innerText = arr.nm_poli
                document.getElementById('poli').appendChild(option)
            })
            APMModal.show()
        }
    } catch (error) {
        clearInput()
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Terjadi kesalahan',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        }).then(() => {
            window.location = 'index.html'
        })
    }
}

const getDokter = async (poli) => {
    try {
        const today = new Date()
        const query = {
            sql: "SELECT dokter.kd_dokter, dokter.nm_dokter FROM dokter JOIN jadwal ON jadwal.kd_dokter = dokter.kd_dokter WHERE jadwal.kd_poli = ? AND jadwal.hari_kerja = ?",
            values: [poli, hari[today.getDay()]]
        }
        const dataDokter = await window.api.mysql(query)
        document.getElementById('dokter').innerHTML = ""
        dataDokter.forEach(arr => {
            const option = document.createElement('option')
            option.value = arr.kd_dokter
            option.innerText = arr.nm_dokter
            document.getElementById('dokter').appendChild(option)
        })
    } catch (error) {
        clearInput()
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Terjadi kesalahan',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        }).then(() => {
            window.location = 'index.html'
        })
    }
}

const daftar = async () => {
    const noRM = document.getElementById('noRM').value
    const penjab = document.getElementById('penjamin').value
    const poli = document.getElementById('poli').value
    const dokter = document.getElementById('dokter').value

    if(!noRM || !penjab || !poli || !dokter) {
        return
    }
    
    const namaPenjab = document.querySelector(`option[value='${penjab}']`).innerText
    const namaPoli = document.querySelector(`option[value='${poli}']`).innerText
    const namaDokter = document.querySelector(`option[value='${dokter}']`).innerText
    document.getElementById("daftarButton").disabled = true
    try {
        let query = {
            sql: "SELECT * FROM pasien JOIN kelurahan ON pasien.kd_kel = kelurahan.kd_kel JOIN kecamatan ON pasien.kd_kec = kecamatan.kd_kec JOIN kabupaten ON pasien.kd_kab = kabupaten.kd_kab WHERE no_rkm_medis = ?",
            values: [noRM]
        }
        const data = await window.api.mysql(query)
        const dataPasien = data[0]
        const noReg = await setNoReg(poli, dokter)
        const statusDaftar = await setSttsDaftar(noRM)
        const biayaReg = await setBiayaReg(poli, setSttsDaftar)
        const statusPoli = await setStatusPoli(noRM, poli, dokter)
        const birth = dataPasien.tgl_lahir
        const today = new Date()
        const diff = new Date(today.getTime() - birth.getTime())
        let umur = diff.getFullYear() - 1970
        let statusUmur = 'Th'
        if (diff.getFullYear() - 1970 === 0) {
            umur = diff.getMonth()
            statusUmur = 'Bl'
            if (!diff.getMonth()){
                umur = diff.getDate() - 1
                statusUmur = 'Hr'
            }
        }
        const jamReg = `${n(today.getHours(), 2)}:${n(today.getMinutes(), 2)}:${n(today.getSeconds(), 2)}`
        const noRawat = await setNoRawat()
        const tanggal = `${today.getFullYear()}-${n(today.getMonth() + 1, 2)}-${n(today.getDate(), 2)}`
        const alamatPJ = `${dataPasien.alamat}, ${dataPasien.nm_kel}, ${dataPasien.nm_kec}, ${dataPasien.nm_kab}`
        query = {
            sql: "INSERT INTO reg_periksa VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            values: [noReg, noRawat, tanggal, jamReg, dokter, noRM, poli, dataPasien.namakeluarga, alamatPJ, dataPasien.keluarga, biayaReg, 'Belum', statusDaftar, 'Ralan', penjab, umur, statusUmur, 'Belum Bayar', statusPoli]
        }
        await window.api.mysql(query)
        window.api.send('APMPrint', {
            noRawat: noRawat,
            noAntri: noReg,
            nama: dataPasien.nm_pasien,
            noRM: noRM,
            jk: dataPasien.jk,
            jenis: namaPenjab,
            poli: namaPoli,
            dokter: namaDokter
        })
        document.getElementById("daftarButton").disabled = false
        window.location = 'index.html'
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Terjadi kesalahan',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        }).then(() => {
            window.location = 'index.html'
        })
    }
}

const setNoReg = (poli, dokter) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = {
                sql: "SELECT ifnull(MAX(CONVERT(RIGHT(no_reg,3),signed)),0) AS no_reg FROM reg_periksa WHERE kd_poli = ? AND kd_dokter = ? AND tgl_registrasi = CURDATE() ORDER BY no_reg DESC LIMIT 1",
                values: [poli, dokter]
            }
            const data = await window.api.mysql(query)
            const nextNoReg = (!data.length) ? n(1, 3) : n((parseInt(data[0].no_reg) + 1), 3)
            resolve(nextNoReg)
        } catch (error) {
            reject(error)
        }
    })
}

const setNoRawat = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const today = new Date()
            const query = {
                sql: "SELECT ifnull(MAX(CONVERT(RIGHT(no_rawat,6),signed)),0) as noRawat FROM reg_periksa WHERE tgl_registrasi = ?",
                values: [`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`]
            }
            const data = await window.api.mysql(query)
            const noRawat = (!data.length) ? n(1, 6) : n((parseInt(data[0].noRawat) + 1), 6)
            const nextNoRawat = `${today.getFullYear()}/${n(today.getMonth() + 1, 2)}/${n(today.getDate(), 2)}/${noRawat}`
            resolve(nextNoRawat)
        } catch (error) {
            reject(error)
        }
    })
}

const setSttsDaftar = (noRM) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = {
                sql: "SELECT COUNT(no_rkm_medis) AS countReg FROM reg_periksa WHERE no_rkm_medis = ? AND stts != 'Batal'",
                values: [noRM]
            }
            const data = await window.api.mysql(query)
            const status = (data[0].countReg) ? 'Lama' : 'Baru'
            resolve(status)
        } catch (error) {
            reject(error)
        }
    })
}

const setBiayaReg = (poli, sttsDaftar) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = {
                sql: "SELECT registrasi, registrasilama FROM poliklinik WHERE kd_poli = ?",
                values: [poli]
            }
            const data = await window.api.mysql(query)
            const biaya = (sttsDaftar === 'Baru') ? data[0].registrasi : data[0].registrasilama
            resolve(biaya)
        } catch (error) {
            reject(error)
        }
    })
}

const setStatusPoli = (noRM, poli, dokter) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = {
                sql: "SELECT COUNT(no_rkm_medis) AS sttsPoli FROM reg_periksa WHERE no_rkm_medis = ? AND kd_poli = ? AND kd_dokter = ?",
                values: [noRM, poli, dokter]
            }
            const data = await window.api.mysql(query)
            const statusPoli = (data[0].sttsPoli) ? 'Lama' : 'Baru'
            resolve(statusPoli)
        } catch (error) {
            reject(error)
        }
    })
}

const clearInput = () => {
    numState = ""
    reloadNumInput()
}

const reloadNumInput = () => {
    document.getElementById('numInput').value = numState
}

Date.prototype.toDateInputValue = (function () {
    const local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
})

function n(num, len = 2) {
    return `${num}`.padStart(len, '0');
}

socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type == 'reloadAntrian') {
        location.reload()
    }
}