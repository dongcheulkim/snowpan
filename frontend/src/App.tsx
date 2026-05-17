import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';

// 즉시 로딩 — 랜딩 + 가장 빈번한 첫 클릭만. Login/MyPage/Search/Community 는
// lazy 로 빼서 초기 번들 크기 감소 (LCP / FCP 개선).
import Home from './pages/Home';
import Used from './pages/Used';
import UsedDetail from './pages/UsedDetail';
const Login = lazy(() => import('./pages/Login'));
const MyPage = lazy(() => import('./pages/MyPage'));
const Search = lazy(() => import('./pages/Search'));
const Community = lazy(() => import('./pages/Community'));

// lazy 로딩 — Suspense fallback 보임.
const Rental = lazy(() => import('./pages/Rental'));
const RentalDetail = lazy(() => import('./pages/RentalDetail'));
const Lesson = lazy(() => import('./pages/Lesson'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const Accommodation = lazy(() => import('./pages/Accommodation'));
const AccommodationDetail = lazy(() => import('./pages/AccommodationDetail'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const CommunitySelect = lazy(() => import('./pages/CommunitySelect'));
const Chat = lazy(() => import('./pages/Chat'));
const MyChatList = lazy(() => import('./pages/MyChatList'));
const Notifications = lazy(() => import('./pages/Notifications'));
const GearGuide = lazy(() => import('./pages/GearGuide'));
const SafeTradeGuide = lazy(() => import('./pages/SafeTradeGuide'));
const About = lazy(() => import('./pages/About'));
const Help = lazy(() => import('./pages/Help'));
const PanHub = lazy(() => import('./pages/PanHub'));
const VerticalLanding = lazy(() => import('./pages/VerticalLanding'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Competitions = lazy(() => import('./pages/Competitions'));
const RepairShop = lazy(() => import('./pages/RepairShop'));
const CompetitionDetail = lazy(() => import('./pages/CompetitionDetail'));
const MyAds = lazy(() => import('./pages/MyAds'));
const SkiShopRegister = lazy(() => import('./pages/SkiShopRegister'));
const SkiShopDetail = lazy(() => import('./pages/SkiShopDetail'));
const RepairShopDetail = lazy(() => import('./pages/RepairShopDetail'));
const MyShops = lazy(() => import('./pages/MyShops'));
const RepairShopRegister = lazy(() => import('./pages/RepairShopRegister'));
const UsedRegister = lazy(() => import('./pages/UsedRegister'));
const RentalRegister = lazy(() => import('./pages/RentalRegister'));
const LessonRegister = lazy(() => import('./pages/LessonRegister'));
const AccommodationRegister = lazy(() => import('./pages/AccommodationRegister'));
const CommunityWrite = lazy(() => import('./pages/CommunityWrite'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const Register = lazy(() => import('./pages/Register'));
const AdminApproval = lazy(() => import('./pages/AdminApproval'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const MySales = lazy(() => import('./pages/MySales'));
const UsedEdit = lazy(() => import('./pages/UsedEdit'));
const MyWishlist = lazy(() => import('./pages/MyWishlist'));
const MyPosts = lazy(() => import('./pages/MyPosts'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Support = lazy(() => import('./pages/Support'));
const NewEquipment = lazy(() => import('./pages/NewEquipment'));
const PollCreate = lazy(() => import('./pages/PollCreate'));
const PollDetail = lazy(() => import('./pages/PollDetail'));
const Webcam = lazy(() => import('./pages/Webcam'));
const WebcamDetail = lazy(() => import('./pages/WebcamDetail'));
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdBooking = lazy(() => import('./pages/AdBooking'));

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-sky-500">판</span>
          </div>
          <span className="text-sm text-gray-500 animate-pulse">로딩 중...</span>
        </div>
      }>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* 루트 / = PAN 우산 허브 (모든 vertical 선택). SNOWPAN 홈은 /snowpan 으로 이동. */}
            <Route index element={<PanHub />} />
            <Route path="snowpan" element={<Home />} />
            <Route path="used" element={<Used />} />
            <Route path="used/register" element={<RequireAuth><UsedRegister /></RequireAuth>} />
            <Route path="used/:id" element={<UsedDetail />} />
            <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="chat" element={<Navigate to="/chat/rooms" replace />} />
            <Route path="chat/rooms" element={<RequireAuth><MyChatList /></RequireAuth>} />
            <Route path="chat/:chatId" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="rental" element={<Rental />} />
            <Route path="rental/register" element={<RequireAuth><RentalRegister /></RequireAuth>} />
            <Route path="rental/:id" element={<RentalDetail />} />
            <Route path="lesson" element={<Lesson />} />
            <Route path="lesson/register" element={<RequireAuth><LessonRegister /></RequireAuth>} />
            <Route path="lesson/:id" element={<LessonDetail />} />
            <Route path="accommodation" element={<Accommodation />} />
            <Route path="accommodation/register" element={<RequireAuth><AccommodationRegister /></RequireAuth>} />
            <Route path="accommodation/:id" element={<AccommodationDetail />} />
            <Route path="gear-guide" element={<GearGuide />} />
            <Route path="search" element={<Search />} />
            <Route path="safe-trade" element={<SafeTradeGuide />} />
            <Route path="about" element={<About />} />
            <Route path="help" element={<Help />} />
            <Route path="pan" element={<Navigate to="/" replace />} />
            {/* 미출시 버티컬 — 홈 + 매핑된 카테고리는 기존 SNOWPAN 컴포넌트 재사용,
                매핑 없는 카테고리는 VerticalLanding fallback.
                컴포넌트는 URL 의 vertical 을 감지해 빈 데이터 응답 받음. */}
            {(['bike', 'run', 'surf', 'golf', 'camp'] as const).map((v) => (
              <Route key={v} path={v}>
                <Route index element={<VerticalLanding />} />
                <Route path="used" element={<Used />} />
                <Route path="used/:id" element={<UsedDetail />} />
                <Route path="community" element={<Community />} />
                <Route path="community/post/:id" element={<CommunityDetail />} />
                <Route path="rental" element={<Rental />} />
                <Route path="rental/:id" element={<RentalDetail />} />
                <Route path="lesson" element={<Lesson />} />
                <Route path="lesson/:id" element={<LessonDetail />} />
                <Route path="coach" element={<Lesson />} />
                <Route path="round" element={<Lesson />} />
                <Route path="accommodation" element={<Accommodation />} />
                <Route path="accommodation/:id" element={<AccommodationDetail />} />
                <Route path="campground" element={<Accommodation />} />
                <Route path="shop" element={<NewEquipment />} />
                <Route path="shop/:id" element={<SkiShopDetail />} />
                <Route path="repair" element={<RepairShop />} />
                <Route path="repair/:id" element={<RepairShopDetail />} />
                <Route path="webcam" element={<Webcam />} />
                <Route path="lineup" element={<Webcam />} />
                <Route path="event" element={<Competitions />} />
                <Route path="event/:id" element={<CompetitionDetail />} />
                <Route path="gear-guide" element={<GearGuide />} />
                {/* 매핑되지 않은 슬러그는 VerticalLanding 의 카테고리 placeholder */}
                <Route path=":cat" element={<VerticalLanding />} />
              </Route>
            ))}
            <Route path="privacy" element={<Privacy />} />
            <Route path="skishop" element={<NewEquipment />} />
            <Route path="skishop/register" element={<RequireAuth><SkiShopRegister /></RequireAuth>} />
            <Route path="skishop/:id" element={<SkiShopDetail />} />
            <Route path="repair" element={<RepairShop />} />
            <Route path="repair/register" element={<RequireAuth><RepairShopRegister /></RequireAuth>} />
            <Route path="repair/:id" element={<RepairShopDetail />} />
            <Route path="competitions" element={<Competitions />} />
            <Route path="competitions/:id" element={<CompetitionDetail />} />
            <Route path="community" element={<CommunitySelect />} />
            <Route path="community/post/:id" element={<CommunityDetail />} />
            <Route path="community/:sport/write" element={<RequireAuth><CommunityWrite /></RequireAuth>} />
            <Route path="community/:sport" element={<Community />} />
            <Route path="mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
            <Route path="seller/:sellerId" element={<SellerProfile />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="signup" element={<Navigate to="/register" replace />} />
            <Route path="admin-approval" element={<RequireAdmin><AdminApproval /></RequireAdmin>} />
            <Route path="mypage/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
            <Route path="mypage/sales" element={<RequireAuth><MySales /></RequireAuth>} />
            <Route path="used/:id/edit" element={<RequireAuth><UsedEdit /></RequireAuth>} />
            <Route path="mypage/wishlist" element={<RequireAuth><MyWishlist /></RequireAuth>} />
            <Route path="mypage/recent" element={<RequireAuth><RecentlyViewed /></RequireAuth>} />
            <Route path="mypage/chats" element={<RequireAuth><MyChatList /></RequireAuth>} />
            <Route path="mypage/posts" element={<RequireAuth><MyPosts /></RequireAuth>} />
            <Route path="mypage/shops" element={<RequireAuth><MyShops /></RequireAuth>} />
            <Route path="mypage/ads" element={<RequireAuth><MyAds /></RequireAuth>} />
            <Route path="mypage/notifications" element={<RequireAuth><NotificationSettings /></RequireAuth>} />
            <Route path="mypage/password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
            <Route path="mypage/terms" element={<RequireAuth><Terms /></RequireAuth>} />
            <Route path="terms" element={<Terms />} />
            <Route path="mypage/support" element={<RequireAuth><Support /></RequireAuth>} />
            <Route path="new-equipment" element={<NewEquipment />} />
            <Route path="poll/create" element={<RequireAuth><PollCreate /></RequireAuth>} />
            <Route path="poll/:id" element={<PollDetail />} />
            <Route path="webcam" element={<Webcam />} />
            <Route path="webcam/:id" element={<WebcamDetail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="ad-booking" element={<RequireAuth><AdBooking /></RequireAuth>} />
            <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="marketplace" element={<Navigate to="/used" replace />} />
            <Route path="marketplace/*" element={<Navigate to="/used" replace />} />
            <Route path="lodging" element={<Navigate to="/accommodation" replace />} />
            <Route path="lodging/*" element={<Navigate to="/accommodation" replace />} />
            <Route path="my" element={<Navigate to="/mypage" replace />} />
            <Route path="mypage/my-products" element={<Navigate to="/mypage/sales" replace />} />
            <Route path="mypage/products" element={<Navigate to="/mypage/sales" replace />} />
            <Route path="ski-shops" element={<Navigate to="/skishop" replace />} />
            <Route path="ski-shop" element={<Navigate to="/skishop" replace />} />
            <Route path="repair-shops" element={<Navigate to="/repair" replace />} />
            <Route path="repair-shop" element={<Navigate to="/repair" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
