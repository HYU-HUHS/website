import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const useImageUpload = () => {
    const [uploading, setUploading] = useState(false);

    const uploadImage = async (file, bucket = 'images') => {
        try {
            setUploading(true); // ← 이게 있어야 "업로드 중..." 텍스트가 뜸

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return data.publicUrl;

        } catch (error) {
            console.error('Image upload failed:', error.message);
            alert('이미지 업로드 실패: ' + error.message);
            return null;
        } finally {
            setUploading(false); // ← 업로드 끝나면 상태 초기화
        }
    };

    return { uploadImage, uploading };
};
