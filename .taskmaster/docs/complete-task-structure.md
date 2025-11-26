# JCar Complete Task Structure

**Generated**: 2025-11-27
**Total Tasks**: 10 Main Tasks + 50 Subtasks = 60 Total
**Status**: All Pending (0% Complete)

---

## 📊 Project Overview

### Priority Distribution
- **High Priority**: 5 tasks (Security, Firestore Rules, Error Handling, Testing, Push Notifications)
- **Medium Priority**: 5 tasks (Unit Tests, Admin Features, Search, CI/CD, Production Release)

### Dependency Structure
- Tasks ready to start immediately: 5 (Tasks #1, #2, #3, #4, #8)
- Tasks blocked by dependencies: 5 (Tasks #5, #6, #7, #9, #10)

---

## 🔴 Phase 1: High Priority Tasks

### Task #1: Security Hardening: Remove Exposed Credentials and Secure Environment

**Priority**: High
**Dependencies**: None
**Description**: Remove the exposed GitHub Personal Access Token (PAT) from the codebase and ensure the .env file is properly ignored by version control to prevent future credential leaks.

#### Implementation Details
1. Locate the .env file containing the exposed GitHub PAT
2. Remove the PAT from the file (use secure environment variable provider if needed)
3. Ensure `.gitignore` contains `.env` and `*.env`
4. Verify no history of .env file exists in Git repository
5. Rotate the leaked PAT on GitHub immediately

#### Test Strategy
1. Run `git check-ignore .env` to confirm the file is ignored
2. Clone repository in a fresh directory and verify .env file is not present
3. Search Git history using `git log -S'GITHUB_PAT'` to ensure token is no longer present

#### Subtasks

**1.1 - Immediately Rotate Exposed GitHub PAT**
- Priority: High
- Dependencies: None
- Description: Invalidate the leaked Personal Access Token on GitHub to prevent unauthorized access
- Details: Log into GitHub account → Settings → Developer settings → Personal access tokens → Find compromised token → Revoke and delete → Generate new token if needed with minimal permissions
- Test: Verify old token fails authentication, new token works correctly

**1.2 - Remove .env File from Git Tracking**
- Dependencies: Task 1
- Description: Remove the `.env` file from Git index without deleting local file
- Details: Delete GITHUB_PAT line from .env → Run `git rm --cached .env`
- Test: `git status` should show .env as 'deleted' in staging area, but local file exists

**1.3 - Update .gitignore to Exclude Environment Files**
- Dependencies: Task 2
- Description: Add entries for `.env` and similar files to `.gitignore`
- Details: Add lines to .gitignore: `.env` and `*.env` → Commit change
- Test: Run `git check-ignore .env` should output `.env`

**1.4 - Scan Git History for Leaked Credentials**
- Dependencies: Task 3
- Description: Scan entire Git commit history for PAT or .env file
- Details: Run `git log -S "<LEAKED_TOKEN>"` and `git log --all --full-history -- "**/.env"` → Document commit hashes found
- Test: Successful execution of search commands

**1.5 - Purge Sensitive Data from Git History**
- Dependencies: Task 4
- Description: Rewrite history to permanently remove sensitive data if found
- Details: Use `git-filter-repo` to remove .env file or PAT string from all historical commits → Force push → Notify collaborators
- Test: Clone repository fresh → Re-run search commands → Must return no results

---

### Task #2: Implement Firestore Security Rules

**Priority**: High
**Dependencies**: None
**Description**: Define and apply Firestore security rules for users, vehicles, and consultation_requests collections to enforce proper access control and data validation.

#### Implementation Details
- **users**: User can only read/write their own document (`allow read, write: if request.auth.uid == userId;`)
- **vehicles**: Any authenticated user can read. Only admins can create/update/delete. Validate data types (e.g., price is number)
- **consultation_requests**: Users can only create requests for themselves and read their own. Admins have full access
- **Firebase Storage**: Only authenticated users can upload images with size and type validation

#### Test Strategy
1. Use Firebase Emulator Suite to test rules locally
2. Write unit tests using `@firebase/rules-unit-testing` library
3. Create test cases for authenticated users, unauthenticated users, and admins

#### Subtasks

**2.1 - Initialize Firestore and Storage Rules Files and Configure Emulator**
- Dependencies: None
- Description: Create firestore.rules and storage.rules with default deny-all policy
- Details: Create files with rules_version = '2' and deny-all baseline → Configure Firebase Emulator Suite
- Test: Start emulator → Verify all unauthorized read/write attempts blocked

**2.2 - Implement Security Rules for the 'users' Collection**
- Dependencies: Task 1
- Description: Define rules so users can only read/write their own document + create isAdmin() helper function
- Details: Add match block for `/users/{userId}` with `allow read, write: if request.auth.uid == userId;` → Create isAdmin() global helper
- Test: Unit tests for user access to own document, denial of access to others' documents

**2.3 - Implement Security Rules for the 'vehicles' Collection**
- Dependencies: Tasks 1, 2
- Description: Allow authenticated users to read, restrict writes to admins, enforce data validation
- Details: Match `/vehicles/{vehicleId}` → `allow read: if request.auth != null;` → `allow create, update, delete: if isAdmin();` → Validate price and year are numbers
- Test: Authenticated users can read, only admins can write, invalid data types rejected

**2.4 - Implement Security Rules for the 'consultation_requests' Collection**
- Dependencies: Tasks 1, 2
- Description: Users create requests for themselves, read only own requests, admins have full access
- Details: Match `/consultation_requests/{requestId}` → Read: `if request.auth.uid == resource.data.userId || isAdmin()` → Create: `if request.auth.uid == request.resource.data.userId` → Update/Delete: `if isAdmin()`
- Test: User can create own request, read own only, admin can read/update/delete all

**2.5 - Implement Firebase Storage Security Rules for Image Uploads**
- Dependencies: Task 1
- Description: Define rules for vehicle images with authentication, size, and type validation
- Details: Match `/vehicle-images/{userId}/{imageId}` → Write: `if request.auth != null && request.auth.uid == userId` → Validate size < 5MB and content type is image
- Test: Authenticated user can upload valid image, reject unauthorized/oversized/non-image files

---

### Task #3: Implement Global Error Handling & Logging

**Priority**: High
**Dependencies**: None
**Description**: Establish comprehensive error handling and logging strategy using global error boundary and Firebase Crashlytics.

#### Implementation Details
1. Integrate `react-native-firebase/app` and `react-native-firebase/crashlytics` for Android and iOS
2. Create global error boundary component with `componentDidCatch` → Log to Crashlytics → Display fallback UI
3. Wrap all Firebase API calls in try/catch blocks → Log to Crashlytics → Display user-friendly messages

#### Test Strategy
1. Create test button that throws error → Verify error boundary triggered and logged to Crashlytics console
2. Simulate network failures to test retry logic
3. Test form submissions with invalid data to ensure catch blocks work

#### Subtasks

**3.1 - Install and Configure Firebase App and Crashlytics SDKs**
- Dependencies: None
- Description: Add Firebase App and Crashlytics packages with native platform setup
- Details: Follow react-native-firebase docs → Android: add google-services.json, update build.gradle → iOS: add GoogleService-Info.plist, update AppDelegate, run pod install
- Test: Run app on Android emulator and iOS simulator → Check for successful Firebase initialization in logs

**3.2 - Create a Global Error Boundary Component**
- Dependencies: Task 1
- Description: Implement ErrorBoundary class component to catch rendering errors and log to Crashlytics
- Details: Create `src/components/ErrorBoundary.tsx` → Extend React.Component → Implement getDerivedStateFromError and componentDidCatch(error, errorInfo) → Call crashlytics().recordError(error) → Track hasError state for fallback UI
- Test: Unit test component with simulated child error → Mock Crashlytics → Verify recordError called

**3.3 - Integrate Error Boundary at the Application Root**
- Dependencies: Task 2
- Description: Wrap main App component with ErrorBoundary
- Details: Locate App.tsx or index.js → Import ErrorBoundary → Wrap main component with <ErrorBoundary>...</ErrorBoundary>
- Test: Add component that throws error → Verify fallback UI displayed instead of crash

**3.4 - Refactor Firebase API Calls with try/catch Blocks**
- Dependencies: Task 1
- Description: Add try/catch blocks to all asynchronous Firebase operations
- Details: Search for all Firebase calls (Firestore, Auth, Storage) → Enclose in try/catch → In catch: crashlytics().recordError(error) + user feedback (toast/alert)
- Test: Unit test with mocked Firebase throwing error → Assert recordError called and user feedback triggered

**3.5 - Implement and Test a Crash Trigger for Verification**
- Dependencies: Tasks 3, 4
- Description: Add development-only buttons to trigger JS error and native crash
- Details: In debug screen (if __DEV__), add two buttons: 1) throw new Error('Test JS Error from UI') 2) crashlytics().crash()
- Test: Press buttons on dev build → Verify fallback UI for JS error → Check Crashlytics console for both reports

---

### Task #4: Setup Testing Framework and Code Quality Tools

**Priority**: High
**Dependencies**: None
**Description**: Configure Jest for unit testing, ESLint for static analysis, and Husky for pre-commit hooks.

#### Implementation Details
1. **Jest**: Install with react-native preset → Configure jest.config.js with mocks for native modules
2. **ESLint**: Initialize with @react-native-community/eslint-config → Create .eslintrc.js → Add npm run lint script
3. **Husky**: Install with lint-staged → Configure pre-commit hook to run ESLint and Jest on staged files

#### Test Strategy
1. Create simple test file for utility function → Run npm test
2. Introduce linting error → Stage and try to commit → Verify pre-commit hook fails
3. Fix error → Verify commit succeeds

#### Subtasks

**4.1 - Install and Configure ESLint**
- Dependencies: None
- Description: Install ESLint and @react-native-community/eslint-config
- Details: Install eslint and config package → Create .eslintrc.js extending community ruleset
- Test: Run `npx eslint .` → Verify runs without configuration errors

**4.2 - Add 'lint' Script to package.json**
- Dependencies: Task 1
- Description: Add lint script to package.json
- Details: Add to scripts: `"lint": "eslint . --ext .js,.jsx,.ts,.tsx"`
- Test: Run `npm run lint` → Introduce error → Verify error reported

**4.3 - Install and Configure Jest**
- Dependencies: None
- Description: Install Jest and dependencies for React Native environment
- Details: Install jest, @testing-library/react-native, @testing-library/jest-native → Create jest.config.js with preset: 'react-native' → Configure mocks
- Test: Add `"test": "jest"` to package.json → Run `npm test` → Verify initializes without crashes

**4.4 - Create a Sample Component Test**
- Dependencies: Task 3
- Description: Create initial test file for simple component
- Details: Create __tests__ directory → Create App-test.tsx with basic snapshot test
- Test: Run `npm test` → Verify Jest discovers and passes test

**4.5 - Set Up Husky and lint-staged Pre-commit Hook**
- Dependencies: Tasks 2, 4
- Description: Install Husky and lint-staged to create pre-commit hook
- Details: Run `npx husky-init && npm install` → Install lint-staged → Add lint-staged config to package.json → Modify .husky/pre-commit to run npx lint-staged
- Test: Stage file with linting error → Attempt commit → Verify blocked → Fix error → Verify succeeds

---

### Task #5: Implement Push Notification System using FCM

**Priority**: High
**Dependencies**: Tasks 1, 2
**Description**: Integrate Firebase Cloud Messaging (FCM) to send and receive push notifications for critical app events.

#### Implementation Details
1. Add @react-native-firebase/messaging package
2. Configure FCM for Android (build.gradle dependencies and plugins)
3. Request notification permissions using messaging().requestPermission()
4. Retrieve FCM token using messaging().getToken() → Store in user's Firestore document
5. Set up background and foreground message handlers
6. Create Firebase Function triggered by consultation_requests updates to send notifications

#### Test Strategy
1. Use Firebase Console to send test messages to device token
2. Test receiving notifications: foreground, background, and closed states
3. Trigger consultation status change → Verify Function invoked and notification sent
4. Test on physical Android device

#### Subtasks

**5.1 - Install and Configure Firebase Messaging Package for Android**
- Dependencies: None
- Description: Add messaging package and perform native Android configuration
- Details: Run `npm install @react-native-firebase/messaging` → Configure Android per official docs → Rebuild app
- Test: Build Android app successfully → Run on emulator/device

**5.2 - Implement Notification Permission Request Logic**
- Dependencies: Task 1
- Description: Request notification permissions on app startup
- Details: In App.tsx or service file → useEffect to call messaging().requestPermission() → Handle response
- Test: Fresh install → Verify OS permission dialog appears → Test accept/deny → Check OS settings

**5.3 - Retrieve and Store FCM Token in User's Firestore Document**
- Dependencies: Task 2
- Description: Get FCM token and save to user's document in Firestore
- Details: After permission granted → Call messaging().getToken() → Update user document with fcmToken field → Subscribe to onTokenRefresh()
- Test: Log token to console → Check user document in Firestore console for fcmToken field

**5.4 - Implement Client-Side Message Handlers**
- Dependencies: Task 1
- Description: Set up handlers for foreground, background, and terminated states
- Details: In index.js → Register messaging().setBackgroundMessageHandler() → In App.tsx → Use messaging().onMessage() in useEffect for foreground
- Test: Send test message from Firebase Console → Verify foreground handler (log/alert) → Verify background notification in system tray

**5.5 - Create Firebase Function to Send Notifications on Status Change**
- Dependencies: Task 3
- Description: Develop Cloud Function triggered by consultation_requests updates
- Details: In functions/src/index.ts → Create onUpdate trigger for consultation_requests/{requestId} → Check if status changed → Retrieve user's fcmToken → Send notification via Admin SDK
- Test: Deploy function → Manually update consultation status in Firestore → Check function logs → Verify notification received on device

---

## 🟡 Phase 2: Medium Priority Tasks

### Task #6: Write Unit Tests for Critical Functions

**Priority**: Medium
**Dependencies**: Task 4
**Description**: Write unit tests for firebaseService.js, formatters, and validators to improve code reliability.

#### Implementation Details
- **firebaseService.js**: Mock Firebase functions using jest.mock to test data fetching, vehicle registration, consultation request logic
- **Validators**: Test input validation functions (email format, password strength, vehicle year) with valid and invalid inputs
- **Formatters**: Test utility functions (currency, date formatters)

#### Test Strategy
1. Run all tests via npm test → Ensure they pass
2. Use jest --coverage to measure effectiveness → Aim for >70% coverage
3. Ensure tests run in pre-commit hook

#### Subtasks

**6.1 - Create Test Setup for firebaseService.js with Firebase Mocks**
**6.2 - Write Unit Tests for Data Fetching Functions**
**6.3 - Write Unit Tests for Data Writing Functions**
**6.4 - Implement Unit Tests for Validator and Formatter Utilities**
**6.5 - Run Test Suite and Generate Code Coverage Report**

---

### Task #7: Enhance Admin Management Features

**Priority**: Medium
**Dependencies**: Task 2
**Description**: Implement emergency vehicle deletion and user management interface for suspending/activating accounts.

#### Implementation Details
1. **Emergency Delete**: Add 'Delete' button in admin panel → Trigger Firebase Function for hard delete of vehicle + storage images → Log action
2. **User Management**: Create admin screen to list users → Search/filter users → Toggle status field (active/suspended) → Update Firestore rules to deny writes from suspended users

#### Test Strategy
1. Delete test vehicle → Verify document and storage files removed
2. Suspend test user → Login as suspended user → Verify blocked from key actions
3. Verify all admin actions recorded in activity log

#### Subtasks

**7.1 - Create Firebase Function for Emergency Vehicle Deletion**
**7.2 - Implement 'Delete Vehicle' Button in Admin Panel UI**
**7.3 - Build User Management Screen UI**
**7.4 - Implement User Account Suspend/Activate Functionality**
**7.5 - Update Firestore Security Rules to Restrict Suspended Users**

---

### Task #8: Implement Advanced Vehicle Search and Filters

**Priority**: Medium
**Dependencies**: None
**Description**: Develop advanced search interface for filtering and sorting vehicles by price, year, manufacturer.

#### Implementation Details
1. Create 'Filter' modal/screen from main vehicle list
2. Add UI components: sliders for price/year range, multi-select pickers for manufacturers
3. Construct composite Firestore query based on filters
4. Implement sorting options (Price: Low to High, etc.)

#### Test Strategy
1. Unit test query construction logic
2. Manually test UI with various filter combinations
3. Test edge cases (no results) → Ensure user-friendly message displayed

#### Subtasks

**8.1 - Create Filter Modal UI and Navigation Trigger**
**8.2 - Develop UI Components for Filtering Criteria**
**8.3 - Implement Filter State Management**
**8.4 - Build Dynamic Firestore Query Construction Service**
**8.5 - Integrate Filtering Logic into Vehicle List Screen**

---

### Task #9: Set Up CI/CD Pipeline with GitHub Actions

**Priority**: Medium
**Dependencies**: Tasks 4, 6
**Description**: Automate build, linting, and testing process for Android using GitHub Actions.

#### Implementation Details
1. Create `.github/workflows` directory
2. Create android-ci.yml file
3. Define workflow triggering on pull_request to main/develop
4. Jobs: setup (checkout, setup Node.js, install npm deps) → lint (npm run lint) → test (npm run test) → build (./gradlew assembleDebug)

#### Test Strategy
1. Create branch with linting error → Open PR → Verify lint job fails
2. Fix error → Push change → Verify all jobs pass
3. Monitor GitHub Actions tab for workflow runs

#### Subtasks

**9.1 - Initialize GitHub Actions Workflow Directory and File**
**9.2 - Define Workflow Triggers and Setup Job**
**9.3 - Implement Linting Job in Workflow**
**9.4 - Implement Unit Testing Job in Workflow**
**9.5 - Implement Android Debug Build Job in Workflow**

---

### Task #10: Prepare Android for Production Release

**Priority**: Medium
**Dependencies**: Tasks 1, 3
**Description**: Configure Android project for production release: app signing, code shrinking, generate signed AAB.

#### Implementation Details
1. **Keystore**: Generate private signing key using keytool → Store securely (not in repo)
2. **Gradle Configuration**: In android/app/build.gradle → Create signing configuration loading keystore credentials → Apply to release build type
3. **ProGuard/R8**: Enable minifyEnabled true in release build type → Add ProGuard rules to prevent vital code stripping
4. **Generate AAB**: Run `./gradlew bundleRelease` → AAB located in android/app/build/outputs/bundle/release/

#### Test Strategy
1. Install generated release AAB on physical device → Ensure no crashes
2. Test core flows (login, vehicle browsing, consultations) on release build
3. Upload AAB to internal testing track on Google Play Console → Verify correctly signed and configured

#### Subtasks

**10.1 - Generate Android Upload Keystore**
**10.2 - Securely Configure Keystore Credentials**
**10.3 - Configure Release Signing in build.gradle**
**10.4 - Enable Code Shrinking and Obfuscation with R8**
**10.5 - Generate and Verify Signed Android App Bundle (AAB)**

---

## 📋 Task Execution Guide

### Getting Started

1. **Start with Task #1.1** (Highest Priority, No Dependencies)
   ```bash
   task-master set-status --id=1.1 --status=in-progress
   task-master show 1.1
   ```

2. **Track Your Progress**
   ```bash
   task-master list                    # View all tasks
   task-master next                    # Get next available task
   ```

3. **Update Task Notes**
   ```bash
   task-master update-subtask --id=1.1 --prompt="implementation notes..."
   ```

4. **Complete Tasks**
   ```bash
   task-master set-status --id=1.1 --status=done
   ```

### Recommended Execution Order

**Week 1: Security Foundation**
- Days 1-2: Task #1 (All 5 subtasks)
- Days 3-4: Task #2 (All 5 subtasks)
- Day 5: Task #3 (Start subtasks 3.1-3.2)

**Week 2: Stability & Testing**
- Days 1-2: Task #3 (Complete subtasks 3.3-3.5)
- Days 3-4: Task #4 (All 5 subtasks)
- Day 5: Task #6 (Start subtasks 6.1-6.2)

**Week 3: Feature Development**
- Days 1-2: Task #6 (Complete subtasks 6.3-6.5)
- Days 3-5: Task #5 (All 5 subtasks)

**Week 4: Advanced Features & Production**
- Days 1-2: Task #7 or #8 (Choose based on priority)
- Days 3-4: Task #9 (All 5 subtasks)
- Day 5: Task #10 (Start subtasks 10.1-10.2)

**Week 5: Production Ready**
- Days 1-3: Task #10 (Complete subtasks 10.3-10.5)
- Days 4-5: Testing, documentation, final polish

---

## 📊 Progress Tracking

### Current Status
- **Total Tasks**: 60 (10 main + 50 subtasks)
- **Completed**: 0 (0%)
- **In Progress**: 0
- **Pending**: 60

### Success Metrics
- **Security**: Zero exposed credentials, all collections secured
- **Stability**: <1% error rate, 99.9% uptime
- **Testing**: >70% code coverage, all critical paths tested
- **User Engagement**: Push notification open rate >40%
- **Performance**: <3s app launch time, <2s screen transition

---

**Last Updated**: 2025-11-27
**Managed by**: Task Master AI
**Project**: JCar - Used Car Trading Platform
