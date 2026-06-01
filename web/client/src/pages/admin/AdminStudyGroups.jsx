import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { Trash2, Edit, Plus, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const AdminStudyGroups = () => {
    const { isAdmin, loading: authLoading } = useAdmin();
    const navigate = useNavigate();

    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStudy, setCurrentStudy] = useState(null);
    // 👇 여기부터 추가
    const [uploading, setUploading] = useState(false);
    const [urlToDeleteFromStorage, setUrlToDeleteFromStorage] = useState(null);

    const [form, setForm] = useState({
        title: '',
        summary: '',
        description: '',
        thumbnail_url: '',
        status: 'recruit'
    });

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
        } else if (isAdmin) {
            fetchStudies();
        }
    }, [isAdmin, authLoading, navigate]);

    const fetchStudies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('study_groups')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setStudies(data);
        setLoading(false);
    };

    // Storage 이미지 삭제 유틸
    const deleteFromStorage = async (url) => {
        if (!url) return;
        try {
            // URL에서 'images/' 버킷 이후의 경로만 추출
            const path = url.split('/storage/v1/object/public/images/')[1];
            if (path) {
                await supabase.storage.from('images').remove([path]);
            }
        } catch (error) {
            console.error('Storage deletion error:', error);
        }
    };

    // 썸네일 이미지 업로드 핸들러
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `study_groups/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            // 수정 모드에서 기존 이미지가 있었다면 쓰레기통(urlToDeleteFromStorage)에 임시 보관
            if (isEditing && form.thumbnail_url) {
                setUrlToDeleteFromStorage(form.thumbnail_url);
            }

            setForm({ ...form, thumbnail_url: publicUrl });
        } catch (error) {
            console.error('Upload error:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isEditing && currentStudy) {
            // 👇 수정 시 confirm 추가
            if (!confirm('스터디 그룹을 수정하시겠습니까?')) return;

            const { error } = await supabase
                .from('study_groups')
                .update(form)
                .eq('id', currentStudy.id);

            if (!error) {
                // DB 업데이트 성공 후, 임시 보관된 기존 이미지가 있다면 Storage에서 완전히 삭제
                if (urlToDeleteFromStorage) {
                    await deleteFromStorage(urlToDeleteFromStorage);
                    setUrlToDeleteFromStorage(null);
                }
                alert('수정되었습니다!');
                resetForm();
                fetchStudies();
            } else {
                alert('오류: ' + error.message);
            }
        } else {
            const { error } = await supabase
                .from('study_groups')
                .insert([form]);

            if (!error) {
                alert('등록되었습니다!');
                resetForm();
                fetchStudies();
            } else {
                alert('오류: ' + error.message);
            }
        }
    };

    const handleEdit = (study) => {
        setCurrentStudy(study);
        setForm({
            title: study.title,
            summary: study.summary,
            description: study.description,
            thumbnail_url: study.thumbnail_url || '',
            status: study.status
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 👇 새로 추가할 함수 (취소 확인창)
    const handleCancelEdit = () => {
        if (!confirm('수정하던 내용이 모두 사라집니다. 정말 취소하시겠습니까?')) return;
        setUrlToDeleteFromStorage(null); // 쓰레기통 비우기 취소
        resetForm();
    };

    // 👇 기존 handleDelete 함수를 이걸로 교체 (매개변수 thumbnailUrl 추가됨)
    const handleDelete = async (id, thumbnailUrl) => {
        if (!confirm('정말 삭제하시겠습니까? (연결된 사진도 모두 영구 삭제됩니다)')) return;

        const { error } = await supabase
            .from('study_groups')
            .delete()
            .eq('id', id);

        if (!error) {
            // DB 삭제 성공 시 Storage 이미지도 함께 삭제
            if (thumbnailUrl) await deleteFromStorage(thumbnailUrl);
            alert('삭제되었습니다.');
            fetchStudies();
        }
    };

    const resetForm = () => {
        setForm({ title: '', summary: '', description: '', thumbnail_url: '', status: 'recruit' });
        setIsEditing(false);
        setCurrentStudy(null);
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
                        <h1 className="text-3xl font-bold">스터디 그룹 관리</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 입력 폼 */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border h-fit sticky top-24">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {isEditing ? '스터디 수정' : '새 스터디 등록'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">스터디 이름</label>
                                <input
                                    type="text"
                                    placeholder="예: 모던 자바스크립트 딥다이브"
                                    className="w-full border rounded-lg p-3"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">간단 소개 (썸네일용)</label>
                                <input
                                    type="text"
                                    placeholder="카드에 표시될 한 줄 소개"
                                    className="w-full border rounded-lg p-3"
                                    value={form.summary}
                                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">상세 설명 (팝업용)</label>
                                <textarea
                                    rows="5"
                                    placeholder="모달에 표시될 자세한 설명"
                                    className="w-full border rounded-lg p-3"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">썸네일 이미지</label>
                                <p className="text-xs text-gray-500 mb-3">* 권장 사이즈: 1:1 비율, 1MB 이하 (JPG, PNG)</p>
                                {form.thumbnail_url ? (
                                    <div className="relative w-32 h-32 mb-3 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img src={form.thumbnail_url} alt="썸네일 미리보기" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isEditing) setUrlToDeleteFromStorage(form.thumbnail_url);
                                                setForm({ ...form, thumbnail_url: '' });
                                            }}
                                            className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 hover:bg-white"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-3 flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-gray-50 text-gray-400">
                                        <label className="cursor-pointer flex flex-col items-center">
                                            <ImageIcon className="w-8 h-8 mb-2" />
                                            <span className="text-sm">{uploading ? '업로드 중...' : '이미지 업로드'}</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">상태</label>
                                <select
                                    className="w-full border rounded-lg p-3"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                >
                                    <option value="recruit">모집중</option>
                                    <option value="active">진행중</option>
                                    <option value="done">완료</option>
                                </select>
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
                                        onClick={handleCancelEdit} // 👈 여기 변경
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
                        <h2 className="text-xl font-bold mb-4">등록된 스터디 ({studies.length})</h2>
                        {loading ? (
                            <p className="text-gray-400">Loading...</p>
                        ) : (
                            <div className="space-y-4">
                                {studies.map((study) => (
                                    <div key={study.id} className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex gap-4">
                                            {study.thumbnail_url && (
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                                    <img src={study.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg truncate">{study.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${study.status === 'recruit' ? 'bg-blue-100 text-blue-700' :
                                                        study.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {study.status === 'recruit' ? '모집중' :
                                                            study.status === 'active' ? '진행중' : '완료'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{study.summary}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(study.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleEdit(study)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(study.id, study.thumbnail_url)} // 👈 두 번째 인자 추가
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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

export default AdminStudyGroups;
