import { MapPin, Bus, Navigation, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const Location = () => {
    const CLUB_INFO = {
        address: "서울특별시 관악구 관악로 1, 학생회관(63동) 404호",
        placeName: "HUHS 동아리방",
        subLocation: "학생회관 4층",
        kakaoMapLink: "https://map.kakao.com/link/search/서울대학교 학생회관"
    };

    // 스크롤 애니메이션 (Fade-up)
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
            <div className="max-w-6xl mx-auto">

                {/* 🌟 헤더 섹션 (History, Exec 페이지와 통일) */}
                <motion.div 
                    className="text-center mb-16"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                >
                    <span className="text-primary font-bold tracking-widest text-sm uppercase">Location</span>
                    <h1 className="text-4xl font-black text-black mt-4 mb-4 tracking-tight">오시는 길</h1>
                    <p className="text-gray-dark text-lg">HUHS의 아지트, 동아리방을 소개합니다.</p>
                </motion.div>

                {/* 메인 정보 카드 */}
                <motion.div 
                    className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeInUp}
                >
                    <div className="flex flex-col lg:flex-row h-auto lg:h-[600px]">

                        {/* 왼쪽: 지도 플레이스홀더 (Primary 테마 모눈종이 패턴) */}
                        <div className="w-full lg:w-2/3 h-[300px] lg:h-full relative bg-primary/5 flex items-center justify-center overflow-hidden">
                            {/* 감각적인 모눈종이 배경 패턴 */}
                            <div className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)',
                                    backgroundSize: '24px 24px'
                                }}>
                            </div>

                            {/* 떠다니는 장식용 블러 요소 */}
                            <div className="absolute top-10 left-10 w-40 h-40 bg-primary opacity-10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent opacity-10 rounded-full blur-3xl"></div>

                            <div className="text-center z-10 p-6">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md border border-border">
                                    <MapPin className="w-8 h-8 text-primary animate-bounce" />
                                </div>
                                <p className="text-black font-bold text-lg mb-1">지도는 추후 업데이트 예정입니다</p>
                                <p className="text-sm text-gray-dark px-4 py-1.5 bg-white/80 rounded-full inline-block backdrop-blur-sm shadow-sm">
                                    현재 API 연동 준비 중 🚀
                                </p>
                            </div>
                        </div>

                        {/* 오른쪽: 상세 정보 영역 */}
                        <div className="w-full lg:w-1/3 p-8 sm:p-12 flex flex-col justify-center bg-white border-t lg:border-t-0 lg:border-l border-border">
                            <div className="space-y-12">

                                {/* 주소 정보 */}
                                <div>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2.5 bg-primary/10 rounded-xl">
                                            <MapPin className="w-6 h-6 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold text-black">주소</h3>
                                    </div>
                                    <p className="text-black leading-relaxed pl-1.5 font-bold text-lg">
                                        {CLUB_INFO.placeName}
                                    </p>
                                    <p className="text-gray-dark text-sm pl-1.5 mt-2 leading-relaxed">
                                        {CLUB_INFO.address}
                                    </p>
                                </div>

                                {/* 대중교통 */}
                                <div>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2.5 bg-accent/20 rounded-xl">
                                            <Bus className="w-6 h-6 text-accent" />
                                        </div>
                                        <h3 className="text-xl font-bold text-black">교통편</h3>
                                    </div>
                                    <ul className="text-gray-dark space-y-3 pl-1.5">
                                        <li className="flex items-start">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></span>
                                            <span>지하철: 2호선 서울대입구역 3번 출구</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 mr-3 flex-shrink-0"></span>
                                            <span>버스: 5511, 5513 (학생회관 앞 하차)</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* 카카오맵 버튼 */}
                                <div className="pt-4">
                                    <a
                                        href={CLUB_INFO.kakaoMapLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group w-full flex items-center justify-center space-x-2 bg-accent hover:bg-[#EAB308] text-black px-6 py-4 rounded-xl font-bold transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        <Navigation className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                                        <span>카카오맵으로 길찾기</span>
                                    </a>
                                </div>

                            </div>
                        </div>
                    </div>
                </motion.div>
                
            </div>
        </div>
    );
};

export default Location;
