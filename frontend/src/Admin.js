import React, { useState, useEffect } from 'react';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/admin/users'),
        fetch('http://localhost:3000/api/admin/stats')
      ]);
      
      const [usersData, statsData] = await Promise.all([
        usersResponse.json(),
        statsResponse.json()
      ]);
      
      setUsers(usersData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete user ${userId}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
        alert('User deleted successfully');
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        setModalMessage('Password reset successfully');
        setNewPassword('');
        setTimeout(() => {
          setShowUserModal(false);
          setModalMessage('');
        }, 2000);
      } else {
        setModalMessage('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setModalMessage('Error resetting password');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/toggle-status`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchData();
        alert(`User ${currentStatus ? 'suspended' : 'activated'} successfully`);
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };
  
  
  
  const ExportButtons = () => (
    <div className="mt-8 space-x-4">
      <button
        onClick={() => window.location.href = 'http://localhost:3000/api/admin/export/responses'}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        Export Responses
      </button>
      <button
        onClick={() => window.location.href = 'http://localhost:3000/api/admin/export/users'}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Export Users
      </button>
      <button
        onClick={() => window.location.href = 'http://localhost:3000/api/admin/export/all'}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
      >
        Export All Data (ZIP)
      </button>
    </div>
  );

  const UserModal = ({ user }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Manage User: {user.userId}</h2>
        
        {modalMessage && (
          <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded">
            {modalMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="Enter new password"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleResetPassword(user.userId)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Reset Password
            </button>
            <button
              onClick={() => setShowUserModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Statistics Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-2xl">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Completed Users</h3>
            <p className="text-2xl">{stats.completedUsers}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Users by Phase</h3>
            {stats.usersByPhase.map(phase => (
              <div key={phase._id} className="flex justify-between">
                <span>{phase._id || 'N/A'}</span>
                <span>{phase.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Updated Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">{user.userId}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    Phase: {user.currentPhase}<br/>
                    Day: {user.trainingDay}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user.userId, user.isActive)}
                      className={`${
                        user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.userId)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={fetchData}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Refresh Data
      </button>
      
      {/* Add Export Buttons */}
      <ExportButtons />

      {showUserModal && selectedUser && (
        <UserModal user={selectedUser} />
      )}
    </div>
  );
};

export default Admin;