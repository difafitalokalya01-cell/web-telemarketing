from utils.storage import baca_json, tulis_json

FILE = "data/akun.json"
STATUS_ACTIVE  = "active"
STATUS_LIMITED = "limited"
STATUS_BANNED  = "banned"

def set_status(phone: str, status: str):
    daftar = baca_json(FILE)
    for akun in daftar:
        if akun["phone"] == phone:
            akun["status"] = status
            tulis_json(FILE, daftar)
            return
def get_status(phone: str) -> str:
    for akun in baca_json(FILE):
        if akun["phone"] == phone:
            return akun.get("status", STATUS_ACTIVE)
    return STATUS_ACTIVE

def get_semua_aktif() -> list:
    return [a for a in baca_json(FILE) if a.get("status", STATUS_ACTIVE) == STATUS_ACTIVE]

def tandai_limited(phone: str): set_status(phone, STATUS_LIMITED)
def tandai_banned(phone: str):  set_status(phone, STATUS_BANNED)
def pulihkan_akun(phone: str):  set_status(phone, STATUS_ACTIVE)
