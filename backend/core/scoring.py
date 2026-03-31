from utils.database import get_conn
from utils.settings_manager import get_int
from core.warming import hitung_umur_akun

def hitung_score_akun(phone: str) -> int:
    conn = get_conn()
    row  = conn.execute("SELECT * FROM akun WHERE phone=?", (phone,)).fetchone()
    conn.close()
    if not row: return 0
    bobot_umur = get_int("score_akun_bobot_umur", 40)
    bobot_kesehatan = get_int("score_akun_bobot_kesehatan", 30)
    bobot_performa = get_int("score_akun_bobot_performa", 30)
    umur = hitung_umur_akun(row["tanggal_buat"] or "")
    if umur >= 90: skor_umur = bobot_umur
    elif umur >= 31: skor_umur = int(bobot_umur * 0.7)
    elif umur >= 8: skor_umur = int(bobot_umur * 0.4)
    else: skor_umur = int(bobot_umur * 0.15)
    flood = row["total_flood"] or 0
    banned = row["total_banned"] or 0
    if banned > 0: skor_kesehatan = 0
    elif flood >= 3: skor_kesehatan = int(bobot_kesehatan * 0.3)
    elif flood >= 1: skor_kesehatan = int(bobot_kesehatan * 0.6)
    else: skor_kesehatan = bobot_kesehatan
    total_kirim = row["total_kirim"] or 0
    total_berhasil = row["total_berhasil"] or 0
    if total_kirim == 0: skor_performa = int(bobot_performa * 0.5)
    else:
        rate = total_berhasil / total_kirim
        if rate >= 0.9: skor_performa = bobot_performa
        elif rate >= 0.7: skor_performa = int(bobot_performa * 0.7)
        elif rate >= 0.5: skor_performa = int(bobot_performa * 0.4)
        else: skor_performa = int(bobot_performa * 0.2)
    return min(100, max(0, skor_umur + skor_kesehatan + skor_performa))

def get_label_akun(score: int) -> str:
    if score >= get_int("score_akun_terpercaya", 80): return "🟢 Terpercaya"
    elif score >= get_int("score_akun_baik", 60): return "🟡 Baik"
    elif score >= get_int("score_akun_perhatian", 40): return "🟠 Perlu Perhatian"
    else: return "🔴 Berisiko"

def update_score_akun(phone: str):
    score = hitung_score_akun(phone)
    conn = get_conn()
    conn.execute("UPDATE akun SET score=? WHERE phone=?", (score, phone))
    conn.commit()
    conn.close()
    return score

def hitung_score_grup(grup_id: int) -> int:
    conn = get_conn()
    row  = conn.execute("SELECT * FROM grup WHERE id=?", (grup_id,)).fetchone()
    conn.close()
    if not row: return 0
    bobot_member = get_int("score_grup_bobot_member", 50)
    bobot_riwayat = get_int("score_grup_bobot_riwayat", 50)
    member = row["jumlah_member"] or 0
    if member >= 10000: skor_member = bobot_member
    elif member >= 5000: skor_member = int(bobot_member * 0.8)
    elif member >= 1000: skor_member = int(bobot_member * 0.6)
    elif member >= 100: skor_member = int(bobot_member * 0.3)
    else: skor_member = int(bobot_member * 0.1)
    total_kirim = row["total_kirim"] or 0
    total_berhasil = row["total_berhasil"] or 0
    if total_kirim == 0: skor_riwayat = int(bobot_riwayat * 0.5)
    else:
        rate = total_berhasil / total_kirim
        if rate >= 0.9: skor_riwayat = bobot_riwayat
        elif rate >= 0.7: skor_riwayat = int(bobot_riwayat * 0.7)
        elif rate >= 0.5: skor_riwayat = int(bobot_riwayat * 0.4)
        else: skor_riwayat = int(bobot_riwayat * 0.1)
    return min(100, max(0, skor_member + skor_riwayat))

def get_label_grup(score: int) -> str:
    if score >= get_int("score_grup_hot", 70): return "Hot"
    elif score >= get_int("score_grup_normal", 30): return "Normal"
    else: return "Skip"

def update_score_grup(grup_id: int):
    score = hitung_score_grup(grup_id)
    label = get_label_grup(score)
    conn = get_conn()
    conn.execute("UPDATE grup SET score=?, label=? WHERE id=?", (score, label, grup_id))
    conn.commit()
    conn.close()
    return score, label

def update_semua_score_grup():
    conn = get_conn()
    ids = [r["id"] for r in conn.execute("SELECT id FROM grup").fetchall()]
    conn.close()
    for gid in ids:
        update_score_grup(gid)
