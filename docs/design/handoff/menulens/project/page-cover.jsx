// Cover · Problem · Solution · Personas · Design System
// 1440 x 900 — 여유 있게, 큰 디스플레이에서 풀스크린/포커스 모드용

const PG_PAD = 80;

// ── 표지 (Cover) ──────────────────────────────────────
function CoverPage() {
  return <div style={{
    width:'100%', height:'100%', background:FR.cream, boxSizing:'border-box',
    fontFamily:ML.sans, color:FR.ink, position:'relative', overflow:'hidden',
    padding:`${PG_PAD}px ${PG_PAD}px`,
  }}>
    {/* 배경 텍스처 — 메뉴판 줄 */}
    <div style={{position:'absolute', inset:0,
      backgroundImage:'repeating-linear-gradient(180deg, transparent, transparent 44px, rgba(31,26,20,0.025) 44px, rgba(31,26,20,0.025) 45px)',
      pointerEvents:'none'}}/>

    {/* 좌상단 - 공모전 메타 */}
    <div style={{position:'absolute', top:56, left:PG_PAD, display:'flex', alignItems:'center', gap:16}}>
      <div style={{display:'flex', flexDirection:'column', gap:7}}>
        <span style={{width:12, height:12, borderRadius:'50%', background:FR.blush}}/>
        <span style={{width:12, height:12, borderRadius:'50%', background:FR.honey}}/>
        <span style={{width:12, height:12, borderRadius:'50%', background:FR.pickle}}/>
      </div>
      <div>
        <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.5, color:FR.fog, textTransform:'uppercase', fontWeight:600}}>
          공모전 제출작
        </div>
        <div style={{fontFamily:ML.ko, fontSize:15, color:FR.ink, fontWeight:600, marginTop:3}}>
          MenuLens · 메뉴렌즈
        </div>
      </div>
    </div>

    {/* 우상단 - 시그널 데모 */}
    <div style={{position:'absolute', top:56, right:PG_PAD,
      display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end'}}>
      <div style={{display:'inline-flex', alignItems:'center', gap:9,
        padding:'9px 18px', borderRadius:99, background:FR.pickleSoft, color:FR.pickle,
        fontFamily:ML.ko, fontSize:13, fontWeight:700}}>🥒 맘껏 드세요</div>
      <div style={{display:'inline-flex', alignItems:'center', gap:9,
        padding:'9px 18px', borderRadius:99, background:FR.honeySoft, color:FR.honey,
        fontFamily:ML.ko, fontSize:13, fontWeight:700}}>🤔 한 번 물어봐요</div>
      <div style={{display:'inline-flex', alignItems:'center', gap:9,
        padding:'9px 18px', borderRadius:99, background:FR.blushSoft, color:FR.blush,
        fontFamily:ML.ko, fontSize:13, fontWeight:700}}>✋ 이건 패스</div>
    </div>

    {/* 메인 카피 */}
    <div style={{position:'absolute', top:'40%', left:PG_PAD, right:540, transform:'translateY(-50%)'}}>
      <div style={{fontFamily:ML.mono, fontSize:13, letterSpacing:3.5, color:FR.pickle, fontWeight:700, textTransform:'uppercase'}}>
        For travelers · 여행자를 위한
      </div>

      <div style={{fontFamily:ML.ko, fontSize:120, fontWeight:800, lineHeight:0.95,
        letterSpacing:-4, color:FR.ink, marginTop:24}}>
        한글 메뉴판,<br/>
        <span style={{color:FR.pickle, position:'relative'}}>
          신호등으로
          <span style={{position:'absolute', left:-10, right:-10, bottom:8, height:18,
            background:`${FR.pickle}22`, zIndex:-1, borderRadius:6}}/>
        </span><br/>
        읽다.
      </div>

      <div style={{display:'flex', gap:24, marginTop:48, alignItems:'center'}}>
        <div style={{height:54, width:4, background:FR.ink, borderRadius:2}}/>
        <div>
          <div style={{fontFamily:ML.ko, fontSize:21, color:FR.ink, fontWeight:600, lineHeight:1.4, letterSpacing:-0.5}}>
            사진 한 장이면 끝.
          </div>
          <div style={{fontFamily:ML.ko, fontSize:16, color:FR.inkSoft, lineHeight:1.4, marginTop:5}}>
            먹어도 되는지, 물어봐야 하는지 — 색깔로 알려드려요.
          </div>
        </div>
      </div>
    </div>

    {/* 디바이스 미리보기 */}
    <div style={{position:'absolute', top:180, right:PG_PAD,
      display:'flex', gap:18, transform:'rotate(-4deg)'}}>
      <div style={{
        width:240, height:480, background:FR.ink, borderRadius:36,
        padding:10, boxShadow:'0 40px 80px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width:'100%', height:'100%', background:FR.cream2, borderRadius:28,
          padding:'20px 16px', position:'relative', overflow:'hidden',
        }}>
          <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, fontWeight:600}}>👋 안녕하세요!</div>
          <div style={{fontFamily:ML.ko, fontSize:20, color:FR.ink, fontWeight:800, marginTop:7, lineHeight:1.2, letterSpacing:-0.4}}>
            메뉴 8개 중<br/>
            <span style={{color:FR.pickle}}>5개</span>는 바로
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:7, marginTop:18}}>
            {[
              {c:'green',  ko:'참치김밥', e:'🥒'},
              {c:'green',  ko:'비빔밥',   e:'🥒'},
              {c:'green',  ko:'순두부찌개', e:'🥒'},
              {c:'yellow', ko:'된장찌개', e:'🤔'},
              {c:'red',    ko:'제육볶음', e:'✋'},
            ].map((m,i)=>{
              const tone = FR_TONE[m.c];
              return <div key={i} style={{
                background:tone.soft, borderRadius:9, padding:'8px 10px',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{fontSize:14}}>{m.e}</span>
                <span style={{fontFamily:ML.ko, fontSize:13, fontWeight:700, color:FR.ink}}>{m.ko}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>

    {/* 디자이너 */}
    <div style={{position:'absolute', bottom:80, left:PG_PAD}}>
      <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.5, color:FR.fog, textTransform:'uppercase', fontWeight:600}}>
        Designed by
      </div>
      <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:54, color:FR.ink,
        lineHeight:1, marginTop:8, letterSpacing:-1.2}}>
        변종현
      </div>
      <div style={{display:'flex', gap:18, marginTop:22, fontFamily:ML.ko, fontSize:13, color:FR.fog}}>
        <span>2025</span>
        <span style={{width:1, background:FR.border}}/>
        <span>독립 프로젝트</span>
      </div>
    </div>

    {/* 하단 인디케이터 */}
    <div style={{position:'absolute', bottom:30, left:PG_PAD, right:PG_PAD,
      display:'flex', justifyContent:'space-between', alignItems:'center',
      fontFamily:ML.mono, fontSize:11, color:FR.fog, letterSpacing:1.8, textTransform:'uppercase'}}>
      <span>· 한국 식당 · 외국인 여행자 · 알러지 · 식이 ·</span>
      <span>↓ 스크롤</span>
    </div>
  </div>;
}

// ── Problem ───────────────────────────────────────────
function ProblemPage() {
  return <div style={{
    width:'100%', height:'100%', background:FR.cream, boxSizing:'border-box',
    fontFamily:ML.sans, color:FR.ink, position:'relative', overflow:'hidden',
    padding:`${PG_PAD}px ${PG_PAD}px`,
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:44}}>
      <div>
        <div style={{fontFamily:ML.mono, fontSize:12, letterSpacing:3, color:FR.fog, fontWeight:700, textTransform:'uppercase'}}>
          01 · Problem
        </div>
        <div style={{fontFamily:ML.ko, fontSize:60, color:FR.ink, fontWeight:800, lineHeight:1, letterSpacing:-2, marginTop:14}}>
          한국 식당, <span style={{color:FR.blush}}>같은 풍경</span>
        </div>
      </div>
      <div style={{fontFamily:ML.ko, fontSize:16, color:FR.inkSoft, maxWidth:340, lineHeight:1.5, textAlign:'right'}}>
        외국인 1,700만 명이 매년 한국에 와서<br/>
        <strong>같은 메뉴판 앞에서 멈춥니다</strong>
      </div>
    </div>

    {/* Before vs After */}
    <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:36, alignItems:'stretch', height:'calc(100% - 240px)'}}>
      {/* BEFORE */}
      <div style={{
        background:'#FFF', borderRadius:24, padding:'34px 36px',
        border:`1px solid ${FR.border}`, position:'relative',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:22}}>
          <span style={{padding:'5px 13px', borderRadius:99, background:FR.blushSoft, color:FR.blush,
            fontFamily:ML.mono, fontSize:11, fontWeight:700, letterSpacing:1.8}}>BEFORE</span>
          <span style={{fontFamily:ML.ko, fontSize:14, color:FR.fog}}>지금 — 메뉴렌즈가 없을 때</span>
        </div>

        <div style={{
          background:'#FFFBF1', border:`1px solid ${FR.border}`, borderRadius:12,
          padding:'22px 22px', fontFamily:ML.ko,
          marginBottom:24, position:'relative',
        }}>
          <div style={{fontSize:17, fontWeight:800, color:FR.ink, paddingBottom:8, marginBottom:10,
            borderBottom:`1px dashed ${FR.border}`, letterSpacing:-0.5}}>오늘의 메뉴</div>
          {['김치찌개  ₩8,000','된장찌개  ₩7,500','제육볶음  ₩9,500','순두부찌개  ₩8,500','참치김밥  ₩4,500','비빔밥  ₩9,000'].map((r,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:14, color:FR.inkSoft, marginBottom:6, filter:'blur(0.5px)'}}>
              <span>{r.split('  ')[0]}</span>
              <span style={{fontFamily:ML.mono}}>{r.split('  ')[1]}</span>
            </div>
          ))}
          <div style={{position:'absolute', right:18, top:18, fontSize:42, opacity:0.85}}>❓</div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:'auto'}}>
          {[
            { e:'🤷', t:'뭐가 뭔지 모르겠다', s:'한글만 적힌 메뉴판' },
            { e:'😰', t:'알러지가 있는데...', s:'직원에게 어떻게 설명?' },
            { e:'📱', t:'번역기 돌리니 어색', s:'"Bibimbap"이 뭔데?' },
            { e:'🤔', t:'그냥 아무거나', s:'안전한 선택만 반복' },
          ].map((p,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:14,
              padding:'13px 16px', background:'#FFF8F2', borderRadius:12,
              border:`1px solid ${FR.border}`}}>
              <span style={{fontSize:22}}>{p.e}</span>
              <div>
                <div style={{fontFamily:ML.ko, fontSize:16, fontWeight:700, color:FR.ink, letterSpacing:-0.4}}>"{p.t}"</div>
                <div style={{fontFamily:ML.ko, fontSize:12, color:FR.fog, marginTop:2}}>{p.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 화살표 */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:18}}>
        <div style={{
          width:80, height:80, borderRadius:'50%', background:FR.pickle,
          color:'#fff', display:'grid', placeItems:'center',
          fontSize:36, boxShadow:`0 12px 30px ${FR.pickle}55`,
        }}>→</div>
        <div style={{fontFamily:ML.ko, fontSize:14, color:FR.pickle, fontWeight:700, textAlign:'center'}}>
          MenuLens
        </div>
      </div>

      {/* AFTER */}
      <div style={{
        background:FR.cream2, borderRadius:24, padding:'34px 36px',
        border:`2px solid ${FR.pickle}`,
        boxShadow:`0 16px 40px ${FR.pickle}25`,
        display:'flex', flexDirection:'column',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:22}}>
          <span style={{padding:'5px 13px', borderRadius:99, background:FR.pickle, color:'#fff',
            fontFamily:ML.mono, fontSize:11, fontWeight:700, letterSpacing:1.8}}>AFTER</span>
          <span style={{fontFamily:ML.ko, fontSize:14, color:FR.pickle, fontWeight:600}}>메뉴렌즈로 본 같은 메뉴판</span>
        </div>

        <div style={{
          background:'#FFFBF1', border:`1px solid ${FR.border}`, borderRadius:12,
          padding:'22px 22px', fontFamily:ML.ko, marginBottom:24,
        }}>
          <div style={{fontSize:17, fontWeight:800, color:FR.ink, paddingBottom:8, marginBottom:10,
            borderBottom:`1px dashed ${FR.border}`, letterSpacing:-0.5,
            display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>오늘의 메뉴</span>
            <span style={{fontFamily:ML.mono, fontSize:11, color:FR.pickle, fontWeight:700}}>+ MenuLens</span>
          </div>
          {[
            {c:'red',    n:'김치찌개', p:'₩8,000', e:'✋'},
            {c:'yellow', n:'된장찌개', p:'₩7,500', e:'🤔'},
            {c:'red',    n:'제육볶음', p:'₩9,500', e:'✋'},
            {c:'green',  n:'순두부찌개', p:'₩8,500', e:'🥒'},
            {c:'green',  n:'참치김밥', p:'₩4,500', e:'🥒'},
            {c:'green',  n:'비빔밥',   p:'₩9,000', e:'🥒'},
          ].map((m,i)=>{
            const tone = FR_TONE[m.c];
            return <div key={i} style={{display:'flex', justifyContent:'space-between',
              alignItems:'center', fontSize:14, marginBottom:5,
              padding:'4px 9px', borderRadius:7,
              background:tone.soft}}>
              <span style={{display:'flex', gap:9, alignItems:'center'}}>
                <span style={{fontSize:14}}>{m.e}</span>
                <span style={{color:FR.ink, fontWeight:600}}>{m.n}</span>
              </span>
              <span style={{fontFamily:ML.mono, fontSize:13, color:tone.c, fontWeight:700}}>{m.p}</span>
            </div>;
          })}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:'auto'}}>
          {[
            { e:'🥒', t:'바로 알겠어요', s:'색깔 한 번에 분류' },
            { e:'📝', t:'직원에게 보여주기', s:'한국어로 자동 변환' },
            { e:'🎲', t:'골라줄게요', s:'고민될 때 안전 추천' },
            { e:'❤️', t:'다시 먹고 싶어!', s:'기록하고 추천' },
          ].map((p,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:14,
              padding:'13px 16px', background:FR.pickleSoft, borderRadius:12,
              border:`1px solid ${FR.pickle}33`}}>
              <span style={{fontSize:22}}>{p.e}</span>
              <div>
                <div style={{fontFamily:ML.ko, fontSize:16, fontWeight:700, color:FR.ink, letterSpacing:-0.4}}>"{p.t}"</div>
                <div style={{fontFamily:ML.ko, fontSize:12, color:FR.pickle, marginTop:2}}>{p.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{position:'absolute', bottom:30, left:PG_PAD, right:PG_PAD,
      display:'flex', justifyContent:'space-between',
      fontFamily:ML.mono, fontSize:11, color:FR.fog, letterSpacing:1.8}}>
      <span>01 / PROBLEM</span><span>MENULENS · 메뉴렌즈</span>
    </div>
  </div>;
}

// ── Solution ─────────────────────────────────────────
function SolutionPage() {
  return <div style={{
    width:'100%', height:'100%', background:FR.cream, boxSizing:'border-box',
    fontFamily:ML.sans, color:FR.ink, position:'relative', overflow:'hidden',
    padding:`${PG_PAD}px ${PG_PAD}px`,
  }}>
    <div style={{marginBottom:36}}>
      <div style={{fontFamily:ML.mono, fontSize:12, letterSpacing:3, color:FR.fog, fontWeight:700, textTransform:'uppercase'}}>
        02 · Solution
      </div>
      <div style={{fontFamily:ML.ko, fontSize:60, color:FR.ink, fontWeight:800, lineHeight:1.05, letterSpacing:-2, marginTop:14, maxWidth:1100}}>
        세 개의 <span style={{color:FR.pickle}}>신호등</span>으로 충분합니다
      </div>
    </div>

    {/* 신호등 3개 */}
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:30, marginBottom:36}}>
      {[
        {c:'green',  emoji:'🥒', label:'맘껏 드세요',   desc:'알러지 없음 · 적정 가격', ex:'참치김밥, 비빔밥, 순두부찌개', count:5},
        {c:'yellow', emoji:'🤔', label:'한 번 물어봐요', desc:'성분 확인 필요 · 가격 이상', ex:'된장찌개 (멸치 육수?)', count:2},
        {c:'red',    emoji:'✋', label:'이건 패스',     desc:'알러지 · 식이 제한 충돌',  ex:'제육볶음 (돼지)', count:1},
      ].map((s,i)=>{
        const tone = FR_TONE[s.c];
        return <div key={i} style={{
          background:FR.cream2, border:`2px solid ${tone.c}`, borderRadius:24,
          padding:'34px 30px', position:'relative',
          boxShadow:`0 12px 30px ${tone.c}30`,
        }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
            <div style={{
              width:80, height:80, borderRadius:'50%', background:tone.soft,
              display:'grid', placeItems:'center', fontSize:40,
              border:`3px solid ${tone.c}`,
            }}>{s.emoji}</div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:1.8, color:FR.fog, fontWeight:700}}>EXAMPLE</div>
              <div style={{fontFamily:ML.ko, fontSize:42, fontWeight:800, color:tone.c, lineHeight:1, marginTop:3}}>
                {s.count}<span style={{fontSize:18, color:FR.fog}}>개</span>
              </div>
            </div>
          </div>

          <div style={{fontFamily:ML.ko, fontSize:30, fontWeight:800, color:FR.ink, letterSpacing:-0.9}}>
            {s.label}
          </div>
          <div style={{fontFamily:ML.ko, fontSize:14, color:FR.inkSoft, marginTop:8, lineHeight:1.5}}>
            {s.desc}
          </div>

          <div style={{marginTop:22, padding:'14px 16px', background:tone.soft, borderRadius:12}}>
            <div style={{fontFamily:ML.mono, fontSize:9.5, letterSpacing:1.5, color:tone.c, fontWeight:700}}>예시</div>
            <div style={{fontFamily:ML.ko, fontSize:15, color:FR.ink, fontWeight:600, marginTop:5, letterSpacing:-0.3}}>
              {s.ex}
            </div>
          </div>
        </div>;
      })}
    </div>

    {/* 디자인 결정 */}
    <div style={{background:'rgba(31,26,20,0.04)', borderRadius:22, padding:'30px 36px'}}>
      <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.2, color:FR.fog, fontWeight:700, marginBottom:18}}>
        WHY THIS WORKS · 핵심 디자인 결정
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:36}}>
        {[
          { n:'01', t:'색맹 고려',     d:'색만 쓰지 않고 이모지 + 라벨로 보강. 3중 표시 시스템.' },
          { n:'02', t:'친근한 한국어', d:'기계 번역 톤이 아닌 챗봇처럼. "맘껏 드세요" "물어봐요" 같은 일상어.' },
          { n:'03', t:'직원과 다리',   d:'주문 화면이 한국어로 전환되어 직원에게 그대로 보여줍니다.' },
        ].map((d,i)=>(
          <div key={i}>
            <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:42, color:FR.pickle, lineHeight:1}}>{d.n}</div>
            <div style={{fontFamily:ML.ko, fontSize:19, fontWeight:800, color:FR.ink, marginTop:11, letterSpacing:-0.5}}>{d.t}</div>
            <div style={{fontFamily:ML.ko, fontSize:14, color:FR.inkSoft, marginTop:6, lineHeight:1.55}}>{d.d}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{position:'absolute', bottom:30, left:PG_PAD, right:PG_PAD,
      display:'flex', justifyContent:'space-between',
      fontFamily:ML.mono, fontSize:11, color:FR.fog, letterSpacing:1.8}}>
      <span>02 / SOLUTION</span><span>MENULENS · 메뉴렌즈</span>
    </div>
  </div>;
}

// ── Personas ─────────────────────────────────────────
function PersonasPage() {
  const personas = [
    { id:'yui',   name:'Yui',   flag:'🇯🇵', age:24, role:'대학생 · 도쿄', diet:'페스카테리언',
      quote:'"닭, 돼지는 못 먹어요. 해산물은 좋아하는데 한국 메뉴에서 어떤 게 안전한지 모르겠어요."',
      avoid:['돼지고기','닭고기','소고기'], color:FR.honey, soft:FR.honeySoft },
    { id:'malik', name:'Malik', flag:'🇲🇾', age:31, role:'엔지니어 · 쿠알라룸푸르', diet:'할랄',
      quote:'"할랄만 먹어요. 돼지고기, 술 들어간 메뉴는 절대 안 됩니다."',
      avoid:['돼지고기','술'], color:FR.pickle, soft:FR.pickleSoft },
    { id:'chen',  name:'Chen',  flag:'🇨🇳', age:28, role:'마케터 · 상하이', diet:'땅콩 알러지',
      quote:'"땅콩, 참기름 알러지가 심해요. 미량만 들어가도 위험해서 항상 조심합니다."',
      avoid:['땅콩','참기름','견과류'], color:FR.blush, soft:FR.blushSoft },
    { id:'john',  name:'John',  flag:'🇺🇸', age:35, role:'프리랜서 · 뉴욕', diet:'제한 없음',
      quote:'"알러지는 없어요. 현지인이 진짜 좋아하는 메뉴를 찾고 싶어요."',
      avoid:[], color:FR.ink, soft:'rgba(31,26,20,0.06)' },
  ];

  return <div style={{
    width:'100%', height:'100%', background:FR.cream, boxSizing:'border-box',
    fontFamily:ML.sans, color:FR.ink, position:'relative', overflow:'hidden',
    padding:`${PG_PAD}px ${PG_PAD}px`,
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:40}}>
      <div>
        <div style={{fontFamily:ML.mono, fontSize:12, letterSpacing:3, color:FR.fog, fontWeight:700, textTransform:'uppercase'}}>
          03 · Personas
        </div>
        <div style={{fontFamily:ML.ko, fontSize:60, color:FR.ink, fontWeight:800, lineHeight:1, letterSpacing:-2, marginTop:14}}>
          누구를 위해 만들었나
        </div>
      </div>
      <div style={{fontFamily:ML.ko, fontSize:16, color:FR.inkSoft, maxWidth:340, lineHeight:1.5, textAlign:'right'}}>
        한 명에게 잘 통하면 모두에게 통합니다.<br/>
        <strong>4명의 페르소나</strong>로 시스템을 검증했어요.
      </div>
    </div>

    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
      {personas.map(p => (
        <div key={p.id} style={{
          background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:22,
          padding:'30px 32px', display:'flex', gap:22, alignItems:'flex-start',
        }}>
          <div style={{
            width:88, height:88, borderRadius:'50%', background:p.soft,
            display:'grid', placeItems:'center', fontSize:38, flexShrink:0,
            border:`2px solid ${p.color}`, position:'relative',
          }}>
            {p.flag}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap'}}>
              <div style={{fontFamily:ML.ko, fontSize:28, fontWeight:800, color:FR.ink, letterSpacing:-0.7}}>{p.name}</div>
              <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog}}>{p.age} · {p.role}</div>
            </div>
            <div style={{display:'inline-flex', alignItems:'center', gap:7,
              padding:'4px 12px', borderRadius:99, background:p.soft, color:p.color,
              fontFamily:ML.ko, fontSize:12, fontWeight:700, marginTop:8}}>
              {p.diet}
            </div>
            <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:17, color:FR.ink,
              marginTop:14, lineHeight:1.45, letterSpacing:-0.2}}>
              {p.quote}
            </div>
            {p.avoid.length>0 && <div style={{display:'flex', gap:6, marginTop:14, flexWrap:'wrap'}}>
              {p.avoid.map((a,i)=>(
                <span key={i} style={{padding:'4px 11px', borderRadius:99,
                  background:FR.blushSoft, color:FR.blush,
                  fontFamily:ML.ko, fontSize:12, fontWeight:600}}>✋ {a}</span>
              ))}
            </div>}
          </div>
        </div>
      ))}
    </div>

    <div style={{position:'absolute', bottom:30, left:PG_PAD, right:PG_PAD,
      display:'flex', justifyContent:'space-between',
      fontFamily:ML.mono, fontSize:11, color:FR.fog, letterSpacing:1.8}}>
      <span>03 / PERSONAS</span><span>MENULENS · 메뉴렌즈</span>
    </div>
  </div>;
}

// ── Design System ────────────────────────────────────
function DesignSystemPage() {
  return <div style={{
    width:'100%', height:'100%', background:FR.cream, boxSizing:'border-box',
    fontFamily:ML.sans, color:FR.ink, position:'relative', overflow:'hidden',
    padding:`${PG_PAD}px ${PG_PAD}px`,
  }}>
    <div style={{marginBottom:32}}>
      <div style={{fontFamily:ML.mono, fontSize:12, letterSpacing:3, color:FR.fog, fontWeight:700, textTransform:'uppercase'}}>
        04 · Design System
      </div>
      <div style={{fontFamily:ML.ko, fontSize:60, color:FR.ink, fontWeight:800, lineHeight:1, letterSpacing:-2, marginTop:14}}>
        디자인 시스템
      </div>
    </div>

    <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:28}}>
      {/* 컬러 */}
      <div style={{background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:20, padding:'28px 32px'}}>
        <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.2, color:FR.fog, fontWeight:700, marginBottom:18}}>COLORS · 신호등 + 베이스</div>
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {[
            {n:'Pickle Green', c:FR.pickle, hex:'#3CA86A', use:'Safe · 맘껏'},
            {n:'Honey',        c:FR.honey,  hex:'#F2A93B', use:'Caution · 물어봐요'},
            {n:'Blush',        c:FR.blush,  hex:'#E66B5B', use:'Avoid · 패스'},
            {n:'Cream',        c:FR.cream,  hex:'#FFF8EE', use:'Background'},
            {n:'Ink',          c:FR.ink,    hex:'#1F1A14', use:'Text · primary'},
          ].map((c,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:16}}>
              <div style={{width:48, height:48, borderRadius:12, background:c.c, border:`1px solid ${FR.border}`, flexShrink:0}}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:ML.ko, fontSize:16, color:FR.ink, fontWeight:700, letterSpacing:-0.3}}>{c.n}</div>
                <div style={{fontFamily:ML.mono, fontSize:12, color:FR.fog}}>{c.hex} · {c.use}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 타이포 */}
      <div style={{background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:20, padding:'28px 32px'}}>
        <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.2, color:FR.fog, fontWeight:700, marginBottom:18}}>TYPOGRAPHY</div>

        <div style={{fontFamily:ML.ko, fontSize:42, fontWeight:800, color:FR.ink, lineHeight:1.1, letterSpacing:-1.2}}>
          한글 메뉴판
        </div>
        <div style={{fontFamily:ML.mono, fontSize:11, color:FR.fog, marginTop:3}}>Pretendard · 800 · 42px</div>

        <div style={{fontFamily:'Instrument Serif', fontStyle:'italic', fontSize:30, color:FR.ink, marginTop:22, lineHeight:1.1}}>
          신호등으로 읽다.
        </div>
        <div style={{fontFamily:ML.mono, fontSize:11, color:FR.fog, marginTop:3}}>Instrument Serif · italic · 30px</div>

        <div style={{fontFamily:ML.ko, fontSize:17, color:FR.inkSoft, marginTop:22, lineHeight:1.5}}>
          사진 한 장이면 끝. 색깔로 알려드려요.
        </div>
        <div style={{fontFamily:ML.mono, fontSize:11, color:FR.fog, marginTop:3}}>Pretendard · 400 · 17px</div>
      </div>
    </div>

    {/* 컴포넌트 */}
    <div style={{marginTop:28, background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:20, padding:'28px 32px'}}>
      <div style={{fontFamily:ML.mono, fontSize:11, letterSpacing:2.2, color:FR.fog, fontWeight:700, marginBottom:18}}>COMPONENTS</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:28}}>
        <div>
          <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, marginBottom:10, fontWeight:600}}>버튼</div>
          <button style={{width:'100%', padding:'13px', borderRadius:12, border:'none',
            background:FR.pickle, color:'#fff', fontFamily:ML.ko, fontSize:15, fontWeight:700, marginBottom:8}}>주문하기</button>
          <button style={{width:'100%', padding:'13px', borderRadius:12,
            background:FR.cream, color:FR.ink, border:`1px solid ${FR.border}`,
            fontFamily:ML.ko, fontSize:15, fontWeight:600}}>다시 찍기</button>
        </div>
        <div>
          <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, marginBottom:10, fontWeight:600}}>시그널 칩</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{padding:'7px 13px', borderRadius:99, background:FR.pickleSoft, color:FR.pickle,
              fontFamily:ML.ko, fontSize:12, fontWeight:700, textAlign:'center'}}>🥒 맘껏 · 5</span>
            <span style={{padding:'7px 13px', borderRadius:99, background:FR.honeySoft, color:FR.honey,
              fontFamily:ML.ko, fontSize:12, fontWeight:700, textAlign:'center'}}>🤔 물어봐요 · 2</span>
            <span style={{padding:'7px 13px', borderRadius:99, background:FR.blushSoft, color:FR.blush,
              fontFamily:ML.ko, fontSize:12, fontWeight:700, textAlign:'center'}}>✋ 패스 · 1</span>
          </div>
        </div>
        <div>
          <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, marginBottom:10, fontWeight:600}}>메뉴 카드</div>
          <div style={{background:FR.cream, border:`1px solid ${FR.border}`, borderRadius:12, padding:'10px 13px',
            display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:36, height:36, borderRadius:9, background:FR.pickleSoft, color:FR.pickle,
              display:'grid', placeItems:'center', fontFamily:ML.ko, fontSize:16, fontWeight:700}}>비</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontFamily:ML.ko, fontSize:14, fontWeight:700, color:FR.ink}}>비빔밥</div>
              <div style={{fontFamily:ML.mono, fontSize:11, color:FR.fog}}>₩9,000</div>
            </div>
            <span style={{width:9, height:9, borderRadius:'50%', background:FR.pickle}}/>
          </div>
        </div>
        <div>
          <div style={{fontFamily:ML.ko, fontSize:13, color:FR.fog, marginBottom:10, fontWeight:600}}>라운딩</div>
          <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
            {[{r:8,l:'8'},{r:14,l:'14'},{r:22,l:'22'},{r:99,l:'99'}].map((r,i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{width:38, height:38, background:FR.pickleSoft, borderRadius:r.r, border:`1px solid ${FR.pickle}55`}}/>
                <div style={{fontFamily:ML.mono, fontSize:10, color:FR.fog, marginTop:5}}>{r.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div style={{position:'absolute', bottom:30, left:PG_PAD, right:PG_PAD,
      display:'flex', justifyContent:'space-between',
      fontFamily:ML.mono, fontSize:11, color:FR.fog, letterSpacing:1.8}}>
      <span>04 / DESIGN SYSTEM</span><span>MENULENS · 메뉴렌즈</span>
    </div>
  </div>;
}

window.CoverPage = CoverPage;
window.ProblemPage = ProblemPage;
window.SolutionPage = SolutionPage;
window.PersonasPage = PersonasPage;
window.DesignSystemPage = DesignSystemPage;
