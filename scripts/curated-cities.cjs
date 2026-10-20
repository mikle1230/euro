// 精选常用欧洲城市表：[中文名, 英文名]
// 两个构建脚本共用：
//  - build-city-hints.js：生成 AI 提示码表（city-hints.js）
//  - build-quos-cities.js：生成 quos-cities.json 的中文键交叉引用
module.exports = [

  // 法国
  ['巴黎', 'Paris'], ['尼斯', 'Nice'], ['马赛', 'Marseille'], ['戛纳', 'Cannes'],
  ['阿维尼翁', 'Avignon'], ['里昂', 'Lyon'], ['斯特拉斯堡', 'Strasbourg'], ['波尔多', 'Bordeaux'],
  ['第戎', 'Dijon'], ['科尔马', 'Colmar'], ['安纳西', 'Annecy'], ['霞慕尼', 'Chamonix'],
  ['佩皮尼昂', 'Perpignan'],
  ['凡尔赛', 'Versailles'], ['圣特罗佩', 'Saint Tropez'], ['瓦朗索勒', 'Valensole'], ['圣米歇尔山', 'Mont Saint Michel'],
  // 意大利
  ['罗马', 'Rome'], ['佛罗伦萨', 'Florence'], ['威尼斯', 'Venice'], ['米兰', 'Milan'],
  ['维罗纳', 'Verona'], ['比萨', 'Pisa'], ['那不勒斯', 'Naples'], ['索伦托', 'Sorrento'], ['苏莲托', 'Sorrento'],
  ['奇维塔维基亚', 'Civitavecchia'], ['阿尔贝罗贝洛', 'Alberobello'], ['阿格里真托', 'Agrigento'],
  ['庞贝', 'Pompeii'], ['五渔村', 'Cinque Terre'], ['博洛尼亚', 'Bologna'], ['都灵', 'Turin'],
  ['热那亚', 'Genova'], ['锡耶纳', 'Siena'], ['圣吉米尼亚诺', 'San Gimignano'], ['阿马尔菲', 'Amalfi'],
  ['科莫', 'Como'], ['巴勒莫', 'Palermo'], ['卡塔尼亚', 'Catania'], ['陶尔米纳', 'Taormina'], ['锡拉库扎', 'Siracusa'], ['锡拉库萨', 'Siracusa'],
  // 瑞士
  ['苏黎世', 'Zurich'], ['日内瓦', 'Geneva'], ['卢塞恩', 'Lucerne'], ['琉森', 'Lucerne'], ['因特拉肯', 'Interlaken'],
  ['伯尔尼', 'Bern'], ['采尔马特', 'Zermatt'], ['洛桑', 'Lausanne'], ['蒙特勒', 'Montreux'],
  ['圣莫里茨', 'St Moritz'], ['卢加诺', 'Lugano'], ['达沃斯', 'Davos'], ['格林德瓦', 'Grindelwald'],
  // 奥地利
  ['维也纳', 'Vienna'], ['萨尔茨堡', 'Salzburg'], ['因斯布鲁克', 'Innsbruck'], ['哈尔施塔特', 'Hallstatt'],
  ['格拉茨', 'Graz'],
  // 捷克
  ['布拉格', 'Prague'], ['克鲁姆洛夫', 'Cesky Krumlov'], ['卡罗维发利', 'Karlovy Vary'], ['布尔诺', 'Brno'],
  // 匈牙利
  ['布达佩斯', 'Budapest'],
  // 波兰
  ['克拉科夫', 'Krakow'], ['华沙', 'Warsaw'], ['格但斯克', 'Gdansk'], ['弗罗茨瓦夫', 'Wroclaw'],
  // 德国
  ['柏林', 'Berlin'], ['慕尼黑', 'Munich'], ['法兰克福', 'Frankfurt'], ['科隆', 'Cologne'],
  ['汉堡', 'Hamburg'], ['德累斯顿', 'Dresden'], ['莱比锡', 'Leipzig'], ['斯图加特', 'Stuttgart'],
  ['海德堡', 'Heidelberg'], ['罗滕堡', 'Rothenburg'], ['杜塞尔多夫', 'Dusseldorf'], ['波恩', 'Bonn'],
  ['纽伦堡', 'Nuremberg'], ['维尔茨堡', 'Wurzburg'],
  // 英国
  ['伦敦', 'London'], ['爱丁堡', 'Edinburgh'], ['曼彻斯特', 'Manchester'], ['格拉斯哥', 'Glasgow'],
  ['利物浦', 'Liverpool'], ['剑桥', 'Cambridge'], ['牛津', 'Oxford'], ['巴斯', 'Bath'],
  ['约克', 'York'], ['贝尔法斯特', 'Belfast'],
  // 西班牙
  ['巴塞罗那', 'Barcelona'], ['马德里', 'Madrid'], ['塞维利亚', 'Seville'], ['格拉纳达', 'Granada'],
  ['托莱多', 'Toledo'], ['瓦伦西亚', 'Valencia'], ['毕尔巴鄂', 'Bilbao'], ['龙达', 'Ronda'],
  ['科尔多瓦', 'Cordoba'], ['萨拉戈萨', 'Zaragoza'], ['马拉加', 'Malaga'],
  // 葡萄牙
  ['里斯本', 'Lisbon'], ['波尔图', 'Porto'], ['辛特拉', 'Sintra'],
  // 荷兰
  ['阿姆斯特丹', 'Amsterdam'], ['鹿特丹', 'Rotterdam'], ['海牙', 'The Hague'], ['乌得勒支', 'Utrecht'],
  // 比利时 / 卢森堡
  ['布鲁塞尔', 'Brussels'], ['布鲁日', 'Bruges'], ['安特卫普', 'Antwerp'], ['根特', 'Ghent'],
  ['卢森堡', 'Luxembourg'],
  // 北欧
  ['海拉', 'Hella (Iceland)'], ['维克', 'Vik i Myrdal'],
  ['赫尔辛格', 'Helsingor'], ['赫尔辛堡', 'Helsingborg'],
  ['普特加登', 'Puttgarden'], ['勒兹比', 'Roedby'],
  ['尼堡', 'Nyborg'], ['霍尔特', 'Holte'],
  ['哥本哈根', 'Copenhagen'], ['斯德哥尔摩', 'Stockholm'], ['哥德堡', 'Gothenburg'], ['马尔默', 'Malmo'],
  ['腓特烈港', 'Frederikshavn'],
  ['斯塔尔海姆', 'Stalheim'], ['盖罗', 'Geilo'], ['弗勒', 'Forde'],
  ['奥斯陆', 'Oslo'], ['卑尔根', 'Bergen'], ['斯塔万格', 'Stavanger'], ['特罗姆瑟', 'Tromso'],
  ['奥勒松', 'Alesund'], ['赫尔辛基', 'Helsinki'], ['罗瓦涅米', 'Rovaniemi'],
  ['许温凯', 'Hyvinkää'], ['耶尔文佩', 'Järvenpää'], ['伊纳里', 'Inari'],
  ['奥卢', 'Oulu'], ['库萨莫', 'Kuusamo'], ['波尔沃', 'Porvoo'],
  ['诺尔雪平', 'Norrköping'], ['延雪平', 'Jönköping'], ['特洛尔海坦', 'Trollhättan'],
  ['哈尔姆斯塔德', 'Halmstad'], ['龙德', 'Lund'], ['卡尔斯克鲁纳', 'Karlskrona'],
  ['卡尔马', 'Kalmar'], ['维斯比', 'Visby'], ['夏洛滕贝格', 'Charlottenberg'],
  ['孙讷', 'Sunne'], ['阿尔维卡', 'Arvika'], ['奥尔延', 'Arjang'],
  ['厄斯特松德', 'Östersund'], ['奥勒', 'Åre'], ['吕勒奥', 'Luleå'],
  ['乌尔里瑟港', 'Ulricehamn'], ['韦特兰达', 'Vetlanda'], ['奥斯卡港', 'Oskarshamn'],
  ['韦克舍', 'Växjö'],
  ['加勒穆恩', 'Gardermoen'], ['德拉门', 'Drammen'], ['利勒斯特伦', 'Lillestrøm'],
  ['洛伦斯考格', 'Lørenskog'], ['于尔维克', 'Ulvik'], ['居德旺恩', 'Gudvangen'],
  ['米达尔', 'Myrdal'], ['莱达尔', 'Laerdal'], ['松达尔', 'Sogndal'],
  ['奥达', 'Odda'], ['洛夫特胡斯', 'Lofthus'], ['艾德菲尤尔', 'Eidfjord'],
  ['克里斯蒂安桑', 'Kristiansand'], ['海于格松', 'Haugesund'], ['阿尔塔', 'Alta'],
  ['希尔科内斯', 'Kirkenes'], ['博德', 'Bodø'], ['高尔', 'Gol'],
  ['赫姆瑟达尔', 'Hemsedal'],
  ['罗斯基勒', 'Roskilde'], ['奥尔堡', 'Aalborg'], ['埃斯比约', 'Esbjerg'],
  ['里伯', 'Ribe'], ['斯坎讷堡', 'Skanderborg'],
  ['凯夫拉维克', 'Keflavík'], ['赫本镇', 'Höfn'], ['教堂镇', 'Kirkjubæjarklaustur'],
  ['塞尔福斯', 'Selfoss'], ['霍尔斯沃德吕尔', 'Hvolsvöllur'], ['阿尔纳斯塔皮', 'Arnarstapi'],
  ['海德纳尔', 'Hellnar'], ['阿克雷里', 'Akureyri'], ['埃伊尔斯塔济', 'Egilsstaðir'],
  ['伊萨菲厄泽', 'Ísafjörður'],
  // 爱尔兰
  ['都柏林', 'Dublin'],
  // 希腊
  ['雅典', 'Athens'], ['圣托里尼', 'Santorini'], ['米科诺斯', 'Mykonos'], ['塞萨洛尼基', 'Thessaloniki'],
  // 土耳其
  ['伊斯坦布尔', 'Istanbul'], ['格雷梅', 'Goreme'],
  // 克罗地亚 / 斯洛文尼亚 / 斯洛伐克
  ['杜布罗夫尼克', 'Dubrovnik'], ['斯普利特', 'Split'], ['萨格勒布', 'Zagreb'],
  ['卢布尔雅那', 'Ljubljana'], ['布莱德', 'Bled'], ['布拉迪斯拉发', 'Bratislava'],
  // 波罗的海 / 冰岛 / 摩纳哥
  ['塔林', 'Tallinn'], ['里加', 'Riga'], ['维尔纽斯', 'Vilnius'],
  ['雷克雅未克', 'Reykjavik'], ['摩纳哥', 'Monaco'],
]
