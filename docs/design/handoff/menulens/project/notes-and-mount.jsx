// Design system note cards + tweaks panel + mount.

function SystemNote() {
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#F4ECDF', color:'#1A1410', fontFamily:'Inter Tight, sans-serif', overflow:'auto'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#5A4F40', textTransform:'uppercase'}}>NOTE 01</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:42, lineHeight:1.05, marginTop:14, letterSpacing:-0.5, textWrap:'balance'}}>
      A traffic light is a language anyone speaks.
    </div>
    <p style={{fontSize:14, lineHeight:1.55, marginTop:18, color:'#3A2F26', maxWidth:420}}>
      MenuLens stops competing for attention with the menu and starts <em>summarizing</em> it. Three lights. Three answers. <strong>Order freely</strong>. <strong>Ask first</strong>. <strong>Skip</strong>.
    </p>
    <div style={{marginTop:30, display:'flex', flexDirection:'column', gap:18}}>
      <Light c="green" k="Order freely" v="Matches your preferences. Pricing is in line with neighborhood. Default state."/>
      <Light c="yellow" k="Ask first" v="Could contain a soft trigger (sesame, alcohol pairing) or is overpriced by 30%+. The most important light — converts uncertainty into a single action."/>
      <Light c="red" k="Skip" v="Hard violation: contains pork for a halal diner, contains peanut for a peanut allergy. Always shows why."/>
    </div>
    <div style={{marginTop:32, padding:'18px 20px', background:'rgba(26,20,16,0.05)', borderRadius:12, fontSize:13, lineHeight:1.5}}>
      <strong>The signal light is the meta-graphic.</strong> It appears on every screen — as hero, as bullet, as chip. It’s how the app teaches itself in 3 seconds.
    </div>
  </div>;
}

function Light({c, k, v}) {
  const colors = { green:'#3D9F4A', yellow:'#C28D2D', red:'#C73B2B' };
  return <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
    <div style={{width:14, height:14, borderRadius:'50%', background:colors[c], marginTop:5,
      boxShadow:`0 0 0 4px ${colors[c]}22`}}/>
    <div style={{flex:1}}>
      <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:22, color:'#1A1410'}}>{k}</div>
      <div style={{fontSize:13, lineHeight:1.5, color:'#3A2F26', marginTop:3}}>{v}</div>
    </div>
  </div>;
}

function ToneNote() {
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#0E1116', color:'#fff', fontFamily:'Inter Tight, sans-serif', overflow:'auto'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#9AA3AE', textTransform:'uppercase'}}>NOTE 02</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:42, lineHeight:1.05, marginTop:14, letterSpacing:-0.5, textWrap:'balance'}}>
      The room is dim.<br/>The paper is bright.
    </div>
    <p style={{fontSize:14, lineHeight:1.55, marginTop:18, color:'#B6BCC4', maxWidth:420}}>
      Korean restaurants at dinner are warm and dark — the phone screen has to fit that, not fight it. Midnight ground, paper-warm hero. The only moment the UI flips light is the <em>Show Staff</em> card — because that’s the moment the user is handing a piece of paper across the table.
    </p>

    {/* swatches */}
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:28}}>
      <Swatch hex="#0E1116" name="Ink" sub="Ground"/>
      <Swatch hex="#F4ECDF" name="Paper" sub="Hero, staff"/>
      <Swatch hex="#7DDC8A" name="Green" sub="Order freely"/>
      <Swatch hex="#F4C674" name="Yellow" sub="Ask first"/>
      <Swatch hex="#FF6A5A" name="Red" sub="Skip"/>
      <Swatch hex="#9AA3AE" name="Fog" sub="Quiet text"/>
    </div>

    <div style={{marginTop:24, display:'flex', flexDirection:'column', gap:8, fontSize:12, color:'#B6BCC4'}}>
      <div><strong style={{color:'#fff', fontFamily:'Instrument Serif',fontStyle:'italic', fontSize:18, fontWeight:400}}>Instrument Serif</strong> · italics for editorial moments + Korean-romanized names</div>
      <div><strong style={{color:'#fff', fontWeight:600}}>Inter Tight</strong> · UI body, English copy, tight tracking</div>
      <div style={{fontFamily:'Pretendard, sans-serif'}}><strong style={{color:'#fff', fontWeight:600, fontFamily:'Pretendard'}}>Pretendard</strong> · 한글, weight 500–600 — readable across the table</div>
      <div style={{fontFamily:'JetBrains Mono'}}><strong style={{color:'#fff', fontWeight:500, fontFamily:'JetBrains Mono'}}>JetBrains Mono</strong> · index labels, prices, mechanical readouts</div>
    </div>
  </div>;
}

function Swatch({hex, name, sub}) {
  return <div style={{display:'flex', gap:10, alignItems:'center'}}>
    <div style={{width:36, height:36, borderRadius:8, background:hex, border:'1px solid rgba(255,255,255,0.10)'}}/>
    <div>
      <div style={{fontFamily:'JetBrains Mono', fontSize:11, color:'#fff'}}>{hex}</div>
      <div style={{fontSize:10, color:'#9AA3AE'}}>{name} · {sub}</div>
    </div>
  </div>;
}

function DiffNote() {
  const rows = [
    { from:'A long list of dishes the user has to scan', to:'Three lights and a sorted answer' },
    { from:'Translation only', to:'Translation + verdict + reason + price check' },
    { from:'"What does this mean?"', to:'"Should I order this?"' },
    { from:'Dietary preferences hidden in settings', to:'Persona on every screen header' },
    { from:'Tap-to-translate per item', to:'Single Show Staff card the waiter can read across the table' },
    { from:'Generic OCR loading spinner', to:'Five staged steps that show the system thinking' },
    { from:'Stars + reviews', to:'Three-light review — same vocabulary in, same vocabulary out' },
  ];
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#F4ECDF', color:'#1A1410', fontFamily:'Inter Tight, sans-serif', overflow:'auto'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#5A4F40', textTransform:'uppercase'}}>NOTE 03</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:42, lineHeight:1.05, marginTop:14, letterSpacing:-0.5}}>
      What changed.
    </div>
    <p style={{fontSize:14, color:'#3A2F26', marginTop:14, maxWidth:440, lineHeight:1.5}}>
      The bones of MenuLens — OCR, translate, identify allergens — stay. What changed is the <em>verb</em>. The app no longer translates a menu; it tells you what to do about it.
    </p>
    <div style={{marginTop:24, display:'flex', flexDirection:'column'}}>
      {rows.map((r,i)=>(
        <div key={i} style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:14,
          padding:'14px 0', borderBottom:'1px dashed rgba(26,20,16,0.18)', alignItems:'center'}}>
          <div style={{fontSize:13, color:'#7A6A5A', textDecoration:'line-through'}}>{r.from}</div>
          <span style={{fontFamily:'JetBrains Mono', fontSize:14, color:'#1A1410'}}>→</span>
          <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:18, color:'#1A1410', lineHeight:1.2}}>{r.to}</div>
        </div>
      ))}
    </div>
  </div>;
}

// ─── Tweaks panel ────────────────────────────────────────────────
function TweaksPanel({ tweaks, setTweak, onClose }) {
  return <div style={{
    position:'fixed', right:24, bottom:24, width:280, zIndex:100,
    background:'rgba(14,17,22,0.94)', backdropFilter:'blur(14px)',
    color:'#fff', borderRadius:16, padding:18,
    fontFamily:'Inter Tight, sans-serif',
    border:'1px solid rgba(255,255,255,0.10)',
    boxShadow:'0 30px 60px rgba(0,0,0,0.45)',
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
      <div>
        <div style={{fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:1.5, color:'#9AA3AE'}}>TWEAKS</div>
        <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:22, marginTop:2}}>Try a persona</div>
      </div>
      <button onClick={onClose} style={{background:'none', border:'none', color:'#9AA3AE', cursor:'pointer', fontSize:18}}>✕</button>
    </div>
    {Object.values(window.MENULENS_PERSONAS).map(p=>(
      <button key={p.id} onClick={()=>setTweak('persona', p.id)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:12, marginBottom:8,
        padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
        background: tweaks.persona===p.id ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${tweaks.persona===p.id ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)'}`,
        color:'#fff', fontFamily:'inherit',
      }}>
        <span style={{fontFamily:'JetBrains Mono', fontSize:10, color:'#9AA3AE'}}>{p.flag}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:500}}>{p.name}</div>
          <div style={{fontSize:11, color:'#9AA3AE'}}>{p.diet} · {p.desc}</div>
        </div>
        {tweaks.persona===p.id && <SignalLight color="green" size={8} ring={false}/>}
      </button>
    ))}
    <div style={{marginTop:8, fontSize:11, color:'#5A6470', lineHeight:1.4}}>
      Switching changes every screen — the lights, the chips, the staff card.
    </div>
  </div>;
}

window.SystemNote = SystemNote;
window.ToneNote = ToneNote;
window.DiffNote = DiffNote;
window.TweaksPanel = TweaksPanel;

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(window.MenuLensApp));
