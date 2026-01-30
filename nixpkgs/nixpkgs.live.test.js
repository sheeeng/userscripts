/**
 * Live tests for the Nixpkgs PR Branch Tracker userscript.
 *
 * These tests fetch real data from the GitHub API to verify the userscript
 * behavior against actual PR states.
 *
 * Usage:
 *   npm run test:live:open    - Test with most recent open PR
 *   npm run test:live:merged  - Test with random merged PR from last 7 days
 *   npm run test:live         - Run both live tests
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  parsePRUrl,
  isPRMerged,
  shouldShowMergeCommit,
  shortenCommitHash,
  isCommitInBranch,
  getSubscribedBranches,
  getBranchStatusApiUrl,
} from './nixpkgs.utils.js'

const GITHUB_API_BASE = 'https://api.github.com'
const REPO = 'NixOS/nixpkgs'

/**
 * Fetches data from GitHub API.
 *
 * @param {string} url - The API URL to fetch.
 * @returns {Promise<Object>} The JSON response.
 */
async function fetchGitHub(url) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'nixpkgs-branch-tracker-test',
  }

  // Use GitHub token if available (for higher rate limits)
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches the most recent open PR from NixOS/nixpkgs.
 *
 * @returns {Promise<Object>} The PR data.
 */
async function fetchMostRecentOpenPR() {
  const url = `${GITHUB_API_BASE}/repos/${REPO}/pulls?state=open&sort=created&direction=desc&per_page=1`
  const prs = await fetchGitHub(url)

  if (prs.length === 0) {
    throw new Error('No open PRs found')
  }

  return prs[0]
}

/**
 * Fetches a random merged PR from NixOS/nixpkgs in the last 7 days.
 * Only selects PRs that were merged to master (not staging branches).
 *
 * @returns {Promise<Object>} The PR data.
 */
async function fetchRandomMergedPR() {
  // Calculate date 7 days ago
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Fetch recently closed PRs (merged PRs are a subset of closed)
  // Filter by base branch = master to ensure we get PRs merged directly to master
  const url = `${GITHUB_API_BASE}/repos/${REPO}/pulls?state=closed&base=master&sort=updated&direction=desc&per_page=100`
  const prs = await fetchGitHub(url)

  // Filter to only merged PRs within the last 7 days
  const mergedPRs = prs.filter((pr) => {
    if (!pr.merged_at) return false
    const mergedDate = new Date(pr.merged_at)
    return mergedDate >= sevenDaysAgo
  })

  if (mergedPRs.length === 0) {
    throw new Error('No merged PRs found in the last 7 days')
  }

  // Pick a random one
  const randomIndex = Math.floor(Math.random() * mergedPRs.length)
  return mergedPRs[randomIndex]
}

/**
 * Fetches full PR details including merge status.
 *
 * @param {number} prNumber - The PR number.
 * @returns {Promise<Object>} The full PR data.
 */
async function fetchPRDetails(prNumber) {
  const url = `${GITHUB_API_BASE}/repos/${REPO}/pulls/${prNumber}`
  return fetchGitHub(url)
}

/**
 * Checks if a commit is in a branch using the GitHub compare API.
 *
 * @param {string} commitSha - The commit SHA to check.
 * @param {string} branch - The branch name.
 * @returns {Promise<{branch: string, status: string, isPresent: boolean}>}
 */
async function checkBranchStatus(commitSha, branch) {
  const url = getBranchStatusApiUrl(REPO, commitSha, branch)

  try {
    const response = await fetchGitHub(url)
    const isPresent = isCommitInBranch(response.status)

    return {
      branch,
      status: response.status,
      isPresent,
    }
  } catch (error) {
    return {
      branch,
      status: 'error',
      isPresent: false,
      error: error.message,
    }
  }
}

// Determine which test suite to run based on environment variable
const testMode = process.env.LIVE_TEST_MODE || 'all'

// ============================================================================
// Live Test: Most Recent Open PR
// ============================================================================

const shouldRunOpenTest = testMode === 'all' || testMode === 'open'

describe.skipIf(!shouldRunOpenTest)('live test: most recent open PR', () => {
  let pr = null
  let prDetails = null

  beforeAll(async () => {
    console.log('\n  Fetching most recent open PR from NixOS/nixpkgs...')
    pr = await fetchMostRecentOpenPR()
    console.log(`  Found PR #${pr.number}: ${pr.title}`)
    console.log(`  URL: ${pr.html_url}`)

    // Fetch full details
    prDetails = await fetchPRDetails(pr.number)
  })

  describe('PR state validation', () => {
    it('should be an open PR', () => {
      expect(prDetails.state).toBe('open')
      expect(prDetails.merged).toBe(false)
      expect(prDetails.merged_at).toBeNull()
    })

    it('should have valid PR metadata', () => {
      expect(prDetails.number).toBeGreaterThan(0)
      expect(prDetails.title).toBeDefined()
      expect(prDetails.user.login).toBeDefined()
    })
  })

  describe('merge commit handling', () => {
    it('should NOT show merge commit for open PR', () => {
      // GitHub may provide merge_commit_sha even for open PRs
      // but we should NOT display it to users
      expect(shouldShowMergeCommit(prDetails)).toBe(false)
    })

    it('isPRMerged should return false', () => {
      expect(isPRMerged(prDetails)).toBe(false)
    })
  })

  describe('URL parsing', () => {
    it('should correctly parse the PR URL', () => {
      const result = parsePRUrl(prDetails.html_url)
      expect(result).toEqual({
        repoPath: 'NixOS/nixpkgs',
        prNumber: String(prDetails.number),
      })
    })
  })

  describe('commit hash handling', () => {
    it('should have a valid head commit SHA', () => {
      expect(prDetails.head.sha).toMatch(/^[0-9a-f]{40}$/)
    })

    it('should shorten head commit hash to 7 characters', () => {
      const short = shortenCommitHash(prDetails.head.sha)
      expect(short).toHaveLength(7)
      expect(prDetails.head.sha.startsWith(short)).toBe(true)
    })
  })

  it('should log summary for open PR', () => {
    console.log('\n  --- Open PR Summary ---')
    console.log(`  PR #${prDetails.number}: ${prDetails.title}`)
    console.log(`  State: ${prDetails.state}`)
    console.log(`  Merged: ${prDetails.merged}`)
    console.log(`  Head SHA: ${shortenCommitHash(prDetails.head.sha)}`)
    console.log(`  merge_commit_sha present: ${!!prDetails.merge_commit_sha}`)
    console.log(`  shouldShowMergeCommit: ${shouldShowMergeCommit(prDetails)}`)
    console.log('  Result: Correctly NOT showing merge commit for open PR')
    expect(true).toBe(true)
  })
})

// ============================================================================
// Live Test: Random Merged PR from Last 7 Days
// ============================================================================

const shouldRunMergedTest = testMode === 'all' || testMode === 'merged'

describe.skipIf(!shouldRunMergedTest)('live test: random merged PR (last 7 days)', () => {
  let pr = null
  let prDetails = null
  let branchStatuses = []

  beforeAll(async () => {
    console.log('\n  Fetching random merged PR from last 7 days...')
    pr = await fetchRandomMergedPR()
    console.log(`  Found PR #${pr.number}: ${pr.title}`)
    console.log(`  URL: ${pr.html_url}`)
    console.log(`  Merged at: ${pr.merged_at}`)

    // Fetch full details
    prDetails = await fetchPRDetails(pr.number)

    // Check branch status for all subscribed branches
    console.log('\n  Checking branch propagation status...')
    const branches = getSubscribedBranches(REPO)
    const statusPromises = branches.map((branch) =>
      checkBranchStatus(prDetails.merge_commit_sha, branch)
    )
    branchStatuses = await Promise.all(statusPromises)

    // Log branch status
    for (const status of branchStatuses) {
      const icon = status.isPresent ? '\u2705' : '\u23f3'
      console.log(`  ${icon} ${status.branch}: ${status.status}`)
    }
  })

  describe('PR state validation', () => {
    it('should be a merged PR', () => {
      expect(prDetails.state).toBe('closed')
      expect(prDetails.merged).toBe(true)
      expect(prDetails.merged_at).not.toBeNull()
    })

    it('should have a valid merge_commit_sha', () => {
      expect(prDetails.merge_commit_sha).toMatch(/^[0-9a-f]{40}$/)
    })

    it('should have valid PR metadata', () => {
      expect(prDetails.number).toBeGreaterThan(0)
      expect(prDetails.title).toBeDefined()
      expect(prDetails.user.login).toBeDefined()
    })
  })

  describe('merge commit handling', () => {
    it('should show merge commit for merged PR', () => {
      expect(shouldShowMergeCommit(prDetails)).toBe(true)
    })

    it('isPRMerged should return true', () => {
      expect(isPRMerged(prDetails)).toBe(true)
    })
  })

  describe('URL parsing', () => {
    it('should correctly parse the PR URL', () => {
      const result = parsePRUrl(prDetails.html_url)
      expect(result).toEqual({
        repoPath: 'NixOS/nixpkgs',
        prNumber: String(prDetails.number),
      })
    })
  })

  describe('commit hash handling', () => {
    it('should shorten merge commit hash to 7 characters', () => {
      const short = shortenCommitHash(prDetails.merge_commit_sha)
      expect(short).toHaveLength(7)
      expect(prDetails.merge_commit_sha.startsWith(short)).toBe(true)
    })
  })

  describe('branch propagation', () => {
    it('should have at least one branch with the commit (green tick)', () => {
      const presentBranches = branchStatuses.filter((s) => s.isPresent)

      console.log(`\n  Branches with commit: ${presentBranches.length}`)
      for (const branch of presentBranches) {
        console.log(`    \u2705 ${branch.branch}`)
      }

      // A PR merged to master should be in at least master (ahead or identical)
      // Note: We filter for base=master in fetchRandomMergedPR, so this should always pass
      expect(presentBranches.length).toBeGreaterThanOrEqual(1)
    })

    it('should have master branch with the commit (merged to master)', () => {
      const masterStatus = branchStatuses.find((s) => s.branch === 'master')
      expect(masterStatus).toBeDefined()

      // Since we specifically fetch PRs merged to master, master should contain the commit
      // Status should be 'ahead' (master has more commits since the merge) or 'identical'
      console.log(`\n  Master branch status: ${masterStatus.status}`)
      console.log(`  Master isPresent: ${masterStatus.isPresent}`)

      expect(masterStatus.isPresent).toBe(true)
    })
  })

  it('should log summary for merged PR', () => {
    const presentBranches = branchStatuses.filter((s) => s.isPresent)
    const pendingBranches = branchStatuses.filter((s) => !s.isPresent)

    console.log('\n  --- Merged PR Summary ---')
    console.log(`  PR #${prDetails.number}: ${prDetails.title}`)
    console.log(`  State: ${prDetails.state}`)
    console.log(`  Merged: ${prDetails.merged}`)
    console.log(`  Merged at: ${prDetails.merged_at}`)
    console.log(`  Merge commit: ${shortenCommitHash(prDetails.merge_commit_sha)}`)
    console.log(`  shouldShowMergeCommit: ${shouldShowMergeCommit(prDetails)}`)
    console.log(`\n  Branch Status:`)
    console.log(`    Present in: ${presentBranches.map((b) => b.branch).join(', ') || 'none'}`)
    console.log(`    Pending: ${pendingBranches.map((b) => b.branch).join(', ') || 'none'}`)
    console.log('  Result: Correctly showing merge commit and branch status')
    expect(true).toBe(true)
  })
})
