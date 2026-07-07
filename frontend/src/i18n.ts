// 다국어 지원 제거 — 한국어만. 페이지들이 이미 t() 호출 중이라
// 함수는 유지하되 항상 ko 반환. 언어 전환 UI 는 없음.
type Lang = 'ko';

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
    'used.cat.all': '전체',
    'used.cat.ski': '스키',
    'used.cat.board': '보드',
    'used.cat.boots': '부츠',
    'used.cat.ski_boots': '스키부츠',
    'used.cat.board_boots': '보드부츠',
    'used.cat.binding': '바인딩',
    'used.cat.wear': '스키복',
    'used.cat.pole': '폴',
    'used.cat.helmet': '헬멧',
    'used.cat.goggles': '고글',
    'used.cat.gloves': '장갑',
    'used.cat.bag': '가방',
    'used.cat.accessory': '악세사리',
    'used.cat.etc': '기타',
    'used.status.selling': '판매중',
    'used.status.reserved': '예약중',
    'used.status.sold': '판매완료',

    // UsedDetail
    'usedDetail.productInfo': '상품 정보',
    'usedDetail.condition': '상태',
    'usedDetail.year': '연식',
    'usedDetail.description': '상품 설명',
    'usedDetail.viewProfile': '프로필 보기',
    'usedDetail.startChat': '채팅하기',
    'usedDetail.delete': '삭제',
    'usedDetail.soldItem': '판매 완료된 상품입니다',
    'usedDetail.share': '공유하기',
    'usedDetail.report': '신고하기',
    'usedDetail.notFound': '상품을 찾을 수 없습니다',
    'usedDetail.backToList': '목록으로 돌아가기',
    'usedDetail.backToUsed': '중고 장비 목록',
    'usedDetail.noImage': '이미지를 불러올 수 없습니다',

    // MyPage
    'mypage.settings': '설정',
    'mypage.language': '언어 설정',
    'mypage.darkMode': '다크 모드',
    'mypage.editProfile': '프로필 수정',
    'mypage.mySales': '판매 물품',
    'mypage.wishlist': '찜 목록',
    'mypage.recentlyViewed': '최근 본 상품',
    'mypage.chatList': '채팅 목록',
    'mypage.notifications': '알림',
    'mypage.terms': '이용약관',
    'mypage.support': '고객센터',
    'mypage.logout': '로그아웃',
    'mypage.certBadge': '자격증 뱃지',
    'mypage.verify': '인증하기',
    'mypage.joinDate': '가입일',
    'mypage.badges': '뱃지',
    'mypage.langLabel': '언어 / Language',
    'mypage.noBadges': '아직 인증된 뱃지가 없습니다. 자격증을 인증해보세요!',
    'mypage.verified': '인증 완료',
    'mypage.pendingApproval': '승인 대기 중',
    'mypage.certVerification': '자격증 인증',
    'mypage.selectCert': '인증할 자격증을 선택하세요',
    'mypage.allBadgesApplied': '모든 뱃지를 이미 신청했습니다!',
    'mypage.uploadCertPhoto': '자격증 사진을 업로드해주세요',
    'mypage.selectPhoto': '사진 선택',
    'mypage.requesting': '요청 중...',
    'mypage.verifyRequest': '인증 요청',
    'mypage.adminApproval': '관리자 승인 관리',
    'mypage.adminDashboard': '관리자 대시보드',

    // Community
    'community.title': '커뮤니티',
    'community.free': '자유',
    'community.review': '장비리뷰',
    'community.resort': '스키장',
    'community.tip': '초보팁',
    'community.carpool': '카풀',
    'community.meetup': '모임',
    'community.write': '글쓰기',
    'community.searchPlaceholder': '제목이나 내용으로 검색',
    'community.noResults': '검색 결과가 없습니다.',
    'community.noPosts': '아직 게시글이 없습니다. 첫 글을 작성해보세요!',
    'community.all': '전체',

    // CommunityDetail
    'communityDetail.comments': '댓글',
    'communityDetail.commentPlaceholder': '댓글을 입력하세요...',
    'communityDetail.submit': '등록',
    'communityDetail.loginToComment': '로그인 후 댓글을 작성할 수 있습니다',
    'communityDetail.notFound': '게시글을 찾을 수 없습니다',
    'communityDetail.backToCommunity': '커뮤니티로 돌아가기',
    'communityDetail.back': '커뮤니티',
    'communityDetail.reportPost': '게시글 신고',
    'communityDetail.selectReason': '신고 사유를 선택해주세요',
    'communityDetail.processing': '처리 중...',

    // Chat
    'chat.inputPlaceholder': '메시지를 입력하세요...',
    'chat.send': '전송',
    'chat.online': '온라인',
    'chat.connecting': '연결 중...',
    'chat.priceOffer': '가격 제안',
    'chat.viewProduct': '상품보기',
    'chat.loginRequired': '로그인이 필요합니다.',
    'chat.loginLink': '로그인하기',
    'chat.safetyNotice': '거래는 당사자 간 직접 진행됩니다. 안전거래를 이용해주세요.',
    'chat.enterPrice': '제안할 가격을 입력하세요',
    'chat.offer': '제안하기',
    'chat.sentPhoto': '사진을 보냈습니다.',
    'chat.sentVideo': '동영상을 보냈습니다.',

    // Login
    'login.title': '로그인',
    'login.welcome': '스노우판에 오신 것을 환영합니다',
    'login.email': '이메일',
    'login.emailPlaceholder': '이메일을 입력하세요',
    'login.password': '비밀번호',
    'login.passwordPlaceholder': '비밀번호를 입력하세요',
    'login.saveEmail': '아이디 저장',
    'login.autoLogin': '자동 로그인',
    'login.loggingIn': '로그인 중...',
    'login.submit': '로그인',
    'login.socialLogin': '간편 로그인',
    'login.kakao': '카카오 로그인',
    'login.naver': '네이버 로그인',
    'login.forgotPassword': '비밀번호를 잊으셨나요?',
    'login.register': '회원가입',
    'login.noAccount': '계정이 없으신가요? 회원가입',

    // Notifications
    'notifications.title': '알림',
    'notifications.markAllRead': '모두 읽음',
    'notifications.deleteAll': '전체 삭제',
    'notifications.confirmDeleteAll': '모든 알림을 삭제하시겠습니까?',
    'notifications.empty': '아직 알림이 없습니다.',
    'notifications.loginRequired': '로그인이 필요합니다.',

    // MySales
    'mySales.title': '판매 물품',
    'mySales.bump': '끌어올리기',
    'mySales.edit': '수정',
    'mySales.delete': '삭제',
    'mySales.toSelling': '판매중으로',
    'mySales.toReserved': '예약중으로',
    'mySales.toSold': '판매완료로',
    'mySales.loading': '불러오는 중...',
    'mySales.empty': '등록한 판매 물품이 없습니다.',
    'mySales.bumpSuccess': '끌어올리기 완료! 목록 상단에 노출됩니다.',

    // MyChatList
    'myChatList.title': '채팅',
    'myChatList.empty': '채팅 내역이 없습니다.',
    'myChatList.startChat': '대화를 시작해보세요',

    // SellerProfile
    'sellerProfile.sales': '판매 물품',
    'sellerProfile.joinDate': '가입일',
    'sellerProfile.avgRating': '평균 별점',
    'sellerProfile.reviews': '거래 후기',
    'sellerProfile.writeReview': '후기 작성',
    'sellerProfile.notFound': '판매자를 찾을 수 없습니다',
    'sellerProfile.back': '뒤로',
    'sellerProfile.backToList': '목록으로 돌아가기',
    'sellerProfile.noReviews': '아직 거래 후기가 없습니다.',
    'sellerProfile.productsForSale': '판매 중인 상품',
    'sellerProfile.noProducts': '등록된 상품이 없습니다.',
    'sellerProfile.rating': '별점',
    'sellerProfile.reviewPlaceholder': '거래 후기를 남겨주세요',
    'sellerProfile.submitting': '등록 중...',

    // MyWishlist
    'myWishlist.title': '찜 목록',
    'myWishlist.loading': '불러오는 중...',
    'myWishlist.empty': '찜한 상품이 없습니다.',

    // RecentlyViewed
    'recentlyViewed.title': '최근 본 상품',
    'recentlyViewed.deleteAll': '전체 삭제',
    'recentlyViewed.empty': '최근 본 상품이 없습니다.',

    // General
    'general.loading': '로딩 중...',
    'general.back': '뒤로',
    'general.backToList': '목록으로 돌아가기',
  },
};

// 옛 lang localStorage 정리 (사용자가 en 상태로 남아 있어도 무해).
try { if (localStorage.getItem('lang') !== 'ko') localStorage.removeItem('lang'); } catch { /* noop */ }

export function t(key: string): string {
  return translations['ko'][key] || key;
}

export function getLang(): Lang {
  return 'ko';
}

// setLang / onLangChange 는 한국어 고정이라 no-op 이지만 기존 호출부(MyPage,
// Home, Community 등) 호환 위해 시그니처 유지.
export function setLang(_lang: Lang): void {
  /* noop — 한국어만 지원 */
}

export function onLangChange(_cb: () => void): () => void {
  return () => { /* noop */ };
}
