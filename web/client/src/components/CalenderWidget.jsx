import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // 기본 스타일 불러오기
import { format } from 'date-fns'; // 날짜 포맷팅 도구
import { supabase } from '../lib/supabase';

function CalendarWidget() {
    const [date, setDate] = useState(new Date()); // 선택된 날짜
    const [schedules, setSchedules] = useState([]); // 전체 일정 목록
    const [isAdmin, setIsAdmin] = useState(false); // 관리자 여부
    const [newEventTitle, setNewEventTitle] = useState(""); // 새 일정 입력값

    // 👇 아까 그 관리자 이메일!
    const ADMIN_EMAIL = "admin@example.com";

    useEffect(() => {
        fetchSchedules();
        checkUser();
    }, []);

    // 1. 관리자 체크
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === ADMIN_EMAIL) setIsAdmin(true);
    };

    // 2. 일정 가져오기
    const fetchSchedules = async () => {
        const { data, error } = await supabase.from('schedules').select('*');
        if (error) console.error(error);
        else setSchedules(data);
    };

    // 3. 일정 추가하기 (관리자용)
    const addSchedule = async () => {
        if (!newEventTitle) return;
        const dateStr = format(date, 'yyyy-MM-dd'); // '2026-01-29' 형식으로 변환

        const { error } = await supabase
            .from('schedules')
            .insert([{ title: newEventTitle, date: dateStr }]);

        if (error) alert("일정 추가 실패");
        else {
            setNewEventTitle("");
            fetchSchedules(); // 목록 새로고침
        }
    };

    // 4. 달력 날짜칸에 점(dot) 찍기 (일정 있는 날 표시)
    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (schedules.find(s => s.date === dateStr)) {
                return <div className="flex justify-center mt-1"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>;
            }
        }
    };

    // 선택된 날짜의 일정 찾기
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    const todayEvents = schedules.filter(s => s.date === selectedDateStr);

    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            {/* 왼쪽: 달력 */}
            <div className="flex-1 bg-white rounded-2xl p-4 text-black shadow-inner">
                <Calendar
                    onChange={setDate}
                    value={date}
                    tileContent={tileContent} // 점 찍기 함수 연결
                    className="w-full border-none !font-sans"
                />
            </div>

            {/* 오른쪽: 일정 목록 & 추가 */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        📅 {format(date, 'M월 d일')} 일정
                    </h3>
                    <ul className="space-y-2">
                        {todayEvents.length === 0 ? (
                            <li className="text-gray-400 text-sm">등록된 일정이 없습니다.</li>
                        ) : (
                            todayEvents.map(event => (
                                <li key={event.id} className="bg-gray-800 bg-opacity-50 px-3 py-2 rounded-lg border border-gray-700">
                                    {event.title}
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* 관리자만 보이는 입력창 */}
                {isAdmin && (
                    <div className="mt-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                        <p className="text-xs text-gray-300 mb-1">👑 관리자 모드: 일정 추가</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newEventTitle}
                                onChange={(e) => setNewEventTitle(e.target.value)}
                                placeholder="일정 이름"
                                className="flex-1 px-3 py-1 rounded text-black text-sm focus:outline-none"
                            />
                            <button
                                onClick={addSchedule}
                                className="bg-blue-600 px-3 py-1 rounded text-sm font-bold hover:bg-blue-500 transition"
                            >
                                +
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CalendarWidget;
