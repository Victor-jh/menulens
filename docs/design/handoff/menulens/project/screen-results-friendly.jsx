// Results — "친근한" variant. Pickle Plus-inspired.
// 톤: 따뜻한 크림 배경 + 둥근 모서리 + 부드러운 시그널 색 + 챗봇 같은 말투
// 톤 차이만 보여주는 단일 레이아웃 (글랜스 카드 한 종류)

const FR = {
  cream:   '#FFF8EE',     // 메인 배경
  cream2:  '#FFFDF7',     // 카드 배경 (살짝 더 밝게)
  ink:     '#1F1A14',
  inkSoft: '#5C5347',
  fog:     '#9A9388',
  pickle:  '#3CA86A',     // 친근한 그린 (피클색)
  pickleSoft: '#E8F5EC',
  honey:   '#F2A93B',     // 따뜻한 노랑
  honeySoft: '#FDF1DC',
  blush:   '#E66B5B',     // 부드러운 빨강
  blushSoft: '#FCE4DF',
  border:  'rgba(31,26,20,0.08)',
};

const FR_TONE = {
  green:  { c: FR.pickle, soft: FR.pickleSoft, label: '맘껏 드세요',   emoji: '🥒' },
  yellow: { c: FR.honey,  soft: FR.honeySoft,  label: '한 번 물어봐요', emoji: '🤔' },
  red:    { c: FR.blush,  soft: FR.blushSoft,  label: '이건 패스',      emoji: '✋' },
};

function ResultsScreenFriendly({ persona, items }) {
  const [signal, setSignal] = React.useState('all');

  const colored = items.map(it => ({...it, color: window.menulensColorFor(it, persona)}));
  const order = { green:0, yellow:1, red:2 };
  colored.sort((a,b)=> order[a.color]-order[b.color]);

  const counts = {
    all:    colored.length,
    green:  colored.filter(i=>i.color==='green').length,
    yellow: colored.filter(i=>i.color==='yellow').length,
    red:    colored.filter(i=>i.color==='red').length,
  };

  const filtered = signal==='all' ? colored : colored.filter(i=>i.color===signal);

  return (
    <div style={{
      width:'100%', height:'100%', background:FR.cream, color:FR.ink,
      fontFamily:ML.sans, position:'relative', overflow:'auto', paddingTop:54,
    }}>
      {/* 헤더 - 인사말 풍 */}
      <div style={{position:'sticky', top:0, zIndex:6,
        background:`${FR.cream}f5`, backdropFilter:'blur(14px)',
        borderBottom:`1px solid ${FR.border}`}}>

        <div style={{padding:'14px 20px 10px'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:18}}>👋</span>
            <span style={{fontFamily:ML.ko, fontSize:14, color:FR.inkSoft, fontWeight:500}}>
              {persona.name}님, 안녕하세요!
            </span>
          </div>
          <div style={{fontFamily:ML.ko, fontSize:21, fontWeight:700, color:FR.ink, marginTop:6, lineHeight:1.3, letterSpacing:-0.5}}>
            메뉴 {colored.length}개 중에서<br/>
            <span style={{color:FR.pickle}}>{counts.green}개</span>는 바로 드실 수 있어요
          </div>
          <div style={{fontFamily:ML.ko, fontSize:12, color:FR.fog, marginTop:6}}>
            싸다김밥 · 이태원점 · {persona.diet}
          </div>
        </div>

        {/* 시그널 필터 - 알약 모양 */}
        <div style={{display:'flex', gap:6, padding:'4px 16px 14px', overflowX:'auto'}}>
          <PillTab active={signal==='all'} onClick={()=>setSignal('all')}
                   label="전체" n={counts.all} />
          <PillTab active={signal==='green'} onClick={()=>setSignal('green')}
                   label="맘껏" n={counts.green} c="green" />
          <PillTab active={signal==='yellow'} onClick={()=>setSignal('yellow')}
                   label="물어봐요" n={counts.yellow} c="yellow" />
          <PillTab active={signal==='red'} onClick={()=>setSignal('red')}
                   label="패스" n={counts.red} c="red" />
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{padding:'14px 16px 100px', display:'flex', flexDirection:'column', gap:10}}>
        {filtered.length===0
          ? <FriendlyEmpty onReset={()=>setSignal('all')}/>
          : filtered.map((it,i)=><FriendlyCard key={i} item={it} persona={persona}/>)
        }
      </div>

      {/* 푸터 */}
      <div style={{position:'sticky', bottom:0, padding:'10px 16px 22px',
        background:`linear-gradient(180deg, transparent, ${FR.cream} 30%)`, display:'flex', gap:8}}>
        <button style={{
          flex:1, height:48, borderRadius:14, border:`1px solid ${FR.border}`,
          background:FR.cream2, color:FR.ink, fontSize:13, fontWeight:600,
          fontFamily:ML.ko, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>📷 한 장 더</button>
        <button style={{
          flex:1.5, height:48, borderRadius:14, border:'none',
          background:FR.pickle, color:'#fff', fontSize:14, fontWeight:700,
          fontFamily:ML.ko, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          boxShadow:`0 4px 14px ${FR.pickle}40`,
        }}>🎲 골라줄게요</button>
      </div>
    </div>
  );
}

function PillTab({active, label, n, c, onClick}) {
  const tone = c ? FR_TONE[c] : null;
  return <button onClick={onClick} style={{
    padding:'9px 14px', borderRadius:99, whiteSpace:'nowrap', cursor:'pointer',
    background: active ? (tone ? tone.c : FR.ink) : FR.cream2,
    color: active ? '#fff' : FR.ink,
    border: `1px solid ${active ? 'transparent' : FR.border}`,
    fontFamily:ML.ko, fontSize:12, fontWeight:600, letterSpacing:-0.2,
    display:'inline-flex', alignItems:'center', gap:6,
    boxShadow: active && tone ? `0 2px 8px ${tone.c}40` : 'none',
  }}>
    {tone && <span style={{fontSize:11}}>{tone.emoji}</span>}
    <span>{label}</span>
    <span style={{
      fontFamily:ML.mono, fontSize:10,
      opacity: active ? 0.85 : 0.55,
      padding:'1px 6px', borderRadius:99,
      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(31,26,20,0.06)',
    }}>{n}</span>
  </button>;
}

function FriendlyCard({ item, persona }) {
  const tone = FR_TONE[item.color];
  const tr = item.triggers[persona.id] || [];

  let message;
  if (item.isFreeSide) message = '무료 반찬이에요. 주문 안 해도 나와요!';
  else if (item.color === 'red') {
    message = tr.length > 0
      ? `${tr.join(', ')} 들어 있어요`
      : '드시기 어려운 메뉴예요';
  }
  else if (item.color === 'yellow') {
    if (tr.length > 0) message = `${tr[0]} 들어있을 수 있어요. 직원분께 한 번 여쭤보세요`;
    else message = `평소보다 ${Math.round((item.price/item.benchmark - 1)*100)}% 비싸요`;
  }
  else message = '편하게 드셔도 돼요';

  return <div style={{
    background: FR.cream2,
    border:`1px solid ${FR.border}`,
    borderRadius:18,
    padding:'16px 16px 14px',
    display:'flex', gap:14,
    boxShadow:'0 1px 0 rgba(31,26,20,0.02)',
  }}>
    {/* 사진 자리 (큰 이모지/한글 첫 글자) */}
    <div style={{
      width:64, height:64, borderRadius:14, flexShrink:0,
      background:tone.soft,
      display:'grid', placeItems:'center',
      fontFamily:ML.ko, fontSize:24, fontWeight:700, color:tone.c,
      letterSpacing:-1,
      position:'relative',
    }}>
      {item.ko.slice(0,1)}
      {/* 시그널 점 - 우상단 */}
      <span style={{
        position:'absolute', top:-3, right:-3,
        width:18, height:18, borderRadius:'50%',
        background:tone.c,
        border:`2px solid ${FR.cream2}`,
        fontSize:9, display:'grid', placeItems:'center',
      }}>{tone.emoji}</span>
    </div>

    <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8}}>
        <div style={{fontFamily:ML.ko, fontSize:16, color:FR.ink, fontWeight:700, letterSpacing:-0.4}}>
          {item.ko}
        </div>
        <div style={{fontFamily:ML.mono, fontSize:13, color:FR.ink, fontWeight:600, flexShrink:0}}>
          {item.isFreeSide ? '무료' : `₩${item.price.toLocaleString()}`}
        </div>
      </div>
      <div style={{fontSize:11, color:FR.fog, marginTop:2, fontStyle:'italic'}}>
        {item.en}
      </div>
      {/* 메시지 - 색깔 토닉 */}
      <div style={{
        marginTop:9,
        padding:'7px 10px', borderRadius:9,
        background:tone.soft,
        color:tone.c,
        fontFamily:ML.ko, fontSize:11.5, fontWeight:600, letterSpacing:-0.2,
        lineHeight:1.4,
      }}>
        {message}
      </div>
    </div>
  </div>;
}

function FriendlyEmpty({ onReset }) {
  return <div style={{padding:'60px 24px', textAlign:'center'}}>
    <div style={{fontSize:42}}>🥒</div>
    <div style={{fontFamily:ML.ko, fontSize:18, fontWeight:700, marginTop:14, color:FR.ink}}>
      해당하는 메뉴가 없어요
    </div>
    <div style={{fontFamily:ML.ko, fontSize:12, color:FR.fog, marginTop:6}}>
      다른 필터를 눌러볼까요?
    </div>
    <button onClick={onReset} style={{
      marginTop:18, padding:'11px 22px', borderRadius:99, cursor:'pointer',
      background:FR.pickle, color:'#fff', border:'none',
      fontFamily:ML.ko, fontSize:13, fontWeight:600,
    }}>전체 보기</button>
  </div>;
}

window.ResultsScreenFriendly = ResultsScreenFriendly;
window.FR_TONE = FR_TONE;
window.FR = FR;
