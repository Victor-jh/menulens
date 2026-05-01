// Print mount — renders all artboards in a paged layout for PDF export.
// Each page = title strip + 2-up iPhone frames (or 1 large note card).

const PRINT = {
  paper: '#F4ECDF',
  ink: '#0E1116',
  fog: '#9AA3AE',
};

function PrintFrame({ children, label, n, persona }) {
  return (
    <div className="print-frame">
      <div className="print-meta">
        <span className="print-n">{n}</span>
        <span className="print-label">{label}</span>
      </div>
      <div className="print-phone">
        <IOSDevice width={360} height={780} dark>{children}</IOSDevice>
      </div>
    </div>
  );
}

function PrintApp() {
  const persona = window.MENULENS_PERSONAS.yui;
  const items = window.MENULENS_DEMO_ITEMS();
  const stew = items.find(i => i.romanized==='kimchi-jjigae');
  const bibimbap = items.find(i => i.romanized==='bibimbap');
  const safeItem = items.find(i => window.menulensColorFor(i, persona)==='green' && !i.isFreeSide) || bibimbap;

  // Group artboards into pages (2 frames per page).
  const screens = [
    { n:'01', label:'Welcome',                el: <OnboardingScreen persona={persona}/> },
    { n:'02a', label:'Aim',                   el: <CaptureScreen stage="aim"/> },
    { n:'02b', label:'Scanning',              el: <CaptureScreen stage="scanning"/> },
    { n:'02c', label:'Parsing',               el: <CaptureScreen stage="parsing"/> },
    { n:'03', label:'Three-light triage',     el: <ResultsScreen persona={persona} items={items}/> },
    { n:'04', label:'Show staff (the hero)',  el: <ShowStaffScreen persona={persona} item={safeItem}/> },
    { n:'05', label:'Detail · safe',          el: <DetailScreen persona={persona} item={bibimbap}/> },
    { n:'06', label:'Detail · flagged',       el: <DetailScreen persona={persona} item={stew}/> },
    { n:'07', label:'Roulette',               el: <RouletteScreen persona={persona} items={items}/> },
    { n:'08', label:'After-meal',             el: <ReviewScreen persona={persona} item={safeItem}/> },
    { n:'A', label:'Glance — color first',    el: <ResultsScreenV2 persona={persona} items={items} layout="glance"/> },
    { n:'B', label:'Index — menu-style list', el: <ResultsScreenV2 persona={persona} items={items} layout="index"/> },
    { n:'C', label:'Stack — gallery tiles',   el: <ResultsScreenV2 persona={persona} items={items} layout="stack"/> },
    { n:'F1', label:'Glance + filters',       el: <ResultsScreenV3 persona={persona} items={items} layout="glance"/> },
    { n:'F2', label:'Index + filters',        el: <ResultsScreenV3 persona={persona} items={items} layout="index"/> },
    { n:'F3', label:'Stack + filters',        el: <ResultsScreenV3 persona={persona} items={items} layout="stack"/> },
  ];

  // 2 phones per page.
  const phonePages = [];
  for (let i=0; i<screens.length; i+=2) {
    phonePages.push(screens.slice(i, i+2));
  }

  return (
    <div className="print-doc">
      {/* Cover */}
      <section className="print-page cover">
        <div className="cover-grid">
          <div className="cover-lights">
            <div className="cl red"/><div className="cl yellow"/><div className="cl green"/>
          </div>
          <div className="cover-meta">MENULENS · REDESIGN BOOK</div>
          <div className="cover-title">
            Three lights.<br/>
            <em>One menu you can read.</em>
          </div>
          <div className="cover-sub">
            For travelers who can’t read the menu — a redesign by way of three lights.
            16 screens, 4 personas, 1 paper card you can hand across the table.
          </div>
          <div className="cover-toc">
            <div><span>FLOW</span><span>01 — 04</span></div>
            <div><span>GOING DEEPER</span><span>05 — 08</span></div>
            <div><span>RESULTS — 3 WAYS</span><span>A — C</span></div>
            <div><span>WITH FILTERS</span><span>F1 — F3</span></div>
            <div><span>DESIGN NOTES</span><span>N1 — N3</span></div>
          </div>
        </div>
      </section>

      {/* 2-up phone pages */}
      {phonePages.map((pair, idx) => (
        <section key={idx} className="print-page phones">
          <div className="page-header">
            <span>MENULENS · REDESIGN</span>
            <span>For Yui · Pescatarian</span>
            <span>{idx+2} / {phonePages.length+5}</span>
          </div>
          <div className="phones-row">
            {pair.map((s, i) => (
              <PrintFrame key={i} n={s.n} label={s.label}>{s.el}</PrintFrame>
            ))}
          </div>
        </section>
      ))}

      {/* Note pages — one per page, full bleed */}
      <section className="print-page note">
        <SystemNote/>
      </section>
      <section className="print-page note dark">
        <ToneNote/>
      </section>
      <section className="print-page note">
        <DiffNote/>
      </section>

      {/* Back cover */}
      <section className="print-page back">
        <div className="back-grid">
          <div className="back-lights">
            <div className="cl green"/>
          </div>
          <div className="back-title"><em>Order</em><br/>freely.</div>
          <div className="back-meta">— end of book —</div>
        </div>
      </section>
    </div>
  );
}

window.PrintApp = PrintApp;

const printRoot = ReactDOM.createRoot(document.getElementById('root'));
printRoot.render(React.createElement(window.PrintApp));
