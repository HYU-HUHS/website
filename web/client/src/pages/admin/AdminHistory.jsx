import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { ArrowLeft, Plus, Edit, Trash2, Clock, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminHistory = () => {
    const { isAdmin, loading: authLoading } = useAdmin();
    const navigate = useNavigate();

    const [histories, setHistories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // 폼 상태
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState('1');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isHighlight, setIsHighlight] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
        } else if (isAdmin) {
            fetchHistories();
        }
    }, [isAdmin, authLoading, navigate]);

    const fetchHistories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('club_history')
            .select('*')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            // 👇 연도와 월이 같을 경우, 나중에 만든(id가 큰) 항목이 위로 오도록 추가
            .order('id', { ascending: false });

        if (!error) setHistories(data || []);
        setLoading(false);
    };

    const fetchHistoriesSilently = async () => {
        const { data, error } = await supabase
            .from('club_history')
            .select('*')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            // 👇 여기도 동일하게 추가
            .order('id', { ascending: false });

        if (!error) setHistories(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            year: parseInt(year),
            month: parseInt(month),
            title,
            description,
            is_highlight: isHighlight
        };

        if (isEditing && currentId) {
            if (!confirm('연혁을 수정하시겠습니까?')) return;

            const { error } = await supabase
                .from('club_history')
                .update(payload)
                .eq('id', currentId);

            if (!error) {
                alert('수정되었습니다!');
                resetForm();
                fetchHistoriesSilently();
            } else {
                alert('오류: ' + error.message);
            }
        } else {
            const { error } = await supabase
                .from('club_history')
                .insert([payload]);

            if (!error) {
                alert('등록되었습니다!');
                resetForm();
                fetchHistoriesSilently();
            } else {
                alert('오류: ' + error.message);
            }
        }
    };

    const handleEdit = (item) => {
        setCurrentId(item.id);
        setYear(item.year.toString());
        setMonth(item.month.toString());
        setTitle(item.title || '');
        setDescription(item.description || '');
        setIsHighlight(item.is_highlight || false);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('club_history')
            .delete()
            .eq('id', id);

        if (!error) {
            alert('삭제되었습니다.');
            fetchHistoriesSilently();
        } else {
            alert('오류 발생: ' + error.message);
        }
    };

    const handleCancelEdit = () => {
        if (confirm('작성 중인 내용이 사라집니다. 취소하시겠습니까?')) {
            resetForm();
        }
    };

    const resetForm = () => {
        setYear(new Date().getFullYear().toString());
        setMonth('1');
        setTitle('');
        setDescription('');
        setIsHighlight(false);
        setIsEditing(false);
        setCurrentId(null);
    };

    if (authLoading || !isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto">

                {/* 헤더 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center text-gray-500 hover:text-black mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> 대시보드로
                        </button>
                        <h1 className="text-3xl font-bold">연혁 관리</h1>
                    </div>
                </div>

                {/* 입력 폼 */}
                <div className="bg-white rounded-2xl p-6 border shadow-sm mb-12">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        {isEditing ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                        {isEditing ? '연혁 수정' : '새 연혁 등록'}
                    </h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">연도</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full p-3 border rounded-lg outline-none focus:border-blue-500"
                                >
                                    {/* 현재 연도부터 1982년까지 선택 가능하도록 수정 */}
                                    {Array.from(
                                        { length: new Date().getFullYear() - 1982 + 1 },
                                        (_, i) => new Date().getFullYear() - i
                                    ).map(y => (
                                        <option key={y} value={y}>{y}년</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">월</label>
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full p-3 border rounded-lg outline-none focus:border-blue-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m}월</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ✅ 변경된 입력 폼 영역 */}
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">타이틀 (Title)</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="예: 제 15회 정기 공연 개최"
                                    className="w-full p-3 border rounded-lg outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">상세 설명 (Description)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="타이틀에 대한 상세 내용을 입력하세요 (선택사항)"
                                    className="w-full p-3 border rounded-lg outline-none focus:border-blue-500 h-24 resize-none whitespace-pre-wrap"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer w-fit mt-1">
                                <input
                                    type="checkbox"
                                    checked={isHighlight}
                                    onChange={(e) => setIsHighlight(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-gray-800">하이라이트 (주요 연혁으로 눈에 띄게 강조)</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            {isEditing && (
                                <button type="button" onClick={handleCancelEdit} className="px-6 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    취소
                                </button>
                            )}
                            <button type="submit" className="px-8 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
                                {isEditing ? '수정 완료' : '등록하기'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 🌟 수정된 타임라인 컨테이너 (정렬 완벽 해결) */}
                <div className="relative space-y-6">
                    {/* 배경 세로 직선 (점들의 정중앙 X축: 22px 지점을 관통하도록 픽셀 단위 조정) */}
                    <div className="absolute top-8 bottom-4 left-5.25 w-0.5 bg-gray-200 z-0"></div>

                    {histories.map((item) => (
                        <div key={item.id} className="relative flex items-start gap-6 group z-10">
                            {/* 🌟 가로/세로 정렬이 완벽하게 맞춰진 타임라인 점 */}
                            <div className={`ml-3 mt-6 w-5 h-5 shrink-0 bg-white border-4 rounded-full group-hover:scale-110 transition-transform ${item.is_highlight ? 'border-primary' : 'border-primary-light'}`}></div>

                            {/* 내용 카드 */}
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-5 rounded-xl border border-gray-300 hover:border-gray-500 transition-colors">

                                <div className="flex-1 w-full min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-blue-600 font-bold">
                                            {item.year}년 {item.month}월
                                        </span>
                                        {/* 하이라이트 여부 뱃지 */}
                                        {item.is_highlight && (
                                            <span className="bg-accent-light text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-current" /> 주요 연혁
                                            </span>
                                        )}
                                    </div>

                                    {/* 오직 타이틀만 깔끔하게 출력 */}
                                    <h3 className={`font-bold text-gray-900 ${item.is_highlight ? 'text-xl text-blue-900' : 'text-lg'}`}>
                                        {item.title}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2 sm:mt-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default AdminHistory;