from utils.storage import baca_json, tulis_json

FILE = "data/grup.json"
STATUS_ACTIVE = "active"
STATUS_FAILED = "failed"
STATUS_SKIP   = "skip"

def set_status_grup(grup_id: int, status: str):
    daftar = baca_json(FILE)
    for grup in daftar:
        if grup["id"] == grup_id:
            grup["status"] = status
            tulis_json(FILE, daftar)
            return

def get_status_grup(grup_id: int) -> str:
    for grup in baca_json(FILE):
        if grup["id"] == grup_id:
            return grup.get("status", STATUS_ACTIVE)
    return STATUS_ACTIVE

def get_grup_aktif() -> list:
    return [g for g in baca_json(FILE) if g.get("status", STATUS_ACTIVE) == STATUS_ACTIVE]

def tandai_failed(grup_id: int): set_status_grup(grup_id, STATUS_FAILED)
def tandai_skip(grup_id: int):   set_status_grup(grup_id, STATUS_SKIP)
def pulihkan_grup(grup_id: int): set_status_grup(grup_id, STATUS_ACTIVE)
