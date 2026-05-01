// Results — 3가지 정보 위계 변형
//   glance : 한 카드에 시그널 + 이름 + 가격만. 탭하면 reason
//   index  : 가게 메뉴판처럼 줄 단위 리스트
//   stack  : 사진/이모지 타일 그리드, 시선이 한 번에 잡힘

function ResultsScreenV2({ persona, items, layout='glance' }) {
  const colored = items.map(it => ({...it, color: window.menulensColorFor(it, persona)}));
  const order = { green:0, yellow:1, red:2 };
  colored.sort((a,b)=> order[a.color]-order[b.color]);

  return (
    <div style={{
      width:'100%', height:'100%', background:ML.ink, color:'#fff',
      fontFamily:ML.sans, position:'relative', overflow:'auto', paddingTop:54,
    }}>
      <ResultsHeaderV2 persona={persona} colored={colored}/>

      <div style={{padding: layout==='index' ? '8px 0 80px' : '16px 16px 80px'}}>
        {layout==='glance' && <GlanceList persona={persona} items={colored}/>}
        {layout==='index'  && <IndexList persona={persona} items={colored}/>}
        {layout==='stack'  && <StackGrid persona={persona} items={colored}/>}
      </div>

      <div style={{position:'sticky', bottom:0, padding:'12px 16px 24px',
        background:`linear-gradient(180deg, transparent, ${ML.ink} 30%)`,
        display:'flex', gap:8}}>
        <button style={{
          flex:1, height:44, borderRadius:12, border:`1px solid ${ML.hairline}`,
          background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer'
        }}>+ Add page</button>
        <button style={{
          flex:1.4, height:44, borderRadius:12, border:'none',
          background:ML.paper, color:ML.warmInk, fontSize:13, fontWeight:600, cursor:'pointer'
        }}>Roulette ✦</button>
      </div>
    </div>
  );
}

function ResultsHeaderV2({ persona, colored }) {
  const reds = colored.filter(c=>c.color==='red').length;
  const yel  = colored.filter(c=>c.color==='yellow').length;
  const gr   = colored.filter(c=>c.color==='green').length;
  return <div style={{position:'sticky', top:0, zIndex:5,
    background:`${ML.ink}f0`, backdropFilter:'blur(14px)',
    padding:'10px 18px 14px', borderBottom:`1px solid ${ML.hairline}`}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:ML.fog}}>03 / RESULTS</span>
      <span style={{fontSize:11, color:ML.fog}}>SsadaGimbap · Itaewon</span>
    </div>
    <div style={{display:'flex', alignItems:'baseline', gap:12, marginTop:4}}>
      <span style={{fontFamily:ML.serif, fontSize:24, fontStyle:'italic'}}>For {persona.name}</span>
      <span style={{fontSize:11, color:ML.fog}}>{persona.diet}</span>
    </div>
    <div style={{display:'flex', gap:14, marginTop:10, alignItems:'center'}}>
      <Pill c="green"  n={gr}  />
      <Pill c="yellow" n={yel} />
      <Pill c="red"    n={reds}/>
      <span style={{flex:1, height:1, background:ML.hairline}}/>
      <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.2, color:ML.fog}}>{colored.length} ITEMS</span>
    </div>
  </div>;
}

function Pill({c, n}) {
  return <span style={{display:'inline-flex', alignItems:'center', gap:6,
    padding:'4px 10px 4px 8px', borderRadius:99,
    background:`${ML[c]}14`, border:`1px solid ${ML[c]}33`,
    fontFamily:ML.mono, fontSize:11, color:'#fff', letterSpacing:0.4
  }}>
    <span style={{width:7, height:7, borderRadius:'50%', background:ML[c]}}/>
    {n}
  </span>;
}

// ── Glance ───────────────────────────────────────────────────────
// 큰 카드 1열, 시선이 색에 먼저 가도록.
function GlanceList({ persona, items }) {
  return <div style={{display:'flex', flexDirection:'column', gap:10}}>
    {items.map((it,i)=><GlanceCard key={i} item={it} persona={persona}/>)}
  </div>;
}

function GlanceCard({ item, persona }) {
  const c = item.color;
  // 카드 전체에 색 톤을 넣되 매우 살짝.
  const tint = `${ML[c]}0E`;
  return <div style={{
    position:'relative', borderRadius:16, overflow:'hidden',
    background: tint, border:`1px solid ${ML[c]}22`,
    padding:'18px 18px 16px',
  }}>
    {/* 좌상단 큰 시그널 */}
    <div style={{position:'absolute', top:18, left:18}}>
      <SignalLight color={c} size={10} ring={false}/>
    </div>

    <div style={{paddingLeft:24, display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:14}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontFamily:ML.ko, fontSize:22, color:'#fff', fontWeight:600, letterSpacing:-0.5, lineHeight:1.1}}>{item.ko}</div>
        <div style={{fontSize:12, color:ML.fog, marginTop:4, fontFamily:ML.serif, fontStyle:'italic'}}>{item.en}</div>
      </div>
      <div style={{textAlign:'right', flexShrink:0}}>
        {item.isFreeSide
          ? <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.2, color:ML.green}}>FREE</span>
          : <span style={{fontFamily:ML.serif, fontSize:20, fontStyle:'italic', color:'#fff'}}>₩{item.price.toLocaleString()}</span>
        }
      </div>
    </div>

    {/* 한 줄 verdict — 색별 메시지 */}
    <div style={{paddingLeft:24, marginTop:10, fontSize:12, color: c==='red'?ML.red : c==='yellow'?ML.yellow : ML.green, fontFamily:ML.mono, letterSpacing:0.6, textTransform:'uppercase'}}>
      {verdictFor(item, persona)}
    </div>
  </div>;
}

function verdictFor(item, persona) {
  const tr = item.triggers[persona.id] || [];
  if (item.isFreeSide) return 'Free side · don\u2019t pay for it';
  if (item.color==='red') return 'Contains ' + tr.join(', ');
  if (item.color==='yellow') {
    if (tr.length>0) return 'Ask · may contain ' + tr[0];
    return 'Ask · ' + Math.round((item.price/item.benchmark - 1)*100) + '% over typical';
  }
  return 'Order freely';
}

// ── Index ────────────────────────────────────────────────────────
// 가게 메뉴판처럼 한 줄 한 줄. 정보 밀도 高, 빠른 스캔.
function IndexList({ persona, items }) {
  return <div>
    {items.map((it, i) => {
      const c = it.color;
      return <div key={i} style={{
        display:'flex', alignItems:'center', gap:14,
        padding:'14px 18px',
        borderTop: i===0 ? `1px solid ${ML.hairline}` : 'none',
        borderBottom: `1px solid ${ML.hairline}`,
      }}>
        <SignalLight color={c} size={9} ring={false}/>
        <div style={{flex:1, minWidth:0, display:'flex', alignItems:'baseline', gap:8}}>
          <span style={{fontFamily:ML.ko, fontSize:17, color:'#fff', fontWeight:500}}>{it.ko}</span>
          <span style={{fontSize:11, color:ML.fog, fontStyle:'italic', fontFamily:ML.serif, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{it.en}</span>
        </div>
        <span style={{fontFamily:ML.mono, fontSize:12, color: c==='red'?ML.fog:'#fff', letterSpacing:0.4}}>
          {it.isFreeSide ? '—' : '₩' + it.price.toLocaleString()}
        </span>
      </div>;
    })}
    <div style={{padding:'14px 18px', fontSize:11, color:ML.fog, fontFamily:ML.mono, letterSpacing:1, textTransform:'uppercase'}}>
      Tap any row for why
    </div>
  </div>;
}

// ── Stack ────────────────────────────────────────────────────────
// 2-column 타일. 사진 자리(컬러 면) + 시그널 + 이름.
function StackGrid({ persona, items }) {
  return <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
    {items.map((it, i) => <StackTile key={i} item={it} persona={persona}/>)}
  </div>;
}

function StackTile({ item, persona }) {
  const c = item.color;
  return <div style={{
    borderRadius:14, overflow:'hidden',
    background:'rgba(255,255,255,0.03)', border:`1px solid ${ML.hairline}`,
    display:'flex', flexDirection:'column',
  }}>
    {/* 사진 자리 — 컬러 면 + 한국어 큰 글자 */}
    <div style={{
      aspectRatio:'1 / 1',
      background:`linear-gradient(135deg, ${ML[c]}28, ${ML[c]}08)`,
      position:'relative', display:'grid', placeItems:'center',
      borderBottom:`1px solid ${ML.hairline}`,
    }}>
      <div style={{position:'absolute', top:10, left:10}}>
        <SignalLight color={c} size={9} ring={false}/>
      </div>
      <div style={{fontFamily:ML.ko, fontSize:32, color:'#fff', fontWeight:600, letterSpacing:-1}}>
        {item.ko.slice(0,2)}
      </div>
    </div>
    <div style={{padding:'10px 12px 12px'}}>
      <div style={{fontFamily:ML.ko, fontSize:14, color:'#fff', fontWeight:500, lineHeight:1.2,
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{item.ko}</div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6}}>
        <span style={{fontSize:10, color:ML.fog, fontFamily:ML.serif, fontStyle:'italic'}}>{item.romanized}</span>
        <span style={{fontFamily:ML.mono, fontSize:11, color:'#fff'}}>
          {item.isFreeSide ? 'FREE' : '₩' + (item.price/1000).toFixed(1) + 'k'}
        </span>
      </div>
    </div>
  </div>;
}

window.ResultsScreenV2 = ResultsScreenV2;
