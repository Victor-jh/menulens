// Friendly screens — Show Staff (보여주기) + Detail
function ShowStaffFriendly({ persona, item }) {
  const personaNotes = {
    yui:   { ko:'돼지고기, 닭고기 못 먹어요. 해산물은 괜찮아요.', en:'No pork or chicken. Seafood is fine.' },
    malik: { ko:'할랄 음식만 먹어요. 돼지고기, 술 안 돼요.',     en:'Halal only. No pork, no alcohol.' },
    chen:  { ko:'땅콩, 참기름 알레르기 심해요. 주의해주세요!',    en:'Severe peanut + sesame allergy. Please be careful.' },
    john:  { ko:'알러지 없어요. 지역 추천 부탁드려요!',          en:'No allergies. A local recommendation, please!' },
  };
  const note = personaNotes[persona.id] || personaNotes.yui;

  return <div style={{width:'100%', height:'100%', background:FR.cream, color:FR.ink,
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54}}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 18px',
      display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:5}}>
      <span style={{fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600}}>← 뒤로</span>
      <span style={{fontFamily:ML.ko, fontSize:11, letterSpacing:1, color:FR.pickle, fontWeight:700,
        padding:'5px 10px', background:FR.pickleSoft, borderRadius:99}}>📝 직원에게</span>
      <span style={{fontFamily:ML.ko, fontSize:13, color:FR.fog}}>♡</span>
    </div>

    <div style={{position:'absolute', top:108, left:24, right:24}}>
      <div style={{fontFamily:ML.ko, fontSize:24, fontWeight:800, lineHeight:1.2, letterSpacing:-0.8, color:FR.ink}}>
        직원분께<br/>이 화면을 보여주세요 👇
      </div>
      <div style={{fontFamily:ML.ko, fontSize:12, color:FR.inkSoft, marginTop:8}}>한 번에 알아보실 거예요!</div>
    </div>

    <div style={{position:'absolute', top:212, left:18, right:18,
      background:'#FFFCF2', borderRadius:18,
      padding:'22px 22px 20px',
      boxShadow:'0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,26,20,0.04)',
      transform:'rotate(-1deg)',
      backgroundImage:'repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(31,26,20,0.04) 27px, rgba(31,26,20,0.04) 28px)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center',
        paddingBottom:10, marginBottom:14, borderBottom:`1px dashed ${FR.border}`}}>
        <span style={{fontFamily:ML.ko, fontSize:11, color:FR.fog, fontWeight:600}}>📝 직원분께</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:5,
          padding:'3px 9px', borderRadius:99, background:FR.pickleSoft,
          fontFamily:ML.ko, fontSize:10, color:FR.pickle, fontWeight:700}}>🥒 안전 메뉴</span>
      </div>
      <div style={{fontFamily:ML.ko, fontSize:26, lineHeight:1.25, color:FR.ink, fontWeight:800, letterSpacing:-0.5}}>
        {item.orderPhrase || (item.ko + ' 하나 주세요')}
      </div>
      <div style={{fontFamily:ML.ko, fontSize:13, color:FR.inkSoft, marginTop:6, fontStyle:'italic'}}>
        “{item.en} 하나 주세요”
      </div>
      <div style={{marginTop:18, padding:'14px 14px',
        background:FR.honeySoft, borderRadius:12, border:`1px solid ${FR.honey}33`}}>
        <div style={{fontFamily:ML.ko, fontSize:11, color:FR.honey, fontWeight:700, marginBottom:6}}>
          ⚠️ 꼭 알려주세요
        </div>
        <div style={{fontFamily:ML.ko, fontSize:16, lineHeight:1.4, color:FR.ink, fontWeight:600, letterSpacing:-0.3}}>
          {note.ko}
        </div>
        <div style={{fontFamily:ML.ko, fontSize:11, color:FR.inkSoft, marginTop:6, fontStyle:'italic'}}>
          {note.en}
        </div>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:16,
        paddingTop:10, borderTop:`1px dashed ${FR.border}`,
        fontFamily:ML.mono, fontSize:9, color:FR.fog, letterSpacing:0.5}}>
        <span>via 메뉴렌즈</span>
        <span>{item.romanized}</span>
      </div>
    </div>

    <div style={{position:'absolute', left:0, right:0, bottom:0, padding:'18px 18px 30px',
      background:`linear-gradient(180deg, transparent, ${FR.cream} 30%)`,
      display:'flex', flexDirection:'column', gap:10}}>
      <button style={{height:54, borderRadius:14, border:'none', cursor:'pointer',
        background:FR.pickle, color:'#fff',
        fontFamily:ML.ko, fontSize:15, fontWeight:700,
        boxShadow:`0 6px 18px ${FR.pickle}50`,
        display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>🔊 소리로 들려주기</button>
      <div style={{display:'flex', gap:8}}>
        <button style={ghostBtnFR}>↗ 공유</button>
        <button style={ghostBtnFR}>💾 저장</button>
      </div>
    </div>
  </div>;
}

const ghostBtnFR = {
  flex:1, height:42, borderRadius:12, cursor:'pointer',
  background:FR.cream2, color:FR.ink,
  border:`1px solid ${FR.border}`,
  fontFamily:ML.ko, fontSize:12, fontWeight:600,
};

function DetailFriendly({ persona, item }) {
  const c = window.menulensColorFor(item, persona);
  const tone = FR_TONE[c];
  const reasons = window.menulensReasonsFor ? window.menulensReasonsFor(item, persona) : [];
  const labelTxt = c==='green' ? '맘껏 드세요' : c==='yellow' ? '한 번 물어봐요' : '이건 패스';

  return <div style={{width:'100%', height:'100%', background:FR.cream, color:FR.ink,
    fontFamily:ML.sans, position:'relative', overflow:'auto', paddingTop:54}}>
    <div style={{position:'sticky', top:0, zIndex:5, background:`${FR.cream}f5`, backdropFilter:'blur(14px)',
      padding:'10px 18px', display:'flex', justifyContent:'space-between', alignItems:'center',
      borderBottom:`1px solid ${FR.border}`}}>
      <span style={{fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600}}>← 뒤로</span>
      <span style={{display:'inline-flex', alignItems:'center', gap:6,
        padding:'5px 12px', borderRadius:99, background:tone.soft,
        fontFamily:ML.ko, fontSize:11, color:tone.c, fontWeight:700}}>
        {tone.emoji} {labelTxt}
      </span>
      <span style={{fontFamily:ML.ko, fontSize:14, color:FR.fog}}>♡</span>
    </div>

    <div style={{padding:'24px 24px 0', display:'flex', gap:16, alignItems:'flex-start'}}>
      <div style={{width:88, height:88, borderRadius:18, background:tone.soft,
        display:'grid', placeItems:'center',
        fontFamily:ML.ko, fontSize:32, fontWeight:800, color:tone.c,
        flexShrink:0, position:'relative'}}>
        {item.ko.slice(0,1)}
        <span style={{position:'absolute', top:-6, right:-6, width:24, height:24, borderRadius:'50%',
          background:tone.c, fontSize:13, display:'grid', placeItems:'center',
          border:`2px solid ${FR.cream}`}}>{tone.emoji}</span>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontFamily:ML.ko, fontSize:26, fontWeight:800, color:FR.ink, lineHeight:1.15, letterSpacing:-0.8}}>{item.ko}</div>
        <div style={{fontFamily:ML.ko, fontSize:12, color:FR.fog, marginTop:4, fontStyle:'italic'}}>{item.en}</div>
        <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
          <ChipFR>{item.category}</ChipFR>
          <ChipFR>{item.servingTemp}</ChipFR>
          {item.spicy>0 && <ChipFR>{'🌶'.repeat(item.spicy)}</ChipFR>}
        </div>
      </div>
    </div>

    <div style={{padding:'24px 24px 0'}}>
      <SectionTitleFR label="이게 뭔가요?"/>
      <div style={{fontFamily:ML.ko, fontSize:15, lineHeight:1.55, color:FR.ink, marginTop:8, textWrap:'pretty'}}>
        {item.desc}
      </div>
    </div>

    {reasons.length>0 && <div style={{padding:'24px 24px 0'}}>
      <SectionTitleFR label={c==='red'?'왜 패스해야 해요?':'왜 물어봐야 해요?'}/>
      <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:10}}>
        {reasons.map((r,i)=>(
          <div key={i} style={{display:'flex', gap:10, alignItems:'center',
            padding:'12px 14px', background:tone.soft, borderRadius:12}}>
            <span style={{fontSize:14}}>{tone.emoji}</span>
            <span style={{fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600}}>{r}</span>
          </div>
        ))}
      </div>
    </div>}

    <div style={{padding:'24px 24px 0'}}>
      <SectionTitleFR label="들어가는 재료"/>
      <div style={{display:'flex', flexDirection:'column', gap:1, marginTop:8,
        background:FR.border, borderRadius:14, overflow:'hidden'}}>
        {item.ingredients.map((ing, i) => {
          const flagged = ing.allergen.some(a => persona.avoid.includes(a));
          return <div key={i} style={{display:'flex', alignItems:'center', gap:12,
            padding:'12px 14px', background: FR.cream2}}>
            <span style={{width:8, height:8, borderRadius:'50%', background: flagged?FR.blush:FR.pickle}}/>
            <span style={{fontFamily:ML.ko, fontSize:14, color:FR.ink, fontWeight:600, minWidth:80}}>{ing.ko}</span>
            <span style={{fontSize:11, color:FR.fog}}>{ing.en}</span>
            <span style={{marginLeft:'auto', fontFamily:ML.ko, fontSize:10, fontWeight:700,
              padding:'3px 8px', borderRadius:99,
              background: flagged?FR.blushSoft:FR.pickleSoft, color:flagged?FR.blush:FR.pickle}}>
              {flagged ? '주의' : (ing.allergen[0] || '안전')}
            </span>
          </div>;
        })}
      </div>
    </div>

    <div style={{padding:'24px 24px 0'}}>
      <SectionTitleFR label="한국 사람들은 이렇게 먹어요"/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10}}>
        <FactTileFR label="언제" value={item.when}/>
        <FactTileFR label="유래" value={item.origin}/>
        <FactTileFR label="같이 먹어요" value={item.pairsWith.join(' · ')}/>
        <FactTileFR label="평균 가격" value={item.typicalPrice}/>
      </div>
    </div>

    <div style={{padding:'24px 18px 50px'}}>
      {c!=='red' ? (
        <button style={{width:'100%', height:54, borderRadius:14, border:'none', cursor:'pointer',
          background:FR.pickle, color:'#fff',
          fontFamily:ML.ko, fontSize:15, fontWeight:700,
          boxShadow:`0 6px 18px ${FR.pickle}50`,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>📝 직원에게 보여주기</button>
      ) : (
        <button style={{width:'100%', height:54, borderRadius:14, cursor:'pointer',
          background:FR.blushSoft, color:FR.blush,
          border:`1px solid ${FR.blush}55`,
          fontFamily:ML.ko, fontSize:14, fontWeight:700}}>비슷한 다른 메뉴 찾기 →</button>
      )}
    </div>
  </div>;
}

function SectionTitleFR({label}) {
  return <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, fontWeight:700, letterSpacing:-0.2,
    display:'flex', alignItems:'center', gap:8}}>
    <span>{label}</span>
    <span style={{flex:1, height:1, background:FR.border}}/>
  </div>;
}

function ChipFR({children}) {
  return <span style={{padding:'4px 10px', borderRadius:99, background:FR.cream2, border:`1px solid ${FR.border}`,
    fontFamily:ML.ko, fontSize:11, color:FR.inkSoft, fontWeight:600}}>{children}</span>;
}

function FactTileFR({label, value}) {
  return <div style={{padding:'12px 14px', background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:12}}>
    <div style={{fontFamily:ML.ko, fontSize:11, color:FR.fog, fontWeight:600}}>{label}</div>
    <div style={{fontFamily:ML.ko, fontSize:14, color:FR.ink, fontWeight:700, marginTop:4, lineHeight:1.3, letterSpacing:-0.3}}>{value}</div>
  </div>;
}

window.ShowStaffFriendly = ShowStaffFriendly;
window.DetailFriendly = DetailFriendly;
