import json
from pathlib import Path

Path("data").mkdir(exist_ok=True)
Path("session").mkdir(exist_ok=True)

def baca_json(nama_file: str) -> list:
    try:
        with open(nama_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def tulis_json(nama_file: str, data):
    with open(nama_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
