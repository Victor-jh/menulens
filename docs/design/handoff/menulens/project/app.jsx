// MenuLens redesign — app shell. Pan/zoom canvas of phone frames + persona Tweaks.

const { useState, useEffect, useRef } = React;

// Default persona
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "persona": "yui",
  "tone": "midnight",
  "showCanvasGrid": true
}/*EDITMODE-END*/;

function PhoneFrame({ children, label, n }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div style={{display:'flex', alignItems:'baseline', gap:10, paddingLeft:4}}>
        <span style={{fontFamily:ML.mono, fontSize:11, color:'#9AA3AE', letterSpacing:1.4}}>{n}</span>
        <span style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:24, color:'#0E1116'}}>{label}</span>
      </div>
      <IOSDevice width={360} height={780} dark>{children}</IOSDevice>
    </div>
  );
}

function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(false);

  // Tweaks protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setPanelOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setPanelOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function setTweak(k, v) {
    setTweaks(t => ({...t, [k]: v}));
    window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*');
  }

  const persona = window.MENULENS_PERSONAS[tweaks.persona] || window.MENULENS_PERSONAS.yui;
  const items = window.MENULENS_DEMO_ITEMS();
  const stew = items.find(i => i.romanized==='kimchi-jjigae');
  const bibimbap = items.find(i => i.romanized==='bibimbap');
  const safeItem = items.find(i => window.menulensColorFor(i, persona)==='green' && !i.isFreeSide) || bibimbap;

  return (
    <>
      {/* Top label strip — always visible above the canvas */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, zIndex:30,
        padding:'18px 28px', display:'flex', justifyContent:'space-between',
        alignItems:'center', gap:24, flexWrap:'wrap', pointerEvents:'none',
      }}>
        <div style={{pointerEvents:'auto', display:'flex', alignItems:'center', gap:14}}>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <SignalLight color="red" size={9} ring={false}/>
            <SignalLight color="yellow" size={9} ring={false}/>
            <SignalLight color="green" size={9} ring={false}/>
          </div>
          <div>
            <div style={{fontFamily:'Instrument Serif, serif', fontStyle:'italic', fontSize:30, lineHeight:1, color:'#0E1116'}}>MenuLens <span style={{color:'#9AA3AE'}}>· redesign</span></div>
            <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:1.5, color:'#5A6470', marginTop:4, textTransform:'uppercase'}}>
              For travelers who can’t read the menu — a redesign by way of <em style={{fontFamily:'Instrument Serif',fontStyle:'italic'}}>three lights</em>.
            </div>
          </div>
        </div>
        <div style={{pointerEvents:'auto', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end'}}>
          <PersonaTab id="yui"   persona={persona} setTweak={setTweak}/>
          <PersonaTab id="malik" persona={persona} setTweak={setTweak}/>
          <PersonaTab id="chen"  persona={persona} setTweak={setTweak}/>
          <PersonaTab id="john"  persona={persona} setTweak={setTweak}/>
        </div>
      </div>

      <DesignCanvas>
        <DCSection id="cover" title="" subtitle="">
          <DCArtboard id="cv-cover" label="표지" width={1440} height={900}>
            <CoverPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="problem" title="문제 — 같은 풍경, 같은 멈춤" subtitle="외국인 1,700만 명이 매년 한국 식당 메뉴판 앞에서 멈춥니다.">
          <DCArtboard id="cv-problem" label="Before / After" width={1440} height={900}>
            <ProblemPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="solution" title="해결 — 신호등 시스템" subtitle="3색 + 이모지 + 한국어 라벨. 한 번에 알아봅니다.">
          <DCArtboard id="cv-solution" label="신호등 시스템" width={1440} height={900}>
            <SolutionPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="personas" title="페르소나 — 누구를 위해" subtitle="4명에게 통하면 모두에게 통합니다.">
          <DCArtboard id="cv-personas" label="4명의 페르소나" width={1440} height={900}>
            <PersonasPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="friendly" title="플로우 — 8개 화면" subtitle="처음부터 끝까지: 시작 → 찍기 → 결과 → 직원에게 → 식사 후">
          <DCArtboard id="fr-01" label="01 · 시작" width={360} height={780}>
            <OnboardingFriendly persona={persona}/>
          </DCArtboard>
          <DCArtboard id="fr-02" label="02 · 찍기 · 조준" width={360} height={780}>
            <CaptureFriendly stage="aim"/>
          </DCArtboard>
          <DCArtboard id="fr-02b" label="02 · 찍기 · 스캔" width={360} height={780}>
            <CaptureFriendly stage="scanning"/>
          </DCArtboard>
          <DCArtboard id="fr-02c" label="02 · 찍기 · 분석" width={360} height={780}>
            <CaptureFriendly stage="parsing"/>
          </DCArtboard>
          <DCArtboard id="fr-03" label="03 · 결과" width={360} height={780}>
            <ResultsScreenFriendly persona={persona} items={items}/>
          </DCArtboard>
          <DCArtboard id="fr-04" label="04 · 직원에게 보여주기" width={360} height={780}>
            <ShowStaffFriendly persona={persona} item={safeItem}/>
          </DCArtboard>
          <DCArtboard id="fr-05" label="05 · 상세 (안전)" width={360} height={780}>
            <DetailFriendly persona={persona} item={bibimbap}/>
          </DCArtboard>
          <DCArtboard id="fr-06" label="06 · 상세 (주의)" width={360} height={780}>
            <DetailFriendly persona={persona} item={stew}/>
          </DCArtboard>
          <DCArtboard id="fr-07" label="07 · 골라줄게요" width={360} height={780}>
            <RouletteFriendly persona={persona} items={items}/>
          </DCArtboard>
          <DCArtboard id="fr-08" label="08 · 식사 후" width={360} height={780}>
            <ReviewFriendly persona={persona} item={safeItem}/>
          </DCArtboard>
        </DCSection>

        <DCSection id="system" title="디자인 시스템" subtitle="컬러 · 타이포그래피 · 컴포넌트">
          <DCArtboard id="cv-system" label="디자인 시스템" width={1440} height={900}>
            <DesignSystemPage/>
          </DCArtboard>
        </DCSection>

        <DCSection id="explain" title="디자인 노트" subtitle="왜 이렇게 만들었나">
          <DCArtboard id="n1" label="System · the three lights" width={520} height={780}>
            <SystemNote/>
          </DCArtboard>
          <DCArtboard id="n2" label="Why dark + paper" width={520} height={780}>
            <ToneNote/>
          </DCArtboard>
          <DCArtboard id="n3" label="What's different" width={520} height={780}>
            <DiffNote/>
          </DCArtboard>
        </DCSection>

        <DCSection id="appendix" title="Appendix — 톤 탐색" subtitle="채택되지 않은 다른 시각 방향. 어둠 + 종이 톤 / 다양한 레이아웃 변형.">
          <DCArtboard id="ap-01" label="다크 · 01 시작" width={360} height={780}>
            <OnboardingScreen persona={persona}/>
          </DCArtboard>
          <DCArtboard id="ap-04" label="다크 · 직원 화면" width={360} height={780}>
            <ShowStaffScreen persona={persona} item={safeItem}/>
          </DCArtboard>
          <DCArtboard id="ap-r-glance" label="다크 · 결과 A · Glance" width={360} height={780}>
            <ResultsScreenV2 persona={persona} items={items} layout="glance"/>
          </DCArtboard>
          <DCArtboard id="ap-r-index" label="다크 · 결과 B · Index" width={360} height={780}>
            <ResultsScreenV2 persona={persona} items={items} layout="index"/>
          </DCArtboard>
          <DCArtboard id="ap-r-stack" label="다크 · 결과 C · Stack" width={360} height={780}>
            <ResultsScreenV2 persona={persona} items={items} layout="stack"/>
          </DCArtboard>
          <DCArtboard id="ap-detail-g" label="다크 · 상세 (안전)" width={360} height={780}>
            <DetailScreen persona={persona} item={bibimbap}/>
          </DCArtboard>
          <DCArtboard id="ap-detail-r" label="다크 · 상세 (주의)" width={360} height={780}>
            <DetailScreen persona={persona} item={stew}/>
          </DCArtboard>
          <DCArtboard id="ap-roulette" label="다크 · 룰렛" width={360} height={780}>
            <RouletteScreen persona={persona} items={items}/>
          </DCArtboard>
          <DCArtboard id="ap-review" label="다크 · 식사 후" width={360} height={780}>
            <ReviewScreen persona={persona} item={safeItem}/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      {panelOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={()=>{
        setPanelOpen(false);
        window.parent.postMessage({type:'__edit_mode_dismissed'}, '*');
      }}/>}
    </>
  );
}

function PersonaTab({id, persona, setTweak}) {
  const p = window.MENULENS_PERSONAS[id];
  const active = persona.id===id;
  return <button onClick={()=>setTweak('persona', id)} style={{
    display:'flex', alignItems:'center', gap:8,
    padding:'8px 12px', borderRadius:99, cursor:'pointer',
    background: active ? '#0E1116' : 'rgba(255,255,255,0.7)',
    color: active ? '#F4ECDF' : '#0E1116',
    border:`1px solid ${active ? '#0E1116' : 'rgba(14,17,22,0.12)'}`,
    fontFamily:'Inter Tight, sans-serif', fontSize:12, fontWeight:500, letterSpacing:0.2,
  }}>
    <span style={{fontFamily:'JetBrains Mono', fontSize:9, opacity:0.7, letterSpacing:1}}>{p.flag}</span>
    <span>{p.name}</span>
    <span style={{opacity:0.55}}>· {p.diet}</span>
  </button>;
}

window.MenuLensApp = App;
