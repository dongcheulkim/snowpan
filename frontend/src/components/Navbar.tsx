import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">⛷️</span>
              <span className="text-2xl font-bold text-primary">스노우프라이스</span>
            </Link>
          </div>

          <div className="flex items-center space-x-8">
            <Link
              to="/new-equipment"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              새 장비
            </Link>
            <Link
              to="/used"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              중고
            </Link>
            <Link
              to="/rental"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              렌탈
            </Link>
            <Link
              to="/lesson"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              레슨
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
