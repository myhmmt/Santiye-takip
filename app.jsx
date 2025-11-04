const { BLOCKS, TEAMS, STATUSES, fetchEvents, createEvent, editEvent, deleteEvent, revertEvent, tsToLocal } = window.AppAPI;

const PAGE_SIZE = 200;
const colorOf = (s) => (s === "Bitti" ? "#16a34a" : s === "Devam" ? "#f59e0b" : "#ef4444");

function summarizeByBlock(rows){
  const latest = {};
  rows.forEach(r => {
    const t = r.timestamp?.toMillis?.() || 0;
    const b = r.blockId || "?";
    if (!latest[b] || t > latest[b].ts) latest[b] = { status: r.status, ts: t };
  });
  const full = {};
  BLOCKS.forEach(b => full[b] = latest[b] || { status: "Planlandı", ts: 0 });
  return full;
}
function countsFromSummary(sum){
  let g=0,y=0,r=0; Object.values(sum).forEach(v=>{ if(v.status==="Bitti")g++; else if(v.status==="Devam")y++; else r++; });
  return { green:g, yellow:y, red:r, total:Object.keys(sum).length };
}

function Modal({ open, onClose, title, children, footer }){
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{width:"min(680px,96vw)",background:"#fff",color:"#111",borderRadius:12,padding:16,boxShadow:"0 10px 30px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:600}}>{title}</h3>
          <button className="btn" onClick={onClose}>×</button>
        </div>
        <div style={{marginTop:12}}>{children}</div>
        {footer && <div style={{marginTop:16,display:"flex",gap:8,justifyContent:"flex-end"}}>{footer}</div>}
      </div>
    </div>
  );
}

function FilterBar(props){
  const { blockId, teamId, status, qText, from, to, setBlockId, setTeamId, setStatus, setQText, setFrom, setTo, onRefresh } = props;
  return (
    <div className="grid" style={{gridTemplateColumns:"repeat(6, minmax(0,1fr))", alignItems:"center", gap:8}}>
      <select value={blockId} onChange={e=>setBlockId(e.target.value)}>
        <option>Tümü</option>
        {BLOCKS.map(b=> <option key={b}>{b}</option>)}
      </select>
      <select value={teamId} onChange={e=>setTeamId(e.target.value)}>
        <option>Tümü</option>
        {TEAMS.map(t=> <option key={t}>{t}</option>)}
      </select>
      <select value={status} onChange={e=>setStatus(e.target.value)}>
        <option>Tümü</option>
        {STATUSES.map(s=> <option key={s}>{s}</option>)}
      </select>
      <input placeholder="Not içinde ara" value={qText} onChange={e=>setQText(e.target.value)} />
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
      <div style={{display:"flex",gap:6}}>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        <button className="btn primary" onClick={onRefresh}>Yenile</button>
      </div>
    </div>
  );
}

function EventsTable({ rows, onEdit, onDelete, onRevert }){
  return (
    <div className="card">
      <h2 style={{margin:0,fontSize:18,fontWeight:700,marginBottom:8}}>Bölüm 3 – Kayıtlar</h2>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th>Tarih</th><th>Blok</th><th>Ekip</th><th>Durum</th><th>Not</th><th style={{width:180}}>İşlem</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{tsToLocal(r.timestamp)}</td>
                <td>{r.blockId}</td>
                <td>{r.teamId}</td>
                <td>{r.status}</td>
                <td>{r.note}</td>
                <td>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button className="btn" onClick={()=>onEdit(r)}>Düzenle</button>
                    <button className="btn" onClick={()=>onDelete(r)}>Sil</button>
                    <button className="btn" onClick={()=>onRevert(r)}>Geri Al</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryGrid({ summary }){
  const counts = React.useMemo(()=>countsFromSummary(summary),[summary]);
  return (
    <div className="card">
      <h2 style={{margin:0,fontSize:18,fontWeight:700,marginBottom:8}}>Bölüm 2 – Özet</h2>
      <div style={{fontSize:14,color:"#555",marginBottom:8}}>
        Toplam: {counts.total} • 🟩 {counts.green} • 🟨 {counts.yellow} • 🟥 {counts.red}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(8, minmax(0,1fr))",gap:8}}>
        {BLOCKS.map(b=>(
          <div key={b} title={`${b} – ${summary[b]?.status||"-"}`} style={{
            height:48,borderRadius:10,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
            background: colorOf(summary[b]?.status), fontWeight:600
          }}>{b}</div>
        ))}
      </div>
    </div>
  );
}

function EventForm({ values, setValues }){
  const { blockId, teamId, status, note } = values;
  return (
    <div className="grid" style={{gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:8}}>
      <label><div>Blok</div>
        <select value={blockId} onChange={e=>setValues(v=>({...v, blockId:e.target.value}))}>
          {BLOCKS.map(b=> <option key={b}>{b}</option>)}
        </select>
      </label>
      <label><div>Ekip</div>
        <select value={teamId} onChange={e=>setValues(v=>({...v, teamId:e.target.value}))}>
          {TEAMS.map(t=> <option key={t}>{t}</option>)}
        </select>
      </label>
      <label><div>Durum</div>
        <select value={status} onChange={e=>setValues(v=>({...v, status:e.target.value}))}>
          {STATUSES.map(s=> <option key={s}>{s}</option>)}
        </select>
      </label>
      <label style={{gridColumn:"1 / -1"}}><div>Not</div>
        <textarea rows={3} value={note} onChange={e=>setValues(v=>({...v, note:e.target.value}))} style={{width:"100%"}} />
      </label>
    </div>
  );
}

function App(){
  const [blockId,setBlockId] = React.useState("Tümü");
  const [teamId,setTeamId] = React.useState("Tümü");
  const [status,setStatus] = React.useState("Tümü");
  const [qText,setQText] = React.useState("");
  const [from,setFrom] = React.useState("");
  const [to,setTo] = React.useState("");

  const [rows,setRows] = React.useState([]);
  const [loading,setLoading] = React.useState(false);
  const [summary,setSummary] = React.useState({});

  const [newOpen,setNewOpen] = React.useState(false);
  const [editRow,setEditRow] = React.useState(null);
  const [delRow,setDelRow] = React.useState(null);
  const [revRow,setRevRow] = React.useState(null);

  const [formVals,setFormVals] = React.useState({ blockId:"A", teamId:TEAMS[0], status:STATUSES[0], note:\"\" });

  const tRef = React.useRef(null);

  async function loadAll(){
    setLoading(true);
    const data = await fetchEvents({ blockId, teamId, status, qText, from, to, pageSize: PAGE_SIZE });
    setRows(data);
    setSummary(summarizeByBlock(data));
    setLoading(false);
  }

  React.useEffect(()=>{
    loadAll();
    tRef.current = setInterval(loadAll, 10000);
    return ()=> clearInterval(tRef.current);
  },[blockId,teamId,status,qText,from,to]);

  function openNew(){ setFormVals({ blockId:\"A\", teamId:TEAMS[0], status:STATUSES[0], note:\"\" }); setNewOpen(true); }
  function openEdit(row){ setFormVals({ blockId:row.blockId, teamId:row.teamId, status:row.status, note:row.note||\"\" }); setEditRow(row); }
  function openDelete(row){ setDelRow(row); }
  function openRevert(row){ setRevRow(row); }

  async function handleCreate(){ await createEvent({ ...formVals }); setNewOpen(false); loadAll(); }
  async function handleEdit(){ await editEvent({ eventId: editRow.id, changes: { ...formVals } }); setEditRow(null); loadAll(); }
  async function handleDelete(reason){ await deleteEvent({ eventId: delRow.id, reason: reason||\"\" }); setDelRow(null); loadAll(); }
  async function handleRevert(reason){ await revertEvent({ eventId: revRow.id, reason: reason||\"\" }); setRevRow(null); loadAll(); }

  return (
    <div className=\"container\" style={{display:\"flex\",flexDirection:\"column\",gap:16}}>
      <div className=\"card\">
        <h2 style={{margin:0,fontSize:18,fontWeight:700,marginBottom:8}}>Bölüm 1 – Günlük Yoklama (Yer tutucu)</h2>
        <p style={{color:\"#555\"}}>Pafta grid entegrasyonu bu bölüme eklenecek. Şimdilik odak: Bölüm 3 + Bölüm 2.</p>
      </div>

      <div className=\"card\">
        <FilterBar
          blockId={blockId} teamId={teamId} status={status} qText={qText} from={from} to={to}
          setBlockId={setBlockId} setTeamId={setTeamId} setStatus={setStatus} setQText={setQText} setFrom={setFrom} setTo={setTo}
          onRefresh={loadAll}
        />
        <div style={{marginTop:8,display:\"flex\",gap:8}}>
          <button className=\"btn primary\" onClick={openNew}>+ Yeni Güncelleme</button>
          {loading && <span style={{fontSize:13,color:\"#666\"}}>Yükleniyor…</span>}
        </div>
      </div>

      <EventsTable rows={rows} onEdit={openEdit} onDelete={openDelete} onRevert={openRevert} />

      <SummaryGrid summary={summary} />

      <Modal open={newOpen} onClose={()=>setNewOpen(false)} title=\"Yeni Güncelleme\">
        <EventForm values={formVals} setValues={setFormVals}/>
        <div style={{display:\"flex\",justifyContent:\"flex-end\",gap:8,marginTop:12}}>
          <button className=\"btn\" onClick={()=>setNewOpen(false)}>İptal</button>
          <button className=\"btn primary\" onClick={handleCreate}>Kaydet</button>
        </div>
      </Modal>

      <Modal open={!!editRow} onClose={()=>setEditRow(null)} title=\"Kaydı Düzenle\">
        <EventForm values={formVals} setValues={setFormVals}/>
        <div style={{display:\"flex\",justifyContent:\"flex-end\",gap:8,marginTop:12}}>
          <button className=\"btn\" onClick={()=>setEditRow(null)}>İptal</button>
          <button className=\"btn primary\" onClick={handleEdit}>Güncelle</button>
        </div>
      </Modal>

      <Modal open={!!delRow} onClose={()=>setDelRow(null)} title=\"Sil – Onay\">
        <p style={{marginTop:0}}>Bu kaydı silmek istiyor musun? (Soft delete olarak işaretlenecek.)</p>
        <textarea rows={3} placeholder=\"Sebep (opsiyonel)\" onChange={e=>delRow._reason=e.target.value} style={{width:\"100%\"}} />
        <div style={{display:\"flex\",justifyContent:\"flex-end\",gap:8,marginTop:12}}>
          <button className=\"btn\" onClick={()=>setDelRow(null)}>Vazgeç</button>
          <button className=\"btn primary\" onClick={()=>handleDelete(delRow._reason)}>Sil</button>
        </div>
      </Modal>

      <Modal open={!!revRow} onClose={()=>setRevRow(null)} title=\"Geri Al – Onay\">
        <p style={{marginTop:0}}>Bu kayıt için telafi (revert) olayı eklenecek. Not bırakmak ister misin?</p>
        <textarea rows={3} placeholder=\"Not (opsiyonel)\" onChange={e=>revRow._reason=e.target.value} style={{width:\"100%\"}} />
        <div style={{display:\"flex\",justifyContent:\"flex-end\",gap:8,marginTop:12}}>
          <button className=\"btn\" onClick={()=>setRevRow(null)}>Vazgeç</button>
          <button className=\"btn primary\" onClick={()=>handleRevert(revRow._reason)}>Geri Al</button>
        </div>
      </Modal>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
