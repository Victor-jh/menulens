// MenuLens — menu items (2/2)

const ITEMS_B = [
  {
    ko:'\uD574\uBB3C\uD30C\uC804', romanized:'haemul-pajeon', en:'Seafood Scallion Pancake',
    price:14000, benchmark:13000, spicy:0, category:'Pancake',
    triggers:{ yui:[], malik:[], chen:[], john:[] },
    desc:'Crisp scallion-rich pancake studded with squid, shrimp and mussels.',
    short:'Rainy-day classic.',
    ingredients:[
      {ko:'\uB300\uD30C',       en:'Scallion', allergen:[]},
      {ko:'\uC624\uC9D5\uC5B4', en:'Squid', allergen:['seafood','shellfish']},
      {ko:'\uC0C8\uC6B0',       en:'Shrimp', allergen:['seafood','shellfish']},
      {ko:'\uD64D\uD569',       en:'Mussel', allergen:['seafood','shellfish']},
      {ko:'\uBC00\uAC00\uB8E8', en:'Wheat flour', allergen:['gluten']},
    ],
    when:'Evening, rain', origin:'Busan / Dongnae', pairsWith:['Makgeolli'],
    typicalPrice:'12,000\u201316,000', servingTemp:'Hot',
    orderPhrase:'\uD574\uBB3C\uD30C\uC804 \uD558\uB098 \uC8FC\uC138\uC694',
  },
  {
    ko:'\uC81C\uC721\uBCF6\uC74C', romanized:'jeyuk-bokkeum', en:'Spicy Pork Stir-fry',
    price:9500, benchmark:9000, spicy:3, category:'Stir-fry',
    triggers:{ yui:['pork'], malik:['pork'], chen:[], john:[] },
    desc:'Thin pork shoulder stir-fried in red pepper paste with onion and garlic.',
    short:'Office-lunch staple.',
    ingredients:[
      {ko:'\uB3FC\uC9C0\uACE0\uAE30', en:'Pork', allergen:['pork']},
      {ko:'\uC591\uD30C',           en:'Onion', allergen:[]},
      {ko:'\uACE0\uCD94\uC7A5',     en:'Gochujang', allergen:['gluten']},
      {ko:'\uB9C8\uB298',           en:'Garlic', allergen:[]},
    ],
    when:'Lunch', origin:'Nationwide', pairsWith:['Rice','Cold soju'],
    typicalPrice:'8,500\u201311,000', servingTemp:'Hot',
    orderPhrase:'\uC81C\uC721\uBCF6\uC74C \uD558\uB098 \uC8FC\uC138\uC694',
  },
  {
    ko:'\uB2E8\uBB34\uC9C0', romanized:'danmuji', en:'Pickled Radish',
    price:null, benchmark:null, spicy:0, category:'Free side', isFreeSide:true,
    triggers:{ yui:[], malik:[], chen:[], john:[] },
    desc:'Bright yellow pickled daikon. Comes free with most kimbap.',
    short:'Always free. Don\u2019t order.',
    ingredients:[ {ko:'\uBB34', en:'Daikon', allergen:[]} ],
    when:'With main', origin:'Korean-Chinese tradition', pairsWith:['Kimbap'],
    typicalPrice:'Free', servingTemp:'Cold', orderPhrase:'',
  },
];

window.MENULENS_ITEMS_B = ITEMS_B;
window.MENULENS_DEMO_ITEMS = function(){ return [...(window.MENULENS_ITEMS_A||[]), ...ITEMS_B]; };
