import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// -----------------------------------------------------
// 1. 외곽 전용 네트워크 파티클 배경 컴포넌트
// -----------------------------------------------------
const NetworkBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // 파티클 생성 수 (화면 크기에 비례)
    const particleCount = Math.floor((width * height) / 15000);
    const particles = [];

    // 파티클 초기화 함수
    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        // 화면 전역에 생성하되, 중앙부(Center Deadzone)를 회피하도록 로직 구성
        let x, y;
        let inCenter = true;
        const centerX = width / 2;
        const centerY = height / 2;
        const deadzoneRadius = Math.min(width, height) * 0.35; // 중앙 35% 영역은 비움

        while (inCenter) {
          x = Math.random() * width;
          y = Math.random() * height;
          // 중심과의 거리 계산
          const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (dist > deadzoneRadius) {
            inCenter = false;
          }
        }

        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.5, // 천천히 이동
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 1.5 + 1
        });
      }
    };

    initParticles();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Light Theme에 어울리는 Primary(블루) 계열 파티클
      ctx.fillStyle = '#7098F2';
      ctx.strokeStyle = '#7098F2';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 위치 업데이트
        p.x += p.vx;
        p.y += p.vy;

        // 화면 경계선에 닿으면 반대편으로 이동 (Wraparound)
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // 중앙 Deadzone으로 진입하려 하면 방향을 살짝 튕겨냄
        const centerX = width / 2;
        const centerY = height / 2;
        const deadzoneRadius = Math.min(width, height) * 0.35;
        const distToCenter = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));

        if (distToCenter < deadzoneRadius) {
          // 중심 밖으로 밀어내는 힘 적용
          p.vx += (p.x - centerX) * 0.001;
          p.vy += (p.y - centerY) * 0.001;
        }

        // 파티클 그리기
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // 파티클 간 선 연결 (거리가 가까울 때만)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // 거리에 따라 선의 투명도 조절
            ctx.globalAlpha = 1 - (dist / 100);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1; // 초기화
          }
        }
      }
      requestAnimationFrame(draw);
    };

    let animationId = requestAnimationFrame(draw);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />;
};


// -----------------------------------------------------
// 2. 메인 Home 컴포넌트
// -----------------------------------------------------
const Home = () => {
  // 애니메이션 단계 (스피디한 구성으로 단축)
  // 0: 1줄 선으로 확장 -> 1: 1줄 스윕(텍스트 등장) -> 2: 1줄 점으로 축소
  // 3: 2줄 선으로 확장 -> 4: 2줄 스윕(텍스트 등장) -> 5: 2줄 점으로 축소 -> 6: 최종 완료 (버튼 등장)
  const [step, setStep] = useState(0);

  // 시퀀스 타이머 제어 (점 대기 없이 바로 선으로 확장되게 변경)
  useEffect(() => {
    const timings = {
      0: 400,  // 선 확장 시간
      1: 800,  // 스윕(이동) 시간
      2: 400,  // 점 축소 후 대기 시간 (다음 줄로 넘어가기 전 짧은 텀)
      3: 400,  // 2줄 선 확장 시간
      4: 900,  // 2줄 스윕 시간
      5: 400,  // 2줄 점 축소 후 대기
    };

    if (step < 6) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, timings[step]);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col relative overflow-hidden font-pretendard">
      <NetworkBackground />

      {/* 중앙 은은한 블러 효과 (텍스트가 커진 만큼 배경 Glow도 키움) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 md:w-200 md:h-200 bg-white opacity-40 blur-[100px] rounded-full pointer-events-none z-0"></div>

      {/* 메인 Hero 섹션 */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 z-10 -mt-15">

        {/* 타이핑 텍스트 영역 (텍스트 크기 압도적 확장: md:text-[150px]) */}
        <h1 className="text-6xl md:text-[150px] font-bold tracking-tight leading-none md:leading-[0.9] mb-12 min-h-40 md:min-h-75 flex flex-col items-center text-center">

          {/* 첫 번째 줄: "We're in" */}
          <div className="relative inline-block mb-2 md:mb-4">
            {/* 레이아웃을 잡기 위한 투명 텍스트 */}
            <span className="opacity-0 px-2 pointer-events-none">We're in</span>

            {/* 텍스트 Reveal (초기 깜빡임 방지를 위해 opacity 연동) */}
            <motion.div
              className="absolute top-0 left-0 h-full overflow-hidden whitespace-nowrap text-black px-2"
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: step >= 1 ? "100%" : 0,
                opacity: step >= 1 ? 1 : 0
              }}
              transition={{ duration: step === 1 ? 0.8 : 0, ease: "easeInOut" }}
            >
              We're in
            </motion.div>

            {/* 1단계 커서 애니메이션 (첫 번째 줄) */}
            {step < 3 && (
              <motion.div
                className="absolute bg-black"
                initial={{ left: 0, top: "50%", y: "-50%", width: "12px", height: "24px", borderRadius: "2px", opacity: 0 }}
                animate={{
                  opacity: 1,
                  width: "12px", // 너비 고정
                  height: step === 0 || step === 1 ? "100%" : "24px", // 늘어났다 줄어듦
                  borderRadius: "2px", // 직사각형 유지
                  left: step >= 1 ? "100%" : "0%"
                }}
                transition={{ duration: step === 1 ? 0.8 : 0.4, ease: "easeInOut" }}
              />
            )}

          </div>

          {/* 두 번째 줄: "HUHS" */}
          <div className="relative inline-block mt-2 md:mt-4">
            <span className="opacity-0 px-2 pointer-events-none">HUHS</span>

            {step >= 3 && (
              <>
                <motion.div
                  className="absolute top-0 left-0 h-full overflow-hidden whitespace-nowrap text-primary px-2"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: step >= 4 ? "100%" : 0,
                    opacity: step >= 4 ? 1 : 0
                  }}
                  transition={{ duration: step === 4 ? 0.9 : 0, ease: "easeInOut" }}
                >
                  HUHS
                </motion.div>

                {/* 2단계 커서 애니메이션 (두 번째 줄) */}
                {step < 6 && (
                  <motion.div
                    className="absolute bg-primary"
                    initial={{ left: 0, top: "50%", y: "-50%", width: "12px", height: "24px", borderRadius: "2px", opacity: 0 }}
                    animate={{
                      opacity: 1,
                      width: "12px",
                      height: step === 3 || step === 4 ? "100%" : "24px",
                      borderRadius: "2px",
                      left: step >= 4 ? "100%" : "0%"
                    }}
                    transition={{ duration: step === 4 ? 0.9 : 0.4, ease: "easeInOut" }}
                  />
                )}

              </>
            )}
          </div>
        </h1>

        {/* 서브 텍스트 & 버튼 그룹 */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: step >= 6 ? 1 : 0, y: step >= 6 ? 0 : 30 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ pointerEvents: step >= 6 ? 'auto' : 'none' }}
        >
          <p className="text-gray-dark text-lg md:text-2xl mb-12 font-medium text-center bg-bg-subtle/80 px-4 py-1 rounded-full backdrop-blur-sm">
            HUHS 동아리입니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
            <Link
              to="/about"
              className="bg-white hover:bg-bg-subtle text-gray-dark border-2 border-border px-8 py-4 rounded-full text-lg md:text-xl font-bold transition-all duration-300 hover:-translate-y-1 shadow-sm w-full sm:w-auto text-center z-20"
            >
              동아리 소개
            </Link>

            <Link
              to="/join"
              className="group bg-primary hover:bg-dark text-white px-8 py-4 rounded-full text-lg md:text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-md flex justify-center items-center gap-2 w-full sm:w-auto z-20"
            >
              지원하러 가기
              <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 하단 스크롤 화살표 */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 6 ? 0.5 : 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <ChevronDown className="w-10 h-10 text-gray-dark animate-bounce" />
      </motion.div>
    </div>
  );
};

export default Home;