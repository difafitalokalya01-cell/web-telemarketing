from datetime import datetime
from utils.storage import baca_json, tulis_json

def _file(tanggal=None):
    t = tanggal or datetime.now().strftime("%Y-%m-%d")
    return f"data/riwayat_{t}.json"

def catat_riwayat(phone: str, grup_id: int, nama_grup: str, status: str):
    file = _file()
    data = baca_json(file)
    data.append({"phone": phone, "grup_id": grup_id, "nama_grup": nama_grup,
                 "status": status, "waktu": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
    tulis_json(file, data)

def sudah_dikirim_hari_ini(grup_id: int) -> bool:
    return any(r["grup_id"] == grup_id and r["status"] == "berhasil"
               for r in baca_json(_file()))

def ambil_riwayat_hari_ini() -> list:
    return baca_json(_file())

def ambil_riwayat_per_tanggal(tanggal: str) -> list:
    return baca_json(_file(tanggal))

def ringkasan_hari_ini() -> dict:
    data = baca_json(_file())
    return {
        "berhasil": sum(1 for r in data if r["status"] == "berhasil"),
        "gagal"   : sum(1 for r in data if r["status"] == "gagal"),
        "skip"    : sum(1 for r in data if r["status"] == "skip"),
        "total"   : len(data)
    }
