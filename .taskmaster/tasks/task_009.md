# Task ID: 9

**Title:** Set Up CI/CD Pipeline with GitHub Actions

**Status:** done

**Dependencies:** 4 ✓, 6 ✓

**Priority:** medium

**Description:** Automate the build, linting, and testing process for the Android application using a GitHub Actions workflow.

**Details:**

1. Create a `.github/workflows` directory in the project root. 2. Create a YAML file (e.g., `android-ci.yml`). 3. Define a workflow that triggers on `pull_request` to the `main` or `develop` branch. 4. The workflow should have jobs for: 
   - `setup`: Check out the code, set up Node.js, and install npm dependencies. 
   - `lint`: Run the ESLint checks (`npm run lint`). 
   - `test`: Run the Jest unit tests (`npm run test`). 
   - `build`: Assemble the Android debug build (`cd android && ./gradlew assembleDebug`) to ensure the project builds successfully.

**Test Strategy:**

1. Create a new branch and open a pull request with code that contains a linting error. Verify that the 'lint' job in the GitHub Actions workflow fails. 2. Fix the linting error and push the change. Verify all jobs in the workflow pass. 3. Check the GitHub Actions tab in the repository to monitor workflow runs and diagnose failures.

## Subtasks

### 9.1. Initialize GitHub Actions Workflow Directory and File

**Status:** done  
**Dependencies:** None  

Create the necessary directory structure `.github/workflows` at the project root and add a new YAML file named `android-ci.yml` to house the continuous integration workflow.

**Details:**

In the root of the JCar project, create a directory named `.github`. Inside `.github`, create another directory named `workflows`. Finally, create an empty file inside `workflows` named `android-ci.yml`.

### 9.2. Define Workflow Triggers and Setup Job

**Status:** done  
**Dependencies:** 9.1  

Configure the `android-ci.yml` workflow to trigger on pull requests to the `main` and `develop` branches. Implement a foundational `setup` job to prepare the environment for subsequent jobs.

**Details:**

Edit `android-ci.yml`. Define the workflow `name` and the `on` trigger: `pull_request: branches: [ main, develop ]`. Create a `jobs` section with a `setup` job that runs on `ubuntu-latest`. The job steps should include `actions/checkout@v3`, `actions/setup-node@v3` (with caching for npm), and `actions/setup-java@v3` for the Android build. The final step should be `npm install`.

### 9.3. Implement Linting Job in Workflow

**Status:** done  
**Dependencies:** 9.2  

Add a `lint` job to the CI pipeline that performs static code analysis on the codebase. This job should depend on the successful completion of the `setup` job.

**Details:**

In `android-ci.yml`, add a new job named `lint`. Specify `needs: setup` to ensure it runs only after the setup is complete. The job should run on `ubuntu-latest` and reuse the checkout and setup steps or download artifacts from the setup job. The key step is `run: npm run lint`.

### 9.4. Implement Unit Testing Job in Workflow

**Status:** done  
**Dependencies:** 9.2  

Add a `test` job to the CI pipeline to execute the Jest unit tests. This job should also depend on the `setup` job and can run in parallel with the `lint` job.

**Details:**

In `android-ci.yml`, add a new job named `test`. Specify `needs: setup`. This job will run on `ubuntu-latest`. The main step for this job will be `run: npm run test` to execute the Jest test suite.

### 9.5. Implement Android Debug Build Job in Workflow

**Status:** done  
**Dependencies:** 9.2  

Add a `build` job that compiles the Android application to ensure it's in a buildable state. This job is crucial for catching native code or configuration issues early.

**Details:**

In `android-ci.yml`, add the final job named `build`. It should also have `needs: setup`. The job will run on `ubuntu-latest`. The core steps are to grant execute permissions to the gradlew script (`chmod +x ./android/gradlew`) and then run the build command (`cd ./android && ./gradlew assembleDebug`).
