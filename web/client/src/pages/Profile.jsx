import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, UserRound } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

const initialProfile = {
  name: '',
  student_id: '',
  major: '',
  phone: '',
  email: '',
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const payload = await apiRequest('/auth/me');
        setProfile({ ...initialProfile, ...payload.data.user });
      } catch {
        alert('로그인이 필요합니다.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      });
      const { data: { session } } = await supabase.auth.getSession();
      localStorage.setItem('huhsweb.session', JSON.stringify({ ...session, user: payload.data.user }));
      window.dispatchEvent(new CustomEvent('huhsweb-auth', { detail: { ...session, user: payload.data.user } }));
      alert('프로필이 저장되었습니다.');
      navigate('/');
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen pt-32 text-center text-gray-dark">불러오는 중...</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 font-pretendard">
        <section className="max-w-2xl mx-auto bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <UserRound className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-black">내 정보</h1>
              <p className="text-sm text-gray-dark mt-1">{profile.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              이름
              <input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium" />
            </label>
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              학번
              <input required value={profile.student_id} onChange={(e) => setProfile({ ...profile, student_id: e.target.value })} className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium" />
            </label>
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              학과
              <input required value={profile.major} onChange={(e) => setProfile({ ...profile, major: e.target.value })} className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium" />
            </label>
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              연락처
              <input required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium" />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button disabled={saving} className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50">
                <Save className="w-5 h-5" />
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </PageTransition>
  );
};

export default Profile;
