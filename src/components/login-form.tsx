"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, MessageCircleMore } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal masuk");
      window.location.href = "/inbox";
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal masuk"); setBusy(false); }
  }

  return <main className="login-page">
    <div className="login-orb orb-one" /><div className="login-orb orb-two" />
    <div className="login-card">
      <div className="login-mark"><MessageCircleMore size={27} strokeWidth={2.2} /></div>
      <div className="eyebrow">GUAKODINGIN WORKSPACE</div>
      <h1>Satu inbox.<br /><span>Semua percakapan.</span></h1>
      <p className="login-intro">Masuk untuk menangani chat WhatsApp dan Instagram bersama tim.</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required placeholder="nama@guakodingin.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Kata sandi</label>
        <div className="password-field"><input id="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={show ? "Sembunyikan kata sandi" : "Lihat kata sandi"} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="login-submit" disabled={busy}>{busy ? "Memproses..." : "Masuk ke inbox"}<ArrowRight size={18} /></button>
      </form>
      <div className="login-footer"><LockKeyhole size={14} /> Akses khusus anggota tim <span>·</span> <a href="/demo">Lihat demo</a></div>
    </div>
  </main>;
}
