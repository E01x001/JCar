# Android Production Release Build Guide

This guide explains how to generate a production release build for the JCar Android application.

## Prerequisites

- Java 17 or higher installed
- Android Studio or Android SDK command-line tools
- Access to the project's signing keystore

## Step 1: Generate Upload Keystore (One-time setup)

If you don't have a keystore yet, generate one using `keytool`:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore jcar-upload-key.keystore -alias jcar-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important Security Notes:**
- Choose a strong password for the keystore
- Choose a strong password for the key
- Store these passwords securely (use a password manager)
- Never commit the keystore file to version control
- Backup the keystore file in a secure location

## Step 2: Configure Keystore Credentials

### Option A: Using gradle.properties (Recommended for CI/CD)

Create `android/gradle.properties` with the following content:

```properties
MYAPP_UPLOAD_STORE_FILE=jcar-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=jcar-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password_here
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password_here
```

### Option B: Using Environment Variables

Set the following environment variables:

```bash
export MYAPP_UPLOAD_STORE_FILE=jcar-upload-key.keystore
export MYAPP_UPLOAD_KEY_ALIAS=jcar-key-alias
export MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password_here
export MYAPP_UPLOAD_KEY_PASSWORD=your_key_password_here
```

## Step 3: Build Release APK or AAB

### Build Android App Bundle (AAB) - Recommended for Google Play

```bash
cd android
./gradlew bundleRelease
```

The signed AAB will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Build APK (Alternative)

```bash
cd android
./gradlew assembleRelease
```

The signed APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

## Step 4: Verify the Build

### Check the Signature

```bash
# For AAB
bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab --output=app.apks --mode=universal
unzip -p app.apks universal.apk | keytool -printcert -jarfile /dev/stdin

# For APK
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
```

### Install on Device (APK only)

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

## Step 5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create a new one)
3. Navigate to Release > Production
4. Create new release
5. Upload the AAB file
6. Complete the release form and submit for review

## Troubleshooting

### "Keystore file not found" error

Ensure the keystore file path in `gradle.properties` is correct relative to the `android/app` directory.

### "Wrong password" error

Double-check that the keystore and key passwords in `gradle.properties` match those you used when creating the keystore.

### ProGuard/R8 Issues

If the release build crashes but debug works fine, check `proguard-rules.pro` for missing keep rules.

## Security Checklist

- [ ] Keystore file is not committed to Git
- [ ] Passwords are not hardcoded in build files
- [ ] Keystore file is backed up securely
- [ ] gradle.properties is in .gitignore
- [ ] Release build has been tested thoroughly
- [ ] All API keys are configured for production
- [ ] Firebase project is set to production mode

## Additional Resources

- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Sign your app](https://developer.android.com/studio/publish/app-signing)
- [R8 Code Shrinking](https://developer.android.com/studio/build/shrink-code)
