import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { motion } from 'framer-motion';
import {
    FileText,
    Users,
    Calendar,
    BookOpen,
    HelpCircle,
    ShieldCheck,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react';

const AdminDashboard = () => {
    const { isAdmin, loading, user } = useAdmin();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !isAdmin) {
            alert('관리자 권한이 없습니다.');
            navigate('/');
        }
    }, [isAdmin, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-subtle flex flex-col items-center justify-center font-pretendard">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-gray-dark font-medium">관리자 권한 확인 중...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    // 관리자 메뉴 구성
    const menuItems = [
        {
            title: '커뮤니티 글 관리',
            description: '활동 소식, 공지사항을 작성하고 삭제합니다.',
            path: '/admin/posts',
            icon: FileText,
            color: 'bg-white border border-border',
            iconBg: 'bg-gray-200 text-black'
        },
        {
            title: '스터디 그룹 관리',
            description: '모집 중인 왕초보/일반 스터디를 관리합니다.',
            path: '/admin/study-groups',
            icon: Users,
            color: 'bg-white border border-border',
            iconBg: 'bg-primary/10 text-primary'
        },
        {
            title: '동아리 연혁 관리',
            description: '동아리의 지난 발자취와 이벤트를 추가합니다.',
            path: '/admin/history',
            icon: Calendar,
            color: 'bg-white border border-border',
            iconBg: 'bg-accent/20 text-[#D97706]'
        },
        {
            title: '스터디 자료실 관리',
            description: '학습에 필요한 파일과 링크를 업로드합니다.',
            path: '/admin/study-materials',
            icon: BookOpen,
            color: 'bg-white border border-border',
            iconBg: 'bg-green-100 text-green-600'
        },
        {
            title: 'FAQ / 회칙 관리',
            description: '자주 묻는 질문과 동아리 규정을 수정합니다.',
            path: '/admin/faqs',
            icon: HelpCircle,
            color: 'bg-white border border-border',
            iconBg: 'bg-purple-100 text-purple-600'
        },
        // 🌟 새로 추가된 운영진 관리 메뉴 🌟
        {
            title: '운영진 권한 관리',
            description: '웹사이트 관리자 권한을 부여하거나 회수합니다.',
            path: '/admin/users',
            icon: ShieldCheck, // 상단에서 import된 ShieldCheck 아이콘 재사용
            color: 'bg-white border border-border',
            iconBg: 'bg-red-100 text-red-600'
        }
    ];


    // 카드 등장 애니메이션
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-6xl mx-auto">

                {/* 🌟 헤더 영역 */}
                <motion.div
                    className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-border"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-black tracking-tight mb-2">관리자 대시보드</h1>
                            <p className="text-gray-dark font-medium flex items-center gap-2">
                                환영합니다! <strong className="text-black">{user?.email}</strong>님
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-bg-subtle hover:bg-gray-200 text-gray-dark font-bold rounded-full transition-colors flex items-center gap-2"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        메인 홈으로 가기
                    </button>
                </motion.div>

                {/* 🌟 메뉴 그리드 영역 */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        // 커뮤니티 글 관리(첫 번째)는 포인트 컬러, 나머지는 하얀색 카드로 구분
                        const isPrimary = index === 0;

                        return (
                            <motion.div key={index} variants={itemVariants} className="h-full">
                                <Link
                                    to={item.path}
                                    className={`group h-full flex flex-col p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${item.color}`}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl ${item.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                                            <Icon className={`w-8 h-8`} />
                                        </div>
                                        <div className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isPrimary ? 'bg-white/20' : 'bg-primary/5'}`}>
                                            <ArrowRight className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 text-black">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-gray-dark">
                                        {item.description}
                                    </p>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>

            </div>
        </div>
    );
};

export default AdminDashboard;
