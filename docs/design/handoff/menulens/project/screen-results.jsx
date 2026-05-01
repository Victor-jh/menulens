// Results screen — signal triage view.

function ResultsScreen({ persona, items }) {
  const colored = items.map(it => ({...it, color: window.menulensColorFor(it, persona)}));
  const reds = colored.filter(c=>c.color==='red');
  const yellows = colored.filter(c=>c.color==='yellow');
  const greens = colored.filter(c=>c.color==='green');

  return (
    <div style={{
      width:'100%', height:'100%', background:ML.ink, color:'#fff',
      fontFamily:ML.sans, position:'relative', overflow:'auto',
      paddingTop:54,
    }}>
      {/* Sticky header */}
      <div style={{position:'sticky', top:0, zIndex:5, background:`${ML.ink}f0`, backdropFilter:'blur(14px)',
        padding:'12px 20px 14px', borderBottom:`1px solid ${ML.hairline}`}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
          <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>03 / RESULTS</span>
          <span style={{fontSize:11, color:ML.fog}}>SsadaGimbap · Itaewon</span>
        </div>
        <div style={{display:'flex', alignItems:'baseline', gap:10}}>
          <span style={{fontFamily:ML.serif, fontSize:28, fontStyle:'italic', color:'#fff'}}>For {persona.name}</span>
          <span style={{fontSize:11, color:ML.fog}}>· {persona.diet}</span>
        </div>
        {/* triage bar */}
        <div style={{display:'flex', gap:14, marginTop:14}}>
          <Tally light="green" n={greens.length} label="Order freely" />
          <Hairline vertical style={{height:24, alignSelf:'center'}}/>
          <Tally light="yellow" n={yellows.length} label="Ask first" />
          <Hairline vertical style={{height:24, alignSelf:'center'}}/>
          <Tally light="red" n={reds.length} label="Skip" />
        </div>
      </div>

      {/* Sections */}
      <div style={{padding:'20px 20px 80px'}}>
        {greens.length>0 && <Section persona={persona} color="green" title="Order freely" subtitle={`${greens.length} dishes match your preferences`} items={greens}/>}
        {yellows.length>0 && <Section persona={persona} color="yellow" title="Ask first" subtitle="Could be fine — confirm with staff" items={yellows}/>}
        {reds.length>0 && <Section persona={persona} color="red" title="Skip" subtitle="Contains something you avoid" items={reds}/>}
      </div>

      {/* Floating actions */}
      <div style={{position:'sticky', bottom:0, padding:'16px 20px 28px',
        background:`linear-gradient(180deg, transparent, ${ML.ink} 30%)`,
        display:'flex', gap:10}}>
        <button style={floatBtn(false)}>+ Scan another page</button>
        <button style={floatBtn(true)}>Roulette ✦</button>
      </div>
    </div>
  );
}

function Tally({light, n, label}) {
  return <div style={{display:'flex', flexDirection:'column', flex:1, gap:5}}>
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <SignalLight color={light} size={9} ring={false}/>
      <span style={{fontFamily:ML.serif, fontSize:22, fontStyle:'italic', lineHeight:1}}>{n}</span>
    </div>
    <div style={{fontSize:10, color:ML.fog, letterSpacing:0.6, textTransform:'uppercase'}}>{label}</div>
  </div>;
}

function Section({persona, color, title, subtitle, items}) {
  return <div style={{marginTop:24}}>
    <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
      <SignalLight color={color} size={11} />
      <div>
        <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:20, color:'#fff'}}>{title}</div>
        <div style={{fontSize:11, color:ML.fog, marginTop:2}}>{subtitle}</div>
      </div>
    </div>
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {items.map((it,i)=><ItemRow key={i} item={it} persona={persona}/>)}
    </div>
  </div>;
}

function ItemRow({item, persona}) {
  const reasons = window.menulensReasonsFor(item, persona);
  const c = item.color;
  return <div style={{
    background:'rgba(255,255,255,0.03)', border:`1px solid ${ML.hairline}`,
    borderRadius:14, padding:'14px 14px 14px 16px',
    position:'relative', overflow:'hidden',
  }}>
    {/* color stripe */}
    <div style={{position:'absolute', left:0, top:0, bottom:0, width:3, background:ML[c]}}/>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontFamily:ML.ko, fontSize:18, color:'#fff', fontWeight:500}}>{item.ko}</div>
        <div style={{fontSize:13, color:'#D6D9DE', marginTop:2}}>{item.en}
          <span style={{color:ML.fog, fontStyle:'italic', marginLeft:6, fontFamily:ML.serif}}>· {item.romanized}</span>
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        {item.isFreeSide
          ? <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1, color:ML.green}}>FREE</span>
          : <span style={{fontFamily:ML.serif, fontSize:18, fontStyle:'italic'}}>₩{item.price.toLocaleString()}</span>
        }
        {item.benchmark && item.price > item.benchmark*1.05 && (
          <div style={{fontSize:10, color:ML.yellow, marginTop:2}}>vs ₩{item.benchmark.toLocaleString()} typ.</div>
        )}
      </div>
    </div>
    <div style={{fontSize:12, color:'#A8AEB6', marginTop:8, lineHeight:1.45}}>{item.short}</div>
    {/* reason chips */}
    {(reasons.length>0 || item.isFreeSide) && <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:10}}>
      {item.isFreeSide && <Chip tone="green">Free side · don't order</Chip>}
      {reasons.map((r,i)=><Chip key={i} tone={c==='red'?'red':c==='yellow'?'yellow':'neutral'}>{r}</Chip>)}
      {item.spicy>0 && <Chip tone="neutral">{'🌶'.repeat(item.spicy)} spicy</Chip>}
    </div>}
    {/* CTA row */}
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:10, borderTop:`1px solid ${ML.hairline}`}}>
      <span style={{fontSize:11, color:ML.fog}}>Tap to open · {item.ingredients.length} ingredients</span>
      <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:c==='red'?ML.fog:'#fff'}}>
        {c==='red' ? 'WHY ✕' : 'SHOW STAFF →'}
      </span>
    </div>
  </div>;
}

function floatBtn(primary) {
  return {
    flex:1, height:46, borderRadius:12, border:'none', cursor:'pointer',
    fontFamily:ML.sans, fontSize:13, fontWeight:600, letterSpacing:0.2,
    background: primary ? ML.paper : 'rgba(255,255,255,0.06)',
    color: primary ? ML.warmInk : '#fff',
    border: primary ? 'none' : `1px solid ${ML.hairline}`,
  };
}

window.ResultsScreen = ResultsScreen;
