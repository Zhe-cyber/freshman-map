// Mock payload in the exact contract shape. CLOUD replaces this with the API.
// Buildings + food coordinates are REAL, pulled from OpenStreetMap (Overpass).
// Floors, landmarks and reliability counts are placeholders — the walking
// survey replaces them. OSM has zero toilets/water/ATMs here; that is the point.

export const TYPES = {
  toilet: { label: '廁所',   en: 'Toilet',   icon: '🧻', color: '#34c98b' },
  water:  { label: '飲水機', en: 'Water',    icon: '💧', color: '#3fb6f2' },
  atm:    { label: 'ATM',    en: 'ATM',      icon: '🏧', color: '#ff6b8a' },
  food:   { label: '美食',   en: 'Food',     icon: '🍜', color: '#ff8a3d' },
  bike:   { label: 'U-Bike', en: 'U-Bike',   icon: '🚲', color: '#f2c53d' },
  gate:   { label: '校門',   en: 'Entrance', icon: '🚪', color: '#a97cf2' }
}

export const DIET = {
  veg:   ['素食', 't-veg'],
  vegan: ['全素 vegan', 't-vegan'],
  ask:   ['清真？要問 ask', 't-ask']
}

const B = (buildingId, name, en, lat, lng) => ({ campusId: 'cycu', buildingId, name, en, lat, lng })
const I = (itemId, buildingId, floor, type, landmark, note, yes, no) => ({
  campusId: 'cycu', itemId, buildingId, floor, type, landmark, note,
  reliability: yes === undefined ? null
    : { yes, no, score: yes / (yes + no), lastReportAt: '2026-08-14T09:12:00Z' }
})

export const MOCK = {
  buildings: [
    B('lib',  '張靜愚紀念圖書館', 'Library',                  24.958309, 121.240707),
    B('eng',  '工學館',           'Engineering Building',      24.957285, 121.244358),
    B('gym',  '中原大學體育館',   'Gymnasium',                 24.960043, 121.242361),
    B('act',  '學生活動中心',     'Student Activity Centre',   24.959014, 121.240978),
    B('zhen', '真知教學大樓',     'Zhen Zhi Teaching Building',24.956049, 121.241868),
    B('elec', '電學大樓',         'Electrical Engineering',    24.955929, 121.242519)
  ],

  items: [
    I('lib-b1w','lib','B1','water', '自習室外 · Outside study room','冰 / 溫'),
    I('lib-1t', 'lib','1F','toilet','服務台後方 · Behind the desk','男 / 女', 22, 2),
    I('lib-2w', 'lib','2F','water', '電梯旁 · Next to the lift','冰 / 溫 / 熱'),
    I('lib-4t', 'lib','4F','toilet','安靜區入口 · Quiet zone entry','男 / 女', 17, 3),
    I('eng-1t', 'eng','1F','toilet','大廳右側 · Right of the lobby','無障礙 accessible', 6, 9),
    I('eng-1a', 'eng','1F','atm',   '大廳入口 · By the entrance','外國卡？要確認 verify'),
    I('eng-3t', 'eng','3F','toilet','東側樓梯旁 · Near east stairs','男 / 女', 19, 5),
    I('eng-3w', 'eng','3F','water', '茶水間 · Pantry corner','冰 / 溫 / 熱'),
    I('eng-5t', 'eng','5F','toilet','走廊底 · End of corridor','男 / 女', 21, 2),
    I('gym-1t', 'gym','1F','toilet','球場旁 · Beside the courts','自備衛生紙 BYO paper', 3, 14),
    I('gym-1w', 'gym','1F','water', '入口處 · At the entrance','冰 / 溫'),
    I('act-1t', 'act','1F','toilet','販賣機後面 · Behind vending machines','男 / 女', 12, 6),
    I('act-1w', 'act','1F','water', '販賣機旁 · Next to vending machines','冰 / 溫 / 熱'),
    I('act-2t', 'act','2F','toilet','社團辦公室走廊 · Club office hallway','男 / 女', 15, 4),
    I('zhen-2t','zhen','2F','toilet','樓梯間旁 · By the stairwell','男 / 女', 16, 5),
    I('zhen-3w','zhen','3F','water', '走廊中段 · Middle of corridor','冰 / 溫 / 熱'),
    I('elec-1w','elec','1F','water', '大廳角落 · Lobby corner','冰 / 溫'),
    I('elec-4t','elec','4F','toilet','電梯出來左轉 · Left out of the lift','男 / 女', 13, 7)
  ],

  // Outdoor pins. Food yes/no = "can I order in English?", same engine as 廁紙.
  places: [
    { placeId:'f1', type:'food', icon:'🌙', name:'中原夜市', en:'Night market · 就在校門口',
      lat:24.955002, lng:121.240521, price:1, diet:['ask'], cash:true, yes:24, no:3,
      say:'這個怎麼賣？', sayEn:'How much is this?' },
    { placeId:'f2', type:'food', icon:'🥗', name:'素怡園素食自助餐', en:'Vegetarian buffet',
      lat:24.955881, lng:121.241123, price:1, diet:['veg'], cash:true, yes:9, no:6,
      say:'我夾這些，白飯一碗，謝謝', sayEn:'These please, with one bowl of rice' },
    { placeId:'f3', type:'food', icon:'🍜', name:'香知有素', en:'Vegetarian ramen',
      lat:24.954859, lng:121.242246, price:2, diet:['veg'], cash:false, yes:14, no:4,
      say:'我要一碗素拉麵，謝謝', sayEn:'One vegetarian ramen please' },
    { placeId:'f4', type:'food', icon:'🍳', name:'得來素蔬食早午餐', en:'Veg brunch',
      lat:24.953825, lng:121.241348, price:1, diet:['veg'], cash:true, yes:11, no:3,
      say:'一份素食鐵板麵，一杯豆漿紅茶', sayEn:'Veg teppanyaki noodle and soy milk tea' },
    { placeId:'f5', type:'food', icon:'🥬', name:'東興素食', en:'Vegetarian',
      lat:24.955122, lng:121.241709, price:1, diet:['veg'], cash:true, yes:8, no:4,
      say:'我吃素，這個有蔥蒜嗎？', sayEn:'I am vegetarian — onion or garlic in this?' },
    { placeId:'f6', type:'food', icon:'🇲🇾', name:'馬來一哥', en:'Malaysian',
      lat:24.956355, lng:121.237599, price:2, diet:['ask'], cash:true, yes:18, no:2,
      say:'請問這裡是清真的嗎？有豬肉嗎？', sayEn:'Is this halal? Any pork?' },
    { placeId:'f7', type:'food', icon:'🍛', name:'小肥大馬餐室', en:'Malaysian kopitiam',
      lat:24.955488, lng:121.241168, price:2, diet:['ask'], cash:true, yes:15, no:3,
      say:'請問有沒有豬肉？', sayEn:'Does this contain pork?' },
    { placeId:'f8', type:'food', icon:'🥖', name:'Robaku 印尼烤麵包', en:'Indonesian roti bakar',
      lat:24.956104, lng:121.240610, price:1, diet:['ask'], cash:true, yes:17, no:2,
      say:'一份烤麵包，謝謝', sayEn:'One grilled bread, thanks' },
    { placeId:'f9', type:'food', icon:'🇻🇳', name:'Quán ăn Việt Nam', en:'Vietnamese',
      lat:24.956163, lng:121.237945, price:2, diet:['ask'], cash:true, yes:13, no:4,
      say:'一碗河粉，不要香菜', sayEn:'One pho, no cilantro' },
    { placeId:'f10', type:'food', icon:'🍗', name:'小泰國海南雞飯', en:'Thai & Hainan chicken',
      lat:24.954403, lng:121.241306, price:1, diet:['ask'], cash:true, yes:12, no:5,
      say:'一份海南雞飯，不要辣', sayEn:'One Hainan chicken rice, not spicy' },
    { placeId:'f11', type:'food', icon:'🍲', name:'老師傅牛肉麵', en:'Beef noodles',
      lat:24.955257, lng:121.238794, price:2, diet:['ask'], cash:true, yes:10, no:7,
      say:'一碗牛肉麵，不要香菜', sayEn:'One beef noodle soup, no cilantro' },
    { placeId:'f12', type:'food', icon:'🍮', name:'手工烤布蕾', en:'Crème brûlée · NT$35',
      lat:24.955952, lng:121.240222, price:1, diet:['veg'], cash:true, yes:16, no:2,
      say:'三個一百，謝謝', sayEn:'Three for a hundred, thanks' },

    // Offline fallback. The map normally replaces these with the official live YouBike feed.
    { placeId:'b1', type:'bike', name:'中原大學', en:'YouBike · 站號 500304004',
      lat:24.957940, lng:121.240200, bikes:9, docks:99 },
    { placeId:'b2', type:'bike', name:'中原大學土木館(中原埤塘)', en:'YouBike · 500304146',
      lat:24.956450, lng:121.245290, bikes:6, docks:21 },
    { placeId:'b3', type:'bike', name:'環中東實踐路口', en:'YouBike · 500304078',
      lat:24.953680, lng:121.243340, bikes:10, docks:40 },

    { placeId:'g1', type:'gate', name:'警衛室 · 校門', en:'Guard house at the gate',
      lat:24.957270, lng:121.240539 },
    { placeId:'c1', type:'atm', name:'7-Eleven', en:'ATM · 外國卡通常可用',
      lat:24.956784, lng:121.239374 },
    { placeId:'c2', type:'atm', name:'7-Eleven', en:'ATM · 校園東側',
      lat:24.958180, lng:121.244797 }
  ],

  activities: [
    { campusId:'cycu', activityId:'a1', icon:'🍲', title:'火鍋 Hotpot', place:'中原夜市',
      when:'今晚 19:00 tonight', hostName:'Wei', capacity:4, joined:3, joinedByMe:false },
    { campusId:'cycu', activityId:'a2', icon:'🏸', title:'羽球 Badminton', place:'體育館',
      when:'明天 16:00 tomorrow', hostName:'Aina', capacity:6, joined:2, joinedByMe:false },
    { campusId:'cycu', activityId:'a3', icon:'🚲', title:'YouBike 河濱 ride', place:'正門集合',
      when:'週六 07:30 Sat', hostName:'Ming', capacity:4, joined:1, joinedByMe:false },
    { campusId:'cycu', activityId:'a4', icon:'🎤', title:'KTV', place:'中壢 SOGO',
      when:'週五 20:00 Fri', hostName:'Jun', capacity:6, joined:5, joinedByMe:false },
    { campusId:'cycu', activityId:'a5', icon:'🌙', title:'夜市巡禮 crawl', place:'中原夜市',
      when:'今晚 21:00 tonight', hostName:'Sara', capacity:4, joined:4, joinedByMe:false }
  ]
}
