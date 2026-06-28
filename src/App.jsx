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
  { id:"broken",  label:"Broken Tap/Flush", icon:"🔧", color:"#eab308" },
];

const STATUS = {
  pending:  { label:"Pending",     color:"#dc2626", bg:"#fef2f2"  },
  cleaning: { label:"In Progress", color:"#d97706", bg:"#fffbeb" },
  resolved: { label:"Resolved",    color:"#059669", bg:"#ecfdf5" },
};

const BUILDINGS = [
  { name:"L Block",      code:"LB" },
  { name:"Main Block",   code:"MB" },
  { name:"Civil Block",  code:"CB" },
  { name:"Boys Hostel",  code:"BH" },
  { name:"Girls Hostel", code:"GH" },
];

// ── EmailJS Notification ──────────────────────────────────────────────────────
const EMAILJS_SERVICE  = "service_6ausj5q";
const EMAILJS_TEMPLATE = "template_umoyicp";
const EMAILJS_KEY      = "sn4b-6LGHXt27PljS";
const NOTIFY_EMAIL     = "indhiranofficial4@gmail.com";

async function sendEmailAlert(report) {
  const iss = ISSUE_TYPES.find(i => i.id === report.issueId);
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE,
        template_id: EMAILJS_TEMPLATE,
        user_id:     EMAILJS_KEY,
        template_params: {
          to_email:    NOTIFY_EMAIL,
          from_name:   "CampusClean Alert",
          to_name:     "Admin",
          message:     `🚨 NEW REPORT\n\nRoom: ${report.roomId}\nIssue: ${iss?.icon} ${iss?.label}\nComment: ${report.comment || "None"}\nTime: ${new Date(report.timestamp).toLocaleString("en-IN")}\n\nView: https://campusclean-mgmt.vercel.app`,
        },
      }),
    });
    console.log("Email alert sent for", report.roomId);
  } catch(e) {
    console.error("Email alert failed:", e);
  }
}

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
  // Try browser notification
  if (Notification.permission === "granted") {
    try {
      new Notification("🚻 New Report — CampusClean", {
        body: `${iss?.icon || "⚠️"} ${iss?.label || report.issueId} at ${report.roomId}`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: report.id,
        requireInteraction: true,
      });
    } catch(e) { console.log("Browser notification failed"); }
  }
  // Always send email as backup
  sendEmailAlert(report);
}

function mapRow(r) {
  return {
    id: r.id, roomId: r.room_id, issueId: r.issue_id,
    comment: r.comment || "", status: r.status,
    photo: r.photo_url || null,
    deviceId: r.device_id || null,
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
  :root {
    --bg:#f8fafc; --bg2:#f1f5f9; --card:#ffffff; --card2:#f8fafc;
    --border:#e2e8f0; --border2:#cbd5e1;
    --accent:#10b981; --accent2:#059669; --accent3:#ecfdf5;
    --red:#ef4444; --redbg:#fef2f2; --redborder:#fecaca;
    --yellow:#f59e0b; --yellowbg:#fffbeb; --yellowborder:#fde68a;
    --green:#10b981; --greenbg:#ecfdf5; --greenborder:#a7f3d0;
    --blue:#3b82f6; --bluebg:#eff6ff;
    --text:#0f172a; --text2:#475569; --text3:#94a3b8; --text4:#cbd5e1;
    --shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04);
    --shadow-md:0 4px 6px rgba(0,0,0,0.06),0 2px 4px rgba(0,0,0,0.04);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{overflow-x:hidden;height:100%;}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}
  button{cursor:pointer;font-family:inherit;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}

  .app{min-height:100vh;display:flex;flex-direction:column;background:var(--bg);}

  /* LOGIN */
  .login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,#f0fdf4 0%,#f8fafc 50%,#eff6ff 100%);}
  .login-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:40px 36px;width:100%;max-width:380px;text-align:center;box-shadow:var(--shadow-md);animation:fadeUp 0.4s ease;}
  .login-logo{width:56px;height:56px;background:var(--accent3);border:1.5px solid var(--greenborder);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px;}
  .login-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px;}
  .login-sub{font-size:13px;color:var(--text3);margin-bottom:28px;}
  .login-input{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-size:15px;outline:none;margin-bottom:8px;transition:border-color 0.15s;}
  .login-input:focus{border-color:var(--accent);}
  .login-input::placeholder{color:var(--text4);}
  .login-btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:700;margin-top:4px;transition:all 0.2s;box-shadow:0 4px 14px rgba(16,185,129,0.3);}
  .login-btn:hover{background:var(--accent2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,0.4);}
  .login-err{font-size:12px;color:var(--red);margin-bottom:8px;background:var(--redbg);border:1px solid var(--redborder);border-radius:8px;padding:8px 12px;}

  /* NAV */
  .nav{height:58px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:8px;position:sticky;top:0;z-index:100;box-shadow:var(--shadow);}
  .nav-logo{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .nav-logo-icon{width:30px;height:30px;background:var(--accent3);border:1.5px solid var(--greenborder);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
  .nav-logo span{color:var(--accent);}
  .nav-logo-text{display:none;}
  .nav-badge{font-size:11px;font-weight:700;color:var(--red);background:var(--redbg);border:1px solid var(--redborder);border-radius:20px;padding:3px 10px;display:flex;align-items:center;gap:5px;flex-shrink:0;}
  .live-dot{width:6px;height:6px;border-radius:50%;background:var(--red);animation:pulse 2s infinite;flex-shrink:0;}
  .nav-right{margin-left:auto;display:flex;align-items:center;gap:6px;flex-shrink:0;}
  .nav-timer{font-size:11px;color:var(--text3);font-variant-numeric:tabular-nums;flex-shrink:0;}
  .nav-logout{padding:6px 12px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:12px;font-weight:600;transition:all 0.15s;flex-shrink:0;white-space:nowrap;}
  .nav-logout:hover{border-color:var(--red);color:var(--red);background:var(--redbg);}
  .nav-bell{padding:6px 8px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:15px;transition:all 0.15s;flex-shrink:0;}
  .nav-bell:hover{border-color:var(--accent);color:var(--accent);background:var(--accent3);}
  @media(min-width:480px){.nav-logo-text{display:inline;}.nav{padding:0 20px;}}

  /* REFRESH BAR */
  .rbar{height:2px;background:var(--border);}
  .rbar-fill{height:100%;background:var(--accent);transition:width 1s linear;}

  /* TABS */
  .tabs{display:flex;overflow-x:auto;scrollbar-width:none;padding:0 16px;border-bottom:1px solid var(--border);background:var(--card);}
  .tabs::-webkit-scrollbar{display:none;}
  .tab{padding:13px 16px;font-size:13px;font-weight:600;border:none;background:transparent;color:var(--text3);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all 0.15s;display:flex;align-items:center;gap:6px;}
  .tab:hover{color:var(--text2);}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent);}
  .tab-badge{background:var(--red);color:#fff;border-radius:20px;font-size:10px;font-weight:700;padding:1px 6px;}
  @media(min-width:480px){.tabs{padding:0 24px;}}

  /* PAGE */
  .page{padding:16px;width:100%;box-sizing:border-box;overflow-x:hidden;}
  @media(min-width:768px){.page{padding:24px 32px;max-width:1200px;margin:0 auto;}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}}

  /* CARDS */
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:var(--shadow);}
  .card-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;}

  /* KPI */
  .kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;}
  @media(min-width:768px){.kpi-grid{grid-template-columns:repeat(4,1fr);}}
  .kpi-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);transition:box-shadow 0.15s;}
  .kpi-card:hover{box-shadow:var(--shadow-md);}
  .kpi-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:32px;font-weight:800;line-height:1;}
  .kpi-lbl{font-size:11px;color:var(--text3);margin-top:5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}

  /* REPORT CARDS */
  .rcard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;transition:box-shadow 0.15s,border-color 0.15s;animation:fadeUp 0.2s ease;box-shadow:var(--shadow);}
  .rcard:hover{border-color:var(--accent);box-shadow:var(--shadow-md);}
  .status-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;}

  /* FILTERS */
  .filter-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
  .chip{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid var(--border);background:var(--card);color:var(--text2);cursor:pointer;transition:all 0.15s;white-space:nowrap;box-shadow:var(--shadow);}
  .chip:hover{border-color:var(--border2);color:var(--text);}
  .chip.on{border-color:var(--accent);background:var(--accent3);color:var(--accent2);}
  .search-input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:13px;outline:none;margin-bottom:12px;transition:border-color 0.15s,box-shadow 0.15s;box-shadow:var(--shadow);}
  .search-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(16,185,129,0.1);}
  .search-input::placeholder{color:var(--text4);}

  /* ACTION BUTTONS */
  .act-btn{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid;background:transparent;cursor:pointer;transition:all 0.15s;}
  .act-yellow{border-color:var(--yellowborder);color:var(--yellow);}
  .act-yellow:hover{background:var(--yellowbg);}
  .act-green{border-color:var(--greenborder);color:var(--accent2);}
  .act-green:hover{background:var(--accent3);}

  /* BAR CHART */
  .bar-chart{display:flex;align-items:flex-end;gap:6px;height:80px;}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;}
  .bar-fill{width:100%;border-radius:4px 4px 0 0;min-height:3px;transition:height 0.6s ease;}
  .bar-day{font-size:9px;color:var(--text3);}
  .bar-num{font-size:9px;color:var(--text2);font-weight:700;}

  /* BUILDING CARDS */
  .bldg-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:var(--shadow);}
  .bldg-track{height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;margin-bottom:6px;}
  .bldg-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width 0.6s ease;}

  /* ANALYTICS */
  .ana-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
  .ana-track{flex:1;height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;}
  .ana-fill{height:100%;border-radius:3px;transition:width 0.8s ease;}

  /* EXPORT */
  .export-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 8px rgba(16,185,129,0.3);}
  .export-btn:hover{background:var(--accent2);transform:translateY(-1px);box-shadow:0 4px 14px rgba(16,185,129,0.4);}

  /* EMPTY */
  .empty{text-align:center;padding:48px 20px;color:var(--text3);font-size:14px;}

  /* MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);}
  .modal-sheet{background:var(--card);border-radius:20px 20px 0 0;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;padding:20px;animation:slideUp 0.3s ease;box-shadow:0 -4px 32px rgba(0,0,0,0.12);}
  .modal-handle{width:40px;height:4px;background:var(--border2);border-radius:2px;margin:0 auto 16px;}
  .modal-close{position:absolute;top:16px;right:16px;background:var(--bg2);border:1px solid var(--border);color:var(--text2);width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
  .modal-close:hover{background:var(--redbg);border-color:var(--redborder);color:var(--red);}

  /* CALENDAR */
  .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
  .cal-nav-btn{width:32px;height:32px;border-radius:8px;background:var(--bg2);border:1px solid var(--border);color:var(--text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
  .cal-nav-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent3);}
  .cal-month-label{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:var(--text);}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
  .cal-dow{font-size:10px;font-weight:700;color:var(--text3);text-align:center;padding:6px 0;text-transform:uppercase;}
  .cal-cell{aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:1px solid transparent;transition:all 0.15s;position:relative;}
  .cal-cell:hover{border-color:var(--border2);background:var(--bg2);}
  .cal-cell.empty-cell{cursor:default;}
  .cal-cell.today{border-color:var(--accent);background:var(--accent3);}
  .cal-cell.selected{background:var(--accent);border-color:var(--accent);}
  .cal-cell.selected .cal-day-num{color:#fff;}
  .cal-day-num{font-size:12px;font-weight:600;color:var(--text2);}
  .cal-dot{width:5px;height:5px;border-radius:50%;margin-top:2px;}
  .cal-count{font-size:8px;font-weight:700;color:var(--text3);position:absolute;bottom:3px;}
  .cal-legend{display:flex;align-items:center;gap:12px;margin-top:14px;font-size:11px;color:var(--text3);flex-wrap:wrap;}
  .cal-legend-dot{display:inline-flex;align-items:center;gap:5px;}
  .cal-legend-swatch{width:8px;height:8px;border-radius:50%;}
  @media(max-width:400px){.nav{padding:0 12px;}.page{padding:12px;}.kpi-val{font-size:26px;}}
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
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [selected,  setSelected]  = useState(null);
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

  // Device fingerprint frequency — flags devices with 5+ reports in last 24h
  const deviceCounts = {};
  reports.forEach(r => {
    if (!r.deviceId) return;
    if (Date.now() - r.timestamp > 24 * 3600000) return;
    deviceCounts[r.deviceId] = (deviceCounts[r.deviceId] || 0) + 1;
  });
  function isFlagged(r) {
    return r.deviceId && deviceCounts[r.deviceId] >= 5;
  }

  // Calendar — build day grid for the visible month with report counts
  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }
  const reportsByDay = {};
  reports.forEach(r => {
    const k = dayKey(r.timestamp);
    if (!reportsByDay[k]) reportsByDay[k] = [];
    reportsByDay[k].push(r);
  });
  const calYear  = calMonth.getFullYear();
  const calMon   = calMonth.getMonth();
  const firstDow = new Date(calYear, calMon, 1).getDay();
  const daysInMon = new Date(calYear, calMon + 1, 0).getDate();
  const todayKey = dayKey(Date.now());
  const calCells = [];
  for (let i = 0; i < firstDow; i++) calCells.push(null);
  for (let d = 1; d <= daysInMon; d++) calCells.push(d);
  const calMaxCount = Math.max(1, ...Object.values(reportsByDay).map(arr => arr.length));
  const selectedDayReports = calSelectedDate
    ? (reportsByDay[`${calYear}-${calMon}-${calSelectedDate}`] || [])
    : [];

  const filtered = reports.filter(r => {
    const sOk = filter==="all"||r.status===filter;
    const bOk = bFilter==="all"||r.roomId.startsWith(bFilter);
    const fOk = !flaggedOnly||isFlagged(r);
    const q   = search.toLowerCase();
    const qOk = q===""||r.roomId.toLowerCase().includes(q)||(ISSUE_TYPES.find(i=>i.id===r.issueId)?.label||"").toLowerCase().includes(q)||(r.comment||"").toLowerCase().includes(q);
    return sOk&&bOk&&fOk&&qOk;
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚻</div>
            <span className="nav-logo-text">Campus<span>Clean</span></span>
          </div>
          <div className="nav-badge"><div className="live-dot"/>{pending>0?`${pending} Pending`:"All Clear"}</div>
          <div className="nav-right">
            <div className="nav-timer">↻ {countdown}s</div>
            <button className="nav-bell"
              onClick={async () => {
                const ok = await registerPush();
                alert(ok ? "✅ Notifications enabled!" : "❌ Allow notifications in browser settings.");
              }}>
              🔔
            </button>
            <button className="nav-logout" onClick={()=>{setAuthed(false);clearInterval(timerRef.current);}}>Exit</button>
          </div>
        </nav>
        <div className="rbar"><div className="rbar-fill" style={{width:`${((30-countdown)/30)*100}%`}}/></div>
        <div className="tabs">
          {[
            {id:"overview",  label:"Overview",  icon:"📊"},
            {id:"reports",   label:"Reports",   icon:"📋", badge:pending},
            {id:"calendar",  label:"Calendar",  icon:"📅"},
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
              <input className="search-input" placeholder="🔍 Search room or issue..." value={search} onChange={e=>setSearch(e.target.value)}/>
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
              {Object.keys(deviceCounts).some(d => deviceCounts[d] >= 5) && (
                <div className="filter-row">
                  <button className={`chip ${flaggedOnly?"on":""}`} style={flaggedOnly?{borderColor:"var(--red)",background:"rgba(239,68,68,0.1)",color:"var(--red)"}:{}} onClick={()=>setFlaggedOnly(!flaggedOnly)}>
                    ⚠️ Flagged devices only
                  </button>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:600}}>{filtered.length} reports</span>
                <button className="export-btn" onClick={exportCSV}>⬇ Export CSV</button>
              </div>
              {filtered.map(r => {
                const iss = ISSUE_TYPES.find(i=>i.id===r.issueId);
                const st  = STATUS[r.status];
                return (
                  <div className="rcard" key={r.id} onClick={()=>setSelected(r)} style={{cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${iss?.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{iss?.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:700}}>{r.roomId}</span>
                          <span style={{fontSize:11,color:"var(--text3)"}}>· {iss?.label}</span>
                          <span style={{marginLeft:"auto",fontSize:11,color:"var(--text3)"}}>{timeAgo(r.timestamp)}</span>
                        </div>
                        <span className="status-pill" style={{background:st.bg,color:st.color}}>{st.label}</span>
                        {isFlagged(r) && (
                          <span className="status-pill" style={{background:"rgba(239,68,68,0.12)",color:"var(--red)",marginLeft:6}}>⚠️ {deviceCounts[r.deviceId]}x today</span>
                        )}
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
                          <div style={{display:"flex",gap:6,marginTop:10}} onClick={e=>e.stopPropagation()}>
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

          {tab==="calendar" && (
            <>
              <div className="card">
                <div className="cal-header">
                  <button className="cal-nav-btn" onClick={()=>{setCalMonth(new Date(calYear, calMon-1, 1)); setCalSelectedDate(null);}}>‹</button>
                  <div className="cal-month-label">{calMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                  <button className="cal-nav-btn" onClick={()=>{setCalMonth(new Date(calYear, calMon+1, 1)); setCalSelectedDate(null);}}>›</button>
                </div>
                <div className="cal-grid">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div className="cal-dow" key={d}>{d}</div>)}
                  {calCells.map((d, i) => {
                    if (d === null) return <div className="cal-cell empty-cell" key={"e"+i}/>;
                    const key = `${calYear}-${calMon}-${d}`;
                    const dayReports = reportsByDay[key] || [];
                    const count = dayReports.length;
                    const isToday = key === todayKey;
                    const isSelected = calSelectedDate === d;
                    const pendingCount = dayReports.filter(r=>r.status==="pending").length;
                    let dotColor = null;
                    if (count > 0) dotColor = pendingCount > 0 ? "var(--red)" : "var(--green)";
                    return (
                      <div key={d}
                        className={`cal-cell ${isToday?"today":""} ${isSelected?"selected":""}`}
                        onClick={()=>setCalSelectedDate(isSelected?null:d)}>
                        <div className="cal-day-num">{d}</div>
                        {dotColor && <div className="cal-dot" style={{background:dotColor}}/>}
                        {count > 0 && <div className="cal-count" style={isSelected?{color:"rgba(255,255,255,0.8)"}:{}}>{count}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="cal-legend">
                  <span className="cal-legend-dot"><span className="cal-legend-swatch" style={{background:"var(--red)"}}/>Has pending</span>
                  <span className="cal-legend-dot"><span className="cal-legend-swatch" style={{background:"var(--green)"}}/>All resolved</span>
                  <span className="cal-legend-dot"><span className="cal-legend-swatch" style={{background:"var(--accent)"}}/>Selected day</span>
                </div>
              </div>

              {calSelectedDate && (
                <div className="card">
                  <div className="card-title">
                    {new Date(calYear, calMon, calSelectedDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                    {" · "}{selectedDayReports.length} report{selectedDayReports.length!==1?"s":""}
                  </div>
                  {selectedDayReports.length === 0 && <div className="empty">No reports on this day.</div>}
                  {selectedDayReports
                    .sort((a,b)=>b.timestamp-a.timestamp)
                    .map(r => {
                      const iss = ISSUE_TYPES.find(i=>i.id===r.issueId);
                      const st  = STATUS[r.status];
                      return (
                        <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>setSelected(r)}>
                          <div style={{fontSize:18,flexShrink:0}}>{iss?.icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.roomId}</div>
                            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{iss?.label} · {new Date(r.timestamp).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}</div>
                          </div>
                          <span className="status-pill" style={{background:st.bg,color:st.color,flexShrink:0}}>{st.label}</span>
                        </div>
                      );
                    })}
                </div>
              )}
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

      {/* ── DETAIL MODAL ── */}
      {selected && (() => {
        const iss = ISSUE_TYPES.find(i=>i.id===selected.issueId);
        const st  = STATUS[selected.status];
        const dt  = new Date(selected.timestamp);
        const dateStr = dt.toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
        const timeStr = dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
        return (
          <div className="modal-overlay" onClick={()=>setSelected(null)}>
            <div className="modal-sheet" onClick={e=>e.stopPropagation()} style={{position:"relative"}}>
              <div className="modal-handle"/>
              <button className="modal-close" onClick={()=>setSelected(null)}>✕</button>

              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <div style={{width:48,height:48,borderRadius:12,background:`${iss?.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{iss?.icon}</div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{selected.roomId}</div>
                  <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{iss?.label}</div>
                </div>
                <span className="status-pill" style={{background:st.bg,color:st.color,marginLeft:"auto"}}>{st.label}</span>
              </div>

              {isFlagged(selected) && (
                <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--red)"}}>⚠️ Possible spam — this device submitted {deviceCounts[selected.deviceId]} reports in the last 24h</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>Device fingerprint match. Not proof of identity — review before acting.</div>
                </div>
              )}

              {/* Date & Time */}
              <div style={{background:"var(--bg2)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                <div style={{fontSize:10,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Reported On</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{dateStr}</div>
                <div style={{fontSize:13,color:"var(--accent)",marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>{timeStr}</div>
              </div>

              {/* Comment */}
              {selected.comment && (
                <div style={{background:"var(--bg2)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:10,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Comment</div>
                  <div style={{fontSize:13,color:"var(--text2)",fontStyle:"italic"}}>"{selected.comment}"</div>
                </div>
              )}

              {/* Photo */}
              {selected.photo && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Photo</div>
                  <img src={selected.photo} alt="Report" style={{width:"100%",borderRadius:12,border:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>window.open(selected.photo,"_blank")}/>
                  <div style={{fontSize:10,color:"var(--text3)",marginTop:4,textAlign:"center"}}>Tap to open full size</div>
                </div>
              )}

              {/* Resolved time */}
              {selected.resolvedAt && (
                <div style={{background:"rgba(16,185,129,0.08)",borderRadius:10,padding:"10px 14px",marginBottom:12,border:"1px solid rgba(16,185,129,0.2)"}}>
                  <div style={{fontSize:11,color:"var(--green)",fontWeight:600}}>✓ Resolved {timeAgo(selected.resolvedAt)} · {new Date(selected.resolvedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}</div>
                </div>
              )}

              {/* Actions */}
              {selected.status !== "resolved" && (
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  {selected.status !== "cleaning" && (
                    <button className="act-btn act-yellow" style={{flex:1,padding:"10px"}} onClick={()=>{doUpdate(selected.id,"cleaning");setSelected(s=>({...s,status:"cleaning"}));}}>🧹 Mark Cleaning</button>
                  )}
                  <button className="act-btn act-green" style={{flex:1,padding:"10px"}} onClick={()=>{doUpdate(selected.id,"resolved");setSelected(s=>({...s,status:"resolved",resolvedAt:Date.now()}));}}>✅ Mark Resolved</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

        </div>
      </div>
    </>
  );
}
