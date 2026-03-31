// ============================================================
// broadcast.js v2
// Broadcast dengan rotasi akun otomatis, tanpa batas grup/jeda
// ============================================================

let _sesiAktif   = null;
let _intervalCek = null;

// ── INIT TAB ──────────────────────────────────────────────
async function muatTabBroadcast() {
    await muatInfoAkunBroadcast();
    await muatListGrupBroadcast();
    muatRiwayatBroadcast();
}

// ── INFO AKUN YANG AKAN DIPAKAI ───────────────────────────
async function muatInfoAkunBroadcast() {
    const el = document.getElementById("broadcast-akun-info");
    try {
        const data   = await _get("/akun");
        const online = data.filter(a => a.online && (a.status === "active" || !a.status));

        if (!online.length) {
            el.innerHTML = `
                <div style="background:#fee2e2;color:#991b1b;padding:10px 14px;
                     border-radius:8px;font-size:13px">
                    ❌ Tidak ada akun online. Login dulu di tab Akun.
                </div>`;
            return;
        }

        el.innerHTML = `
            <div style="font-size:13px;color:#555;margin-bottom:8px">
                Akun berikut akan dipakai secara bergantian:
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${online.map((a, i) => `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;
                         border-radius:8px;padding:6px 12px;font-size:13px">
                        <strong>Akun ${i+1}</strong> · ${a.nama || a.phone}
                        <span style="font-size:11px;color:#2563eb">(${a.phone})</span>
                    </div>`).join("")}
            </div>
            ${online.length > 1 ? `
            <div style="font-size:12px;color:#888;margin-top:8px">
                Pola: Grup 1→${online[0].nama||'Akun1'},
                Grup 2→${online[1]?.nama||'Akun2'}${online.length>2?`, Grup 3→${online[2]?.nama||'Akun3'}`:''},
                dst...
            </div>` : ''}`;

    } catch {
        el.innerHTML = `<div style="color:#aaa;font-size:13px">Gagal muat info akun.</div>`;
    }
}

// ── LOAD DAFTAR GRUP ──────────────────────────────────────
async function muatListGrupBroadcast() {
    const el = document.getElementById("broadcast-grup-list");
    el.innerHTML = `<div class="loading"><span class="spinner"></span> Memuat grup...</div>`;
    try {
        const data = await _get("/grup/aktif");
        if (!data.length) {
            el.innerHTML = `<div class="empty-state"><div class="icon">👥</div>
                <p>Belum ada grup. Fetch grup dulu di tab Grup.</p></div>`;
            return;
        }

        el.innerHTML = `
            <div class="broadcast-grup-header">
                <label style="font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px">
                    <input type="checkbox" id="centang-semua" onchange="centangSemuaGrup(this)">
                    Pilih Semua
                </label>
                <span id="jumlah-dipilih" style="font-size:12px;color:#2563eb;font-weight:600">
                    0 / ${data.length} dipilih
                </span>
            </div>
            <div class="broadcast-grup-scroll">
                ${data.map(g => `
                    <label class="broadcast-grup-item">
                        <input type="checkbox" class="grup-checkbox"
                               value="${g.id}" data-nama="${g.nama}"
                               onchange="updateJumlahDipilih(${data.length})">
                        <div class="grup-item-info">
                            <span class="grup-item-nama">${g.nama}</span>
                            <span class="grup-item-meta">
                                ${g.tipe} · ${g.jumlah_member || '?'} member
                            </span>
                        </div>
                    </label>`).join("")}
            </div>`;

    } catch {
        el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat grup.</p></div>`;
    }
}

function centangSemuaGrup(cb) {
    document.querySelectorAll(".grup-checkbox").forEach(c => c.checked = cb.checked);
    const total = document.querySelectorAll(".grup-checkbox").length;
    updateJumlahDipilih(total);
}

function updateJumlahDipilih(total) {
    const dipilih = document.querySelectorAll(".grup-checkbox:checked").length;
    const el      = document.getElementById("jumlah-dipilih");
    if (el) el.textContent = `${dipilih} / ${total || '?'} dipilih`;
}

// ── MULAI BROADCAST ───────────────────────────────────────
async function mulaiBroadcast() {
    const pesan = document.getElementById("broadcast-pesan").value.trim();
    const jeda  = parseInt(document.getElementById("broadcast-jeda").value) || 30;

    // Kumpulkan grup yang dicentang
    const grup_list = [];
    document.querySelectorAll(".grup-checkbox:checked").forEach(cb => {
        grup_list.push({ id: parseInt(cb.value), nama: cb.dataset.nama });
    });

    // Validasi
    if (!pesan) {
        tampilPesan("broadcast-status-msg", "⚠️ Isi pesan wajib diisi.", "gagal");
        return;
    }
    if (!grup_list.length) {
        tampilPesan("broadcast-status-msg", "⚠️ Pilih minimal 1 grup.", "gagal");
        return;
    }

    tampilPesan("broadcast-status-msg",
        `⏳ Memulai broadcast ke ${grup_list.length} grup...`, "info");

    try {
        const data = await _post("/broadcast/mulai", { pesan, jeda, grup_list });

        if (data.error) {
            tampilPesan("broadcast-status-msg", `❌ ${data.error}`, "gagal");
            return;
        }

        _sesiAktif = data.session_id;

        // Tampilkan panel progress
        document.getElementById("broadcast-form-panel").style.display     = "none";
        document.getElementById("broadcast-progress-panel").style.display = "block";

        // Polling progress tiap 1 detik
        _intervalCek = setInterval(() => cekProgress(_sesiAktif), 1000);
        cekProgress(_sesiAktif);

    } catch {
        tampilPesan("broadcast-status-msg", "❌ Gagal memulai. Cek backend.", "gagal");
    }
}

// ── PROGRESS ──────────────────────────────────────────────
async function cekProgress(session_id) {
    try {
        const sesi = await _get(`/broadcast/status/${session_id}`);
        tampilProgress(sesi);

        if (sesi.status === "selesai" || sesi.status === "dihentikan") {
            clearInterval(_intervalCek);
            _intervalCek = null;
            muatRiwayatBroadcast();
        }
    } catch {}
}

function tampilProgress(sesi) {
    const persen = sesi.total > 0
        ? Math.round((sesi.selesai / sesi.total) * 100) : 0;

    const warnaStatus = {
        berjalan  : "#2563eb",
        selesai   : "#16a34a",
        dihentikan: "#dc2626",
        menunggu  : "#888"
    }[sesi.status] || "#888";

    // Header progress
    document.getElementById("broadcast-progress-info").innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
                <span style="font-size:20px;font-weight:700">${sesi.selesai}</span>
                <span style="font-size:14px;color:#888"> / ${sesi.total} grup selesai</span>
            </div>
            <span style="background:${warnaStatus};color:#fff;padding:4px 12px;
                border-radius:20px;font-size:12px;font-weight:600">
                ${sesi.status}
            </span>
        </div>
        <div class="limit-bar-track" style="margin-bottom:8px;height:12px">
            <div class="limit-bar-fill ok"
                 style="width:${persen}%;transition:width 0.5s;height:12px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#888">
            <span>${persen}% selesai</span>
            ${sesi.countdown > 0
                ? `<span>⏳ Jeda ${sesi.countdown} detik...</span>` : ''}
        </div>`;

    // Log per grup
    const logEl = document.getElementById("broadcast-log");
    if (sesi.hasil && sesi.hasil.length) {
        logEl.innerHTML = sesi.hasil.map(h => {
            const icon = {
                berhasil  : "✅",
                gagal     : "❌",
                mengirim  : "⏳",
                dihentikan: "⏹️",
                skip      : "⏭️"
            }[h.status] || "○";

            const bg = {
                berhasil: "#f0fdf4",
                gagal   : "#fff5f5",
                mengirim: "#eff6ff"
            }[h.status] || "#f8fafc";

            return `
                <div style="display:flex;justify-content:space-between;align-items:center;
                     padding:8px 12px;border-radius:8px;margin-bottom:6px;background:${bg}">
                    <div>
                        <span style="font-size:13px">${icon} <strong>${h.nama_grup}</strong></span>
                        ${h.phone ? `<span style="font-size:11px;color:#888;margin-left:8px">
                            via ${h.phone}</span>` : ''}
                    </div>
                    <span style="font-size:11px;color:#aaa">${h.waktu || ''}</span>
                </div>`;
        }).join("");
    } else {
        logEl.innerHTML = `<p style="font-size:13px;color:#aaa">Menunggu pengiriman...</p>`;
    }
}

// ── STOP & KEMBALI ────────────────────────────────────────
async function stopBroadcast() {
    if (!_sesiAktif) return;
    if (!confirm("Yakin ingin menghentikan broadcast?")) return;
    await _post(`/broadcast/stop/${_sesiAktif}`, {});
}

function kembaliKeForm() {
    document.getElementById("broadcast-form-panel").style.display     = "block";
    document.getElementById("broadcast-progress-panel").style.display = "none";
    if (_intervalCek) { clearInterval(_intervalCek); _intervalCek = null; }
    _sesiAktif = null;

    // Reset form
    document.querySelectorAll(".grup-checkbox").forEach(c => c.checked = false);
    const cs = document.getElementById("centang-semua");
    if (cs) cs.checked = false;
    const jd = document.getElementById("jumlah-dipilih");
    if (jd) jd.textContent = "0 dipilih";
    document.getElementById("broadcast-pesan").value = "";
    muatInfoAkunBroadcast();
}

// ── RIWAYAT ───────────────────────────────────────────────
async function muatRiwayatBroadcast() {
    try {
        const data = await _get("/broadcast/semua");
        const el   = document.getElementById("broadcast-riwayat");

        if (!data.length) {
            el.innerHTML = `<p style="font-size:13px;color:#aaa">Belum ada riwayat broadcast.</p>`;
            return;
        }

        el.innerHTML = data.map(s => {
            const warna = {
                selesai   : "#f0fdf4",
                dihentikan: "#fff5f5",
                berjalan  : "#eff6ff"
            }[s.status] || "#f8fafc";

            const icon = {
                selesai   : "✅",
                dihentikan: "⏹️",
                berjalan  : "⏳"
            }[s.status] || "○";

            return `
                <div style="background:${warna};border-radius:8px;padding:12px 14px;
                     margin-bottom:8px;display:flex;justify-content:space-between;
                     align-items:center">
                    <div>
                        <div style="font-size:13px;font-weight:600">
                            ${icon} ${s.selesai}/${s.total} grup terkirim
                        </div>
                        <div style="font-size:11px;color:#888;margin-top:3px">
                            ${s.mulai}
                            · ${s.daftar_phone ? s.daftar_phone.length : 1} akun dipakai
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <span style="font-size:12px;font-weight:600;color:#555">
                            ${s.status}
                        </span>
                        <button class="btn-danger btn-sm"
                                onclick="hapusSesiBroadcast('${s.session_id}')">🗑️</button>
                    </div>
                </div>`;
        }).join("");

    } catch {}
}

async function hapusSesiBroadcast(session_id) {
    await _del(`/broadcast/hapus/${session_id}`);
    muatRiwayatBroadcast();
}

async function muatTabBroadcast() {
    await muatInfoAkunBroadcast();
    await muatListGrupBroadcast();
    muatRiwayatBroadcast();
    await syncPesanAktif();
}
