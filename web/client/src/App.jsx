import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase'; // 출입증

// 컴포넌트들 import
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
{/* import Gallery from './pages/Gallery'; */ }
import Contact from './pages/Contact';
import Login from './pages/Login';
import Board from './pages/Board';
import Write from './pages/Write';
import PostDetail from './pages/PostDetail';
import Join from './pages/Join';
import Exec from "./pages/Exec";
import Rules from "./pages/Rules";
import Study from "./pages/Study";
import Location from './pages/Location';
import Reserve from './pages/Reserve';
import History from './pages/History';
import StudyGroups from './pages/StudyGroups';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPosts from './pages/admin/AdminPosts';
import AdminStudyGroups from './pages/admin/AdminStudyGroups';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminUsers from './pages/admin/AdminUsers';
import AdminHistory from './pages/admin/AdminHistory';

import './App.css';

function App() {
  const location = useLocation();
  // 1. 로그인한 사용자 정보를 담을 그릇 (처음엔 null)
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 2. 앱 켜지자마자 "지금 로그인된 사람 있어?" 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 3. 실시간 감시 (로그인/로그아웃 하는 순간을 포착!)
    // onAuthStateChange: 상태가 변할 때마다 실행되는 콜백 함수
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 앱 꺼질 때 감시 해제 (메모리 누수 방지 - C의 free() 같은 개념)
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 4. Header에게 session 정보 넘겨주기! (이제 Header도 로그인 여부를 압니다) */}
      <Header session={session} />

      <main className="grow relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            {/* <Route path="/gallery" element={<Gallery />} /> */}
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/board" element={<Board />} />
            <Route path="/board/write" element={<Write />} />
            <Route path="/board/:id" element={<PostDetail />} />
            <Route path="/join" element={<Join />} />
            <Route path="/Exec" element={<Exec />} />
            <Route path="/Rules" element={<Rules />} />
            <Route path="/Study" element={<Study />} />
            <Route path="/Location" element={<Location />} />
            <Route path="/reserve" element={<Reserve />} />
            <Route path="/history" element={<History />} />
            <Route path="/study-groups" element={<StudyGroups />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/posts" element={<AdminPosts />} />
            <Route path="/admin/study-groups" element={<AdminStudyGroups />} />
            <Route path="/admin/faqs" element={<AdminFaqs />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/history" element={<AdminHistory />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

export default App;
