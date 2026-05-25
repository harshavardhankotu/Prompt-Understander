# How to Install & Test OmniBid India Sandbox APK

Follow this concise, 3-step guide to install the native Android application on your physical mobile device and test the live Razorpay Escrow checkout simulation.

---

## 🛠️ Step 1: Transfer the APK to Your Phone
Once you compile your APK in Android Studio and run our extraction script, your APK will be placed in the project root as `OmniBid-India-Sandbox.apk`.
Transfer this file to your phone using any of the following methods:
* **USB Transfer**: Connect your phone to your PC and copy the APK directly into your device's `Downloads` folder.
* **Google Drive / Dropbox**: Upload the APK to your cloud storage from your PC, then open the Drive app on your phone to download it.
* **Email / Chat App**: Email the APK to yourself or send it via WhatsApp Web/Telegram Web to your personal chat, then download the attachment on your phone.

---

## 🔒 Step 2: Enable 'Unknown Sources' & Install
To prevent unauthorized installations, Android blocks apps downloaded outside of the official Google Play Store by default.
1. Locate the downloaded `OmniBid-India-Sandbox.apk` on your phone using your device's **Files / File Manager** app.
2. Tap the APK file.
3. If prompted with a warning saying *"For your security, your phone is not allowed to install unknown apps from this source"*:
   * Tap **Settings** in the dialog.
   * Toggle **Allow from this source** to **ON**.
   * Press **Back** to return to the installer.
4. Tap **Install** and wait for the installation to complete. Tap **Open** to launch **OmniBid India**!

---

## 💳 Step 3: Test the Razorpay Escrow Flow
Now that the native application is running on your phone, test the sandbox payment gateway:
1. Log in to your buyer profile and open a requirements auction page (e.g., ₹46,240 requirement).
2. Tap **Proceed to Checkout** on the escrow card to open our custom Secure Escrow dialog.
3. Tap **Proceed to Checkout** to load the official **Razorpay Checkout SDK**. The native sandbox modal will slide up.
4. Select **Netbanking** (or any mock UPI option) and tap **Success** to simulate a successful transaction.
5. Watch the Razorpay success callback fire:
   * The app will cryptographically verify the signature via the Express backend `/api/requirements/:requirementId/payment/verify-signature` endpoint.
   * Upon successful verification, the escrow status instantly updates to **"Held in Escrow"** (blue badge) and a green success toast appears confirming your funds are locked safely!

---

*Need help? If you make changes to the frontend code, remember to run `npx cap sync` in the client directory and rebuild the APK in Android Studio to see the updates on your phone.*
