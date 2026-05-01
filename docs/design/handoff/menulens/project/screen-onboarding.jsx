// Onboarding screen — 3-light hero metaphor.

function OnboardingScreen({ persona }) {
  return (
    <div style={{
      width:'100%', height:'100%', background:ML.ink, color:'#fff',
      fontFamily: ML.sans, position:'relative', overflow:'hidden',
      paddingTop:54, // status bar
    }}>
      {/* faint vertical rule + index label */}
      <div style={{position:'absolute', top:54, left:0, right:0, padding:'18px 22px',
        display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <IndexLabel n="01" label="Welcome" />
        <span style={{fontFamily:ML.serif, fontStyle:'italic', fontSize:18, color:'#E6E8EC'}}>MenuLens</span>
      </div>

      {/* Hero stack of 3 lights */}
      <div style={{
        position:'absolute', left:0, right:0, top:120,
        display:'flex', flexDirection:'column', alignItems:'center', gap:34,
      }}>
        <div style={{display:'flex', flexDirection:'column', gap:30, alignItems:'center'}}>
          <SignalLight color="red" size={26} />
          <SignalLight color="yellow" size={26} />
          <SignalLight color="green" size={26} />
        </div>
      </div>

      {/* Headline + persona summary */}
      <div style={{position:'absolute', left:24, right:24, bottom:200}}>
        <div style={{fontFamily:ML.serif, fontSize:46, lineHeight:1.02, letterSpacing:-1,
          color:'#fff', textWrap:'balance'}}>
          Three lights.<br/>
          <em style={{color:ML.fog, fontStyle:'italic'}}>One menu you can read.</em>
        </div>
        <p style={{marginTop:16, fontSize:14, lineHeight:1.5, color:'#B6BCC4', maxWidth:300}}>
          Point your phone at any Korean menu. We tell you what to eat, what to ask about, and what to skip — for <span style={{color:'#fff'}}>{persona.name}</span>.
        </p>
      </div>

      {/* Persona tile */}
      <div style={{position:'absolute', left:24, right:24, bottom:120,
        background:'rgba(255,255,255,0.04)', border:`1px solid ${ML.hairline}`,
        borderRadius:14, padding:'12px 14px',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:38, height:38, borderRadius:'50%',
          background:'linear-gradient(135deg,#3B2E2A,#1A1410)', display:'grid', placeItems:'center',
          fontFamily:ML.serif, fontSize:18, color:ML.paper, fontStyle:'italic',
        }}>{persona.name[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, color:'#fff', fontWeight:500}}>{persona.name} · <span style={{color:ML.fog, fontWeight:400}}>{persona.diet}</span></div>
          <div style={{fontSize:11, color:ML.fog, marginTop:2}}>{persona.desc}</div>
        </div>
        <div style={{fontFamily:ML.mono, fontSize:10, color:ML.fog, letterSpacing:1}}>EDIT</div>
      </div>

      {/* CTA */}
      <div style={{position:'absolute', left:24, right:24, bottom:48}}>
        <button style={{
          width:'100%', height:54, borderRadius:14, border:'none',
          background: ML.paper, color:ML.warmInk,
          fontFamily:ML.sans, fontSize:15, fontWeight:600, letterSpacing:0.2,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          cursor:'pointer',
        }}>
          <span style={{
            width:20, height:20, borderRadius:6, border:`1.5px solid ${ML.warmInk}`,
            display:'grid', placeItems:'center',
          }}>
            <span style={{width:6, height:6, borderRadius:'50%', background:ML.red}} />
          </span>
          Scan a menu
        </button>
        <div style={{textAlign:'center', marginTop:12, fontSize:12, color:ML.fog}}>
          or <span style={{color:'#fff', textDecoration:'underline', textUnderlineOffset:3}}>upload a photo</span>
        </div>
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;
