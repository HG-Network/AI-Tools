const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/build-apk', upload.fields([
  { name: 'appIcon' },
  { name: 'keystoreFile' }
]), async (req, res) => {
  const data = req.body;
  const appIcon = req.files['appIcon']?.[0];
  const keystore = req.files['keystoreFile']?.[0];

  const projectDir = path.join(__dirname, 'temp', `app_${Date.now()}`);
  fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(path.join(projectDir, 'AndroidManifest.xml'), `
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${data.packageName || 'com.example.app'}">
    <application
        android:label="${data.appName}"
        android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
  `);

  const buildCmd = `./gradlew assembleRelease`; // Simulated command

  exec(buildCmd, { cwd: projectDir }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).send(`Build failed: ${stderr}`);
    }
    const apkPath = path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    res.download(apkPath, `${data.appName.replace(/\s+/g, '_')}.apk`);
  });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
