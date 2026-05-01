// Roulette + Review screens.

function RouletteScreen({ persona, items }) {
  const greens = items.filter(it => window.menulensColorFor(it, persona)==='green' && !it.isFreeSide);
  const winner = greens[0] || items[0];
  return <div style={{
    width:'100%', height:'100%', background:ML.ink, color:'#fff',
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54,
  }}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 20px',
      display:'flex', justifyContent:'space-between'}}>
      <span style={{fontSize:13, color:'#fff'}}>← Back</span>
      <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>05 / ROULETTE</span>
    </div>

    {/* Wheel of dishes — vertical strip with selected */}
    <div style={{position:'absolute', top:118, left:24, right:24}}>
      <div style={{fontFamily:ML.serif, fontSize:30, fontStyle:'italic', lineHeight:1.05}}>
        Can’t decide?<br/>
        <span style={{color:ML.fog}}>Let the room pick.</span>
      </div>
    </div>

    {/* Reel */}
    <div style={{position:'absolute', top:230, left:0, right:0, display:'flex', justifyContent:'center'}}>
      <div style={{width:300, height:240, position:'relative'}}>
        {/* faded items above */}
        {greens.slice(1,3).map((it,i)=>(
          <div key={i} style={{
            position:'absolute', left:0, right:0, top: 30 - i*40,
            textAlign:'center', opacity: 0.25 - i*0.08,
            fontFamily:ML.ko, fontSize:22, color:'#fff', filter:`blur(${i+1}px)`,
          }}>{it.ko}</div>
        ))}
        {/* selected */}
        <div style={{position:'absolute', left:0, right:0, top:96, textAlign:'center'}}>
          <div style={{fontFamily:ML.ko, fontSize:48, color:'#fff', lineHeight:1, fontWeight:600, letterSpacing:-1}}>{winner.ko}</div>
          <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:18, color:ML.fog, marginTop:8}}>{winner.en}</div>
        </div>
        {/* faded items below */}
        {greens.slice(1,3).map((it,i)=>(
          <div key={'b'+i} style={{
            position:'absolute', left:0, right:0, bottom: 30 - i*40,
            textAlign:'center', opacity: 0.25 - i*0.08,
            fontFamily:ML.ko, fontSize:22, color:'#fff', filter:`blur(${i+1}px)`,
          }}>{it.ko}</div>
        ))}
        {/* selection bar */}
        <div style={{position:'absolute', left:-20, right:-20, top:88, height:80,
          border:`1px solid ${ML.green}55`, borderLeft:'none', borderRight:'none',
          background:`linear-gradient(90deg, transparent, ${ML.green}11, transparent)`}}/>
      </div>
    </div>

    {/* Reasons */}
    <div style={{position:'absolute', left:24, right:24, top:500,
      display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', gap:10, alignItems:'center', fontSize:12, color:'#D6D9DE'}}>
        <SignalLight color="green" size={8} ring={false}/> Safe for {persona.name}
      </div>
      <div style={{display:'flex', gap:10, alignItems:'center', fontSize:12, color:'#D6D9DE'}}>
        <SignalLight color="green" size={8} ring={false}/> Most-ordered dish at this restaurant
      </div>
      <div style={{display:'flex', gap:10, alignItems:'center', fontSize:12, color:'#D6D9DE'}}>
        <SignalLight color="green" size={8} ring={false}/> Pairs with {winner.pairsWith.join(' or ')}
      </div>
    </div>

    {/* Action */}
    <div style={{position:'absolute', left:20, right:20, bottom:36,
      display:'flex', gap:10}}>
      <button style={{
        flex:1, height:50, borderRadius:14, border:`1px solid ${ML.hairline}`, cursor:'pointer',
        background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:13, fontWeight:600,
      }}>↻ Spin again</button>
      <button style={{
        flex:1.4, height:50, borderRadius:14, border:'none', cursor:'pointer',
        background:ML.paper, color:ML.warmInk, fontSize:13, fontWeight:600,
      }}>Show this to staff →</button>
    </div>
  </div>;
}

function ReviewScreen({ persona, item }) {
  return <div style={{
    width:'100%', height:'100%', background:ML.ink, color:'#fff',
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54,
  }}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 20px',
      display:'flex', justifyContent:'space-between'}}>
      <span style={{fontSize:13, color:'#fff'}}>✕</span>
      <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>06 / AFTER MEAL</span>
    </div>

    <div style={{padding:'90px 28px 0'}}>
      <div style={{fontFamily:ML.serif, fontSize:34, fontStyle:'italic', lineHeight:1.05, letterSpacing:-0.5}}>
        How was the<br/>
        <span style={{fontFamily:ML.ko, fontStyle:'normal', color:'#fff'}}>{item.ko}</span>?
      </div>
      <div style={{fontSize:12, color:ML.fog, marginTop:10}}>Your answer helps the next traveler.</div>

      {/* 3 lights answer */}
      <div style={{marginTop:48, display:'flex', flexDirection:'column', gap:14}}>
        <ReviewRow color="green" headline="It was great" sub="I'd order it again"/>
        <ReviewRow color="yellow" headline="It was OK" sub="Glad I tried it once" selected/>
        <ReviewRow color="red" headline="Not for me" sub="Wouldn't recommend"/>
      </div>

      {/* Optional note */}
      <div style={{marginTop:30, padding:'14px 16px', background:'rgba(255,255,255,0.04)',
        border:`1px solid ${ML.hairline}`, borderRadius:12}}>
        <div style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:ML.fog, marginBottom:8}}>NOTE FOR FUTURE YOU</div>
        <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:16, color:'#E6E8EC'}}>
          “Spicier than I expected. Ask for less gochujang next time.”
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{position:'absolute', left:20, right:20, bottom:36}}>
      <button style={{
        width:'100%', height:50, borderRadius:14, border:'none', cursor:'pointer',
        background:ML.paper, color:ML.warmInk, fontSize:14, fontWeight:600,
      }}>Save · +1 dish to your map of Korea</button>
    </div>
  </div>;
}

function ReviewRow({color, headline, sub, selected}) {
  return <div style={{
    display:'flex', alignItems:'center', gap:14,
    padding:'14px 16px', borderRadius:14,
    background: selected ? `${ML[color]}10` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${selected ? `${ML[color]}55` : ML.hairline}`,
  }}>
    <SignalLight color={color} size={14}/>
    <div style={{flex:1}}>
      <div style={{fontFamily:ML.serif, fontSize:18, fontStyle:'italic', color:'#fff'}}>{headline}</div>
      <div style={{fontSize:11, color:ML.fog, marginTop:2}}>{sub}</div>
    </div>
    {selected && <span style={{fontFamily:ML.mono, fontSize:10, color:ML[color]}}>SELECTED</span>}
  </div>;
}

window.RouletteScreen = RouletteScreen;
window.ReviewScreen = ReviewScreen;
