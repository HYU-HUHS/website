import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { Trash2, Edit, Plus, ArrowLeft, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

const AdminFaqs = () => {
    const { isAdmin, loading: authLoading } = useAdmin();
    const navigate = useNavigate();

    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFaq, setCurrentFaq] = useState(null);

    const [form, setForm] = useState({
        question: '',
        answer: ''
    });

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
        } else if (isAdmin) {
            fetchFaqs();
        }
    }, [isAdmin, authLoading, navigate]);

    const fetchFaqs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('faqs')
            .select('*')
            .order('id', { ascending: true });
        if (!error) setFaqs(data);
        setLoading(false);
    };

    // 화면 깜빡임 없이 백그라운드에서 목록만 새로고침하는 함수
    const fetchFaqsSilently = async () => {
        const { data, error } = await supabase
            .from('faqs')
            .select('*')
            .order('id', { ascending: true });
        if (!error) setFaqs(data);
    };

    // 위/아래 순서 변경 핸들러
    const handleMove = async (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === faqs.length - 1)
        ) return;

        const newFaqs = [...faqs];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // 화면 상에서 위치 변경
        const temp = newFaqs[index];
        newFaqs[index] = newFaqs[targetIndex];
        newFaqs[targetIndex] = temp;

        setFaqs(newFaqs); // 즉시 UI 반영

        // DB상 순서 교체 (id 값을 서로 맞바꿈)
        // 주의: 이 방식은 id를 직접 교체하는 야매 방식이므로 간단한 CRUD에만 적합합니다.
        const id1 = faqs[index].id;
        const id2 = faqs[targetIndex].id;

        try {
            await supabase.from('faqs').update({ id: 0 }).eq('id', id1);
            await supabase.from('faqs').update({ id: id1 }).eq('id', id2);
            await supabase.from('faqs').update({ id: id2 }).eq('id', 0);
            fetchFaqsSilently(); // 👈 로딩 바 없이 조용히 동기화
        } catch (error) {
            console.error('순서 변경 실패:', error);
            fetchFaqsSilently(); // 👈 실패 시 원래대로 복구할 때도 조용히
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isEditing && currentFaq) {
            // 👇 수정 시 confirm 추가
            if (!confirm('FAQ를 수정하시겠습니까?')) return;

            const { error } = await supabase
                .from('faqs')
                .update(form)
                .eq('id', currentFaq.id);

            if (!error) {
                alert('수정되었습니다!');
                resetForm();
                fetchFaqs();
            } else {
                alert('오류: ' + error.message);
            }
        } else {
            const { error } = await supabase
                .from('faqs')
                .insert([form]);

            if (!error) {
                alert('등록되었습니다!');
                resetForm();
                fetchFaqs();
            } else {
                alert('오류: ' + error.message);
            }
        }
    };

    const handleEdit = (faq) => {
        setCurrentFaq(faq);
        setForm({
            question: faq.question,
            answer: faq.answer
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 👇 새로 추가할 함수 (취소 확인창)
    const handleCancelEdit = () => {
        if (!confirm('수정하던 내용이 모두 사라집니다. 정말 취소하시겠습니까?')) return;
        resetForm();
    };

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('faqs')
            .delete()
            .eq('id', id);

        if (!error) {
            alert('삭제되었습니다.');
            fetchFaqs();
        }
    };

    const resetForm = () => {
        setForm({ question: '', answer: '' });
        setIsEditing(false);
        setCurrentFaq(null);
    };

    if (authLoading || !isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-6xl mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center text-gray-500 hover:text-black mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> 대시보드로
                        </button>
                        <h1 className="text-3xl font-bold">FAQ 관리</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 입력 폼 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border h-fit sticky top-24">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {isEditing ? 'FAQ 수정' : '새 FAQ 등록'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">질문 (Q)</label>
                                <input
                                    type="text"
                                    placeholder="예: 동아리 가입 조건이 어떻게 되나요?"
                                    className="w-full border rounded-lg p-3"
                                    value={form.question}
                                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">답변 (A)</label>
                                <textarea
                                    rows="6"
                                    placeholder="답변 내용을 입력하세요"
                                    className="w-full border rounded-lg p-3"
                                    value={form.answer}
                                    onChange={(e) => setForm({ ...form, answer: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
                                >
                                    {isEditing ? '수정 완료' : '등록하기'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit} // 👈 이 부분 변경 (기존: resetForm)
                                        className="px-6 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* 목록 */}
                    <div>
                        <h2 className="text-xl font-bold mb-4">등록된 FAQ ({faqs.length})</h2>
                        {loading ? (
                            <p className="text-gray-400">Loading...</p>
                        ) : (
                            <div className="space-y-4">
                                {faqs.map((faq, index) => ( // 👈 index 추가
                                    <div key={faq.id} className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start gap-4">
                                            {/* 텍스트 영역 (이전 코드 유지) */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                                    <h3 className="font-bold text-lg truncate">{faq.question}</h3>
                                                </div>
                                                <p className="text-sm text-gray-600 pl-7 whitespace-pre-wrap wrap-break-words">{faq.answer}</p>
                                            </div>

                                            {/* 버튼 영역 */}
                                            <div className="flex flex-col gap-2 shrink-0">
                                                {/* 👇 예쁜 화살표 아이콘이 적용된 순서 이동 버튼들 */}
                                                <div className="flex gap-1 justify-end mb-2">
                                                    <button
                                                        onClick={() => handleMove(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 transition-all"
                                                        title="위로 이동"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMove(index, 'down')}
                                                        disabled={index === faqs.length - 1}
                                                        className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 transition-all"
                                                        title="아래로 이동"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {/* 기존 수정/삭제 버튼 유지 */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(faq)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(faq.id)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminFaqs;
