import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

function Exec() {
    const [members, setMembers] = useState([]);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('order', { ascending: true });

        if (error) console.error(error);
        else setMembers(data);
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-bg-subtle pt-32 pb-20 px-6">
                <div className="max-w-350 mx-auto">

                    {/* 타이틀 */}
                    <div className="text-center mb-20">
                        <span className="text-primary font-bold tracking-widest text-sm uppercase">Organization</span>
                        <h1 className="text-4xl font-black mt-4 text-black">
                            우리를 이끄는 사람들
                        </h1>
                        <p className="text-gray-dark mt-4 text-lg">
                            HUHS을 만들어가는 운영진을 소개합니다.
                        </p>
                    </div>

                    {/* 멤버 그리드 (한 줄에 5명 배치) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        {members.length === 0 ? (
                            <p className="text-center col-span-full text-gray-dark bg-white py-10 rounded-2xl border border-gray-border">
                                등록된 멤버가 없습니다.
                            </p>
                        ) : (
                            members.map((member) => (
                                <div key={member.id} className="group bg-white rounded-3xl border border-gray-border hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col hover:-translate-y-2">

                                    {/* 1. 사진 영역 */}
                                    <div className="p-3 w-full">
                                        {/* 사진을 감싸는 둥근 박스 */}
                                        <div className="w-full aspect-4/5 rounded-2xl overflow-hidden bg-gray-light relative">
                                            {member.image_url ? (
                                                <img
                                                    src={member.image_url}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover transition duration-500 transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-light text-5xl">
                                                    😎
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. 텍스트 영역 */}
                                    <div className="px-5 pb-6 pt-2 text-center flex-1 flex flex-col justify-end">
                                        {/* 직책 배지 */}
                                        <div className="mb-3">
                                            <span className="inline-block px-3 py-1 bg-primary-light/10 text-primary-dark text-xs font-bold rounded-full border border-primary-light/30 transition-colors">
                                                {member.role}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors text-black">
                                            {member.name}
                                        </h3>

                                        <p className="text-gray-dark text-xs leading-relaxed line-clamp-2 mt-1">
                                            {member.description || member.group_name}
                                        </p>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </PageTransition>
    );
}

export default Exec;
