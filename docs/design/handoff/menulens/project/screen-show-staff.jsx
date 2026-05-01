// Show-Staff screen — the hero. Big Korean order phrase, paper card, persona note.

function ShowStaffScreen({ persona, item }) {
  return (
    <div style={{
      width:'100%', height:'100%', background:ML.ink, color:'#fff',
      fontFamily:ML.sans, position:'relative', overflow:'hidden',
      paddingTop:54,
    }}>
      {/* Top */}
      <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 18px',
        display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:5}}>
        <span style={{fontSize:13, color:'#fff'}}>← Back</span>
        <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>SHOW STAFF</span>
        <span style={{fontSize:13, color:ML.fog}}>♡</span>
      </div>

      {/* Pre-headline */}
      <div style={{position:'absolute', top:108, left:24, right:24}}>
        <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:22, color:ML.fog, lineHeight:1.15}}>
          Show this to your server.<br/>
          <span style={{color:'#fff', fontStyle:'normal', fontFamily:ML.sans, fontSize:13, letterSpacing:0.4, textTransform:'uppercase'}}>
            They will read it instantly.
          </span>
        </div>
      </div>

      {/* THE PAPER CARD */}
      <div style={{position:'absolute', top:208, left:18, right:18,
        background:ML.paper, borderRadius:18,
        padding:'24px 22px 22px',
        boxShadow:'0 30px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.04)',
        color:ML.warmInk,
        transform:'rotate(-0.6deg)',
      }}>
        {/* tiny header strip */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center',
          paddingBottom:10, borderBottom:'1px dashed rgba(26,20,16,0.18)', marginBottom:14}}>
          <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.5, color:'rgba(26,20,16,0.55)'}}>FOR THE STAFF</span>
          <div style={{display:'flex', alignItems:'center', gap:6, fontFamily:ML.mono, fontSize:10, color:'rgba(26,20,16,0.55)'}}>
            <span style={{width:6,height:6,borderRadius:'50%', background:'#7DDC8A'}}/> SAFE FOR {persona.name.toUpperCase()}
          </div>
        </div>

        {/* Order request — the big Korean line */}
        <div style={{fontFamily:ML.ko, fontSize:30, lineHeight:1.18, color:ML.warmInk, fontWeight:600, letterSpacing:-0.5, textWrap:'balance'}}>
          {item.orderPhrase || (item.ko + ' \uD558\uB098 \uC8FC\uC138\uC694')}
        </div>
        <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:14, color:'rgba(26,20,16,0.55)', marginTop:6}}>
          “One {item.en.toLowerCase()}, please.”
        </div>

        {/* Persona note (the part written FOR THE STAFF) */}
        <div style={{marginTop:22, padding:'14px 14px', background:'rgba(26,20,16,0.05)',
          borderRadius:12, border:'1px solid rgba(26,20,16,0.10)'}}>
          <div style={{fontFamily:ML.mono, fontSize:9, letterSpacing:1.4, color:'rgba(26,20,16,0.55)', marginBottom:6}}>
            중요 · IMPORTANT
          </div>
          <div style={{fontFamily:ML.ko, fontSize:18, lineHeight:1.35, color:ML.warmInk, fontWeight:500}}>
            {persona.id==='yui'   && '\uB3FC\uC9C0\uACE0\uAE30, \uB2ED\uACE0\uAE30 \uBABB \uBA39\uC5B4\uC694. \uD574\uC0B0\uBB3C\uC740 \uAD1C\uCC2E\uC544\uC694.'}
            {persona.id==='malik' && '\uD560\uB78C \uC74C\uC2DD\uB9CC \uBA39\uC5B4\uC694. \uB3FC\uC9C0\uACE0\uAE30, \uC220 \uC548 \uB418\uC694.'}
            {persona.id==='chen'  && '\uB545\uCF69, \uCC38\uAE30\uB984 \uC54C\uB808\uB974\uAE30 \uC2EC\uD574\uC694. \uC8FC\uC758!'}
            {persona.id==='john'  && '\uC54C\uB808\uB974\uAE30 \uC5C6\uC5B4\uC694. \uC9C0\uC5ED \uCD94\uCC9C \uC791 \uBD80\uD0C1\uB4DC\uB824\uC694.'}
          </div>
          <div style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:12, color:'rgba(26,20,16,0.55)', marginTop:6}}>
            {persona.id==='yui'   && 'I cannot eat pork or chicken. Seafood is fine.'}
            {persona.id==='malik' && 'Halal only. No pork, no alcohol, please.'}
            {persona.id==='chen'  && 'Severe peanut and sesame oil allergy. Please be careful.'}
            {persona.id==='john'  && 'No allergies. Local recommendation, please!'}
          </div>
        </div>

        {/* footer rails */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:18,
          paddingTop:12, borderTop:'1px dashed rgba(26,20,16,0.18)'}}>
          <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:'rgba(26,20,16,0.55)'}}>
            via MenuLens · {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
          </span>
          <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:'rgba(26,20,16,0.55)'}}>
            {item.romanized}
          </span>
        </div>
      </div>

      {/* Bottom action rail */}
      <div style={{position:'absolute', left:0, right:0, bottom:0, padding:'18px 18px 36px',
        background:`linear-gradient(180deg, transparent, ${ML.ink} 30%)`,
        display:'flex', flexDirection:'column', gap:10}}>
        <button style={{
          height:54, borderRadius:14, border:'none', cursor:'pointer',
          background:ML.paper, color:ML.warmInk,
          fontFamily:ML.sans, fontSize:14, fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        }}>
          <SoundIcon/> Play out loud
        </button>
        <div style={{display:'flex', gap:10}}>
          <button style={ghostBtn}>↗ Share / SMS</button>
          <button style={ghostBtn}>⌟ Save offline</button>
        </div>
      </div>
    </div>
  );
}

const ghostBtn = {
  flex:1, height:42, borderRadius:11, cursor:'pointer',
  background:'rgba(255,255,255,0.04)', color:'#fff',
  border:`1px solid ${ML.hairline}`,
  fontFamily:ML.sans, fontSize:12, fontWeight:500,
};

function SoundIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>
  </svg>;
}

window.ShowStaffScreen = ShowStaffScreen;
