import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../");
const apkSourcePath = path.resolve(rootDir, "client/android/app/build/outputs/apk/debug/app-debug.apk");
const apkDestPath = path.resolve(rootDir, "OmniBid-India-Sandbox.apk");

console.log("=== OmniBid India APK Extractor ===");
console.log(`Searching for compiled APK at:\n  ${apkSourcePath}\n`);

if (fs.existsSync(apkSourcePath)) {
  try {
    fs.copyFileSync(apkSourcePath, apkDestPath);
    console.log("🎉 SUCCESS!");
    console.log(`Copied and renamed APK to:\n  ${apkDestPath}`);
    console.log("\nYou can now transfer OmniBid-India-Sandbox.apk to your Android phone!");
  } catch (err) {
    console.error("❌ Failed to copy APK file:", err.message);
  }
} else {
  console.log("⚠️  APK FILE NOT FOUND YET!");
  console.log("This is expected if you haven't compiled the application in Android Studio yet.");
  console.log("\nNext Steps:");
  console.log("1. Open Android Studio via: npx cap open android");
  console.log("2. In Android Studio, go to: Build > Build Bundle(s) / APK(s) > Build APK(s)");
  console.log("3. Once the build finishes, run this script again:");
  console.log("   node scratch/extract-apk.js");
}
