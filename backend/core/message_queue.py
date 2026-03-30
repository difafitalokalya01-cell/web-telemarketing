from datetime import datetime
from utils.storage import baca_json, tulis_json

FILE_DRAFT = "data/draft_pesan.json"
FILE_QUEUE = "data/antrian_kirim.json"

def _gen_id(daftar): return max((d.get("id",0) for d in daftar), default=0) + 1

# --- DRAFT ---
def simpan_draft(judul: str, isi: str) -> dict:
    daftar = baca_json(FILE_DRAFT)
    draft  = {"id": _gen_id(daftar), "judul": judul, "isi": isi,
               "dibuat": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    daftar.append(draft)
    tulis_json(FILE_DRAFT, daftar)
    return draft

def ambil_semua_draft() -> list:
    return baca_json(FILE_DRAFT)

def hapus_draft(draft_id: int):
    daftar = [d for d in baca_json(FILE_DRAFT) if d["id"] != draft_id]
    tulis_json(FILE_DRAFT, daftar)

# --- ANTRIAN ---
def tambah_ke_antrian(phone: str, grup_id: int, pesan: str) -> dict:
    antrian = baca_json(FILE_QUEUE)
    item = {"id": _gen_id(antrian), "phone": phone, "grup_id": grup_id,
            "pesan": pesan, "status": "menunggu",
            "dibuat": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "dikirim": None}
    antrian.append(item)
    tulis_json(FILE_QUEUE, antrian)
    return item

def ambil_semua_antrian() -> list:
    return baca_json(FILE_QUEUE)

def ambil_antrian_menunggu() -> list:
    return [a for a in baca_json(FILE_QUEUE) if a["status"] == "menunggu"]

def update_status_antrian(item_id: int, status: str):
    antrian = baca_json(FILE_QUEUE)
    for item in antrian:
        if item["id"] == item_id:
            item["status"]  = status
            item["dikirim"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            break
    tulis_json(FILE_QUEUE, antrian)

def hapus_item_antrian(item_id: int):
    antrian = [a for a in baca_json(FILE_QUEUE) if a["id"] != item_id]
    tulis_json(FILE_QUEUE, antrian)
