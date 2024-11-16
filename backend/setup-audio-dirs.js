// save as setup-audio-dirs.js in your backend folder
const fs = require('fs');
const path = require('path');

const createAudioDirectories = () => {
  const baseDir = path.join(__dirname, 'public', 'audio');
  
  // Create main directories
  const directories = [
    'pretest',
    'posttest',
    ...Array.from({length: 4}, (_, i) => `training/day${i + 1}`)
  ];

  directories.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  });

  console.log('\nDirectory structure created successfully!');
  console.log('\nPlease place your audio files in the following structure:');
  console.log(`
${baseDir}
├── pretest/
│   ├── sample1.wav
│   └── sample2.wav
├── training/
│   ├── day1/
│   │   ├── training1.wav
│   │   └── training2.wav
│   ├── day2/
│   ├── day3/
│   └── day4/
└── posttest/
    ├── post1.wav
    └── post2.wav
  `);
};

createAudioDirectories();