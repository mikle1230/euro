// Expand europe-travel.json from 33 cities to ~200 cities
// Run: node scripts/expand-europe-cities.js
// Sources: KT Cities.xlsx (cityCode, countryCode), hardcoded coords for major cities

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const CITIES_PATH = '/Users/michael/Projects/KT/系统拷贝列表/Cities.xlsx'
const TRAVEL_DATA_PATH = path.join(__dirname, '../src/data/europe-travel.json')

// ---- Chinese name dictionary + fallback coords ----
// Format: 'EnglishName': { cn: '中文名', lat, lng }
const CITY_DATA = {
  // UK — GB
  'London': { cn: '伦敦', lat: 51.5074, lng: -0.1278 },
  'Edinburgh': { cn: '爱丁堡', lat: 55.9533, lng: -3.1883 },
  'Manchester': { cn: '曼彻斯特', lat: 53.4808, lng: -2.2426 },
  'Liverpool': { cn: '利物浦', lat: 53.4084, lng: -2.9916 },
  'Glasgow': { cn: '格拉斯哥', lat: 55.8642, lng: -4.2518 },
  'Oxford': { cn: '牛津', lat: 51.7520, lng: -1.2577 },
  'Cambridge': { cn: '剑桥', lat: 52.2053, lng: 0.1218 },
  'Bath': { cn: '巴斯', lat: 51.3811, lng: -2.3590 },
  'York': { cn: '约克', lat: 53.9590, lng: -1.0815 },
  'Cardiff': { cn: '加的夫', lat: 51.4816, lng: -3.1791 },
  'Belfast': { cn: '贝尔法斯特', lat: 54.5973, lng: -5.9301 },

  // France — FR
  'Paris': { cn: '巴黎', lat: 48.8566, lng: 2.3522 },
  'Nice': { cn: '尼斯', lat: 43.7102, lng: 7.2620 },
  'Lyon': { cn: '里昂', lat: 45.7640, lng: 4.8357 },
  'Marseille': { cn: '马赛', lat: 43.2965, lng: 5.3698 },
  'Bordeaux': { cn: '波尔多', lat: 44.8378, lng: -0.5792 },
  'Cannes': { cn: '戛纳', lat: 43.5528, lng: 7.0174 },
  'Avignon': { cn: '阿维尼翁', lat: 43.9493, lng: 4.8055 },
  'Strasbourg': { cn: '斯特拉斯堡', lat: 48.5734, lng: 7.7521 },
  'Lille': { cn: '里尔', lat: 50.6292, lng: 3.0573 },
  'Toulouse': { cn: '图卢兹', lat: 43.6047, lng: 1.4442 },
  'Nantes': { cn: '南特', lat: 47.2184, lng: -1.5536 },
  'Montpellier': { cn: '蒙彼利埃', lat: 43.6108, lng: 3.8767 },
  'Dijon': { cn: '第戎', lat: 47.3220, lng: 5.0415 },
  'Reims': { cn: '兰斯', lat: 49.2583, lng: 4.0317 },
  'Chamonix': { cn: '霞慕尼', lat: 45.9237, lng: 6.8694 },
  'Colmar': { cn: '科尔马', lat: 48.0794, lng: 7.3585 },
  'Aix en Provence': { cn: '普罗旺斯艾克斯', lat: 43.5297, lng: 5.4474 },
  'Annecy': { cn: '安纳西', lat: 45.8992, lng: 6.1294 },

  // Italy — IT
  'Rome': { cn: '罗马', lat: 41.9028, lng: 12.4964 },
  'Venice': { cn: '威尼斯', lat: 45.4408, lng: 12.3155 },
  'Florence': { cn: '佛罗伦萨', lat: 43.7696, lng: 11.2558 },
  'Milan': { cn: '米兰', lat: 45.4642, lng: 9.1900 },
  'Naples': { cn: '那不勒斯', lat: 40.8518, lng: 14.2681 },
  'Turin': { cn: '都灵', lat: 45.0703, lng: 7.6869 },
  'Bologna': { cn: '博洛尼亚', lat: 44.4949, lng: 11.3426 },
  'Verona': { cn: '维罗纳', lat: 45.4384, lng: 10.9916 },
  'Genoa': { cn: '热那亚', lat: 44.4056, lng: 8.9463 },
  'Pisa': { cn: '比萨', lat: 43.7228, lng: 10.4017 },
  'Siena': { cn: '锡耶纳', lat: 43.3186, lng: 11.3306 },
  'Sorrento': { cn: '索伦托', lat: 40.6263, lng: 14.3758 },
  'Palermo': { cn: '巴勒莫', lat: 38.1157, lng: 13.3615 },
  'Bari': { cn: '巴里', lat: 41.1171, lng: 16.8719 },
  'Perugia': { cn: '佩鲁贾', lat: 43.1107, lng: 12.3908 },
  'Como': { cn: '科莫', lat: 45.8080, lng: 9.0852 },
  'Lucca': { cn: '卢卡', lat: 43.8376, lng: 10.4951 },
  'Ravenna': { cn: '拉文纳', lat: 44.4184, lng: 12.2035 },
  'Trieste': { cn: '的里雅斯特', lat: 45.6495, lng: 13.7768 },
  'Padova': { cn: '帕多瓦', lat: 45.4064, lng: 11.8768 },

  // Switzerland — CH
  'Lucerne': { cn: '卢塞恩', lat: 47.0502, lng: 8.3093 },
  'Interlaken': { cn: '因特拉肯', lat: 46.6863, lng: 7.8632 },
  'Zurich': { cn: '苏黎世', lat: 47.3769, lng: 8.5417 },
  'Geneva': { cn: '日内瓦', lat: 46.2044, lng: 6.1432 },
  'Bern': { cn: '伯尔尼', lat: 46.9480, lng: 7.4474 },
  'Lausanne': { cn: '洛桑', lat: 46.5197, lng: 6.6323 },
  'Zermatt': { cn: '策马特', lat: 46.0207, lng: 7.7491 },
  'Lugano': { cn: '卢加诺', lat: 46.0037, lng: 8.9511 },
  'Basel': { cn: '巴塞尔', lat: 47.5596, lng: 7.5886 },
  'St. Moritz': { cn: '圣莫里茨', lat: 46.4908, lng: 9.8355 },
  'Montreux': { cn: '蒙特勒', lat: 46.4312, lng: 6.9107 },
  'Grindelwald': { cn: '格林德瓦', lat: 46.6243, lng: 8.0413 },

  // Germany — DE
  'Berlin': { cn: '柏林', lat: 52.5200, lng: 13.4050 },
  'Munich': { cn: '慕尼黑', lat: 48.1351, lng: 11.5820 },
  'Frankfurt': { cn: '法兰克福', lat: 50.1109, lng: 8.6821 },
  'Hamburg': { cn: '汉堡', lat: 53.5511, lng: 9.9937 },
  'Cologne': { cn: '科隆', lat: 50.9375, lng: 6.9603 },
  'Dresden': { cn: '德累斯顿', lat: 51.0504, lng: 13.7373 },
  'Heidelberg': { cn: '海德堡', lat: 49.3988, lng: 8.6724 },
  'Stuttgart': { cn: '斯图加特', lat: 48.7758, lng: 9.1829 },
  'Nuremberg': { cn: '纽伦堡', lat: 49.4521, lng: 11.0767 },
  'Leipzig': { cn: '莱比锡', lat: 51.3397, lng: 12.3731 },
  'Bremen': { cn: '不来梅', lat: 53.0793, lng: 8.8017 },
  'Potsdam': { cn: '波茨坦', lat: 52.3906, lng: 13.0645 },
  'Fussen': { cn: '菲森', lat: 47.5696, lng: 10.7004 },
  'Baden-Baden': { cn: '巴登巴登', lat: 48.7606, lng: 8.2398 },
  'Rothenburg ob der Tauber': { cn: '罗滕堡', lat: 49.3772, lng: 10.1789 },

  // Spain — ES
  'Barcelona': { cn: '巴塞罗那', lat: 41.3874, lng: 2.1686 },
  'Madrid': { cn: '马德里', lat: 40.4168, lng: -3.7038 },
  'Granada': { cn: '格拉纳达', lat: 37.1773, lng: -3.5986 },
  'Seville': { cn: '塞维利亚', lat: 37.3891, lng: -5.9845 },
  'Valencia': { cn: '瓦伦西亚', lat: 39.4699, lng: -0.3763 },
  'Bilbao': { cn: '毕尔巴鄂', lat: 43.2630, lng: -2.9350 },
  'Malaga': { cn: '马拉加', lat: 36.7213, lng: -4.4214 },
  'Cordoba': { cn: '科尔多瓦', lat: 37.8882, lng: -4.7794 },
  'Toledo': { cn: '托莱多', lat: 39.8628, lng: -4.0273 },
  'Segovia': { cn: '塞哥维亚', lat: 40.9429, lng: -4.1088 },
  'Zaragoza': { cn: '萨拉戈萨', lat: 41.6488, lng: -0.8891 },
  'Salamanca': { cn: '萨拉曼卡', lat: 40.9701, lng: -5.6635 },
  'San Sebastian': { cn: '圣塞瓦斯蒂安', lat: 43.3183, lng: -1.9812 },
  'Santiago de Compostela': { cn: '圣地亚哥-德孔波斯特拉', lat: 42.8782, lng: -8.5448 },
  'Ibiza': { cn: '伊维萨', lat: 38.9067, lng: 1.4206 },
  'Palma de Mallorca': { cn: '帕尔马', lat: 39.5696, lng: 2.6502 },

  // Portugal — PT
  'Lisbon': { cn: '里斯本', lat: 38.7223, lng: -9.1393 },
  'Porto': { cn: '波尔图', lat: 41.1579, lng: -8.6291 },
  'Sintra': { cn: '辛特拉', lat: 38.8029, lng: -9.3817 },
  'Faro': { cn: '法鲁', lat: 37.0194, lng: -7.9322 },
  'Coimbra': { cn: '科英布拉', lat: 40.2033, lng: -8.4103 },
  'Evora': { cn: '埃武拉', lat: 38.5710, lng: -7.9096 },

  // Netherlands — NL
  'Amsterdam': { cn: '阿姆斯特丹', lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { cn: '鹿特丹', lat: 51.9244, lng: 4.4777 },
  'The Hague': { cn: '海牙', lat: 52.0705, lng: 4.3007 },
  'Utrecht': { cn: '乌得勒支', lat: 52.0907, lng: 5.1214 },
  'Maastricht': { cn: '马斯特里赫特', lat: 50.8514, lng: 5.6910 },
  'Giethoorn': { cn: '羊角村', lat: 52.7402, lng: 6.0778 },

  // Belgium — BE
  'Brussels': { cn: '布鲁塞尔', lat: 50.8503, lng: 4.3517 },
  'Bruges': { cn: '布鲁日', lat: 51.2093, lng: 3.2247 },
  'Antwerp': { cn: '安特卫普', lat: 51.2194, lng: 4.4025 },
  'Ghent': { cn: '根特', lat: 51.0543, lng: 3.7174 },
  'Liege': { cn: '列日', lat: 50.6451, lng: 5.5734 },

  // Austria — AT
  'Vienna': { cn: '维也纳', lat: 48.2082, lng: 16.3738 },
  'Salzburg': { cn: '萨尔茨堡', lat: 47.8095, lng: 13.0550 },
  'Innsbruck': { cn: '因斯布鲁克', lat: 47.2692, lng: 11.4041 },
  'Hallstatt': { cn: '哈尔施塔特', lat: 47.5622, lng: 13.6493 },
  'Graz': { cn: '格拉茨', lat: 47.0707, lng: 15.4395 },
  'Linz': { cn: '林茨', lat: 48.3069, lng: 14.2858 },

  // Czech Republic — CZ
  'Prague': { cn: '布拉格', lat: 50.0755, lng: 14.4378 },
  'Cesky Krumlov': { cn: '克鲁姆洛夫', lat: 48.8127, lng: 14.3175 },
  'Karlovy Vary': { cn: '卡罗维发利', lat: 50.2319, lng: 12.8710 },
  'Brno': { cn: '布尔诺', lat: 49.1951, lng: 16.6068 },

  // Hungary — HU
  'Budapest': { cn: '布达佩斯', lat: 47.4979, lng: 19.0402 },
  'Eger': { cn: '埃格尔', lat: 47.9024, lng: 20.3776 },
  'Pecs': { cn: '佩奇', lat: 46.0727, lng: 18.2323 },

  // Poland — PL
  'Krakow': { cn: '克拉科夫', lat: 50.0647, lng: 19.9450 },
  'Warsaw': { cn: '华沙', lat: 52.2297, lng: 21.0122 },
  'Gdansk': { cn: '格但斯克', lat: 54.3520, lng: 18.6466 },
  'Wroclaw': { cn: '弗罗茨瓦夫', lat: 51.1079, lng: 17.0385 },
  'Poznan': { cn: '波兹南', lat: 52.4064, lng: 16.9252 },

  // Croatia — HR
  'Dubrovnik': { cn: '杜布罗夫尼克', lat: 42.6507, lng: 18.0944 },
  'Split': { cn: '斯普利特', lat: 43.5081, lng: 16.4402 },
  'Zagreb': { cn: '萨格勒布', lat: 45.8150, lng: 15.9819 },
  'Hvar': { cn: '赫瓦尔', lat: 43.1729, lng: 16.4411 },
  'Pula': { cn: '普拉', lat: 44.8666, lng: 13.8496 },
  'Zadar': { cn: '扎达尔', lat: 44.1194, lng: 15.2314 },

  // Greece — GR
  'Athens': { cn: '雅典', lat: 37.9838, lng: 23.7275 },
  'Santorini': { cn: '圣托里尼', lat: 36.3932, lng: 25.4615 },
  'Mykonos': { cn: '米科诺斯', lat: 37.4467, lng: 25.3289 },
  'Thessaloniki': { cn: '塞萨洛尼基', lat: 40.6401, lng: 22.9444 },
  'Heraklion': { cn: '伊拉克利翁', lat: 35.3387, lng: 25.1442 },
  'Rhodes': { cn: '罗德岛', lat: 36.4342, lng: 28.2176 },
  'Corfu': { cn: '科孚', lat: 39.6243, lng: 19.9217 },
  'Delphi': { cn: '德尔斐', lat: 38.4824, lng: 22.4978 },
  'Olympia': { cn: '奥林匹亚', lat: 37.6428, lng: 21.6303 },

  // Sweden — SE
  'Stockholm': { cn: '斯德哥尔摩', lat: 59.3293, lng: 18.0686 },
  'Gothenburg': { cn: '哥德堡', lat: 57.7089, lng: 11.9746 },
  'Malmo': { cn: '马尔默', lat: 55.6050, lng: 13.0038 },
  'Uppsala': { cn: '乌普萨拉', lat: 59.8586, lng: 17.6389 },
  'Kiruna': { cn: '基律纳', lat: 67.8558, lng: 20.2253 },

  // Norway — NO
  'Oslo': { cn: '奥斯陆', lat: 59.9139, lng: 10.7522 },
  'Bergen': { cn: '卑尔根', lat: 60.3913, lng: 5.3221 },
  'Tromso': { cn: '特罗姆瑟', lat: 69.6496, lng: 18.9560 },
  'Stavanger': { cn: '斯塔万格', lat: 58.9700, lng: 5.7331 },
  'Trondheim': { cn: '特隆赫姆', lat: 63.4305, lng: 10.3951 },
  'Flam': { cn: '弗洛姆', lat: 60.8630, lng: 7.1170 },

  // Denmark — DK
  'Copenhagen': { cn: '哥本哈根', lat: 55.6761, lng: 12.5683 },
  'Aarhus': { cn: '奥胡斯', lat: 56.1629, lng: 10.2039 },
  'Odense': { cn: '欧登塞', lat: 55.4038, lng: 10.4024 },

  // Ireland — IE
  'Dublin': { cn: '都柏林', lat: 53.3498, lng: -6.2603 },
  'Galway': { cn: '戈尔韦', lat: 53.2707, lng: -9.0568 },
  'Cork': { cn: '科克', lat: 51.8969, lng: -8.4863 },

  // Turkey — TR
  'Istanbul': { cn: '伊斯坦布尔', lat: 41.0082, lng: 28.9784 },
  'Ankara': { cn: '安卡拉', lat: 39.9334, lng: 32.8597 },
  'Izmir': { cn: '伊兹密尔', lat: 38.4237, lng: 27.1428 },
  'Antalya': { cn: '安塔利亚', lat: 36.8969, lng: 30.7133 },
  'Pamukkale': { cn: '棉花堡', lat: 37.9190, lng: 29.1210 },
  'Ephesus': { cn: '以弗所', lat: 37.9500, lng: 27.3680 },

  // Finland — FI
  'Helsinki': { cn: '赫尔辛基', lat: 60.1699, lng: 24.9384 },
  'Rovaniemi': { cn: '罗瓦涅米', lat: 66.5039, lng: 25.7294 },

  // Iceland — IS
  'Reykjavik': { cn: '雷克雅未克', lat: 64.1466, lng: -21.9426 },

  // Russia — RU
  'Moscow': { cn: '莫斯科', lat: 55.7558, lng: 37.6173 },
  'St. Petersburg': { cn: '圣彼得堡', lat: 59.9343, lng: 30.3351 },

  // Slovenia — SI
  'Ljubljana': { cn: '卢布尔雅那', lat: 46.0569, lng: 14.5058 },
  'Bled': { cn: '布莱德', lat: 46.3683, lng: 14.1147 },

  // Estonia — EE
  'Tallinn': { cn: '塔林', lat: 59.4370, lng: 24.7535 },

  // Latvia — LV
  'Riga': { cn: '里加', lat: 56.9496, lng: 24.1052 },

  // Lithuania — LT
  'Vilnius': { cn: '维尔纽斯', lat: 54.6872, lng: 25.2797 },

  // Slovakia — SK
  'Bratislava': { cn: '布拉迪斯拉发', lat: 48.1486, lng: 17.1077 },

  // Romania — RO
  'Bucharest': { cn: '布加勒斯特', lat: 44.4268, lng: 26.1025 },
  'Brasov': { cn: '布拉索夫', lat: 45.6426, lng: 25.5888 },

  // Bulgaria — BG
  'Sofia': { cn: '索非亚', lat: 42.6977, lng: 23.3219 },

  // Serbia — RS
  'Belgrade': { cn: '贝尔格莱德', lat: 44.7866, lng: 20.4489 },

  // Monaco — MC
  'Monaco': { cn: '摩纳哥', lat: 43.7384, lng: 7.4246 },

  // Luxembourg — LU
  'Luxembourg': { cn: '卢森堡', lat: 49.6117, lng: 6.1300 },

  // Malta — MT
  'Valletta': { cn: '瓦莱塔', lat: 35.8997, lng: 14.5147 },

  // Cyprus — CY
  'Nicosia': { cn: '尼科西亚', lat: 35.1856, lng: 33.3823 },

  // China (departure cities, not in europe-travel)
  'Beijing': { cn: '北京', lat: 39.9042, lng: 116.4074 },
  'Shanghai': { cn: '上海', lat: 31.2304, lng: 121.4737 },
  'Guangzhou': { cn: '广州', lat: 23.1291, lng: 113.2644 },
  'Shenzhen': { cn: '深圳', lat: 22.5431, lng: 114.0579 },
  'Chengdu': { cn: '成都', lat: 30.5728, lng: 104.0668 },
}

// Countries whose codes might not appear in CITY_DATA → resolve from Cities.xlsx
// City name → hardcoded country code for cities not in Cities.xlsx
const CITY_COUNTRY = {
  'London': 'GB', 'Edinburgh': 'GB', 'Manchester': 'GB', 'Liverpool': 'GB',
  'Glasgow': 'GB', 'Oxford': 'GB', 'Cambridge': 'GB', 'Bath': 'GB', 'York': 'GB',
  'Cardiff': 'GB', 'Belfast': 'GB',
  'Paris': 'FR', 'Nice': 'FR', 'Lyon': 'FR', 'Marseille': 'FR', 'Bordeaux': 'FR',
  'Cannes': 'FR', 'Avignon': 'FR', 'Strasbourg': 'FR', 'Lille': 'FR',
  'Toulouse': 'FR', 'Nantes': 'FR', 'Montpellier': 'FR', 'Dijon': 'FR',
  'Reims': 'FR', 'Chamonix': 'FR', 'Colmar': 'FR', 'Aix en Provence': 'FR', 'Annecy': 'FR',
  'Rome': 'IT', 'Venice': 'IT', 'Florence': 'IT', 'Milan': 'IT', 'Naples': 'IT',
  'Turin': 'IT', 'Bologna': 'IT', 'Verona': 'IT', 'Genoa': 'IT', 'Pisa': 'IT',
  'Siena': 'IT', 'Sorrento': 'IT', 'Palermo': 'IT', 'Bari': 'IT', 'Perugia': 'IT',
  'Como': 'IT', 'Lucca': 'IT', 'Ravenna': 'IT', 'Trieste': 'IT', 'Padova': 'IT',
  'Lucerne': 'CH', 'Interlaken': 'CH', 'Zurich': 'CH', 'Geneva': 'CH',
  'Bern': 'CH', 'Lausanne': 'CH', 'Zermatt': 'CH', 'Lugano': 'CH', 'Basel': 'CH',
  'St. Moritz': 'CH', 'Montreux': 'CH', 'Grindelwald': 'CH',
  'Berlin': 'DE', 'Munich': 'DE', 'Frankfurt': 'DE', 'Hamburg': 'DE',
  'Cologne': 'DE', 'Dresden': 'DE', 'Heidelberg': 'DE', 'Stuttgart': 'DE',
  'Nuremberg': 'DE', 'Leipzig': 'DE', 'Bremen': 'DE', 'Potsdam': 'DE',
  'Fussen': 'DE', 'Baden-Baden': 'DE', 'Rothenburg ob der Tauber': 'DE',
  'Barcelona': 'ES', 'Madrid': 'ES', 'Granada': 'ES', 'Seville': 'ES',
  'Valencia': 'ES', 'Bilbao': 'ES', 'Malaga': 'ES', 'Cordoba': 'ES',
  'Toledo': 'ES', 'Segovia': 'ES', 'Zaragoza': 'ES', 'Salamanca': 'ES',
  'San Sebastian': 'ES', 'Santiago de Compostela': 'ES', 'Ibiza': 'ES',
  'Palma de Mallorca': 'ES',
  'Lisbon': 'PT', 'Porto': 'PT', 'Sintra': 'PT', 'Faro': 'PT', 'Coimbra': 'PT', 'Evora': 'PT',
  'Amsterdam': 'NL', 'Rotterdam': 'NL', 'The Hague': 'NL', 'Utrecht': 'NL',
  'Maastricht': 'NL', 'Giethoorn': 'NL',
  'Brussels': 'BE', 'Bruges': 'BE', 'Antwerp': 'BE', 'Ghent': 'BE', 'Liege': 'BE',
  'Vienna': 'AT', 'Salzburg': 'AT', 'Innsbruck': 'AT', 'Hallstatt': 'AT',
  'Graz': 'AT', 'Linz': 'AT',
  'Prague': 'CZ', 'Cesky Krumlov': 'CZ', 'Karlovy Vary': 'CZ', 'Brno': 'CZ',
  'Budapest': 'HU', 'Eger': 'HU', 'Pecs': 'HU',
  'Krakow': 'PL', 'Warsaw': 'PL', 'Gdansk': 'PL', 'Wroclaw': 'PL', 'Poznan': 'PL',
  'Dubrovnik': 'HR', 'Split': 'HR', 'Zagreb': 'HR', 'Hvar': 'HR', 'Pula': 'HR', 'Zadar': 'HR',
  'Athens': 'GR', 'Santorini': 'GR', 'Mykonos': 'GR', 'Thessaloniki': 'GR',
  'Heraklion': 'GR', 'Rhodes': 'GR', 'Corfu': 'GR', 'Delphi': 'GR', 'Olympia': 'GR',
  'Stockholm': 'SE', 'Gothenburg': 'SE', 'Malmo': 'SE', 'Uppsala': 'SE', 'Kiruna': 'SE',
  'Oslo': 'NO', 'Bergen': 'NO', 'Tromso': 'NO', 'Stavanger': 'NO', 'Trondheim': 'NO', 'Flam': 'NO',
  'Copenhagen': 'DK', 'Aarhus': 'DK', 'Odense': 'DK',
  'Dublin': 'IE', 'Galway': 'IE', 'Cork': 'IE',
  'Istanbul': 'TR', 'Ankara': 'TR', 'Izmir': 'TR', 'Antalya': 'TR',
  'Pamukkale': 'TR', 'Ephesus': 'TR',
  'Helsinki': 'FI', 'Rovaniemi': 'FI',
  'Reykjavik': 'IS',
  'Moscow': 'RU', 'St. Petersburg': 'RU',
  'Ljubljana': 'SI', 'Bled': 'SI',
  'Tallinn': 'EE',
  'Riga': 'LV',
  'Vilnius': 'LT',
  'Bratislava': 'SK',
  'Bucharest': 'RO', 'Brasov': 'RO',
  'Sofia': 'BG',
  'Belgrade': 'RS',
  'Monaco': 'MC',
  'Luxembourg': 'LU',
  'Valletta': 'MT',
  'Nicosia': 'CY',
}

// Country definitions — id, Chinese name, English name, description
const COUNTRY_DEFS = {
  'GB': { id: 'united-kingdom', name: '英国', nameEn: 'United Kingdom', desc: '大英帝国的遗产，从伦敦的摩登到苏格兰高地的苍茫，文化与自然交织' },
  'FR': { id: 'france', name: '法国', nameEn: 'France', desc: '浪漫与艺术之都，拥有世界顶级的博物馆、美食与葡萄酒文化' },
  'IT': { id: 'italy', name: '意大利', nameEn: 'Italy', desc: '古罗马文明的发源地，文艺复兴的摇篮，美食、艺术与时尚之国' },
  'CH': { id: 'switzerland', name: '瑞士', nameEn: 'Switzerland', desc: '阿尔卑斯山的壮丽风光，钟表、巧克力和湖泊的国度' },
  'DE': { id: 'germany', name: '德国', nameEn: 'Germany', desc: '童话城堡、啤酒文化与现代工业完美结合的中欧强国' },
  'ES': { id: 'spain', name: '西班牙', nameEn: 'Spain', desc: '激情奔放的弗拉明戈、高迪建筑与地中海阳光的完美融合' },
  'PT': { id: 'portugal', name: '葡萄牙', nameEn: 'Portugal', desc: '大航海时代的起点，瓷砖艺术与波特酒的故乡' },
  'NL': { id: 'netherlands', name: '荷兰', nameEn: 'Netherlands', desc: '风车、郁金香和运河交织的低地之国，艺术大师的灵感源泉' },
  'BE': { id: 'belgium', name: '比利时', nameEn: 'Belgium', desc: '欧洲的心脏，巧克力、啤酒与中世纪广场的迷人组合' },
  'AT': { id: 'austria', name: '奥地利', nameEn: 'Austria', desc: '音乐之都、阿尔卑斯山脉与巴洛克宫殿的皇家气派' },
  'CZ': { id: 'czech-republic', name: '捷克', nameEn: 'Czech Republic', desc: '波西米亚的浪漫，中世纪古城与啤酒文化的完美体验' },
  'HU': { id: 'hungary', name: '匈牙利', nameEn: 'Hungary', desc: '多瑙河畔的明珠，温泉浴场与奥匈帝国遗风' },
  'PL': { id: 'poland', name: '波兰', nameEn: 'Poland', desc: '重生的东欧古国，历史遗迹与现代活力的交汇' },
  'HR': { id: 'croatia', name: '克罗地亚', nameEn: 'Croatia', desc: '亚得里亚海明珠，中世纪古城与碧蓝海岸的完美邂逅' },
  'GR': { id: 'greece', name: '希腊', nameEn: 'Greece', desc: '西方文明的摇篮，爱琴海蓝白梦幻与古希腊遗迹' },
  'SE': { id: 'sweden', name: '瑞典', nameEn: 'Sweden', desc: '北欧设计的典范，群岛、极光与创新精神的融合' },
  'NO': { id: 'norway', name: '挪威', nameEn: 'Norway', desc: '峡湾之国的壮美风光，维京历史与北极光的神奇' },
  'DK': { id: 'denmark', name: '丹麦', nameEn: 'Denmark', desc: '童话王国，设计之都和幸福生活方式的代名词' },
  'IE': { id: 'ireland', name: '爱尔兰', nameEn: 'Ireland', desc: '翡翠岛的绿色原野、城堡遗迹与凯尔特音乐的魅力' },
  'TR': { id: 'turkey', name: '土耳其', nameEn: 'Turkey', desc: '横跨欧亚的文明走廊，清真寺、大巴扎与地中海风光' },
  'FI': { id: 'finland', name: '芬兰', nameEn: 'Finland', desc: '千湖之国的纯净自然，圣诞老人的故乡与极光奇景' },
  'IS': { id: 'iceland', name: '冰岛', nameEn: 'Iceland', desc: '冰与火之岛，冰川、火山、温泉与北极光的奇幻世界' },
  'RU': { id: 'russia', name: '俄罗斯', nameEn: 'Russia', desc: '横跨欧亚的广阔国度，东正教堂、芭蕾与帝国气派' },
  'SI': { id: 'slovenia', name: '斯洛文尼亚', nameEn: 'Slovenia', desc: '阿尔卑斯山麓的绿色小国，布莱德湖与溶洞奇观' },
  'EE': { id: 'estonia', name: '爱沙尼亚', nameEn: 'Estonia', desc: '波罗的海数字先锋，中世纪塔林老城的童话魅力' },
  'LV': { id: 'latvia', name: '拉脱维亚', nameEn: 'Latvia', desc: '波罗的海艺术之都，新艺术建筑与森林海岸' },
  'LT': { id: 'lithuania', name: '立陶宛', nameEn: 'Lithuania', desc: '波罗的海历史的守护者，巴洛克维尔纽斯与琥珀' },
  'SK': { id: 'slovakia', name: '斯洛伐克', nameEn: 'Slovakia', desc: '中欧山国，多瑙河畔的城堡与塔特拉山风光' },
  'RO': { id: 'romania', name: '罗马尼亚', nameEn: 'Romania', desc: '吸血鬼传说的故乡，喀尔巴阡山脉与中世纪城堡' },
  'BG': { id: 'bulgaria', name: '保加利亚', nameEn: 'Bulgaria', desc: '玫瑰之国的巴尔干风情，色雷斯遗迹与黑海海岸' },
  'RS': { id: 'serbia', name: '塞尔维亚', nameEn: 'Serbia', desc: '巴尔干之心，多瑙河畔的夜生活与东正教遗产' },
  'MC': { id: 'monaco', name: '摩纳哥', nameEn: 'Monaco', desc: '地中海的奢华公国，赌场、F1赛道与富豪游艇' },
  'LU': { id: 'luxembourg', name: '卢森堡', nameEn: 'Luxembourg', desc: '欧洲的十字路口，中世纪城堡与现代金融的融合' },
  'MT': { id: 'malta', name: '马耳他', nameEn: 'Malta', desc: '地中海心脏，骑士团城堡与碧蓝泻湖' },
  'CY': { id: 'cyprus', name: '塞浦路斯', nameEn: 'Cyprus', desc: '爱神之岛，古希腊遗址与地中海阳光海滩' },
}

// ---- MAIN ----

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function main() {
  // Read Cities.xlsx for cityCode/countryCode matching
  const wb = XLSX.readFile(CITIES_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // Build lookup: English city name → { cityCode, countryCode, lat, lng } from Cities.xlsx
  const xlsxMap = {}
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const name = r[2]
    const code = r[3]
    const lat = r[5]
    const lng = r[6]
    const cc = r[8]
    if (!name || name === 'TO BE DELETED') continue
    if (!cc || cc.length !== 2) continue
    xlsxMap[name] = { cityCode: code, countryCode: cc, lat: lat != null && lat !== '' ? Number(lat) : null, lng: lng != null && lng !== '' ? Number(lng) : null }
  }

  // Read existing data
  const existing = JSON.parse(fs.readFileSync(TRAVEL_DATA_PATH, 'utf-8'))
  const existingCities = new Map()  // englishName → existing city data
  for (const c of existing.countries) {
    for (const city of c.cities) {
      existingCities.set(city.nameEn, city)
    }
  }

  // Build new country→cities map
  const countryCities = {}  // countryCode → [{englishName, chineseName, lat, lng}]
  let matched = 0
  let unmatched = 0

  for (const [engName, data] of Object.entries(CITY_DATA)) {
    const countryCode = CITY_COUNTRY[engName]
    if (!countryCode) {
      console.log(`  ⚠ No country mapping: ${engName}`)
      unmatched++
      continue
    }

    // Skip Chinese cities — they don't belong in europe-travel.json
    if (countryCode === 'CN') continue

    // Try Cities.xlsx for coordinates, fall back to hardcoded
    const xlsx = xlsxMap[engName]
    if (xlsx) matched++
    else unmatched++

    const lat = (xlsx && xlsx.lat != null) ? xlsx.lat : data.lat
    const lng = (xlsx && xlsx.lng != null) ? xlsx.lng : data.lng

    if (!countryCities[countryCode]) countryCities[countryCode] = []
    countryCities[countryCode].push({
      englishName: engName,
      chineseName: data.cn,
      lat,
      lng,
    })
  }

  console.log(`Cities.xlsx matched: ${matched}, hardcoded-only: ${unmatched}`)

  // Build the output
  const result = { countries: [] }
  let totalCities = 0

  for (const [countryCode, cities] of Object.entries(countryCities)) {
    const def = COUNTRY_DEFS[countryCode]
    if (!def) {
      console.log(`  ⚠ Unknown country: ${countryCode}, skipping ${cities.length} cities`)
      continue
    }

    // Sort cities: existing attractions cities first, then by importance (order in CITY_DATA)
    const importanceOrder = Object.keys(CITY_DATA)
    cities.sort((a, b) => {
      const aExist = existingCities.has(a.englishName) ? 0 : 1
      const bExist = existingCities.has(b.englishName) ? 0 : 1
      if (aExist !== bExist) return aExist - bExist
      return importanceOrder.indexOf(a.englishName) - importanceOrder.indexOf(b.englishName)
    })

    const country = {
      id: def.id,
      name: def.name,
      nameEn: def.nameEn,
      description: def.desc,
      cities: cities.map((c) => {
        const existingCity = existingCities.get(c.englishName)
        if (existingCity) {
          // Preserve existing city data (attractions, etc.) but update lat/lng
          return {
            ...existingCity,
            lat: c.lat,
            lng: c.lng,
          }
        }
        // New city
        return {
          id: slugify(c.englishName),
          name: c.chineseName,
          nameEn: c.englishName,
          lat: c.lat,
          lng: c.lng,
          attractions: [],
        }
      }),
    }

    result.countries.push(country)
    totalCities += country.cities.length
  }

  // Sort countries: existing ones first (preserve order), new ones alphabetical
  const existingCountryIds = new Set(existing.countries.map(c => c.id))
  result.countries.sort((a, b) => {
    const aExist = existingCountryIds.has(a.id) ? 0 : 1
    const bExist = existingCountryIds.has(b.id) ? 0 : 1
    if (aExist !== bExist) return aExist - bExist
    if (aExist === 0) {
      return existing.countries.findIndex(c => c.id === a.id) - existing.countries.findIndex(c => c.id === b.id)
    }
    return a.name.localeCompare(b.name)
  })

  // Write
  fs.writeFileSync(TRAVEL_DATA_PATH, JSON.stringify(result, null, 2))
  console.log(`Done. ${result.countries.length} countries, ${totalCities} cities.`)
}

main()
