from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os, threading, asyncio

from utils.database import init_db
from utils.storage_db import (
    get_semua_akun, set_status_akun, set_level_warming, set_score_akun,
    get_semua_grup, get_grup_aktif, get_grup_hot,
    simpan_banyak_grup, set_status_grup, set_score_grup, grup_sudah_ada,
    simpan_draft, get_semua_draft, get_draft_aktif, set_draft_aktif, hapus_draft,
    tambah_antrian, get_semua_antrian, update_status_antrian, hapus_antrian,
    get_riwayat_hari_ini, get_ringkasan_hari_ini, sudah_dikirim_hari_ini
)
from utils.settings_manager import get_semua as get_semua_settings, update_banyak
from services.account_manager import login_akun, logout_akun, submit_otp, auto_reconnect_semua, _clients, run_sync, _loop
from services.group_manager import fetch_grup_dari_akun
from services.message_service import kirim_pesan_manual
from core.smart_sender import pilih_akun_tersedia, ringkasan_akun
from core.scoring import update_score_akun, update_semua_score_grup, get_label_akun, get_label_grup
from core.warming import get_info_warming, update_level_otomatis
from core.broadcast_session import buat_sesi, get_sesi, get_semua_sesi, stop_sesi, hapus_sesi, jalankan_sesi
from core.sync_manager import buat_sesi_sync, get_sesi_sync, stop_sesi_sync, jalankan_sync
from core.grup_analisis import fetch_last_chat, get_semua_analisis, update_semua_score

app = Flask(__name__)
CORS(app)
init_db()
print("Menghubungkan ulang akun...")
run_sync(auto_reconnect_semua())

# ── FRONTEND ──────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), 'index.html')

@app.route("/<path:f>")
def static_files(f):
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), f)

# ── AKUN ──────────────────────────────────────────────────
@app.route("/api/akun", methods=["GET"])
def api_get_akun():
    data = get_semua_akun()
    for a in data:
        a["online"] = a["phone"] in _clients
        a["label_score"] = get_label_akun(a.get("score", 0))
        info = get_info_warming(a["phone"])
        a["label_level"] = info.get("label_level", "")
    return jsonify(data)

@app.route("/api/akun/login", methods=["POST"])
def api_login():
    phone = request.json.get("phone")
    if not phone: return jsonify({"error": "Nomor HP wajib"}), 400
    return jsonify(run_sync(login_akun(phone)))

@app.route("/api/akun/otp", methods=["POST"])
def api_otp():
    b = request.json
    return jsonify(run_sync(submit_otp(b.get("phone"), b.get("kode"), b.get("password"))))

@app.route("/api/akun/logout", methods=["POST"])
def api_logout():
    return jsonify(run_sync(logout_akun(request.json.get("phone"))))

@app.route("/api/akun/status", methods=["POST"])
def api_status_akun():
    b = request.json; set_status_akun(b.get("phone"), b.get("status")); return jsonify({"ok": True})

@app.route("/api/akun/pulihkan", methods=["POST"])
def api_pulihkan_akun():
    set_status_akun(request.json.get("phone"), "active"); return jsonify({"ok": True})

@app.route("/api/akun/tersedia", methods=["GET"])
def api_akun_tersedia():
    return jsonify(pilih_akun_tersedia(_clients))

@app.route("/api/akun/ringkasan", methods=["GET"])
def api_ringkasan_akun():
    return jsonify(ringkasan_akun([a["phone"] for a in get_semua_akun()]))

@app.route("/api/akun/<phone>/score", methods=["POST"])
def api_score_akun(phone):
    score = update_score_akun(phone); return jsonify({"ok": True, "score": score})

@app.route("/api/akun/<phone>/score/manual", methods=["POST"])
def api_score_akun_manual(phone):
    score = int(request.json.get("score", 0)); set_score_akun(phone, score); return jsonify({"ok": True})

@app.route("/api/akun/<phone>/level", methods=["POST"])
def api_level_akun(phone):
    set_level_warming(phone, int(request.json.get("level", 1))); return jsonify({"ok": True})

@app.route("/api/akun/<phone>/warming", methods=["GET"])
def api_warming(phone):
    return jsonify(get_info_warming(phone))

# ── GRUP ──────────────────────────────────────────────────
@app.route("/api/grup", methods=["GET"])
def api_get_grup():
    return jsonify(get_semua_grup())

@app.route("/api/grup/aktif", methods=["GET"])
def api_grup_aktif():
    return jsonify(get_grup_aktif())

@app.route("/api/grup/hot", methods=["GET"])
def api_grup_hot():
    return jsonify(get_grup_hot())

@app.route("/api/grup/analisis", methods=["GET"])
def api_grup_analisis():
    return jsonify(get_semua_analisis())

@app.route("/api/grup/fetch", methods=["POST"])
def api_fetch_grup():
    phone = request.json.get("phone")
    if not phone: return jsonify({"error": "Pilih akun"}), 400
    hasil = run_sync(fetch_grup_dari_akun(phone))
    simpan_banyak_grup(hasil)
    return jsonify(hasil)

@app.route("/api/grup/fetch/baru", methods=["POST"])
def api_fetch_grup_baru():
    """Fetch grup yang belum ada di database (untuk Discovery)."""
    phone = request.json.get("phone")
    if not phone: return jsonify({"error": "Pilih akun"}), 400
    semua = run_sync(fetch_grup_dari_akun(phone))
    baru  = [g for g in semua if not grup_sudah_ada(g["id"])]
    return jsonify(baru)

@app.route("/api/grup/tambah-manual", methods=["POST"])
def api_tambah_grup_manual():
    """Tambah grup manual via username/link (Discovery)."""
    b     = request.json
    phone = b.get("phone")
    link  = b.get("link", "").strip()
    if not phone or not link: return jsonify({"error": "phone dan link wajib"}), 400
    client = _clients.get(phone)
    if not client: return jsonify({"error": "Akun tidak aktif"}), 400
    async def _fetch():
        username = link.replace("https://t.me/","").replace("@","").strip("/")
        try:
            entity = await client.get_entity(username)
            return {
                "id": entity.id, "nama": entity.title,
                "username": getattr(entity, "username", None),
                "tipe": "supergroup" if getattr(entity, "megagroup", False) else "channel",
                "jumlah_member": getattr(entity, "participants_count", 0),
                "link": link, "status": "active"
            }
        except Exception as e:
            return {"error": str(e)}
    hasil = run_sync(_fetch())
    if "error" in hasil: return jsonify(hasil), 400
    simpan_banyak_grup([hasil], sumber="manual")
    return jsonify({"ok": True, "grup": hasil})

@app.route("/api/grup/status", methods=["POST"])
def api_status_grup():
    b = request.json; set_status_grup(int(b.get("grup_id")), b.get("status")); return jsonify({"ok": True})

@app.route("/api/grup/pulihkan", methods=["POST"])
def api_pulihkan_grup():
    set_status_grup(int(request.json.get("grup_id")), "active"); return jsonify({"ok": True})

@app.route("/api/grup/<int:gid>/score/manual", methods=["POST"])
def api_score_grup_manual(gid):
    score = int(request.json.get("score", 0))
    label = get_label_grup(score)
    set_score_grup(gid, score, label)
    return jsonify({"ok": True, "label": label})

@app.route("/api/grup/<int:gid>/last-chat", methods=["POST"])
def api_last_chat(gid):
    phone  = request.json.get("phone")
    client = _clients.get(phone) if phone else next(iter(_clients.values()), None)
    if not client: return jsonify({"error": "Tidak ada akun aktif"}), 400
    waktu = run_sync(fetch_last_chat(client, gid))
    return jsonify({"ok": True, "last_chat": waktu})

@app.route("/api/grup/score/update-semua", methods=["POST"])
def api_update_score_semua():
    update_semua_score(); return jsonify({"ok": True})

# ── DRAFT ─────────────────────────────────────────────────
@app.route("/api/draft", methods=["GET"])
def api_get_draft():
    return jsonify(get_semua_draft())

@app.route("/api/draft/aktif", methods=["GET"])
def api_draft_aktif():
    return jsonify(get_draft_aktif() or {})

@app.route("/api/draft", methods=["POST"])
def api_post_draft():
    b = request.json; return jsonify(simpan_draft(b.get("judul"), b.get("isi")))

@app.route("/api/draft/<int:did>/aktif", methods=["POST"])
def api_set_draft_aktif(did):
    set_draft_aktif(did); return jsonify({"ok": True})

@app.route("/api/draft/<int:did>", methods=["DELETE"])
def api_del_draft(did):
    hapus_draft(did); return jsonify({"ok": True})

# ── KIRIM ─────────────────────────────────────────────────
@app.route("/api/pesan/kirim", methods=["POST"])
def api_kirim():
    b = request.json
    phone, grup_id, pesan = b.get("phone"), b.get("grup_id"), b.get("pesan")
    if not all([phone, grup_id, pesan]): return jsonify({"error": "phone, grup_id, pesan wajib"}), 400
    return jsonify(run_sync(kirim_pesan_manual(phone, grup_id, pesan)))

@app.route("/api/pesan/log", methods=["GET"])
def api_log():
    return jsonify(get_riwayat_hari_ini())

# ── ANTRIAN ───────────────────────────────────────────────
@app.route("/api/antrian", methods=["GET"])
def api_get_antrian():
    return jsonify(get_semua_antrian())

@app.route("/api/antrian", methods=["POST"])
def api_post_antrian():
    b = request.json
    return jsonify(tambah_antrian(b.get("phone"), int(b.get("grup_id")), b.get("pesan")))

@app.route("/api/antrian/<int:iid>/kirim", methods=["POST"])
def api_kirim_antrian(iid):
    antrian = get_semua_antrian()
    item = next((a for a in antrian if a["id"] == iid), None)
    if not item: return jsonify({"error": "Tidak ditemukan"}), 404
    hasil  = run_sync(kirim_pesan_manual(item["phone"], item["grup_id"], item["pesan"]))
    update_status_antrian(iid, "terkirim" if hasil["status"] == "berhasil" else "gagal")
    return jsonify(hasil)

@app.route("/api/antrian/<int:iid>", methods=["DELETE"])
def api_del_antrian(iid):
    hapus_antrian(iid); return jsonify({"ok": True})

# ── RIWAYAT ───────────────────────────────────────────────
@app.route("/api/riwayat", methods=["GET"])
def api_riwayat():
    return jsonify(get_riwayat_hari_ini())

@app.route("/api/riwayat/ringkasan", methods=["GET"])
def api_ringkasan():
    return jsonify(get_ringkasan_hari_ini())

@app.route("/api/riwayat/cek/<int:gid>", methods=["GET"])
def api_cek_kirim(gid):
    return jsonify({"sudah_dikirim": sudah_dikirim_hari_ini(gid)})

# ── BROADCAST ─────────────────────────────────────────────
def _run_broadcast(sid, semua_client):
    asyncio.run_coroutine_threadsafe(jalankan_sesi(sid, semua_client), _loop)

@app.route("/api/broadcast/mulai", methods=["POST"])
def api_broadcast_mulai():
    b = request.json
    pesan, jeda, grup_list = b.get("pesan"), int(b.get("jeda", 30)), b.get("grup_list", [])
    if not pesan: return jsonify({"error": "Isi pesan wajib"}), 400
    if not grup_list: return jsonify({"error": "Pilih minimal 1 grup"}), 400
    if not _clients: return jsonify({"error": "Tidak ada akun online"}), 400
    daftar_phone = list(_clients.keys())
    sid = buat_sesi(daftar_phone, grup_list, pesan, jeda)
    threading.Thread(target=_run_broadcast, args=(sid, dict(_clients)), daemon=True).start()
    return jsonify({"ok": True, "session_id": sid, "pesan": f"Mulai ke {len(grup_list)} grup"})

@app.route("/api/broadcast/status/<sid>", methods=["GET"])
def api_broadcast_status(sid):
    sesi = get_sesi(sid)
    if not sesi: return jsonify({"error": "Tidak ditemukan"}), 404
    return jsonify({k: sesi[k] for k in ["session_id","daftar_phone","status","total","selesai","countdown","hasil","mulai"] if k in sesi})

@app.route("/api/broadcast/stop/<sid>", methods=["POST"])
def api_broadcast_stop(sid):
    stop_sesi(sid); return jsonify({"ok": True})

@app.route("/api/broadcast/semua", methods=["GET"])
def api_broadcast_semua():
    return jsonify([{k: s[k] for k in ["session_id","status","total","selesai","mulai","daftar_phone"] if k in s} for s in get_semua_sesi()])

@app.route("/api/broadcast/hapus/<sid>", methods=["DELETE"])
def api_broadcast_hapus(sid):
    hapus_sesi(sid); return jsonify({"ok": True})

# ── SINKRONISASI ──────────────────────────────────────────
def _run_sync(sid, client):
    asyncio.run_coroutine_threadsafe(jalankan_sync(sid, client), _loop)

@app.route("/api/sync/mulai", methods=["POST"])
def api_sync_mulai():
    phone  = request.json.get("phone")
    client = _clients.get(phone)
    if not client: return jsonify({"error": "Akun tidak aktif"}), 400
    semua_hot = get_grup_hot()
    if not semua_hot: return jsonify({"error": "Tidak ada grup Hot di database"}), 400
    sid = buat_sesi_sync(phone, semua_hot)
    threading.Thread(target=_run_sync, args=(sid, client), daemon=True).start()
    return jsonify({"ok": True, "session_id": sid, "total": len(semua_hot)})

@app.route("/api/sync/status/<sid>", methods=["GET"])
def api_sync_status(sid):
    sesi = get_sesi_sync(sid)
    if not sesi: return jsonify({"error": "Tidak ditemukan"}), 404
    return jsonify(sesi)

@app.route("/api/sync/stop/<sid>", methods=["POST"])
def api_sync_stop(sid):
    stop_sesi_sync(sid); return jsonify({"ok": True})

# ── SETTINGS ──────────────────────────────────────────────
@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    return jsonify(get_semua_settings())

@app.route("/api/settings", methods=["POST"])
def api_update_settings():
    update_banyak(request.json); return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)
