from datetime import datetime

def log_info(pesan: str):    print(f"[{_w()}] ℹ️  {pesan}")
def log_berhasil(a, t):      print(f"[{_w()}] ✅ {a} → {t}")
def log_gagal(a, t, alasan): print(f"[{_w()}] ❌ {a} → {t} | {alasan}")
def _w():                    return datetime.now().strftime("%H:%M:%S")
