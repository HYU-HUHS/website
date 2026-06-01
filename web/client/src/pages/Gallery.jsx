import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // 👈 관리자 여부 체크용

  // 👇 여기에 본인(운영진) 이메일 입력!
  const ADMIN_EMAIL = "admin@example.com";

  useEffect(() => {
    fetchPhotos();
    checkUserRole();
  }, []);

  // 1. 운영진인지 확인하는 함수
  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email === ADMIN_EMAIL) {
      setIsAdmin(true); // 빙고! 관리자다.
    }
  };

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setPhotos(data);
  };

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('photos')
        .insert([{ url: publicUrl, caption: '활동 사진' }]);

      if (dbError) throw dbError;

      alert("업로드 성공!");
      fetchPhotos();

    } catch (error) {
      alert("업로드 실패! (권한 문제일 수 있음)");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">📸 활동 갤러리</h1>
            <p className="text-gray-500 mt-2">우리의 추억들을 모아두는 곳입니다.</p>
          </div>

          {/* 👇 isAdmin이 true일 때만 업로드 버튼 표시! */}
          {isAdmin && (
            <div>
              <label
                htmlFor="upload-btn"
                className={`cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 ${uploading ? 'opacity-50' : ''}`}
              >
                {uploading ? '업로드 중...' : '📤 사진 올리기 (운영진)'}
              </label>
              <input
                id="upload-btn"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {photos.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
              아직 업로드된 사진이 없습니다.
            </div>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition duration-300 bg-white aspect-square">
                <img
                  src={photo.url}
                  alt="Activity"
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                  <p className="text-white font-bold text-lg">✨ 멋진 순간</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default Gallery;
