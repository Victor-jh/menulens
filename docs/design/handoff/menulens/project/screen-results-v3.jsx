// Results V3 — 상단 시그널 필터 + 카테고리 칩 + 동적 카운트.
// V2의 Glance/Index/Stack 레이아웃을 모두 재사용.

function ResultsScreenV3({ persona, items, layout='glance' }) {
  const [signal, setSignal] = React.useState('all');     // all|green|yellow|red
  const [cat, setCat]       = React.useState('all');     // 'all' | category name

  const colored = items.map(it => ({...it, color: window.menulensColorFor(it, persona)}));
  const order = { green:0, yellow:1, red:2 };
  colored.sort((a,b)=> order[a.color]-order[b.color]);

  const cats = ['all', ...Array.from(new Set(colored.map(i=>i.category)))];

  const filtered = colored.filter(i =>
    (signal==='all' || i.color===signal) &&
    (cat==='all' || i.category===cat)
  );

  const counts = {
    all:    colored.length,
    green:  colored.filter(i=>i.color==='green').length,
    yellow: colored.filter(i=>i.color==='yellow').length,
    red:    colored.filter(i=>i.color==='red').length,
  };

  return (
    <div style={{
      width:'100%', height:'100%', background:ML.ink, color:'#fff',
      fontFamily:ML.sans, position:'relative', overflow:'auto', paddingTop:54,
    }}>
      {/* HEADER */}
      <div style={{position:'sticky', top:0, zIndex:6,
        background:`${ML.ink}f2`, backdropFilter:'blur(14px)',
        borderBottom:`1px solid ${ML.hairline}`}}>

        {/* identity strip */}
        <div style={{padding:'10px 18px 10px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:ML.fog}}>03 / RESULTS</span>
            <span style={{fontSize:11, color:ML.fog}}>SsadaGimbap · Itaewon</span>
          </div>
          <div style={{display:'flex', alignItems:'baseline', gap:10, marginTop:4}}>
            <span style={{fontFamily:ML.serif, fontSize:22, fontStyle:'italic'}}>For {persona.name}</span>
            <span style={{fontSize:11, color:ML.fog}}>{persona.diet}</span>
            <span style={{flex:1}}/>
            <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1, color:ML.fog}}>
              {filtered.length}<span style={{opacity:0.5}}>/{colored.length}</span>
            </span>
          </div>
        </div>

        {/* SIGNAL FILTER — 4 tabs */}
        <div style={{display:'flex', padding:'0 18px 10px', gap:6}}>
          <SignalTab active={signal==='all'}    onClick={()=>setSignal('all')}    label="All"          n={counts.all}/>
          <SignalTab active={signal==='green'}  onClick={()=>setSignal('green')}  label="Order"  c="green"  n={counts.green}/>
          <SignalTab active={signal==='yellow'} onClick={()=>setSignal('yellow')} label="Ask"    c="yellow" n={counts.yellow}/>
          <SignalTab active={signal==='red'}    onClick={()=>setSignal('red')}    label="Skip"   c="red"    n={counts.red}/>
        </div>

        {/* CATEGORY CHIPS — horizontal scroll */}
        <div style={{display:'flex', gap:6, padding:'0 18px 12px', overflowX:'auto',
          scrollbarWidth:'none', msOverflowStyle:'none'}}>
          {cats.map(k => (
            <CatChip key={k} active={cat===k} onClick={()=>setCat(k)} label={k==='all'?'All':k}/>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{padding: layout==='index' ? '8px 0 80px' : '14px 16px 80px'}}>
        {filtered.length===0
          ? <EmptyState onReset={()=>{setSignal('all'); setCat('all');}}/>
          : (
            layout==='glance' ? <GlanceList persona={persona} items={filtered}/> :
            layout==='index'  ? <IndexList  persona={persona} items={filtered}/> :
                                <StackGrid  persona={persona} items={filtered}/>
          )}
      </div>

      {/* FOOTER */}
      <div style={{position:'sticky', bottom:0, padding:'10px 16px 22px',
        background:`linear-gradient(180deg, transparent, ${ML.ink} 30%)`, display:'flex', gap:8}}>
        <button style={{
          flex:1, height:42, borderRadius:11, border:`1px solid ${ML.hairline}`,
          background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer'
        }}>+ Add page</button>
        <button style={{
          flex:1.4, height:42, borderRadius:11, border:'none',
          background:ML.paper, color:ML.warmInk, fontSize:13, fontWeight:600, cursor:'pointer'
        }}>Roulette ✦</button>
      </div>
    </div>
  );
}

function SignalTab({ active, label, c, n, onClick }) {
  const dotColor = c ? ML[c] : ML.fog;
  return <button onClick={onClick} style={{
    flex:1, padding:'8px 6px',
    background: active ? (c ? `${ML[c]}1A` : 'rgba(255,255,255,0.10)') : 'transparent',
    border: `1px solid ${active ? (c ? `${ML[c]}55` : 'rgba(255,255,255,0.20)') : ML.hairline}`,
    borderRadius:10, cursor:'pointer',
    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
    color:'#fff', fontFamily:ML.sans,
  }}>
    <div style={{display:'flex', alignItems:'center', gap:6}}>
      <span style={{width:7, height:7, borderRadius:'50%', background:dotColor,
        boxShadow: active && c ? `0 0 8px ${ML[c]}88` : 'none'}}/>
      <span style={{fontSize:11, fontWeight:active?600:500, letterSpacing:0.2}}>{label}</span>
    </div>
    <span style={{fontFamily:ML.mono, fontSize:10, color: active ? '#fff' : ML.fog, letterSpacing:0.4}}>
      {n}
    </span>
  </button>;
}

function CatChip({ active, label, onClick }) {
  return <button onClick={onClick} style={{
    padding:'6px 12px', borderRadius:99, whiteSpace:'nowrap', cursor:'pointer',
    background: active ? '#fff' : 'rgba(255,255,255,0.04)',
    color: active ? ML.ink : '#D6D9DE',
    border: `1px solid ${active ? '#fff' : ML.hairline}`,
    fontFamily:ML.sans, fontSize:11, fontWeight: active?600:500, letterSpacing:0.2,
    textTransform: label==='all' ? 'uppercase' : 'none',
  }}>{label}</button>;
}

function EmptyState({ onReset }) {
  return <div style={{padding:'60px 24px', textAlign:'center'}}>
    <SignalLight color="yellow" size={14} />
    <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:24, marginTop:18, color:'#fff'}}>
      Nothing matches both filters.
    </div>
    <div style={{fontSize:12, color:ML.fog, marginTop:8, maxWidth:240, margin:'8px auto 0'}}>
      Try a different combination — maybe one of the categories has nothing in this signal.
    </div>
    <button onClick={onReset} style={{
      marginTop:18, padding:'10px 18px', borderRadius:99, cursor:'pointer',
      background:'rgba(255,255,255,0.06)', color:'#fff',
      border:`1px solid ${ML.hairline}`, fontFamily:ML.sans, fontSize:12, fontWeight:500,
    }}>Reset filters</button>
  </div>;
}

window.ResultsScreenV3 = ResultsScreenV3;
