# JCar Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Firestore Indexes](#firestore-indexes)
4. [Android Build](#android-build)
5. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Tools
- **Node.js**: v18+ (LTS recommended)
- **React Native CLI**: `npm install -g react-native-cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- **Android Studio**: Latest stable version
- **Java JDK**: 17 or higher
- **Git**: For version control

### Firebase Project
- Active Firebase project with:
  - Authentication enabled (Email/Password, Phone)
  - Firestore Database in production mode
  - Cloud Storage bucket
  - Cloud Functions deployed (optional)

---

## Firebase Setup

### 1. Authentication

Ensure Firebase Authentication has the following sign-in methods enabled:

- **Email/Password**: For user login
- **Phone**: For Korean phone number verification (requires SafetyNet on Android)

### 2. Firestore Database

#### Security Rules

Deploy security rules from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Verify rules in Firebase Console → Firestore Database → Rules.

#### Composite Indexes

**CRITICAL**: Deploy composite indexes before production deployment to avoid query failures.

```bash
firebase deploy --only firestore:indexes
```

**What this does**:
- Deploys index definitions from `firestore.indexes.json`
- Enables efficient multi-field queries
- Prevents runtime query failures

**Index build time**:
- Empty database: ~5 minutes
- With existing data: Can take hours depending on collection size

**Monitor progress**:
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Firestore Database → Indexes
3. Wait until all indexes show status "Enabled"

**Troubleshooting**:
- If indexes are stuck in "Building" for >24 hours, contact Firebase support
- Check [docs/FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) for detailed index documentation

### 3. Cloud Storage

Configure storage bucket CORS for image uploads:

1. Install gsutil (Google Cloud SDK)
2. Create `cors.json`:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
3. Apply CORS:
   ```bash
   gsutil cors set cors.json gs://your-project-id.appspot.com
   ```

### 4. Cloud Functions (Optional)

If using Firebase Functions for phone number verification:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## Firestore Indexes

### Why Indexes Matter

JCar uses complex Firestore queries that require composite indexes:
- Consultation filtering by status + date
- User-specific consultation lists
- Time conflict detection
- Vehicle ownership history

**Without these indexes, the app will fail in production.**

### Deployment Steps

1. **Review index definitions**:
   ```bash
   cat firestore.indexes.json
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Verify in console**:
   - Go to Firebase Console → Firestore Database → Indexes
   - Confirm all 7 indexes are present and "Enabled"

4. **Test queries**:
   - Run app in production mode
   - Test all consultation list screens
   - Check admin dashboard loads correctly
   - Verify vehicle listings work

### Index List

The following indexes are deployed (see [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) for details):

1. `consultation_requests`: consultationStatus + createdAt
2. `consultation_requests`: userId + createdAt
3. `consultation_requests`: vehicleId + preferredDate + preferredTime
4. `consultation_requests`: type + consultationStatus + createdAt
5. `vehicles`: sellerId + createdAt
6. `vehicles`: status + createdAt
7. `ownership_transfers`: vehicleId + transferredAt

---

## Android Build

### Development Build

```bash
# Start Metro bundler
npm start

# In a new terminal, build and run on emulator/device
npm run android
```

### Production Release Build

#### 1. Generate Release Key

**First time only**:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore jcar-release.keystore -alias jcar-key -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Store the keystore file and password securely. Loss of keystore means you cannot update the app on Play Store.

#### 2. Configure Gradle

Edit `android/gradle.properties`:

```properties
JCAR_RELEASE_STORE_FILE=jcar-release.keystore
JCAR_RELEASE_KEY_ALIAS=jcar-key
JCAR_RELEASE_STORE_PASSWORD=your_keystore_password
JCAR_RELEASE_KEY_PASSWORD=your_key_password
```

**Security**: Add `gradle.properties` to `.gitignore` to prevent committing credentials.

#### 3. Build AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

#### 4. Build APK (for Direct Distribution)

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Testing Release Build

Install APK on device:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Test thoroughly**:
- All authentication flows
- Vehicle registration and approval
- Consultation request and approval
- Image uploads
- Admin dashboard functionality

---

## Production Checklist

### Pre-Deployment

- [ ] **Firebase Indexes Deployed**: `firebase deploy --only firestore:indexes`
- [ ] **Firestore Rules Deployed**: `firebase deploy --only firestore:rules`
- [ ] **Storage CORS Configured**: Images can be uploaded and viewed
- [ ] **Cloud Functions Deployed** (if applicable)
- [ ] **Environment Variables Set**: API keys, project IDs correct
- [ ] **Release Build Tested**: APK/AAB installed and tested on real device

### Firebase Configuration

- [ ] **Authentication Methods Enabled**: Email/Password, Phone
- [ ] **SafetyNet Configured**: For Android phone verification
- [ ] **Firestore Security Rules**: Verified and restrictive
- [ ] **Storage Security Rules**: Configured for authenticated uploads only
- [ ] **Firestore Indexes**: All showing "Enabled" status
- [ ] **Usage Limits Reviewed**: Firestore, Storage, Functions quotas adequate

### App Configuration

- [ ] **google-services.json**: Production Firebase project config in `android/app/`
- [ ] **App Version**: Updated in `android/app/build.gradle` (versionCode, versionName)
- [ ] **Package Name**: Matches Firebase project (`com.jcarplatform.jcar`)
- [ ] **Signing Config**: Release keystore configured correctly
- [ ] **ProGuard**: Enabled and tested (if using code obfuscation)
- [ ] **Permissions**: Only necessary permissions in AndroidManifest.xml

### Testing

- [ ] **Authentication**: Email, phone verification working
- [ ] **Vehicle CRUD**: Create, read, update, delete operations
- [ ] **Consultation Flow**: Request → Approve → Complete → Archive
- [ ] **Admin Functions**: All admin screens and actions tested
- [ ] **Image Upload**: Photos upload and display correctly
- [ ] **Network Error Handling**: Offline behavior tested
- [ ] **Performance**: Smooth scrolling, no memory leaks
- [ ] **Crash Reporting**: Firebase Crashlytics receiving logs

### Play Store Submission

- [ ] **Privacy Policy**: URL configured in Play Console
- [ ] **App Description**: Korean and English versions prepared
- [ ] **Screenshots**: Recent screenshots from production build
- [ ] **Feature Graphic**: 1024x500 banner image
- [ ] **Content Rating**: Questionnaire completed
- [ ] **Target API Level**: Meets Google Play requirements (API 33+ for 2024)
- [ ] **App Bundle**: Uploaded to Google Play Console

---

## Post-Deployment

### Monitoring

1. **Firebase Console**:
   - Monitor Firestore usage and costs
   - Check Cloud Functions execution logs
   - Review Authentication user counts

2. **Crashlytics**:
   - Monitor crash-free users percentage
   - Review crash reports and fix critical issues

3. **Play Console**:
   - Monitor app ratings and reviews
   - Check ANR (Application Not Responding) reports
   - Review user feedback

### Maintenance

- **Weekly**: Review Firestore usage and optimize expensive queries
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and update Firebase Security Rules

---

## Rollback Procedures

### Firebase

- **Rules**: Use Firebase Console to restore previous rule version
- **Indexes**: Cannot be rolled back; deploy corrected version
- **Functions**: Redeploy previous function version

### Android App

- **Play Store**: Cannot unpublish; submit hotfix update instead
- **Users**: Encourage update through in-app messaging

---

## Common Issues

### Firestore Queries Failing

**Symptom**: App crashes or shows empty lists

**Solution**:
1. Check Firebase Console → Firestore → Indexes
2. Ensure all indexes are "Enabled", not "Building"
3. Redeploy indexes: `firebase deploy --only firestore:indexes`

### Phone Authentication Not Working

**Symptom**: SMS not received or verification fails

**Solution**:
1. Verify SHA-1/SHA-256 keys registered in Firebase Console
2. Check SafetyNet API is enabled in Google Cloud Console
3. Test with Firebase Test Phone Numbers first

### Image Upload Failures

**Symptom**: Images not uploading or displaying

**Solution**:
1. Check Storage CORS configuration
2. Verify Storage Security Rules allow authenticated uploads
3. Test with Firebase Storage Emulator first

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Deployment Guide](https://reactnative.dev/docs/signed-apk-android)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Firestore Index Documentation](./FIRESTORE_INDEXES.md)
- [Project Architecture](../CLAUDE.md)

---

## Support

For deployment issues:
1. Check Firebase Console logs
2. Review [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) for index-specific issues
3. Consult [CLAUDE.md](../CLAUDE.md) for architecture context
4. Contact development team

---

**Last Updated**: 2025-12-17
**JCar Version**: 1.0.0
