import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, ImagePlus, BookOpenText, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

function Write() {
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // 사진 다중 선택을 위한 배열 상태
    const [files, setFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]); // 화면 미리보기용 임시 URL
    const [existingUrls, setExistingUrls] = useState([]);
    const [removedExistingUrls, setRemovedExistingUrls] = useState([]);
    const [editingPost, setEditingPost] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkPermission = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('로그인이 필요합니다.');
                navigate('/login');
                return;
            }
            if (user.role !== 'member' && user.role !== 'admin') {
                alert('부원만 글을 작성할 수 있습니다.');
                navigate('/board');
                return;
            }
            if (editId) {
                const { data: post, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('id', editId)
                    .single();
                if (error || !post) {
                    alert('글을 찾을 수 없습니다.');
                    navigate('/board');
                    return;
                }
                const canEdit = user.role === 'admin'
                    || post.author_email?.toLowerCase() === user.email?.toLowerCase()
                    || String(post.user_id || '') === String(user.id || '');
                if (!canEdit) {
                    alert('본인이 작성한 글만 수정할 수 있습니다.');
                    navigate(`/board/${editId}`);
                    return;
                }
                setEditingPost(post);
                setTitle(post.title || '');
                setContent(post.content || '');
                const urls = post.image_urls ? [...post.image_urls] : [];
                if (post.image_url && urls.length === 0) urls.push(post.image_url);
                setExistingUrls(urls);
            }
            setCheckingAuth(false);
        };
        checkPermission();
    }, [editId, navigate]);

    // 사용자가 사진을 선택했을 때 (Storage 업로드 X, 미리보기만 생성)
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        // 기존 파일 배열에 추가
        setFiles(prev => [...prev, ...selectedFiles]);

        // 미리보기용 임시 URL 생성 (브라우저 메모리 사용)
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);

        // input 값 초기화 (같은 파일 다시 선택 가능하도록)
        e.target.value = '';
    };

    // 선택한 사진 삭제 (미리보기에서 X 버튼 눌렀을 때)
    const handleRemoveImage = (indexToRemove) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => {
            // 메모리 누수 방지를 위해 URL 해제
            URL.revokeObjectURL(prev[indexToRemove]);
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };

    const handleRemoveExistingImage = (indexToRemove) => {
        const removedUrl = existingUrls[indexToRemove];
        setRemovedExistingUrls((prev) => [...prev, removedUrl]);
        setExistingUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const moveItem = (items, index, direction) => {
        const target = direction === 'left' ? index - 1 : index + 1;
        if (target < 0 || target >= items.length) return items;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
    };

    // 컴포넌트 언마운트 시 메모리 누수 방지
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // 🌟 최종 등록 버튼을 눌렀을 때
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) return alert("제목과 내용을 입력해주세요.");

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.role !== 'member' && user?.role !== 'admin') {
                alert('부원만 글을 작성할 수 있습니다.');
                navigate('/board');
                return;
            }
            let uploadedImageUrls = [];

            // 1. 선택된 사진이 있다면 Promise.all로 Storage에 한 번에 업로드
            if (files.length > 0) {
                const uploadPromises = files.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    // 파일명 중복 방지를 위해 난수 추가
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('images')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    // 업로드된 주소 가져오기
                    const { data: { publicUrl } } = supabase.storage
                        .from('images')
                        .getPublicUrl(filePath);

                    return publicUrl;
                });

                // 모든 사진이 올라갈 때까지 대기 후 배열로 반환
                uploadedImageUrls = await Promise.all(uploadPromises);
            }

            if (removedExistingUrls.length > 0) {
                const fileNamesToDelete = removedExistingUrls.map((url) => url.split('/').pop()).filter(Boolean);
                await supabase.storage.from('images').remove(fileNamesToDelete);
            }

            const finalImageUrls = [...existingUrls, ...uploadedImageUrls];

            if (editingPost) {
                const { error: updateError } = await supabase
                    .from('posts')
                    .update({
                        title,
                        content,
                        image_urls: finalImageUrls,
                    })
                    .eq('id', editingPost.id);
                if (updateError) throw updateError;
                alert('수정 완료!');
                navigate(`/board/${editingPost.id}`);
            } else {
                const { data, error: insertError } = await supabase
                    .from('posts')
                    .insert([
                        {
                            title,
                            content,
                            image_urls: finalImageUrls,
                            user_id: user?.id,
                            author_email: user?.email
                        }
                    ]);

                if (insertError) throw insertError;
                alert("등록 완료!");
                navigate(data?.[0]?.id ? `/board/${data[0].id}` : '/board');
            }

        } catch (error) {
            console.error(error);
            alert(error.message || "글 저장 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    if (checkingAuth) {
        return <div className="min-h-screen bg-bg-subtle pt-32 text-center text-gray-dark">권한 확인 중...</div>;
    }

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <motion.div
                className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <BookOpenText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-black tracking-tight">
                            {editingPost ? '소식 수정' : '새 소식 작성'}
                        </h1>
                        <p className="text-gray-dark mt-1">
                            {editingPost ? '작성한 소식을 다듬어주세요.' : '동아리의 다양한 이야기를 공유해주세요.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                    {/* 제목 입력 */}
                    <div className="flex flex-col gap-3">
                        <label className="font-bold text-black text-lg">제목</label>
                        <input
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="p-4 bg-bg-subtle border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all text-black text-lg"
                        />
                    </div>

                    {/* 내용 입력 */}
                    <div className="flex flex-col gap-3">
                        <label className="font-bold text-black text-lg">내용</label>
                        <textarea
                            placeholder="어떤 일이 있었나요?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="p-4 bg-bg-subtle border border-border rounded-2xl h-64 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all text-black resize-none leading-relaxed"
                        />
                    </div>

                    {/* 🌟 다중 사진 업로드 영역 */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-black text-lg">사진 첨부</label>
                            <span className="text-sm text-gray-dark font-medium">{files.length}장 선택됨</span>
                        </div>

                        {/* 사진 추가 버튼 (커스텀 디자인) */}
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                multiple // 여러 장 선택 가능!
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                                <ImagePlus className="w-6 h-6" />
                                <span className="font-bold">사진 추가하기 (여러 장 선택 가능)</span>
                            </div>
                        </div>

                        {/* 미리보기 갤러리 */}
                        {(existingUrls.length > 0 || previewUrls.length > 0) && (
                            <div className="flex gap-4 overflow-x-auto py-2 mt-2 scrollbar-hide">
                                {existingUrls.map((url, index) => (
                                    <div key={url} className="relative flex-shrink-0 group">
                                        <img
                                            src={url}
                                            alt={`existing-${index}`}
                                            className="w-32 h-32 object-cover rounded-2xl border border-border shadow-sm"
                                        />
                                        <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => setExistingUrls((prev) => moveItem(prev, index, 'left'))}
                                                className="bg-black/60 text-white p-1 rounded-full disabled:opacity-30"
                                                disabled={index === 0}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setExistingUrls((prev) => moveItem(prev, index, 'right'))}
                                                className="bg-black/60 text-white p-1 rounded-full disabled:opacity-30"
                                                disabled={index === existingUrls.length - 1}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingImage(index)}
                                            className="absolute -top-2 -right-2 bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-500 z-20"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative flex-shrink-0 group">
                                        <img
                                            src={url}
                                            alt={`preview-${index}`}
                                            className="w-32 h-32 object-cover rounded-2xl border border-border shadow-sm"
                                        />
                                        <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewUrls((prev) => moveItem(prev, index, 'left'));
                                                    setFiles((prev) => moveItem(prev, index, 'left'));
                                                }}
                                                className="bg-black/60 text-white p-1 rounded-full disabled:opacity-30"
                                                disabled={index === 0}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewUrls((prev) => moveItem(prev, index, 'right'));
                                                    setFiles((prev) => moveItem(prev, index, 'right'));
                                                }}
                                                className="bg-black/60 text-white p-1 rounded-full disabled:opacity-30"
                                                disabled={index === previewUrls.length - 1}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* 삭제 버튼 (호버 시 등장) */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute -top-2 -right-2 bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-500 z-20"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 하단 버튼 그룹 */}
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={() => navigate('/board')}
                            className="px-6 py-3.5 rounded-xl font-bold text-gray-dark bg-bg-subtle hover:bg-gray-100 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>{editingPost ? '수정 중...' : '업로드 중...'}</span>
                                </>
                            ) : (
                                <span>{editingPost ? '수정 완료' : '게시하기'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

export default Write;
