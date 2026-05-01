// MenuLens redesign — mock data

const PERSONAS = {
  yui:   { id:'yui',   name:'Yui',   flag:'JP', diet:'Pescatarian',     desc:'No pork, no chicken',          avoid:['pork','chicken','beef'] },
  malik: { id:'malik', name:'Malik', flag:'MY', diet:'Halal',           desc:'No pork, no alcohol',          avoid:['pork','alcohol'] },
  chen:  { id:'chen',  name:'Chen',  flag:'CN', diet:'Peanut allergy',  desc:'Severe peanut, sesame allergy', avoid:['peanut','sesame','nuts'] },
  john:  { id:'john',  name:'John',  flag:'US', diet:'No restrictions',  desc:'Looking for what locals love', avoid:[] },
};

const DEMO_ITEMS = [
  { name:'KIMCHI_JJIGAE_KO', romanized:'kimchi-jjigae', en:'Kimchi Stew', price:8000, benchmark:8500, spicy:2, category:'Stew',
    triggers:{ yui:['pork'], malik:['pork'], chen:[], john:[] },
    desc:'Fermented kimchi simmered with pork, tofu and scallions in a deep red broth.',
    short:"Korea's most-eaten home stew.",
    ingredients:[ {en:'Pork',allergen:['pork']}, {en:'Kimchi',allergen:[]}, {en:'Tofu',allergen:['soy']}, {en:'Scallion',allergen:[]}, {en:'Garlic',allergen:[]} ],
    when:'Lunch, dinner', origin:'Nationwide', pairsWith:['Rice','Soju'],
    typicalPrice:'7,000-10,000', servingTemp:'Hot' },
  { name:'CHAMCHI_GIMBAP_KO', romanized:'chamchi-gimbap', en:'Tuna Seaweed Roll', price:4500, benchmark:4500, spicy:0, category:'Rice roll',
    triggers:{ yui:[], malik:[], chen:[], john:[] },
    desc:'Seasoned rice with canned tuna, mayo, pickled radish and egg, wrapped in seaweed.',
    short:'The everyday hand-roll.',
    ingredients:[ {en:'Tuna',allergen:['fish']}, {en:'Egg',allergen:['egg']}, {en:'Pickled radish',allergen:[]} ],
    when:'Anytime', origin:'Nationwide', pairsWith:['Ramyun','Soup'],
    typicalPrice:'3,500-5,500', servingTemp:'Room' },
];

window.MENULENS_DATA = { PERSONAS, DEMO_ITEMS };
