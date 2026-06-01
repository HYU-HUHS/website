import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { ArrowLeft, Trash2, Shield, User, UserCheck } from 'lucide-react';

const AdminUsers = () => {
    const { isAdmin, loading: authLoading } = useAdmin();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
        } else if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, authLoading, navigate]);

    // 회원 목록 불러오기
    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            // 💡 본인의 DB 테이블 이름에 맞게 'profiles' 또는 'users'로 변경하세요.
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setUsers(data || []);
        setLoading(false);
    };

    // 깜빡임 없는 조용한 갱신
    const fetchUsersSilently = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setUsers(data || []);
    };

    // 회원 등급(Role) 변경 핸들러
    const handleRoleChange = async (userId, newRole) => {
        if (!confirm('해당 회원의 등급을 변경하시겠습니까?')) {
            fetchUsersSilently(); // 취소 시 원래 UI(select 값)로 되돌리기 위함
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (!error) {
            alert('등급이 변경되었습니다.');
            fetchUsersSilently();
        } else {
            alert('오류 발생: ' + error.message);
            fetchUsersSilently();
        }
    };

    // 회원 삭제(강퇴) 핸들러
    const handleDelete = async (userId) => {
        if (!confirm('정말 이 회원을 삭제(강퇴)하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (!error) {
            alert('회원이 삭제되었습니다.');
            fetchUsersSilently();
        } else {
            alert('오류 발생: ' + error.message);
        }
    };

    if (authLoading || !isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4">
            <div className="max-w-6xl mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center text-gray-500 hover:text-black mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> 대시보드로
                        </button>
                        <h1 className="text-3xl font-bold">회원 관리</h1>
                    </div>
                    <div className="bg-white px-4 py-2 border rounded-lg shadow-sm font-bold">
                        총 회원 <span className="text-blue-600">{users.length}</span>명
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    {loading ? (
                        <p className="text-center text-gray-400 py-10">Loading...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-4 font-semibold text-gray-600">이름</th>
                                        <th className="p-4 font-semibold text-gray-600">이메일</th>
                                        <th className="p-4 font-semibold text-gray-600">가입일</th>
                                        <th className="p-4 font-semibold text-gray-600">권한(등급)</th>
                                        <th className="p-4 font-semibold text-gray-600 text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 font-bold text-gray-800">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    {user.name || user.username || '이름 없음'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">{user.email}</td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={user.role || 'member'}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className={`border rounded-lg px-3 py-1.5 text-sm font-bold outline-none transition-colors cursor-pointer ${user.role === 'admin'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200' // 운영진: 파란색
                                                            : user.role === 'alumni'
                                                                ? 'bg-gray-100 text-gray-600 border-gray-300' // 졸업생: 회색
                                                                : 'bg-green-50 text-green-700 border-green-200' // 정회원: 초록색
                                                        }`}
                                                >
                                                    <option value="admin">운영진</option>
                                                    <option value="member">정회원</option>
                                                    <option value="alumni">졸업생</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="강퇴 및 삭제"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {users.length === 0 && (
                                <p className="text-center text-gray-500 py-10">등록된 회원이 없습니다.</p>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminUsers;