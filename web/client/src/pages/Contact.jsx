import { useState } from 'react';
import { Send } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { apiRequest } from '../lib/api';

const initialForm = {
  title: '',
  content: '',
  contact: '',
};

function Contact() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/recruit/inquiry', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert('문의가 등록되었습니다. 운영진이 확인 후 연락드릴게요.');
      setForm(initialForm);
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-4 sm:px-6 font-pretendard">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-border p-8 sm:p-10">
          <div className="text-center mb-10">
            <span className="text-primary font-bold tracking-widest text-sm uppercase">Contact</span>
            <h1 className="text-3xl sm:text-4xl font-black text-black mt-3 mb-3">가입 문의</h1>
            <p className="text-gray-dark">지원, 활동, 스터디와 관련해 궁금한 점을 남겨주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              제목
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                placeholder="문의 제목"
              />
            </label>
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              내용
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium h-44 resize-none"
                placeholder="궁금한 내용을 적어주세요."
              />
            </label>
            <label className="flex flex-col gap-2 font-bold text-gray-dark">
              연락처
              <input
                required
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="p-3 bg-bg-subtle border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-black font-medium"
                placeholder="이메일 또는 전화번호"
              />
            </label>
            <button
              disabled={submitting}
              className="mt-3 inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {submitting ? '등록 중...' : '문의 등록'}
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}

export default Contact;
