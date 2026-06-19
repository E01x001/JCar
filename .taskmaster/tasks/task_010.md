# Task ID: 10

**Title:** Prepare Android for Production Release

**Status:** done

**Dependencies:** 1 ✓, 3 ✓

**Priority:** medium

**Description:** Configure the Android project for a production release, including setting up app signing, enabling code shrinking, and generating a signed Android App Bundle (AAB).

**Details:**

1. **Keystore**: Generate a private signing key using `keytool`. Store the keystore file and its credentials securely (e.g., using environment variables or a secret manager), not in the repository. 2. **Gradle Configuration**: In `android/app/build.gradle`, create a signing configuration that loads the keystore credentials. Apply this signing config to the `release` build type. 3. **ProGuard/R8**: Enable code shrinking and obfuscation for the release build by setting `minifyEnabled true` in the `release` build type. Add any necessary ProGuard rules to `proguard-rules.pro` to prevent vital code from being stripped. 4. **Generate AAB**: Run the command `./gradlew bundleRelease` from the `android` directory to generate the signed AAB file, which will be located in `android/app/build/outputs/bundle/release/`.

**Test Strategy:**

1. Install the generated release AAB on a physical device to ensure it runs without crashing (which could indicate incorrect ProGuard rules). 2. Test core application flows like login, vehicle browsing, and consultation requests on the release build. 3. Upload the AAB to an internal testing track on the Google Play Console to verify it's correctly signed and configured.

## Subtasks

### 10.1. Generate Android Upload Keystore

**Status:** done  
**Dependencies:** None  

Create a new private signing key using the 'keytool' utility. This key is essential for signing the production release of the Android application and uploading it to the Google Play Store.

**Details:**

Use the Java `keytool` command-line tool to generate a new `.keystore` file. The command will be similar to `keytool -genkeypair -v -keystore jcar-upload-key.keystore -alias jcar_upload_alias -keyalg RSA -keysize 2048 -validity 10000`. Store the generated `jcar-upload-key.keystore` file in a secure location outside of the project's version-controlled directory.

### 10.2. Securely Configure Keystore Credentials

**Status:** done  
**Dependencies:** 10.1  

Store the keystore password, key alias, and key password securely so they can be accessed by the Gradle build process without being committed to version control.

**Details:**

Create or edit the `android/gradle.properties` file to store the credentials. Add the following properties: `JCAR_UPLOAD_STORE_FILE=path/to/your/jcar-upload-key.keystore`, `JCAR_UPLOAD_KEY_ALIAS=jcar_upload_alias`, `JCAR_UPLOAD_STORE_PASSWORD=your_store_password`, and `JCAR_UPLOAD_KEY_PASSWORD=your_key_password`. Ensure that `gradle.properties` is included in the root `.gitignore` file to prevent it from being committed.

### 10.3. Configure Release Signing in build.gradle

**Status:** done  
**Dependencies:** 10.2  

Modify the `android/app/build.gradle` file to read the secure credentials from `gradle.properties` and apply the signing configuration to the `release` build type.

**Details:**

In `android/app/build.gradle`, define a `signingConfigs` block for `release` that reads the properties set in the previous task. The configuration should look like: `storeFile file(JCAR_UPLOAD_STORE_FILE)`, `storePassword JCAR_UPLOAD_STORE_PASSWORD`, etc. Then, within the `buildTypes.release` block, set `signingConfig signingConfigs.release`.

### 10.4. Enable Code Shrinking and Obfuscation with R8

**Status:** done  
**Dependencies:** 10.3  

Enable R8 for the release build to reduce app size, remove unused code, and obfuscate class and method names, which enhances security.

**Details:**

In the `release` build type within `android/app/build.gradle`, set `minifyEnabled true` and `shrinkResources true`. Check for any third-party libraries that might require specific rules to function correctly after minification. Add any necessary `-keep` rules to the `android/app/proguard-rules.pro` file to prevent critical code from being stripped.

### 10.5. Generate and Verify Signed Android App Bundle (AAB)

**Status:** done  
**Dependencies:** 10.4  

Execute the final Gradle command to build the signed Android App Bundle (AAB) and perform a verification test on a physical device to ensure its integrity and functionality.

**Details:**

Navigate to the `android` directory in your terminal and run the command `./gradlew bundleRelease`. This command will compile the code, run R8, and sign the application, producing the final AAB file located at `android/app/build/outputs/bundle/release/app-release.aab`.
