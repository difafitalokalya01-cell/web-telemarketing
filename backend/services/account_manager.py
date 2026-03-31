from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import config
import os
import glob
from utils.storage_db import simpan_akun, get_semua_akun, set_status_akun

_clients: dict = {}
_pending_otp: dict = {}

import asyncio
_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)


def run_sync(coro):
    return _loop.run_until_complete(coro)


async def auto_reconnect_semua():
    session_files = glob.glob("session/akun_*.session")
    if not session_files:
        print("Tidak ada session tersimpan.")
        return
    print(f"Auto-reconnect {len(session_files)} akun...")
    for session_file in session_files:
        session_name = session_file.replace(".session", "")
        basename     = os.path.basename(session_name)
        phone_raw    = basename.replace("akun_", "")
        phone        = f"+{phone_raw}"
        try:
            client = TelegramClient(session_name, config.API_ID, config.API_HASH, loop=_loop)
            await client.connect()
            if await client.is_user_authorized():
                me = await client.get_me()
                _clients[phone] = client
                simpan_akun(phone, me.first_name, me.username)
                print(f"   OK: {me.first_name} ({phone}) online")
            else:
                print(f"   SKIP: {phone} session expired")
                await client.disconnect()
        except Exception as e:
            print(f"   GAGAL: {phone} - {str(e)}")
    print(f"Selesai. {len(_clients)} akun online.")


async def login_akun(phone: str) -> dict:
    session = config.get_session_name(phone)
    if phone in _pending_otp:
        client = _pending_otp[phone]
    else:
        client = TelegramClient(session, config.API_ID, config.API_HASH, loop=_loop)
    try:
        if not client.is_connected():
            await client.connect()
        if await client.is_user_authorized():
            me = await client.get_me()
            _clients[phone] = client
            simpan_akun(phone, me.first_name, me.username)
            return {"status": "aktif", "phone": phone, "nama": me.first_name, "username": me.username or "-"}
        await client.send_code_request(phone)
        _pending_otp[phone] = client
        return {"status": "perlu_otp", "pesan": "Kode OTP sudah dikirim ke Telegram kamu.", "phone": phone}
    except Exception as e:
        return {"status": "error", "pesan": str(e)}


async def submit_otp(phone: str, kode: str, password: str = None) -> dict:
    client = _pending_otp.get(phone)
    if not client:
        return {"status": "error", "pesan": "Sesi tidak ditemukan. Coba login ulang."}
    try:
        if not client.is_connected():
            await client.connect()
        await client.sign_in(phone, kode)
        me = await client.get_me()
        _clients[phone] = client
        if phone in _pending_otp:
            del _pending_otp[phone]
        simpan_akun(phone, me.first_name, me.username)
        return {"status": "aktif", "phone": phone, "nama": me.first_name, "username": me.username or "-"}
    except SessionPasswordNeededError:
        if password:
            try:
                await client.sign_in(password=password)
                me = await client.get_me()
                _clients[phone] = client
                if phone in _pending_otp:
                    del _pending_otp[phone]
                simpan_akun(phone, me.first_name, me.username)
                return {"status": "aktif", "phone": phone, "nama": me.first_name, "username": me.username or "-"}
            except Exception as e:
                return {"status": "error", "pesan": f"Password 2FA salah: {str(e)}"}
        else:
            return {"status": "perlu_2fa", "pesan": "Masukkan password 2FA Telegram kamu.", "phone": phone}
    except Exception as e:
        return {"status": "error", "pesan": f"OTP salah atau expired: {str(e)}"}


async def logout_akun(phone: str) -> dict:
    if phone in _clients:
        await _clients[phone].disconnect()
        del _clients[phone]
    return {"status": "ok", "pesan": f"{phone} logout."}


def cek_status_semua() -> list:
    data = get_semua_akun()
    for a in data:
        a["online"] = a["phone"] in _clients
    return data


def get_client(phone: str):
    return _clients.get(phone)
