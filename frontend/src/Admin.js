import React, { useState, useEffect } from 'react';
import config from './config';
import { Input } from './components/ui/input';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
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
  // State for new user creation
  const [newUser, setNewUser] = useState({
    userId: '',
    email: '',
    password: '',
    speaker: 'OHSp01',
    currentPhase: 'pretest',
    trainingDay: 1,
    pretestDate: ''
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
        fetch(`${config.API_BASE_URL}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }),
        fetch(`${config.API_BASE_URL}/api/admin/stats`, {
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
    if (!window.confirm(`Are you sure you want to DELETE user ${userId}?

This will:
- Permanently delete the user account
- Remove all response data
- Remove demographics data
- Delete all progress records

This action CANNOT be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}`, {
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

      const response = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}/reset-password`, {
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
      const response = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}/toggle-status`, {
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
  
  // Function to clear user-specific localStorage data
  const clearUserLocalStorage = (userId) => {
    const progressKeys = [
      // Demographics progress
      `progress_${userId}_demographics_demographics`,
      
      // Pretest progress
      `progress_${userId}_pretest_intelligibility`,
      `progress_${userId}_pretest_effort`,
      `progress_${userId}_pretest_comprehension`,
      
      // Training progress
      `progress_${userId}_training_day1`,
      `progress_${userId}_training_day2`,
      `progress_${userId}_training_day3`,
      `progress_${userId}_training_day4`,
      
      // Posttest1 progress
      `progress_${userId}_posttest1_intelligibility`,
      `progress_${userId}_posttest1_effort`,
      `progress_${userId}_posttest1_comprehension`,
      
      // Posttest2 progress
      `progress_${userId}_posttest2_intelligibility`,
      `progress_${userId}_posttest2_effort`,
      `progress_${userId}_posttest2_comprehension`,
      
      // Posttest3 progress
      `progress_${userId}_posttest3_intelligibility`,
      `progress_${userId}_posttest3_effort`,
      `progress_${userId}_posttest3_comprehension`,
      
      // Any user-specific demographics data
      `demographicsCompleted_${userId}`
    ];
    
    let clearedCount = 0;
    
    // Clear each key if it exists
    progressKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    // Clear global demographics flag if this was the current logged in user
    if (localStorage.getItem('userId') === userId && localStorage.getItem('demographicsCompleted') !== null) {
      localStorage.removeItem('demographicsCompleted');
      clearedCount++;
    }
    
    return clearedCount;
  };

  // New function to handle resetting user progress
  const handleResetProgress = async (userId) => {
    // Double confirm this destructive action
    if (!window.confirm(`Are you sure you want to reset ALL progress for user ${userId}? This will:
- Delete all submitted responses
- Delete demographics data
- Reset progress to the beginning
- Clear completed tests
- Clear browser localStorage data for this user

This action cannot be undone.`)) {
      return;
    }
    
    try {
      setModalMessage('Resetting user progress...');
      
      // First, clear localStorage for this specific user
      const clearedItemCount = clearUserLocalStorage(userId);
      console.log(`Cleared ${clearedItemCount} localStorage items for user ${userId}`);
      
      // Then call the server API to reset progress in MongoDB
      const response = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}/reset-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        setModalMessage(`User progress has been reset successfully. Cleared ${clearedItemCount} localStorage items.`);
        await fetchData(); // Refresh the user list
        
        setTimeout(() => {
          setModalMessage('');
          setShowUserModal(false); // Close the modal after success
        }, 2000);
      } else {
        const errorData = await response.json();
        setModalMessage(`Failed to reset user progress: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resetting user progress:', error);
      setModalMessage('Error resetting user progress');
    }
  };

  // New function to handle updating user details
  const handleUpdateUser = async (userId) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}`, {
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

  const handleCreateUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async () => {
    try {
      // Validate required fields
      if (!newUser.userId || !newUser.email || !newUser.password) {
        setModalMessage('User ID, email, and password are required');
        return;
      }

      // Validate email format
      if (!newUser.email.includes('@')) {
        setModalMessage('Please enter a valid email address');
        return;
      }

      // Validate password length
      if (newUser.password.length < 8) {
        setModalMessage('Password must be at least 8 characters');
        return;
      }

      const response = await fetch(`${config.API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        setModalMessage('User created successfully');
        // Reset form
        setNewUser({
          userId: '',
          email: '',
          password: '',
          speaker: 'OHSp01',
          currentPhase: 'pretest',
          trainingDay: 1,
          pretestDate: ''
        });
        
        // Close modal after a delay
        setTimeout(() => {
          setShowCreateUserModal(false);
          setModalMessage('');
          fetchData(); // Refresh the user list
        }, 2000);
      } else {
        setModalMessage(`Failed to create user: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setModalMessage('Error creating user');
    }
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

        console.log('Initiating download from:', url);
        
        // Create a direct XHR request with proper headers
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.responseType = 'blob';
        
        xhr.onload = function() {
          if (this.status === 200) {
            // Create a download link and trigger it
            const blob = new Blob([this.response], { type: xhr.getResponseHeader('Content-Type') });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
          } else {
            console.error('Download failed with status:', this.status);
            alert(`Download failed: ${this.statusText || 'Server error'}`);
          }
        };
        
        xhr.onerror = function() {
          console.error('XHR error occurred');
          alert('Download failed. Network error or CORS issue.');
        };
        
        // Start the download
        xhr.send();
      } catch (error) {
        console.error('Download error:', error);
        alert(`Failed to download: ${error.message}`);
      }
    };

    const [isExporting, setIsExporting] = useState({
      responses: false,
      users: false,
      all: false,
      demographics: false
    });
    
    const handleExport = async (type, url, filename) => {
      // Set loading state for the specific export
      setIsExporting(prev => ({ ...prev, [type]: true }));
      
      try {
        await downloadFile(url, filename);
      } catch (error) {
        console.error(`Error exporting ${type}:`, error);
      } finally {
        // Reset loading state after a delay
        setTimeout(() => {
          setIsExporting(prev => ({ ...prev, [type]: false }));
        }, 1000);
      }
    };
    
    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleExport('responses', `${config.API_BASE_URL}/api/admin/export/responses`, 'responses.csv')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center"
          disabled={isExporting.responses}
        >
          {isExporting.responses ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Exporting...
            </>
          ) : "Export Responses"}
        </button>
        
        <button
          onClick={() => handleExport('users', `${config.API_BASE_URL}/api/admin/export/users`, 'users.csv')}
          className="bg-[#406368] hover:bg-[#6c8376] text-white px-4 py-2 rounded flex items-center justify-center"
          disabled={isExporting.users}
        >
          {isExporting.users ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Exporting...
            </>
          ) : "Export Users"}
        </button>
        
        <button
          onClick={() => handleExport('demographics', `${config.API_BASE_URL}/api/admin/export/demographics`, 'demographics.csv')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center justify-center"
          disabled={isExporting.demographics}
        >
          {isExporting.demographics ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Exporting...
            </>
          ) : "Export Demographics"}
        </button>
        
        <button
          onClick={() => handleExport('all', `${config.API_BASE_URL}/api/admin/export/all`, 'all_data.zip')}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex items-center justify-center"
          disabled={isExporting.all}
        >
          {isExporting.all ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Exporting...
            </>
          ) : "Export All Data (ZIP)"}
        </button>
      </div>
    );
  };

  const UserModal = ({ user }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit User: {user.userId}</h2>
        <p className="text-sm text-gray-600 mb-4">You can update user details including email, speaker ID, and progress information.</p>

        {modalMessage && (
          <div className="mb-4 p-2 bg-[#f3ecda] text-[#406368] rounded">
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
                  Email Address <span className="text-xs text-blue-600">(editable)</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={editedUser.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-2 border-blue-200 focus:border-blue-500"
                  placeholder="Enter user's email address"
                />
                <p className="text-xs text-gray-500 mt-1">Change the email address and click "Update User Details" to save.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Speaker ID <span className="text-xs text-blue-600">(editable)</span>
                </label>
                <Input
                  type="text"
                  name="speaker"
                  value={editedUser.speaker}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-2 border-blue-200 focus:border-blue-500"
                  placeholder="Enter speaker ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Phase <span className="text-xs text-blue-600">(editable)</span>
                </label>
                <select
                  name="currentPhase"
                  value={editedUser.currentPhase}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border-2 border-blue-200 focus:border-blue-500 rounded"
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
                  Training Day <span className="text-xs text-blue-600">(editable)</span>
                </label>
                <Input
                  type="number"
                  name="trainingDay"
                  min="1"
                  max="4"
                  value={editedUser.trainingDay}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-2 border-blue-200 focus:border-blue-500"
                  placeholder="Enter training day (1-4)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pretest Date <span className="text-xs text-blue-600">(editable)</span>
                </label>
                <Input
                  type="date"
                  name="pretestDate"
                  value={editedUser.pretestDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-2 border-blue-200 focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => handleUpdateUser(user.userId)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Save User Details
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
                {/* Using a properly managed form to avoid focus issues */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword(user.userId);
                }}>
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="submit"
                      className="mt-1 bg-[#406368] text-white px-4 py-2 rounded hover:bg-[#6c8376]"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
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

          {/* Reset User Progress Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4">Reset User Progress</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded border border-yellow-300">
                <p className="text-sm text-yellow-800">
                  This action will reset the user to the beginning state as if they hadn't done anything
                  in the app yet. It will:
                </p>
                <ul className="mt-2 text-sm text-yellow-800 list-disc pl-5">
                  <li>Delete all response records from the database</li>
                  <li>Delete demographics data from the database</li>
                  <li>Reset progress to pretest phase</li>
                  <li>Clear all completed tests</li>
                  <li>Clear localStorage progress data in this browser</li>
                </ul>
                <p className="mt-2 text-sm text-yellow-800">
                  <strong>Note:</strong> The localStorage data is only cleared on this browser. If users 
                  are accessing the app from different devices or browsers, they may need to clear their 
                  localStorage there as well or log out and log back in.
                </p>
                <p className="mt-2 text-sm text-yellow-800 font-bold">
                  This cannot be undone!
                </p>
              </div>

              <button
                onClick={() => handleResetProgress(user.userId)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Reset User Progress
              </button>
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

  const CreateUserModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New User</h2>

        {modalMessage && (
          <div className="mb-4 p-2 bg-[#f3ecda] text-[#406368] rounded">
            {modalMessage}
          </div>
        )}

        <div className="space-y-4">
          {/* Basic User Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              User ID *
            </label>
            <Input
              type="text"
              name="userId"
              value={newUser.userId}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
              placeholder="e.g., john_smith"
            />
            <p className="text-xs text-gray-500 mt-1">Required. Will be used for login.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <Input
              type="email"
              name="email"
              value={newUser.email}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <Input
              type="password"
              name="password"
              value={newUser.password}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
          </div>

          {/* Additional Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Speaker ID
            </label>
            <Input
              type="text"
              name="speaker"
              value={newUser.speaker}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
              placeholder="e.g., OHSp01"
            />
            <p className="text-xs text-gray-500 mt-1">Default: OHSp01</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Phase
            </label>
            <select
              name="currentPhase"
              value={newUser.currentPhase}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full p-2 border rounded"
            >
              <option value="pretest">Pretest</option>
              <option value="training">Training</option>
              <option value="posttest1">Posttest 1</option>
              <option value="posttest2">Posttest 2</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Training Day
            </label>
            <Input
              type="number"
              name="trainingDay"
              min="1"
              max="4"
              value={newUser.trainingDay}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pretest Date
            </label>
            <Input
              type="date"
              name="pretestDate"
              value={newUser.pretestDate}
              onChange={handleCreateUserChange}
              className="mt-1 block w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to set when user starts pretest.</p>
          </div>

          <div className="flex space-x-2 pt-4">
            <button
              onClick={() => {
                setShowCreateUserModal(false);
                setModalMessage('');
              }}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              className="flex-1 bg-[#406368] text-white px-4 py-2 rounded hover:bg-[#6c8376]"
            >
              Create User
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => setShowCreateUserModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create User
        </button>
      </div>

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
                Progress & Dates
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
                      Day: {user.trainingDay}<br />
                      {user.pretestDate && (
                        <>Pretest: {new Date(user.pretestDate).toLocaleDateString()}</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-[#406368] hover:text-[#6c8376]"
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
        className="mt-4 bg-[#406368] text-white px-4 py-2 rounded hover:bg-[#6c8376]"
      >
        Refresh Data
      </button>

      {/* Add Export Buttons */}
      <ExportButtons />

      {showUserModal && selectedUser && (
        <UserModal user={selectedUser} />
      )}

      {showCreateUserModal && (
        <CreateUserModal />
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