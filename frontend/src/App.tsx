import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import NewEquipment from './pages/NewEquipment';
import Used from './pages/Used';
import Rental from './pages/Rental';
import Lesson from './pages/Lesson';
import Login from './pages/Login';
import AdminApproval from './pages/AdminApproval';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="new-equipment" element={<NewEquipment />} />
          <Route path="used" element={<Used />} />
          <Route path="rental" element={<Rental />} />
          <Route path="lesson" element={<Lesson />} />
          <Route path="login" element={<Login />} />
          <Route path="admin-approval" element={<AdminApproval />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
