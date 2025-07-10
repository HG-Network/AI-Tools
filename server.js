const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/build-apk', upload.fields([
  { name: 'appIcon' },
  { name: 'keystoreFile' }
]), async (req, res) => {
  try {
    const data = req.body;
    const appIcon = req.files['appIcon']?.[0];
    const keystore = req.files['keystoreFile']?.[0];
    const timestamp = Date.now();
    const cleanPackage = (data.packageName || 'com.example.app').toLowerCase();
    const appName = data.appName || 'MyApp';
    const outFolder = path.join(__dirname, 'temp', `app_${timestamp}`);
    const javaPath = path.join(outFolder, 'app', 'src', 'main', 'java', ...cleanPackage.split('.'));

    fs.mkdirSync(javaPath, { recursive: true });

    // Write settings.gradle
    fs.writeFileSync(path.join(outFolder, 'settings.gradle'), 'rootProject.name = "GeneratedApp"');

    // Write root build.gradle
    fs.writeFileSync(path.join(outFolder, 'build.gradle'), `
buildscript {
    repositories { google(); jcenter() }
    dependencies { classpath 'com.android.tools.build:gradle:7.0.2' }
}
allprojects { repositories { google(); jcenter() } }
    `);

    // Write app/build.gradle
    fs.mkdirSync(path.join(outFolder, 'app'), { recursive: true });
    fs.writeFileSync(path.join(outFolder, 'app', 'build.gradle'), `
apply plugin: 'com.android.application'

android {
    compileSdkVersion 33
    defaultConfig {
        applicationId "${cleanPackage}"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
    `);

    // Write AndroidManifest.xml
    const manifestDir = path.join(outFolder, 'app', 'src', 'main');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'AndroidManifest.xml'), `
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${cleanPackage}">
    <application android:label="${appName}" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
    `);

    // Write MainActivity.java
    fs.writeFileSync(path.join(javaPath, 'MainActivity.java'), `
package ${cleanPackage};
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.webkit.WebView;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView wv = new WebView(this);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.loadUrl("https://example.com");
        setContentView(wv);
    }
}
    `);

    // Add dummy icon
    const iconDir = path.join(manifestDir, 'res', 'mipmap-anydpi-v26');
    fs.mkdirSync(iconDir, { recursive: true });
    const iconPath = path.join(iconDir, 'ic_launcher.png');
    fs.copyFileSync(appIcon?.path || path.join(__dirname, 'default_icon.png'), iconPath);

    // Write gradle-wrapper.properties & wrapper jar
    // You can bundle wrapper manually or require gradle globally
    execSync('gradle wrapper', { cwd: outFolder });

    // Optional signing config
    if (keystore) {
      fs.mkdirSync(path.join(outFolder, 'keystore'), { recursive: true });
      const keystorePath = path.join(outFolder, 'keystore', keystore.originalname);
      fs.renameSync(keystore.path, keystorePath);
    }

    // Run Gradle build
    execSync('./gradlew assembleRelease', { cwd: outFolder, stdio: 'inherit' });

    const apkPath = path.join(outFolder, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    res.download(apkPath, `${appName.replace(/\s+/g, '_')}.apk`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Build failed: ' + err.message);
  }
});

app.listen(3000, () => console.log('✅ APK server running at http://localhost:3000'));
