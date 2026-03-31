async function muatAnalisis() {
    setLoading("tabel-analisis");
    try {
        const data = await _get("/grup/analisis");
        const el   = document.getElementById("tabel-analisis");
        if (!data.length) {
            el.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>Belum ada grup. Fetch dulu di Discovery.</p></div>`;
            return;
        }
        el.innerHTML = `
            <div style="overflow-x:auto">
            <table class="tabel-analisis">
                <thead><tr>
                    <th>Nama Grup</th><th>Member</th><th>Last Chat</th>
                    <th>Score</th><th>Status</th><th>Aksi</th>
                </tr></thead>
                <tbody>
                ${data.map(g => {
                    const labelWarna = {Hot:"#ef4444",Normal:"#2563eb",Skip:"#94a3b8"}[g.label] || "#888";
                    return `<tr>
                        <td><strong>${g.nama}</strong><br><small style="color:#aaa">${g.username ? '@'+g.username : 'Private'}</small></td>
                        <td>${g.jumlah_member ? g.jumlah_member.toLocaleString() : '-'}</td>
                        <td>
                            <span id="lc-${g.id}">${g.last_chat || '-'}</span>
                            <button class="btn-sm btn-outline" style="margin-left:4px;padding:3px 7px"
                                    onclick="fetchLastChat(${g.id})">↻</button>
                        </td>
                        <td>
                            <div style="display:flex;align-items:center;gap:6px">
                                <span id="score-${g.id}" style="font-weight:700;font-size:15px">${g.score}</span>
                                <input type="number" min="0" max="100" value="${g.score}"
                                       style="width:60px;padding:3px 6px;font-size:12px;border:1px solid #ddd;border-radius:6px"
                                       id="score-input-${g.id}">
                                <button class="btn-sm btn-outline" style="padding:3px 7px"
                                        onclick="simpanScoreGrup(${g.id})">💾</button>
                            </div>
                        </td>
                        <td>
                            <select id="label-${g.id}"
                                    style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;
                                           background:${labelWarna}15;color:${labelWarna};font-weight:600;font-size:12px"
                                    onchange="ubahLabelGrup(${g.id}, this.value)">
                                <option value="Hot" ${g.label==='Hot'?'selected':''}>🔥 Hot</option>
                                <option value="Normal" ${g.label==='Normal'?'selected':''}>✅ Normal</option>
                                <option value="Skip" ${g.label==='Skip'?'selected':''}>⏭️ Skip</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn-danger btn-sm"
                                    onclick="skipGrupAnalisis(${g.id})"
                                    style="${g.status==='active'?'':'opacity:0.4'}">
                                ${g.status==='active' ? '⏭️ Skip' : '♻️ Aktifkan'}
                            </button>
                        </td>
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
            </div>`;
    } catch {
        document.getElementById("tabel-analisis").innerHTML =
            `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat data.</p></div>`;
    }
}

async function fetchLastChat(grupId) {
    try {
        const r = await _post(`/grup/${grupId}/last-chat`, {});
        if (r.last_chat) {
            document.getElementById(`lc-${grupId}`).textContent = r.last_chat;
        }
    } catch {}
}

async function simpanScoreGrup(grupId) {
    const score = parseInt(document.getElementById(`score-input-${grupId}`).value);
    const r     = await _post(`/grup/${grupId}/score/manual`, { score });
    document.getElementById(`score-${grupId}`).textContent = score;
    if (r.label) {
        const sel = document.getElementById(`label-${grupId}`);
        if (sel) sel.value = r.label;
    }
}

async function ubahLabelGrup(grupId, label) {
    const scoreMap = { Hot: 75, Normal: 50, Skip: 20 };
    await _post(`/grup/${grupId}/score/manual`, { score: scoreMap[label] || 50 });
}

async function skipGrupAnalisis(grupId) {
    const data = await _get("/grup/analisis");
    const g    = data.find(x => x.id === grupId);
    const aksi = g && g.status === 'active' ? 'skip' : 'active';
    await _post("/grup/status", { grup_id: grupId, status: aksi });
    muatAnalisis();
}

async function updateSemuaScore() {
    await _post("/grup/score/update-semua", {});
    muatAnalisis();
}
