from utils.storage_db import hitung_kirim_hari_ini, get_semua_akun
from utils.storage_db import get_status_akun
from core.warming import get_batas_kirim, get_jeda_kirim, get_info_warming
import asyncio, random

def pilih_akun_tersedia(daftar_client: dict) -> list:
    tersedia = []
    for phone in daftar_client:
        if get_status_akun(phone) != "active": continue
        if not boleh_kirim_lagi(phone): continue
        tersedia.append(phone)
    return tersedia

def boleh_kirim_lagi(phone: str) -> bool:
    return hitung_kirim_hari_ini(phone) < get_batas_kirim(phone)

def ringkasan_akun(daftar_phone: list) -> list:
    hasil = []
    for phone in daftar_phone:
        sudah = hitung_kirim_hari_ini(phone)
        batas = get_batas_kirim(phone)
        info  = get_info_warming(phone)
        hasil.append({
            "phone"       : phone,
            "status_akun" : get_status_akun(phone),
            "sudah_kirim" : sudah,
            "batas"       : batas,
            "sisa"        : max(0, batas - sudah),
            "boleh_kirim" : sudah < batas,
            "level"       : info.get("level", 1),
            "label_level" : info.get("label_level", ""),
        })
    return hasil

async def delay_sebelum_kirim(phone: str = None):
    detik = random.uniform(1, get_jeda_kirim(phone) if phone else 5)
    await asyncio.sleep(detik)
