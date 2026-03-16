import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

import Used from './pages/Used';
import UsedDetail from './pages/UsedDetail';
import UsedRegister from './pages/UsedRegister';
import Rental from './pages/Rental';
import RentalDetail from './pages/RentalDetail';
import RentalRegister from './pages/RentalRegister';
import Lesson from './pages/Lesson';
import LessonDetail from './pages/LessonDetail';
import LessonRegister from './pages/LessonRegister';
import Accommodation from './pages/Accommodation';
import AccommodationDetail from './pages/AccommodationDetail';
import AccommodationRegister from './pages/AccommodationRegister';
import Chat from './pages/Chat';
import Community from './pages/Community';
import CommunityWrite from './pages/CommunityWrite';
import CommunityDetail from './pages/CommunityDetail';
import MyPage from './pages/MyPage';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import AdminApproval from './pages/AdminApproval';
import MySales from './pages/MySales';
import MyPurchases from './pages/MyPurchases';
import MyWishlist from './pages/MyWishlist';
import MyChatList from './pages/MyChatList';
import MyPosts from './pages/MyPosts';
import NotificationSettings from './pages/NotificationSettings';
import ChangePassword from './pages/ChangePassword';
import Terms from './pages/Terms';
import Support from './pages/Support';
import NewEquipment from './pages/NewEquipment';
import PollCreate from './pages/PollCreate';
import PollDetail from './pages/PollDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="used" element={<Used />} />
          <Route path="used/register" element={<UsedRegister />} />
          <Route path="used/:id" element={<UsedDetail />} />
          <Route path="chat/:productId" element={<Chat />} />
          <Route path="rental" element={<Rental />} />
          <Route path="rental/register" element={<RentalRegister />} />
          <Route path="rental/:id" element={<RentalDetail />} />
          <Route path="lesson" element={<Lesson />} />
          <Route path="lesson/register" element={<LessonRegister />} />
          <Route path="lesson/:id" element={<LessonDetail />} />
          <Route path="accommodation" element={<Accommodation />} />
          <Route path="accommodation/register" element={<AccommodationRegister />} />
          <Route path="accommodation/:id" element={<AccommodationDetail />} />
          <Route path="community" element={<Community />} />
          <Route path="community/write" element={<CommunityWrite />} />
          <Route path="community/:id" element={<CommunityDetail />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="seller/:sellerId" element={<SellerProfile />} />
          <Route path="login" element={<Login />} />
          <Route path="admin-approval" element={<AdminApproval />} />
          <Route path="mypage/sales" element={<MySales />} />
          <Route path="mypage/purchases" element={<MyPurchases />} />
          <Route path="mypage/wishlist" element={<MyWishlist />} />
          <Route path="mypage/chats" element={<MyChatList />} />
          <Route path="mypage/posts" element={<MyPosts />} />
          <Route path="mypage/notifications" element={<NotificationSettings />} />
          <Route path="mypage/password" element={<ChangePassword />} />
          <Route path="mypage/terms" element={<Terms />} />
          <Route path="mypage/support" element={<Support />} />
          <Route path="new-equipment" element={<NewEquipment />} />
          <Route path="poll/create" element={<PollCreate />} />
          <Route path="poll/:id" element={<PollDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
