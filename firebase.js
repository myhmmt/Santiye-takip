// firebase.js – Şantiye Takip (compat, global)
(function(){
  // 🔧 Firebase config – kendi değerlerinle değiştir
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MSG_SENDER_ID",
    appId: "YOUR_APP_ID",
  };
  // Init (idempotent)
  if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
  const db = firebase.firestore();

  // Sabitler
  const BLOCKS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  const TEAMS = ["Kalip","Demir","Beton","Siva","Mekanik","Elektrik"];
  const STATUSES = ["Planlandı","Devam","Bitti"];

  const nowTs = () => firebase.firestore.FieldValue.serverTimestamp();
  const tsToMillis = (ts) => { try { return ts?.toMillis?.() ?? 0; } catch { return 0; } };
  const tsToLocal = (ts) => { try { return ts?.toDate?.().toLocaleString?.() ?? "-"; } catch { return "-"; } };

  // CRUD (event tabanlı)
  async function createEvent({ blockId, teamId, status, note, userId }){
    return db.collection('events').add({
      action:'create', blockId, teamId, status, note:note||'', userId:userId||'demo', superseded:false, timestamp: nowTs()
    });
  }
  async function editEvent({ eventId, changes, userId }){
    await db.collection('events').doc(eventId).update({ superseded:true });
    return db.collection('events').add({ action:'edit', prevEventId:eventId, ...changes, note:changes?.note||'', userId:userId||'demo', superseded:false, timestamp: nowTs() });
  }
  async function deleteEvent({ eventId, reason, userId }){
    await db.collection('events').doc(eventId).update({ superseded:true });
    return db.collection('events').add({ action:'delete', prevEventId:eventId, note:reason||'', userId:userId||'demo', superseded:false, timestamp: nowTs() });
  }
  async function revertEvent({ eventId, reason, userId }){
    return db.collection('events').add({ action:'revert', prevEventId:eventId, note:reason||'', userId:userId||'demo', superseded:false, timestamp: nowTs() });
  }

  async function fetchEvents({ blockId, teamId, status, qText, from, to, pageSize = 200 }){
    let ref = db.collection('events').orderBy('timestamp','desc');
    if (blockId && blockId !== 'Tümü') ref = ref.where('blockId','==',blockId);
    if (teamId && teamId !== 'Tümü') ref = ref.where('teamId','==',teamId);
    if (status && status !== 'Tümü') ref = ref.where('status','==',status);
    ref = ref.limit(pageSize);
    const snap = await ref.get();
    let rows = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    if (from || to){
      const fromMs = from ? new Date(from).getTime() : 0;
      const toMs = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER;
      rows = rows.filter(r=>{ const ms = tsToMillis(r.timestamp); return ms>=fromMs && ms<=toMs; });
    }
    if (qText){
      const ql = qText.trim().toLowerCase();
      rows = rows.filter(r => (r.note||'').toLowerCase().includes(ql));
    }
    return rows;
  }

  // Global API
  window.AppAPI = {
    BLOCKS, TEAMS, STATUSES,
    createEvent, editEvent, deleteEvent, revertEvent, fetchEvents,
    tsToLocal
  };
})();
