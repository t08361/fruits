import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-green-100 text-gray-600 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">&copy; 2023 (주)빅세일즈. All rights reserved.</p>
          </div>
          <div className="text-sm">
            <p>사업자등록번호: 778-49-00965</p>
            <p>대표: 조용준</p>
            <p>이메일: jofficial1@naver.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
