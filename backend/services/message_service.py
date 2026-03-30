from datetime import datetime
from telethon.errors import FloodWaitError, ChatWriteForbiddenError, UserBannedInChannelError
from services.account_manager import get_client
from core.account_status import tandai_limited, tandai_banned
from core.group_status import tandai_failed
from core.send_history import catat_riwayat
from utils.storage import baca_json, tulis_json

async def kirim_pesan_manual(phone: str, grup_id: int, pesan: str) -> dict:
    client = get_client(phone)
    if not client:
        return {"status": "error", "pesan": "Akun tidak aktif. Login dulu."}
    try:
        entity    = await client.get_entity(int(grup_id))
        await client.send_message(entity, pesan)
        nama_grup = getattr(entity, "title", str(grup_id))
        catat_riwayat(phone, grup_id, nama_grup, "berhasil")
        hasil = {"status": "berhasil", "akun": phone, "grup": nama_grup,
                 "waktu": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        _simpan_log(hasil)
        return hasil
    except FloodWaitError as e:
        tandai_limited(phone)
        return {"status": "flood_wait", "pesan": f"Tunggu {e.seconds} detik. Akun ditandai limited."}
    except ChatWriteForbiddenError:
        tandai_failed(grup_id)
        catat_riwayat(phone, grup_id, str(grup_id), "gagal")
        return {"status": "gagal", "pesan": "Tidak punya izin. Grup ditandai failed."}
    except UserBannedInChannelError:
        tandai_banned(phone)
        return {"status": "gagal", "pesan": "Akun dibanned. Status akun diupdate."}
    except Exception as e:
        catat_riwayat(phone, grup_id, str(grup_id), "gagal")
        return {"status": "error", "pesan": str(e)}

def _simpan_log(hasil: dict):
    tanggal = datetime.now().strftime("%Y-%m-%d")
    file    = f"data/log_{tanggal}.json"
    log     = baca_json(file)
    log.append(hasil)
    tulis_json(file, log)
