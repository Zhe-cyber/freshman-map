export const LANGUAGES = ['zh-Hant', 'en', 'ja']

const messages = {
  'zh-Hant': {
    appTitle: 'Freshman Map — {campus}', surviving: '生存中', language: '語言',
    mapCanvas: '互動式地圖', toggleMapInfo: '顯示或隱藏地圖資訊', categoryMenu: '地圖分類',
    sosTitle: '衛生紙 SOS', recenterTitle: '回到我的位置',
    foodTitle: '吃喝玩樂', foodSubtitle: '餐廳與娛樂捷徑 · 點一下就導航',
    buddySubtitle: '一個人不好吃飯 · 找人一起吧', newActivity: '開一個新活動',
    navMap: '地圖', navFood: '探索', navBuddy: '夥伴',
    'type.toilet': '廁所', 'type.water': '飲水機', 'type.atm': 'ATM',
    'type.food': '美食', 'type.bike': 'U-Bike', 'type.vending': '販賣機', 'type.gate': '校門', 'type.cat': '貓咪據點',
    'type.entertainment': '娛樂',
    paused: '暫停', away: '公尺', takeMe: '帶我去', go: '帶我去',
    hasPaper: '有衛生紙', hasPaperYes: '有紙', hasPaperNo: '沒紙',
    cancel: '取消',
    profileVisibility: '這些會顯示給同一個活動的人看',
    cardNone: '這個人還沒填資料', cardPrivacy: '只顯示對方選擇公開的內容',
    navMe: '我', profileSub: '你的資料與進度',
    profileNoName: '還沒設定名字', profilePhoto: '換頭貼', profileDetails: '你的資料',
    profileOptionalNote: '只有名字是必填，其他隨你', optional: '選填',
    profileSave: '儲存', profileSaved: '已儲存', profileShareFail: '已存在此裝置，但無法分享給其他人（連線問題）', profileNeedName: '請填名字',
    profileNeedImage: '請選圖片檔', profilePhotoSaved: '頭貼換好了',
    profilePhotoTooBig: '圖片太大，換一張小一點的',
    profilePoints: '{n} 分', profileToNext: '再 {n} 分升級', levelLabel: 'Lv {n}',
    levelLost: '剛到，什麼都不懂', levelSettling: '開始習慣了', levelSurviving: '活得下去',
    levelLocal: '快像在地人了', levelGuide: '可以帶新生了',
    statJoined: '參加', statHosted: '主揪', statAdded: '推薦', statVisited: '去過',
    profileBadges: '成就',
    badgeFirstJoin: '第一次參加', badgeHost: '第一次主揪', badgeScout: '推薦第一家店',
    badgeExplorer: '逛過三棟樓', badgeComplete: '資料填完', badgeRegular: '參加五次',
    'pf.displayName': '名字', 'pf.homeCountry': '來自哪裡', 'pf.department': '系所',
    'pf.year': '年級', 'pf.languages': '會說的語言', 'pf.interests': '興趣', 'pf.bio': '自我介紹',
    'pfHint.displayName': '大家怎麼叫你', 'pfHint.homeCountry': '馬來西亞',
    'pfHint.department': '資訊工程', 'pfHint.year': '', 'pfHint.languages': '中文、英文',
    'pfHint.interests': '羽球、吃辣', 'pfHint.bio': '一句話就好',
    'year.exchange': '交換生', 'year.y1': '大一', 'year.y2': '大二', 'year.y3': '大三',
    'year.y4': '大四', 'year.postgrad': '研究所', 'year.staff': '教職員',
    actNew: '開一個活動', actTitle: '要做什麼', actCategory: '種類', actPlace: '在哪裡',
    actWhen: '幾點', actCapacity: '幾個人', actCapacityHint: '{min} 到 {max} 人', actDescription: '說明（選填）',
    actDescriptionHint: '例如：新手歡迎，帶球拍就好', actCreate: '開好了',
    actNeedFields: '名稱、地點、時間都要填', actNeedFuture: '時間要在未來',
    actEnded: '已結束', actHappeningNow: '進行中', actInMinutes: '{count} 分鐘後',
    actInHours: '{h} 小時 {m} 分後', actInDay: '明天', actInDays: '{count} 天後',
    actPast: '已結束（{count}）', actWhoComing: '誰要去', actYou: '你', actStudent: '同學', actHost: '主揪',
    actCancel: '取消這個活動', actCancelConfirm: '確定要取消嗎？', actCancelled: '已取消',
    chatOpen: '聊天室', chatMembersOnly: '只有加入的人看得到', chatSend: '送出',
    chatPlaceholder: '說點什麼…', chatEmpty: '還沒有人說話，你先開頭吧',
    chatLoading: '載入中…', chatAskName: '要用什麼名字？', chatNotMember: '要先加入活動才能聊天',
    actNoneTitle: '現在沒有活動', actNoneSub: '開第一個吧，一個人吃飯很無聊',
    appName: '新生包', loginTagline: '幾天內熟悉中原生活',
    loginUsername: '帳號', loginPassword: '密碼', loginName: '你的名字',
    loginPasswordHint: '至少 8 個字，要有數字', loginSignIn: '登入', loginCreate: '建立帳號',
    loginNoAccount: '還沒有帳號？註冊', loginHaveAccount: '已經有帳號？登入',
    loginGuest: '先看看就好', loginWorking: '請稍等…', loginSignOut: '登出',
    loginSignOutConfirm: '要登出嗎？',
    errUserExists: '這個帳號已經有人用了', errWrongPassword: '帳號或密碼不對',
    errNoUser: '找不到這個帳號', errWeakPassword: '密碼太簡單，至少 8 個字加數字',
    errInvalidInput: '輸入格式不對', errNetwork: '連不上網路', errGeneric: '出了點問題，再試一次', addPlaceDragHint: '拖曳地圖上的圖釘調整位置',
    addPlaceIcon: '圖示', addPlaceDiet: '飲食', addPlacePrice: '價位',
    addPlaceSay: '點餐可以這樣說', addPlaceAddress: '地址（選填）',
    dietVeg: '素食', dietVegan: '全素', dietNoPork: '無豬肉', dietAsk: '清真？要問',
    paperYes: '有提供衛生紙', paperNo: '沒有衛生紙，請自備', paperUnknown: '衛生紙狀況未調查',
    paperNoneKnown: '附近還沒有已確認有衛生紙的廁所',
    addPlace: '推薦一家店', addPlaceName: '店名', addPlaceNote: '推薦什麼？',
    addPlaceSave: '加到地圖', addPlaceDone: '謝謝推薦！已加到地圖 🎉', addPlaceNeedName: '請輸入店名',
   
    englishOkay: '可以用英文點餐', orderEnglish: '英文', englishUnknown: '英文尚未回報',
    bikesAvailable: '可借車輛', returnDocks: '可還空位',
    bikeUnavailable: '暫停營運', updated: '更新於 {time}{electric} · 每分鐘更新',
    lastUpdated: '上次更新 {time} · 即時連線失敗', savedBike: '顯示已儲存的資料 · 即時連線失敗',
    electricBikes: ' · {count} 輛電輔車', liveBikeError: 'YouBike 即時資料無法連線 · 顯示已儲存的車站',
    sosName: '衛生紙 SOS', sosSubtitle: '附近且有衛生紙的廁所',
    reportThanks: '謝謝！+10 XP 🎉', reportRecorded: '記錄了，謝謝 🙏',
    reportsMeta: '{count} 筆回報 · 2 小時前檢查',
    filterVeg: '素食', filterCheap: 'NT$ ~100', filterNear: '5 分鐘', noMatches: '沒有符合的店', viewDetails: '查看詳細資料', close: '關閉',
    restaurantTab: '餐廳', entertainmentTab: '娛樂', cuisineFilter: '料理類型', priceFilter: '價格範圍',
    venueFilter: '娛樂類型', filterAll: '全部', noRestaurants: '沒有符合條件的餐廳',
    noEntertainment: '沒有符合條件的娛樂場所', navigateGoogle: '用 Google 地圖導航',
    navigateTo: '導航到 {place}',
    priceRangeValue: 'NT${min}–${max}', minimumPrice: '最低價格', maximumPrice: '最高價格',
    priceRangeInvalid: '請輸入有效範圍（最低價不能高於最高價）',
    estimatedPrice: '約 NT${price}',
    'price.1': 'NT$100 以下', 'price.2': 'NT$100–200', 'price.3': 'NT$200 以上',
    'cuisine.nightMarket': '夜市小吃', 'cuisine.vegetarian': '素食', 'cuisine.malaysian': '馬來西亞',
    'cuisine.indonesian': '印尼', 'cuisine.vietnamese': '越南', 'cuisine.thai': '泰國',
    'cuisine.taiwanese': '台灣', 'cuisine.japanese': '日式', 'cuisine.korean': '韓式',
    'cuisine.dessert': '甜點', 'cuisine.other': '其他',
    distanceMetres: '{count} 公尺', phraseHint: '點一下顯示這句話', translationUnavailable: '暫無翻譯',
    'description.building': '校園建築', 'description.restaurant': '餐廳',
    'description.bikeStation': 'YouBike 車站 · {station}', 'description.entrance': '校園入口', 'description.atm': '自動提款機',
    'description.cat': '校園貓咪出沒點', 'description.entertainment': '娛樂場所',
    'venue.arcade': '彈珠台 / 遊戲', 'venue.ktv': 'KTV / 卡拉OK',
    'venue.billiards': '撞球 / 斯諾克', 'venue.mall': '購物中心',
    'diet.veg': '素食', 'diet.vegan': '全素', 'diet.ask': '清真？要問', cash: '現金',
    activityPrompt: '活動名稱？', activityExample: '🍜 一起吃拉麵', activityCreated: '活動開好了！等人加入 🎉',
    joined: '✓ 已加入', full: '額滿', join: '加入', by: '主揪 {name}',
    activityFull: '額滿了 😢', joinSuccessFull: '加入成功！額滿囉 🎉 +20 XP',
    joinSuccess: '加入成功！+20 XP 🎉', activityLeft: '已取消加入'
  },
  en: {
    appTitle: 'Freshman Map — {campus}', surviving: 'Surviving', language: 'Language',
    mapCanvas: 'Interactive map', toggleMapInfo: 'Show or hide map information', categoryMenu: 'Map categories',
    sosTitle: 'Toilet paper SOS', recenterTitle: 'Back to my location',
    foodTitle: 'Eat & Play', foodSubtitle: 'Restaurant and entertainment shortcuts · tap to navigate',
    buddySubtitle: "Don't eat alone · find some company", newActivity: 'Create activity',
    navMap: 'Map', navFood: 'Explore', navBuddy: 'BuddyUp',
    'type.toilet': 'Toilet', 'type.water': 'Water', 'type.atm': 'ATM',
    'type.food': 'Food', 'type.bike': 'U-Bike', 'type.vending': 'Vending', 'type.gate': 'Entrance', 'type.cat': 'Cat Spot',
    'type.entertainment': 'Entertainment',
    paused: 'Paused', away: 'away', takeMe: 'Take me there', go: 'Go',
    hasPaper: 'Has paper', hasPaperYes: 'Has paper', hasPaperNo: 'No paper',
    cancel: 'Cancel',
    profileVisibility: 'These are shown to people in the same activity as you',
    cardNone: 'This person has not filled in a profile yet', cardPrivacy: 'Only what this person chose to share is shown',
    navMe: 'Me', profileSub: 'Your details and progress',
    profileNoName: 'No name set yet', profilePhoto: 'Change photo', profileDetails: 'About you',
    profileOptionalNote: 'Only your name is required — the rest is up to you', optional: 'optional',
    profileSave: 'Save', profileSaved: 'Saved', profileShareFail: 'Saved on this device, but could not be shared with others (connection problem)', profileNeedName: 'Please enter a name',
    profileNeedImage: 'Please choose an image file', profilePhotoSaved: 'Photo updated',
    profilePhotoTooBig: 'That image is too large — try a smaller one',
    profilePoints: '{n} points', profileToNext: '{n} to next level', levelLabel: 'Lv {n}',
    levelLost: 'Just arrived', levelSettling: 'Settling in', levelSurviving: 'Surviving',
    levelLocal: 'Almost a local', levelGuide: 'Ready to guide freshers',
    statJoined: 'joined', statHosted: 'hosted', statAdded: 'added', statVisited: 'visited',
    profileBadges: 'Achievements',
    badgeFirstJoin: 'First activity joined', badgeHost: 'Hosted something', badgeScout: 'Recommended a place',
    badgeExplorer: 'Visited three buildings', badgeComplete: 'Profile complete', badgeRegular: 'Joined five times',
    'pf.displayName': 'Name', 'pf.homeCountry': 'Where you are from', 'pf.department': 'Department',
    'pf.year': 'Year', 'pf.languages': 'Languages you speak', 'pf.interests': 'Interests', 'pf.bio': 'About you',
    'pfHint.displayName': 'What people call you', 'pfHint.homeCountry': 'Malaysia',
    'pfHint.department': 'Computer Science', 'pfHint.year': '', 'pfHint.languages': 'Chinese, English',
    'pfHint.interests': 'Badminton, spicy food', 'pfHint.bio': 'One line is plenty',
    'year.exchange': 'Exchange', 'year.y1': 'Year 1', 'year.y2': 'Year 2', 'year.y3': 'Year 3',
    'year.y4': 'Year 4', 'year.postgrad': 'Postgraduate', 'year.staff': 'Staff',
    actNew: 'Start an activity', actTitle: 'What are you doing', actCategory: 'Kind', actPlace: 'Where',
    actWhen: 'When', actCapacity: 'How many people', actCapacityHint: 'Between {min} and {max}', actDescription: 'Details (optional)',
    actDescriptionHint: 'e.g. beginners welcome, just bring a racket', actCreate: 'Create',
    actNeedFields: 'Name, place and time are all needed', actNeedFuture: 'Pick a time in the future',
    actEnded: 'Ended', actHappeningNow: 'Happening now', actInMinutes: 'in {count} min',
    actInHours: 'in {h}h {m}m', actInDay: 'tomorrow', actInDays: 'in {count} days',
    actPast: 'Finished ({count})', actWhoComing: "Who's coming", actYou: 'You', actStudent: 'a student', actHost: 'host',
    actCancel: 'Cancel this activity', actCancelConfirm: 'Cancel this activity?', actCancelled: 'Cancelled',
    chatOpen: 'Chat', chatMembersOnly: 'Only people who joined can see this', chatSend: 'Send',
    chatPlaceholder: 'Say something…', chatEmpty: 'Nobody has said anything yet — go first',
    chatLoading: 'Loading…', chatAskName: 'What name should we show?', chatNotMember: 'Join the activity first',
    actNoneTitle: 'Nothing on right now', actNoneSub: 'Start the first one — eating alone is no fun',
    appName: 'Freshman Map', loginTagline: 'Settle into CYCU in days, not weeks',
    loginUsername: 'Username', loginPassword: 'Password', loginName: 'Your name',
    loginPasswordHint: 'At least 8 characters, including a number', loginSignIn: 'Sign in', loginCreate: 'Create account',
    loginNoAccount: "No account yet? Sign up", loginHaveAccount: 'Already have an account? Sign in',
    loginGuest: 'Just look around', loginWorking: 'One moment…', loginSignOut: 'Sign out',
    loginSignOutConfirm: 'Sign out?',
    errUserExists: 'That username is taken', errWrongPassword: 'Username or password is wrong',
    errNoUser: 'No account with that username', errWeakPassword: 'Password too simple — 8+ characters with a number',
    errInvalidInput: 'Check what you typed', errNetwork: 'Cannot reach the network', errGeneric: 'Something went wrong — try again', addPlaceDragHint: 'Drag the pin on the map to set the spot',
    addPlaceIcon: 'Icon', addPlaceDiet: 'Diet', addPlacePrice: 'Price',
    addPlaceSay: 'Say this to order', addPlaceAddress: 'Address (optional)',
    dietVeg: 'Vegetarian', dietVegan: 'Vegan', dietNoPork: 'No pork', dietAsk: 'Halal? ask',
    paperYes: 'Toilet paper provided', paperNo: 'No paper — bring your own', paperUnknown: 'Paper not surveyed yet',
    paperNoneKnown: 'No confirmed paper-provided toilet nearby yet',
    addPlace: 'Recommend a place', addPlaceName: 'Name', addPlaceNote: 'What is good here?',
    addPlaceSave: 'Add to map', addPlaceDone: 'Thanks! Added to the map 🎉', addPlaceNeedName: 'Please enter a name',
   
    englishOkay: 'English ordering available', orderEnglish: 'English', englishUnknown: 'English not reported',
    bikesAvailable: 'Bikes available', returnDocks: 'Return docks', bikeUnavailable: 'Temporarily unavailable',
    updated: 'Updated {time}{electric} · refreshes every minute',
    lastUpdated: 'Last updated {time} · live refresh unavailable', savedBike: 'Saved availability · live feed unavailable',
    electricBikes: ' · {count} e-bike(s)', liveBikeError: 'YouBike live data unavailable · showing saved stations',
    sosName: 'Toilet paper SOS', sosSubtitle: 'Nearby toilets that are likely to have paper',
    reportThanks: 'Thank you! +10 XP 🎉', reportRecorded: 'Recorded, thank you 🙏',
    reportsMeta: '{count} reports · checked 2 hours ago',
    filterVeg: 'Vegetarian', filterCheap: 'NT$ ~100', filterNear: '5 min', noMatches: 'Nothing matches', viewDetails: 'View details', close: 'Close',
    restaurantTab: 'Restaurants', entertainmentTab: 'Entertainment', cuisineFilter: 'Cuisine type', priceFilter: 'Price range',
    venueFilter: 'Entertainment type', filterAll: 'All', noRestaurants: 'No restaurants match these filters',
    noEntertainment: 'No entertainment venues match this filter', navigateGoogle: 'Navigate with Google Maps',
    navigateTo: 'Navigate to {place}',
    priceRangeValue: 'NT${min}–${max}', minimumPrice: 'Minimum price', maximumPrice: 'Maximum price',
    priceRangeInvalid: 'Enter a valid range (minimum cannot exceed maximum)',
    estimatedPrice: 'About NT${price}',
    'price.1': 'Under NT$100', 'price.2': 'NT$100–200', 'price.3': 'NT$200+',
    'cuisine.nightMarket': 'Night market', 'cuisine.vegetarian': 'Vegetarian', 'cuisine.malaysian': 'Malaysian',
    'cuisine.indonesian': 'Indonesian', 'cuisine.vietnamese': 'Vietnamese', 'cuisine.thai': 'Thai',
    'cuisine.taiwanese': 'Taiwanese', 'cuisine.japanese': 'Japanese', 'cuisine.korean': 'Korean',
    'cuisine.dessert': 'Dessert', 'cuisine.other': 'Other',
    distanceMetres: '{count} m away', phraseHint: 'Tap to show this phrase', translationUnavailable: 'Translation unavailable',
    'description.building': 'Campus building', 'description.restaurant': 'Restaurant',
    'description.bikeStation': 'YouBike station · {station}', 'description.entrance': 'Campus entrance', 'description.atm': 'Cash machine',
    'description.cat': 'Campus cat hangout', 'description.entertainment': 'Entertainment venue',
    'venue.arcade': 'Arcade / games', 'venue.ktv': 'KTV / karaoke',
    'venue.billiards': 'Billiards / snooker', 'venue.mall': 'Shopping mall',
    'diet.veg': 'Vegetarian', 'diet.vegan': 'Vegan', 'diet.ask': 'Halal? Ask', cash: 'Cash',
    activityPrompt: 'Activity name?', activityExample: '🍜 Eat ramen together', activityCreated: 'Activity created! Waiting for people 🎉',
    joined: '✓ Joined', full: 'Full', join: 'Join', by: 'by {name}', activityFull: 'This activity is full 😢',
    joinSuccessFull: 'Joined! Now full 🎉 +20 XP', joinSuccess: 'Joined! +20 XP 🎉', activityLeft: 'Left the activity'
  },
  ja: {
    appTitle: 'Freshman Map — {campus}', surviving: 'サバイバル中', language: '言語',
    mapCanvas: 'インタラクティブ地図', toggleMapInfo: '地図情報の表示・非表示', categoryMenu: '地図カテゴリー',
    sosTitle: 'トイレットペーパー SOS', recenterTitle: '現在地に戻る',
    foodTitle: '食べる・遊ぶ', foodSubtitle: 'レストランと娯楽へのショートカット · タップでナビ',
    buddySubtitle: '一人で食べず、仲間を見つけよう', newActivity: '新しいアクティビティ',
    navMap: '地図', navFood: '探す', navBuddy: '仲間',
    'type.toilet': 'トイレ', 'type.water': '給水機', 'type.atm': 'ATM',
    'type.food': 'グルメ', 'type.bike': 'U-Bike', 'type.vending': '自動販売機', 'type.gate': '入口', 'type.cat': '猫スポット',
    'type.entertainment': '娯楽',
    paused: '休止中', away: '先', takeMe: 'ここへ行く', go: '行く',
    hasPaper: 'トイレットペーパーあり', hasPaperYes: 'ペーパーあり', hasPaperNo: 'ペーパーなし',
    cancel: 'キャンセル',
    profileVisibility: '同じアクティビティの参加者に表示されます',
    cardNone: 'この人はまだプロフィールを設定していません', cardPrivacy: '本人が公開を選んだ情報のみ表示されます',
    navMe: 'マイページ', profileSub: 'プロフィールと進捗',
    profileNoName: '名前が未設定', profilePhoto: '写真を変更', profileDetails: 'あなたについて',
    profileOptionalNote: '必須は名前だけです', optional: '任意',
    profileSave: '保存', profileSaved: '保存しました', profileShareFail: 'この端末には保存しましたが、他の人に共有できませんでした（接続の問題）', profileNeedName: '名前を入力してください',
    profileNeedImage: '画像ファイルを選んでください', profilePhotoSaved: '写真を更新しました',
    profilePhotoTooBig: '画像が大きすぎます',
    profilePoints: '{n} ポイント', profileToNext: '次のレベルまで {n}', levelLabel: 'Lv {n}',
    levelLost: '着いたばかり', levelSettling: '慣れてきた', levelSurviving: '生活できる',
    levelLocal: 'ほぼ地元民', levelGuide: '新入生を案内できる',
    statJoined: '参加', statHosted: '主催', statAdded: '追加', statVisited: '訪問',
    profileBadges: '実績',
    badgeFirstJoin: '初参加', badgeHost: '初主催', badgeScout: 'お店を推薦',
    badgeExplorer: '3棟を訪問', badgeComplete: 'プロフィール完成', badgeRegular: '5回参加',
    'pf.displayName': '名前', 'pf.homeCountry': '出身', 'pf.department': '学科',
    'pf.year': '学年', 'pf.languages': '話せる言語', 'pf.interests': '趣味', 'pf.bio': '自己紹介',
    'pfHint.displayName': '呼ばれ方', 'pfHint.homeCountry': 'マレーシア',
    'pfHint.department': '情報工学', 'pfHint.year': '', 'pfHint.languages': '中国語、英語',
    'pfHint.interests': 'バドミントン、辛い物', 'pfHint.bio': '一言で大丈夫',
    'year.exchange': '交換留学', 'year.y1': '1年', 'year.y2': '2年', 'year.y3': '3年',
    'year.y4': '4年', 'year.postgrad': '大学院', 'year.staff': '教職員',
    actNew: 'アクティビティを作る', actTitle: '何をする？', actCategory: '種類', actPlace: '場所',
    actWhen: '日時', actCapacity: '人数', actCapacityHint: '{min}〜{max}人', actDescription: '説明（任意）',
    actDescriptionHint: '例：初心者歓迎、ラケットだけ持参', actCreate: '作成',
    actNeedFields: '名前・場所・日時は必須です', actNeedFuture: '未来の時間を選んでください',
    actEnded: '終了', actHappeningNow: '開催中', actInMinutes: 'あと{count}分',
    actInHours: 'あと{h}時間{m}分', actInDay: '明日', actInDays: 'あと{count}日',
    actPast: '終了（{count}）', actWhoComing: '参加者', actYou: 'あなた', actStudent: '学生', actHost: '主催',
    actCancel: 'このアクティビティを取り消す', actCancelConfirm: '取り消しますか？', actCancelled: '取り消しました',
    chatOpen: 'チャット', chatMembersOnly: '参加者のみ表示', chatSend: '送信',
    chatPlaceholder: 'メッセージを入力…', chatEmpty: 'まだ発言がありません',
    chatLoading: '読み込み中…', chatAskName: '表示する名前は？', chatNotMember: '先に参加してください',
    actNoneTitle: '今は何もありません', actNoneSub: '最初の一つを作ってみよう',
    appName: '新生パック', loginTagline: '数日で中原の生活に慣れる',
    loginUsername: 'ユーザー名', loginPassword: 'パスワード', loginName: 'お名前',
    loginPasswordHint: '8文字以上、数字を含む', loginSignIn: 'ログイン', loginCreate: 'アカウント作成',
    loginNoAccount: 'アカウントがない？登録', loginHaveAccount: 'アカウントがある？ログイン',
    loginGuest: '見るだけ', loginWorking: 'お待ちください…', loginSignOut: 'ログアウト',
    loginSignOutConfirm: 'ログアウトしますか？',
    errUserExists: 'そのユーザー名は使用中です', errWrongPassword: 'ユーザー名かパスワードが違います',
    errNoUser: 'そのアカウントは見つかりません', errWeakPassword: 'パスワードが簡単すぎます',
    errInvalidInput: '入力内容を確認してください', errNetwork: 'ネットワークに接続できません', errGeneric: '問題が発生しました', addPlaceDragHint: '地図のピンをドラッグして位置を調整',
    addPlaceIcon: 'アイコン', addPlaceDiet: '食事', addPlacePrice: '価格',
    addPlaceSay: '注文時のひとこと', addPlaceAddress: '住所（任意）',
    dietVeg: 'ベジタリアン', dietVegan: 'ヴィーガン', dietNoPork: '豚肉なし', dietAsk: 'ハラール？要確認',
    paperYes: 'トイレットペーパーあり', paperNo: 'ペーパーなし・持参してください', paperUnknown: 'ペーパーの有無は未調査',
    paperNoneKnown: '近くに確認済みのトイレはまだありません',
    addPlace: 'お店を推薦', addPlaceName: '店名', addPlaceNote: 'おすすめは？',
    addPlaceSave: '地図に追加', addPlaceDone: 'ありがとう！地図に追加しました 🎉', addPlaceNeedName: '店名を入力してください',
   
    englishOkay: '英語で注文可能', orderEnglish: '英語', englishUnknown: '英語対応未報告',
    bikesAvailable: '貸出可能な自転車', returnDocks: '返却可能なドック', bikeUnavailable: '一時利用不可',
    updated: '{time}更新{electric} · 1分ごとに更新',
    lastUpdated: '最終更新 {time} · ライブ更新は利用不可', savedBike: '保存データを表示中 · ライブ接続なし',
    electricBikes: ' · 電動アシスト {count}台', liveBikeError: 'YouBikeのライブデータを取得できません · 保存済みのステーションを表示中',
    sosName: 'トイレットペーパー SOS', sosSubtitle: 'ペーパーがある可能性の高い近くのトイレ',
    reportThanks: 'ありがとう！+10 XP 🎉', reportRecorded: '記録しました。ありがとう 🙏',
    reportsMeta: '{count}件の報告 · 2時間前に確認',
    filterVeg: 'ベジタリアン', filterCheap: 'NT$ ~100', filterNear: '5分', noMatches: '条件に合う店はありません', viewDetails: '詳細を見る', close: '閉じる',
    restaurantTab: 'レストラン', entertainmentTab: '娯楽', cuisineFilter: '料理ジャンル', priceFilter: '価格帯',
    venueFilter: '娯楽タイプ', filterAll: 'すべて', noRestaurants: '条件に合うレストランはありません',
    noEntertainment: '条件に合う娯楽施設はありません', navigateGoogle: 'Googleマップでナビ',
    navigateTo: '{place}へナビ',
    priceRangeValue: 'NT${min}〜${max}', minimumPrice: '最低価格', maximumPrice: '最高価格',
    priceRangeInvalid: '有効な範囲を入力してください（最低価格は最高価格以下）',
    estimatedPrice: '約NT${price}',
    'price.1': 'NT$100未満', 'price.2': 'NT$100〜200', 'price.3': 'NT$200以上',
    'cuisine.nightMarket': '夜市グルメ', 'cuisine.vegetarian': 'ベジタリアン', 'cuisine.malaysian': 'マレーシア料理',
    'cuisine.indonesian': 'インドネシア料理', 'cuisine.vietnamese': 'ベトナム料理', 'cuisine.thai': 'タイ料理',
    'cuisine.taiwanese': '台湾料理', 'cuisine.japanese': '日本料理', 'cuisine.korean': '韓国料理',
    'cuisine.dessert': 'デザート', 'cuisine.other': 'その他',
    distanceMetres: '{count} m先', phraseHint: 'タップしてこのフレーズを表示', translationUnavailable: '翻訳なし',
    'description.building': 'キャンパス施設', 'description.restaurant': 'レストラン',
    'description.bikeStation': 'YouBikeステーション · {station}', 'description.entrance': 'キャンパス入口', 'description.atm': 'ATM',
    'description.cat': 'キャンパス猫スポット', 'description.entertainment': '娯楽施設',
    'venue.arcade': 'アーケード / ゲーム', 'venue.ktv': 'KTV / カラオケ',
    'venue.billiards': 'ビリヤード / スヌーカー', 'venue.mall': 'ショッピングモール',
    'diet.veg': 'ベジタリアン', 'diet.vegan': 'ヴィーガン', 'diet.ask': 'ハラール？要確認', cash: '現金',
    activityPrompt: 'アクティビティ名は？', activityExample: '🍜 一緒にラーメン', activityCreated: '作成しました！参加者を待っています 🎉',
    joined: '✓ 参加済み', full: '満員', join: '参加', by: '主催：{name}', activityFull: 'このアクティビティは満員です 😢',
    joinSuccessFull: '参加しました！満員です 🎉 +20 XP', joinSuccess: '参加しました！+20 XP 🎉', activityLeft: '参加を取り消しました'
  }
}

const localizedNames = {
  'zh-Hant': {
    lib: '張靜愚紀念圖書館', eng: '工學館', gym: '中原大學體育館',
    act: '學生活動中心', zhen: '真知教學大樓', elec: '電學大樓', duxin: '篤信大樓', huaien: '懷恩樓',
    f1: '中原夜市', f2: '素怡園素食自助餐', f3: '香知有素', f4: '得來素蔬食早午餐',
    f5: '東興素食', f6: '馬來一哥', f7: '小肥大馬餐室', f8: '羅巴庫印尼烤麵包',
    f9: '越南餐館', f10: '小泰國海南雞飯', f11: '老師傅牛肉麵', f12: '手工烤布蕭',
    g1: '警衛室 · 校園正門', c1: '統一超商', c2: '統一超商',
    '中原大學': '中原大學', '國立臺灣大學': '國立臺灣大學'
  },
  en: {
    lib: 'Chang Ching Yu Memorial Library', eng: 'Engineering Building', gym: 'CYCU Gymnasium',
    act: 'Student Activity Centre', zhen: 'Zhen Zhi Teaching Building', elec: 'Electrical Engineering Building',
    duxin: 'Duxin Building', huaien: 'Huai-En Building',
    f1: 'Zhongyuan Night Market', f2: 'Suyiyuan Vegetarian Buffet', f3: 'Xiang Zhi You Su',
    f4: 'Delaishu Vegetarian Brunch', f5: 'Dongxing Vegetarian', f6: 'Malai Yige',
    f7: 'Xiaofei Malaysian Café', f8: 'Robaku Indonesian Toast', f9: 'Vietnamese Restaurant',
    f10: 'Little Thailand Hainan Chicken Rice', f11: 'Master Beef Noodles', f12: 'Handmade Crème Brûlée',
    b1: 'Chung Yuan Christian University YouBike Station', b2: 'CYCU Civil Engineering YouBike Station',
    b3: 'Huanzhong East Road and Shijian Road YouBike Station',
    g1: 'Guard House · Main Gate', c1: '7-Eleven', c2: '7-Eleven',
    '中原大學': 'Chung Yuan Christian University', '國立臺灣大學': 'National Taiwan University'
  },
  ja: {
    lib: '張静愚記念図書館', eng: '工学館', gym: '中原大学体育館',
    act: '学生活動センター', zhen: '真知教育棟', elec: '電学棟', duxin: '篤信棟', huaien: '懐恩楼',
    f1: '中原夜市', f2: '素怡園ベジタリアンビュッフェ', f3: '香知有素',
    f4: '得來素ベジブランチ', f5: '東興ベジタリアン', f6: '馬來一哥（マレーシア料理）',
    f7: '小肥大馬食堂', f8: 'ロバク・インドネシアントースト', f9: 'ベトナム料理',
    f10: '小タイ海南チキンライス', f11: '老師傅牛肉麺', f12: '手作りクレームブリュレ',
    b1: '中原大学YouBikeステーション', b2: '中原大学土木館YouBikeステーション',
    b3: '環中東路・実践路YouBikeステーション',
    g1: '警備室 · 正門', c1: 'セブン-イレブン', c2: 'セブン-イレブン',
    'yb-500304004': '中原大学', 'yb-500304146': '中原大学土木館（中原池）',
    'yb-500304078': '環中東路・実践路交差点',
    '中原大學': '中原大学', '國立臺灣大學': '国立台湾大学'
  }
}

const localizedDescriptions = {
  'zh-Hant': {
    f1: '夜市 · 就在校門口', f2: '素食自助餐', f3: '素食拉麵', f4: '素食早午餐',
    f5: '素食餐廳', f6: '馬來西亞料理', f7: '馬來西亞咖啡室', f8: '印尼烤麵包',
    f9: '越南料理', f10: '泰式與海南雞飯', f11: '牛肉麵', f12: '手工烤布蕭 · NT$35',
    g1: '警衛室與校園正門', c1: '可使用國際卡的自動提款機', c2: '校園東側的自動提款機'
  },
  en: {
    f1: 'Night market · right outside the campus gate', f2: 'Vegetarian buffet', f3: 'Vegetarian ramen', f4: 'Vegetarian brunch',
    f5: 'Vegetarian restaurant', f6: 'Malaysian cuisine', f7: 'Malaysian coffee shop', f8: 'Indonesian toast',
    f9: 'Vietnamese cuisine', f10: 'Thai and Hainan chicken rice', f11: 'Beef noodles', f12: 'Crème brûlée · NT$35',
    g1: 'Guard house at the campus gate', c1: 'Cash machine accepting most international cards', c2: 'Cash machine on the east side of campus'
  },
  ja: {
    f1: '夜市 · キャンパス正門のすぐ外', f2: 'ベジタリアンビュッフェ', f3: 'ベジタリアンラーメン', f4: 'ベジタリアンブランチ',
    f5: 'ベジタリアンレストラン', f6: 'マレーシア料理', f7: 'マレーシア式喫茶店', f8: 'インドネシアントースト',
    f9: 'ベトナム料理', f10: 'タイ料理と海南チキンライス', f11: '牛肉麺', f12: 'クレームブリュレ · NT$35',
    g1: 'キャンパス正門の警備室', c1: '海外カード対応ATM', c2: 'キャンパス東側のATM'
  }
}

const content = {
  'zh-Hant': {
    '無障礙 accessible': '無障礙', '外國卡？要確認 verify': '外國卡？要確認',
    '自備衛生紙 BYO paper': '自備衛生紙', '火鍋 Hotpot': '火鍋', '羽球 Badminton': '羽球',
    'YouBike 河濱 ride': 'YouBike 河濱騎行', '夜市巡禮 crawl': '夜市巡禮',
    '今晚 19:00 tonight': '今晚 19:00', '明天 16:00 tomorrow': '明天 16:00',
    '週六 07:30 Sat': '週六 07:30', '週五 20:00 Fri': '週五 20:00', '今晚 21:00 tonight': '今晚 21:00',
    '今晚 tonight': '今晚'
  },
  en: {
    '冰 / 溫': 'Cold / Warm', '冰 / 溫 / 熱': 'Cold / Warm / Hot', '男 / 女': 'Men / Women',
    '無障礙 accessible': 'Accessible', '外國卡？要確認 verify': 'International cards? Please verify',
    '自備衛生紙 BYO paper': 'Bring your own paper', '火鍋 Hotpot': 'Hotpot', '羽球 Badminton': 'Badminton',
    'YouBike 河濱 ride': 'Riverside YouBike ride', '夜市巡禮 crawl': 'Night market crawl',
    '中原夜市': 'Zhongyuan Night Market', '體育館': 'Gymnasium', '正門集合': 'Meet at the main gate',
    '今晚 19:00 tonight': 'Tonight 19:00', '明天 16:00 tomorrow': 'Tomorrow 16:00',
    '週六 07:30 Sat': 'Saturday 07:30', '週五 20:00 Fri': 'Friday 20:00', '今晚 21:00 tonight': 'Tonight 21:00',
    '今晚 tonight': 'Tonight', '中壢 SOGO': 'Zhongli SOGO'
  },
  ja: {
    '冰 / 溫': '冷水 / 温水', '冰 / 溫 / 熱': '冷水 / 温水 / 熱水', '男 / 女': '男性 / 女性',
    '無障礙 accessible': 'バリアフリー', '外國卡？要確認 verify': '海外カードは要確認',
    '自備衛生紙 BYO paper': 'トイレットペーパー持参',
    '火鍋 Hotpot': '火鍋', '羽球 Badminton': 'バドミントン', 'YouBike 河濱 ride': 'YouBike河川敷ライド',
    '夜市巡禮 crawl': '夜市めぐり', '中原夜市': '中原夜市', '體育館': '体育館',
    '正門集合': '正門に集合', '中壢 SOGO': 'SOGO中壢店', '今晚 19:00 tonight': '今夜 19:00', '明天 16:00 tomorrow': '明日 16:00',
    '週六 07:30 Sat': '土曜日 07:30', '週五 20:00 Fri': '金曜日 20:00', '今晚 21:00 tonight': '今夜 21:00', '今晚 tonight': '今夜',
    '自習室外 · Outside study room': '自習室の外', '服務台後方 · Behind the desk': 'カウンターの後ろ',
    '電梯旁 · Next to the lift': 'エレベーター横', '安靜區入口 · Quiet zone entry': 'サイレントエリア入口',
    '大廳右側 · Right of the lobby': 'ロビー右側', '大廳入口 · By the entrance': 'ロビー入口',
    '東側樓梯旁 · Near east stairs': '東階段の近く', '茶水間 · Pantry corner': '給湯室',
    '走廊底 · End of corridor': '廊下の突き当たり', '球場旁 · Beside the courts': 'コート横',
    '入口處 · At the entrance': '入口', '販賣機後面 · Behind vending machines': '自動販売機の後ろ',
    '販賣機旁 · Next to vending machines': '自動販売機の横', '社團辦公室走廊 · Club office hallway': 'サークル事務室の廊下',
    '樓梯間旁 · By the stairwell': '階段の近く', '走廊中段 · Middle of corridor': '廊下の中央',
    '大廳角落 · Lobby corner': 'ロビーの隅', '電梯出來左轉 · Left out of the lift': 'エレベーターを出て左',
    '廁所入口 · Toilet entrance': 'トイレ入口',
    '走廊飲水機 · Corridor water dispenser': '廊下の給水機',
    '樓層販賣機 · Floor vending machine': 'フロアの自動販売機',
    '一樓販賣機 · First-floor vending machine': '1階の自動販売機',
    '建築外側 · Outside the building': '建物の外側',
    '女廁 · Women\'s toilet': '女性用トイレ', '男廁 · Men\'s toilet': '男性用トイレ',
    '廁所 · Toilet': 'トイレ', '飲水機 · Water dispenser': '給水機',
    '飲水機 1 · Water dispenser 1': '給水機 1', '飲水機 2 · Water dispenser 2': '給水機 2',
    '販賣機 · Vending machine': '自動販売機',
    '販賣機 1 · Vending machine 1': '自動販売機 1', '販賣機 2 · Vending machine 2': '自動販売機 2'
  }
}

const sayJapanese = {
  '這個怎麼賣？': 'これはいくらですか？', '我夾這些，白飯一碗，謝謝': 'これらとご飯を一杯ください',
  '我要一碗素拉麵，謝謝': 'ベジタリアンラーメンを一杯ください', '一份素食鐵板麵，一杯豆漿紅茶': 'ベジ焼きそばと豆乳紅茶をください',
  '我吃素，這個有蔥蒜嗎？': 'ベジタリアンです。ネギやニンニクは入っていますか？',
  '請問這裡是清真的嗎？有豬肉嗎？': 'ここはハラールですか？豚肉は入っていますか？', '請問有沒有豬肉？': '豚肉は入っていますか？',
  '一份烤麵包，謝謝': 'トーストを一つください', '一碗河粉，不要香菜': 'フォーを一杯、パクチーなしで',
  '一份海南雞飯，不要辣': '海南チキンライスを一つ、辛くしないで', '一碗牛肉麵，不要香菜': '牛肉麺を一杯、パクチーなしで',
  '三個一百，謝謝': '3つで100元、お願いします'
}

function savedLanguage() {
  try {
    const saved = localStorage.getItem('freshman-map-language')
    if (LANGUAGES.includes(saved)) return saved
  } catch {}
  const preferred = globalThis.navigator?.language?.toLowerCase() || ''
  return preferred.startsWith('ja') ? 'ja' : preferred.startsWith('en') ? 'en' : 'zh-Hant'
}

let language = savedLanguage()

export const getLanguage = () => language

export function t(key, vars = {}) {
  const template = messages[language]?.[key] ?? messages[language]?.translationUnavailable ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
}

export function setLanguage(next) {
  if (!LANGUAGES.includes(next) || next === language) return
  language = next
  try { localStorage.setItem('freshman-map-language', next) } catch {}
  applyTranslations()
  window.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }))
}

export function applyTranslations(root = document) {
  document.documentElement.lang = language
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n) })
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle) })
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)) })
}

export const onLanguageChange = fn => window.addEventListener('languagechange', fn)

const entityKey = entity => entity.buildingId || entity.placeId || entity.name

export function localName(entity) {
  const translated = localizedNames[language]?.[entityKey(entity)]
  if (translated) return translated
  if (language === 'zh-Hant') return entity.name
  if (language === 'en') return entity.en || t('translationUnavailable')
  if (entity.type === 'bike') return t('description.bikeStation', { station: entity.stationNo || '' })
  return entity.ja || t('translationUnavailable')
}

export function secondaryName(entity) {
  const translated = localizedDescriptions[language]?.[entityKey(entity)]
  if (translated) return translated
  if (entity.buildingId) return t('description.building')
  if (entity.type === 'food') return t('description.restaurant')
  if (entity.type === 'bike') {
    const station = entity.stationNo || entity.en?.match(/\d{9}/)?.[0] || ''
    return t('description.bikeStation', { station })
  }
  if (entity.type === 'gate') return t('description.entrance')
  if (entity.type === 'atm') return t('description.atm')
  if (entity.type === 'cat') return t('description.cat')
  if (entity.type === 'entertainment') return entity.venueKind
    ? t(`venue.${entity.venueKind}`)
    : t('description.entertainment')
  return ''
}

export function localText(value) {
  if (!value) return value
  if (content[language]?.[value]) return content[language][value]
  const parts = value.split(' · ')
  if (parts.length > 1) return language === 'zh-Hant' ? parts[0] : parts[parts.length - 1]
  // Fall back to the original, not "Translation unavailable". This handles
  // survey and user content — restaurant names, activity descriptions — where
  // untranslated Chinese is far more useful than a placeholder that erases the
  // information entirely. Same reasoning as the basemap labels.
  return value
}

export function localPhrase(place) {
  if (language === 'zh-Hant') return place.say
  if (language === 'en') return place.sayEn
  return sayJapanese[place.say] || t('translationUnavailable')
}

export const sayMeaning = () => t('phraseHint')
