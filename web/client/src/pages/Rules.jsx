import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const Rules = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRules = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('club_rules')
                .select('*')
                .order('order', { ascending: true });
            if (!error) setRules(data);
            setLoading(false);
        };
        fetchRules();
    }, []);

    // Framer Motion 애니메이션 설정
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-24 px-4 sm:px-6 font-pretendard">
            <div className="max-w-4xl mx-auto">

                {/* 🌟 헤더 섹션 (통일된 테마) */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-primary font-bold tracking-widest text-sm uppercase">Rules</span>
                    <h1 className="text-4xl font-black text-black mt-4 mb-4 tracking-tight">동아리 회칙</h1>
                    <p className="text-gray-dark text-lg">HUHS의 운영 규정과 회원의 권리를 안내합니다.</p>
                </motion.div>

                {/* 🌟 컨텐츠 박스 */}
                <motion.div
                    className="bg-white rounded-3xl shadow-sm border border-border p-8 sm:p-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="flex items-center space-x-3 border-b border-border pb-6 mb-10">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <span className="font-black text-2xl text-black">회칙 전문</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <motion.div
                            className="space-y-12"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {rules.length === 0 ? (
                                <p className="text-center text-gray-dark py-10">등록된 회칙이 없습니다.</p>
                            ) : (
                                rules.map((rule) => (
                                    <motion.div key={rule.id} variants={itemVariants} className="group">

                                        {/* 조항 제목 */}
                                        <div className="flex items-center space-x-4 mb-4">
                                            <span className="shrink-0 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-md font-bold tracking-wide">
                                                {rule.article_number}
                                            </span>
                                            <h3 className="text-xl sm:text-2xl font-bold text-black group-hover:text-primary transition-colors">
                                                {rule.title}
                                            </h3>
                                        </div>

                                        {/* 조항 내용 */}
                                        <div className="pl-6 ml-6 border-l-[3px] border-border group-hover:border-primary/50 transition-colors duration-300">
                                            <p className="text-gray-dark leading-loose whitespace-pre-wrap text-[15px] sm:text-base">
                                                {rule.content}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Rules;
