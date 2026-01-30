# nixpkgs

This guide explains how to run and write unit tests for the Nixpkgs PR Branch Tracker userscript.

## Overview

The project uses [Vitest](https://vitest.dev/) as the test framework with [jsdom](https://github.com/jsdom/jsdom) for browser environment simulation. Tests are written for the utility functions extracted from the main userscript.

## Prerequisites

Ensure dependencies are installed:

```bash
npm install
```

## Running Tests

### Run Unit Tests Once

```bash
npm test
```

### Run Unit Tests in Watch Mode

Automatically re-runs tests when files change:

```bash
npm run test:watch
```

### Run Unit Tests with Coverage Report

```bash
npm run test:coverage
```

### Run Live Tests (Real GitHub API)

Live tests fetch real data from the GitHub API to verify behavior against actual PR states.

**Run all live tests:**

```bash
npm run test:live
```

**Run live test for most recent open PR:**

```bash
npm run test:live:open
```

This test fetches the most recent open PR from NixOS/nixpkgs and verifies:

- The PR is correctly identified as not merged
- The `merge_commit_sha` is NOT displayed (even though GitHub provides it)
- URL parsing works correctly

**Run live test for random merged PR (last 7 days):**

```bash
npm run test:live:merged
```

This test fetches a random merged PR from the last 7 days and verifies:

- The PR is correctly identified as merged
- The merge commit is displayed
- At least one branch (master) contains the commit (green tick)
- Branch propagation status is correctly determined

#### GitHub API Rate Limits

Live tests require GitHub API access. Without authentication, you may hit rate limits (60 requests/hour). To avoid this, provide a GitHub token:

```bash
GITHUB_TOKEN=$(gh auth token) npm run test:live
```

Or set the `GITHUB_TOKEN` environment variable directly.

## Project Structure

```text
userscripts/
├── nixpkgs.js              # Main userscript (runs in browser)
├── nixpkgs.utils.js        # Testable utility functions
├── nixpkgs.utils.test.js   # Unit tests (mock data)
├── nixpkgs.live.test.js    # Live tests (real GitHub API)
├── nixpkgs.mocks.js        # Mock data and fixtures
├── vitest.config.js        # Vitest configuration
└── package.json            # npm scripts and dependencies
```

## Test Files

| File                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `nixpkgs.utils.test.js` | Unit tests using mock data (109 tests)          |
| `nixpkgs.live.test.js`  | Live tests fetching real GitHub data (18 tests) |
| `nixpkgs.mocks.js`      | Mock data based on real PRs                     |

## Writing Tests

### Basic Test Structure

Tests use the standard `describe`/`it` pattern:

```javascript
import { describe, it, expect } from "vitest";
import { functionToTest } from "./nixpkgs.utils.js";

describe("functionToTest", () => {
  it("should do something expected", () => {
    const result = functionToTest("input");
    expect(result).toBe("expected output");
  });
});
```

### Using Mock Data

Import mock fixtures for realistic test data:

```javascript
import {
  mockPR484788, // Merged PR response
  mockOpenPR, // Open PR response
  mockPR484788BranchStatus, // Branch propagation status
} from "./nixpkgs.mocks.js";

describe("isPRMerged", () => {
  it("should return true for merged PR", () => {
    expect(isPRMerged(mockPR484788)).toBe(true);
  });

  it("should return false for open PR", () => {
    expect(isPRMerged(mockOpenPR)).toBe(false);
  });
});
```

### Available Mock Data

The `nixpkgs.mocks.js` file provides:

| Export                     | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `mockPR484788`             | Full GitHub API response for merged PR #484788 |
| `mockOpenPR`               | Sample open (unmerged) PR response             |
| `mockBranchComparisons`    | Generic branch comparison responses            |
| `mockPR484788BranchStatus` | Realistic branch status from January 28, 2026  |
| `mockPR484788Derived`      | Computed values (URLs, shortened hashes)       |
| `getMockBranchResponses()` | Helper to get all branch API responses         |
| `createMockResponse()`     | Helper to create mock fetch Response objects   |
| `createMockFetch()`        | Helper to create a mock fetch function         |

### Mock Test Fixtures

In addition to synthetic mock data, the project includes mock test fixtures based on real GitHub PRs fetched on January 29, 2026:

| Export                           | Description                             |
| -------------------------------- | --------------------------------------- |
| `mockOpenPR485005`               | Open PR: forgejo 14.0.1 -> 14.0.2       |
| `mockOpenPR485005Derived`        | Derived data for open PR                |
| `mockMergedPR484965`             | Merged PR: opencode 1.1.36 -> 1.1.41    |
| `mockMergedPR484965Derived`      | Derived data for merged PR              |
| `mockMergedPR484965BranchStatus` | Branch propagation status for merged PR |

These fixtures demonstrate a key behavior: GitHub provides `merge_commit_sha` even for open PRs, but the userscript should only display it for merged PRs.

```javascript
import { mockOpenPR485005, mockMergedPR484965 } from "./nixpkgs.mocks.js";

describe("merge commit display logic", () => {
  it("should NOT show merge commit for open PR", () => {
    // GitHub provides merge_commit_sha even for open PRs
    expect(mockOpenPR485005.merge_commit_sha).toBeDefined();
    // But we should not display it
    expect(shouldShowMergeCommit(mockOpenPR485005)).toBe(false);
  });

  it("should show merge commit for merged PR", () => {
    expect(shouldShowMergeCommit(mockMergedPR484965)).toBe(true);
  });
});
```

### Testing with Mock Fetch

For testing functions that make API calls:

```javascript
import { vi } from "vitest";
import { createMockFetch, mockPR484788 } from "./nixpkgs.mocks.js";

describe("API integration", () => {
  it("should fetch PR data", async () => {
    const mockFetch = createMockFetch({
      "pulls/484788": mockPR484788,
    });

    vi.stubGlobal("fetch", mockFetch);

    // Test your function that uses fetch
    // ...

    vi.unstubAllGlobals();
  });
});
```

## Testable Functions

The following functions are exported from `nixpkgs.utils.js` for testing:

### URL Parsing

| Function                      | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `parsePRUrl(url)`             | Extracts repo path and PR number from GitHub URL |
| `normalizeRepoName(repoPath)` | Case-insensitive repo name matching              |

### URL Generation

| Function                                      | Description                         |
| --------------------------------------------- | ----------------------------------- |
| `getPRApiUrl(repo, prNumber)`                 | Generates GitHub API URL for a PR   |
| `getCommitUrl(repo, commitHash)`              | Generates commit permalink URL      |
| `getCompareUrl(repo, commit, branch)`         | Generates branch comparison URL     |
| `getBranchStatusApiUrl(repo, commit, branch)` | Generates optimized compare API URL |

### Data Processing

| Function                         | Description                           |
| -------------------------------- | ------------------------------------- |
| `shortenCommitHash(hash)`        | Shortens commit hash to 7 characters  |
| `sanitizeBranchId(branchName)`   | Creates valid DOM ID from branch name |
| `createBranchMetadata(branches)` | Creates metadata objects for branches |
| `isCommitInBranch(status)`       | Checks if commit exists in branch     |

### PR State

| Function                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `isPRMerged(prResponse)`            | Checks if PR is merged                     |
| `shouldShowMergeCommit(prResponse)` | Checks if merge commit should be displayed |
| `isSubscribedRepo(repo)`            | Checks if repo is in subscribed list       |
| `getSubscribedBranches(repo)`       | Gets tracked branches for a repo           |

## Example Test Cases

### Testing URL Parsing

```javascript
describe("parsePRUrl", () => {
  it("should parse a valid GitHub PR URL", () => {
    const result = parsePRUrl("https://github.com/NixOS/nixpkgs/pull/484788");
    expect(result).toEqual({
      repoPath: "NixOS/nixpkgs",
      prNumber: "484788",
    });
  });

  it("should return null for invalid URLs", () => {
    expect(parsePRUrl("https://example.com")).toBeNull();
  });
});
```

### Testing Branch Status

```javascript
describe("isCommitInBranch", () => {
  it('should return true for "ahead" status', () => {
    expect(isCommitInBranch("ahead")).toBe(true);
  });

  it('should return false for "behind" status', () => {
    expect(isCommitInBranch("behind")).toBe(false);
  });
});
```

### Testing with Realistic Data

```javascript
describe("branch propagation for PR #484788", () => {
  it("should correctly identify propagated branches", () => {
    const { branches } = mockPR484788BranchStatus;

    // Commit is in master and staging-next
    expect(isCommitInBranch(branches.master.response.status)).toBe(true);
    expect(isCommitInBranch(branches["staging-next"].response.status)).toBe(
      true,
    );

    // Commit is not yet in unstable channels
    expect(isCommitInBranch(branches["nixos-unstable"].response.status)).toBe(
      false,
    );
    expect(isCommitInBranch(branches["nixpkgs-unstable"].response.status)).toBe(
      false,
    );
  });
});
```

## Configuration

### Vitest Configuration

The `vitest.config.js` file configures the test environment:

```javascript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom", // Simulates browser DOM
    globals: true, // Makes describe/it/expect global
  },
});
```

### Adding Coverage

To enable coverage reporting, install the coverage provider:

```bash
npm install -D @vitest/coverage-v8
```

Then run:

```bash
npm run test:coverage
```

## Best Practices

1. **Test pure functions**: Focus on testing utility functions that don't depend on DOM or browser APIs.

2. **Use realistic mock data**: The mock fixtures are based on real GitHub API responses from PR #484788.

3. **Test edge cases**: Include tests for null, undefined, and invalid inputs.

4. **Keep tests focused**: Each test should verify one specific behavior.

5. **Use descriptive names**: Test names should clearly describe what is being tested.

## Troubleshooting

### Tests Fail with "Cannot find module"

Ensure you're using the correct import path:

```javascript
// Correct
import { functionName } from "./nixpkgs.utils.js";

// Incorrect (missing .js extension)
import { functionName } from "./nixpkgs.utils";
```

### DOM-Related Tests Fail

The jsdom environment is configured in `vitest.config.js`. If you need DOM APIs, ensure your test file uses the jsdom environment.

### Mock Data Is Outdated

If the GitHub API response format changes, update the mock fixtures in `nixpkgs.mocks.js` to match the new format.
