// MenuLens redesign — personas

const PERSONAS = {
  yui:   { id:'yui',   name:'Yui',   flag:'JP', diet:'Pescatarian',     desc:'No pork, no chicken',
           avoid:['pork','chicken','beef'] },
  malik: { id:'malik', name:'Malik', flag:'MY', diet:'Halal',           desc:'No pork, no alcohol',
           avoid:['pork','alcohol'] },
  chen:  { id:'chen',  name:'Chen',  flag:'CN', diet:'Peanut allergy',  desc:'Severe peanut + sesame allergy',
           avoid:['peanut','sesame','nuts'] },
  john:  { id:'john',  name:'John',  flag:'US', diet:'No restrictions', desc:'Looking for what locals love',
           avoid:[] },
};

function colorFor(item, persona) {
  if (item.isFreeSide) return 'green';
  const triggers = item.triggers[persona.id] || [];
  if (triggers.length > 0) {
    const hard = triggers.some((t) => persona.avoid.includes(t));
    return hard ? 'red' : 'yellow';
  }
  if (item.price && item.benchmark) {
    const ratio = item.price / item.benchmark;
    if (ratio > 1.3) return 'yellow';
  }
  return 'green';
}

function reasonsFor(item, persona) {
  const tr = item.triggers[persona.id] || [];
  const reasons = [];
  tr.forEach((t) => {
    if (persona.avoid.includes(t)) reasons.push('Contains ' + t);
    else reasons.push('May contain ' + t);
  });
  if (item.price && item.benchmark) {
    const ratio = item.price / item.benchmark;
    if (ratio > 1.15) reasons.push('+' + Math.round((ratio-1)*100) + '% above typical');
    else if (ratio < 0.9) reasons.push('Good value, ' + Math.round((1-ratio)*100) + '% under');
  }
  return reasons;
}

window.MENULENS_PERSONAS = PERSONAS;
window.menulensColorFor = colorFor;
window.menulensReasonsFor = reasonsFor;
