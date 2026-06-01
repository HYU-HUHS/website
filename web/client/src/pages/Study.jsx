import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, FileText, File, FileArchive, FileCode, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const Study = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    // 검색어 상태
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchMaterials = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('study_materials')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setMaterials(data);
            setLoading(false);
        };
        fetchMaterials();
    }, []);

    // 검색 필터링 로직 (제목 또는 내용에 포함된 경우)
    const filteredMaterials = materials.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 🌟 확장자별 아이콘 렌더링 헬퍼 함수
    const getFileIcon = (fileName) => {
        if (!fileName) return <FileText className="w-5 h-5 text-gray-400" />;

        const ext = fileName.split('.').pop().toLowerCase();

        if (['pdf'].includes(ext))
            return <FileText className="w-5 h-5 text-red-500" />;
        if (['zip', 'rar', 'tar', '7z'].includes(ext))
            return <FileArchive className="w-5 h-5 text-yellow-500" />;
        if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'json'].includes(ext))
            return <FileCode className="w-5 h-5 text-blue-500" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext))
            return <ImageIcon className="w-5 h-5 text-green-500" />;

        return <File className="w-5 h-5 text-gray-500" />; // 기본 아이콘
    };

    // Framer Motion (리스트 등장)
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-5xl mx-auto">

                {/* 헤더 섹션 */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-primary font-bold tracking-widest text-sm uppercase">Materials</span>
                    <h1 className="text-4xl font-black text-black mt-4 mb-4 tracking-tight">스터디 자료실</h1>
                    <p className="text-gray-dark text-lg">동아리 활동에 필요한 학습 자료와 파일을 공유합니다.</p>
                </motion.div>

                {/* 🌟 메인 게시판 박스 */}
                <motion.div
                    className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {/* 상단: 검색창 & 툴바 */}
                    <div className="p-6 sm:p-8 border-b border-border bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-black font-bold flex items-center gap-2">
                            <span>전체 자료</span>
                            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm">
                                {filteredMaterials.length}
                            </span>
                        </div>

                        {/* 검색창 */}
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="자료 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-bg-subtle border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                            />
                            <Search className="w-4 h-4 text-gray-dark absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    {/* 게시판 리스트 영역 */}
                    <div className="bg-white">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            // 게시판 헤더 (컬럼명 - 모바일에서는 숨김)
                            <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-bg-subtle/50 border-b border-border text-sm font-bold text-gray-dark text-center">
                                <div className="col-span-1">종류</div>
                                <div className="col-span-6 text-left">제목 및 설명</div>
                                <div className="col-span-2">작성일</div>
                                <div className="col-span-2">파일명</div>
                                <div className="col-span-1">다운</div>
                            </div>
                        )}

                        {/* 실제 데이터 리스트 */}
                        {!loading && filteredMaterials.length === 0 ? (
                            <div className="text-center py-20 text-gray-dark">
                                {searchTerm ? "검색 결과가 없습니다." : "등록된 자료가 없습니다."}
                            </div>
                        ) : (
                            <motion.ul
                                className="divide-y divide-border"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {filteredMaterials.map((item) => (
                                    <motion.li
                                        key={item.id}
                                        variants={itemVariants}
                                        className="group grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 px-6 md:px-8 py-5 items-center hover:bg-primary/5 transition-colors duration-200"
                                    >
                                        {/* 1. 파일 확장자 아이콘 */}
                                        <div className="hidden md:flex col-span-1 justify-center">
                                            {getFileIcon(item.file_name)}
                                        </div>

                                        {/* 2. 제목 & 내용 (모바일에서는 이 부분이 크게 보임) */}
                                        <div className="col-span-1 md:col-span-6 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-1">
                                                {/* 모바일용 아이콘 */}
                                                <div className="md:hidden">
                                                    {getFileIcon(item.file_name)}
                                                </div>
                                                <h3 className="text-lg font-bold text-black group-hover:text-primary transition-colors line-clamp-1">
                                                    {item.title}
                                                </h3>
                                            </div>
                                            <p className="text-gray-dark text-sm line-clamp-1">
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* 3. 작성일 */}
                                        <div className="col-span-1 md:col-span-2 text-sm text-gray-dark md:text-center flex md:block items-center gap-2 mt-2 md:mt-0">
                                            <span className="md:hidden font-bold bg-bg-subtle px-2 py-0.5 rounded">등록일</span>
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </div>

                                        {/* 4. 파일명 */}
                                        <div className="col-span-1 md:col-span-2 text-sm text-gray-dark truncate md:text-center flex md:block items-center gap-2">
                                            <span className="md:hidden font-bold bg-bg-subtle px-2 py-0.5 rounded">파일명</span>
                                            {item.file_name || "-"}
                                        </div>

                                        {/* 5. 다운로드 버튼 */}
                                        <div className="col-span-1 flex md:justify-center mt-3 md:mt-0">
                                            {item.file_url ? (
                                                <a
                                                    href={item.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 md:w-10 md:h-10 w-full py-2 bg-bg-subtle text-black rounded-lg group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
                                                    title="다운로드"
                                                >
                                                    <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                                    <span className="md:hidden font-bold">다운로드</span>
                                                </a>
                                            ) : (
                                                <div className="w-10 h-10"></div>
                                            )}
                                        </div>
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Study;
