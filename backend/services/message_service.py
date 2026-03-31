from datetime import datetime
from telethon.errors import FloodWaitError, ChatWriteForbiddenError, UserBannedInChannelError, ChannelPrivateError
from services.account_manager import get_client
from utils.storage_db import catat_riwayat, hitung_kirim_hari_ini, update_last_kirim_grup
from core.warming import get_batas_kirim, get_jeda_kirim
import asyncio, random

async def kirim_pesan_manual(phone: str, grup_id: int, pesan: str) -> dict:
    client = get_client(phone)
    if not client:
        return {"status": "error", "pesan": "Akun tidak aktif. Login dulu."}
    batas = get_batas_kirim(phone)
    if hitung_kirim_hari_ini(phone) >= batas:
        return {"status": "gagal", "pesan": f"Batas harian tercapai ({batas} pesan)."}
    try:
        jeda = random.uniform(1, get_jeda_kirim(phone))
        await asyncio.sleep(jeda)
        entity    = await client.get_entity(int(grup_id))
        await client.send_message(entity, pesan)
        nama_grup = getattr(entity, "title", str(grup_id))
        catat_riwayat(phone, grup_id, nama_grup, "berhasil")
        update_last_kirim_grup(grup_id)
        return {"status": "berhasil", "akun": phone, "grup": nama_grup,
                "waktu": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    except FloodWaitError as e:
        return {"status": "gagal", "pesan": f"Flood wait {e.seconds} detik."}
    except ChatWriteForbiddenError:
        catat_riwayat(phone, grup_id, str(grup_id), "gagal")
        return {"status": "gagal", "pesan": "Tidak punya izin kirim."}
    except UserBannedInChannelError:
        return {"status": "gagal", "pesan": "Akun dibanned di grup ini."}
    except ChannelPrivateError:
        return {"status": "gagal", "pesan": "Grup sudah private."}
    except Exception as e:
        catat_riwayat(phone, grup_id, str(grup_id), "gagal")
        return {"status": "error", "pesan": str(e)}
