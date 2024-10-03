const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'public', 'css');

// Ensure the directory exists
if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
}

exec('stylus -c ./style/main.styl --out public/css/', (err, stdout, stderr) => {
    if (err) {
        console.error(`Error: ${stderr}`);
        process.exit(1);
    }
    console.log('Compile stylus completed!');
    console.log(stdout);
});