import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, User, Calendar, Images, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [user, setUser] = useState(null);

    // 🌟 현재 보고 있는 사진의 인덱스를 저장하는 상태 (슬라이더용)
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        fetchPost();
        supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    }, [id]);

    const fetchPost = async () => {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert("글을 찾을 수 없습니다.");
            navigate('/board');
        } else {
            setPost(data);
        }
    };

    // 이전 사진 보기
    const handlePrevImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
        }
    };

    // 다음 사진 보기
    const handleNextImage = () => {
        if (post.image_urls && currentImageIndex < post.image_urls.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
        }
    };

    const canManagePost = user && (
        user.role === 'admin'
        || post?.author_email?.toLowerCase() === user.email?.toLowerCase()
        || String(post?.user_id || '') === String(user.id || '')
    );

    const handleDelete = async () => {
        if (!canManagePost) return;
        if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return;

        try {
            const urlsToDelete = post.image_urls ? [...post.image_urls] : [];
            if (post.image_url) urlsToDelete.push(post.image_url);
            if (urlsToDelete.length > 0) {
                const fileNames = urlsToDelete.map((url) => url.split('/').pop()).filter(Boolean);
                await supabase.storage.from('images').remove(fileNames);
            }

            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) throw error;
            alert('게시글이 삭제되었습니다.');
            navigate('/board');
        } catch (error) {
            alert(error.message || '삭제 중 오류가 발생했습니다.');
        }
    };

    if (!post) {
        return (
            <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-bg-subtle pt-32 pb-24 px-4 sm:px-6 font-pretendard">
                <motion.div
                    className="max-w-4xl mx-auto bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-sm border border-border overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* 뒤로가기 버튼 */}
                    <button
                        onClick={() => navigate('/board')}
                        className="group text-gray-dark hover:text-primary mb-10 transition-colors flex items-center gap-2 font-bold"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        목록으로 돌아가기
                    </button>

                    {/* 제목 및 메타 정보 */}
                    <div className="mb-10 border-b border-border pb-8">
                        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
                            <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold">활동 소식</span>
                            <div className="flex items-center gap-1.5 text-gray-dark font-medium">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className="text-border">|</span>
                            <div className="flex items-center gap-1.5 text-gray-dark font-medium">
                                <User className="w-4 h-4" />
                                <span>{post.author_email?.split('@')[0]}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <h1 className="text-3xl md:text-5xl font-black leading-tight text-black tracking-tight">{post.title}</h1>
                            {canManagePost && (
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        onClick={() => navigate(`/board/write?edit=${post.id}`)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        수정
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 🌟 버튼 클릭형 슬라이더 (Carousel) */}
                    {post.image_urls && post.image_urls.length > 0 && (
                        /* 높이 변화(Layout Shift) 방지를 위해 aspect-video(16:9) 또는 고정 높이를 강제 적용 */
                        <div className="mb-12 relative w-full aspect-[4/3] md:aspect-video rounded-2xl border border-border overflow-hidden bg-gray-50 flex items-center justify-center">

                            {/* 현재 인덱스 표시기 */}
                            {post.image_urls.length > 1 && (
                                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                    <Images className="w-3.5 h-3.5" />
                                    {currentImageIndex + 1} / {post.image_urls.length}
                                </div>
                            )}

                            {/* 실제 보이는 이미지 (mode="wait" 제거, absolute로 띄워서 겹치면서 부드럽게 전환) */}
                            <AnimatePresence>
                                <motion.img
                                    key={currentImageIndex}
                                    src={post.image_urls[currentImageIndex]}
                                    alt={`게시글 사진 ${currentImageIndex + 1}`}
                                    /* absolute와 w-full h-full을 주어 박스 크기에 꽉 차게 렌더링 */
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </AnimatePresence>

                            {/* 좌우 이동 화살표 버튼 */}
                            {post.image_urls.length > 1 && (
                                <>
                                    {currentImageIndex > 0 && (
                                        <button
                                            onClick={handlePrevImage}
                                            className="absolute left-4 z-20 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-md"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                    )}

                                    {currentImageIndex < post.image_urls.length - 1 && (
                                        <button
                                            onClick={handleNextImage}
                                            className="absolute right-4 z-20 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-md"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    )}

                                    {/* 하단 점(Dot) 네비게이션 - Primary 색상 적용 */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                        {post.image_urls.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-2 rounded-full transition-all duration-300 ${idx === currentImageIndex
                                                        ? 'bg-primary w-6'
                                                        : 'bg-primary/30 w-2'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}


                    {/* 본문 텍스트 영역 */}
                    <div className="prose prose-lg max-w-none text-black leading-loose whitespace-pre-wrap">
                        {post.content}
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}

export default PostDetail;
