const fs = require('fs');
const path = require('path');

// This script writes a small HTML file that clears localStorage when opened
const html = `
<!DOCTYPE html>
<html>
<head>
  <script>
    localStorage.clear();
    sessionStorage.clear();
    window.close();
  </script>
</head>
<body>Clearing storage...</body>
</html>
`;

const filePath = path.join(__dirname, 'clear-storage.html');
fs.writeFileSync(filePath, html);

// Open the file in the default browser
const open = require('open');
open(filePath);