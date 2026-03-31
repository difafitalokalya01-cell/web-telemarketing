# ============================================================
# core/broadcast_session.py v2
# Broadcast dengan rotasi akun otomatis + riwayat tersimpan
# ============================================================

import asyncio
import random
from datetime import datetime
from utils.storage_db import catat_riwayat

_sesi_aktif: dict = {}


def buat_sesi(
    daftar_phone: list,   # list akun yang akan dirotasi
    grup_list: list,
    pesan: str,
    jeda: int
) -> str:
    session_id = f"sesi_{datetime.now().strftime('%H%M%S')}_{daftar_phone[0][-4:]}"

    _sesi_aktif[session_id] = {
        "session_id"   : session_id,
        "daftar_phone" : daftar_phone,   # semua akun yang dipakai
        "pesan"        : pesan,
        "jeda"         : jeda,
        "status"       : "menunggu",
        "total"        : len(grup_list),
        "selesai"      : 0,
        "hasil"        : [],
        "mulai"        : datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "grup_list"    : grup_list,
        "stop"         : False,
        "countdown"    : 0
    }

    return session_id


def get_sesi(session_id: str) -> dict:
    return _sesi_aktif.get(session_id)


def get_semua_sesi() -> list:
    return list(_sesi_aktif.values())


def stop_sesi(session_id: str):
    if session_id in _sesi_aktif:
        _sesi_aktif[session_id]["stop"] = True


def hapus_sesi(session_id: str):
    if session_id in _sesi_aktif:
        del _sesi_aktif[session_id]


async def jalankan_sesi(session_id: str, semua_client: dict):
    """
    Jalankan broadcast dengan rotasi akun.

    semua_client: dict { phone: TelegramClient }
    """
    sesi = _sesi_aktif.get(session_id)
    if not sesi:
        return

    sesi["status"]  = "berjalan"
    jeda            = sesi["jeda"]
    daftar_phone    = sesi["daftar_phone"]
    jumlah_akun     = len(daftar_phone)

    for i, grup in enumerate(sesi["grup_list"]):

        # Cek stop
        if sesi["stop"]:
            sesi["status"] = "dihentikan"
            _update_hasil(sesi, grup, "dihentikan", "-", "Dihentikan operator")
            break

        # Pilih akun berdasarkan rotasi
        index_akun = i % jumlah_akun
        phone      = daftar_phone[index_akun]
        client     = semua_client.get(phone)

        grup_id   = grup["id"]
        nama_grup = grup["nama"]

        # Kalau akun tidak tersedia, skip
        if not client:
            _update_hasil(sesi, grup, "skip", phone, f"Akun {phone} tidak tersedia")
            catat_riwayat(phone, grup_id, nama_grup, "skip")
            continue

        # Tandai sedang mengirim
        _update_hasil(sesi, grup, "mengirim", phone, "Sedang mengirim...")

        try:
            entity = await client.get_entity(int(grup_id))
            await client.send_message(entity, sesi["pesan"])

            # Berhasil
            _update_hasil(sesi, grup, "berhasil", phone, "Terkirim")
            sesi["selesai"] += 1

            # Simpan ke riwayat database
            catat_riwayat(phone, grup_id, nama_grup, "berhasil")

        except Exception as e:
            pesan_error = str(e)[:100]
            _update_hasil(sesi, grup, "gagal", phone, pesan_error)
            catat_riwayat(phone, grup_id, nama_grup, "gagal")

        # Jeda sebelum grup berikutnya
        if i < len(sesi["grup_list"]) - 1 and not sesi["stop"]:
            # Variasi kecil agar natural
            jeda_aktual = max(1, jeda + random.randint(-2, 3))
            sesi["countdown"] = jeda_aktual

            for detik in range(jeda_aktual, 0, -1):
                if sesi["stop"]:
                    break
                sesi["countdown"] = detik
                await asyncio.sleep(1)

            sesi["countdown"] = 0

    if sesi["status"] == "berjalan":
        sesi["status"] = "selesai"

    sesi["selesai_pada"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ── INTERNAL ──────────────────────────────────────────────
def _update_hasil(sesi, grup, status, phone, pesan):
    for h in sesi["hasil"]:
        if h["grup_id"] == grup["id"]:
            h["status"] = status
            h["phone"]  = phone
            h["pesan"]  = pesan
            h["waktu"]  = datetime.now().strftime("%H:%M:%S")
            return

    sesi["hasil"].append({
        "grup_id"  : grup["id"],
        "nama_grup": grup["nama"],
        "status"   : status,
        "phone"    : phone,
        "pesan"    : pesan,
        "waktu"    : datetime.now().strftime("%H:%M:%S")
    })
