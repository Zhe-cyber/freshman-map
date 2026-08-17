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
  vending:{ label: '販賣機', en: 'Vending',  icon: '🥤', color: '#8b6fd6' },
  gate:   { label: '校門',   en: 'Entrance', icon: '🚪', color: '#a97cf2' },
  cat:    { label: '貓咪據點', en: 'Cat Spot', icon: '🐈', color: '#e48c55' },
  entertainment: { label: '娛樂', en: 'Entertainment', icon: '🎮', color: '#d05ce3' }
}

export const DIET = {
  veg:   ['素食', 't-veg'],
  vegan: ['全素 vegan', 't-vegan']
}

export const PAYMENT_METHODS = ['cash', 'card', 'linePay', 'jkoPay', 'easyCard', 'applePay']

const B = (buildingId, name, en, lat, lng) => ({ campusId: 'cycu', buildingId, name, en, lat, lng })
// paper: true = 有衛生紙 provided, false = 自備 bring your own, undefined = not surveyed yet.
// photo: <itemId>.jpg in /photos. Named by id, not by the Chinese survey
// filename, so no URL encoding and no HEIC — Google transcoded them on export.
const I = (itemId, buildingId, floor, type, landmark, note, paper, photo) => ({
  campusId: 'cycu', itemId, buildingId, floor, type, landmark, note,
  paper: paper === undefined ? null : paper,
  photo: typeof photo === 'string' ? photo : null
})

// hoursFromNow keeps seeded activities in the future no matter when you seed.
const A = (activityId, icon, title, category, place, hostName, capacity, joined, hoursFromNow, description) => ({
  campusId: 'cycu', activityId, icon, title, category, place, hostName, capacity, joined, description,
  startAt: new Date(Date.now() + hoursFromNow * 3600e3).toISOString(),
  joinedByMe: false
})

export const MOCK = {
  buildings: [
    B('lib',  '張靜愚紀念圖書館', 'Library',                  24.958309, 121.240707),
    B('eng',  '工學館',           'Engineering Building',      24.957285, 121.244358),
    B('gym',  '中原大學體育館',   'Gymnasium',                 24.960043, 121.242361),
    B('act',  '學生活動中心',     'Student Activity Centre',   24.958939, 121.240933),
    B('zhen', '真知教學大樓',     'Zhen Zhi Teaching Building',24.956049, 121.241868),
    B('elec', '電學大樓',         'Electrical Engineering Building', 24.955929, 121.242519),
    B('duxin','篤信大樓',         'Duxin Building',            24.956206, 121.242582),
    B('huaien','懷恩樓',          'Huai-En Building',          24.957792, 121.240757)
  ],

  items: [
    I('lib-b1w','lib','B1','water', '自習室外 · Outside study room','冰 / 溫'),
    I('lib-1t', 'lib','1F','toilet','服務台後方 · Behind the desk','男 / 女', 22, 2),
    I('lib-2w', 'lib','2F','water', '電梯旁 · Next to the lift','冰 / 溫 / 熱'),
    I('lib-4t', 'lib','4F','toilet','安靜區入口 · Quiet zone entry','男 / 女', 17, 3),
    I('eng-1t', 'eng','1F','toilet','大廳右側 · Right of the lobby','無障礙 accessible', 6, 9),
    I('eng-3t', 'eng','3F','toilet','東側樓梯旁 · Near east stairs','男 / 女', 19, 5),
    I('eng-3w', 'eng','3F','water', '茶水間 · Pantry corner','冰 / 溫 / 熱'),
    I('eng-5t', 'eng','5F','toilet','走廊底 · End of corridor','男 / 女', 21, 2),
    I('gym-1t', 'gym','1F','toilet','球場旁 · Beside the courts','自備衛生紙 BYO paper', 3, 14),
    I('gym-1w', 'gym','1F','water', '入口處 · At the entrance','冰 / 溫'),
    I('act-1t', 'act','1F','toilet','販賣機後面 · Behind vending machines','男 / 女', 12, 6),
    I('act-1w', 'act','1F','water', '販賣機旁 · Next to vending machines','冰 / 溫 / 熱'),
    I('act-2t', 'act','2F','toilet','社團辦公室走廊 · Club office hallway','男 / 女', 15, 4),
    // --- photo survey: all 84 facility photos checked 2026-08-14. ---
    // A doorway photo cannot confirm whether toilet paper is stocked, so all
    // photographed toilets remain "not surveyed" until someone reports it.
    I('elec-b1tf','elec','B1','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-b1tf.jpg'),
    I('elec-b1tm','elec','B1','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-b1tm.jpg'),
    I('elec-b1w','elec','B1','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-b1w.jpg'),
    I('elec-1ftf','elec','1F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-1ftf.jpg'),
    I('elec-1ftm','elec','1F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-1ftm.jpg'),
    I('elec-1fw','elec','1F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-1fw.jpg'),
    I('elec-outv1','elec','1F','vending','建築外側 · Outside the building','販賣機 · Vending machine', null, 'elec-outv1.jpg'),
    I('elec-2ftf','elec','2F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-2ftf.jpg'),
    I('elec-2ftm','elec','2F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-2ftm.jpg'),
    I('elec-2fw','elec','2F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-2fw.jpg'),
    I('elec-3ftf','elec','3F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-3ftf.jpg'),
    I('elec-3ftm','elec','3F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-3ftm.jpg'),
    I('elec-3fw','elec','3F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-3fw.jpg'),
    I('elec-4ftf','elec','4F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-4ftf.jpg'),
    I('elec-4ftm','elec','4F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-4ftm.jpg'),
    I('elec-4fw','elec','4F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-4fw.jpg'),
    I('elec-5ftm','elec','5F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-5ftm.jpg'),
    I('elec-5fw','elec','5F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-5fw.jpg'),
    I('elec-6ftm','elec','6F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-6ftm.jpg'),
    I('elec-6fw','elec','6F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-6fw.jpg'),
    I('elec-7ftf','elec','7F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'elec-7ftf.jpg'),
    I('elec-7fw','elec','7F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-7fw.jpg'),
    I('elec-8ftm','elec','8F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'elec-8ftm.jpg'),
    I('elec-8fw','elec','8F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'elec-8fw.jpg'),

    I('duxin-1ftf','duxin','1F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'duxin-1ftf.jpg'),
    I('duxin-1ftm','duxin','1F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'duxin-1ftm.jpg'),
    I('duxin-1fw','duxin','1F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'duxin-1fw.jpg'),
    I('duxin-2ftm','duxin','2F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'duxin-2ftm.jpg'),
    I('duxin-2fw','duxin','2F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'duxin-2fw.jpg'),
    I('duxin-3ftf','duxin','3F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'duxin-3ftf.jpg'),
    I('duxin-3fw','duxin','3F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'duxin-3fw.jpg'),
    I('duxin-4ftm','duxin','4F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'duxin-4ftm.jpg'),
    I('duxin-4fw','duxin','4F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'duxin-4fw.jpg'),

    I('zhen-b1t','zhen','B1','toilet','廁所入口 · Toilet entrance','廁所 · Toilet', null, 'zhen-b1t.jpg'),
    I('zhen-1ftf','zhen','1F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-1ftf.jpg'),
    I('zhen-1ftm','zhen','1F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-1ftm.jpg'),
    I('zhen-1fw1','zhen','1F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-1fw1.jpg'),
    I('zhen-1fw2','zhen','1F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-1fw2.jpg'),
    I('zhen-outv1','zhen','1F','vending','建築外側 · Outside the building','販賣機 1 · Vending machine 1', null, 'zhen-outv1.jpg'),
    I('zhen-outv2','zhen','1F','vending','建築外側 · Outside the building','販賣機 2 · Vending machine 2', null, 'zhen-outv2.jpg'),
    I('zhen-2ftf','zhen','2F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-2ftf.jpg'),
    I('zhen-2ftm','zhen','2F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-2ftm.jpg'),
    I('zhen-2fw1','zhen','2F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-2fw1.jpg'),
    I('zhen-2fw2','zhen','2F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-2fw2.jpg'),
    I('zhen-3ftf','zhen','3F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-3ftf.jpg'),
    I('zhen-3ftm','zhen','3F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-3ftm.jpg'),
    I('zhen-3fw1','zhen','3F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-3fw1.jpg'),
    I('zhen-3fw2','zhen','3F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-3fw2.jpg'),
    I('zhen-4ftf','zhen','4F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-4ftf.jpg'),
    I('zhen-4ftm','zhen','4F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-4ftm.jpg'),
    I('zhen-4fw1','zhen','4F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'zhen-4fw1.jpg'),
    I('zhen-4fv1','zhen','4F','vending','樓層販賣機 · Floor vending machine','販賣機 1 · Vending machine 1', null, 'zhen-4fv1.jpg'),
    I('zhen-4fv2','zhen','4F','vending','樓層販賣機 · Floor vending machine','販賣機 2 · Vending machine 2', null, 'zhen-4fv2.jpg'),
    I('zhen-5ftf','zhen','5F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-5ftf.jpg'),
    I('zhen-5ftm','zhen','5F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-5ftm.jpg'),
    I('zhen-5fw1','zhen','5F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-5fw1.jpg'),
    I('zhen-5fw2','zhen','5F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-5fw2.jpg'),
    I('zhen-5fv1','zhen','5F','vending','樓層販賣機 · Floor vending machine','販賣機 · Vending machine', null, 'zhen-5fv1.jpg'),
    I('zhen-6ftf','zhen','6F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-6ftf.jpg'),
    I('zhen-6ftm','zhen','6F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-6ftm.jpg'),
    I('zhen-6fw1','zhen','6F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-6fw1.jpg'),
    I('zhen-6fw2','zhen','6F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-6fw2.jpg'),
    I('zhen-6fv1','zhen','6F','vending','樓層販賣機 · Floor vending machine','販賣機 · Vending machine', null, 'zhen-6fv1.jpg'),
    I('zhen-7ftf','zhen','7F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-7ftf.jpg'),
    I('zhen-7ftm','zhen','7F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-7ftm.jpg'),
    I('zhen-7fw1','zhen','7F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-7fw1.jpg'),
    I('zhen-7fw2','zhen','7F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-7fw2.jpg'),
    I('zhen-8ftf','zhen','8F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-8ftf.jpg'),
    I('zhen-8ftm','zhen','8F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-8ftm.jpg'),
    I('zhen-8fw1','zhen','8F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-8fw1.jpg'),
    I('zhen-8fw2','zhen','8F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-8fw2.jpg'),
    I('zhen-9ftf','zhen','9F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'zhen-9ftf.jpg'),
    I('zhen-9ftm','zhen','9F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'zhen-9ftm.jpg'),
    I('zhen-9fw1','zhen','9F','water','走廊飲水機 · Corridor water dispenser','飲水機 1 · Water dispenser 1', null, 'zhen-9fw1.jpg'),
    I('zhen-9fw2','zhen','9F','water','走廊飲水機 · Corridor water dispenser','飲水機 2 · Water dispenser 2', null, 'zhen-9fw2.jpg'),
    I('zhen-9fv1','zhen','9F','vending','樓層販賣機 · Floor vending machine','販賣機 · Vending machine', null, 'zhen-9fv1.jpg'),

    I('huaien-1ftf','huaien','1F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'huaien-1ftf.jpg'),
    I('huaien-1ftm','huaien','1F','toilet','廁所入口 · Toilet entrance','男廁 · Men\'s toilet', null, 'huaien-1ftm.jpg'),
    I('huaien-1fw1','huaien','1F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'huaien-1fw1.jpg'),
    I('huaien-1fv1','huaien','1F','vending','一樓販賣機 · First-floor vending machine','販賣機 · Vending machine', null, 'huaien-1fv1.jpg'),
    I('huaien-2ftf','huaien','2F','toilet','廁所入口 · Toilet entrance','女廁 · Women\'s toilet', null, 'huaien-2ftf.jpg'),
    I('huaien-2fw1','huaien','2F','water','走廊飲水機 · Corridor water dispenser','飲水機 · Water dispenser', null, 'huaien-2fw1.jpg'),

    I('act-1fv1','act','1F','vending','一樓販賣機 · First-floor vending machine','販賣機 · Vending machine', null, 'act-1fv1.jpg'),
    I('act-2fv1','act','2F','vending','樓層販賣機 · Floor vending machine','販賣機 · Vending machine', null, 'act-2fv1.jpg')
  ],

  // Outdoor pins. Food yes/no = "can I order in English?", same engine as 廁紙.
  places: [
    { placeId:'f1', type:'food', icon:'🌙', name:'中原夜市', en:'Night market · 就在校門口',
      lat:24.955002, lng:121.240521, cuisine:'nightMarket', priceEstimate:80, price:1, diet:['ask'], cash:true, yes:24, no:3,
      say:'這個怎麼賣？', sayEn:'How much is this?' },
    { placeId:'f2', type:'food', icon:'🥗', name:'素怡園素食自助餐', en:'Vegetarian buffet',
      lat:24.955881, lng:121.241123, cuisine:'vegetarian', priceEstimate:100, price:1, diet:['veg'], cash:true, yes:9, no:6,
      say:'我夾這些，白飯一碗，謝謝', sayEn:'These please, with one bowl of rice' },
    { placeId:'f3', type:'food', icon:'🍜', name:'香知有素', en:'Vegetarian ramen',
      lat:24.954859, lng:121.242246, cuisine:'vegetarian', priceEstimate:180, price:2, diet:['veg'], cash:false, yes:14, no:4,
      say:'我要一碗素拉麵，謝謝', sayEn:'One vegetarian ramen please' },
    { placeId:'f4', type:'food', icon:'🍳', name:'得來素蔬食早午餐', en:'Veg brunch',
      lat:24.953825, lng:121.241348, cuisine:'vegetarian', priceEstimate:100, price:1, diet:['veg'], cash:true, yes:11, no:3,
      say:'一份素食鐵板麵，一杯豆漿紅茶', sayEn:'Veg teppanyaki noodle and soy milk tea' },
    { placeId:'f5', type:'food', icon:'🥬', name:'東興素食', en:'Vegetarian',
      lat:24.955122, lng:121.241709, cuisine:'vegetarian', priceEstimate:100, price:1, diet:['veg'], cash:true, yes:8, no:4,
      say:'我吃素，這個有蔥蒜嗎？', sayEn:'I am vegetarian — onion or garlic in this?' },
    { placeId:'f6', type:'food', icon:'🇲🇾', name:'馬來一哥', en:'Malaysian',
      lat:24.956355, lng:121.237599, cuisine:'malaysian', priceEstimate:180, price:2, diet:['ask'], cash:true, yes:18, no:2,
      say:'請問這裡是清真的嗎？有豬肉嗎？', sayEn:'Is this halal? Any pork?' },
    { placeId:'f7', type:'food', icon:'🍛', name:'小肥大馬餐室', en:'Malaysian kopitiam',
      lat:24.955488, lng:121.241168, cuisine:'malaysian', priceEstimate:180, price:2, diet:['ask'], cash:true, yes:15, no:3,
      say:'請問有沒有豬肉？', sayEn:'Does this contain pork?' },
    { placeId:'f8', type:'food', icon:'🥖', name:'Robaku 印尼烤麵包', en:'Indonesian roti bakar',
      lat:24.956104, lng:121.240610, cuisine:'indonesian', priceEstimate:100, price:1, diet:['ask'], cash:true, yes:17, no:2,
      say:'一份烤麵包，謝謝', sayEn:'One grilled bread, thanks' },
    { placeId:'f9', type:'food', icon:'🇻🇳', name:'Quán ăn Việt Nam', en:'Vietnamese',
      lat:24.956163, lng:121.237945, cuisine:'vietnamese', priceEstimate:160, price:2, diet:['ask'], cash:true, yes:13, no:4,
      say:'一碗河粉，不要香菜', sayEn:'One pho, no cilantro' },
    { placeId:'f10', type:'food', icon:'🍗', name:'小泰國海南雞飯', en:'Thai & Hainan chicken',
      lat:24.954403, lng:121.241306, cuisine:'thai', priceEstimate:100, price:1, diet:['ask'], cash:true, yes:12, no:5,
      say:'一份海南雞飯，不要辣', sayEn:'One Hainan chicken rice, not spicy' },
    { placeId:'f11', type:'food', icon:'🍲', name:'老師傅牛肉麵', en:'Beef noodles',
      lat:24.955257, lng:121.238794, cuisine:'taiwanese', priceEstimate:180, price:2, diet:['ask'], cash:true, yes:10, no:7,
      say:'一碗牛肉麵，不要香菜', sayEn:'One beef noodle soup, no cilantro' },
    { placeId:'f12', type:'food', icon:'🍮', name:'手工烤布蕾', en:'Crème brûlée · NT$35',
      lat:24.955952, lng:121.240222, cuisine:'dessert', priceEstimate:35, price:1, diet:['veg'], cash:true, yes:16, no:2,
      say:'三個一百，謝謝', sayEn:'Three for a hundred, thanks' },

    { placeId:'f13', type:'food', icon:'🍣', name:'森沐日式食堂',
      en:'Senmu Japanese Restaurant', ja:'森沐日式食堂',
      lat:24.9549362, lng:121.2421525, cuisine:'japanese', priceEstimate:220, price:2,
      diet:['ask'], yes:0, no:0, say:'請問今天的推薦是什麼？', sayEn:'What do you recommend today?' },
    { placeId:'f14', type:'food', icon:'🥘', name:'SU DAK 大口韓食',
      en:'SU DAK Korean Cuisine', ja:'SU DAK 韓国料理',
      lat:24.9565297, lng:121.2403289, cuisine:'korean', priceEstimate:250, price:2,
      diet:['ask'], yes:0, no:0, say:'請問可以做不辣的嗎？', sayEn:'Can you make it not spicy?' },
    { placeId:'f15', type:'food', icon:'🍰', name:'兔子的森林甜點',
      en:"Rabbit's Forest Desserts", ja:'うさぎの森スイーツ',
      lat:24.9560287, lng:121.2406843, cuisine:'dessert', priceEstimate:180, price:2,
      diet:['veg'], yes:0, no:0, say:'請問今天有什麼蛋糕？', sayEn:'What cakes do you have today?' },
    { placeId:'f16', type:'food', icon:'🍧', name:"maru's ice 丸冰",
      en:"maru's ice", ja:'maru\'s ice 丸氷',
      lat:24.9566858, lng:121.2407156, cuisine:'dessert', priceEstimate:100, price:1,
      diet:['veg'], yes:0, no:0, say:'我要一份綿綿冰，謝謝', sayEn:'One shaved ice, please' },

    // Offline fallback. The map normally replaces these with the official live YouBike feed.
    { placeId:'b1', type:'bike', name:'中原大學', en:'YouBike · 站號 500304004',
      lat:24.957940, lng:121.240200, bikes:9, docks:99 },
    { placeId:'b2', type:'bike', name:'中原大學土木館(中原埤塘)', en:'YouBike · 500304146',
      lat:24.956450, lng:121.245290, bikes:6, docks:21 },
    { placeId:'b3', type:'bike', name:'環中東實踐路口', en:'YouBike · 500304078',
      lat:24.953680, lng:121.243340, bikes:10, docks:40 },

    { placeId:'g1', type:'gate', name:'警衛室 · 校門', en:'Guard house at the gate',
      lat:24.957270, lng:121.240539 },

    // 小門 — the side gates. Surveyed in DMS and converted here; the app only
    // ever works in decimal degrees.
    { placeId:'g2', type:'gate', name:'貓貓小門', en:'Cat Gate',
      lat:24.958583, lng:121.243944 },
    { placeId:'g3', type:'gate', name:'土木小門', en:'Civil Engineering Gate',
      lat:24.956556, lng:121.245167 },
    { placeId:'g4', type:'gate', name:'良善小門', en:'Liangshan Gate',
      lat:24.955639, lng:121.241944 },
    { placeId:'g5', type:'gate', name:'懷恩小門', en:'Huai-En Gate',
      lat:24.957917, lng:121.240111 },
    { placeId:'g6', type:'gate', name:'全人小門', en:'Holistic Education Gate',
      lat:24.958361, lng:121.242111 },
    // Re-surveyed at 24°57'19.4"N 121°14'35.4"E.
    { placeId:'g7', type:'gate', name:'恩慈小門', en:'Enci Gate',
      lat:24.955389, lng:121.243167 },

    // 販賣機 outside buildings. Machines inside a building are items on a
    // floor instead, reached through the building directory.
    { placeId:'v1', type:'vending', name:'電學外販賣機', en:'Vending · outside Electrical Eng',
      lat:24.9558754, lng:121.2426237 },
    { placeId:'v2', type:'vending', name:'懷恩販賣機', en:'Vending · Huai-En',
      lat:24.9577920, lng:121.2407569 },
    { placeId:'v3', type:'vending', name:'活中一樓販賣機', en:'Vending · Activity Centre 1F',
      lat:24.9587726, lng:121.2410245 },
    { placeId:'v4', type:'vending', name:'活中二樓販賣機', en:'Vending · Activity Centre 2F',
      lat:24.9589385, lng:121.2409330 },
    { placeId:'v5', type:'vending', name:'教學外面販賣機', en:'Vending · outside Zhen Zhi',
      lat:24.9560557, lng:121.2421279 },

    { placeId:'cat1', type:'cat', icon:'🐈', name:'橘貓休息點',
      en:'Orange Cat Resting Spot', ja:'茶トラの休憩スポット',
      lat:24.9581130, lng:121.2437261, photo:'./assets/cat-spot-1.jpg' },

    // Entertainment venues near CYCU. Coordinates verified from OpenStreetMap
    // on 2026-08-16; each pin uses the shared Google Maps directions action.
    { placeId:'e1', type:'entertainment', icon:'🎯', name:'小時候彈珠堂',
      en:'Childhood Pinball Arcade', ja:'小時候ピンボール', venueKind:'arcade',
      lat:24.9551844, lng:121.2399105 },
    { placeId:'e2', type:'entertainment', icon:'🎤', name:'星光大道KTV',
      en:'Starlight Avenue KTV', ja:'星光大道KTV', venueKind:'ktv',
      lat:24.9585724, lng:121.2254967 },
    { placeId:'e3', type:'entertainment', icon:'🎱', name:'斯洛克撞球館',
      en:'Sloke Billiards Hall', ja:'スロークビリヤード', venueKind:'billiards',
      lat:24.9392592, lng:121.2495339 },
    { placeId:'e4', type:'entertainment', icon:'🛒', name:'遠東SOGO百貨',
      en:'Far Eastern SOGO', ja:'遠東SOGO百貨店', venueKind:'mall',
      lat:24.9627951, lng:121.2236474 },
    { placeId:'e5', type:'entertainment', icon:'🛒', name:'中壢大時鐘廣場',
      en:'Zhongli Big Clock Plaza', ja:'中壢大時計広場', venueKind:'mall',
      lat:24.9558670, lng:121.2214547 },

// ATM locations surveyed by the project team
{ placeId:'c1', type:'atm', name:'ATM 1', en:'ATM 1',
  lat:24.9548325, lng:121.2425738 },

{ placeId:'c2', type:'atm', name:'ATM 2', en:'ATM 2',
  lat:24.9559697, lng:121.2410845 },

{ placeId:'c3', type:'atm', name:'ATM 3', en:'ATM 3',
  lat:24.9572582, lng:121.2407586 },

{ placeId:'c4', type:'atm', name:'ATM 4', en:'ATM 4',
  lat:24.9580272, lng:121.2447849 },

{ placeId:'c5', type:'atm', name:'ATM 5', en:'ATM 5',
  lat:24.9591519, lng:121.2413165 },

{ placeId:'c6', type:'atm', name:'ATM 6', en:'ATM 6',
  lat:24.9592544, lng:121.2398352 },

{ placeId:'c7', type:'atm', name:'ATM 7', en:'ATM 7',
  lat:24.9573099, lng:121.2391989 },

{ placeId:'c8', type:'atm', name:'ATM 8', en:'ATM 8',
  lat:24.9568633, lng:121.2394959 },

{ placeId:'c9', type:'atm', name:'ATM 9', en:'ATM 9',
  lat:24.9543130, lng:121.2422328 },

{ placeId:'c10', type:'atm', name:'ATM 10', en:'ATM 10',
  lat:24.9538488, lng:121.2426677 },

{ placeId:'c11', type:'atm', name:'ATM 11', en:'ATM 11',
  lat:24.9539203, lng:121.2416645 }
  ],

  // startAt is a real timestamp, not a display string — a countdown, sorting,
  // "starting soon" and auto-expiry all need arithmetic, which "今晚 19:00" cannot
  // give you. Seeded relative to now so the demo data is never in the past;
  // reseed on the morning of the demo.
  activities: [
    A('a1', '🍲', '火鍋 Hotpot',            'hotpot',  '中原夜市',        'Wei',  4, 3,  5,
      '一起吃火鍋！第一次來的可以跟著我們點餐。'),
    A('a2', '🏸', '羽球 Badminton',          'sport',   '體育館',          'Aina', 6, 2, 22,
      '帶球拍就好，球我帶。新手歡迎。'),
    A('a3', '🚲', 'YouBike 河濱 ride',       'outdoor', '正門集合',        'Ming', 4, 1, 30,
      '騎去河濱公園，大概兩小時，慢慢騎。'),
    A('a4', '🎤', 'KTV',                     'night',   '中壢 SOGO',       'Jun',  6, 5, 46,
      '唱到十二點，均分費用大概每人 200。'),
    A('a5', '🌙', '夜市巡禮 night market',   'food',    '中原夜市',        'Sara', 4, 4,  8,
      '從校門口走到底，把必吃的都吃一遍。')
  ]
}

// Confirmed on the walking survey: every toilet in these buildings provides
// paper. Kept OUT of the generated I(...) list on purpose — that list gets
// regenerated from photo filenames by tools/import-photos.js, which emits
// null for paper and silently wiped these once already.
const PAPER_PROVIDED = ['elec', 'duxin']
MOCK.items.forEach(i => {
  if (i.type === 'toilet' && PAPER_PROVIDED.includes(i.buildingId)) i.paper = true
})
