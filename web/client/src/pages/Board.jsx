import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import { PenSquare, Image as ImageIcon, ArrowRight, Images } from 'lucide-react'; // 아이콘 추가

function Board() {
    const [posts, setPosts] = useState([]);
    const [canWrite, setCanWrite] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCanWrite(user?.role === 'member' || user?.role === 'admin');
    };

    const fetchPosts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        setPosts(data || []);
        setLoading(false);
    };

    // -----------------------------------------------------
    // Framer Motion 스크롤 & 순차(Stagger) 애니메이션 설정
    // -----------------------------------------------------
    // 컨테이너: 자식 요소(카드)들을 0.1초 간격으로 순서대로 나타나게 함
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    // 개별 카드 애니메이션
    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-bg-subtle pt-32 pb-24 px-4 sm:px-6 font-pretendard">
                <div className="max-w-7xl mx-auto">

                    {/* 🌟 헤더 섹션 (제목은 완벽한 중앙 정렬, 버튼은 우측 하단 띄움) */}
                    <div className="relative mb-16 pt-2">

                        {/* 1. 완벽한 중앙 정렬 제목 */}
                        <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="text-primary font-bold tracking-widest text-sm uppercase">Community</span>
                            <h1 className="text-4xl font-black mt-3 mb-3 text-black tracking-tight">커뮤니티</h1>
                            <p className="text-gray-dark text-lg">HUHS의 다양한 활동 소식을 전합니다.</p>
                        </motion.div>

                        {/* 2. 글쓰기 버튼 (우측 하단에 띄움) */}
                        {canWrite && (
                            <motion.div
                                className="absolute right-0 bottom-0 hidden md:block" // 데스크탑에서만 절대위치 (모바일은 아래에)
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Link
                                    to="/board/write"
                                    className="flex items-center gap-2 bg-primary hover:bg-primary text-white px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    <PenSquare className="w-5 h-5" />
                                    <span>새 소식 작성</span>
                                </Link>
                            </motion.div>
                        )}

                        {/* 모바일용 글쓰기 버튼 (작은 화면에서는 제목 아래에 중앙 정렬되도록) */}
                        {canWrite && (
                            <motion.div
                                className="flex justify-center mt-6 md:hidden"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Link
                                    to="/board/write"
                                    className="flex items-center gap-2 bg-primary hover:bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md"
                                >
                                    <PenSquare className="w-5 h-5" />
                                    <span>새 소식 작성</span>
                                </Link>
                            </motion.div>
                        )}
                    </div>

                    {/* 🌟 게시글 리스트 영역 */}
                    {loading ? (
                        // 로딩 스피너
                        <div className="flex justify-center py-32">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : posts.length === 0 ? (
                        // 게시글이 없을 때
                        <div className="text-center py-32 bg-white rounded-3xl border border-border">
                            <p className="text-gray-dark text-lg">아직 등록된 활동 소식이 없습니다.</p>
                        </div>
                    ) : (
                        // 게시글 카드 그리드
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {posts.map((post) => (
                                <motion.div key={post.id} variants={cardVariants}>
                                    <Link
                                        to={`/board/${post.id}`}
                                        className="group bg-white rounded-3xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block h-full flex flex-col"
                                    >
                                        {/* 🌟 썸네일 이미지 영역 (수정됨) */}
                                        <div className="aspect-video w-full bg-primary/5 overflow-hidden relative">
                                            {/* 배열의 첫 번째 사진이 있는지 확인 */}
                                            {post.image_urls && post.image_urls.length > 0 ? (
                                                <>
                                                    <img
                                                        src={post.image_urls[0]} // 배열의 첫 번째 사진 렌더링
                                                        alt={post.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="hidden w-full h-full flex-col items-center justify-center text-primary/30 gap-2 absolute top-0 left-0 bg-primary/5">
                                                        <ImageIcon className="w-12 h-12" />
                                                        <span className="text-sm font-medium">No Image</span>
                                                    </div>

                                                    {/* 사진이 여러 장일 경우 우측 상단에 아이콘 표시 */}
                                                    {post.image_urls.length > 1 && (
                                                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-1.5 rounded-md text-white shadow-sm z-10">
                                                            <Images className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                // 사진이 아예 없는 경우
                                                <div className="w-full h-full flex flex-col items-center justify-center text-primary/30 gap-2">
                                                    <ImageIcon className="w-12 h-12" />
                                                    <span className="text-sm font-medium">No Image</span>
                                                </div>
                                            )}

                                            {/* 날짜 배지 */}
                                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm z-10">
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </div>
                                        </div>


                                        {/* 텍스트 내용 영역 */}
                                        <div className="p-7 flex flex-col flex-grow">
                                            <h2 className="text-xl font-bold mb-3 text-black group-hover:text-primary transition-colors line-clamp-1">
                                                {post.title}
                                            </h2>
                                            <p className="text-gray-dark text-sm line-clamp-2 leading-relaxed flex-grow">
                                                {post.content}
                                            </p>

                                            {/* 하단 작성자 & 자세히 보기 */}
                                            <div className="mt-6 pt-5 border-t border-border flex justify-between items-center text-sm">
                                                <span className="text-gray-dark font-medium">
                                                    {post.author_email?.split('@')[0]}
                                                </span>
                                                <div className="flex items-center gap-1 text-primary font-bold group-hover:translate-x-1 transition-transform">
                                                    <span>자세히 보기</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}

export default Board;
