// Print-only — re-export note components without mounting App.

function SystemNote() {
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#F4ECDF', color:'#1A1410', fontFamily:'Inter Tight, sans-serif', overflow:'hidden'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#5A4F40', textTransform:'uppercase'}}>NOTE 01</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:64, lineHeight:1.05, marginTop:14, letterSpacing:-1, textWrap:'balance', maxWidth:780}}>
      A traffic light is a language anyone speaks.
    </div>
    <p style={{fontSize:15, lineHeight:1.55, marginTop:18, color:'#3A2F26', maxWidth:560}}>
      MenuLens stops competing for attention with the menu and starts <em>summarizing</em> it. Three lights. Three answers. <strong>Order freely</strong>. <strong>Ask first</strong>. <strong>Skip</strong>.
    </p>
    <div style={{marginTop:30, display:'flex', flexDirection:'column', gap:18, maxWidth:680}}>
      <PLight c="green" k="Order freely" v="Matches your preferences. Pricing is in line with neighborhood. Default state."/>
      <PLight c="yellow" k="Ask first" v="Could contain a soft trigger (sesame, alcohol pairing) or is overpriced by 30%+. The most important light — converts uncertainty into a single action."/>
      <PLight c="red" k="Skip" v="Hard violation: contains pork for a halal diner, contains peanut for a peanut allergy. Always shows why."/>
    </div>
    <div style={{marginTop:32, padding:'18px 20px', background:'rgba(26,20,16,0.05)', borderRadius:12, fontSize:14, lineHeight:1.5, maxWidth:680}}>
      <strong>The signal light is the meta-graphic.</strong> It appears on every screen — as hero, as bullet, as chip. It’s how the app teaches itself in 3 seconds.
    </div>
  </div>;
}

function PLight({c, k, v}) {
  const colors = { green:'#3D9F4A', yellow:'#C28D2D', red:'#C73B2B' };
  return <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
    <div style={{width:14, height:14, borderRadius:'50%', background:colors[c], marginTop:5, boxShadow:`0 0 0 4px ${colors[c]}22`}}/>
    <div style={{flex:1}}>
      <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:24, color:'#1A1410'}}>{k}</div>
      <div style={{fontSize:14, lineHeight:1.5, color:'#3A2F26', marginTop:3}}>{v}</div>
    </div>
  </div>;
}

function ToneNote() {
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#0E1116', color:'#fff', fontFamily:'Inter Tight, sans-serif', overflow:'hidden'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#9AA3AE', textTransform:'uppercase'}}>NOTE 02</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:64, lineHeight:1.05, marginTop:14, letterSpacing:-1}}>
      The room is dim.<br/>The paper is bright.
    </div>
    <p style={{fontSize:15, lineHeight:1.55, marginTop:18, color:'#B6BCC4', maxWidth:560}}>
      Korean restaurants at dinner are warm and dark — the phone screen has to fit that, not fight it. Midnight ground, paper-warm hero. The only moment the UI flips light is the <em>Show Staff</em> card — because that’s when the user is handing a piece of paper across the table.
    </p>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:28, maxWidth:680}}>
      <PSwatch hex="#0E1116" name="Ink" sub="Ground"/>
      <PSwatch hex="#F4ECDF" name="Paper" sub="Hero"/>
      <PSwatch hex="#7DDC8A" name="Green" sub="Order"/>
      <PSwatch hex="#F4C674" name="Yellow" sub="Ask"/>
      <PSwatch hex="#FF6A5A" name="Red" sub="Skip"/>
      <PSwatch hex="#9AA3AE" name="Fog" sub="Quiet"/>
    </div>
  </div>;
}

function PSwatch({hex, name, sub}) {
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
    { from:'Tap-to-translate per item', to:'A single Show Staff card the waiter can read across the table' },
    { from:'Generic OCR loading spinner', to:'Five staged steps that show the system thinking' },
    { from:'Stars + reviews', to:'Three-light review — same vocabulary in, same vocabulary out' },
  ];
  return <div style={{padding:'40px 36px', height:'100%', boxSizing:'border-box',
    background:'#F4ECDF', color:'#1A1410', fontFamily:'Inter Tight, sans-serif', overflow:'hidden'}}>
    <div style={{fontFamily:'JetBrains Mono', fontSize:11, letterSpacing:1.5, color:'#5A4F40', textTransform:'uppercase'}}>NOTE 03</div>
    <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:64, lineHeight:1.05, marginTop:14, letterSpacing:-1}}>What changed.</div>
    <p style={{fontSize:14, color:'#3A2F26', marginTop:14, maxWidth:560, lineHeight:1.5}}>
      The bones of MenuLens — OCR, translate, identify allergens — stay. What changed is the <em>verb</em>. The app no longer translates a menu; it tells you what to do about it.
    </p>
    <div style={{marginTop:18, display:'flex', flexDirection:'column', maxWidth:880}}>
      {rows.map((r,i)=>(
        <div key={i} style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:14,
          padding:'10px 0', borderBottom:'1px dashed rgba(26,20,16,0.18)', alignItems:'center'}}>
          <div style={{fontSize:13, color:'#7A6A5A', textDecoration:'line-through'}}>{r.from}</div>
          <span style={{fontFamily:'JetBrains Mono', fontSize:14, color:'#1A1410'}}>→</span>
          <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:18, color:'#1A1410', lineHeight:1.2}}>{r.to}</div>
        </div>
      ))}
    </div>
  </div>;
}

window.SystemNote = SystemNote;
window.ToneNote = ToneNote;
window.DiffNote = DiffNote;
