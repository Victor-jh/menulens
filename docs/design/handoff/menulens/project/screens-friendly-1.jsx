// Friendly screens — Onboarding + Capture
function OnboardingFriendly({ persona }) {
  return <div style={{width:'100%', height:'100%', background:FR.cream, color:FR.ink,
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54}}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'18px 22px',
      display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <span style={{fontFamily:ML.mono, fontSize:10, letterSpacing:1.4, color:FR.fog}}>01 / 시작</span>
      <span style={{fontFamily:ML.ko, fontSize:14, fontWeight:700, color:FR.ink, letterSpacing:-0.3}}>🥒 메뉴렌즈</span>
    </div>
    <div style={{position:'absolute', top:120, left:24, right:24}}>
      <div style={{fontSize:46, lineHeight:1}}>👋</div>
      <div style={{fontFamily:ML.ko, fontSize:32, fontWeight:800, lineHeight:1.18, letterSpacing:-1, color:FR.ink, marginTop:12}}>
        한글 메뉴판,<br/><span style={{color:FR.pickle}}>대신 읽어드릴게요</span>
      </div>
      <p style={{fontFamily:ML.ko, fontSize:14, lineHeight:1.55, color:FR.inkSoft, marginTop:14, maxWidth:280}}>
        사진만 찍으면 뭘 먹어도 되는지,<br/>뭘 물어봐야 하는지 알려드려요
      </p>
    </div>
    <div style={{position:'absolute', left:24, right:24, top:336, display:'flex', flexDirection:'column', gap:8}}>
      <SignalRowFR c="green"  emoji="🥒" label="맘껏 드세요"   sub="안전한 메뉴"/>
      <SignalRowFR c="yellow" emoji="🤔" label="한 번 물어봐요" sub="확인 필요"/>
      <SignalRowFR c="red"    emoji="✋" label="이건 패스"      sub="피해야 할 메뉴"/>
    </div>
    <div style={{position:'absolute', left:20, right:20, bottom:140,
      background:FR.cream2, border:`1px solid ${FR.border}`, borderRadius:16, padding:'14px 16px',
      display:'flex', alignItems:'center', gap:12}}>
      <div style={{width:42, height:42, borderRadius:'50%', background:FR.pickleSoft,
        display:'grid', placeItems:'center', fontFamily:ML.ko, fontSize:18, fontWeight:700, color:FR.pickle}}>{persona.name[0]}</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:ML.ko, fontSize:14, color:FR.ink, fontWeight:700}}>{persona.name}님</div>
        <div style={{fontFamily:ML.ko, fontSize:11, color:FR.fog, marginTop:2}}>{persona.desc}</div>
      </div>
      <span style={{fontFamily:ML.ko, fontSize:11, color:FR.pickle, fontWeight:600}}>변경</span>
    </div>
    <div style={{position:'absolute', left:20, right:20, bottom:36}}>
      <button style={{width:'100%', height:54, borderRadius:14, border:'none',
        background:FR.pickle, color:'#fff',
        fontFamily:ML.ko, fontSize:15, fontWeight:700, letterSpacing:-0.3,
        boxShadow:`0 6px 18px ${FR.pickle}50`,
        display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer'}}>📷 메뉴판 찍어보기</button>
      <div style={{textAlign:'center', marginTop:12, fontFamily:ML.ko, fontSize:12, color:FR.fog}}>
        또는 <span style={{color:FR.ink, fontWeight:600, textDecoration:'underline', textUnderlineOffset:3}}>사진 불러오기</span>
      </div>
    </div>
  </div>;
}

function SignalRowFR({c, emoji, label, sub}) {
  const tone = FR_TONE[c];
  return <div style={{background:FR.cream2, border:`1px solid ${FR.border}`,
    borderRadius:14, padding:'10px 14px', display:'flex', alignItems:'center', gap:12}}>
    <div style={{width:36, height:36, borderRadius:10, background:tone.soft,
      display:'grid', placeItems:'center', fontSize:18}}>{emoji}</div>
    <div style={{flex:1}}>
      <div style={{fontFamily:ML.ko, fontSize:14, fontWeight:700, color:FR.ink}}>{label}</div>
      <div style={{fontFamily:ML.ko, fontSize:11, color:FR.fog, marginTop:1}}>{sub}</div>
    </div>
    <span style={{width:10, height:10, borderRadius:'50%', background:tone.c}}/>
  </div>;
}

function CaptureFriendly({ stage='aim' }) {
  const isAim = stage==='aim', isScan = stage==='scanning', isParse = stage==='parsing';
  return <div style={{width:'100%', height:'100%', background:'#1A1A1A', color:'#fff',
    fontFamily:ML.sans, position:'relative', overflow:'hidden', paddingTop:54}}>
    <div style={{position:'absolute', top:54, left:0, right:0, padding:'12px 18px',
      display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:5}}>
      <span style={{padding:'6px 12px', borderRadius:99, background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(8px)', fontFamily:ML.ko, fontSize:12, color:'#fff', fontWeight:600}}>✕ 닫기</span>
      <span style={{padding:'6px 12px', borderRadius:99, background:FR.pickle,
        fontFamily:ML.ko, fontSize:12, color:'#fff', fontWeight:700}}>02 / 찍기</span>
    </div>
    <div style={{position:'absolute', inset:0,
      background:'radial-gradient(120% 80% at 50% 30%, #2A1A12 0%, #120A07 60%, #050302 100%)',
      opacity: isParse ? 0.4 : 1, transition:'opacity .4s'}}>
      <div style={{position:'absolute', left:'50%', top:'48%', transform:'translate(-50%,-50%) rotate(-2deg)',
        width:240, height:300, background:FR.cream2, borderRadius:8,
        boxShadow:'0 30px 60px rgba(0,0,0,0.6)',
        padding:'20px 18px', color:FR.ink, fontFamily:ML.ko, fontSize:11, lineHeight:1.7}}>
        <div style={{fontFamily:ML.ko, fontSize:18, fontWeight:800, color:FR.ink,
          borderBottom:`1px solid ${FR.border}`, paddingBottom:6, marginBottom:8, letterSpacing:-0.5}}>
          오늘의 메뉴 🍽️
        </div>
        {['김치찌개  8,000','된장찌개  7,500','참치김밥  4,500','비빔밥  9,000','제육볶음  9,500','해물파전  14,000','공깃밥  1,000','단무지  무료'].map((r,i)=>(
          <div key={i} style={{display:'flex', justifyContent:'space-between', borderBottom:`1px dashed ${FR.border}`, paddingBottom:3, marginBottom:3}}>
            <span>{r.split('  ')[0]}</span>
            <span style={{fontFamily:ML.mono, fontSize:10}}>{r.split('  ')[1]}</span>
          </div>
        ))}
      </div>
      {isScan && <div style={{position:'absolute', left:'50%', top:'48%', transform:'translate(-50%,-50%) rotate(-2deg)',
        width:280, height:340, borderRadius:14,
        boxShadow:`inset 0 0 0 3px ${FR.pickle}, 0 0 60px ${FR.pickle}88`,
        animation:'frpulse 1.6s ease-in-out infinite'}}/>}
    </div>
    {isAim && <CornersFR/>}
    <div style={{position:'absolute', left:0, right:0, top:'40%', display:'flex', justifyContent:'center'}}>
      <div style={{padding:'12px 18px', borderRadius:18, background:FR.cream2,
        boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
        display:'flex', alignItems:'center', gap:10,
        fontFamily:ML.ko, fontSize:13, color:FR.ink, fontWeight:600, letterSpacing:-0.3}}>
        {isAim && <>📐 <span>메뉴판 전체가 보이게 맞춰주세요</span></>}
        {isScan && <>🔍 <span>읽고 있어요... <span style={{color:FR.pickle, fontFamily:ML.mono}}>64/142</span></span></>}
        {isParse && <>🤔 <span>맞는 메뉴 찾는 중...</span></>}
      </div>
    </div>
    <div style={{position:'absolute', left:0, right:0, bottom:0, padding:'24px 24px 36px',
      background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))'}}>
      {!isParse && <div style={{display:'flex', justifyContent:'center', gap:18, marginBottom:18}}>
        <ModeFR active={!isScan} label="실시간"/>
        <ModeFR active={false} label="사진"/>
        <ModeFR active={false} label="여러 장"/>
      </div>}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{width:46, height:46, borderRadius:14,
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
          display:'grid', placeItems:'center', fontSize:20}}>📂</div>
        <button style={{width:74, height:74, borderRadius:'50%', border:`4px solid #fff`,
          background: isScan ? FR.blush : '#fff', cursor:'pointer',
          boxShadow:`0 0 0 4px rgba(255,255,255,0.15)`, transition:'background .3s'}}/>
        <div style={{width:46, height:46, borderRadius:14,
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
          display:'grid', placeItems:'center', fontSize:18}}>⚡</div>
      </div>
    </div>
    {isParse && <ParseOverlayFR/>}
    <style>{`@keyframes frpulse { 0%,100%{box-shadow:inset 0 0 0 3px ${FR.pickle}, 0 0 60px ${FR.pickle}88} 50%{box-shadow:inset 0 0 0 3px ${FR.pickle}, 0 0 100px ${FR.pickle}cc} }`}</style>
  </div>;
}

function CornersFR() {
  const c = FR.pickle;
  const s = {position:'absolute', width:34, height:34, borderColor:c, borderStyle:'solid', borderRadius:4};
  return <>
    <div style={{...s, left:36, top:'22%', borderTop:'3px solid', borderLeft:'3px solid'}}/>
    <div style={{...s, right:36, top:'22%', borderTop:'3px solid', borderRight:'3px solid'}}/>
    <div style={{...s, left:36, bottom:'34%', borderBottom:'3px solid', borderLeft:'3px solid'}}/>
    <div style={{...s, right:36, bottom:'34%', borderBottom:'3px solid', borderRight:'3px solid'}}/>
  </>;
}

function ModeFR({active, label}) {
  return <div style={{fontFamily:ML.ko, fontSize:12, fontWeight:active?700:500,
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    padding:'6px 14px', borderRadius:99,
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    backdropFilter: active ? 'blur(8px)' : 'none'}}>{label}</div>;
}

function ParseOverlayFR() {
  const steps = [
    { t:'글자 읽는 중', e:'✓', s:'done' },
    { t:'한국어 → 알아보기 쉽게', e:'✓', s:'done' },
    { t:'근처 식당과 가격 비교', e:'⏳', s:'doing' },
    { t:'알러지·식단 체크', e:'·', s:'idle' },
    { t:'추천 정렬', e:'·', s:'idle' },
  ];
  return <div style={{position:'absolute', inset:0, background:`${FR.cream}f5`,
    backdropFilter:'blur(10px)', display:'flex', flexDirection:'column', justifyContent:'flex-end',
    padding:'0 24px 56px', color:FR.ink}}>
    <div style={{fontSize:54}}>🥒</div>
    <div style={{fontFamily:ML.ko, fontSize:30, fontWeight:800, lineHeight:1.1, letterSpacing:-1, marginTop:8}}>
      잠깐만요...<br/><span style={{color:FR.pickle}}>읽고 있어요</span>
    </div>
    <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:28}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex', alignItems:'center', gap:12,
          padding:'10px 14px', borderRadius:12,
          background: s.s==='idle' ? 'transparent' : FR.cream2,
          border: s.s==='idle' ? '1px dashed rgba(31,26,20,0.12)' : `1px solid ${FR.border}`,
          opacity: s.s==='idle' ? 0.5 : 1}}>
          <span style={{width:24, height:24, borderRadius:'50%',
            background: s.s==='done' ? FR.pickle : s.s==='doing' ? FR.honey : 'transparent',
            color:'#fff', fontSize:13, fontWeight:700,
            display:'grid', placeItems:'center',
            border: s.s==='idle' ? `1px solid ${FR.border}` : 'none'}}>{s.e}</span>
          <span style={{fontFamily:ML.ko, fontSize:13, fontWeight:600, color: s.s==='idle' ? FR.fog : FR.ink}}>{s.t}</span>
        </div>
      ))}
    </div>
  </div>;
}

window.OnboardingFriendly = OnboardingFriendly;
window.CaptureFriendly = CaptureFriendly;
