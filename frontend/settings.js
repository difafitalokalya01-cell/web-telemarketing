async function muatTabSettings() {
    setLoading("settings-konten", "Memuat pengaturan...");
    try {
        const data = await _get("/settings");
        tampilSettings(data);
    } catch {
        document.getElementById("settings-konten").innerHTML =
            `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat settings.</p></div>`;
    }
}

function tampilSettings(data) {
    const groups = {};
    const prefixMap = [
        ["w1_", "⚙️ Warming Level 1 🌱 Baru (0-7 hari)"],
        ["w2_", "⚙️ Warming Level 2 📈 Berkembang (8-30 hari)"],
        ["w3_", "⚙️ Warming Level 3 ✅ Dewasa (31-90 hari)"],
        ["w4_", "⚙️ Warming Level 4 ⭐ Terpercaya (90+ hari)"],
        ["score_akun_bobot", "🧮 Score Akun — Formula"],
        ["score_akun_", "🏷️ Score Akun — Threshold Label"],
        ["score_grup_bobot", "🧮 Score Grup — Formula"],
        ["score_grup_", "🏷️ Score Grup — Threshold Label"],
        ["broadcast_", "📡 Broadcast"],
    ];

    for (const item of data) {
        let grp = "Lainnya";
        for (const [prefix, nama] of prefixMap) {
            if (item.key.startsWith(prefix)) { grp = nama; break; }
        }
        if (!groups[grp]) groups[grp] = [];
        groups[grp].push(item);
    }

    let html = `<form id="form-settings">`;
    for (const [nama, items] of Object.entries(groups)) {
        if (!items.length) continue;
        html += `<div class="section-card"><h3>${nama}</h3><div class="settings-grid">`;
        html += items.map(item => `
            <div class="settings-item">
                <label>${item.label || item.key}</label>
                <input type="number" name="${item.key}" value="${item.value}"
                       class="settings-input" min="0">
            </div>`).join("");
        html += `</div></div>`;
    }
    html += `
        <div style="margin-bottom:24px">
            <button type="button" class="btn-success"
                    onclick="simpanSettings()"
                    style="padding:12px 28px;font-size:15px">
                💾 Simpan Semua Pengaturan
            </button>
        </div>
        <div id="pesan-settings" class="pesan-status"></div>
    </form>`;

    document.getElementById("settings-konten").innerHTML = html;
}

async function simpanSettings() {
    const data = {};
    document.querySelectorAll(".settings-input").forEach(i => { data[i.name] = i.value; });
    tampilPesan("pesan-settings", "⏳ Menyimpan...", "info");
    try {
        const hasil = await _post("/settings", data);
        tampilPesan("pesan-settings",
            hasil.ok ? "✅ Pengaturan berhasil disimpan!" : "❌ Gagal simpan.",
            hasil.ok ? "berhasil" : "gagal");
    } catch {
        tampilPesan("pesan-settings", "❌ Gagal konek ke backend.", "gagal");
    }
}
