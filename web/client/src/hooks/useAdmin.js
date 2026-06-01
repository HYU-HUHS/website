import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAdmin = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            // 1. 현재 로그인 사용자 확인
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            setUser(session.user);

            // 2. admin_users 테이블에서 권한 확인
            const { data, error } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', session.user.email)
                .single();

            if (!error && data) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        } catch (error) {
            console.error('Admin check error:', error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    return { isAdmin, loading, user };
};
