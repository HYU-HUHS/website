import React from 'react';
import { motion } from 'framer-motion';

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}     // 시작: 투명하고 약간 아래에 있음
      animate={{ opacity: 1, y: 0 }}      // 등장: 불투명해지고 제자리로 올라옴
      exit={{ opacity: 0, y: -20 }}       // 퇴장: 투명해지면서 위로 사라짐
      transition={{ duration: 0.3 }}      // 0.3초 동안 빠르게
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
