import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';

// 핵심 페이지: 즉시 로딩 (딜레이 없음)
import Home from './pages/Home';
import Used from './pages/Used';
import UsedDetail from './pages/UsedDetail';
import Rental from './pages/Rental';
import RentalDetail from './pages/RentalDetail';
import Lesson from './pages/Lesson';
import LessonDetail from './pages/LessonDetail';
import Accommodation from './pages/Accommodation';
import AccommodationDetail from './pages/AccommodationDetail';
import Community from './pages/Community';
import CommunityDetail from './pages/CommunityDetail';
import CommunitySelect from './pages/CommunitySelect';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import Chat from './pages/Chat';
import MyChatList from './pages/MyChatList';
import Notifications from './pages/Notifications';
import GearGuide from './pages/GearGuide';
import Competitions from './pages/Competitions';
import CompetitionDetail from './pages/CompetitionDetail';
import SkiShop from './pages/SkiShop';

// 나머지: lazy 로딩
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
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
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
          <span className="text-sm text-gray-400 animate-pulse">로딩 중...</span>
        </div>
      }>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="used" element={<Used />} />
            <Route path="used/register" element={<RequireAuth><UsedRegister /></RequireAuth>} />
            <Route path="used/:id" element={<UsedDetail />} />
            <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
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
            <Route path="skishop" element={<SkiShop />} />
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
            <Route path="admin-approval" element={<RequireAuth><AdminApproval /></RequireAuth>} />
            <Route path="mypage/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
            <Route path="mypage/sales" element={<RequireAuth><MySales /></RequireAuth>} />
            <Route path="used/:id/edit" element={<RequireAuth><UsedEdit /></RequireAuth>} />
            <Route path="mypage/purchases" element={<RequireAuth><MyPurchases /></RequireAuth>} />
            <Route path="mypage/wishlist" element={<RequireAuth><MyWishlist /></RequireAuth>} />
            <Route path="mypage/recent" element={<RequireAuth><RecentlyViewed /></RequireAuth>} />
            <Route path="mypage/chats" element={<RequireAuth><MyChatList /></RequireAuth>} />
            <Route path="mypage/posts" element={<RequireAuth><MyPosts /></RequireAuth>} />
            <Route path="mypage/notifications" element={<RequireAuth><NotificationSettings /></RequireAuth>} />
            <Route path="mypage/password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
            <Route path="mypage/terms" element={<RequireAuth><Terms /></RequireAuth>} />
            <Route path="mypage/support" element={<RequireAuth><Support /></RequireAuth>} />
            <Route path="new-equipment" element={<RequireAuth><NewEquipment /></RequireAuth>} />
            <Route path="poll/create" element={<RequireAuth><PollCreate /></RequireAuth>} />
            <Route path="poll/:id" element={<PollDetail />} />
            <Route path="webcam" element={<Webcam />} />
            <Route path="webcam/:id" element={<WebcamDetail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="ad-booking" element={<RequireAuth><AdBooking /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
