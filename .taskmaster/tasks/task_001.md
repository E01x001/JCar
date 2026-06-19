# Task ID: 1

**Title:** Security Hardening: Remove Exposed Credentials and Secure Environment

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Remove the exposed GitHub Personal Access Token (PAT) from the codebase and ensure the .env file is properly ignored by version control to prevent future credential leaks.

**Details:**

1. Locate the .env file containing the exposed GitHub PAT. 2. Remove the PAT from the file. If it's needed for a dependency, source it from a secure environment variable provider or a secure secret management system. 3. Ensure the `.gitignore` file at the root of the project contains a line for `.env` and `*.env`. 4. Verify that no history of the .env file exists in the Git repository. If it does, the history must be rewritten using tools like `git filter-repo` or BFG Repo-Cleaner to completely remove the sensitive data. 5. Rotate the leaked PAT on GitHub immediately.

**Test Strategy:**

1. Run `git check-ignore .env` to confirm the file is ignored. 2. Clone the repository in a fresh directory and verify the .env file is not present. 3. Search the Git history using `git log -S'GITHUB_PAT'` to ensure the token is no longer present in historical commits.

## Subtasks

### 1.1. Immediately Rotate Exposed GitHub PAT

**Status:** done  
**Dependencies:** None  

The first and most critical step is to invalidate the leaked Personal Access Token on GitHub to prevent unauthorized access. A new token should be generated if it is still required for any services.

**Details:**

Log into the GitHub account associated with the leaked PAT. Navigate to Settings -> Developer settings -> Personal access tokens. Find the compromised token, revoke it, and delete it. If the token is necessary for CI/CD, generate a new one with minimal permissions and store it as a secure secret.
<info added on 2025-11-26T16:43:31.211Z>
The .env file also contains an exposed Gemini API Key: AIzaSyDuZVHWbWwdMBjicHmHZxvPFowGGf4yVso. This key must also be revoked immediately in the Google Cloud Console. A .env.example file has been created to serve as a template for the required environment variables.
</info added on 2025-11-26T16:43:31.211Z>

### 1.2. Remove .env File from Git Tracking

**Status:** done  
**Dependencies:** 1.1  

Remove the `.env` file from the Git index to ensure it is no longer tracked by version control, without deleting the local file itself.

**Details:**

First, locate the `.env` file in the project root and delete the line containing the `GITHUB_PAT`. Then, run the command `git rm --cached .env` to untrack the file. This will stage the deletion of the file from the repository index for the next commit.

### 1.3. Update .gitignore to Exclude Environment Files

**Status:** done  
**Dependencies:** 1.2  

Add entries for `.env` and similar configuration files to the project's root `.gitignore` file to prevent them from being accidentally committed in the future.

**Details:**

Open the `.gitignore` file at the root of the project. Add the following lines if they are not already present: `
.env
*.env`. This pattern will ignore the main `.env` file and any variants like `.env.local` or `.env.production`. Commit this change along with the untracked file from the previous step.

### 1.4. Scan Git History for Leaked Credentials

**Status:** done  
**Dependencies:** 1.3  

Thoroughly scan the entire Git commit history to determine if the Personal Access Token or the `.env` file was ever committed. This is crucial for identifying the full extent of the leak.

**Details:**

Use Git commands to search the repository's history. Run `git log -S "<PASTE_THE_LEAKED_TOKEN_HERE>"` to find commits that introduced or removed the specific token value. Also, run `git log --all --full-history -- "**/.env"` to find any commits that affected an `.env` file. Document any commit hashes found.
<info added on 2025-11-26T16:56:37.494Z>
The scan of the entire Git history is complete. Results confirm that no sensitive data, including the .env file, GitHub PAT, or Gemini API Key, was ever committed. The repository history is clean, making Task 1.5 (Purge Sensitive Data from Git History) unnecessary.
</info added on 2025-11-26T16:56:37.494Z>

### 1.5. Purge Sensitive Data from Git History

**Status:** done  
**Dependencies:** 1.4  

If the previous scan revealed the PAT in the commit history, the history must be rewritten to permanently remove the sensitive data. This is a destructive operation and requires coordination with the entire team.

**Details:**

This task is conditional on the outcome of subtask 4. If credentials were found, use a tool like `git-filter-repo` to remove the specific file (`.env`) or the string value of the PAT from all historical commits. This action will rewrite commit hashes and requires a force push (`git push --force`) to the remote repository. All collaborators must be notified as they will need to re-clone or carefully reset their local branches.
