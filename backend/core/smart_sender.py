import asyncio
import random
from utils.storage_db import get_semua_akun, get_status_akun, hitung_kirim_hari_ini

BATAS_PESAN_PER_AKUN = 30
DELAY_MIN = 1
DELAY_MAX = 5


def pilih_akun_tersedia(daftar_client: dict) -> list:
    tersedia = []
    for phone in daftar_client:
        status = get_status_akun(phone)
        if status != "active":
            continue
        if not boleh_kirim_lagi(phone):
            continue
        tersedia.append(phone)
    return tersedia


def boleh_kirim_lagi(phone: str) -> bool:
    sudah = hitung_kirim_hari_ini(phone)
    return sudah < BATAS_PESAN_PER_AKUN


def ringkasan_akun(daftar_phone: list) -> list:
    hasil = []
    for phone in daftar_phone:
        sudah = hitung_kirim_hari_ini(phone)
        hasil.append({
            "phone"       : phone,
            "status_akun" : get_status_akun(phone),
            "sudah_kirim" : sudah,
            "batas"       : BATAS_PESAN_PER_AKUN,
            "sisa"        : max(0, BATAS_PESAN_PER_AKUN - sudah),
            "boleh_kirim" : sudah < BATAS_PESAN_PER_AKUN
        })
    return hasil


async def delay_sebelum_kirim():
    detik = random.uniform(DELAY_MIN, DELAY_MAX)
    await asyncio.sleep(detik)
