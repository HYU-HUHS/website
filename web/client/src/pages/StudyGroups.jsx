import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Users, BookOpen, Layers, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudyGroups = () => {
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudy, setSelectedStudy] = useState(null);

    useEffect(() => {
        fetchStudies();
    }, []);

    const fetchStudies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('study_groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setStudies(data || []);
        setLoading(false);
    };

    // 🌟 DB의 'study_type' 컬럼을 기준으로 데이터 분리
    // study_type이 'beginner'인 것만 왕초보 스터디로 분류
    const beginnerStudies = studies.filter(study => study.study_type === 'beginner');

    // 그 외의 모든 데이터(normal이거나 값이 없는 경우)는 일반 스터디로 분류
    const normalStudies = studies.filter(study => study.study_type !== 'beginner');

    // 상태 뱃지 렌더링
    const StatusBadge = ({ status }) => {
        const styles = {
            recruit: "bg-accent/20 text-[#D97706]",
            active: "bg-primary/10 text-primary",
            done: "bg-gray-100 text-gray-dark"
        };
        const labels = { recruit: "모집중", active: "진행중", done: "완료" };
        return (
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm backdrop-blur-sm ${styles[status] || styles.done}`}>
                {labels[status] || status}
            </span>
        );
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    // 재사용 가능한 카드 렌더링 컴포넌트
    const renderStudyCards = (studyList) => (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
        >
            {studyList.map((study) => (
                <motion.div
                    key={study.id}
                    variants={itemVariants}
                    onClick={() => setSelectedStudy(study)}
                    className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                    <div className="h-48 w-full bg-primary/5 overflow-hidden relative">
                        {study.thumbnail_url ? (
                            <>
                                <img
                                    src={study.thumbnail_url} alt={study.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden w-full h-full flex-col items-center justify-center text-primary/30 gap-2 absolute top-0 left-0 bg-primary/5">
                                    <Layers className="w-10 h-10" />
                                    <span className="text-sm font-medium">No Image</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-primary/30 gap-2">
                                <Layers className="w-10 h-10" />
                                <span className="text-sm font-medium">No Image</span>
                            </div>
                        )}
                        <div className="absolute top-4 right-4 z-10">
                            <StatusBadge status={study.status} />
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-black mb-3 group-hover:text-primary transition-colors line-clamp-1">
                            {study.title}
                        </h3>
                        <p className="text-gray-dark text-sm line-clamp-2 leading-relaxed flex-grow">
                            {study.summary}
                        </p>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-6xl mx-auto">

                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-primary font-bold tracking-widest text-sm uppercase">Study Groups</span>
                    <h1 className="text-4xl font-black text-black mt-4 mb-4 tracking-tight">활동 스터디</h1>
                    <p className="text-gray-dark text-lg">함께 성장하는 HUHS의 스터디 그룹을 확인해보세요.</p>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : studies.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-border">
                        <p className="text-gray-dark text-lg">아직 등록된 스터디가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-24">
                        {/* 왕초보 스터디 섹션 */}
                        {beginnerStudies.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-accent/20 rounded-xl">
                                        <Sparkles className="w-6 h-6 text-[#D97706]" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-black">입문자를 위한 왕초보 스터디</h2>
                                </div>
                                {renderStudyCards(beginnerStudies)}
                            </section>
                        )}

                        {/* 일반 스터디 섹션 */}
                        {normalStudies.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-black">정규 스터디 및 프로젝트</h2>
                                </div>
                                {renderStudyCards(normalStudies)}
                            </section>
                        )}
                    </div>
                )}

                {/* 모달 */}
                <AnimatePresence>
                    {selectedStudy && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setSelectedStudy(null)}
                            ></motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden relative z-10 flex flex-col"
                            >
                                <button
                                    onClick={() => setSelectedStudy(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors z-20"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>

                                <div className="overflow-y-auto w-full">
                                    <div className="h-64 sm:h-72 w-full bg-primary/5 relative">
                                        {selectedStudy.thumbnail_url ? (
                                            <>
                                                <img
                                                    src={selectedStudy.thumbnail_url} alt={selectedStudy.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="hidden w-full h-full flex-col items-center justify-center text-primary/30 absolute top-0 left-0 bg-primary/5">
                                                    <Layers className="w-16 h-16" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-primary/30">
                                                <Layers className="w-16 h-16 mb-2" />
                                                <span className="font-medium">이미지가 없습니다</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 sm:p-8 pt-20">
                                            <div className="flex items-center mb-3">
                                                <StatusBadge status={selectedStudy.status} />
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                                {selectedStudy.title}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 bg-white">
                                        <div className="prose prose-sm sm:prose-base max-w-none">
                                            <h4 className="text-black font-bold text-xl mb-4 flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-primary" />
                                                스터디 소개
                                            </h4>
                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-dark">
                                                {selectedStudy.description || selectedStudy.summary}
                                            </p>

                                            <div className="mt-10 p-5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center shadow-sm">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 flex-shrink-0 shadow-sm">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <span className="text-sm font-bold text-primary">
                                                    스터디 참여를 원하시면 동아리 운영진에게 문의해주세요.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudyGroups;
