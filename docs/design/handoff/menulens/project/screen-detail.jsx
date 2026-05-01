// Item detail — context, ingredients, "what locals do".

function DetailScreen({ persona, item }) {
  const c = window.menulensColorFor(item, persona);
  const reasons = window.menulensReasonsFor(item, persona);

  return <div style={{
    width:'100%', height:'100%', background:ML.ink, color:'#fff',
    fontFamily:ML.sans, position:'relative', overflow:'auto', paddingTop:54,
  }}>
    {/* Top */}
    <div style={{position:'sticky', top:0, zIndex:5, background:`${ML.ink}f0`, backdropFilter:'blur(14px)',
      padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center',
      borderBottom:`1px solid ${ML.hairline}`}}>
      <span style={{fontSize:13, color:'#fff'}}>← Back</span>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <SignalLight color={c} size={9}/>
        <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.4, color:ML.fog}}>
          {c==='green'?'ORDER FREELY':c==='yellow'?'ASK FIRST':'SKIP'}
        </span>
      </div>
      <span style={{fontSize:13, color:ML.fog}}>♡</span>
    </div>

    {/* Hero */}
    <div style={{padding:'22px 24px 0'}}>
      <div style={{fontFamily:ML.ko, fontSize:42, lineHeight:1, color:'#fff', fontWeight:600, letterSpacing:-1}}>{item.ko}</div>
      <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:22, color:ML.fog, marginTop:6}}>
        {item.en}
      </div>
      <div style={{display:'flex', gap:6, marginTop:14, flexWrap:'wrap'}}>
        <Chip>{item.category}</Chip>
        <Chip>{item.servingTemp}</Chip>
        {item.spicy>0 && <Chip>{'🌶'.repeat(item.spicy)}</Chip>}
      </div>
    </div>

    {/* What it is */}
    <div style={{padding:'24px 24px 0'}}>
      <SectionTitle n="01" label="WHAT IT IS"/>
      <div style={{fontFamily:ML.serif, fontSize:20, lineHeight:1.3, color:'#E6E8EC', marginTop:8, textWrap:'pretty'}}>
        {item.desc}
      </div>
    </div>

    {/* Reasons */}
    {reasons.length>0 && <div style={{padding:'28px 24px 0'}}>
      <SectionTitle n="02" label={c==='red'?'WHY YOU SHOULD SKIP':'WHY ASK FIRST'}/>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:10}}>
        {reasons.map((r,i)=>(
          <div key={i} style={{display:'flex', gap:10, alignItems:'center',
            padding:'10px 12px', background:`${ML[c]}14`, border:`1px solid ${ML[c]}33`, borderRadius:10}}>
            <SignalLight color={c} size={8} ring={false}/>
            <span style={{fontSize:13, color:'#fff'}}>{r}</span>
          </div>
        ))}
      </div>
    </div>}

    {/* Ingredients */}
    <div style={{padding:'28px 24px 0'}}>
      <SectionTitle n={reasons.length>0?'03':'02'} label="INGREDIENTS"/>
      <div style={{display:'grid', gridTemplateColumns:'1fr', gap:1, marginTop:8,
        background:ML.hairline, border:`1px solid ${ML.hairline}`, borderRadius:12, overflow:'hidden'}}>
        {item.ingredients.map((ing, i) => {
          const flagged = ing.allergen.some(a => persona.avoid.includes(a));
          return <div key={i} style={{display:'flex', alignItems:'center', gap:12,
            padding:'12px 14px', background: ML.ink}}>
            <div style={{width:6, height:6, borderRadius:'50%', background: flagged?ML.red:ML.green}}/>
            <span style={{fontFamily:ML.ko, fontSize:15, color:'#fff', minWidth:80}}>{ing.ko}</span>
            <span style={{fontSize:12, color:ML.fog}}>{ing.en}</span>
            <span style={{marginLeft:'auto', fontFamily:ML.mono, fontSize:10, letterSpacing:1, color:flagged?ML.red:ML.fog}}>
              {flagged ? 'AVOID' : ing.allergen[0]?.toUpperCase() || ''}
            </span>
          </div>;
        })}
      </div>
    </div>

    {/* What locals do */}
    <div style={{padding:'28px 24px 0'}}>
      <SectionTitle n={reasons.length>0?'04':'03'} label="WHAT LOCALS DO"/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10}}>
        <FactTile label="When"     value={item.when}/>
        <FactTile label="Origin"   value={item.origin}/>
        <FactTile label="Pairs with" value={item.pairsWith.join(' · ')}/>
        <FactTile label="Typical price" value={item.typicalPrice}/>
      </div>
    </div>

    {/* CTA */}
    <div style={{padding:'24px 20px 60px', position:'sticky', bottom:0,
      background:`linear-gradient(180deg, transparent, ${ML.ink} 22%)`}}>
      {c!=='red' ? (
        <button style={{
          width:'100%', height:54, borderRadius:14, border:'none', cursor:'pointer',
          background:ML.paper, color:ML.warmInk,
          fontFamily:ML.sans, fontSize:15, fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        }}>
          <span style={{width:8, height:8, borderRadius:'50%', background:ML.warmInk}}/>
          Show this to staff
        </button>
      ) : (
        <button style={{
          width:'100%', height:54, borderRadius:14, cursor:'pointer',
          background:'rgba(255,106,90,0.12)', color:ML.red,
          border:`1px solid ${ML.red}55`,
          fontFamily:ML.sans, fontSize:14, fontWeight:600,
        }}>
          Find a similar dish I can eat →
        </button>
      )}
    </div>
  </div>;
}

function SectionTitle({n, label}) {
  return <div style={{display:'flex', alignItems:'center', gap:10}}>
    <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:'#fff', opacity:0.5}}>{n}</span>
    <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>{label}</span>
    <span style={{flex:1, height:1, background:ML.hairline}}/>
  </div>;
}

function FactTile({label, value}) {
  return <div style={{padding:'12px 14px', background:'rgba(255,255,255,0.03)',
    border:`1px solid ${ML.hairline}`, borderRadius:12}}>
    <div style={{fontFamily:ML.mono, fontSize:9, letterSpacing:1.4, color:ML.fog, textTransform:'uppercase'}}>{label}</div>
    <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:18, color:'#fff', marginTop:6, lineHeight:1.15}}>{value}</div>
  </div>;
}

window.DetailScreen = DetailScreen;
