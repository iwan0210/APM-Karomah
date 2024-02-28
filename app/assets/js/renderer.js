const socket = new WebSocket('ws://192.168.120.100:8000')
const hari = ['AKHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
let numState = ""
let customState = ""
let APMProcess = false
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

if (document.getElementById('customInput')) {
    document.getElementById('customInput').addEventListener('keydown', e => {
        if (APMProcess) {
            return
        }
        if (e.key === 'Enter') {
            customState = document.getElementById('customInput').value
            customInputSubmit()
        }
    })
}

if (document.getElementById('checkin')) {
    document.getElementById('checkin').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            if (APMProcess) {
                document.getElementById('checkin').value = ""
                return
            }
            const submit = document.getElementById('checkin').value
            checkinSubmit(submit)
        }
    })
}

const checkinSubmit = async (input) => {
    APMProcess = true
    try {
        const currentDate = new Date().toJSON().slice(0, 10)
        document.getElementById('checkin').value = ""
        const data = JSON.parse(window.atob(input))
        const code = data.noRujukan.charAt(12)
        let query = {
            sql: "SELECT nohp, kodedokter, no_rawat, kodepoli, status FROM referensi_mobilejkn_bpjs WHERE nobooking = ?",
            values: [data.kodeBooking]
        }
        const dataMJKNResult = await window.api.mysql(query)
        const dataMJKN = dataMJKNResult[0]
        if (dataMJKN.status != 'Belum') {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Sudah Checkin atau batal periksa',
                timerProgressBar: true,
                showConfirmButton: false,
                timer: 3000
            })
            return
        }
        if (['P', 'Y', 'B'].includes(code)) {
            const req = {
                type: (code == 'B') ? 2 : 1,
                noRujukan: data.noRujukan
            }
            const dataRujukan = await window.api.rujukan(req)
            if (dataRujukan.metadata.message !== "OK") {
                throw error
            }
            const dataSep = {
                "request": {
                    "t_sep": {
                        "noKartu": dataRujukan.response.rujukan.peserta.noKartu,
                        "tglSep": currentDate,
                        "ppkPelayanan": "1104R005",
                        "jnsPelayanan": "2",
                        "klsRawat": {
                            "klsRawatHak": dataRujukan.response.rujukan.peserta.hakKelas.kode,
                            "klsRawatNaik": "",
                            "pembiayaan": "",
                            "penanggungJawab": ""
                        },
                        "noMR": data.norm,
                        "rujukan": {
                            "asalRujukan": (code == 'B') ? 2 : 1,
                            "tglRujukan": dataRujukan.response.rujukan.tglKunjungan,
                            "noRujukan": data.noRujukan,
                            "ppkRujukan": dataRujukan.response.rujukan.provPerujuk.kode
                        },
                        "catatan": "",
                        "diagAwal": dataRujukan.response.rujukan.diagnosa.kode,
                        "poli": {
                            "tujuan": dataRujukan.response.rujukan.poliRujukan.kode,
                            "eksekutif": "0"
                        },
                        "cob": {
                            "cob": "0"
                        },
                        "katarak": {
                            "katarak": "0"
                        },
                        "jaminan": {
                            "lakaLantas": "0",
                            "noLP": "",
                            "penjamin": {
                                "tglKejadian": "",
                                "keterangan": "",
                                "suplesi": {
                                    "suplesi": "0",
                                    "noSepSuplesi": "",
                                    "lokasiLaka": {
                                        "kdPropinsi": "",
                                        "kdKabupaten": "",
                                        "kdKecamatan": ""
                                    }
                                }
                            }
                        },
                        "tujuanKunj": "0",
                        "flagProcedure": "",
                        "kdPenunjang": "",
                        "assesmentPel": "",
                        "skdp": {
                            "noSurat": "",
                            "kodeDPJP": dataMJKN.kodedokter
                        },
                        "dpjpLayan": dataMJKN.kodedokter,
                        "noTelp": dataMJKN.nohp,
                        "user": "Bridging RS Karomah Holistic"
                    }
                }
            }
            const resultSep = await window.api.sep(dataSep)
            query = {
                sql: "INSERT INTO bridging_sep VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [
                    resultSep.response.sep.noSep,
                    dataMJKN.no_rawat,
                    resultSep.response.sep.tglSep,
                    dataRujukan.response.rujukan.tglKunjungan,
                    resultSep.response.sep.noRujukan,
                    dataRujukan.response.rujukan.provPerujuk.kode,
                    dataRujukan.response.rujukan.provPerujuk.nama,
                    '1104R005',
                    'RS KAROMAH HOLISTIC - KOTA PEKALONGAN',
                    2,
                    resultSep.response.sep.catatan,
                    dataRujukan.response.rujukan.diagnosa.kode,
                    dataRujukan.response.rujukan.diagnosa.name,
                    resultSep.response.sep.kdPoli,
                    resultSep.response.sep.poli,
                    dataRujukan.response.rujukan.peserta.hakKelas.kode,
                    "", "", "", 0,
                    "APM Checkin",
                    resultSep.response.sep.peserta.noMr,
                    resultSep.response.sep.peserta.nama,
                    resultSep.response.sep.peserta.tglLahir,
                    resultSep.response.sep.peserta.jnsPeserta,
                    dataRujukan.response.rujukan.peserta.hakKelas.sex,
                    resultSep.response.sep.peserta.noKartu,
                    resultSep.response.sep.tglSep,
                    (code == 'B') ? "2. Faskes 2(RS)" : "1. Faskes 1",
                    "0. Tidak", "0. Tidak",
                    dataMJKN.nohp,
                    "0. Tidak", "0000-00-00", "", "0. Tidak", "", "", "", "", "", "", "", "",
                    dataMJKN.kodedokter,
                    data.namaDokter,
                    0, "", "", "",
                    dataMJKN.kodedokter,
                    data.namaDokter
                ]
            }
            await window.api.mysql(query)

        } else {
            query = {
                sql: "SELECT bridging_sep.klsrawat, bridging_sep.no_rujukan, bridging_sep.jkel bridging_sep.no_sep, bridging_sep.asal_rujukan, bridging_sep.tglrujukan, bridging_sep.kdppkrujukan, bridging_sep.nmppkrujukan, bridging_sep.diagawal, bridging_sep.nmdiagnosaawal, bridging_sep.katarak, bridging_sep.lakalantas, bridging_sep.tglkkl, bridging_sep.suplesi, bridging_sep.no_sep_suplesi, bridging_sep.kdprop, bridging_sep.nmprop, bridging_sep.kdkab, bridging_sep.nmkab, bridging_sep.kdkec, bridging_sep.nmkec from bridging_surat_kontrol_bpjs JOIN bridging_sep ON bridging_surat_kontrol_bpjs.no_sep = bridging_sep.no_sep WHERE bridging_surat_kontrol_bpjs.no_surat = ?",
                values: [data.noRujukan]
            }
            const dataKontrolResult = await window.api.mysql(query)
            const dataKontrol = dataKontrolResult[0]
            const dataSep = {
                "request": {
                    "t_sep": {
                        "noKartu": data.nokapst,
                        "tglSep": currentDate,
                        "ppkPelayanan": "1104R005",
                        "jnsPelayanan": "2",
                        "klsRawat": {
                            "klsRawatHak": dataKontrol.klsrawat,
                            "klsRawatNaik": "",
                            "pembiayaan": "",
                            "penanggungJawab": ""
                        },
                        "noMR": data.norm,
                        "rujukan": {
                            "asalRujukan": dataKontrol.asal_rujukan.charAt(0),
                            "tglRujukan": dataKontrol.tglrujukan,
                            "noRujukan": (dataKontrol.no_rujukan.charAt(12) == 'K') ? dataKontrol.no_sep : dataKontrol.no_rujukan,
                            "ppkRujukan": dataKontrol.kdppkrujukan
                        },
                        "catatan": "",
                        "diagAwal": dataKontrol.diagawal,
                        "poli": {
                            "tujuan": dataMJKN.kodepoli,
                            "eksekutif": "0"
                        },
                        "cob": {
                            "cob": "0"
                        },
                        "katarak": {
                            "katarak": dataKontrol.katarak.charAt(0)
                        },
                        "jaminan": {
                            "lakaLantas": dataKontrol.lakalantas,
                            "noLP": "",
                            "penjamin": {
                                "tglKejadian": (dataKontrol.lakalantas != 0) ? dataKontrol.tglkkl : "",
                                "keterangan": (dataKontrol.lakalantas != 0) ? "KLL" : "",
                                "suplesi": {
                                    "suplesi": (dataKontrol.lakalantas != 0) ? "1" : "0",
                                    "noSepSuplesi": (dataKontrol.lakalantas != 0) ? ((dataKontrol.no_sep_suplesi) ? dataKontrol.no_sep_suplesi : dataKontrol.no_sep) : "",
                                    "lokasiLaka": {
                                        "kdPropinsi": (dataKontrol.lakalantas != 0) ? dataKontrol.kdprop : "",
                                        "kdKabupaten": (dataKontrol.lakalantas != 0) ? dataKontrol.kdkab : "",
                                        "kdKecamatan": (dataKontrol.lakalantas != 0) ? dataKontrol.kdkec : ""
                                    }
                                }
                            }
                        },
                        "tujuanKunj": (dataKontrol.no_rujukan.charAt(12) == 'K') ? "0" : "2",
                        "flagProcedure": "",
                        "kdPenunjang": "",
                        "assesmentPel": (dataKontrol.no_rujukan.charAt(12) == 'K') ? "" : "5",
                        "skdp": {
                            "noSurat": data.noRujukan,
                            "kodeDPJP": dataMJKN.kodedokter
                        },
                        "dpjpLayan": dataMJKN.kodedokter,
                        "noTelp": dataMJKN.nohp,
                        "user": "Bridging RS Karomah Holistic"
                    }
                }
            }
            const resultSep = await window.api.sep(dataSep)
            query = {
                sql: "INSERT INTO bridging_sep VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [
                    resultSep.response.sep.noSep,
                    dataMJKN.no_rawat,
                    resultSep.response.sep.tglSep,
                    dataKontrol.tglrujukan,
                    resultSep.response.sep.noRujukan,
                    dataKontrol.kdppkrujukan,
                    dataKontrol.nmppkrujukan,
                    '1104R005',
                    'RS KAROMAH HOLISTIC - KOTA PEKALONGAN',
                    2,
                    resultSep.response.sep.catatan,
                    dataKontrol.diagawal,
                    dataKontrol.nmdiagnosaawal,
                    resultSep.response.sep.kdPoli,
                    resultSep.response.sep.poli,
                    dataKontrol.klsrawat,
                    "", "", "",
                    dataKontrol.lakalantas,
                    "APM Checkin",
                    resultSep.response.sep.peserta.noMr,
                    resultSep.response.sep.peserta.nama,
                    resultSep.response.sep.peserta.tglLahir,
                    resultSep.response.sep.peserta.jnsPeserta,
                    dataKontrol.jkel,
                    resultSep.response.sep.peserta.noKartu,
                    resultSep.response.sep.tglSep,
                    dataKontrol.asal_rujukan,
                    "0. Tidak", "0. Tidak",
                    dataMJKN.nohp,
                    dataKontrol.katarak,
                    (dataKontrol.lakalantas != 0) ? dataKontrol.tglkkl : "0000-00-00",
                    (dataKontrol.lakalantas != 0) ? "KLL" : "",
                    (dataKontrol.lakalantas != 0) ? "1.Ya" : "0. Tidak",
                    (dataKontrol.lakalantas != 0) ? ((dataKontrol.no_sep_suplesi) ? dataKontrol.no_sep_suplesi : dataKontrol.no_sep) : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.kdprop : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.nmprop : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.kdkab : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.nmkab : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.kdkec : "",
                    (dataKontrol.lakalantas != 0) ? dataKontrol.nmkec : "",
                    data.noRujukan,
                    dataMJKN.kodedokter,
                    data.namaDokter,
                    (dataKontrol.no_rujukan.charAt(12) == 'K') ? "0" : "2",
                    "",
                    "",
                    (dataKontrol.no_rujukan.charAt(12) == 'K') ? "" : "5",
                    dataMJKN.kodedokter,
                    data.namaDokter
                ]
            }
            await window.api.mysql(query)
        }

        await taskId3(data.kodeBooking)
        query = {
            sql: "UPDATE referensi_mobilejkn_bpjs SET status = 'Checkin', validasi = NOW() WHERE nobooking = ?",
            values: [data.kodeBooking]
        }
        await window.api.mysql(query)
        query = {
            sql: "INSERT INTO mutasi_berkas(no_rawat, status, dikirim) VALUES(?, ?, NOW())",
            values: [dataMJKN.no_rawat, 'Sudah Dikirim']
        }
        await window.api.mysql(query)
        query = {
            sql: "INSERT INTO referensi_mobilejkn_bpjs_taskid VALUES(?, ?, NOW())",
            values: [dataMJKN.no_rawat, 3]
        }
        await window.api.mysql(query)

        APMProcess = false
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Checkin Berhasil',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        })
    } catch (error) {
        APMProcess = false
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Checkin Gagal',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        })
    }

}

const customInputSubmit = async () => {
    if (customState === "" || customState.length != 19) {
        return
    }
    APMProcess = true
    try {
        let query
        const today = new Date()
        const code = customState.charAt(12)
        if (['P', 'Y', 'B'].includes(code)) {
            const req = {
                type: (code == 'B') ? 2 : 1,
                noRujukan: customState
            }
            const dataRujukan = await window.api.rujukan(req)
            if (dataRujukan.metadata.message !== "OK") {
                throw error
            }
            query = {
                sql: "SELECT * FROM pasien JOIN kelurahan ON pasien.kd_kel = kelurahan.kd_kel JOIN kecamatan ON pasien.kd_kec = kecamatan.kd_kec JOIN kabupaten ON pasien.kd_kab = kabupaten.kd_kab WHERE pasien.no_peserta = ? OR pasien.no_ktp = ?",
                values: [dataRujukan.response.rujukan.peserta.noKartu, dataRujukan.response.rujukan.peserta.nik]
            }
            const data = await window.api.mysql(query)
            query = {
                sql: "SELECT * FROM dokter join jadwal on jadwal.kd_dokter = dokter.kd_dokter join poliklinik on poliklinik.kd_poli = jadwal.kd_poli join maping_dokter_dpjpvclaim on maping_dokter_dpjpvclaim.kd_dokter = dokter.kd_dokter join maping_poli_bpjs on maping_poli_bpjs.kd_poli_rs = poliklinik.kd_poli WHERE maping_poli_bpjs.kd_poli_bpjs = ? and jadwal.hari_kerja = ?",
                values: [dataRujukan.response.rujukan.poliRujukan.kode, hari[today.getDay()]]
            }
            const dataTujuan = await window.api.mysql(query)
            const dataPasien = data[0]
            const noReg = await setNoReg(dataTujuan[0].kd_poli, dataTujuan[0].kd_dokter)
            const statusDaftar = await setSttsDaftar(dataPasien.no_rkm_medis)
            const biayaReg = await setBiayaReg(dataTujuan[0].kd_poli, setSttsDaftar)
            const statusPoli = await setStatusPoli(dataPasien.no_rkm_medis, dataTujuan[0].kd_poli, dataTujuan[0].kd_dokter)
            const birth = new Date(dataPasien.tgl_lahir)
            const diff = new Date(today.getTime() - birth.getTime())
            let umur = diff.getFullYear() - 1970
            let statusUmur = 'Th'
            if (diff.getFullYear() - 1970 === 0) {
                umur = diff.getMonth()
                statusUmur = 'Bl'
                if (!diff.getMonth()) {
                    umur = diff.getDate() - 1
                    statusUmur = 'Hr'
                }
            }
            const jamReg = `${n(today.getHours(), 2)}:${n(today.getMinutes(), 2)}:${n(today.getSeconds(), 2)}`
            const noRawat = await setNoRawat()
            const tanggal = today.toDateInputValue()
            const alamatPJ = `${dataPasien.alamat}, ${dataPasien.nm_kel}, ${dataPasien.nm_kec}, ${dataPasien.nm_kab}`
            
            query = {
                sql: "INSERT INTO reg_periksa VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [noReg, noRawat, tanggal, jamReg, dataTujuan[0].kd_dokter, dataPasien.no_rkm_medis, dataTujuan[0].kd_poli, dataPasien.namakeluarga, alamatPJ, dataPasien.keluarga, biayaReg, 'Belum', statusDaftar, 'Ralan', 'A65', umur, statusUmur, 'Belum Bayar', statusPoli]
            }
            await window.api.mysql(query)
            query = {
                sql: "SELECT DATE_ADD(CONCAT(?, ' ', ?), INTERVAL ? MINUTE) as estimate",
                values: [tanggal, dataTujuan[0].jam_mulai.slice(0, -3), parseInt(noReg) * 10]
            }
            const estimate = await window.api.mysql(query)
            const dataAntrean = {
                "kodebooking": noRawat,
                "jenispasien": "JKN",
                "nomorkartu": dataRujukan.response.rujukan.peserta.noKartu,
                "nik": dataPasien.no_ktp,
                "nohp": dataPasien.no_tlp,
                "kodepoli": dataTujuan[0].kd_poli_bpjs,
                "namapoli": dataTujuan[0].nm_poli_bpjs,
                "pasienbaru": 0,
                "norm": dataPasien.no_rkm_medis,
                "tanggalperiksa": tanggal,
                "kodedokter": dataTujuan[0].kd_dokter_bpjs,
                "namadokter": dataTujuan[0].nm_dokter_bpjs,
                "jampraktek": `${dataTujuan[0].jam_mulai.slice(0, -3)}-${dataTujuan[0].jam_selesai.slice(0, -3)}`,
                "jeniskunjungan": (code == 'B') ? 4 : 1,
                "nomorreferensi": customState,
                "nomorantrean": `${dataTujuan[0].kd_poli}-${noReg}`,
                "angkaantrean": parseInt(noReg),
                "estimasidilayani": Date.parse(estimate[0].estimate),
                "sisakuotajkn": dataTujuan[0].kuota - parseInt(noReg),
                "kuotajkn": dataTujuan[0].kuota,
                "sisakuotanonjkn": dataTujuan[0].kuota - parseInt(noReg),
                "kuotanonjkn": dataTujuan[0].kuota,
                "keterangan": "Peserta harap 30 menit lebih awal guna pencatatan administrasi."
            }
            const resAntrean = await window.api.addAntrean(dataAntrean)
            if (![200, 208].includes(resAntrean.metadata.code)) {
                throw error
            }

            const dataSep = {
                "request": {
                    "t_sep": {
                        "noKartu": dataRujukan.response.rujukan.peserta.noKartu,
                        "tglSep": tanggal,
                        "ppkPelayanan": "1104R005",
                        "jnsPelayanan": "2",
                        "klsRawat": {
                            "klsRawatHak": dataRujukan.response.rujukan.peserta.hakKelas.kode,
                            "klsRawatNaik": "",
                            "pembiayaan": "",
                            "penanggungJawab": ""
                        },
                        "noMR": dataPasien.no_rkm_medis,
                        "rujukan": {
                            "asalRujukan": (code == 'B') ? 2 : 1,
                            "tglRujukan": dataRujukan.response.rujukan.tglKunjungan,
                            "noRujukan": dataRujukan.response.rujukan.noKunjungan,
                            "ppkRujukan": dataRujukan.response.rujukan.provPerujuk.kode
                        },
                        "catatan": "",
                        "diagAwal": dataRujukan.response.rujukan.diagnosa.kode,
                        "poli": {
                            "tujuan": dataRujukan.response.rujukan.poliRujukan.kode,
                            "eksekutif": "0"
                        },
                        "cob": {
                            "cob": "0"
                        },
                        "katarak": {
                            "katarak": "0"
                        },
                        "jaminan": {
                            "lakaLantas": "0",
                            "noLP": "",
                            "penjamin": {
                                "tglKejadian": "",
                                "keterangan": "",
                                "suplesi": {
                                    "suplesi": "0",
                                    "noSepSuplesi": "",
                                    "lokasiLaka": {
                                        "kdPropinsi": "",
                                        "kdKabupaten": "",
                                        "kdKecamatan": ""
                                    }
                                }
                            }
                        },
                        "tujuanKunj": "0",
                        "flagProcedure": "",
                        "kdPenunjang": "",
                        "assesmentPel": "",
                        "skdp": {
                            "noSurat": "",
                            "kodeDPJP": dataTujuan[0].kd_dokter_bpjs
                        },
                        "dpjpLayan": dataTujuan[0].kd_dokter_bpjs,
                        "noTelp": dataPasien.no_tlp,
                        "user": "Bridging RS Karomah Holistic"
                    }
                }
            }
            const resultSep = await window.api.sep(dataSep)
            query = {
                sql: "INSERT INTO bridging_sep VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [
                    resultSep.response.sep.noSep,
                    noRawat,
                    resultSep.response.sep.tglSep,
                    dataRujukan.response.rujukan.tglKunjungan,
                    resultSep.response.sep.noRujukan,
                    dataRujukan.response.rujukan.provPerujuk.kode,
                    dataRujukan.response.rujukan.provPerujuk.nama,
                    '1104R005',
                    'RS KAROMAH HOLISTIC - KOTA PEKALONGAN',
                    2,
                    resultSep.response.sep.catatan,
                    dataRujukan.response.rujukan.diagnosa.kode,
                    dataRujukan.response.rujukan.diagnosa.name,
                    resultSep.response.sep.kdPoli,
                    resultSep.response.sep.poli,
                    dataRujukan.response.rujukan.peserta.hakKelas.kode,
                    "", "", "", 0,
                    "Pendaftaran Mandiri",
                    resultSep.response.sep.peserta.noMr,
                    resultSep.response.sep.peserta.nama,
                    resultSep.response.sep.peserta.tglLahir,
                    resultSep.response.sep.peserta.jnsPeserta,
                    dataRujukan.response.rujukan.peserta.hakKelas.sex,
                    resultSep.response.sep.peserta.noKartu,
                    resultSep.response.sep.tglSep,
                    (code == 'B') ? "2. Faskes 2(RS)" : "1. Faskes 1",
                    "0. Tidak", "0. Tidak",
                    dataPasien.no_tlp,
                    "0. Tidak", "0000-00-00", "", "0. Tidak", "", "", "", "", "", "", "", "",
                    dataTujuan[0].kd_dokter_bpjs,
                    dataTujuan[0].kd_dokter_bpjs,
                    0, "", "", "",
                    dataTujuan[0].kd_dokter_bpjs,
                    dataTujuan[0].kd_dokter_bpjs
                ]
            }
            await window.api.mysql(query)

            await taskId3(noRawat)
            query = {
                sql: "INSERT INTO mutasi_berkas(no_rawat, status, dikirim) VALUES(?, ?, NOW())",
                values: [noRawat, 'Sudah Dikirim']
            }
            await window.api.mysql(query)
            query = {
                sql: "INSERT INTO referensi_mobilejkn_bpjs_taskid VALUES(?, ?, NOW())",
                values: [noRawat, 3]
            }
            await window.api.mysql(query)
        } else {
            query = {
                sql: "SELECT * from bridging_surat_kontrol_bpjs JOIN bridging_sep ON bridging_surat_kontrol_bpjs.no_sep = bridging_sep.no_sep join pasien on pasien.no_rkm_medis = bridging_sep.nomr WHERE bridging_surat_kontrol_bpjs.no_surat = ?",
                values: [customState]
            }
            const dataKontrol = await window.api.mysql(query)
            if (dataKontrol.length <= 0) {
                throw error
            } 

            query = {
                sql: "SELECT * FROM dokter join jadwal on jadwal.kd_dokter = dokter.kd_dokter join poliklinik on poliklinik.kd_poli = jadwal.kd_poli join maping_dokter_dpjpvclaim on maping_dokter_dpjpvclaim.kd_dokter = dokter.kd_dokter join maping_poli_bpjs on maping_poli_bpjs.kd_poli_rs = poliklinik.kd_poli WHERE maping_poli_bpjs.kd_poli_bpjs = ? and jadwal.hari_kerja = ?",
                values: [dataKontrol[0].kd_poli_bpjs, hari[today.getDay()]]
            }
            const dataTujuan = await window.api.mysql(query)
            const noReg = await setNoReg(dataTujuan[0].kd_poli, dataTujuan[0].kd_dokter)
            const statusDaftar = await setSttsDaftar(dataKontrol[0].no_rkm_medis)
            const biayaReg = await setBiayaReg(dataTujuan[0].kd_poli, setSttsDaftar)
            const statusPoli = await setStatusPoli(dataKontrol[0].no_rkm_medis, dataTujuan[0].kd_poli, dataTujuan[0].kd_dokter)
            const birth = new Date(dataKontrol[0].tgl_lahir)
            const diff = new Date(today.getTime() - birth.getTime())
            let umur = diff.getFullYear() - 1970
            let statusUmur = 'Th'
            if (diff.getFullYear() - 1970 === 0) {
                umur = diff.getMonth()
                statusUmur = 'Bl'
                if (!diff.getMonth()) {
                    umur = diff.getDate() - 1
                    statusUmur = 'Hr'
                }
            }
            const jamReg = `${n(today.getHours(), 2)}:${n(today.getMinutes(), 2)}:${n(today.getSeconds(), 2)}`
            const noRawat = await setNoRawat()
            const tanggal = today.toDateInputValue()
            const alamatPJ = `${dataKontrol[0].alamat}, ${dataKontrol[0].nm_kel}, ${dataKontrol[0].nm_kec}, ${dataKontrol[0].nm_kab}`
            query = {
                sql: "INSERT INTO reg_periksa VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [noReg, noRawat, tanggal, jamReg, dataTujuan[0].kd_dokter, dataKontrol[0].no_rkm_medis, dataTujuan[0].kd_poli, dataKontrol[0].namakeluarga, alamatPJ, dataKontrol[0].keluarga, biayaReg, 'Belum', statusDaftar, 'Ralan', 'A65', umur, statusUmur, 'Belum Bayar', statusPoli]
            }
            await window.api.mysql(query)
            query = {
                sql: "SELECT DATE_ADD(CONCAT(?, ' ', ?), INTERVAL ? MINUTE) as estimate",
                values: [tanggal, dataTujuan[0].jam_mulai.slice(0, -3), parseInt(noReg) * 10]
            }
            const estimate = await window.api.mysql(query)
            const dataAntrean = {
                "kodebooking": noRawat,
                "jenispasien": "JKN",
                "nomorkartu": dataKontrol[0].no_kartu,
                "nik": dataKontrol[0].no_ktp,
                "nohp": dataKontrol[0].no_tlp,
                "kodepoli": dataTujuan[0].kd_poli_bpjs,
                "namapoli": dataTujuan[0].nm_poli_bpjs,
                "pasienbaru": 0,
                "norm": dataKontrol[0].no_rkm_medis,
                "tanggalperiksa": tanggal,
                "kodedokter": dataTujuan[0].kd_dokter_bpjs,
                "namadokter": dataTujuan[0].nm_dokter_bpjs,
                "jampraktek": `${dataTujuan[0].jam_mulai.slice(0, -3)}-${dataTujuan[0].jam_selesai.slice(0, -3)}`,
                "jeniskunjungan": 3,
                "nomorreferensi": customState,
                "nomorantrean": `${dataTujuan[0].kd_poli}-${noReg}`,
                "angkaantrean": parseInt(noReg),
                "estimasidilayani": Date.parse(estimate[0].estimate),
                "sisakuotajkn": dataTujuan[0].kuota - parseInt(noReg),
                "kuotajkn": dataTujuan[0].kuota,
                "sisakuotanonjkn": dataTujuan[0].kuota - parseInt(noReg),
                "kuotanonjkn": dataTujuan[0].kuota,
                "keterangan": "Peserta harap 30 menit lebih awal guna pencatatan administrasi."
            }
            const resAntrean = await window.api.addAntrean(dataAntrean)
            if (![200, 208].includes(resAntrean.metadata.code)) {
                throw error
            }

            const dataSep = {
                "request": {
                    "t_sep": {
                        "noKartu": dataKontrol[0].no_kartu,
                        "tglSep": tanggal,
                        "ppkPelayanan": "1104R005",
                        "jnsPelayanan": "2",
                        "klsRawat": {
                            "klsRawatHak": dataKontrol[0].klsRawat,
                            "klsRawatNaik": "",
                            "pembiayaan": "",
                            "penanggungJawab": ""
                        },
                        "noMR": dataKontrol[0].no_rkm_medis,
                        "rujukan": {
                            "asalRujukan": dataKontrol[0].asal_rujukan.charAt(0),
                            "tglRujukan": dataKontrol[0].tglrujukan,
                            "noRujukan": (dataKontrol[0].no_rujukan.charAt(12) == "K") ? dataKontrol[0].no_sep : dataKontrol[0].no_rujukan,
                            "ppkRujukan": dataKontrol[0].kdppkrujukan
                        },
                        "catatan": "",
                        "diagAwal": dataKontrol[0].diagawal,
                        "poli": {
                            "tujuan": dataKontrol[0].kd_poli_bpjs,
                            "eksekutif": "0"
                        },
                        "cob": {
                            "cob": "0"
                        },
                        "katarak": {
                            "katarak": dataKontrol[0].katarak.charAt(0)
                        },
                        "jaminan": {
                            "lakaLantas": dataKontrol[0].lakalantas,
                            "noLP": "",
                            "penjamin": {
                                "tglKejadian": (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].tglkkl : "",
                                "keterangan": "",
                                "suplesi": {
                                    "suplesi": (dataKontrol[0].lakalantas != 0) ? "1" : "0",
                                    "noSepSuplesi": (dataKontrol[0].lakalantas != 0) ? ((dataKontrol[0].no_sep_suplesi) ? dataKontrol[0].no_sep_suplesi : dataKontrol[0].no_sep) : "",
                                    "lokasiLaka": {
                                        "kdPropinsi": (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdprop : "",
                                        "kdKabupaten": (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdkab : "",
                                        "kdKecamatan": (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdkec : ""
                                    }
                                }
                            }
                        },
                        "tujuanKunj": (dataKontrol[0].no_rujukan.charAt(12) == 'K') ? "0" : "2",
                        "flagProcedure": "",
                        "kdPenunjang": "",
                        "assesmentPel": (dataKontrol[0].no_rujukan.charAt(12) == 'K') ? "" : "5",
                        "skdp": {
                            "noSurat": dataKontrol[0].no_surat,
                            "kodeDPJP": dataTujuan[0].kd_dokter_bpjs
                        },
                        "dpjpLayan": dataTujuan[0].kd_dokter_bpjs,
                        "noTelp": dataKontrol[0].notelep,
                        "user": "Bridging RS Karomah Holistic"
                    }
                }
            }
            const resultSep = await window.api.sep(dataSep)
            query = {
                sql: "INSERT INTO bridging_sep VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                values: [
                    resultSep.response.sep.noSep,
                    noRawat,
                    resultSep.response.sep.tglSep,
                    dataKontrol[0].tglrujukan,
                    resultSep.response.sep.noRujukan,
                    dataKontrol[0].kdppkrujukan,
                    dataKontrol[0].nmppkrujukan,
                    '1104R005',
                    'RS KAROMAH HOLISTIC - KOTA PEKALONGAN',
                    2,
                    resultSep.response.sep.catatan,
                    dataKontrol[0].diagawal,
                    dataKontrol[0].nmdiagnosaawal,
                    resultSep.response.sep.kdPoli,
                    resultSep.response.sep.poli,
                    dataKontrol[0].klsrawat,
                    "", "", "",
                    dataKontrol[0].lakalantas,
                    "APM",
                    resultSep.response.sep.peserta.noMr,
                    resultSep.response.sep.peserta.nama,
                    resultSep.response.sep.peserta.tglLahir,
                    resultSep.response.sep.peserta.jnsPeserta,
                    dataKontrol[0].jkel,
                    resultSep.response.sep.peserta.noKartu,
                    resultSep.response.sep.tglSep,
                    dataKontrol[0].asal_rujukan,
                    "0. Tidak", "0. Tidak",
                    dataKontrol[0].notelep,
                    dataKontrol[0].katarak,
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].tglkkl : "0000-00-00",
                    (dataKontrol[0].lakalantas != 0) ? "KLL" : "",
                    (dataKontrol[0].lakalantas != 0) ? "1.Ya" : "0. Tidak",
                    (dataKontrol[0].lakalantas != 0) ? ((dataKontrol[0].no_sep_suplesi) ? dataKontrol[0].no_sep_suplesi : dataKontrol.no_sep) : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdprop : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].nmprop : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdkab : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].nmkab : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].kdkec : "",
                    (dataKontrol[0].lakalantas != 0) ? dataKontrol[0].nmkec : "",
                    resultSep.response.sep.noRujukan,
                    dataKontrol[0].kd_dokter_bpjs,
                    dataKontrol[0].nm_dokter_bpjs,
                    (dataKontrol[0].no_rujukan.charAt(12) == 'K') ? "0" : "2",
                    "",
                    "",
                    (dataKontrol[0].no_rujukan.charAt(12) == 'K') ? "" : "5",
                    dataKontrol[0].kd_dokter_bpjs,
                    dataKontrol[0].nm_dokter_bpjs
                ]
            }
            await window.api.mysql(query)

            await taskId3(noRawat)
            query = {
                sql: "INSERT INTO mutasi_berkas(no_rawat, status, dikirim) VALUES(?, ?, NOW())",
                values: [noRawat, 'Sudah Dikirim']
            }
            await window.api.mysql(query)
            query = {
                sql: "INSERT INTO referensi_mobilejkn_bpjs_taskid VALUES(?, ?, NOW())",
                values: [noRawat, 3]
            }
            await window.api.mysql(query)
        }
        APMProcess = false
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Pendaftaran Berhasil',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        })
    } catch (error) {
        APMProcess = false
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Pendaftaran Gagal',
            timerProgressBar: true,
            showConfirmButton: false,
            timer: 3000
        })
    }
}

const ambilAntrian = (type) => new Promise(async (resolve, reject) => {
    try {
        const dataLama = await window.api.mysql({
            sql: "SELECT jml_antrian FROM antrian_karomah WHERE nama = ?",
            values: [type]
        })
        await window.api.mysql({
            sql: "UPDATE antrian_karomah SET jml_antrian = ? WHERE nama = ?",
            values: [dataLama[0].jml_antrian + 1, type]
        })
        const data = await window.api.mysql({
            sql: "SELECT jml_antrian FROM antrian_karomah WHERE nama = ?",
            values: [type]
        })
        resolve(data[0].jml_antrian)
    } catch (error) {
        reject(error)
    }
})

const ambil = async (type) => {
    try {
        document.getElementById('ambil').disabled = true

        const data = await ambilAntrian(type)

        socket.send(JSON.stringify({
            antrian: data,
            type: type
        }))
        window.api.send('antrianPrint', {
            antrian: data,
            type: type
        })
        document.getElementById('jml_antrian').innerText = data

        window.location = 'index.html'
    } catch (error) {
        document.getElementById('ambil').disabled = false
        window.location = 'index.html'
    }
}

const antrianTerakhir = async (type) => {
    try {
        let query = {
            sql: "SELECT jml_antrian FROM antrian_karomah WHERE nama = ?",
            values: [type]
        }
        const data = await window.api.mysql(query)
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

const customPad = (value) => {
    if (APMProcess) {
        return
    }
    if (value === 'delete') {
        if (customState !== "") {
            customState = customState.slice(0, -1)
            reloadCustomInput()
        }
    } else if (value === 'done') {
        customInputSubmit()
    } else {
        customState += value
        reloadCustomInput()
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
                title: 'Tidak Ditemukan !!',
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

            const dataPenjab = await window.api.mysql("SELECT kd_pj, png_jawab FROM penjab WHERE status='1' AND kd_pj != 'A65'")
            dataPenjab.forEach(arr => {
                const option = document.createElement('option')
                option.value = arr.kd_pj
                option.innerText = arr.png_jawab
                document.getElementById('penjamin').appendChild(option)
            })

            const today = new Date()
            query = {
                sql: "SELECT poliklinik.kd_poli, poliklinik.nm_poli FROM poliklinik JOIN jadwal ON poliklinik.kd_poli = jadwal.kd_poli WHERE poliklinik.status = '1' AND jadwal.hari_kerja = ? AND jadwal.kuota > 0",
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

    if (!noRM || !penjab || !poli || !dokter) {
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
        const birth = new Date(dataPasien.tgl_lahir)
        const today = new Date()
        const diff = new Date(today.getTime() - birth.getTime())
        let umur = diff.getFullYear() - 1970
        let statusUmur = 'Th'
        if (diff.getFullYear() - 1970 === 0) {
            umur = diff.getMonth()
            statusUmur = 'Bl'
            if (!diff.getMonth()) {
                umur = diff.getDate() - 1
                statusUmur = 'Hr'
            }
        }
        const jamReg = `${n(today.getHours(), 2)}:${n(today.getMinutes(), 2)}:${n(today.getSeconds(), 2)}`
        const noRawat = await setNoRawat()
        const tanggal = `${today.getFullYear()}-${n(today.getMonth() + 1, 2)}-${n(today.getDate(), 2)}`
        const alamatPJ = `${dataPasien.alamat}, ${dataPasien.nm_kel}, ${dataPasien.nm_kec}, ${dataPasien.nm_kab}`
        query = {
            sql: "SELECT kd_poli_bpjs, nm_poli_bpjs FROM maping_poli_bpjs WHERE kd_poli_rs = ?",
            values: [poli]
        }
        const poliBPJS = await window.api.mysql(query)
        query = {
            sql: "SELECT kd_dokter_bpjs, nm_dokter_bpjs FROM maping_dokter_dpjpvclaim WHERE kd_dokter = ?",
            values: [dokter]
        }
        const dokterBPJS = await window.api.mysql(query)
        query = {
            sql: "SELECT jam_mulai, jam_selesai, kuota FROM jadwal WHERE kd_dokter = ? AND kd_poli = ? AND hari_kerja = ?",
            values: [dokter, poli, hari[today.getDay()]]
        }
        const jamPraktek = await window.api.mysql(query)
        query = {
            sql: "SELECT DATE_ADD(CONCAT(?, ' ', ?), INTERVAL ? MINUTE) as estimate",
            values: [tanggal, jamPraktek[0].jam_mulai, parseInt(noReg) * 10]
        }
        const estimate = await window.api.mysql(query)
        const dataAntrean = {
            "kodebooking": noRawat,
            "jenispasien": "NON JKN",
            "nomorkartu": "",
            "nik": dataPasien.no_ktp,
            "nohp": dataPasien.no_tlp,
            "kodepoli": poliBPJS[0].kd_poli_bpjs,
            "namapoli": poliBPJS[0].nm_poli_bpjs,
            "pasienbaru": 0,
            "norm": noRM,
            "tanggalperiksa": tanggal,
            "kodedokter": dokterBPJS[0].kd_dokter_bpjs,
            "namadokter": dokterBPJS[0].nm_dokter_bpjs,
            "jampraktek": `${jamPraktek[0].jam_mulai}-${jamPraktek[0].jam_selesai}`,
            "jeniskunjungan": 1,
            "nomorreferensi": "",
            "nomorantrean": `${poli}-${noReg}`,
            "angkaantrean": parseInt(noReg),
            "estimasidilayani": Date.parse(estimate[0].estimate),
            "sisakuotajkn": jamPraktek[0].kuota - parseInt(noReg),
            "kuotajkn": jamPraktek[0].kuota,
            "sisakuotanonjkn": jamPraktek[0].kuota - parseInt(noReg),
            "kuotanonjkn": jamPraktek[0].kuota,
            "keterangan": "Peserta harap 30 menit lebih awal guna pencatatan administrasi."
        }
        const resAntrean = await window.api.addAntrean(dataAntrean)
        if (![200, 208].includes(resAntrean.metadata.code)) {
            throw error
        }
        query = {
            sql: "INSERT INTO reg_periksa VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            values: [noReg, noRawat, tanggal, jamReg, dokter, noRM, poli, dataPasien.namakeluarga, alamatPJ, dataPasien.keluarga, biayaReg, 'Belum', statusDaftar, 'Ralan', penjab, umur, statusUmur, 'Belum Bayar', statusPoli]
        }
        await window.api.mysql(query)
        await taskId3(noRawat)
        query = {
            sql: "INSERT INTO mutasi_berkas(no_rawat, status, dikirim) VALUES(?, ?, NOW())",
            values: [noRawat, 'Sudah Dikirim']
        }
        await window.api.mysql(query)
        query = {
            sql: "INSERT INTO referensi_mobilejkn_bpjs_taskid VALUES(?, ?, NOW())",
            values: [noRawat, 3]
        }
        await window.api.mysql(query)
        const antriVerif = await ambilAntrian('verifikasi')
        socket.send(JSON.stringify({
            antrian: antriVerif,
            type: 'verifikasi'
        }))
        window.api.send('APMPrint', {
            noRawat: noRawat,
            noAntri: noReg,
            nama: dataPasien.nm_pasien,
            noRM: noRM,
            jk: dataPasien.jk,
            jenis: namaPenjab,
            poli: namaPoli,
            dokter: namaDokter,
            antriVerif: antriVerif
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

const taskId3 = async(booking) => {
    const dataTaskId = {
        "kodebooking": booking,
        "taskid": 3,
        "waktu": Date.now()
    }
    return await window.api.taskId(dataTaskId)
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
    customState = ""
    reloadNumInput()
    reloadCustomInput()
}

const reloadNumInput = () => {
    document.getElementById('numInput').value = numState
}

const reloadCustomInput = () => {
    document.getElementById('customInput').value = customState
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