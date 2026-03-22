import { useState, useEffect, useCallback, useRef } from "react";

const SB_URL = 'https://rqccvcqxcxjmoymfybof.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY2N2Y3F4Y3hqbW95bWZ5Ym9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjA5MTQsImV4cCI6MjA4ODY5NjkxNH0.0sR-YK2ot3VQZQHwJp0H-rTlpXd1n26ad3rKrnm75dI';
const HDR = { 'Content-Type':'application/json', 'apikey':SB_KEY, 'Authorization':`Bearer ${SB_KEY}`, 'Prefer':'return=representation' };

async function fetchReports() {
  const r = await fetch(`${SB_URL}/rest/v1/reports?order=submitted_at.desc`, { headers: HDR });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function updateReport(id, data) {
  const r = await fetch(`${SB_URL}/rest/v1/reports?id=eq.${id}`, { method:'PATCH', headers:HDR, body:JSON.stringify(data) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const ADMIN_PASSWORD = "admin123";

const ISSUE_TYPES = [
  { id:"dirty",   label:"Dirty Restroom",  icon:"🧹", color:"#f97316" },
  { id:"smell",   label:"Bad Smell",        icon:"💨", color:"#a855f7" },
  { id:"nowater", label:"No Water",         icon:"💧", color:"#3b82f6" },
  { id:"nosoap",  label:"No Soap/Tissue",   icon:"🧴", color:"#22c55e" },
  { id:"broken",  label:"Broken Tap/Flush", icon:"🔧", color:"#eab308" },
  { id:"other",   label:"Other Issue",      icon:"⚠️", color:"#6b7280" },
];

const STATUS = {
  pending:  { label:"Pending",     color:"#ef4444", bg:"rgba(239,68,68,0.12)"  },
  cleaning: { label:"In Progress", color:"#f59e0b", bg:"rgba(245,158,11,0.12)" },
  resolved: { label:"Resolved",    color:"#10b981", bg:"rgba(16,185,129,0.12)" },
};

const BUILDINGS = [
  { name:"L Block",      code:"LB" },
  { name:"Main Block",   code:"MB" },
  { name:"Civil Block",  code:"CB" },
  { name:"Boys Hostel",  code:"BH" },
  { name:"Girls Hostel", code:"GH" },
];

// ── Push Notifications ────────────────────────────────────────────────────────
async function registerPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (Notification.permission === "denied") return false;
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
  }
  return true;
}

function sendNotification(report) {
  const iss = ISSUE_TYPES.find(i => i.id === report.issueId);
  if (Notification.permission === "granted") {
    new Notification("🚻 New Report — CampusClean", {
      body: `${iss?.icon || "⚠️"} ${iss?.label || report.issueId} at ${report.roomId}`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: report.id,
      requireInteraction: true,
    });
  }
}


  return {
    id: r.id, roomId: r.room_id, issueId: r.issue_id,
    comment: r.comment || "", status: r.status,
    photo: r.photo_url || null,
    timestamp: new Date(r.submitted_at).getTime(),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).getTime() : null,
  };
}
function timeAgo(ts) {
  const m = Math.floor((Date.now()-ts)/60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString("en-IN",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  :root {
    --bg:#030712; --bg2:#0f1117; --card:#13161e; --card2:#181c26;
    --border:#1e2332; --border2:#252c3f;
    --accent:#6366f1; --accent2:#4f46e5;
    --green:#10b981; --red:#ef4444; --yellow:#f59e0b; --blue:#3b82f6;
    --text:#e2e8f0; --text2:#94a3b8; --text3:#3f4d6a;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{overflow-x:hidden;height:100%;}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}
  button{cursor:pointer;font-family:inherit;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .app{min-height:100vh;display:flex;flex-direction:column;}
  .login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .login-card{background:var(--card);border:1px solid var(--border2);border-radius:20px;padding:40px 36px;width:100%;max-width:360px;text-align:center;animation:fadeUp 0.4s ease;}
  .login-logo{width:56px;height:56px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px;}
  .login-title{font-size:22px;font-weight:800;margin-bottom:4px;}
  .login-sub{font-size:13px;color:var(--text3);margin-bottom:28px;}
  .login-input{width:100%;background:var(--bg2);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-size:15px;outline:none;margin-bottom:8px;transition:border-color 0.15s;}
  .login-input:focus{border-color:var(--accent);}
  .login-input::placeholder{color:var(--text3);}
  .login-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:700;margin-top:4px;transition:all 0.2s;}
  .login-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.4);}
  .login-err{font-size:12px;color:var(--red);margin-bottom:8px;}
  .nav{height:56px;background:rgba(3,7,18,0.95);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:10px;position:sticky;top:0;z-index:100;backdrop-filter:blur(16px);}
  .nav-logo{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .nav-logo-icon{width:30px;height:30px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;}
  .nav-logo span{color:var(--accent);}
  .nav-badge{font-size:11px;font-weight:700;color:var(--red);background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:20px;padding:3px 10px;display:flex;align-items:center;gap:5px;}
  .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;flex-shrink:0;}
  .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
  .nav-timer{font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
  .nav-logout{padding:6px 14px;border-radius:8px;background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:12px;font-weight:600;transition:all 0.15s;}
  .nav-logout:hover{border-color:var(--red);color:var(--red);}
  .rbar{height:2px;background:var(--border);}
  .rbar-fill{height:100%;background:var(--accent);transition:width 1s linear;}
  .tabs{display:flex;overflow-x:auto;scrollbar-width:none;padding:0 20px;border-bottom:1px solid var(--border);background:var(--bg2);}
  .tabs::-webkit-scrollbar{display:none;}
  .tab{padding:12px 18px;font-size:13px;font-weight:600;border:none;background:transparent;color:var(--text3);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all 0.15s;display:flex;align-items:center;gap:6px;}
  .tab:hover{color:var(--text2);}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent);background:rgba(99,102,241,0.04);}
  .tab-badge{background:var(--red);color:#fff;border-radius:20px;font-size:10px;font-weight:700;padding:1px 6px;}
  .page{padding:20px;width:100%;box-sizing:border-box;overflow-x:hidden;}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;}
  .card-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;}
  .kpi-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;}
  .kpi-val{font-size:34px;font-weight:800;line-height:1;font-family:'JetBrains Mono',monospace;}
  .kpi-lbl{font-size:11px;color:var(--text3);margin-top:5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
  .rcard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;transition:border-color 0.15s;animation:fadeUp 0.2s ease;}
  .rcard:hover{border-color:var(--border2);}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;}
  .filter-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
  .chip{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;transition:all 0.15s;white-space:nowrap;}
  .chip:hover{border-color:var(--border2);color:var(--text2);}
  .chip.on{border-color:var(--accent2);background:rgba(99,102,241,0.1);color:var(--accent);}
  .search-input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:13px;outline:none;margin-bottom:12px;transition:border-color 0.15s;}
  .search-input:focus{border-color:var(--accent);}
  .search-input::placeholder{color:var(--text3);}
  .act-btn{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid;background:transparent;cursor:pointer;transition:all 0.15s;}
  .act-yellow{border-color:var(--yellow);color:var(--yellow);}
  .act-yellow:hover{background:rgba(245,158,11,0.1);}
  .act-green{border-color:var(--green);color:var(--green);}
  .act-green:hover{background:rgba(16,185,129,0.1);}
  .bar-chart{display:flex;align-items:flex-end;gap:6px;height:80px;}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;}
  .bar-fill{width:100%;border-radius:4px 4px 0 0;min-height:3px;transition:height 0.6s ease;}
  .bar-day{font-size:9px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
  .bar-num{font-size:9px;color:var(--text2);font-weight:700;}
  .bldg-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
  .bldg-track{height:5px;background:var(--card2);border-radius:3px;overflow:hidden;margin-bottom:6px;}
  .bldg-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--green));transition:width 0.6s ease;}
  .ana-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .ana-track{flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden;}
  .ana-fill{height:100%;border-radius:3px;transition:width 0.8s ease;}
  .export-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;}
  .export-btn:hover{background:var(--accent2);transform:translateY(-1px);}
  .empty{text-align:center;padding:40px 20px;color:var(--text3);font-size:14px;}
  @media(min-width:768px){
    .kpi-grid{grid-template-columns:repeat(4,1fr);}
    .page{padding:24px 32px;max-width:1200px;margin:0 auto;}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  }
  @media(max-width:400px){
    .nav{padding:0 14px;}
    .page{padding:14px;}
    .kpi-val{font-size:26px;}
  }
`;

function Login({ onLogin }) {
  const [pw,  setPw]  = useState("");
  const [err, setErr] = useState(false);
  function handle() {
    if (pw === ADMIN_PASSWORD) { onLogin(); }
    else { setErr(true); setPw(""); }
  }
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo">🏫</div>
        <div className="login-title">CampusClean</div>
        <div className="login-sub">Management Portal</div>
        {err && <div className="login-err">Wrong password. Try again.</div>}
        <input className="login-input" type="password" placeholder="Enter admin password..."
          value={pw} onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && handle()} autoFocus />
        <button className="login-btn" onClick={handle}>Access Dashboard</button>
      </div>
    </div>
  );
}

export default function App() {
  const [authed,    setAuthed]    = useState(false);
  const [tab,       setTab]       = useState("overview");
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [filter,    setFilter]    = useState("all");
  const [bFilter,   setBFilter]   = useState("all");
  const [search,    setSearch]    = useState("");
  const timerRef = useRef(null);

  const prevIds = useRef(new Set());

  const load = useCallback(async (isRefresh = false) => {
    try {
      const data = await fetchReports();
      const mapped = data.map(mapRow);
      if (isRefresh && prevIds.current.size > 0) {
        const newReports = mapped.filter(r => !prevIds.current.has(r.id));
        newReports.forEach(r => sendNotification(r));
      }
      prevIds.current = new Set(mapped.map(r => r.id));
      setReports(mapped);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    registerPush();
    load(false);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { load(true); return 30; } return c - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [authed, load]);

  async function doUpdate(id, status) {
    const upd = { status };
    if (status === "resolved") upd.resolved_at = new Date().toISOString();
    await updateReport(id, upd);
    setReports(prev => prev.map(r =>
      r.id === id ? { ...r, status, resolvedAt: status === "resolved" ? Date.now() : r.resolvedAt } : r
    ));
  }

  function exportCSV() {
    const rows = [["ID","Room","Issue","Status","Reported","Comment"]];
    reports.forEach(r => {
      const iss = ISSUE_TYPES.find(i => i.id === r.issueId);
      rows.push([r.id.slice(0,8), r.roomId, iss?.label||r.issueId, r.status, fmtDate(r.timestamp), r.comment||""]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `CampusClean_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (!authed) {
    return (<><style>{CSS}</style><Login onLogin={() => setAuthed(true)} /></>);
  }

  const pending  = reports.filter(r => r.status === "pending").length;
  const cleaning = reports.filter(r => r.status === "cleaning").length;
  const resolved = reports.filter(r => r.status === "resolved").length;
  const resArr   = reports.filter(r => r.status === "resolved" && r.resolvedAt);
  const avgHr    = resArr.length ? (resArr.reduce((s,r) => s+(r.resolvedAt-r.timestamp),0)/resArr.length/3600000).toFixed(1) : "0.0";
  const resRate  = reports.length ? Math.round((resolved/reports.length)*100) : 0;
  const now      = Date.now();
  const days     = Array.from({length:7},(_,i) => {
    const s = now-(6-i)*86400000;
    return { label:new Date(s).toLocaleDateString("en-US",{weekday:"short"}), count:reports.filter(r=>r.timestamp>=s&&r.timestamp<s+86400000).length };
  });
  const maxDay    = Math.max(...days.map(d=>d.count),1);
  const issCounts = ISSUE_TYPES.map(i => ({...i, count:reports.filter(r=>r.issueId===i.id).length}));
  const totIss    = issCounts.reduce((s,i)=>s+i.count,0)||1;
  const bldgStats = BUILDINGS.map(b => ({
    ...b,
    total:   reports.filter(r=>r.roomId.startsWith(b.code)).length,
    pending: reports.filter(r=>r.status==="pending"&&r.roomId.startsWith(b.code)).length,
  }));
  const maxBldg = Math.max(...bldgStats.map(b=>b.total),1);
  const filtered = reports.filter(r => {
    const sOk = filter==="all"||r.status===filter;
    const bOk = bFilter==="all"||r.roomId.startsWith(bFilter);
    const q   = search.toLowerCase();
    const qOk = q===""||r.roomId.toLowerCase().includes(q)||(ISSUE_TYPES.find(i=>i.id===r.issueId)?.label||"").toLowerCase().includes(q)||(r.comment||"").toLowerCase().includes(q);
    return sOk&&bOk&&qOk;
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-logo-icon">🚻</div>Campus<span>Clean</span></div>
          <div className="nav-badge"><div className="live-dot"/>{pending>0?`${pending} Pending`:"All Clear"}</div>
          <div className="nav-right">
            <div className="nav-timer">↻ {countdown}s</div>
            <button style={{padding:"6px 12px",borderRadius:8,background:"transparent",border:"1px solid var(--border2)",color:"var(--text2)",fontSize:12,fontWeight:600,cursor:"pointer"}}
              onClick={async () => {
                const ok = await registerPush();
                alert(ok ? "✅ Notifications enabled! You'll be notified on new reports." : "❌ Please allow notifications in your browser settings.");
              }}>
              🔔
            </button>
            <button className="nav-logout" onClick={()=>{setAuthed(false);clearInterval(timerRef.current);}}>Logout</button>
          </div>
        </nav>
        <div className="rbar"><div className="rbar-fill" style={{width:`${((30-countdown)/30)*100}%`}}/></div>
        <div className="tabs">
          {[
            {id:"overview",  label:"Overview",  icon:"📊"},
            {id:"reports",   label:"Reports",   icon:"📋", badge:pending},
            {id:"buildings", label:"Buildings", icon:"🏢"},
            {id:"analytics", label:"Analytics", icon:"📈"},
          ].map(t => (
            <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
              {t.icon} {t.label}
              {t.badge>0 && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div className="page">

          {tab==="overview" && (
            <>
              <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-val" style={{color:"var(--red)"}}>{pending}</div><div className="kpi-lbl">Pending</div></div>
                <div className="kpi-card"><div className="kpi-val" style={{color:"var(--yellow)"}}>{cleaning}</div><div className="kpi-lbl">In Progress</div></div>
                <div className="kpi-card"><div className="kpi-val" style={{color:"var(--green)"}}>{resolved}</div><div className="kpi-lbl">Resolved</div></div>
                <div className="kpi-card"><div className="kpi-val" style={{color:"var(--accent)"}}>{reports.length}</div><div className="kpi-lbl">Total</div></div>
              </div>
              <div className="two-col">
                <div className="kpi-card" style={{marginBottom:14}}><div className="kpi-val" style={{color:"var(--blue)",fontSize:28}}>{avgHr}h</div><div className="kpi-lbl">Avg Response</div></div>
                <div className="kpi-card" style={{marginBottom:14}}><div className="kpi-val" style={{color:"var(--green)",fontSize:28}}>{resRate}%</div><div className="kpi-lbl">Resolution Rate</div></div>
              </div>
              <div className="card">
                <div className="card-title">Reports Last 7 Days</div>
                <div className="bar-chart">
                  {days.map(d => (
                    <div className="bar-col" key={d.label}>
                      <div className="bar-num">{d.count||""}</div>
                      <div className="bar-fill" style={{height:`${(d.count/maxDay)*68}px`,background:"linear-gradient(180deg,var(--accent),var(--accent2))"}}/>
                      <div className="bar-day">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Recent Reports</div>
                {reports.slice(0,6).map(r => {
                  const iss = ISSUE_TYPES.find(i=>i.id===r.issueId);
                  const st  = STATUS[r.status];
                  return (
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                      <div style={{fontSize:18,flexShrink:0}}>{iss?.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.roomId}</div>
                        <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{iss?.label} · {timeAgo(r.timestamp)}</div>
                      </div>
                      <span className="status-pill" style={{background:st.bg,color:st.color,flexShrink:0}}>{st.label}</span>
                      {r.photo && <span style={{fontSize:11,color:"var(--accent)",flexShrink:0}}>📷</span>}
                      {r.status!=="resolved" && (
                        <button className="act-btn act-green" style={{padding:"4px 8px",fontSize:11}} onClick={()=>doUpdate(r.id,"resolved")}>✅</button>
                      )}
                    </div>
                  );
                })}
                {reports.length===0 && <div className="empty">No reports yet.</div>}
              </div>
            </>
          )}

          {tab==="reports" && (
            <>
              <input className="search-input" placeholder="🔍 Search room, issue or comment..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <div className="filter-row">
                {["all","pending","cleaning","resolved"].map(f => (
                  <button key={f} className={`chip ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>
                    {f==="all"?"All Status":STATUS[f]?.label}
                  </button>
                ))}
              </div>
              <div className="filter-row">
                <button className={`chip ${bFilter==="all"?"on":""}`} onClick={()=>setBFilter("all")}>All Buildings</button>
                {BUILDINGS.map(b => (
                  <button key={b.code} className={`chip ${bFilter===b.code?"on":""}`} onClick={()=>setBFilter(bFilter===b.code?"all":b.code)}>
                    {b.name}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>{filtered.length} reports</span>
                <button className="export-btn" onClick={exportCSV}>⬇ Export CSV</button>
              </div>
              {filtered.map(r => {
                const iss = ISSUE_TYPES.find(i=>i.id===r.issueId);
                const st  = STATUS[r.status];
                return (
                  <div className="rcard" key={r.id}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${iss?.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{iss?.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:700}}>{r.roomId}</span>
                          <span style={{fontSize:11,color:"var(--text3)"}}>· {iss?.label}</span>
                          <span style={{marginLeft:"auto",fontSize:11,color:"var(--text3)"}}>{timeAgo(r.timestamp)}</span>
                        </div>
                        <span className="status-pill" style={{background:st.bg,color:st.color}}>{st.label}</span>
                        {r.comment && <div style={{fontSize:12,color:"var(--text3)",marginTop:6,fontStyle:"italic"}}>"{r.comment}"</div>}
                        {r.photo && (
                          <div style={{marginTop:8}}>
                            <img
                              src={r.photo}
                              alt="Report photo"
                              style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:8,border:"1px solid var(--border)",cursor:"pointer"}}
                              onClick={() => window.open(r.photo, "_blank")}
                            />
                            <div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>Tap photo to view full size</div>
                          </div>
                        )}
                        {r.status!=="resolved" && (
                          <div style={{display:"flex",gap:6,marginTop:10}}>
                            {r.status!=="cleaning" && <button className="act-btn act-yellow" onClick={()=>doUpdate(r.id,"cleaning")}>🧹 Cleaning</button>}
                            <button className="act-btn act-green" onClick={()=>doUpdate(r.id,"resolved")}>✅ Resolved</button>
                          </div>
                        )}
                        {r.status==="resolved" && (
                          <div style={{fontSize:11,color:"var(--green)",marginTop:8}}>Resolved {r.resolvedAt?timeAgo(r.resolvedAt):""}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length===0 && <div className="empty">No reports found.</div>}
            </>
          )}

          {tab==="buildings" && (
            <>
              {bldgStats.map(b => (
                <div className="bldg-card" key={b.code}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:14,fontWeight:700}}>{b.name}</div>
                    {b.pending>0
                      ? <span style={{fontSize:11,fontWeight:700,color:"var(--red)",background:"rgba(239,68,68,0.1)",padding:"2px 10px",borderRadius:20}}>{b.pending} pending</span>
                      : <span style={{fontSize:11,fontWeight:700,color:"var(--green)",background:"rgba(16,185,129,0.1)",padding:"2px 10px",borderRadius:20}}>All clear</span>
                    }
                  </div>
                  <div className="bldg-track"><div className="bldg-fill" style={{width:`${(b.total/maxBldg)*100}%`}}/></div>
                  <div style={{fontSize:11,color:"var(--text3)",display:"flex",justifyContent:"space-between"}}>
                    <span>{b.total} total</span>
                    <span>{b.pending} pending · {reports.filter(r=>r.status==="resolved"&&r.roomId.startsWith(b.code)).length} resolved</span>
                  </div>
                </div>
              ))}
              <div className="card">
                <div className="card-title">Active Issues</div>
                {reports.filter(r=>r.status!=="resolved").map(r => {
                  const iss = ISSUE_TYPES.find(i=>i.id===r.issueId);
                  const st  = STATUS[r.status];
                  return (
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                      <div style={{fontSize:18}}>{iss?.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.roomId}</div>
                        <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{timeAgo(r.timestamp)}</div>
                      </div>
                      <span className="status-pill" style={{background:st.bg,color:st.color,flexShrink:0}}>{st.label}</span>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        {r.status!=="cleaning" && <button className="act-btn act-yellow" style={{padding:"4px 8px",fontSize:11}} onClick={()=>doUpdate(r.id,"cleaning")}>🧹</button>}
                        <button className="act-btn act-green" style={{padding:"4px 8px",fontSize:11}} onClick={()=>doUpdate(r.id,"resolved")}>✅</button>
                      </div>
                    </div>
                  );
                })}
                {reports.filter(r=>r.status!=="resolved").length===0 && <div className="empty">🎉 All restrooms are clean!</div>}
              </div>
            </>
          )}

          {tab==="analytics" && (
            <>
              <div className="two-col">
                <div className="kpi-card" style={{marginBottom:14}}><div className="kpi-val" style={{color:"var(--green)",fontSize:28}}>{resRate}%</div><div className="kpi-lbl">Resolution Rate</div></div>
                <div className="kpi-card" style={{marginBottom:14}}><div className="kpi-val" style={{color:"var(--blue)",fontSize:28}}>{avgHr}h</div><div className="kpi-lbl">Avg Response</div></div>
              </div>
              <div className="card">
                <div className="card-title">Issue Breakdown</div>
                {issCounts.sort((a,b)=>b.count-a.count).map(iss => (
                  <div className="ana-row" key={iss.id}>
                    <span style={{fontSize:15,flexShrink:0}}>{iss.icon}</span>
                    <span style={{fontSize:12,color:"var(--text2)",width:120,flexShrink:0}}>{iss.label}</span>
                    <div className="ana-track"><div className="ana-fill" style={{width:`${(iss.count/totIss)*100}%`,background:iss.color}}/></div>
                    <span style={{fontSize:11,fontWeight:700,width:22,textAlign:"right"}}>{iss.count}</span>
                    <span style={{fontSize:10,color:"var(--text3)",width:32,textAlign:"right"}}>{Math.round((iss.count/totIss)*100)}%</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">By Building</div>
                {bldgStats.sort((a,b)=>b.total-a.total).map(b => (
                  <div className="ana-row" key={b.code}>
                    <span style={{fontSize:12,color:"var(--text2)",width:100,flexShrink:0}}>{b.name}</span>
                    <div className="ana-track"><div className="ana-fill" style={{width:`${(b.total/maxBldg)*100}%`,background:"linear-gradient(90deg,var(--accent),var(--green))"}}/></div>
                    <span style={{fontSize:11,fontWeight:700,width:22,textAlign:"right"}}>{b.total}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">Reports Last 7 Days</div>
                <div className="bar-chart">
                  {days.map(d => (
                    <div className="bar-col" key={d.label}>
                      <div className="bar-num">{d.count||""}</div>
                      <div className="bar-fill" style={{height:`${(d.count/maxDay)*68}px`,background:"linear-gradient(180deg,var(--accent),var(--accent2))"}}/> 
                      <div className="bar-day">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{textAlign:"right",marginTop:4}}>
                <button className="export-btn" onClick={exportCSV}>⬇ Export Reports as CSV</button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
