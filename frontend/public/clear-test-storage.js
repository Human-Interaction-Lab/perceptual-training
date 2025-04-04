// Script to clear localStorage progress data for test users
function clearTestUserProgress() {
  const testUserIds = [
    'test_pretest', 'test_training', 'test_posttest',
    'test_training2',
    'test_pretest1', 'test_pretest2', 'test_pretest3',
    'test_posttest1', 'test_posttest2', 'test_posttest3'
  ];

  console.log('Clearing localStorage progress data for test users...');
  let clearedCount = 0;

  testUserIds.forEach(userId => {
    // Clear any progress keys for this user
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
      `progress_${userId}_posttest2_comprehension`
    ];
    
    progressKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
  });

  // Also set the userId to null to force re-login
  localStorage.removeItem('userId');
  localStorage.removeItem('token');
  localStorage.removeItem('username');

  console.log(`Cleared ${clearedCount} localStorage items for test users`);
  alert(`Cleared ${clearedCount} localStorage progress items for test users.`);
  return clearedCount;
}

// Auto-execute when the script loads
clearTestUserProgress();