from telethon import TelegramClient
import config
from utils.storage import baca_json, tulis_json

_clients: dict = {}

async def login_akun(phone: str) -> dict:
    session = config.get_session_name(phone)
    client  = TelegramClient(session, config.API_ID, config.API_HASH)
    try:
        await client.connect()
        if not await client.is_user_authorized():
            return {"status": "perlu_otp", "pesan": "Masukkan kode OTP dari Telegram.", "phone": phone}
        me = await client.get_me()
        _clients[phone] = client
        _simpan_info_akun(phone, me.first_name, me.username)
        return {"status": "aktif", "phone": phone, "nama": me.first_name, "username": me.username or "-"}
    except Exception as e:
        return {"status": "error", "pesan": str(e)}

async def logout_akun(phone: str) -> dict:
    if phone in _clients:
        await _clients[phone].disconnect()
        del _clients[phone]
    return {"status": "ok", "pesan": f"{phone} logout."}

def cek_status_semua() -> list:
    daftar = baca_json("data/akun.json")
    for a in daftar:
        a["online"] = a["phone"] in _clients
    return daftar

def get_client(phone: str):
    return _clients.get(phone)

def _simpan_info_akun(phone, nama, username):
    daftar = baca_json("data/akun.json")
    for a in daftar:
        if a["phone"] == phone:
            a.update({"nama": nama, "username": username or "-"})
            tulis_json("data/akun.json", daftar)
            return
    daftar.append({"phone": phone, "nama": nama, "username": username or "-", "status": "active"})
    tulis_json("data/akun.json", daftar)
