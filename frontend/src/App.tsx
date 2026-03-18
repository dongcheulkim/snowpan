import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
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
import CommunitySelect from './pages/CommunitySelect';
import Community from './pages/Community';
import CommunityWrite from './pages/CommunityWrite';
import CommunityDetail from './pages/CommunityDetail';
import MyPage from './pages/MyPage';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminApproval from './pages/AdminApproval';
import EditProfile from './pages/EditProfile';
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
import Notifications from './pages/Notifications';
import Webcam from './pages/Webcam';
import WebcamDetail from './pages/WebcamDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="used" element={<Used />} />
          <Route path="used/register" element={<RequireAuth><UsedRegister /></RequireAuth>} />
          <Route path="used/:id" element={<UsedDetail />} />
          <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="chat/rooms" element={<RequireAuth><MyChatList /></RequireAuth>} />
          <Route path="chat/:productId" element={<RequireAuth><Chat /></RequireAuth>} />
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
          <Route path="webcam" element={<Webcam />} />
          <Route path="webcam/:id" element={<WebcamDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
