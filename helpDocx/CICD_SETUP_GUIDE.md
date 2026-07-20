# CI/CD Pipeline Setup Guide - BDD Playwright Framework

## Complete Step-by-Step Guide for Beginners

This guide walks you through setting up a GitHub Actions CI/CD pipeline from absolute scratch. No prior experience needed.

---

## Table of Contents

1. [What is CI/CD?](#1-what-is-cicd)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Create a GitHub Account](#3-step-1-create-a-github-account)
4. [Step 2: Install Git on Your Machine](#4-step-2-install-git-on-your-machine)
5. [Step 3: Configure Git Locally](#5-step-3-configure-git-locally)
6. [Step 4: Create the GitHub Repository (AITAS)](#6-step-4-create-the-github-repository-aitas)
7. [Step 5: Initialize Git in Your Project](#7-step-5-initialize-git-in-your-project)
8. [Step 6: Push Code to GitHub](#8-step-6-push-code-to-github)
9. [Step 7: Understand the Pipeline File](#9-step-7-understand-the-pipeline-file)
10. [Step 8: Configure Secrets in GitHub](#10-step-8-configure-secrets-in-github)
11. [Step 9: Enable GitHub Pages (Optional)](#11-step-9-enable-github-pages-optional)
12. [Step 10: Trigger the Pipeline](#12-step-10-trigger-the-pipeline)
13. [Step 11: View Pipeline Results](#13-step-11-view-pipeline-results)
14. [Step 12: Download Test Reports](#14-step-12-download-test-reports)
15. [Troubleshooting Common Issues](#15-troubleshooting-common-issues)
16. [Pipeline Architecture Explained](#16-pipeline-architecture-explained)
17. [Advanced: Running Specific Tests](#17-advanced-running-specific-tests)

---

## 1. What is CI/CD?

**CI (Continuous Integration):** Every time you push code, the system automatically builds and tests it.

**CD (Continuous Delivery/Deployment):** After tests pass, the system automatically deploys reports or artifacts.

**GitHub Actions:** GitHub's built-in CI/CD tool. It reads YAML files from `.github/workflows/` in your repo and runs them automatically.

**Why use it?**
- Tests run automatically on every code push
- No need to manually run tests on your laptop
- Team members can see test results without running anything
- Catches bugs early before they reach production

---

## 2. Prerequisites

Before you start, make sure you have:

| Tool | Purpose | Download Link |
|------|---------|---------------|
| Git | Version control | https://git-scm.com/downloads |
| Node.js 20+ | Runtime for tests | https://nodejs.org |
| GitHub account | Host code & pipelines | https://github.com |
| Web browser | Access GitHub UI | Any modern browser |

---

## 3. Step 1: Create a GitHub Account

If you already have a GitHub account, skip to Step 2.

1. Go to **https://github.com**
2. Click **"Sign up"**
3. Enter your email, create a password, choose a username
4. Verify your email address
5. Choose the **Free** plan (it includes GitHub Actions with 2000 minutes/month)

---

## 4. Step 2: Install Git on Your Machine

### Windows:

1. Download from: https://git-scm.com/download/win
2. Run the installer
3. **Important settings during installation:**
   - Choose "Git from the command line and also from 3rd-party software"
   - Choose "Use Windows' default console window"
   - Keep all other defaults
4. After installation, open **Command Prompt** (cmd) and verify:

```cmd
git --version
```

You should see something like: `git version 2.45.0.windows.1`

---

## 5. Step 3: Configure Git Locally

Open Command Prompt and run these commands (replace with YOUR name and email):

```cmd
git config --global user.name "Your Full Name"
git config --global user.email "your-email@example.com"
```

**Verify the configuration:**

```cmd
git config --global --list
```

You should see your name and email listed.

---

## 6. Step 4: Create the GitHub Repository (AITAS)

### Option A: Create via GitHub Website (Recommended for beginners)

1. Log in to **https://github.com**
2. Click the **"+"** icon in the top-right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name:** `AITAS`
   - **Description:** `BDD Playwright Automation Framework - CI/CD Pipeline`
   - **Visibility:** Choose `Public` or `Private` (Private recommended for company projects)
   - **DO NOT** check "Add a README file" (we'll push our own code)
   - **DO NOT** add .gitignore (we already have one)
   - **DO NOT** choose a license yet
5. Click **"Create repository"**
6. You'll see a page with instructions — keep this page open, you'll need the URL

Your repo URL will be: `https://github.com/YOUR_USERNAME/AITAS.git`

### Option B: Create via GitHub CLI (if gh is installed)

```cmd
gh repo create AITAS --public --description "BDD Playwright Automation Framework"
```

---

## 7. Step 5: Initialize Git in Your Project

Open Command Prompt and navigate to your project folder:

```cmd
cd c:\Users\kumar\Downloads\wetransfer_bdd_playwright-main-zip_2026-07-01_1726\BDD_PlaywrightCore\BDD_Playwright-v5.0
```

Now initialize Git:

```cmd
git init
```

You should see: `Initialized empty Git repository in .../BDD_Playwright-v5.0/.git/`

**Add all files to Git tracking:**

```cmd
git add .
```

**Note:** The `.gitignore` file we created will automatically exclude `node_modules/`, `reports/`, `.env`, and `.playwright-mcp/` from being pushed.

**Verify what will be committed:**

```cmd
git status
```

You should see a list of green files (staged for commit). Make sure `node_modules` is NOT in the list.

**Create your first commit:**

```cmd
git commit -m "Initial commit: BDD Playwright framework with CI/CD pipeline"
```

---

## 8. Step 6: Push Code to GitHub

**Connect your local repo to GitHub (replace YOUR_USERNAME):**

```cmd
git remote add origin https://github.com/YOUR_USERNAME/AITAS.git
```

**Rename the default branch to main:**

```cmd
git branch -M main
```

**Push your code:**

```cmd
git push -u origin main
```

### First-time authentication:

When you push for the first time, GitHub will ask for authentication:

**Option 1: Browser popup (easiest)**
- A browser window will open asking you to authorize Git
- Click "Authorize" and you're done

**Option 2: Personal Access Token (if popup doesn't appear)**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "AITAS Push"
4. Select scopes: `repo` (full control)
5. Click "Generate token"
6. **COPY THE TOKEN NOW** (you won't see it again!)
7. When Git asks for password, paste this token instead of your password

**After successful push, refresh your GitHub repo page — you should see all your files!**

---

## 9. Step 7: Understand the Pipeline File

The pipeline lives at `.github/workflows/playwright-bdd.yml`. Here's what each section does:

### Pipeline Structure Overview:

```
┌─────────────────────────────────────────────────────┐
│                  TRIGGERS                             │
│  Push to main/develop | PR to main | Manual trigger  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              JOB 1: BUILD                            │
│  Install deps → TypeScript compile check             │
└──────────────────────┬──────────────────────────────┘
                       │ (must pass)
                       ▼
┌─────────────────────────────────────────────────────┐
│              JOB 2: TEST                             │
│  Install browsers → Run BDD tests → Generate reports │
└──────────────┬───────────────────┬──────────────────┘
               │                   │
               ▼                   ▼
┌──────────────────────┐  ┌───────────────────────────┐
│ JOB 3: CROSS-BROWSER │  │ JOB 4: DEPLOY REPORT      │
│ (main branch only)   │  │ (to GitHub Pages)          │
│ Chrome/Firefox/WebKit│  │                            │
└──────────────────────┘  └───────────────────────────┘
```

### Key concepts in the YAML file:

| YAML Key | What it means |
|----------|---------------|
| `on:` | When should the pipeline run (triggers) |
| `jobs:` | Groups of steps that run on a fresh machine |
| `runs-on: ubuntu-latest` | Uses a Linux machine provided by GitHub (free) |
| `steps:` | Individual commands that run in sequence |
| `uses:` | Uses a pre-built action from GitHub marketplace |
| `run:` | Runs a shell command |
| `env:` | Environment variables |
| `secrets.*` | Encrypted values stored in GitHub settings |
| `needs:` | This job waits for another job to finish first |
| `if:` | Conditional - only run if condition is true |
| `matrix:` | Run the same job multiple times with different configs |

---

## 10. Step 8: Configure Secrets in GitHub

Secrets are encrypted environment variables that your pipeline needs but shouldn't be in your code.

### How to add secrets:

1. Go to your repo: `https://github.com/YOUR_USERNAME/AITAS`
2. Click **"Settings"** tab (top of the page)
3. In left sidebar, click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**

### Secrets to add:

| Secret Name | Value | Required? |
|-------------|-------|-----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Only if using AI features |
| `BROWSERSTACK_USERNAME` | BrowserStack username | Only if using BrowserStack |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack key | Only if using BrowserStack |
| `LAMBDATEST_USERNAME` | LambdaTest username | Only if using LambdaTest |
| `LAMBDATEST_ACCESS_KEY` | LambdaTest key | Only if using LambdaTest |
| `SAUCE_USERNAME` | Sauce Labs username | Only if using Sauce Labs |
| `SAUCE_ACCESS_KEY` | Sauce Labs key | Only if using Sauce Labs |

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub — you don't need to add it!

### For minimal setup (just running tests):
- You may not need ANY secrets if your tests don't use cloud services or OpenAI.
- The pipeline will still run; steps using missing secrets will just use empty values.

---

## 11. Step 9: Enable GitHub Pages (Optional)

This lets you view Allure test reports as a website.

1. Go to repo **Settings** → **Pages** (left sidebar)
2. Under "Source", select **"Deploy from a branch"**
3. Branch: `gh-pages`, folder: `/ (root)`
4. Click **Save**

After the pipeline runs, your report will be at:
`https://YOUR_USERNAME.github.io/AITAS/allure-report`

---

## 12. Step 10: Trigger the Pipeline

### Automatic trigger:
The pipeline already ran when you pushed your code! Go check:

1. Go to your repo on GitHub
2. Click the **"Actions"** tab
3. You should see a workflow run in progress or completed

### Manual trigger (to choose profile/tags/browser):

1. Go to **Actions** tab
2. In the left sidebar, click **"BDD Playwright CI"**
3. Click **"Run workflow"** dropdown (right side)
4. Choose your options:
   - **Profile:** `default`, `accessibility`, `mobile`, or `cross-browser`
   - **Tags:** e.g., `@smoke` or `@regression` (leave empty for all tests)
   - **Browser:** `chromium`, `firefox`, or `webkit`
5. Click the green **"Run workflow"** button

---

## 13. Step 11: View Pipeline Results

### Understanding the pipeline status:

| Icon | Meaning |
|------|---------|
| 🟡 Yellow circle (spinning) | Pipeline is running |
| ✅ Green checkmark | Pipeline passed |
| ❌ Red X | Pipeline failed |
| ⚪ Grey circle | Pipeline was skipped |

### Viewing detailed logs:

1. Click on the workflow run (the row in Actions tab)
2. You'll see each job as a box (build → test → cross-browser → deploy)
3. Click on any job to see its steps
4. Click on any step to expand its console output
5. If a step failed, it will be marked with ❌ — click it to see the error

---

## 14. Step 12: Download Test Reports

After the pipeline completes:

1. Go to the workflow run page
2. Scroll down to **"Artifacts"** section
3. You'll see downloadable files:
   - **test-reports-{run_number}** — HTML and JSON reports
   - **allure-results-{run_number}** — Allure data for history tracking
4. Click to download as ZIP
5. Extract and open `html/cucumber-report.html` in your browser

---

## 15. Troubleshooting Common Issues

### Issue: "npm ci" fails

**Cause:** `package-lock.json` is missing or outdated.

**Fix:** Run locally:
```cmd
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Issue: "Looks like you launched a headed browser without having a XServer running"

**Cause:** The framework was trying to open a visible browser window, but GitHub Actions Linux runners have no display/monitor.

**Fix (already applied in this framework):**
- `FrameworkConfig.ts` now auto-detects `CI=true` and forces `headless: true`
- The pipeline also wraps test commands with `xvfb-run` as a safety net

If you still see this error after pushing, ensure your commit includes:
1. The updated `src/config/FrameworkConfig.ts` (has CI auto-detection)
2. The updated `.github/workflows/playwright-bdd.yml` (has `xvfb-run` wrapper)

### Issue: TypeScript compile errors

**Cause:** TypeScript code has errors that weren't caught locally.

**Fix:** Run locally:
```cmd
npx tsc --noEmit
```
Fix any errors shown, commit, and push.

### Issue: "Playwright browsers not found"

**Cause:** The `npx playwright install` step may have timed out.

**Fix:** This usually resolves on re-run. Click "Re-run failed jobs" in the Actions tab.

### Issue: Tests pass locally but fail in CI

**Common causes:**
- Missing environment variables (add secrets)
- Tests depend on local files not committed (check `.gitignore`)
- Tests use `localhost` services not available in CI
- Windows vs Linux path differences (`\` vs `/`)

### Issue: "Permission denied" when pushing

**Fix:** Re-authenticate:
```cmd
git remote set-url origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/AITAS.git
```
Then push again. It will ask for your token.

### Issue: Pipeline doesn't trigger

**Check:**
- Is the file at EXACTLY `.github/workflows/playwright-bdd.yml`?
- Is the branch name `main` (not `master`)?
- Are there YAML syntax errors? Validate at https://yaml-online-parser.appspot.com

---

## 16. Pipeline Architecture Explained

### How the 4 jobs work together:

```
TIME ──────────────────────────────────────────────────────►

Job 1: BUILD     [████████]
                           ↓ (passes)
Job 2: TEST                [████████████████████]
                                                 ↓ (passes, main branch only)
Job 3: CROSS     [chromium ████████]
  BROWSER        [firefox  ████████]  ← runs in PARALLEL
                 [webkit   ████████]
                                                 ↓
Job 4: DEPLOY                                    [████]
```

### What runs on each job:

**Build Job (2-3 minutes):**
- Validates code compiles without errors
- Fast feedback — fails early if code is broken

**Test Job (5-15 minutes):**
- Installs Playwright browsers
- Runs your BDD feature files
- Generates Cucumber HTML report
- Generates Allure report
- Uploads all reports as downloadable artifacts

**Cross-Browser Job (10-20 minutes, main only):**
- Runs smoke tests on Chrome, Firefox, and Safari (WebKit)
- Each browser runs in parallel (saves time)
- Only triggers on pushes to main (not on every PR)

**Deploy Job (1-2 minutes, main only):**
- Publishes Allure report to GitHub Pages
- Accessible as a live website

### Total pipeline time: ~15-25 minutes

---

## 17. Advanced: Running Specific Tests

### Using Cucumber Tags in the pipeline:

When you trigger manually, you can use tags to run specific tests:

| Tag | What it runs |
|-----|--------------|
| `@smoke` | Quick smoke tests |
| `@regression` | Full regression suite |
| `@teleconnect_orderingestion` | Order ingestion flow |
| `@teleconnect_crm` | CRM flow |
| `@teleconnect_install` | Install flow |
| `@teleconnect_activate` | Activation flow |
| `@accessibility` | Accessibility tests |
| `@mobile` | Mobile viewport tests |
| `@api` | API-only tests |

### Combining tags:

- Run multiple: `@smoke or @api`
- Exclude: `not @slow`
- Combine: `@smoke and @web`

---

## Quick Reference: Commands Cheat Sheet

```cmd
:: ─── One-time setup ───────────────────────────────
git init
git remote add origin https://github.com/YOUR_USERNAME/AITAS.git
git branch -M main

:: ─── Daily workflow ───────────────────────────────
git add .
git commit -m "your message here"
git push

:: ─── If you need to pull others' changes ─────────
git pull origin main

:: ─── If push is rejected (remote has new commits) ─
git pull --rebase origin main
git push

:: ─── Check pipeline status from terminal ──────────
:: (requires GitHub CLI - gh)
gh run list
gh run view --log
```

---

## Summary: The Complete Flow

```
1. You write/update test code locally
         │
         ▼
2. git add . → git commit → git push
         │
         ▼
3. GitHub detects push → triggers pipeline
         │
         ▼
4. Pipeline runs: Build → Test → Reports
         │
         ▼
5. View results in Actions tab
         │
         ▼
6. Download reports or view on GitHub Pages
```

**Congratulations!** You now have a fully automated CI/CD pipeline for your BDD Playwright tests. Every time you push code, tests run automatically and reports are generated.

---

## Need Help?

- **GitHub Actions docs:** https://docs.github.com/en/actions
- **Playwright CI docs:** https://playwright.dev/docs/ci-intro
- **Cucumber.js docs:** https://cucumber.io/docs/cucumber/

---

*Document Version: 1.0 | Last Updated: July 2026 | Framework: BDD Playwright v5.0*
