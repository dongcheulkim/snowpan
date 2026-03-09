import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

import Used from './pages/Used';
import UsedDetail from './pages/UsedDetail';
import UsedRegister from './pages/UsedRegister';
import Rental from './pages/Rental';
import RentalDetail from './pages/RentalDetail';
import Lesson from './pages/Lesson';
import LessonDetail from './pages/LessonDetail';
import Accommodation from './pages/Accommodation';
import AccommodationDetail from './pages/AccommodationDetail';
import Chat from './pages/Chat';
import Community from './pages/Community';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import AdminApproval from './pages/AdminApproval';

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
          <Route path="rental/:id" element={<RentalDetail />} />
          <Route path="lesson" element={<Lesson />} />
          <Route path="lesson/:id" element={<LessonDetail />} />
          <Route path="accommodation" element={<Accommodation />} />
          <Route path="accommodation/:id" element={<AccommodationDetail />} />
          <Route path="community" element={<Community />} />
          <Route path="login" element={<Login />} />
          <Route path="admin-approval" element={<AdminApproval />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
