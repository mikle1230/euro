// 国家封面图静态导入表：配合 next/image 做自动优化（WebP/AVIF + 响应式 srcset）。
// 动态路径 `/images/countries/xxx.jpg` 无法被 next/image 优化，故改为静态 import。
import austria from '../../public/images/countries/austria.jpg'
import belgium from '../../public/images/countries/belgium.jpg'
import bulgaria from '../../public/images/countries/bulgaria.jpg'
import croatia from '../../public/images/countries/croatia.jpg'
import cyprus from '../../public/images/countries/cyprus.jpg'
import czechRepublic from '../../public/images/countries/czech-republic.jpg'
import denmark from '../../public/images/countries/denmark.jpg'
import estonia from '../../public/images/countries/estonia.jpg'
import finland from '../../public/images/countries/finland.jpg'
import france from '../../public/images/countries/france.jpg'
import germany from '../../public/images/countries/germany.jpg'
import greece from '../../public/images/countries/greece.jpg'
import hungary from '../../public/images/countries/hungary.jpg'
import iceland from '../../public/images/countries/iceland.jpg'
import ireland from '../../public/images/countries/ireland.jpg'
import italy from '../../public/images/countries/italy.jpg'
import latvia from '../../public/images/countries/latvia.jpg'
import lithuania from '../../public/images/countries/lithuania.jpg'
import luxembourg from '../../public/images/countries/luxembourg.jpg'
import malta from '../../public/images/countries/malta.jpg'
import monaco from '../../public/images/countries/monaco.jpg'
import montenegro from '../../public/images/countries/montenegro.jpg'
import netherlands from '../../public/images/countries/netherlands.jpg'
import norway from '../../public/images/countries/norway.jpg'
import poland from '../../public/images/countries/poland.jpg'
import portugal from '../../public/images/countries/portugal.jpg'
import romania from '../../public/images/countries/romania.jpg'
import russia from '../../public/images/countries/russia.jpg'
import serbia from '../../public/images/countries/serbia.jpg'
import slovakia from '../../public/images/countries/slovakia.jpg'
import slovenia from '../../public/images/countries/slovenia.jpg'
import spain from '../../public/images/countries/spain.jpg'
import sweden from '../../public/images/countries/sweden.jpg'
import switzerland from '../../public/images/countries/switzerland.jpg'
import turkey from '../../public/images/countries/turkey.jpg'
import unitedKingdom from '../../public/images/countries/united-kingdom.jpg'

export const COUNTRY_IMAGES = {
  austria,
  belgium,
  bulgaria,
  croatia,
  cyprus,
  'czech-republic': czechRepublic,
  denmark,
  estonia,
  finland,
  france,
  germany,
  greece,
  hungary,
  iceland,
  ireland,
  italy,
  latvia,
  lithuania,
  luxembourg,
  malta,
  monaco,
  montenegro,
  netherlands,
  norway,
  poland,
  portugal,
  romania,
  russia,
  serbia,
  slovakia,
  slovenia,
  spain,
  sweden,
  switzerland,
  turkey,
  'united-kingdom': unitedKingdom,
}
