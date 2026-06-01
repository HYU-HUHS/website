import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { Trash2, Edit, Plus, ArrowLeft, UploadCloud, X, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react'; import { motion, AnimatePresence } from 'framer-motion';

const AdminPosts = () => {
    const { isAdmin, loading: authLoading } = useAdmin();
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // 작성/수정 모드 제어
    const [isEditing, setIsEditing] = useState(false);
    const [currentPost, setCurrentPost] = useState(null);
    const [uploading, setUploading] = useState(false);

    // 폼 상태
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // 다중 이미지 관련 상태
    const [files, setFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]); // 신규 선택된 파일 미리보기
    const [existingUrls, setExistingUrls] = useState([]); // 수정 시 남겨둘 기존 이미지들
    // 🌟 이 줄을 추가하세요! (수정 중 삭제 버튼을 누른 기존 이미지 주소들을 모아두는 곳)
    const [urlsToDeleteFromStorage, setUrlsToDeleteFromStorage] = useState([]);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
        } else if (isAdmin) {
            fetchPosts();
        }
    }, [isAdmin, authLoading, navigate]);

    // 언마운트 시 임시 URL 메모리 해제
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previewUrls]);

    const fetchPosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setPosts(data || []);
        setLoading(false);
    };

    // -----------------------------------------------------------------
    // 🌟 1. 파일 선택 핸들러 (여러 장 동시 선택 가능)
    // -----------------------------------------------------------------
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setFiles(prev => [...prev, ...selectedFiles]);
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);

        e.target.value = ''; // input 초기화
    };

    const handleRemoveNewImage = (indexToRemove) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => {
            URL.revokeObjectURL(prev[indexToRemove]);
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };

    const handleRemoveExistingImage = (indexToRemove) => {
        // 지워질 이미지의 URL을 쓰레기통 배열에 담기
        const urlToTrash = existingUrls[indexToRemove];
        setUrlsToDeleteFromStorage(prev => [...prev, urlToTrash]);

        // 화면에서 숨기기
        setExistingUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // 🌟 기존 이미지 순서 좌/우 이동
    const handleMoveExistingImage = (index, direction) => {
        if (
            (direction === 'left' && index === 0) ||
            (direction === 'right' && index === existingUrls.length - 1)
        ) return;

        const newUrls = [...existingUrls];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        const temp = newUrls[index];
        newUrls[index] = newUrls[targetIndex];
        newUrls[targetIndex] = temp;

        setExistingUrls(newUrls);
    };

    // 🌟 신규 첨부 이미지 순서 좌/우 이동
    const handleMoveNewImage = (index, direction) => {
        if (
            (direction === 'left' && index === 0) ||
            (direction === 'right' && index === files.length - 1)
        ) return;

        // 화면 미리보기 순서 변경
        const newPreviews = [...previewUrls];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        const tempPreview = newPreviews[index];
        newPreviews[index] = newPreviews[targetIndex];
        newPreviews[targetIndex] = tempPreview;

        setPreviewUrls(newPreviews);

        // 실제 업로드될 File 객체 배열 순서 변경
        const newFiles = [...files];
        const tempFile = newFiles[index];
        newFiles[index] = newFiles[targetIndex];
        newFiles[targetIndex] = tempFile;

        setFiles(newFiles);
    };

    // -----------------------------------------------------------------
    // 🌟 2. 폼 제출 (등록 또는 수정)
    // -----------------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) return alert('제목과 내용을 입력해주세요.');

        // 🌟 수정 모드일 때 '수정 완료'를 누르면 확인 창 띄우기
        if (isEditing) {
            if (!confirm('게시글을 수정하시겠습니까?')) {
                return; // 취소 누르면 여기서 중단
            }
        }
        setUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let newUploadedUrls = [];

            // 1. 새로 추가된 사진들을 Storage에 업로드
            if (files.length > 0) {
                const uploadPromises = files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('images')
                        .getPublicUrl(fileName);

                    return publicUrl;
                });
                newUploadedUrls = await Promise.all(uploadPromises);
            }

            // 🌟 2. 수정 모드일 때: 쓰레기통에 모인 이미지 파일들을 Storage에서 영구 삭제
            if (isEditing && urlsToDeleteFromStorage.length > 0) {
                const fileNamesToDelete = urlsToDeleteFromStorage.map(url => {
                    const parts = url.split('/');
                    return parts[parts.length - 1];
                });

                console.log("🔥 수정 과정에서 버려진 파일 삭제 중:", fileNamesToDelete);

                const { error: deleteStorageError } = await supabase.storage
                    .from('images')
                    .remove(fileNamesToDelete);

                if (deleteStorageError) {
                    console.error("❌ 수정 중 부분 삭제 에러:", deleteStorageError);
                }
            }

            // 3. 최종 저장할 배열 (기존 남은 사진 + 새로 올린 사진)
            const finalImageUrls = [...existingUrls, ...newUploadedUrls];

            // 4. DB 업데이트 또는 인서트
            if (isEditing && currentPost) {
                const { error } = await supabase
                    .from('posts')
                    .update({ title, content, image_urls: finalImageUrls })
                    .eq('id', currentPost.id);

                if (!error) {
                    alert('수정되었습니다!');
                    resetForm();
                    fetchPosts();
                } else throw error;
            } else {
                const { error } = await supabase
                    .from('posts')
                    .insert([{
                        title,
                        content,
                        image_urls: finalImageUrls,
                        user_id: user?.id,
                        author_email: user?.email
                    }]);

                if (!error) {
                    alert('등록되었습니다!');
                    resetForm();
                    fetchPosts();
                } else throw error;
            }
        } catch (error) {
            console.error(error);
            alert('오류 발생: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    // -----------------------------------------------------------------
    // 🌟 3. 삭제 로직 (로그 제거 및 깔끔화)
    // -----------------------------------------------------------------
    const handleDelete = async (post) => {
        if (!confirm('정말 삭제하시겠습니까? (연결된 사진도 모두 영구 삭제됩니다)')) return;

        try {
            // 1. 해당 글에 묶여있는 이미지 배열과 과거 단일 이미지 주소 확보
            const urlsToDelete = post.image_urls ? [...post.image_urls] : [];
            if (post.image_url) urlsToDelete.push(post.image_url);

            // 2. Storage에서 파일 찾아 지우기
            if (urlsToDelete.length > 0) {
                const fileNames = urlsToDelete.map(url => {
                    const parts = url.split('/');
                    return parts[parts.length - 1];
                });

                const { error: storageError } = await supabase.storage
                    .from('images')
                    .remove(fileNames);

                if (storageError) {
                    console.error("스토리지 삭제 중 에러 발생:", storageError);
                }
            }

            // 3. DB에서 게시글 레코드 삭제
            const { error: dbError } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

            if (dbError) throw dbError;

            alert('글과 사진이 성공적으로 삭제되었습니다.');
            fetchPosts();

        } catch (error) {
            console.error(error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleEdit = (post) => {
        setCurrentPost(post);
        setTitle(post.title);
        setContent(post.content);

        // 기존 이미지가 있다면 셋업 (구버전 호환 포함)
        let urls = post.image_urls ? [...post.image_urls] : [];
        if (post.image_url && urls.length === 0) urls.push(post.image_url);

        setExistingUrls(urls);
        setFiles([]);
        setPreviewUrls([]);

        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 🌟 수정 취소 버튼을 눌렀을 때 실행될 함수
    const handleCancelEdit = () => {
        if (confirm('수정하던 내용이 모두 사라집니다. 정말 취소하시겠습니까?')) {
            resetForm();
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setFiles([]);
        setPreviewUrls([]);
        setExistingUrls([]);
        setUrlsToDeleteFromStorage([]); // 🌟 이 줄 추가
        setIsEditing(false);
        setCurrentPost(null);
    };


    if (authLoading || !isAdmin) return null;

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-6xl mx-auto">

                {/* 상단 네비게이션 헤더 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow text-gray-dark hover:text-primary">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-black">커뮤니티 글 관리</h1>
                            <p className="text-gray-dark font-medium mt-1">게시글, 사진 수정 및 삭제</p>
                        </div>
                    </div>
                </div>

                {/* 🌟 글 작성 / 수정 폼 껍데기 */}
                <AnimatePresence>
                    {(isEditing || title || content || files.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-12 overflow-hidden"
                        >
                            <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-black">
                                    {isEditing ? <Edit className="w-5 h-5 text-accent" /> : <Plus className="w-5 h-5 text-primary" />}
                                    {isEditing ? '게시글 수정' : '새 게시글 작성'}
                                </h2>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-gray-dark">제목</label>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="p-3 bg-bg-subtle border border-border rounded-xl focus:ring-2 focus:ring-primary/50 text-black outline-none transition-all"
                                            placeholder="제목을 입력하세요"
                                        />
                                    </div>

                                    {/* 🌟 관리자용 다중 사진 업로드 영역 */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <label className="font-bold text-gray-dark">사진 첨부</label>
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">다중 선택 가능</span>
                                        </div>

                                        <div className="relative mb-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full flex justify-center items-center gap-2 py-4 border-2 border-dashed border-border rounded-xl bg-gray-50 text-gray-dark hover:bg-primary/5 hover:text-primary transition-colors">
                                                <UploadCloud className="w-6 h-6" />
                                                <span className="font-bold">클릭하여 사진 추가하기</span>
                                            </div>
                                        </div>

                                        {/* 기존/신규 이미지 갤러리 */}
                                        {(existingUrls.length > 0 || previewUrls.length > 0) && (
                                            <div className="flex gap-4 overflow-x-auto py-2 scrollbar-hide">

                                                {/* --- 기존 이미지 영역 --- */}
                                                {existingUrls.map((url, idx) => (
                                                    <div key={`exist-${idx}`} className="relative shrink-0 group">
                                                        {/* 🌟 크기를 w-36 h-36 으로 확대 */}
                                                        <img src={url} alt="기존" className="w-36 h-36 object-cover rounded-xl border border-border opacity-80" />

                                                        <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                                            {/* 상단: 빈 공간 (버튼들을 가운데/아래로 밀기 위함) */}
                                                            <div className="h-6"></div>

                                                            {/* 중앙: 예쁜 좌우 이동 화살표 */}
                                                            <div className="flex gap-4 items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveExistingImage(idx, 'left')}
                                                                    disabled={idx === 0}
                                                                    className="bg-white/20 hover:bg-white/50 disabled:opacity-30 rounded-full p-1.5 backdrop-blur-sm transition-colors"
                                                                >
                                                                    <ChevronLeft className="w-5 h-5 text-white" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveExistingImage(idx, 'right')}
                                                                    disabled={idx === existingUrls.length - 1}
                                                                    className="bg-white/20 hover:bg-white/50 disabled:opacity-30 rounded-full p-1.5 backdrop-blur-sm transition-colors"
                                                                >
                                                                    <ChevronRight className="w-5 h-5 text-white" />
                                                                </button>
                                                            </div>

                                                            {/* 하단: 삭제 버튼 */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveExistingImage(idx)}
                                                                className="bg-red-500/80 hover:bg-red-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm transition-colors w-full"
                                                            >
                                                                기존 사진 삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* --- 신규 이미지 영역 --- */}
                                                {previewUrls.map((url, idx) => (
                                                    <div key={`new-${idx}`} className="relative shrink-0 group">
                                                        {/* 🌟 크기를 w-36 h-36 으로 확대 */}
                                                        <img src={url} alt="신규" className="w-36 h-36 object-cover rounded-xl border-primary border-2" />

                                                        <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity p-2 z-10">
                                                            <div className="h-6 flex justify-between w-full">
                                                                <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">NEW</span>
                                                            </div>

                                                            {/* 중앙: 예쁜 좌우 이동 화살표 */}
                                                            <div className="flex gap-4 items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveNewImage(idx, 'left')}
                                                                    disabled={idx === 0}
                                                                    className="bg-white/20 hover:bg-white/50 disabled:opacity-30 rounded-full p-1.5 backdrop-blur-sm transition-colors"
                                                                >
                                                                    <ChevronLeft className="w-5 h-5 text-white" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveNewImage(idx, 'right')}
                                                                    disabled={idx === previewUrls.length - 1}
                                                                    className="bg-white/20 hover:bg-white/50 disabled:opacity-30 rounded-full p-1.5 backdrop-blur-sm transition-colors"
                                                                >
                                                                    <ChevronRight className="w-5 h-5 text-white" />
                                                                </button>
                                                            </div>

                                                            {/* 하단: 삭제 버튼 */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveNewImage(idx)}
                                                                className="bg-red-500/80 hover:bg-red-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm transition-colors w-full"
                                                            >
                                                                추가 취소
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-gray-dark">내용</label>
                                        <textarea
                                            required
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="p-3 bg-bg-subtle border border-border rounded-xl focus:ring-2 focus:ring-primary/50 text-black outline-none h-40 resize-none transition-all"
                                            placeholder="내용을 입력하세요"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                                        <button type="button" onClick={handleCancelEdit} className="px-6 py-2.5 rounded-xl font-bold text-gray-dark hover:bg-gray-100 transition-colors">
                                            취소
                                        </button>
                                        <button type="submit" disabled={uploading} className="px-8 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                                            {uploading ? '저장 중...' : (isEditing ? '수정 완료' : '등록하기')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🌟 등록된 게시글 목록 (테이블 형태) */}
                <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex justify-between items-center bg-bg-subtle/50">
                        <div className="flex items-center gap-2">
                            <LayoutList className="w-5 h-5 text-gray-dark" />
                            <h3 className="font-bold text-black">등록된 글 목록</h3>
                        </div>
                        <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            총 {posts.length}개
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-dark">로딩 중...</div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {posts.map((post) => (
                                <li key={post.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-bg-subtle/50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                        {/* 목록용 미니 썸네일 (배열의 첫 번째 사진) */}
                                        <div className="w-16 h-16 shrink-0 bg-primary/5 rounded-lg border border-border overflow-hidden">
                                            {(post.image_urls && post.image_urls.length > 0) || post.image_url ? (
                                                <img
                                                    src={(post.image_urls && post.image_urls.length > 0) ? post.image_urls[0] : post.image_url}
                                                    className="w-full h-full object-cover"
                                                    alt="thumb"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex justify-center items-center text-xs text-gray-dark">No Img</div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <h4 className="font-bold text-black text-lg truncate mb-1">{post.title}</h4>
                                            <p className="text-sm text-gray-dark truncate">{post.content}</p>
                                            <div className="text-xs text-gray-dark font-medium mt-1.5 flex gap-2">
                                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span className="text-primary">{post.image_urls?.length || (post.image_url ? 1 : 0)}장의 사진</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 수정 / 삭제 액션 버튼 */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                            onClick={() => handleEdit(post)}
                                            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors flex-1 sm:flex-none text-center"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDelete(post)}
                                            className="px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100 transition-colors flex-1 sm:flex-none text-center"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPosts;
