import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition'; // 기존 사용 컴포넌트 유지
import { motion } from 'framer-motion';
import { Code, Users, Rocket, Target, CheckCircle2 } from 'lucide-react';

function About() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetchClubInfo();
  }, []);

  const fetchClubInfo = async () => {
    const { data, error } = await supabase
      .from('club_info')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) console.error('소개 정보 에러:', error);
    else setInfo(data);
  };

  // -----------------------------------------------------------------
  // Framer Motion 스크롤 애니메이션 옵션 (Fade-up)
  // -----------------------------------------------------------------
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  // 로딩 상태 디자인 (기존의 밋밋한 텍스트 대신 중앙 스피너 적용)
  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-bg-subtle pt-24 pb-20 font-pretendard overflow-hidden">

        {/* =========================================
            1. Hero Section (도입부: 비전 & 슬로건)
        ========================================= */}
        <motion.section
          className="max-w-6xl mx-auto px-4 text-center mb-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide">
            ABOUT HUHS
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-black mb-6 leading-tight">
            우리는 기술로 세상을 변화시키고, <br className="hidden md:block" />
            함께 <span className="text-primary">성장하는 즐거움</span>을 아는 사람들입니다.
          </h1>
          <p className="text-gray-dark text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {info.vision_desc || 'HUHS는 실전 프로젝트 중심의 개발 동아리입니다. 기획부터 배포까지, 하나의 서비스를 완성하며 진짜 실력을 키웁니다.'}
          </p>
        </motion.section>

        {/* =========================================
            2. Core Values (우리의 핵심 가치)
        ========================================= */}
        <motion.section
          className="max-w-6xl mx-auto px-4 mb-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black mb-4">Why HUHS?</h2>
            <p className="text-gray-dark">우리가 특별한 세 가지 이유</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 카드 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">체계적인 스터디</h3>
              <p className="text-gray-dark leading-relaxed">
                프론트엔드, 백엔드 기초부터 심화까지. 혼자서는 어려운 개념도 선배들의 멘토링과 코드 리뷰를 통해 확실하게 내 것으로 만듭니다.
              </p>
            </div>
            {/* 카드 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border group">
              <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">실전 팀 프로젝트</h3>
              <p className="text-gray-dark leading-relaxed">
                스터디에서 끝나는 것이 아니라, 기획-디자인-개발-배포의 전체 사이클을 경험하며 포트폴리오에 당당히 올릴 수 있는 서비스를 만듭니다.
              </p>
            </div>
            {/* 카드 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">끈끈한 네트워킹</h3>
              <p className="text-gray-dark leading-relaxed">
                개발이라는 공통 관심사를 가진 사람들과 소통합니다. 정기적인 해커톤, MT, 회식을 통해 든든한 평생의 동료를 얻어 가세요.
              </p>
            </div>
          </div>
        </motion.section>

        {/* =========================================
            3. 동아리 성과 통계 (Stats)
        ========================================= */}
        <motion.section
          className="max-w-6xl mx-auto px-4 mb-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-white text-center shadow-lg relative overflow-hidden">
            {/* 배경 장식 */}
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/20">
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black mb-2">{info.member_count || '50'}+</div>
                <div className="text-primary-light font-medium">Members</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black mb-2">{info.project_count || '12'}+</div>
                <div className="text-primary-light font-medium">Projects</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black mb-2">4+</div>
                <div className="text-primary-light font-medium">Years</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black mb-2">100%</div>
                <div className="text-primary-light font-medium">Passion</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* =========================================
            4. Ideal Candidate (이런 분을 기다립니다)
        ========================================= */}
        <motion.section
          className="max-w-4xl mx-auto px-4 mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-black">이런 분들을 기다려요</h2>
            </div>

            <p className="text-gray-dark mb-8 leading-relaxed">
              열정만 있다면 전공, 학번, 나이는 중요하지 않습니다. 아래 항목에 하나라도 해당된다면 주저하지 말고 지원해 주세요!
            </p>

            <ul className="space-y-5">
              {[
                "개발에 대한 순수한 호기심과 성장에 대한 갈증이 있으신 분",
                "팀원들과 적극적으로 소통하며 긍정적인 에너지를 나눌 수 있는 분",
                "모르는 것을 부끄러워하지 않고, 적극적으로 질문하며 배울 준비가 된 분",
                "실력이 다소 부족하더라도, 맡은 역할을 끝까지 해내는 책임감이 있으신 분"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-4 p-4 rounded-xl hover:bg-bg-subtle transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-black font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

      </div>
    </PageTransition>
  );
}

export default About;
