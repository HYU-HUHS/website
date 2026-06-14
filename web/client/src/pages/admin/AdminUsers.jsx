import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { apiRequest } from '../../lib/api';
import { ArrowLeft, User } from 'lucide-react';

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
        try {
            const payload = await apiRequest('/admin/users');
            setUsers(payload.data || []);
        } catch (error) {
            alert(error.message);
        }
        setLoading(false);
    };

    // 깜빡임 없는 조용한 갱신
    const fetchUsersSilently = async () => {
        try {
            const payload = await apiRequest('/admin/users');
            setUsers(payload.data || []);
        } catch (error) {
            alert(error.message);
        }
    };

    // 회원 등급(Role) 변경 핸들러
    const handleRoleChange = async (userId, newRole) => {
        if (!confirm('해당 회원의 등급을 변경하시겠습니까?')) {
            fetchUsersSilently(); // 취소 시 원래 UI(select 값)로 되돌리기 위함
            return;
        }

        try {
            await apiRequest(`/admin/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole }),
            });
            alert('등급이 변경되었습니다.');
            fetchUsersSilently();
        } catch (error) {
            alert('오류 발생: ' + error.message);
            fetchUsersSilently();
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
                                        <th className="p-4 font-semibold text-gray-600">유저 타입</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 font-bold text-gray-800">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    {user.name || '이름 없음'}
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {user.student_id || '학번 없음'} · {user.major || '학과 없음'}
                                                </p>
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
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : user.role === 'member'
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : 'bg-gray-100 text-gray-600 border-gray-300'
                                                        }`}
                                                >
                                                    <option value="admin">관리자</option>
                                                    <option value="member">부원</option>
                                                    <option value="general">일반</option>
                                                </select>
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
