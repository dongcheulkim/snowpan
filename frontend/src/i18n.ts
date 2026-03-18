type Lang = 'ko' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  ko: {
    // Navbar
    'nav.title': '스노우판',
    'nav.chat': '채팅',
    'nav.notifications': '알림',
    'nav.mypage': '내정보',
    'nav.login': '로그인',

    // Home categories
    'cat.used': '중고거래',
    'cat.rental': '렌탈',
    'cat.lesson': '레슨',
    'cat.accommodation': '숙소',
    'cat.community': '커뮤니티',
    'cat.webcam': '실시간웹캠',

    // Home sections
    'home.hotDeals': '중고 인기매물',
    'home.community': '커뮤니티',
    'home.youtube': '유튜버의 핫한 영상!',
    'home.more': '더보기 >',
    'home.noProducts': '아직 등록된 매물이 없습니다.',
    'home.noPosts': '아직 게시글이 없습니다.',
    'home.ski': '스키',
    'home.board': '보드',
    'home.prev': '← 이전',
    'home.next': '다음 →',

    // Common buttons
    'btn.register': '등록',
    'btn.cancel': '취소',
    'btn.delete': '삭제',
    'btn.login': '로그인',
    'btn.logout': '로그아웃',
    'btn.save': '저장',
    'btn.edit': '수정',
    'btn.confirm': '확인',
    'btn.submit': '제출',
    'btn.search': '검색',

    // Used page
    'used.title': '중고 장비',
    'used.register': '+ 장비 등록',
    'used.search': '상품명, 브랜드 검색...',
    'used.noItems': '해당 조건의 중고 장비가 없습니다.',
    'used.loading': '로딩 중...',

    // MyPage
    'mypage.settings': '설정',
    'mypage.language': '언어 설정',
    'mypage.darkMode': '다크 모드',
  },
  en: {
    'nav.title': 'SNOWPAN',
    'nav.chat': 'Chat',
    'nav.notifications': 'Notifications',
    'nav.mypage': 'My Page',
    'nav.login': 'Login',

    'cat.used': 'Used Gear',
    'cat.rental': 'Rental',
    'cat.lesson': 'Lessons',
    'cat.accommodation': 'Stay',
    'cat.community': 'Community',
    'cat.webcam': 'Live Webcam',

    'home.hotDeals': 'Hot Used Deals',
    'home.community': 'Community',
    'home.youtube': 'Hot YouTube Videos!',
    'home.more': 'More >',
    'home.noProducts': 'No products listed yet.',
    'home.noPosts': 'No posts yet.',
    'home.ski': 'Ski',
    'home.board': 'Board',
    'home.prev': '← Prev',
    'home.next': 'Next →',

    'btn.register': 'Register',
    'btn.cancel': 'Cancel',
    'btn.delete': 'Delete',
    'btn.login': 'Login',
    'btn.logout': 'Logout',
    'btn.save': 'Save',
    'btn.edit': 'Edit',
    'btn.confirm': 'Confirm',
    'btn.submit': 'Submit',
    'btn.search': 'Search',

    'used.title': 'Used Gear',
    'used.register': '+ List Gear',
    'used.search': 'Search by name, brand...',
    'used.noItems': 'No used gear matching your filters.',
    'used.loading': 'Loading...',

    'mypage.settings': 'Settings',
    'mypage.language': 'Language',
    'mypage.darkMode': 'Dark Mode',
  },
};

let currentLang: Lang = (localStorage.getItem('lang') as Lang) || 'ko';
const listeners: Array<() => void> = [];

export function t(key: string): string {
  return translations[currentLang][key] || translations['ko'][key] || key;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  listeners.forEach((cb) => cb());
}

export function onLangChange(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
