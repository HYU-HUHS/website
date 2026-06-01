import React from 'react';

function Footer() {
  return (
    // src/components/Footer.jsx

    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      {/* mt-auto: 본문이 짧아도 바닥에 붙게 해줌 (flex-col 구조일 때) */}

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">

          <p className="text-base text-gray-500">
            &copy; 2026 C & Python Master Club. All rights reserved.
          </p>

          <p className="mt-2 text-sm text-gray-400">
            Designed with <span className="text-red-500">♥</span> by You
          </p>

        </div>
      </div>
    </footer>

  );
}

export default Footer;
