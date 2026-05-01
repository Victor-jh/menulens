// Shared style tokens + small atoms

const ML = {
  // Editorial dark
  ink: '#0E1116',          // near-black ground
  paper: '#F4ECDF',        // warm paper for "for staff" cards
  warmInk: '#1A1410',      // ink on paper
  // Functional
  green: '#7DDC8A',
  yellow: '#F4C674',
  red: '#FF6A5A',
  // Neutrals
  fog: '#9AA3AE',
  mute: '#5A6470',
  hairline: 'rgba(255,255,255,0.08)',
  // Typography
  serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  sans: '"Inter Tight", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  ko:   '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
};

window.ML = ML;

// Signal light — luminous ringed dot. THE meta-graphic.
function SignalLight({ color = 'green', size = 14, glow = true, ring = true }) {
  const c = ML[color] || color;
  return (
    <span style={{
      display:'inline-block', position:'relative',
      width:size, height:size, verticalAlign:'middle',
    }}>
      {ring && <span style={{
        position:'absolute', inset:-4, borderRadius:'50%',
        border:`1px solid ${c}55`,
      }} />}
      <span style={{
        position:'absolute', inset:0, borderRadius:'50%',
        background:c,
        boxShadow: glow ? `0 0 ${size*0.8}px ${c}aa, 0 0 ${size*1.6}px ${c}33` : 'none',
      }} />
    </span>
  );
}

function Hairline({ vertical=false, color=ML.hairline, style }) {
  return <div style={{
    background:color,
    width: vertical ? 1 : '100%', height: vertical ? '100%' : 1,
    ...style,
  }} />;
}

// Tiny chip
function Chip({ children, tone='neutral', style }) {
  const map = {
    neutral: { bg:'rgba(255,255,255,0.06)', fg:'#E6E8EC', bd:'rgba(255,255,255,0.10)' },
    paper:   { bg:'rgba(26,20,16,0.06)', fg:ML.warmInk, bd:'rgba(26,20,16,0.12)' },
    red:     { bg:'rgba(255,106,90,0.12)', fg:ML.red, bd:'rgba(255,106,90,0.30)' },
    yellow:  { bg:'rgba(244,198,116,0.12)', fg:ML.yellow, bd:'rgba(244,198,116,0.30)' },
    green:   { bg:'rgba(125,220,138,0.12)', fg:ML.green, bd:'rgba(125,220,138,0.30)' },
  };
  const t = map[tone] || map.neutral;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 9px', borderRadius:999,
      background:t.bg, color:t.fg, border:`1px solid ${t.bd}`,
      fontFamily: ML.sans, fontSize:11, letterSpacing:0.2,
      fontWeight:500, textTransform:'uppercase',
      ...style,
    }}>{children}</span>
  );
}

// Section index – tiny label like "01 / Sees menu"
function IndexLabel({ n, label, style }){
  return <div style={{
    fontFamily: ML.mono, fontSize:11, letterSpacing:1.5,
    color: ML.fog, textTransform:'uppercase', display:'flex', gap:10,
    ...style,
  }}>
    <span style={{color:'#fff', opacity:0.6}}>{n}</span>
    <span>{label}</span>
  </div>;
}

Object.assign(window, { SignalLight, Hairline, Chip, IndexLabel });
