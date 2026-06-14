import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronUp, Mail, Send, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api';

const initialApplication = {
    name: '',
    student_id: '',
    major: '',
    phone: '',
    email: '',
    message: '',
};

const Join = () => {
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);
    const [application, setApplication] = useState(initialApplication);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // FAQ 데이터 가져오기
    useEffect(() => {
        const fetchFaqs = async () => {
            const { data, error } = await supabase
                .from('faqs')
                .select('*')
                .order('id', { ascending: true });
            if (!error) setFaqs(data);
        };
        const fetchProfile = async () => {
            try {
                const payload = await apiRequest('/auth/me');
                const user = payload.data.user;
                setProfile(user);
                setApplication((current) => ({
                    ...current,
                    name: user.name || '',
                    student_id: user.student_id || '',
                    major: user.major || '',
                    phone: user.phone || '',
                    email: user.email || '',
                }));
            } catch {
                setProfile(null);
            } finally {
                setProfileLoading(false);
            }
        };
        fetchFaqs();
        fetchProfile();
    }, []);

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const handleApply = async (event) => {
        event.preventDefault();
        if (!profile) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        if (profile.role !== 'general') {
            alert('가입 신청은 일반 유저만 사용할 수 있습니다.');
            return;
        }
        setSubmitting(true);
        try {
            await apiRequest('/recruit/apply', {
                method: 'POST',
                body: JSON.stringify({ message: application.message }),
            });
            alert('지원서 접수가 완료되었습니다.');
            setApplication({
                ...initialApplication,
                name: profile?.name || '',
                student_id: profile?.student_id || '',
                major: profile?.major || '',
                phone: profile?.phone || '',
                email: profile?.email || '',
            });
        } catch (error) {
            if (error.message.includes('로그인') || error.message.includes('프로필')) {
                navigate(error.message.includes('프로필') ? '/profile' : '/login');
            }
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pt-24 pb-20">

            {/* 1. 메인 포스터 / 히어로 섹션 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-24 text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter my-6">
                    HUHS <br />
                    <span className="text-blue-600">Recruiting</span>
                </h1>
                <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
                    열정 있는 개발자와 디자이너를 찾습니다. <br />
                    함께 성장하고 싶다면 지금 바로 지원하세요.
                </p>

                {/* 모집 기간 배너 (강조) */}
                <div className="inline-block bg-black text-white px-6 py-2 rounded-full text-sm font-bold mb-12">
                    📅 2026.03.02 ~ 03.15 자정 마감
                </div>

                {/* 메인 이미지 (포스터) */}
                <div className="relative w-full max-w-4xl mx-auto aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
                    {/* 이미지가 있다면 img 태그 사용, 없다면 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-800 to-black text-white">
                        <span className="text-2xl font-bold opacity-50">Promotion Poster Area</span>
                    </div>
                </div>
            </div>

            {/* 2. 지원하기 버튼 섹션 (CTA) */}
            <div className="bg-gray-50 py-20 mb-24">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold mb-6">준비되셨나요?</h2>
                    <p className="text-gray-600 mb-10">
                        아래 지원서를 작성하면 운영진에게 바로 접수됩니다.<br />
                        포트폴리오가 있다면 마지막 문항에 링크를 함께 적어주세요.
                    </p>
                    {profileLoading ? (
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-gray-500 font-bold">
                            로그인 정보를 확인하는 중입니다.
                        </div>
                    ) : !profile ? (
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
                            <p className="text-gray-600 mb-6">한양대학교 계정으로 로그인한 뒤 가입 신청을 할 수 있습니다.</p>
                            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors">
                                로그인하러 가기
                            </button>
                        </div>
                    ) : profile.role !== 'general' ? (
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
                            <p className="text-gray-700 font-bold">이미 HUHS 부원 권한이 있는 계정입니다.</p>
                            <p className="text-gray-500 mt-2">동아리방 예약과 커뮤니티 활동을 이용해주세요.</p>
                        </div>
                    ) : (
                    <form onSubmit={handleApply} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                        <label className="flex flex-col gap-2 font-bold text-gray-700">
                            이름
                            <input required readOnly value={application.name} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" placeholder="홍길동" />
                        </label>
                        <label className="flex flex-col gap-2 font-bold text-gray-700">
                            학번
                            <input required readOnly value={application.student_id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" placeholder="20260000" />
                        </label>
                        <label className="flex flex-col gap-2 font-bold text-gray-700">
                            전공
                            <input required readOnly value={application.major} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" placeholder="컴퓨터공학과" />
                        </label>
                        <label className="flex flex-col gap-2 font-bold text-gray-700">
                            연락처
                            <input required readOnly value={application.phone} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" placeholder="010-0000-0000" />
                        </label>
                        <label className="sm:col-span-2 flex flex-col gap-2 font-bold text-gray-700">
                            이메일
                            <input required readOnly type="email" value={application.email} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" placeholder="huhs@example.com" />
                        </label>
                        <label className="sm:col-span-2 flex flex-col gap-2 font-bold text-gray-700">
                            지원 동기
                            <textarea required value={application.message} onChange={(e) => setApplication({ ...application, message: e.target.value })} className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 font-medium h-36 resize-none" placeholder="HUHS에서 함께 해보고 싶은 활동을 적어주세요." />
                        </label>
                        <div className="sm:col-span-2 flex justify-center">
                            <button disabled={submitting} className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-blue-200 disabled:opacity-50">
                                <Send className="w-5 h-5" />
                                {submitting ? '접수 중...' : '지원서 제출'}
                            </button>
                        </div>
                    </form>
                    )}
                </div>
            </div>

            {/* 3. FAQ 섹션 */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-24">
                <h2 className="text-3xl font-bold mb-10 text-center">자주 묻는 질문</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                                onClick={() => toggleFaq(index)}
                            >
                                <span className="font-bold text-lg text-gray-800">{faq.question}</span>
                                {openIndex === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="p-5 bg-gray-50 text-gray-600 leading-relaxed border-t border-gray-100 whitespace-pre-wrap break-words">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. 문의하기 섹션 */}
            <div className="max-w-7xl mx-auto px-4 pb-10 text-center border-t pt-16">
                <h3 className="text-xl font-bold mb-4">더 궁금한 점이 있으신가요?</h3>
                <a
                    href="/contact"
                    className="inline-flex items-center text-gray-600 hover:text-black hover:underline transition-all"
                >
                    <Mail className="w-5 h-5 mr-2" />
                    문의 남기기
                </a>
            </div>

        </div>
    );
};

export default Join;
