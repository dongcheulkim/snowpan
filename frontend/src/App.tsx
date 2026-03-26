import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';

const Home = lazy(() => import('./pages/Home'));
const Used = lazy(() => import('./pages/Used'));
const UsedDetail = lazy(() => import('./pages/UsedDetail'));
const UsedRegister = lazy(() => import('./pages/UsedRegister'));
const Rental = lazy(() => import('./pages/Rental'));
const RentalDetail = lazy(() => import('./pages/RentalDetail'));
const RentalRegister = lazy(() => import('./pages/RentalRegister'));
const Lesson = lazy(() => import('./pages/Lesson'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const LessonRegister = lazy(() => import('./pages/LessonRegister'));
const Accommodation = lazy(() => import('./pages/Accommodation'));
const AccommodationDetail = lazy(() => import('./pages/AccommodationDetail'));
const AccommodationRegister = lazy(() => import('./pages/AccommodationRegister'));
const Chat = lazy(() => import('./pages/Chat'));
const CommunitySelect = lazy(() => import('./pages/CommunitySelect'));
const Community = lazy(() => import('./pages/Community'));
const CommunityWrite = lazy(() => import('./pages/CommunityWrite'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const MyPage = lazy(() => import('./pages/MyPage'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminApproval = lazy(() => import('./pages/AdminApproval'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const MySales = lazy(() => import('./pages/MySales'));
const UsedEdit = lazy(() => import('./pages/UsedEdit'));
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
const MyWishlist = lazy(() => import('./pages/MyWishlist'));
const MyChatList = lazy(() => import('./pages/MyChatList'));
const MyPosts = lazy(() => import('./pages/MyPosts'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Support = lazy(() => import('./pages/Support'));
const NewEquipment = lazy(() => import('./pages/NewEquipment'));
const PollCreate = lazy(() => import('./pages/PollCreate'));
const PollDetail = lazy(() => import('./pages/PollDetail'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Webcam = lazy(() => import('./pages/Webcam'));
const WebcamDetail = lazy(() => import('./pages/WebcamDetail'));
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdBooking = lazy(() => import('./pages/AdBooking'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
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
            <Route path="ad-booking" element={<AdBooking />} />
            <Route path="admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
