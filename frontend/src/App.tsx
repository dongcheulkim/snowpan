import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

import Used from './pages/Used';
import UsedDetail from './pages/UsedDetail';
import UsedRegister from './pages/UsedRegister';
import Rental from './pages/Rental';
import Lesson from './pages/Lesson';
import Accommodation from './pages/Accommodation';
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
          <Route path="rental" element={<Rental />} />
          <Route path="lesson" element={<Lesson />} />
          <Route path="accommodation" element={<Accommodation />} />
          <Route path="login" element={<Login />} />
          <Route path="admin-approval" element={<AdminApproval />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
