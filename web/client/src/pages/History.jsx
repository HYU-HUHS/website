import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

const History = () => {
    const [histories, setHistories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('club_history')
                .select('*')
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (!error) setHistories(data);
            setLoading(false);
        };
        fetchHistory();
    }, []);

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-3xl mx-auto">

                {/* 헤더 섹션 */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-primary font-bold tracking-widest text-sm uppercase">History</span>
                    <h1 className="text-4xl font-black mt-4 text-black">
                        우리가 걸어온 길
                    </h1>
                    <p className="text-gray-dark mt-4 text-lg">
                        HUHS이 만들어온 지난 발자취를 소개합니다.
                    </p>
                </motion.div>

                {/* 데이터 로딩 처리 */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    /* 타임라인 전체 컨테이너 */
                    <div className="relative ml-4 sm:ml-6 pb-10">

                        {/* 배경을 가로지르는 수직 선 (첫 동그라미 중앙 높이부터 시작하도록 top-3 적용) */}
                        <div className="absolute left-[7px] top-3 bottom-0 w-[2px] bg-gray-200"></div>

                        <div className="space-y-12">
                            {histories.map((item) => (
                                <motion.div
                                    key={item.id}
                                    className="relative pl-10 sm:pl-14 group"
                                    variants={itemVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                >
                                    {/* 🌟 타임라인 점 (선과 정확히 겹치도록 위치 조정) */}
                                    <div
                                        className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10
                                        ${item.is_highlight ? 'bg-primary scale-125' : 'bg-[#7098F2]'}`}
                                    ></div>

                                    {/* 연도/월 표시 */}
                                    <div className="flex items-baseline text-sm font-semibold text-gray-dark mb-2">
                                        <span className={`text-2xl mr-2 ${item.is_highlight ? 'text-primary font-black' : 'text-black opacity-80'}`}>
                                            {item.year}
                                        </span>
                                        {item.month && <span>{item.month}월</span>}
                                    </div>

                                    {/* 내용 카드 */}
                                    <div className={`rounded-2xl p-6 transition-all duration-300 border
                                        ${item.is_highlight
                                            ? 'bg-white shadow-md border-primary/20 scale-100'
                                            : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm hover:border-border'
                                        }`}
                                    >
                                        <h3 className={`text-xl mb-2 ${item.is_highlight ? 'font-bold text-black' : 'font-medium text-gray-dark'}`}>
                                            {item.title}
                                        </h3>
                                        {item.description && (
                                            <p className="text-gray-dark opacity-90 leading-relaxed text-sm">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* 시작점 (맨 밑) 표시 */}
                        <div className="absolute left-[3.5px] bottom-0 w-2.5 h-2.5 bg-gray-300 rounded-full z-10"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
