import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, User } from 'lucide-react';
import { supabase } from '../lib/supabase'; // 경로 확인 필요

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // PC버전 드롭다운 상태
  const [user, setUser] = useState(null);
  const location = useLocation();
  const role = user?.role || 'general';
  const isAdmin = role === 'admin';
  const canApply = role === 'general';
  const canReserve = role === 'member' || role === 'admin';

  // 스크롤 감지 (배경 투명 -> 블러 처리)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);

    // Auth 상태 확인
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    // Auth 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert('로그아웃 되었습니다.');
  };

  // 메뉴 구조 정의 (사이트맵 기반)
  const navItems = [
    {
      label: 'About',
      path: '/about',
      children: [
        { label: '동아리 소개', path: '/about' },
        { label: '연혁', path: '/history' },
        { label: '조직도', path: '/exec' },
        { label: '동아리방', path: '/location' },
      ]
    },
    canReserve && {
      label: 'Reserve',
      path: '/reserve',
      children: []
    },
    {
      label: 'Community',
      path: '/board',
      children: [
        { label: '커뮤니티', path: '/board' },
        { label: '활동 스터디', path: '/study-groups' },
      ]
    },
    {
      label: 'Resources',
      path: '/rules',
      children: [
        { label: '회칙', path: '/rules' },
        { label: '스터디 자료', path: '/study' },
      ]
    },
    canApply && {
      label: 'Join',
      path: '/join',
      children: []
    },
    isAdmin && {
      label: 'Admin',
      path: '/admin',
      children: [
        { label: '관리자 홈', path: '/admin' },
        { label: '회원 관리', path: '/admin/users' },
      ]
    },
  ].filter(Boolean);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-primary shadow-md py-3' : 'bg-primary/90 backdrop-blur-md py-5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">

        {/* 로고 */}
        <Link to="/" className="text-2xl font-bold tracking-tighter flex items-center gap-2 z-50 relative">
          <span className="bg-white text-primary-dark w-8 h-8 flex items-center justify-center rounded-lg text-lg shadow-sm">H</span>
          <span className="text-white">HUHS</span>
        </Link>

        {/* 데스크탑 네비게이션 */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={() => setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.path}
                className="text-sm font-medium text-white hover:text-white transition-colors flex items-center gap-1"
              >
                {item.label}
                {item.children.length > 0 && <ChevronDown className="w-3 h-3 opacity-50" />}
              </Link>

              {/* 드롭다운 메뉴 (Mega Menu 스타일) */}
              {item.children.length > 0 && (
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-200 ${activeDropdown === item.label ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                    }`}
                >
                  <div className="bg-white rounded-xl shadow-xl border border-gray-border p-2 min-w-40 overflow-hidden">
                    {item.children.map((sub) => (
                      <Link
                        key={sub.label}
                        to={sub.path}
                        className="block px-4 py-2.5 text-sm text-gray-dark hover:bg-primary-light hover:text-white rounded-lg transition-colors text-center font-medium"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 우측 유저 메뉴 / 모바일 버튼 */}
        <div className="flex items-center gap-4">
          {/* 로그인 상태 표시 (데스크탑) */}
          <div className="hidden md:block">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="text-xs text-white/90 font-medium hover:underline">
                  {(user.name || user.email?.split('@')[0])}님
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold bg-white text-primary-dark hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold bg-gray-light text-primary-dark px-4 py-2 rounded-full hover:bg-gray-200 transition-all shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <button
            className="md:hidden z-50 p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="text-black" /> : <Menu />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      <div
        className={`fixed inset-0 bg-bg-subtle z-40 pt-24 px-6 transition-transform duration-300 md:hidden overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col space-y-6">
          {navItems.map((item) => (
            <div key={item.label} className="border-b border-gray-border pb-4">
              <Link
                to={item.path}
                className="text-2xl font-bold text-black block mb-3"
              >
                {item.label}
              </Link>

              {/* 모바일 서브 메뉴 */}
              {item.children.length > 0 && (
                <div className="flex flex-col space-y-2 pl-2">
                  {item.children.map((sub) => (
                    <Link
                      key={sub.label}
                      to={sub.path}
                      className="text-gray-dark font-medium hover:text-primary py-1 transition-colors"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* 모바일 로그인/로그아웃 */}
          <div className="pt-4 pb-8">
            {user ? (
              <div className="space-y-3">
                <Link
                  to="/profile"
                  className="block w-full text-center py-3 bg-primary text-white rounded-xl font-bold shadow-md"
                >
                  내 정보 수정
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-3 bg-white border border-gray-border rounded-xl font-bold text-primary shadow-sm"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block w-full text-center py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary-dark transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
