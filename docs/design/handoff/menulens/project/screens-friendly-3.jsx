// Friendly screens — Roulette + Review
function RouletteFriendly({ persona, items }) {
  const greens = items.filter(it => window.menulensColorFor(it, persona)==='green' && !it.isFreeSide);
  const winner = greens[0] || items[0];

  return <div style={{width:'100%', height:'100%', background:FR.cream, color:FR.ink,
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54}}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 18px',
      display:'flex', justifyContent:'space-between'}}>
      <span style={{fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600}}>← 뒤로</span>
      <span style={{padding:'5px 12px', borderRadius:99, background:FR.pickleSoft,
        fontFamily:ML.ko, fontSize:11, color:FR.pickle, fontWeight:700}}>🎲 골라줄게요</span>
    </div>

    <div style={{position:'absolute', top:104, left:24, right:24}}>
      <div style={{fontSize:40}}>🤷‍♀️</div>
      <div style={{fontFamily:ML.ko, fontSize:28, fontWeight:800, lineHeight:1.2, letterSpacing:-0.8, color:FR.ink, marginTop:8}}>
        고민될 땐<br/><span style={{color:FR.pickle}}>제가 골라드릴게요!</span>
      </div>
    </div>

    <div style={{position:'absolute', top:240, left:18, right:18,
      background:FR.cream2, border:`2px solid ${FR.pickle}`,
      borderRadius:20, padding:'24px 22px',
      boxShadow:`0 12px 32px ${FR.pickle}30`}}>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:5,
          padding:'5px 11px', borderRadius:99, background:FR.pickleSoft, color:FR.pickle,
          fontFamily:ML.ko, fontSize:11, fontWeight:700}}>
          🥒 {persona.name}님께 추천
        </span>
      </div>
      <div style={{fontFamily:ML.ko, fontSize:38, fontWeight:800, color:FR.ink, lineHeight:1.05, letterSpacing:-1}}>
        {winner.ko}
      </div>
      <div style={{fontFamily:ML.ko, fontSize:14, color:FR.inkSoft, marginTop:6, fontStyle:'italic'}}>
        {winner.en}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:18}}>
        <ReasonRowFR text={`${persona.name}님께 안전한 메뉴예요`}/>
        <ReasonRowFR text="이 식당에서 가장 많이 시키는 메뉴!"/>
        <ReasonRowFR text={`${winner.pairsWith.join(' 또는 ')}랑 같이 드세요`}/>
      </div>
    </div>

    <div style={{position:'absolute', left:18, right:18, bottom:30, display:'flex', gap:10}}>
      <button style={{flex:1, height:50, borderRadius:14, border:`1px solid ${FR.border}`, cursor:'pointer',
        background:FR.cream2, color:FR.ink, fontFamily:ML.ko, fontSize:13, fontWeight:600}}>↻ 다시 돌리기</button>
      <button style={{flex:1.4, height:50, borderRadius:14, border:'none', cursor:'pointer',
        background:FR.pickle, color:'#fff',
        fontFamily:ML.ko, fontSize:14, fontWeight:700,
        boxShadow:`0 6px 18px ${FR.pickle}50`}}>📝 직원에게 보여주기</button>
    </div>
  </div>;
}

function ReasonRowFR({text}) {
  return <div style={{display:'flex', gap:10, alignItems:'center',
    fontFamily:ML.ko, fontSize:12, color:FR.inkSoft, fontWeight:500}}>
    <span style={{width:18, height:18, borderRadius:'50%', background:FR.pickleSoft, color:FR.pickle,
      display:'grid', placeItems:'center', fontSize:10, fontWeight:700}}>✓</span>
    <span>{text}</span>
  </div>;
}

function ReviewFriendly({ persona, item }) {
  return <div style={{width:'100%', height:'100%', background:FR.cream, color:FR.ink,
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54}}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 18px',
      display:'flex', justifyContent:'space-between'}}>
      <span style={{fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600}}>✕</span>
      <span style={{padding:'5px 12px', borderRadius:99, background:FR.honeySoft,
        fontFamily:ML.ko, fontSize:11, color:FR.honey, fontWeight:700}}>🍽️ 식사 후</span>
    </div>

    <div style={{padding:'90px 26px 0'}}>
      <div style={{fontSize:42}}>😋</div>
      <div style={{fontFamily:ML.ko, fontSize:26, fontWeight:800, lineHeight:1.18, letterSpacing:-0.8, color:FR.ink, marginTop:10}}>
        <span style={{color:FR.pickle}}>{item.ko}</span><br/>어떠셨어요?
      </div>
      <div style={{fontFamily:ML.ko, fontSize:12, color:FR.inkSoft, marginTop:8}}>
        다음 여행자에게 도움이 돼요 🙏
      </div>

      <div style={{marginTop:36, display:'flex', flexDirection:'column', gap:10}}>
        <ReviewRowFR c="green"  emoji="😍" headline="맛있었어요!"  sub="다시 먹을래요"/>
        <ReviewRowFR c="yellow" emoji="🙂" headline="괜찮았어요"   sub="한 번은 좋았어요" selected/>
        <ReviewRowFR c="red"    emoji="😅" headline="저랑 안 맞아요" sub="추천 안 할래요"/>
      </div>

      <div style={{marginTop:24, padding:'14px 16px', background:FR.cream2,
        border:`1px solid ${FR.border}`, borderRadius:14}}>
        <div style={{fontFamily:ML.ko, fontSize:11, color:FR.fog, fontWeight:600, marginBottom:6}}>
          📝 다음의 나에게 메모
        </div>
        <div style={{fontFamily:ML.ko, fontSize:14, color:FR.ink, fontWeight:500, fontStyle:'italic', lineHeight:1.4}}>
          "생각보다 매웠어. 다음엔 고추장 좀 빼달라고 해야지."
        </div>
      </div>
    </div>

    <div style={{position:'absolute', left:18, right:18, bottom:30}}>
      <button style={{width:'100%', height:54, borderRadius:14, border:'none', cursor:'pointer',
        background:FR.pickle, color:'#fff',
        fontFamily:ML.ko, fontSize:14, fontWeight:700,
        boxShadow:`0 6px 18px ${FR.pickle}50`}}>저장 · 한국 음식 +1 🇰🇷</button>
    </div>
  </div>;
}

function ReviewRowFR({c, emoji, headline, sub, selected}) {
  const tone = FR_TONE[c];
  return <div style={{display:'flex', alignItems:'center', gap:12,
    padding:'14px 16px', borderRadius:14,
    background: selected ? tone.soft : FR.cream2,
    border: `2px solid ${selected ? tone.c : FR.border}`}}>
    <span style={{width:42, height:42, borderRadius:12,
      background: selected ? '#fff' : tone.soft,
      display:'grid', placeItems:'center', fontSize:22}}>{emoji}</span>
    <div style={{flex:1}}>
      <div style={{fontFamily:ML.ko, fontSize:15, fontWeight:700, color:FR.ink, letterSpacing:-0.3}}>{headline}</div>
      <div style={{fontFamily:ML.ko, fontSize:11, color:FR.inkSoft, marginTop:2}}>{sub}</div>
    </div>
    {selected && <span style={{fontFamily:ML.ko, fontSize:10, fontWeight:700, color:tone.c,
      padding:'4px 10px', borderRadius:99, background:'#fff'}}>선택됨</span>}
  </div>;
}

window.RouletteFriendly = RouletteFriendly;
window.ReviewFriendly = ReviewFriendly;
