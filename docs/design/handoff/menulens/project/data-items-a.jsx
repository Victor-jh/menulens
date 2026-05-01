// MenuLens — menu items (1/2)

const ITEMS_A = [
  {
    ko:'\uAE40\uCE58\uCC0C\uAC1C', romanized:'kimchi-jjigae', en:'Kimchi Stew',
    price:8000, benchmark:8500, spicy:2, category:'Stew',
    triggers:{ yui:['pork'], malik:['pork'], chen:[], john:[] },
    desc:'Fermented kimchi simmered with pork, tofu and scallions in a deep red broth.',
    short:'Korea\u2019s most-eaten home stew.',
    ingredients:[
      {ko:'\uB3FC\uC9C0\uACE0\uAE30', en:'Pork', allergen:['pork']},
      {ko:'\uAE40\uCE58',          en:'Kimchi', allergen:[]},
      {ko:'\uB450\uBD80',          en:'Tofu', allergen:['soy']},
      {ko:'\uB300\uD30C',          en:'Scallion', allergen:[]},
    ],
    when:'Lunch, dinner', origin:'Nationwide', pairsWith:['Rice','Soju'],
    typicalPrice:'7,000\u201310,000', servingTemp:'Hot',
    orderPhrase:'\uAE40\uCE58\uCC0C\uAC1C \uD558\uB098 \uC8FC\uC138\uC694',
  },
  {
    ko:'\uCC38\uCE58\uAE40\uBC25', romanized:'chamchi-gimbap', en:'Tuna Seaweed Roll',
    price:4500, benchmark:4500, spicy:0, category:'Rice roll',
    triggers:{ yui:[], malik:[], chen:[], john:[] },
    desc:'Seasoned rice with canned tuna, mayo, pickled radish and egg, wrapped in seaweed.',
    short:'The everyday hand-roll.',
    ingredients:[
      {ko:'\uCC38\uCE58',     en:'Tuna', allergen:['fish']},
      {ko:'\uACC4\uB780',     en:'Egg', allergen:['egg']},
      {ko:'\uB2E8\uBB34\uC9C0',en:'Pickled radish', allergen:[]},
      {ko:'\uC2DC\uAE08\uCE58',en:'Spinach', allergen:[]},
      {ko:'\uAE40',           en:'Seaweed', allergen:[]},
    ],
    when:'Anytime', origin:'Nationwide', pairsWith:['Ramyun','Soup'],
    typicalPrice:'3,500\u20135,500', servingTemp:'Room',
    orderPhrase:'\uCC38\uCE58\uAE40\uBC25 \uD558\uB098 \uC8FC\uC138\uC694',
  },
  {
    ko:'\uBE44\uBE94\uBC25', romanized:'bibimbap', en:'Mixed Rice Bowl',
    price:9000, benchmark:9500, spicy:1, category:'Rice bowl',
    triggers:{ yui:[], malik:[], chen:['sesame'], john:[] },
    desc:'Rice topped with seasonal vegetables, beef, egg and gochujang. Mix before eating.',
    short:'Build your own bowl.',
    ingredients:[
      {ko:'\uC1E0\uACE0\uAE30', en:'Beef', allergen:['beef']},
      {ko:'\uC2DC\uAE08\uCE58', en:'Spinach', allergen:[]},
      {ko:'\uB2F9\uADFC',       en:'Carrot', allergen:[]},
      {ko:'\uACC4\uB780',       en:'Egg', allergen:['egg']},
      {ko:'\uCC38\uAE30\uB984', en:'Sesame oil', allergen:['sesame']},
      {ko:'\uACE0\uCD94\uC7A5', en:'Gochujang', allergen:[]},
    ],
    when:'Lunch', origin:'Jeonju', pairsWith:['Miyeokguk'],
    typicalPrice:'8,000\u201312,000', servingTemp:'Warm',
    orderPhrase:'\uBE44\uBE94\uBC25 \uD558\uB098 \uC8FC\uC138\uC694',
  },
];

window.MENULENS_ITEMS_A = ITEMS_A;
