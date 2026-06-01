import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronUp, Mail, ExternalLink, Sparkles } from 'lucide-react';

const Join = () => {
    const [faqs, setFaqs] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);

    // FAQ 데이터 가져오기
    useEffect(() => {
        const fetchFaqs = async () => {
            const { data, error } = await supabase
                .from('faqs')
                .select('*')
                .order('id', { ascending: true });
            if (!error) setFaqs(data);
        };
        fetchFaqs();
    }, []);

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
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
                        지원은 구글 폼을 통해 진행됩니다.<br />
                        포트폴리오가 있다면 링크를 함께 첨부해주세요.
                    </p>
                    <a
                        href="https://forms.google.com/your-form-url" // 🔗 실제 구글폼 링크로 교체 필요
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-10 py-5 bg-blue-600 text-white text-xl font-bold rounded-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 shadow-xl shadow-blue-200"
                    >
                        지원하러 가기 <ExternalLink className="ml-2 w-5 h-5" />
                    </a>
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
                    href="mailto:contact@nextlevel.com"
                    className="inline-flex items-center text-gray-600 hover:text-black hover:underline transition-all"
                >
                    <Mail className="w-5 h-5 mr-2" />
                    운영진에게 메일 보내기 (contact@nextlevel.com)
                </a>
            </div>

        </div>
    );
};

export default Join;
