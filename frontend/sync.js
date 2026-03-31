let _syncSid = null;
let _syncInterval = null;

async function muatTabSync() {
    await _isiSelectAkun("sync-akun");
}

async function mulaiSync() {
    const phone = document.getElementById("sync-akun").value;
    if (!phone) { tampilPesan("pesan-sync","⚠️ Pilih akun.","gagal"); return; }
    tampilPesan("pesan-sync","⏳ Memulai sinkronisasi...","info");
    try {
        const r = await _post("/sync/mulai", { phone });
        if (r.error) { tampilPesan("pesan-sync",`❌ ${r.error}`,"gagal"); return; }
        _syncSid = r.session_id;
        document.getElementById("sync-progress-panel").style.display = "block";
        _syncInterval = setInterval(() => cekProgressSync(), 2000);
        cekProgressSync();
    } catch { tampilPesan("pesan-sync","❌ Gagal mulai.","gagal"); }
}

async function cekProgressSync() {
    if (!_syncSid) return;
    try {
        const s = await _get(`/sync/status/${_syncSid}`);
        const persen = s.total > 0 ? Math.round((s.selesai/s.total)*100) : 0;
        document.getElementById("sync-progress-info").innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span><strong>${s.selesai}/${s.total}</strong> grup</span>
                <span class="badge badge-${s.status==='berjalan'?'aktif':'offline'}">${s.status}</span>
            </div>
            <div class="limit-bar-track"><div class="limit-bar-fill ok" style="width:${persen}%"></div></div>
            <div style="font-size:12px;color:#888;margin-top:4px">${persen}% selesai</div>`;
        if (s.hasil && s.hasil.length) {
            document.getElementById("sync-log").innerHTML = s.hasil.map(h =>
                `<div class="log-item ${h.status==='join'?'berhasil':'skip'}">
                    <span>${h.status==='join'?'✅':'⏭️'} ${h.grup}</span>
                    <span class="log-waktu">${h.status}</span>
                </div>`).join("");
        }
        if (s.status !== "berjalan") {
            clearInterval(_syncInterval); _syncInterval = null;
        }
    } catch {}
}

async function stopSync() {
    if (!_syncSid) return;
    await _post(`/sync/stop/${_syncSid}`, {});
    clearInterval(_syncInterval);
}
