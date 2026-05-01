// Capture screen — viewfinder with edge alignment + scan progress.

function CaptureScreen({ stage = 'aim' }) {
  // stage: 'aim' | 'scanning' | 'parsing'
  const isAim = stage === 'aim';
  const isScan = stage === 'scanning';
  const isParse = stage === 'parsing';

  return (
    <div style={{
      width:'100%', height:'100%', background:'#000', color:'#fff',
      fontFamily:ML.sans, position:'relative', overflow:'hidden',
      paddingTop:54,
    }}>
      {/* Top bar */}
      <div style={{position:'absolute', top:54, left:0, right:0, padding:'14px 20px',
        display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:5}}>
        <span style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.5, color:ML.fog}}>02 / SCAN</span>
        <span style={{
          padding:'4px 9px', borderRadius:99, background:'rgba(255,255,255,0.10)',
          fontSize:11, color:'#fff', backdropFilter:'blur(8px)',
        }}>✕ Close</span>
      </div>

      {/* Faux camera feed — moody warm restaurant scene rendered as gradients + lines */}
      <div style={{position:'absolute', inset:0,
        background:'radial-gradient(120% 80% at 50% 30%, #2A1A12 0%, #120A07 60%, #050302 100%)',
        opacity: isAim ? 1 : 0.55, transition:'opacity .4s'
      }}>
        {/* faux menu sheet */}
        <div style={{
          position:'absolute', left:'50%', top:'52%', transform:'translate(-50%,-50%) rotate(-2deg)',
          width:240, height:300, background:ML.paper, borderRadius:4,
          boxShadow:'0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          padding:'22px 18px', color:ML.warmInk, fontFamily:ML.ko, fontSize:11, lineHeight:1.7,
          opacity: 0.92,
        }}>
          <div style={{fontFamily:ML.serif, fontSize:22, fontStyle:'italic',
            borderBottom:'1px solid #1A141033', paddingBottom:8, marginBottom:10}}>차림표</div>
          {['김치찌개  8,000','된장찌개  7,500','참치김밥  4,500','비빔밥  9,000','제육볶음  9,500','해물파전  14,000','공깃밥  1,000','단무지  무료'].map((r,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dotted #1A141022', paddingBottom:3, marginBottom:3}}>
              <span>{r.split('  ')[0]}</span>
              <span style={{fontFamily:ML.mono, fontSize:10}}>{r.split('  ')[1]}</span>
            </div>
          ))}
        </div>

        {/* Glass / blur ring around menu while scanning */}
        {isScan && <div style={{
          position:'absolute', left:'50%', top:'52%', transform:'translate(-50%,-50%) rotate(-2deg)',
          width:280, height:340, borderRadius:8,
          boxShadow:'inset 0 0 0 2px #7DDC8A, 0 0 60px #7DDC8A55',
          animation:'mlpulse 1.6s ease-in-out infinite',
        }} />}
      </div>

      {/* Viewfinder corners (only during AIM) */}
      {isAim && <Corners />}

      {/* Scan beam */}
      {isScan && <div style={{
        position:'absolute', left:0, right:0, top:0, height:'100%',
        background:'linear-gradient(180deg, transparent, #7DDC8A33 49%, #7DDC8A 50%, #7DDC8A33 51%, transparent)',
        backgroundSize:'100% 220%', animation:'mlbeam 2.2s linear infinite',
        pointerEvents:'none', mixBlendMode:'screen',
      }}/>}

      {/* Status pill */}
      <div style={{position:'absolute', left:0, right:0, top:'42%', display:'flex', justifyContent:'center'}}>
        <div style={{
          padding:'10px 16px', borderRadius:99, background:'rgba(0,0,0,0.55)',
          border:`1px solid ${ML.hairline}`, backdropFilter:'blur(12px)',
          display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#fff',
        }}>
          {isAim && (<><SignalLight color="yellow" size={8} glow={false} ring={false} /> <span>Hold steady — frame the whole menu</span></>)}
          {isScan && (<><SignalLight color="green" size={8} /> <span>Reading characters · 64 of 142</span></>)}
          {isParse && (<><SignalLight color="green" size={8} /> <span>Matching dishes against {`{Yui}`} preferences…</span></>)}
        </div>
      </div>

      {/* Bottom panel — capture chrome */}
      <div style={{position:'absolute', left:0, right:0, bottom:0, padding:'24px 24px 44px',
        background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
      }}>
        {!isParse && <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, gap:14}}>
          <Mode active={!isScan} label="Live" />
          <Mode active={false} label="Photo" />
          <Mode active={false} label="Multi-page" />
        </div>}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{width:46, height:46, borderRadius:10, border:`1px solid ${ML.hairline}`, display:'grid', placeItems:'center', fontSize:11, color:ML.fog}}>↑ Upload</div>
          <button style={{
            width:74, height:74, borderRadius:'50%', border:'3px solid #fff',
            background: isScan ? ML.red : '#fff', cursor:'pointer',
            boxShadow:'0 0 0 4px rgba(255,255,255,0.10)',
            transition:'background .3s',
          }}/>
          <div style={{width:46, height:46, borderRadius:10, border:`1px solid ${ML.hairline}`, display:'grid', placeItems:'center', fontSize:14, color:ML.fog}}>⚡</div>
        </div>
      </div>

      {/* Parsing overlay (full-screen) */}
      {isParse && <ParseOverlay />}

      <style>{`
        @keyframes mlbeam { 0%{background-position:0% 100%} 100%{background-position:0% -100%} }
        @keyframes mlpulse { 0%,100%{box-shadow:inset 0 0 0 2px #7DDC8A, 0 0 60px #7DDC8A55} 50%{box-shadow:inset 0 0 0 2px #7DDC8A, 0 0 100px #7DDC8A99} }
      `}</style>
    </div>
  );
}

function Corners() {
  const c = '#7DDC8A';
  const s = {position:'absolute', width:32, height:32, borderColor:c, borderStyle:'solid'};
  return <>
    <div style={{...s, left:36, top:'24%', borderTop:'2px solid', borderLeft:'2px solid'}}/>
    <div style={{...s, right:36, top:'24%', borderTop:'2px solid', borderRight:'2px solid'}}/>
    <div style={{...s, left:36, bottom:'30%', borderBottom:'2px solid', borderLeft:'2px solid'}}/>
    <div style={{...s, right:36, bottom:'30%', borderBottom:'2px solid', borderRight:'2px solid'}}/>
  </>;
}

function Mode({active, label}) {
  return <div style={{
    fontFamily:ML.mono, fontSize:11, letterSpacing:1.4, color: active ? '#fff' : ML.fog,
    padding:'4px 0', textTransform:'uppercase',
    borderBottom: active ? '1px solid #fff' : '1px solid transparent',
  }}>{label}</div>;
}

function ParseOverlay() {
  const steps = [
    { t:'Reading text', s:'done' },
    { t:'Translating', s:'done' },
    { t:'Matching prices to nearby restaurants', s:'doing' },
    { t:'Cross-checking your preferences', s:'idle' },
    { t:'Sorting by signal', s:'idle' },
  ];
  return <div style={{position:'absolute', inset:0, background:'rgba(5,3,2,0.78)',
    backdropFilter:'blur(10px)', display:'flex', flexDirection:'column', justifyContent:'flex-end',
    padding:'0 24px 44px',
  }}>
    <div style={{fontFamily:ML.serif, fontSize:38, lineHeight:1, letterSpacing:-0.5, color:'#fff', marginBottom:24}}>
      Reading…
    </div>
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex', alignItems:'center', gap:12}}>
          <SignalLight color={s.s==='done'?'green':s.s==='doing'?'yellow':'#3A3A3A'} size={10} glow={s.s!=='idle'} ring={false}/>
          <span style={{fontSize:13, color: s.s==='idle'?ML.mute:'#E6E8EC'}}>{s.t}</span>
          {s.s==='doing' && <span style={{fontFamily:ML.mono, fontSize:10, color:ML.fog, marginLeft:'auto'}}>· · ·</span>}
        </div>
      ))}
    </div>
  </div>;
}

window.CaptureScreen = CaptureScreen;
