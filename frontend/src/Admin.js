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
  // New state for edited user data
  const [editedUser, setEditedUser] = useState({
    email: '',
    trainingDay: 1,
    pretestDate: '',
    currentPhase: '',
    speaker: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // When a user is selected, initialize the form with their current data
  useEffect(() => {
    if (selectedUser) {
      setEditedUser({
        email: selectedUser.email || '',
        trainingDay: selectedUser.trainingDay || 1,
        pretestDate: selectedUser.pretestDate ? new Date(selectedUser.pretestDate).toISOString().split('T')[0] : '',
        currentPhase: selectedUser.currentPhase || 'pretest',
        speaker: selectedUser.speaker || ''
      });
    }
  }, [selectedUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }),
        fetch('http://localhost:3000/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
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
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
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
      if (!newPassword) {
        setModalMessage('Please enter a new password');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        setModalMessage('Password reset successfully');
        setNewPassword('');
        setTimeout(() => {
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
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
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

  // New function to handle updating user details
  const handleUpdateUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(editedUser)
      });

      if (response.ok) {
        setModalMessage('User updated successfully');
        await fetchData(); // Refresh the user list
        setTimeout(() => {
          setModalMessage('');
        }, 2000);
      } else {
        const errorData = await response.json();
        setModalMessage(`Failed to update user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setModalMessage('Error updating user');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const ExportButtons = () => {
    const downloadFile = async (url, filename) => {
      try {
        // Get the admin token from localStorage
        const token = localStorage.getItem('adminToken');

        if (!token) {
          alert('Admin token not found. Please log in again.');
          return;
        }

        console.log('Using admin token:', token.substring(0, 10) + '...');

        // Create a hidden iframe for the download
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Create a form within the iframe for the POST request
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;

        // Add the token as a hidden field
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'adminToken';
        tokenInput.value = token;
        form.appendChild(tokenInput);

        // Submit the form within the iframe
        iframe.contentDocument.body.appendChild(form);
        form.submit();

        // Remove the iframe after a delay to allow download to start
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 5000);

      } catch (error) {
        console.error('Download error:', error);
        alert(`Failed to download: ${error.message}`);
      }
    };

    return (
      <div className="mt-8 space-x-4">
        <button
          onClick={() => downloadFile('http://localhost:3000/api/admin/export/responses', 'responses.csv')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Export Responses
        </button>
        <button
          onClick={() => downloadFile('http://localhost:3000/api/admin/export/users', 'users.csv')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Export Users
        </button>
        <button
          onClick={() => downloadFile('http://localhost:3000/api/admin/export/all', 'all_data.zip')}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
        >
          Export All Data (ZIP)
        </button>
      </div>
    );
  };

  const UserModal = ({ user }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Manage User: {user.userId}</h2>

        {modalMessage && (
          <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded">
            {modalMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* User Details Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4">User Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editedUser.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Speaker ID
                </label>
                <input
                  type="text"
                  name="speaker"
                  value={editedUser.speaker}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Phase
                </label>
                <select
                  name="currentPhase"
                  value={editedUser.currentPhase}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded"
                >
                  <option value="pretest">Pretest</option>
                  <option value="training">Training</option>
                  <option value="posttest1">Posttest 1</option>
                  <option value="posttest2">Posttest 2</option>
                  <option value="posttest3">Posttest 3</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Training Day
                </label>
                <input
                  type="number"
                  name="trainingDay"
                  min="1"
                  max="4"
                  value={editedUser.trainingDay}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pretest Date
                </label>
                <input
                  type="date"
                  name="pretestDate"
                  value={editedUser.pretestDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <button
                onClick={() => handleUpdateUser(user.userId)}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Update User Details
              </button>
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4">Reset Password</h3>
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

              <button
                onClick={() => handleResetPassword(user.userId)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Reset Password
              </button>
            </div>
          </div>

          {/* User Progress Information */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4">User Progress</h3>
            <div className="bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">Status:</div>
                <div>{user.isActive ? 'Active' : 'Suspended'}</div>

                <div className="font-medium">Current Phase:</div>
                <div>{user.currentPhase}</div>

                <div className="font-medium">Training Day:</div>
                <div>{user.trainingDay}</div>

                <div className="font-medium">Completed:</div>
                <div>{user.completed ? 'Yes' : 'No'}</div>

                <div className="font-medium">Created:</div>
                <div>{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={() => setShowUserModal(false)}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
            {stats.usersByPhase && stats.usersByPhase.map(phase => (
              <div key={phase._id || 'unknown'} className="flex justify-between">
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
                Speaker
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
            {users && users.length > 0 ? (
              users.map((user, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.userId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.speaker || 'Not set'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      Phase: {user.currentPhase}<br />
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
                        className={`${user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
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
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center">
                  No users found
                </td>
              </tr>
            )}
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

      {error && (
        <div className="mt-4 bg-red-100 border-l-4 border-red-500 p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default Admin;