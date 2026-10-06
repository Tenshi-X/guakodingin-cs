"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp,
  Clock3, Instagram, LogOut, MessageCircle, MessageCircleMore, MoreHorizontal,
  PanelRightClose, PanelRightOpen, Search, Send, ShieldCheck, SlidersHorizontal,
  Sparkles, UserRound, Users, X,
} from "lucide-react";
import type { Agent, Conversation, ConversationStatus, InboxMessage } from "@/lib/types";
import { demoAgents, demoConversations, demoMessages } from "@/lib/demo";

type Filter = "all" | "unread" | "mine" | "whatsapp" | "instagram";
type Props = { currentUser: Agent; demo: boolean; loginAvailable?: boolean };
const quickReplies = [
  { label: "Salam", body: "Halo Kak! Terima kasih sudah menghubungi kami. Ada yang bisa kami bantu?" },
  { label: "Portofolio", body: "Tentu, Kak. Kami bisa kirimkan contoh proyek yang relevan dengan kebutuhan Kakak. Boleh cerita bisnisnya bergerak di bidang apa?" },
  { label: "Penawaran", body: "Siap, Kak. Agar penawarannya sesuai kebutuhan, boleh jelaskan fitur utama dan target waktu yang diinginkan?" },
];

function initials(name: string) { return name.replace(/^@/, "").split(/[\s._-]+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?"; }
function timeLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function dateLabel(value: string) { return new Date(value).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function statusLabel(status: ConversationStatus) { return status === "open" ? "Terbuka" : status === "pending" ? "Menunggu" : "Selesai"; }

export default function InboxApp({ currentUser, demo, loginAvailable = true }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(demo ? demoConversations : []);
  const [agents, setAgents] = useState<Agent[]>(demo ? demoAgents : []);
  const [selectedId, setSelectedId] = useState<string | null>(demo ? "demo-1" : null);
  const [messages, setMessages] = useState<InboxMessage[]>(demo ? demoMessages["demo-1"] : []);
  const [filter, setFilter] = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed">("active");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((item) => item.id === selectedId) || null;
  const unreadTotal = conversations.reduce((count, item) => count + item.unreadCount, 0);
  const activeTotal = conversations.filter((item) => item.status !== "closed").length;
  const mineTotal = conversations.filter((item) => item.assignedTo === currentUser.id && item.status !== "closed").length;

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3600); };

  const refreshInbox = useCallback(async () => {
    if (demo) return;
    try {
      const response = await fetch("/api/inbox", { cache: "no-store" });
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) throw new Error("Gagal memuat inbox");
      const data = await response.json() as { conversations: Conversation[]; agents: Agent[] };
      setConversations(data.conversations); setAgents(data.agents); setError("");
      setSelectedId((current) => current || data.conversations[0]?.id || null);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat inbox"); }
    finally { setLoading(false); }
  }, [demo]);

  const refreshThread = useCallback(async (id: string) => {
    if (demo) return;
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { conversation: Conversation; messages: InboxMessage[] };
      setMessages(data.messages);
      setConversations((previous) => previous.map((item) => item.id === id ? data.conversation : item));
    } catch { /* The next poll will retry. */ }
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    void refreshInbox();
    const timer = window.setInterval(() => void refreshInbox(), 5000);
    return () => window.clearInterval(timer);
  }, [demo, refreshInbox]);

  useEffect(() => {
    if (!selectedId || demo) return;
    void refreshThread(selectedId);
    const timer = window.setInterval(() => void refreshThread(selectedId), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, demo, refreshThread]);

  useEffect(() => { setNotesDraft(selected?.notes || ""); setNotesEditing(false); }, [selectedId, selected?.notes]);
  useEffect(() => { messageScrollRef.current?.scrollTo({ top: messageScrollRef.current.scrollHeight }); }, [selectedId, messages]);

  async function selectThread(id: string) {
    setSelectedId(id); setMobileThread(true); setMobileDetailsOpen(false); setQuickOpen(false); setDraft("");
    if (demo) {
      setMessages(demoMessages[id] || []);
      setConversations((previous) => previous.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item));
    } else {
      const item = conversations.find((entry) => entry.id === id);
      if (item?.unreadCount) {
        await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read" }) });
        void refreshInbox();
      }
    }
  }

  async function changeConversation(action: "claim" | "assign" | "status" | "notes", value?: string | null) {
    if (!selected) return;
    setBusy(true);
    try {
      if (demo) {
        const updated = { ...selected };
        if (action === "claim") { updated.assignedTo = currentUser.id; updated.assignedName = currentUser.name; }
        if (action === "assign") { updated.assignedTo = value || null; updated.assignedName = agents.find((agent) => agent.id === value)?.name || null; }
        if (action === "status") updated.status = value as ConversationStatus;
        if (action === "notes") updated.notes = value || "";
        setConversations((previous) => previous.map((item) => item.id === selected.id ? updated : item));
      } else {
        const payload = action === "assign" ? { action, agentId: value } : action === "status" ? { action, status: value } : action === "notes" ? { action, notes: value } : { action };
        const response = await fetch(`/api/conversations/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui percakapan");
        await refreshInbox();
      }
      if (action === "notes") setNotesEditing(false);
      notify(action === "claim" ? "Percakapan berhasil diambil" : action === "notes" ? "Catatan tersimpan" : "Percakapan diperbarui");
    } catch (err) { notify(err instanceof Error ? err.message : "Terjadi kesalahan"); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim() || busy) return;
    const body = draft.trim(); setBusy(true);
    try {
      if (demo) {
        const message: InboxMessage = { id: `demo-${Date.now()}`, conversationId: selected.id, direction: "outbound", kind: "text", body, status: "sent", sentByName: currentUser.name, createdAt: new Date().toISOString() };
        setMessages((previous) => [...previous, message]);
        demoMessages[selected.id] = [...(demoMessages[selected.id] || []), message];
        setConversations((previous) => previous.map((item) => item.id === selected.id ? { ...item, assignedTo: currentUser.id, assignedName: currentUser.name, status: "open", lastMessageAt: message.createdAt, lastMessagePreview: body } : item));
      } else {
        const response = await fetch(`/api/conversations/${selected.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal mengirim pesan");
        await Promise.all([refreshThread(selected.id), refreshInbox()]);
      }
      setDraft(""); setQuickOpen(false);
      notify(demo ? "Pesan terkirim dalam mode demo" : "Pesan terkirim");
    } catch (err) { notify(err instanceof Error ? err.message : "Gagal mengirim pesan"); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (demo) { window.location.href = "/"; return; }
    await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login";
  }

  const filtered = useMemo(() => conversations.filter((item) => {
    if (statusFilter === "active" && item.status === "closed") return false;
    if (statusFilter === "closed" && item.status !== "closed") return false;
    if (filter === "unread" && item.unreadCount === 0) return false;
    if (filter === "mine" && item.assignedTo !== currentUser.id) return false;
    if ((filter === "whatsapp" || filter === "instagram") && item.platform !== filter) return false;
    const haystack = `${item.contactName} ${item.phone || ""} ${item.username || ""} ${item.lastMessagePreview}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [conversations, filter, statusFilter, search, currentUser.id]);

  const ownedByOther = !!selected?.assignedTo && selected.assignedTo !== currentUser.id;
  const waExpired = selected?.platform === "whatsapp" && (!selected.lastInboundAt || Date.now() - new Date(selected.lastInboundAt).getTime() >= 24 * 60 * 60 * 1000);

  return <div className={`app-shell ${mobileThread ? "mobile-thread" : ""}`}>
    <aside className="rail">
      <div className="rail-brand"><MessageCircleMore size={23} strokeWidth={2.2} /></div>
      <div className="rail-nav"><button className="rail-button active" aria-label="Inbox" title="Inbox"><MessageCircle size={21} /></button><button className="rail-button" aria-label="Tim" title="Tim"><Users size={21} /></button></div>
      <div className="rail-bottom"><button className="rail-button" aria-label="Bantuan" title="Bantuan" onClick={() => notify("Lihat README untuk panduan konfigurasi.")}><CircleHelp size={20} /></button><button className="rail-avatar" title={currentUser.name}>{initials(currentUser.name)}</button></div>
    </aside>

    <aside className="navigation">
      <div className="nav-brand"><div className="brand-logo"><MessageCircleMore size={20} /></div><div><strong>Guakodingin</strong><span>TEAM INBOX</span></div></div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={14} /></div>
      <div className="workspace-card"><div className="workspace-icon">G</div><div><strong>Tim Guakodingin</strong><span>4 anggota aktif</span></div><MoreHorizontal size={17} /></div>
      <div className="nav-section-title">INBOX</div>
      <nav className="nav-filters" aria-label="Filter inbox">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}><MessageCircle size={18} />Semua percakapan <span>{activeTotal}</span></button>
        <button className={filter === "unread" ? "selected" : ""} onClick={() => setFilter("unread")}><span className="unread-icon" />Belum dibaca <span>{unreadTotal}</span></button>
        <button className={filter === "mine" ? "selected" : ""} onClick={() => setFilter("mine")}><UserRound size={18} />Ditugaskan ke saya <span>{mineTotal}</span></button>
      </nav>
      <div className="nav-section-title channel-title">CHANNEL</div>
      <nav className="nav-filters" aria-label="Filter channel">
        <button className={filter === "whatsapp" ? "selected" : ""} onClick={() => setFilter("whatsapp")}><span className="channel-dot wa" />WhatsApp <span>{conversations.filter((item) => item.platform === "whatsapp" && item.status !== "closed").length}</span></button>
        <button className={filter === "instagram" ? "selected" : ""} onClick={() => setFilter("instagram")}><span className="channel-dot ig" />Instagram <span>{conversations.filter((item) => item.platform === "instagram" && item.status !== "closed").length}</span></button>
      </nav>
      <div className="nav-spacer" />
      {demo && <div className="demo-side"><Sparkles size={16} /><div><strong>Mode demo</strong><p>Coba alur inbox tanpa mengirim pesan asli.</p></div></div>}
      <div className="nav-user"><div className="user-avatar">{initials(currentUser.name)}</div><div><strong>{currentUser.name}</strong><span>{currentUser.role === "owner" ? "Pemilik workspace" : "Anggota tim"}</span></div><button aria-label="Keluar" title="Keluar" onClick={logout}><LogOut size={18} /></button></div>
    </aside>

    <section className="list-panel">
      <div className="list-header"><div><p className="section-kicker">PUSAT PERCAKAPAN</p><h1>Inbox <span>{activeTotal}</span></h1></div><button className="icon-button list-options" aria-label="Pengaturan filter" aria-expanded={filterMenuOpen} onClick={() => setFilterMenuOpen(!filterMenuOpen)}><SlidersHorizontal size={19} /></button>
        {filterMenuOpen && <div className="filter-menu">{([ ["all", "Semua percakapan"], ["unread", "Belum dibaca"], ["mine", "Ditugaskan ke saya"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"] ] as const).map(([key, label]) => <button key={key} onClick={() => { setFilter(key); setFilterMenuOpen(false); }}>{label}{filter === key && <Check size={14} />}</button>)}<button className="mobile-logout" onClick={logout}>Keluar <LogOut size={14} /></button></div>}
      </div>
      <div className="search-box"><Search size={18} /><input aria-label="Cari percakapan" placeholder="Cari nama atau pesan..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button aria-label="Hapus pencarian" onClick={() => setSearch("")}><X size={15} /></button>}</div>
      <div className="list-tabs"><button className={statusFilter === "active" ? "on" : ""} onClick={() => setStatusFilter("active")}>Aktif</button><button className={statusFilter === "closed" ? "on" : ""} onClick={() => setStatusFilter("closed")}>Selesai</button></div>
      <div className="conversation-list">
        {loading && <div className="empty-list">Memuat percakapan...</div>}
        {!loading && error && <div className="empty-list error-list">{error}<button onClick={() => void refreshInbox()}>Coba lagi</button></div>}
        {!loading && !error && filtered.length === 0 && <div className="empty-list"><MessageCircleMore size={30} /><strong>Belum ada percakapan</strong><span>{search ? "Coba kata kunci lain." : "Pesan baru akan muncul di sini."}</span></div>}
        {filtered.map((item) => <button key={item.id} className={`conversation-row ${selectedId === item.id ? "active" : ""}`} onClick={() => void selectThread(item.id)}>
          <div className={`contact-avatar avatar-${item.platform}`}>{initials(item.contactName)}<span className={`avatar-channel ${item.platform}`}>{item.platform === "whatsapp" ? <MessageCircle size={10} fill="currentColor" /> : <Instagram size={10} />}</span></div>
          <div className="conversation-main"><div className="conversation-top"><strong>{item.contactName}</strong><time>{timeLabel(item.lastMessageAt)}</time></div><p>{item.lastMessagePreview}</p><div className="conversation-tags"><span className={`tiny-channel ${item.platform}`}>{item.platform === "whatsapp" ? "WhatsApp" : "Instagram"}</span>{item.assignedName && <span className="assigned-tag">· {item.assignedName}</span>}{item.status === "pending" && <span className="pending-tag">Menunggu</span>}</div></div>
          {item.unreadCount > 0 && <span className="unread-badge">{item.unreadCount}</span>}
        </button>)}
      </div>
      <div className="list-footer"><span className="online-pulse" /> Sinkronisasi setiap 5 detik</div>
    </section>

    <main className="chat-panel">
      {!selected ? <div className="empty-chat"><div className="empty-chat-icon"><MessageCircleMore size={32} /></div><h2>Pilih percakapan</h2><p>Semua pesan WhatsApp dan Instagram akan tampil dalam satu tempat.</p></div> : <>
        <header className="chat-header"><button className="icon-button mobile-back" aria-label="Kembali ke daftar" onClick={() => { setMobileThread(false); setMobileDetailsOpen(false); }}><ArrowLeft size={20} /></button><div className={`contact-avatar header-avatar avatar-${selected.platform}`}>{initials(selected.contactName)}</div><div className="chat-heading"><strong>{selected.contactName}</strong><span><span className={`mini-platform ${selected.platform}`}>{selected.platform === "whatsapp" ? <MessageCircle size={13} /> : <Instagram size={13} />}{selected.platform === "whatsapp" ? "WhatsApp" : "Instagram"}</span><span className="header-separator">·</span>{statusLabel(selected.status)}</span></div><div className="header-actions"><button className="icon-button" aria-label="Detail percakapan" onClick={() => { if (window.innerWidth <= 1030) setMobileDetailsOpen(!mobileDetailsOpen); else setShowDetails(!showDetails); }}>{showDetails ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}</button></div></header>
        <div className="chat-banner"><ShieldCheck size={16} /><span>Balas sebagai akun bisnis. Anggota tim lain dapat melihat percakapan ini.</span></div>
        <div className="message-scroll" key={selected.id} ref={messageScrollRef}><div className="date-divider"><span>{messages.length ? dateLabel(messages[0].createdAt) : "Hari ini"}</span></div>
          {messages.map((message) => <div key={message.id} className={`message-line ${message.direction}`}><div className={`message-bubble ${message.direction}`}><p>{message.body}</p><div className="message-meta">{message.direction === "outbound" && message.sentByName && <span>{message.sentByName} · </span>}{timeLabel(message.createdAt)}{message.direction === "outbound" && (message.status === "read" ? <CheckCheck size={13} /> : <Check size={13} />)}{message.status === "failed" && <span className="failed-message">Gagal</span>}</div></div></div>)}
        </div>
        <div className="composer-area">
          {ownedByOther && <div className="composer-notice"><UserRound size={15} /> Sedang ditangani {selected.assignedName}. Minta pengalihan untuk membalas.</div>}
          {waExpired && <div className="composer-notice"><Clock3 size={15} /> Jendela balasan WhatsApp 24 jam berakhir. Balasan bebas tidak tersedia.</div>}
          {!selected.assignedTo && <div className="unassigned-notice"><span>Belum ada yang menangani percakapan ini.</span><button onClick={() => void changeConversation("claim")} disabled={busy}>Ambil percakapan <ArrowRight size={14} /></button></div>}
          <form onSubmit={sendMessage} className="composer"><div className="composer-toolbar"><button type="button" className={quickOpen ? "toolbar-active" : ""} onClick={() => setQuickOpen(!quickOpen)}><Sparkles size={16} /> Balasan cepat</button><span>{draft.length}/1000</span></div>
            {quickOpen && <div className="quick-menu">{quickReplies.map((reply) => <button type="button" key={reply.label} onClick={() => { setDraft(reply.body); setQuickOpen(false); }}><strong>{reply.label}</strong><span>{reply.body}</span></button>)}</div>}
            <textarea aria-label="Tulis balasan" placeholder="Tulis balasan untuk pelanggan..." maxLength={1000} rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} disabled={ownedByOther || waExpired || busy} />
            <div className="composer-bottom"><span>Enter untuk kirim · Shift + Enter untuk baris baru</span><button type="submit" disabled={!draft.trim() || ownedByOther || waExpired || busy}><Send size={16} />{busy ? "Mengirim..." : "Kirim balasan"}</button></div>
          </form>
        </div>
      </>}
    </main>

    {selected && (showDetails || mobileDetailsOpen) && <aside className={`details-panel ${mobileDetailsOpen ? "mobile-open" : ""}`}><div className="details-head"><strong>Detail percakapan</strong><button className="icon-button" aria-label="Tutup detail" onClick={() => { setShowDetails(false); setMobileDetailsOpen(false); }}><X size={18} /></button></div><div className="details-scroll"><div className={`profile-avatar avatar-${selected.platform}`}>{initials(selected.contactName)}</div><h2>{selected.contactName}</h2><p className="profile-contact">{selected.phone ? `+${selected.phone}` : selected.username ? `@${selected.username}` : "Pelanggan Instagram"}</p><span className={`profile-channel ${selected.platform}`}>{selected.platform === "whatsapp" ? <MessageCircle size={13} /> : <Instagram size={13} />}{selected.platform === "whatsapp" ? "WhatsApp" : "Instagram"}</span>
      <div className="detail-divider" /><div className="detail-section"><h3>PENANGGUNG JAWAB</h3><select aria-label="Penanggung jawab" value={selected.assignedTo || ""} disabled={busy || (ownedByOther && currentUser.role !== "owner")} onChange={(event) => void changeConversation("assign", event.target.value || null)}><option value="">Belum ditugaskan</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div>
      <div className="detail-section"><h3>STATUS</h3><div className="status-options">{(["open", "pending", "closed"] as const).map((status) => <button key={status} className={selected.status === status ? "chosen" : ""} disabled={busy || (ownedByOther && currentUser.role !== "owner")} onClick={() => void changeConversation("status", status)}>{status === "open" ? <span className="status-dot green" /> : status === "pending" ? <Clock3 size={14} /> : <Archive size={14} />}{statusLabel(status)}</button>)}</div></div>
      <div className="detail-divider" /><div className="detail-section"><div className="notes-heading"><h3>CATATAN PELANGGAN</h3>{!notesEditing && <button onClick={() => setNotesEditing(true)} disabled={ownedByOther && currentUser.role !== "owner"}>Edit</button>}</div>{notesEditing ? <><textarea aria-label="Catatan pelanggan" value={notesDraft} maxLength={5000} onChange={(event) => setNotesDraft(event.target.value)} rows={6} /><div className="note-actions"><button onClick={() => setNotesEditing(false)}>Batal</button><button onClick={() => void changeConversation("notes", notesDraft)} disabled={busy}>Simpan</button></div></> : <div className="notes-content">{selected.notes || "Belum ada catatan. Tambahkan konteks penting untuk tim."}</div>}</div>
      <div className="detail-divider" /><div className="detail-section detail-meta"><h3>INFORMASI</h3><div><span>Pesan terakhir</span><strong>{timeLabel(selected.lastMessageAt)}</strong></div><div><span>Channel</span><strong>{selected.platform === "whatsapp" ? "WhatsApp" : "Instagram"}</strong></div></div>
    </div></aside>}
    {demo && <div className="demo-banner"><Sparkles size={15} /><span>Mode demo · Perubahan hanya tampil di browser ini</span>{loginAvailable && <a href="/login">Masuk <ArrowRight size={14} /></a>}</div>}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}<button aria-label="Tutup" onClick={() => setToast("")}><X size={14} /></button></div>}
  </div>;
}
