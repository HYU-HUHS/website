import React, { useState } from 'react'; // useState를 꺼냅니다.
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';


function Contact() {
  // 1. 입력값을 저장할 변수들 (초기값은 빈 문자열 "")
  // [현재값, 값을바꾸는함수]
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // 2. 버튼 클릭 시 실행할 함수
  const handleSubmit = (e) => {
    e.preventDefault(); // 새로고침 되는 걸 막아줍니다 (필수!)

    if (name === "" || email === "") {
      alert("이름과 이메일을 모두 입력해주세요!");
      return;
    }

    // 나중엔 여기서 서버로 전송하겠지만, 지금은 알림창만!
    alert(`환영합니다, ${name}님! \n${email}로 연락 드릴게요.`);

    // 입력창 초기화 (센스!)
    setName("");
    setEmail("");
  };

  return (
    <PageTransition>
      <div className="max-w-md mx-auto p-6 text-center bg-white rounded-xl shadow-sm border border-gray-100 mt-10">
        {/* max-w-md: 너무 넓지 않게 (로그인창 크기), shadow-sm: 카드처럼 보이게 */}

        <h1 className="text-3xl font-bold mb-2 text-gray-900">📞 가입 문의</h1>
        <p className="text-gray-500 mb-8 text-sm">동아리에 가입하고 싶다면 연락처를 남겨주세요.</p>

        {/* 폼 UI: Tailwind로 완전 정복! */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* 이름 입력칸 */}
          <div className="text-left">
            <label className="text-sm font-semibold text-gray-700 ml-1">이름</label>
            <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mt-1"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 이메일 입력칸 */}
          <div className="text-left">
            <label className="text-sm font-semibold text-gray-700 ml-1">이메일</label>
            <input
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all mt-1"
              type="email"
              placeholder="abc@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* 신청 버튼 */}
          <button
            type="submit"
            className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-200"
          >
            신청하기
          </button>
        </form>
      </div>

    </PageTransition>
  );
}

export default Contact;
