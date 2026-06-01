import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // 출입증 가져오기
import { useNavigate } from 'react-router-dom'; // 페이지 이동용
import PageTransition from '../components/PageTransition';

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false); // true면 회원가입 모드

    // 로그인 & 회원가입 처리 함수
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);

        let result;
        if (isSignUp) {
            // 1. 회원가입 요청
            result = await supabase.auth.signUp({ email, password });
        } else {
            // 2. 로그인 요청
            result = await supabase.auth.signInWithPassword({ email, password });
        }

        const { data, error } = result;

        if (error) {
            alert("에러 발생: " + error.message);
        } else {
            if (isSignUp) {
                alert("가입 성공! 이제 로그인해주세요.");
                setIsSignUp(false); // 로그인 모드로 전환
            } else {
                alert("로그인 성공! 환영합니다.");
                navigate('/'); // 홈으로 이동
            }
        }
        setLoading(false);
    };

    return (
        <PageTransition>
            <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-lg border border-gray-100 text-center">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">
                    {isSignUp ? '✨ 회원가입' : '🔑 로그인'}
                </h1>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호 (6자리 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className={`p-3 rounded-lg text-white font-bold transition-all ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? '처리 중...' : (isSignUp ? '가입하기' : '로그인')}
                    </button>
                </form>

                {/* 모드 전환 버튼 */}
                <p className="mt-4 text-gray-600 text-sm">
                    {isSignUp ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="ml-2 text-blue-600 font-bold hover:underline"
                    >
                        {isSignUp ? '로그인하러 가기' : '회원가입하기'}
                    </button>
                </p>
            </div>
        </PageTransition>
    );
}

export default Login;
