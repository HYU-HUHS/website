import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const FALLBACK_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

function Login() {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState(FALLBACK_CLIENT_ID);

  useEffect(() => {
    if (clientId) return;

    let cancelled = false;
    fetch('/api/config')
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload?.data?.googleClientId) setClientId(payload.data.googleClientId);
      })
      .catch(() => {
        if (!cancelled) setError('Google 로그인 설정을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          hd: 'hanyang.ac.kr',
          callback: async ({ credential }) => {
            setLoading(true);
            setError('');
            const { data, error: signInError } = await supabase.auth.signInWithGoogleCredential(credential);
            setLoading(false);
            if (signInError) {
              setError(signInError.message);
              return;
            }
            const user = data?.user;
            const needsProfile = !user?.student_id || !user?.major || !user?.phone || !user?.name;
            navigate(needsProfile ? '/profile' : '/');
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 320,
        });
      })
      .catch(() => setError('Google 로그인 스크립트를 불러오지 못했습니다.'));

    return () => {
      cancelled = true;
    };
  }, [clientId, navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 font-pretendard">
        <section className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-black mb-3">HUHS 로그인</h1>
          <p className="text-gray-dark mb-8 leading-relaxed">
            한양대학교 Google 계정으로 로그인해주세요.
          </p>

          {clientId ? (
            <div className="flex justify-center min-h-11" ref={buttonRef} />
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              Google 로그인 환경변수가 필요합니다.
            </div>
          )}

          {loading && <p className="mt-5 text-sm font-bold text-primary">로그인 처리 중...</p>}
          {error && <p className="mt-5 text-sm font-bold text-red-600">{error}</p>}
          <p className="mt-8 text-xs text-gray-dark">
            hanyang.ac.kr 도메인 계정만 사용할 수 있습니다.
          </p>
        </section>
      </div>
    </PageTransition>
  );
}

export default Login;
