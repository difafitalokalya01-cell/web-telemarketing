const API = "http://127.0.0.1:5000/api";

function tampilTab(nama) {
    document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
    document.querySelectorAll(".sidebar nav a").forEach(a => a.classList.remove("aktif-menu"));
    document.getElementById(`tab-${nama}`).style.display = "block";
    const m = document.getElementById(`menu-${nama}`);
    if (m) m.classList.add("aktif-menu");
    const fn = {
        akun:"muatAkun", analisis:"muatAnalisis", discovery:"muatTabDiscovery",
        draft:"muatTabDraft", antrian:"muatAntrian", kirim:"muatTabKirim",
        broadcast:"muatTabBroadcast", sync:"muatTabSync",
        riwayat:"muatRiwayat", settings:"muatTabSettings"
    };
    if (fn[nama]) window[fn[nama]]();
}

function tampilPesan(id, teks, tipe="info") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = teks;
    el.className = `pesan-status ${tipe}`;
}
function setLoading(id, teks="Memuat...") {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="loading"><span class="spinner"></span> ${teks}</div>`;
}

async function _get(path) { const r = await fetch(`${API}${path}`); return r.json(); }
async function _post(path, body) {
    const r = await fetch(`${API}${path}`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
    }); return r.json();
}
async function _del(path) { await fetch(`${API}${path}`, {method:"DELETE"}); }

function buatLimitBar(sudah, batas) {
    const persen = Math.min(100, Math.round((sudah/batas)*100));
    const sisa   = batas - sudah;
    const kelas  = persen < 60 ? "ok" : persen < 90 ? "warn" : "full";
    return `<div class="limit-bar-wrapper">
        <div class="limit-bar-label">
            <span>${sudah}/${batas} pesan hari ini</span>
            <span class="sisa-${kelas}">sisa ${sisa}</span>
        </div>
        <div class="limit-bar-track">
            <div class="limit-bar-fill ${kelas}" style="width:${persen}%"></div>
        </div>
    </div>`;
}

async function muatSidebarSummary() {
    try {
        const r = await _get("/riwayat/ringkasan");
        const t = await _get("/akun/tersedia");
        document.getElementById("sidebar-summary").innerHTML = `
            <div class="sf-item"><span>✅ Terkirim</span><span class="sf-val">${r.berhasil}</span></div>
            <div class="sf-item"><span>❌ Gagal</span><span class="sf-val">${r.gagal}</span></div>
            <div class="sf-item"><span>🟢 Akun siap</span><span class="sf-val">${t.length}</span></div>`;
    } catch {}
}

// ── AKUN ──────────────────────────────────────────────────
async function muatAkun() {
    setLoading("list-akun"); muatSidebarSummary();
    try {
        const ring = await _get("/akun/ringkasan");
        const grid = document.getElementById("ringkasan-akun-grid");
        grid.innerHTML = ring.map(a => `
            <div class="akun-card">
                <div class="ac-nama">${a.phone.slice(-8)}</div>
                <div class="ac-phone">${a.phone}</div>
                <div class="ac-status">
                    <span class="badge badge-${a.status_akun}">${a.status_akun}</span>
                    <span style="font-size:11px;color:#888">${a.label_level||''}</span>
                </div>
                ${buatLimitBar(a.sudah_kirim, a.batas)}
            </div>`).join("");
    } catch {}
    try {
        const data = await _get("/akun");
        const el   = document.getElementById("list-akun");
        if (!data.length) { el.innerHTML=`<div class="empty-state"><div class="icon">👤</div><p>Belum ada akun.</p></div>`; return; }
        el.innerHTML = data.map(a => `
            <div class="kartu ${a.online?'aktif':'nonaktif'}">
                <div>
                    <strong>${a.nama||'Tanpa Nama'}</strong>
                    <small>@${a.username||'-'} · ${a.phone}</small>
                    <small>${a.label_level||''} · Score: ${a.score||0} <span style="color:#666">${a.label_score||''}</span></small>
                </div>
                <div class="kartu-actions">
                    <span class="badge ${a.online?'badge-aktif':'badge-offline'}">${a.online?'🟢 Online':'⚫ Offline'}</span>
                    ${a.status!=='active'
                        ? `<button class="btn-sm btn-outline" onclick="pulihkanAkun('${a.phone}')">♻️</button>`
                        : `<button class="btn-sm btn-danger" onclick="logoutAkun('${a.phone}')">Logout</button>`}
                    <button class="btn-sm btn-outline" onclick="hitungScoreAkun('${a.phone}')">🧮</button>
                </div>
            </div>`).join("");
    } catch { document.getElementById("list-akun").innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>Backend belum jalan.</p></div>`; }
}

async function loginAkun() {
    const phone = document.getElementById("input-phone").value.trim();
    if (!phone) { tampilPesan("pesan-akun","⚠️ Nomor HP kosong.","gagal"); return; }
    tampilPesan("pesan-akun","⏳ Mengirim OTP...","info");
    try {
        const data = await _post("/akun/login", { phone });
        if (data.status==="aktif") { tampilPesan("pesan-akun",`✅ Login: ${data.nama}`,"berhasil"); muatAkun(); }
        else if (data.status==="perlu_otp") {
            document.getElementById("form-login").style.display="none";
            document.getElementById("form-otp").style.display="block";
            document.getElementById("otp-phone").value=phone;
            document.getElementById("input-otp").value="";
            document.getElementById("input-otp").focus();
            tampilPesan("pesan-otp","📱 Cek Telegram kamu untuk kode OTP.","info");
        } else { tampilPesan("pesan-akun",`❌ ${data.pesan}`,"gagal"); }
    } catch { tampilPesan("pesan-akun","❌ Backend belum jalan.","gagal"); }
}

async function submitOtp() {
    const phone=document.getElementById("otp-phone").value;
    const kode=document.getElementById("input-otp").value.trim();
    const password=document.getElementById("input-2fa").value.trim();
    if (!kode) { tampilPesan("pesan-otp","⚠️ Masukkan kode OTP.","gagal"); return; }
    tampilPesan("pesan-otp","⏳ Memverifikasi...","info");
    try {
        const data=await _post("/akun/otp",{phone,kode,password:password||null});
        if (data.status==="aktif") { tampilPesan("pesan-otp",`✅ Login: ${data.nama}!`,"berhasil"); setTimeout(()=>{batalOtp();muatAkun();},1500); }
        else if (data.status==="perlu_2fa") { document.getElementById("form-2fa").style.display="block"; tampilPesan("pesan-otp","🔐 Masukkan password 2FA.","info"); }
        else { tampilPesan("pesan-otp",`❌ ${data.pesan}`,"gagal"); }
    } catch { tampilPesan("pesan-otp","❌ Gagal verifikasi.","gagal"); }
}

function batalOtp() {
    document.getElementById("form-otp").style.display="none";
    document.getElementById("form-login").style.display="block";
    document.getElementById("form-2fa").style.display="none";
    ["input-phone","input-otp","input-2fa"].forEach(id=>document.getElementById(id).value="");
}
async function logoutAkun(p) { await _post("/akun/logout",{phone:p}); muatAkun(); }
async function pulihkanAkun(p) { await _post("/akun/pulihkan",{phone:p}); muatAkun(); }
async function hitungScoreAkun(p) { await _post(`/akun/${p}/score`,{}); muatAkun(); }

// ── ANTRIAN ───────────────────────────────────────────────
async function muatAntrian() {
    await _isiSelectAkunTersedia("antrian-akun");
    await _isiSelectGrup("antrian-grup");
    await syncPesanAktif();
    setLoading("list-antrian");
    try {
        const data=await _get("/antrian");
        const el=document.getElementById("list-antrian");
        if (!data.length) { el.innerHTML=`<div class="empty-state"><div class="icon">📋</div><p>Antrian kosong.</p></div>`; return; }
        el.innerHTML=data.map(a=>`
            <div class="antrian-card ${a.status}">
                <div class="antrian-header"><strong>Grup ID: ${a.grup_id}</strong><span class="badge badge-${a.status}">${a.status}</span></div>
                <div class="antrian-info">Akun: ${a.phone} · ${a.dibuat}</div>
                <div class="antrian-pesan-preview">${a.pesan}</div>
                <div class="antrian-footer">
                    ${a.status==='menunggu'?`<button class="btn-success btn-sm" onclick="kirimDariAntrian(${a.id},this)">📤 Kirim</button>`:''}
                    <button class="btn-danger btn-sm" onclick="hapusAntrian(${a.id})">🗑️</button>
                </div>
            </div>`).join("");
    } catch {}
}
async function tambahAntrian() {
    const phone=document.getElementById("antrian-akun").value;
    const grup_id=document.getElementById("antrian-grup").value;
    const pesan=document.getElementById("antrian-pesan").value.trim();
    if (!phone||!grup_id||!pesan) { tampilPesan("pesan-antrian","⚠️ Semua field wajib.","gagal"); return; }
    await _post("/antrian",{phone,grup_id:parseInt(grup_id),pesan});
    tampilPesan("pesan-antrian","✅ Ditambahkan!","berhasil");
    document.getElementById("antrian-pesan").value="";
    muatAntrian();
}
async function kirimDariAntrian(id,btn) {
    btn.textContent="⏳..."; btn.disabled=true;
    try {
        const d=await _post(`/antrian/${id}/kirim`,{});
        btn.textContent=d.status==="berhasil"?"✅ Terkirim":"❌ Gagal";
        if (d.status!=="berhasil") { btn.disabled=false; alert(d.pesan); }
        setTimeout(muatAntrian,1000);
    } catch { btn.textContent="❌ Error"; btn.disabled=false; }
}
async function hapusAntrian(id) { if (!confirm("Hapus?")) return; await _del(`/antrian/${id}`); muatAntrian(); }

// ── KIRIM ─────────────────────────────────────────────────
async function muatTabKirim() {
    await _isiSelectAkunTersedia("pilih-akun-kirim");
    await _isiSelectGrup("pilih-grup-kirim");
    await syncPesanAktif();
    muatIndikatorAkun();
}
async function muatIndikatorAkun() {
    try {
        const t=await _get("/akun/tersedia"),s=await _get("/akun"),online=s.filter(a=>a.online).length;
        document.getElementById("indikator-akun").innerHTML=`
            <div class="indikator-box">
                <div class="ind-item"><div class="ind-dot ok"></div><span><strong>${t.length}</strong> akun siap</span></div>
                <div class="ind-item"><div class="ind-dot warn"></div><span><strong>${online-t.length}</strong> limit/offline</span></div>
            </div>`;
    } catch {}
}
async function cekStatusGrup() {
    const gid=document.getElementById("pilih-grup-kirim").value;
    const el=document.getElementById("status-grup-tujuan");
    if (!gid) { el.textContent=""; return; }
    try {
        const data=await _get("/grup"),g=data.find(x=>String(x.id)===String(gid));
        if (!g) return;
        el.textContent=`${g.label==='Hot'?'🔥':g.label==='Normal'?'✅':'⏭️'} ${g.label} · Score: ${g.score}`;
        el.style.color=g.label==='Hot'?'#ef4444':g.label==='Normal'?'#2563eb':'#94a3b8';
    } catch {}
}
async function kirimPesan() {
    const phone=document.getElementById("pilih-akun-kirim").value;
    const grup_id=document.getElementById("pilih-grup-kirim").value;
    const pesan=document.getElementById("isi-pesan").value.trim();
    if (!phone) { tampilPesan("hasil-kirim","⚠️ Pilih akun.","gagal"); return; }
    if (!grup_id) { tampilPesan("hasil-kirim","⚠️ Pilih grup.","gagal"); return; }
    if (!pesan) { tampilPesan("hasil-kirim","⚠️ Pesan kosong.","gagal"); return; }
    tampilPesan("hasil-kirim","⏳ Mengirim...","info");
    try {
        const d=await _post("/pesan/kirim",{phone,grup_id:parseInt(grup_id),pesan});
        if (d.status==="berhasil") { tampilPesan("hasil-kirim",`✅ Terkirim ke: ${d.grup}`,"berhasil"); document.getElementById("isi-pesan").value=""; muatSidebarSummary(); }
        else { tampilPesan("hasil-kirim",`❌ ${d.pesan}`,"gagal"); }
    } catch { tampilPesan("hasil-kirim","❌ Gagal.","gagal"); }
}

// ── RIWAYAT ───────────────────────────────────────────────
async function muatRiwayat() {
    try {
        const r=await _get("/riwayat/ringkasan");
        document.getElementById("ringkasan-box").innerHTML=`
            <div class="ringkasan-item hijau"><div class="angka">${r.berhasil}</div><div class="label">✅ Berhasil</div></div>
            <div class="ringkasan-item merah"><div class="angka">${r.gagal}</div><div class="label">❌ Gagal</div></div>
            <div class="ringkasan-item kuning"><div class="angka">${r.skip}</div><div class="label">⏭️ Skip</div></div>
            <div class="ringkasan-item biru"><div class="angka">${r.total}</div><div class="label">📋 Total</div></div>`;
    } catch {}
    setLoading("list-riwayat");
    try {
        const data=await _get("/riwayat");
        const el=document.getElementById("list-riwayat");
        if (!data.length) { el.innerHTML=`<div class="empty-state"><div class="icon">📈</div><p>Belum ada riwayat.</p></div>`; return; }
        el.innerHTML=[...data].reverse().map(r=>`
            <div class="log-item ${r.status}">
                <div><strong>${r.status==='berhasil'?'✅':r.status==='skip'?'⏭️':'❌'} ${r.nama_grup||r.grup_id}</strong><small>Akun: ${r.phone}</small></div>
                <span class="log-waktu">${r.waktu}</span>
            </div>`).join("");
    } catch {}
}

// ── HELPERS ───────────────────────────────────────────────
async function _isiSelectAkun(id) {
    try {
        const data=await _get("/akun"),aktif=data.filter(a=>a.online);
        const sel=document.getElementById(id);
        if (!sel) return;
        sel.innerHTML=aktif.length ? aktif.map(a=>`<option value="${a.phone}">${a.nama} (${a.phone})</option>`).join("") : `<option value="">-- Tidak ada akun online --</option>`;
    } catch {}
}
async function _isiSelectAkunTersedia(id) {
    try {
        const t=await _get("/akun/tersedia"),s=await _get("/akun");
        const sel=document.getElementById(id);
        if (!sel) return;
        sel.innerHTML=t.length ? t.map(p=>{const i=s.find(a=>a.phone===p)||{};return `<option value="${p}">${i.nama||p} (${p})</option>`;}).join("") : `<option value="">-- Tidak ada akun tersedia --</option>`;
    } catch {}
}
async function _isiSelectGrup(id) {
    try {
        const data=await _get("/grup/aktif");
        const sel=document.getElementById(id);
        if (!sel) return;
        sel.innerHTML=data.length ? data.map(g=>`<option value="${g.id}">${g.nama}</option>`).join("") : `<option value="">-- Belum ada grup --</option>`;
    } catch {}
}

muatSidebarSummary();
tampilTab("akun");
setInterval(muatSidebarSummary, 60000);
