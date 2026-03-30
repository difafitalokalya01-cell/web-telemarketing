const API = "http://localhost:5000/api";

// ── NAVIGASI ──────────────────────────────────────────────
function tampilTab(nama) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  document.querySelectorAll(".sidebar nav a").forEach(a => a.classList.remove("aktif-menu"));
  document.getElementById(`tab-${nama}`).style.display = "block";
  const m = document.getElementById(`menu-${nama}`);
  if (m) m.classList.add("aktif-menu");
  const loader = { akun:"muatAkun", grup:"muatTabGrup", draft:"muatDraft",
                   antrian:"muatAntrian", kirim:"muatTabKirim", riwayat:"muatRiwayat" };
  if (loader[nama]) window[loader[nama]]();
}

function tampilPesan(id, teks, tipe="info") {
  const el = document.getElementById(id);
  el.textContent = teks;
  el.className = `pesan-status ${tipe}`;
}
function setLoading(id, teks="Memuat...") {
  document.getElementById(id).innerHTML =
    `<div class="loading"><span class="spinner"></span> ${teks}</div>`;
}

// ── TAB AKUN ──────────────────────────────────────────────
async function muatAkun() {
  setLoading("list-akun");
  try {
    const data = await _get("/akun");
    const el   = document.getElementById("list-akun");
    if (!data.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">👤</div><p>Belum ada akun.</p></div>`;
      return;
    }
    el.innerHTML = data.map(a => {
      const statusClass = a.status || "active";
      const badgeOnline = a.online
        ? `<span class="badge badge-aktif">🟢 Online</span>`
        : `<span class="badge badge-offline">⚫ Offline</span>`;
      const badgeStatus = `<span class="badge badge-${statusClass}">${statusClass}</span>`;
      return `
        <div class="kartu ${a.online ? 'aktif' : 'nonaktif'}">
          <div>
            <strong>${a.nama || 'Tanpa Nama'}</strong>
            <small>@${a.username||'-'} · ${a.phone}</small>
          </div>
          <div class="kartu-actions">
            ${badgeStatus} ${badgeOnline}
            ${a.status !== 'active'
              ? `<button class="btn-sm btn-outline" onclick="pulihkanAkun('${a.phone}')">♻️ Pulihkan</button>`
              : ''}
          </div>
        </div>`;
    }).join("");
  } catch {
    document.getElementById("list-akun").innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><p>Backend belum jalan.</p></div>`;
  }
}

async function loginAkun() {
  const phone = document.getElementById("input-phone").value.trim();
  if (!phone) { tampilPesan("pesan-akun","⚠️ Nomor HP kosong.","gagal"); return; }
  tampilPesan("pesan-akun","⏳ Login...","info");
  try {
    const data = await _post("/akun/login", { phone });
    if (data.status === "aktif") {
      tampilPesan("pesan-akun",`✅ Login: ${data.nama} (@${data.username})`,"berhasil");
      muatAkun();
    } else if (data.status === "perlu_otp") {
      tampilPesan("pesan-akun","📱 Cek OTP di Telegram kamu.","info");
    } else {
      tampilPesan("pesan-akun",`❌ ${data.pesan}`,"gagal");
    }
  } catch { tampilPesan("pesan-akun","❌ Backend belum jalan.","gagal"); }
}

async function pulihkanAkun(phone) {
  await _post("/akun/pulihkan", { phone });
  muatAkun();
}

// ── TAB GRUP ──────────────────────────────────────────────
async function muatTabGrup() {
  await _isiSelectAkun("pilih-akun-grup");
}

async function fetchGrup() {
  const phone = document.getElementById("pilih-akun-grup").value;
  if (!phone) { tampilPesan("pesan-grup","⚠️ Pilih akun dulu.","gagal"); return; }
  tampilPesan("pesan-grup","⏳ Mengambil grup...","info");
  setLoading("list-grup","Mengambil grup...");
  try {
    const data = await _post("/grup/fetch", { phone });
    tampilPesan("pesan-grup",`✅ ${data.length} grup ditemukan.`,"berhasil");
    const el = document.getElementById("list-grup");
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="icon">👥</div><p>Tidak ada grup.</p></div>`; return; }
    el.innerHTML = data.map(g => {
      const st = g.status || "active";
      return `
        <div class="kartu">
          <div>
            <strong>${g.nama}</strong>
            <small>${g.tipe} · ${g.jumlah_member||'?'} member</small>
          </div>
          <div class="kartu-actions">
            <span class="badge badge-${st}">${st}</span>
            ${st !== 'active'
              ? `<button class="btn-sm btn-outline" onclick="pulihkanGrup(${g.id})">♻️</button>`
              : `<button class="btn-sm btn-danger" onclick="skipGrup(${g.id})">⏭️ Skip</button>`}
          </div>
        </div>`;
    }).join("");
  } catch { tampilPesan("pesan-grup","❌ Gagal fetch.","gagal"); }
}

async function skipGrup(id)    { await _post("/grup/status",{grup_id:id,status:"skip"}); fetchGrup(); }
async function pulihkanGrup(id){ await _post("/grup/pulihkan",{grup_id:id}); fetchGrup(); }

// ── TAB DRAFT ─────────────────────────────────────────────
async function muatDraft() {
  setLoading("list-draft");
  try {
    const data = await _get("/draft");
    const el   = document.getElementById("list-draft");
    if (!data.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>Belum ada draft.</p></div>`;
      return;
    }
    el.innerHTML = data.map(d => `
      <div class="draft-card">
        <div class="draft-judul">📝 ${d.judul}</div>
        <div class="draft-isi">${d.isi}</div>
        <div class="draft-footer">
          <span class="draft-tanggal">${d.dibuat}</span>
          <div style="display:flex;gap:6px">
            <button class="btn-sm btn-outline" onclick="pakaiDraft('${_esc(d.isi)}')">📋 Pakai</button>
            <button class="btn-sm btn-danger"  onclick="hapusDraft(${d.id})">🗑️ Hapus</button>
          </div>
        </div>
      </div>`).join("");
  } catch { document.getElementById("list-draft").innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat.</p></div>`; }
}

async function simpanDraft() {
  const judul = document.getElementById("draft-judul").value.trim();
  const isi   = document.getElementById("draft-isi").value.trim();
  if (!judul || !isi) { tampilPesan("pesan-draft","⚠️ Judul dan isi wajib diisi.","gagal"); return; }
  await _post("/draft", { judul, isi });
  tampilPesan("pesan-draft","✅ Draft tersimpan!","berhasil");
  document.getElementById("draft-judul").value = "";
  document.getElementById("draft-isi").value = "";
  muatDraft();
}

async function hapusDraft(id) {
  if (!confirm("Hapus draft ini?")) return;
  await _del(`/draft/${id}`);
  muatDraft();
}

function pakaiDraft(isi) {
  // Salin isi ke textarea antrian & kirim langsung
  document.getElementById("antrian-pesan").value = decodeURIComponent(isi);
  tampilTab("antrian");
}

// ── TAB ANTRIAN ───────────────────────────────────────────
async function muatAntrian() {
  await _isiSelectAkun("antrian-akun");
  await _isiSelectGrup("antrian-grup");
  setLoading("list-antrian");
  try {
    const data = await _get("/antrian");
    const el   = document.getElementById("list-antrian");
    if (!data.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Antrian kosong.</p></div>`;
      return;
    }
    el.innerHTML = data.map(a => `
      <div class="antrian-card ${a.status}">
        <div class="antrian-header">
          <strong>Grup ID: ${a.grup_id}</strong>
          <span class="badge badge-${a.status}">${a.status}</span>
        </div>
        <div class="antrian-info">Akun: ${a.phone} · Dibuat: ${a.dibuat}</div>
        <div class="antrian-pesan-preview">${a.pesan}</div>
        <div class="antrian-footer">
          ${a.status === 'menunggu'
            ? `<button class="btn-success btn-sm" onclick="kirimDariAntrian(${a.id})">📤 Kirim</button>`
            : ''}
          <button class="btn-danger btn-sm" onclick="hapusAntrian(${a.id})">🗑️ Hapus</button>
        </div>
      </div>`).join("");
  } catch { document.getElementById("list-antrian").innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat.</p></div>`; }
}

async function tambahAntrian() {
  const phone   = document.getElementById("antrian-akun").value;
  const grup_id = document.getElementById("antrian-grup").value;
  const pesan   = document.getElementById("antrian-pesan").value.trim();
  if (!phone||!grup_id||!pesan) { tampilPesan("pesan-antrian","⚠️ Semua field wajib diisi.","gagal"); return; }
  await _post("/antrian", { phone, grup_id:parseInt(grup_id), pesan });
  tampilPesan("pesan-antrian","✅ Ditambahkan ke antrian!","berhasil");
  document.getElementById("antrian-pesan").value = "";
  muatAntrian();
}

async function kirimDariAntrian(id) {
  const btn = event.target;
  btn.textContent = "⏳..."; btn.disabled = true;
  try {
    const data = await _post(`/antrian/${id}/kirim`, {});
    if (data.status === "berhasil") {
      btn.textContent = "✅ Terkirim";
    } else {
      btn.textContent = "❌ Gagal"; btn.disabled = false;
      alert(data.pesan);
    }
    muatAntrian();
  } catch { btn.textContent = "❌ Error"; btn.disabled = false; }
}

async function hapusAntrian(id) {
  if (!confirm("Hapus item antrian ini?")) return;
  await _del(`/antrian/${id}`);
  muatAntrian();
}

// ── TAB KIRIM LANGSUNG ────────────────────────────────────
async function muatTabKirim() {
  await _isiSelectAkun("pilih-akun-kirim");
  await _isiSelectGrup("pilih-grup-kirim");
}

async function kirimPesan() {
  const phone   = document.getElementById("pilih-akun-kirim").value;
  const grup_id = document.getElementById("pilih-grup-kirim").value;
  const pesan   = document.getElementById("isi-pesan").value.trim();
  if (!phone)   { tampilPesan("hasil-kirim","⚠️ Pilih akun.","gagal"); return; }
  if (!grup_id) { tampilPesan("hasil-kirim","⚠️ Pilih grup.","gagal"); return; }
  if (!pesan)   { tampilPesan("hasil-kirim","⚠️ Pesan kosong.","gagal"); return; }
  tampilPesan("hasil-kirim","⏳ Mengirim...","info");
  try {
    const data = await _post("/pesan/kirim", { phone, grup_id:parseInt(grup_id), pesan });
    if (data.status === "berhasil") {
      tampilPesan("hasil-kirim",`✅ Terkirim ke: ${data.grup}`,"berhasil");
      document.getElementById("isi-pesan").value = "";
    } else {
      tampilPesan("hasil-kirim",`❌ ${data.pesan}`,"gagal");
    }
  } catch { tampilPesan("hasil-kirim","❌ Gagal. Cek backend.","gagal"); }
}

// ── TAB RIWAYAT ───────────────────────────────────────────
async function muatRiwayat() {
  // Ringkasan
  try {
    const r  = await _get("/riwayat/ringkasan");
    document.getElementById("ringkasan-box").innerHTML = `
      <div class="ringkasan-item hijau"><div class="angka">${r.berhasil}</div><div class="label">✅ Berhasil</div></div>
      <div class="ringkasan-item merah"><div class="angka">${r.gagal}</div><div class="label">❌ Gagal</div></div>
      <div class="ringkasan-item kuning"><div class="angka">${r.skip}</div><div class="label">⏭️ Skip</div></div>
      <div class="ringkasan-item biru"><div class="angka">${r.total}</div><div class="label">📋 Total</div></div>`;
  } catch {}

  // Detail
  setLoading("list-riwayat");
  try {
    const data = await _get("/riwayat");
    const el   = document.getElementById("list-riwayat");
    if (!data.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>Belum ada riwayat hari ini.</p></div>`;
      return;
    }
    el.innerHTML = [...data].reverse().map(r => `
      <div class="log-item ${r.status}">
        <div>
          <strong>${r.status==='berhasil'?'✅':'❌'} ${r.nama_grup||r.grup_id}</strong>
          <small>Akun: ${r.phone}</small>
        </div>
        <span class="log-waktu">${r.waktu}</span>
      </div>`).join("");
  } catch { document.getElementById("list-riwayat").innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Gagal muat.</p></div>`; }
}

// ── HELPER ────────────────────────────────────────────────
async function _get(path) {
  const r = await fetch(`${API}${path}`); return r.json();
}
async function _post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  }); return r.json();
}
async function _del(path) {
  await fetch(`${API}${path}`, { method:"DELETE" });
}

async function _isiSelectAkun(idEl) {
  try {
    const data = await _get("/akun");
    const sel  = document.getElementById(idEl);
    const aktif = data.filter(a => a.online && a.status === "active");
    sel.innerHTML = aktif.length
      ? aktif.map(a=>`<option value="${a.phone}">${a.nama} (${a.phone})</option>`).join("")
      : `<option value="">-- Tidak ada akun aktif --</option>`;
  } catch {}
}

async function _isiSelectGrup(idEl) {
  try {
    const data = await _get("/grup/aktif");
    const sel  = document.getElementById(idEl);
    sel.innerHTML = data.length
      ? data.map(g=>`<option value="${g.id}">${g.nama}</option>`).join("")
      : `<option value="">-- Belum ada grup --</option>`;
  } catch {}
}

function _esc(str) { return encodeURIComponent(str); }

// Init
tampilTab("akun");
