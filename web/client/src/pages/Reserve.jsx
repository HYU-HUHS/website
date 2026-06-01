import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/api';
import PageTransition from '../components/PageTransition';

const initialForm = {
  student_id: '',
  name: '',
  reserved_at: '',
  participant_count: 1,
  purpose: '',
};

const Reserve = () => {
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest('/reservations');
      setReservations(payload.data || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const upcomingReservations = useMemo(() => {
    const now = new Date();
    return reservations
      .filter((item) => item.status !== 'cancelled' && new Date(item.reserved_at) >= now)
      .slice(0, 8);
  }, [reservations]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          participant_count: Number(form.participant_count),
        }),
      });
      alert('동아리방 예약이 완료되었습니다.');
      setForm(initialForm);
      fetchReservations();
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10">
          <motion.section
            className="bg-white rounded-3xl border border-border shadow-sm p-8 sm:p-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <CalendarClock className="w-8 h-8" />
              </div>
              <div>
                <span className="text-primary font-bold tracking-widest text-sm uppercase">Room Reserve</span>
                <h1 className="text-3xl font-black text-black mt-1">동아리방 예약</h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="flex flex-col gap-2 font-bold text-gray-dark">
                학번
                <input
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                  placeholder="20260000"
                />
              </label>
              <label className="flex flex-col gap-2 font-bold text-gray-dark">
                이름
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                  placeholder="홍길동"
                />
              </label>
              <label className="flex flex-col gap-2 font-bold text-gray-dark">
                예약 시간
                <input
                  required
                  type="datetime-local"
                  value={form.reserved_at}
                  onChange={(e) => setForm({ ...form, reserved_at: e.target.value })}
                  className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                />
              </label>
              <label className="flex flex-col gap-2 font-bold text-gray-dark">
                사용 인원
                <input
                  required
                  min="1"
                  type="number"
                  value={form.participant_count}
                  onChange={(e) => setForm({ ...form, participant_count: e.target.value })}
                  className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-2 font-bold text-gray-dark">
                사용 목적
                <textarea
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium h-32 resize-none"
                  placeholder="스터디, 회의, 프로젝트 작업 등"
                />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {submitting ? '예약 중...' : '예약하기'}
                </button>
              </div>
            </form>
          </motion.section>

          <motion.aside
            className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="p-6 border-b border-border bg-bg-subtle/60 flex items-center justify-between">
              <h2 className="font-black text-black text-xl">예약 현황</h2>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {upcomingReservations.length}건
              </span>
            </div>
            {loading ? (
              <div className="p-10 text-center text-gray-dark">불러오는 중...</div>
            ) : upcomingReservations.length === 0 ? (
              <div className="p-10 text-center text-gray-dark">예정된 예약이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingReservations.map((item) => (
                  <li key={item.id} className="p-5 hover:bg-bg-subtle/60 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-black">
                          {new Date(item.reserved_at).toLocaleString()}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-dark">
                          <span>{item.name}</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {item.participant_count}명
                          </span>
                        </div>
                        {item.purpose && (
                          <p className="mt-2 text-sm text-gray-dark line-clamp-2">{item.purpose}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        </div>
      </div>
    </PageTransition>
  );
};

export default Reserve;
