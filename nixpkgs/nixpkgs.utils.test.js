import { describe, it, expect } from 'vitest'
import {
  subscribedRepos,
  parsePRUrl,
  normalizeRepoName,
  getPRApiUrl,
  getCommitUrl,
  shortenCommitHash,
  sanitizeBranchId,
  createBranchMetadata,
  isCommitInBranch,
  getCompareUrl,
  getBranchStatusApiUrl,
  isSubscribedRepo,
  getSubscribedBranches,
  getRelevantBranches,
  isPRMerged,
  shouldShowMergeCommit,
  GITHUB_TOKEN_STORAGE_KEY,
  PR_SUMMARY_SELECTOR,
  PR_LEGACY_SELECTOR,
} from './nixpkgs.utils.js'
import {
  mockPR484788,
  mockOpenPR,
  mockBranchComparisons,
  mockPR484788Derived,
  mockPR484788BranchStatus,
  getMockBranchResponses,
  mockOpenPR485005,
  mockOpenPR485005Derived,
  mockMergedPR484965,
  mockMergedPR484965Derived,
  mockMergedPR484965BranchStatus,
  mockStagingPR,
  mockStagingNextPR,
} from './nixpkgs.mocks.js'

describe('subscribedRepos', () => {
  it('should contain NixOS/nixpkgs repository', () => {
    expect(subscribedRepos).toHaveProperty('NixOS/nixpkgs')
  })

  it('should track expected branches for NixOS/nixpkgs', () => {
    const branches = subscribedRepos['NixOS/nixpkgs']
    expect(branches).toContain('master')
    expect(branches).toContain('nixos-unstable')
    expect(branches).toContain('nixpkgs-unstable')
    expect(branches).toContain('nixos-unstable-small')
    expect(branches).toContain('staging')
    expect(branches).toContain('staging-next')
  })
})

describe('parsePRUrl', () => {
  it('should parse a valid GitHub PR URL', () => {
    const result = parsePRUrl('https://github.com/NixOS/nixpkgs/pull/12345')
    expect(result).toEqual({
      repoPath: 'NixOS/nixpkgs',
      prNumber: '12345',
    })
  })

  it('should parse a PR URL with additional path segments', () => {
    const result = parsePRUrl('https://github.com/owner/repo/pull/999/files')
    expect(result).toEqual({
      repoPath: 'owner/repo',
      prNumber: '999',
    })
  })

  it('should parse a PR URL with query parameters', () => {
    const result = parsePRUrl('https://github.com/owner/repo/pull/123?tab=commits')
    expect(result).toEqual({
      repoPath: 'owner/repo',
      prNumber: '123',
    })
  })

  it('should handle repository names with hyphens', () => {
    const result = parsePRUrl('https://github.com/my-org/my-repo/pull/456')
    expect(result).toEqual({
      repoPath: 'my-org/my-repo',
      prNumber: '456',
    })
  })

  it('should return null for invalid URLs', () => {
    expect(parsePRUrl('https://github.com/NixOS/nixpkgs')).toBeNull()
    expect(parsePRUrl('https://example.com/pull/123')).toBeNull()
    expect(parsePRUrl('not a url')).toBeNull()
  })
})

describe('normalizeRepoName', () => {
  it('should return exact match for subscribed repository', () => {
    expect(normalizeRepoName('NixOS/nixpkgs')).toBe('NixOS/nixpkgs')
  })

  it('should handle case-insensitive matching', () => {
    expect(normalizeRepoName('nixos/nixpkgs')).toBe('NixOS/nixpkgs')
    expect(normalizeRepoName('NIXOS/NIXPKGS')).toBe('NixOS/nixpkgs')
    expect(normalizeRepoName('NixOs/NixPkgs')).toBe('NixOS/nixpkgs')
  })

  it('should return original name for unsubscribed repositories', () => {
    expect(normalizeRepoName('owner/other-repo')).toBe('owner/other-repo')
    expect(normalizeRepoName('SomeOrg/SomeRepo')).toBe('SomeOrg/SomeRepo')
  })

  it('should work with custom repos object', () => {
    const customRepos = { 'Custom/Repo': ['main'] }
    expect(normalizeRepoName('custom/repo', customRepos)).toBe('Custom/Repo')
    expect(normalizeRepoName('unknown/repo', customRepos)).toBe('unknown/repo')
  })
})

describe('getPRApiUrl', () => {
  it('should generate correct API URL', () => {
    expect(getPRApiUrl('NixOS/nixpkgs', '12345')).toBe(
      'https://api.github.com/repos/NixOS/nixpkgs/pulls/12345'
    )
  })

  it('should handle any repository and PR number', () => {
    expect(getPRApiUrl('owner/repo', '999')).toBe(
      'https://api.github.com/repos/owner/repo/pulls/999'
    )
  })
})

describe('getCommitUrl', () => {
  it('should generate correct commit URL', () => {
    const hash = 'abc123def456789'
    expect(getCommitUrl('NixOS/nixpkgs', hash)).toBe(
      `https://github.com/NixOS/nixpkgs/commit/${hash}`
    )
  })
})

describe('shortenCommitHash', () => {
  it('should shorten a full commit hash to 7 characters', () => {
    expect(shortenCommitHash('abc123def456789')).toBe('abc123d')
  })

  it('should handle hashes shorter than 7 characters', () => {
    expect(shortenCommitHash('abc')).toBe('abc')
  })

  it('should return empty string for null or undefined', () => {
    expect(shortenCommitHash(null)).toBe('')
    expect(shortenCommitHash(undefined)).toBe('')
  })
})

describe('sanitizeBranchId', () => {
  it('should prefix with "compare-"', () => {
    expect(sanitizeBranchId('master')).toBe('compare-master')
  })

  it('should replace dots with hyphens', () => {
    expect(sanitizeBranchId('release.1.0')).toBe('compare-release-1-0')
  })

  it('should replace spaces with hyphens', () => {
    expect(sanitizeBranchId('my branch')).toBe('compare-my-branch')
  })

  it('should handle nixos branch names', () => {
    expect(sanitizeBranchId('nixos-unstable')).toBe('compare-nixos-unstable')
    expect(sanitizeBranchId('nixos-unstable-small')).toBe('compare-nixos-unstable-small')
  })
})

describe('createBranchMetadata', () => {
  it('should create metadata objects for each branch', () => {
    const branches = ['master', 'staging-next']
    const result = createBranchMetadata(branches)

    expect(result).toEqual([
      { name: 'master', id: 'compare-master' },
      { name: 'staging-next', id: 'compare-staging-next' },
    ])
  })

  it('should handle empty array', () => {
    expect(createBranchMetadata([])).toEqual([])
  })
})

describe('isCommitInBranch', () => {
  it('should return true for "ahead" status', () => {
    expect(isCommitInBranch('ahead')).toBe(true)
  })

  it('should return true for "identical" status', () => {
    expect(isCommitInBranch('identical')).toBe(true)
  })

  it('should return false for "behind" status', () => {
    expect(isCommitInBranch('behind')).toBe(false)
  })

  it('should return false for "diverged" status', () => {
    expect(isCommitInBranch('diverged')).toBe(false)
  })

  it('should return false for unknown status', () => {
    expect(isCommitInBranch('unknown')).toBe(false)
  })
})

describe('getCompareUrl', () => {
  const repo = 'NixOS/nixpkgs'
  const commit = 'abc123'
  const branch = 'master'

  it('should generate commit-to-branch comparison URL', () => {
    expect(getCompareUrl(repo, commit, branch)).toBe(
      'https://github.com/NixOS/nixpkgs/compare/abc123...master'
    )
  })

  it('should generate reversed branch-to-commit comparison URL', () => {
    expect(getCompareUrl(repo, commit, branch, true)).toBe(
      'https://github.com/NixOS/nixpkgs/compare/master...abc123'
    )
  })
})

describe('getBranchStatusApiUrl', () => {
  it('should generate API URL with pagination optimization', () => {
    const result = getBranchStatusApiUrl('NixOS/nixpkgs', 'abc123', 'master')
    expect(result).toBe(
      'https://api.github.com/repos/NixOS/nixpkgs/compare/abc123...master?per_page=1000000&page=100'
    )
  })
})

describe('isSubscribedRepo', () => {
  it('should return true for subscribed repository', () => {
    expect(isSubscribedRepo('NixOS/nixpkgs')).toBe(true)
  })

  it('should return false for unsubscribed repository', () => {
    expect(isSubscribedRepo('owner/other-repo')).toBe(false)
  })

  it('should work with custom repos object', () => {
    const customRepos = { 'Custom/Repo': ['main'] }
    expect(isSubscribedRepo('Custom/Repo', customRepos)).toBe(true)
    expect(isSubscribedRepo('Other/Repo', customRepos)).toBe(false)
  })
})

describe('getSubscribedBranches', () => {
  it('should return branches for subscribed repository', () => {
    const branches = getSubscribedBranches('NixOS/nixpkgs')
    expect(branches).toContain('master')
    expect(branches.length).toBeGreaterThan(0)
  })

  it('should return empty array for unsubscribed repository', () => {
    expect(getSubscribedBranches('owner/other-repo')).toEqual([])
  })

  it('should work with custom repos object', () => {
    const customRepos = { 'Custom/Repo': ['main', 'develop'] }
    expect(getSubscribedBranches('Custom/Repo', customRepos)).toEqual(['main', 'develop'])
  })
})

describe('getRelevantBranches', () => {
  const allBranches = [
    'master',
    'nixos-unstable-small',
    'nixos-unstable',
    'nixpkgs-unstable',
    'staging',
    'staging-next',
  ]

  describe('master PRs', () => {
    it('should hide staging and staging-next for master-targeted PRs', () => {
      const result = getRelevantBranches('master', allBranches)
      expect(result).toContain('master')
      expect(result).toContain('nixos-unstable-small')
      expect(result).toContain('nixos-unstable')
      expect(result).toContain('nixpkgs-unstable')
      expect(result).not.toContain('staging')
      expect(result).not.toContain('staging-next')
    })

    it('should return 4 branches for master PRs', () => {
      const result = getRelevantBranches('master', allBranches)
      expect(result).toHaveLength(4)
    })
  })

  describe('staging PRs', () => {
    it('should show all 6 branches for staging-targeted PRs', () => {
      const result = getRelevantBranches('staging', allBranches)
      expect(result).toHaveLength(6)
      expect(result).toContain('staging')
      expect(result).toContain('staging-next')
      expect(result).toContain('master')
      expect(result).toContain('nixos-unstable-small')
      expect(result).toContain('nixos-unstable')
      expect(result).toContain('nixpkgs-unstable')
    })

    it('should return the same array reference for staging PRs', () => {
      const result = getRelevantBranches('staging', allBranches)
      expect(result).toBe(allBranches)
    })
  })

  describe('staging-next PRs', () => {
    it('should hide staging but show staging-next for staging-next-targeted PRs', () => {
      const result = getRelevantBranches('staging-next', allBranches)
      expect(result).toContain('staging-next')
      expect(result).toContain('master')
      expect(result).toContain('nixos-unstable-small')
      expect(result).toContain('nixos-unstable')
      expect(result).toContain('nixpkgs-unstable')
      expect(result).not.toContain('staging')
    })

    it('should return 5 branches for staging-next PRs', () => {
      const result = getRelevantBranches('staging-next', allBranches)
      expect(result).toHaveLength(5)
    })
  })

  describe('unknown base branch', () => {
    it('should show all branches for unknown base branch', () => {
      const result = getRelevantBranches('release-24.11', allBranches)
      expect(result).toHaveLength(6)
    })
  })

  describe('edge cases', () => {
    it('should handle null baseBranch', () => {
      const result = getRelevantBranches(null, allBranches)
      expect(result).toEqual(allBranches)
    })

    it('should handle undefined baseBranch', () => {
      const result = getRelevantBranches(undefined, allBranches)
      expect(result).toEqual(allBranches)
    })

    it('should handle empty string baseBranch', () => {
      const result = getRelevantBranches('', allBranches)
      expect(result).toEqual(allBranches)
    })

    it('should handle null allBranches', () => {
      const result = getRelevantBranches('master', null)
      expect(result).toEqual([])
    })

    it('should handle empty allBranches', () => {
      const result = getRelevantBranches('master', [])
      expect(result).toEqual([])
    })
  })

  describe('with real subscribedRepos data', () => {
    it('should filter NixOS/nixpkgs branches for a master PR', () => {
      const branches = getSubscribedBranches('NixOS/nixpkgs')
      const result = getRelevantBranches('master', branches)
      expect(result).not.toContain('staging')
      expect(result).not.toContain('staging-next')
      expect(result).toContain('master')
    })

    it('should keep all NixOS/nixpkgs branches for a staging PR', () => {
      const branches = getSubscribedBranches('NixOS/nixpkgs')
      const result = getRelevantBranches('staging', branches)
      expect(result).toEqual(branches)
    })
  })
})

describe('GITHUB_TOKEN_STORAGE_KEY', () => {
  it('should be defined as expected', () => {
    expect(GITHUB_TOKEN_STORAGE_KEY).toBe('github_api_token')
  })
})

describe('PR_SUMMARY_SELECTOR', () => {
  it('should be defined for the current GitHub DOM structure', () => {
    expect(PR_SUMMARY_SELECTOR).toBe('[class*="PullRequestHeaderSummary-module__summaryContainer"]')
  })

  it('should match elements with the PullRequestHeaderSummary CSS Modules class', () => {
    // Simulate the current GitHub PR header DOM structure.
    document.body.innerHTML = `
      <div class="f6 text-normal">
        <span class="fgColor-muted d-flex flex-items-center overflow-hidden PullRequestHeaderSummary-module__summaryContainer__it2THio">
          merged 1 commit into master
        </span>
      </div>
    `
    const el = document.querySelector(PR_SUMMARY_SELECTOR)
    expect(el).not.toBeNull()
    expect(el.tagName).toBe('SPAN')
  })

  it('should match even if the CSS Modules hash changes', () => {
    // The hash suffix can change with redeployments.
    document.body.innerHTML = `
      <span class="PullRequestHeaderSummary-module__summaryContainer__xyz123">summary</span>
    `
    const el = document.querySelector(PR_SUMMARY_SELECTOR)
    expect(el).not.toBeNull()
  })

  it('should not match unrelated elements', () => {
    document.body.innerHTML = `
      <span class="some-other-class">summary</span>
    `
    const el = document.querySelector(PR_SUMMARY_SELECTOR)
    expect(el).toBeNull()
  })
})

describe('PR_LEGACY_SELECTOR', () => {
  it('should be defined for the legacy GitHub DOM structure', () => {
    expect(PR_LEGACY_SELECTOR).toBe('.gh-header-meta div:last-child')
  })

  it('should match the legacy GitHub PR header structure', () => {
    document.body.innerHTML = `
      <div class="gh-header-meta">
        <div>first child</div>
        <div>last child - PR info</div>
      </div>
    `
    const el = document.querySelector(PR_LEGACY_SELECTOR)
    expect(el).not.toBeNull()
    expect(el.textContent).toBe('last child - PR info')
  })
})

describe('isPRMerged', () => {
  it('should return true for a merged PR', () => {
    expect(isPRMerged(mockPR484788)).toBe(true)
  })

  it('should return false for an open PR', () => {
    expect(isPRMerged(mockOpenPR)).toBe(false)
  })

  it('should return false for null or undefined', () => {
    expect(isPRMerged(null)).toBe(false)
    expect(isPRMerged(undefined)).toBe(false)
  })

  it('should return false for an object without merged property', () => {
    expect(isPRMerged({})).toBe(false)
    expect(isPRMerged({ state: 'closed' })).toBe(false)
  })

  it('should return false when merged is not strictly true', () => {
    expect(isPRMerged({ merged: false })).toBe(false)
    expect(isPRMerged({ merged: null })).toBe(false)
    expect(isPRMerged({ merged: 'true' })).toBe(false) // String, not boolean
  })
})

describe('shouldShowMergeCommit', () => {
  it('should return true for a merged PR with merge_commit_sha', () => {
    expect(shouldShowMergeCommit(mockPR484788)).toBe(true)
  })

  it('should return false for an open PR even with merge_commit_sha', () => {
    // GitHub provides merge_commit_sha even for open PRs, but we should not show it
    expect(mockOpenPR.merge_commit_sha).toBeDefined()
    expect(shouldShowMergeCommit(mockOpenPR)).toBe(false)
  })

  it('should return false for null or undefined', () => {
    expect(shouldShowMergeCommit(null)).toBe(false)
    expect(shouldShowMergeCommit(undefined)).toBe(false)
  })

  it('should return false for merged PR without merge_commit_sha', () => {
    const prWithoutSha = { merged: true, merge_commit_sha: null }
    expect(shouldShowMergeCommit(prWithoutSha)).toBe(false)
  })

  it('should return false for merged PR with empty merge_commit_sha', () => {
    const prWithEmptySha = { merged: true, merge_commit_sha: '' }
    expect(shouldShowMergeCommit(prWithEmptySha)).toBe(false)
  })
})

/**
 * Integration tests using mock data from real PR #484788.
 * https://github.com/NixOS/nixpkgs/pull/484788
 */
describe('integration tests with PR #484788 mock data', () => {
  describe('parsePRUrl with real PR URL', () => {
    it('should parse the real PR #484788 URL', () => {
      const result = parsePRUrl(mockPR484788Derived.prUrl)
      expect(result).toEqual({
        repoPath: 'NixOS/nixpkgs',
        prNumber: '484788',
      })
    })
  })

  describe('normalizeRepoName with real repo', () => {
    it('should normalize NixOS/nixpkgs from mock data', () => {
      const result = normalizeRepoName(mockPR484788Derived.repoPath)
      expect(result).toBe('NixOS/nixpkgs')
    })
  })

  describe('getPRApiUrl with real PR data', () => {
    it('should generate correct API URL for PR #484788', () => {
      const result = getPRApiUrl(
        mockPR484788Derived.repoPath,
        mockPR484788Derived.prNumber
      )
      expect(result).toBe(mockPR484788Derived.apiUrl)
    })
  })

  describe('getCommitUrl with real commit hash', () => {
    it('should generate correct commit URL for PR #484788', () => {
      const result = getCommitUrl(
        mockPR484788Derived.repoPath,
        mockPR484788Derived.mergeCommitSha
      )
      expect(result).toBe(mockPR484788Derived.commitUrl)
    })
  })

  describe('shortenCommitHash with real commit hashes', () => {
    it('should shorten the merge commit hash correctly', () => {
      const result = shortenCommitHash(mockPR484788.merge_commit_sha)
      expect(result).toBe('3f96296')
    })

    it('should shorten the head commit hash correctly', () => {
      const result = shortenCommitHash(mockPR484788.head.sha)
      expect(result).toBe('f36ef91')
    })
  })

  describe('isSubscribedRepo with real repo', () => {
    it('should confirm NixOS/nixpkgs is subscribed', () => {
      expect(isSubscribedRepo(mockPR484788Derived.repoPath)).toBe(true)
    })
  })

  describe('getSubscribedBranches for NixOS/nixpkgs', () => {
    it('should return all tracked branches', () => {
      const branches = getSubscribedBranches(mockPR484788Derived.repoPath)
      expect(branches).toContain('master')
      expect(branches).toContain('nixos-unstable')
      expect(branches).toContain('nixpkgs-unstable')
      expect(branches).toContain('nixos-unstable-small')
      expect(branches).toContain('staging')
      expect(branches).toContain('staging-next')
    })
  })

  describe('getCompareUrl with real commit hash', () => {
    it('should generate correct compare URL for master branch', () => {
      const result = getCompareUrl(
        mockPR484788Derived.repoPath,
        mockPR484788Derived.mergeCommitSha,
        'master'
      )
      expect(result).toBe(mockPR484788Derived.compareUrls.master)
    })

    it('should generate correct compare URL for nixos-unstable branch', () => {
      const result = getCompareUrl(
        mockPR484788Derived.repoPath,
        mockPR484788Derived.mergeCommitSha,
        'nixos-unstable'
      )
      expect(result).toBe(mockPR484788Derived.compareUrls['nixos-unstable'])
    })
  })

  describe('createBranchMetadata for NixOS/nixpkgs branches', () => {
    it('should create metadata for all subscribed branches', () => {
      const branches = getSubscribedBranches(mockPR484788Derived.repoPath)
      const metadata = createBranchMetadata(branches)

      expect(metadata).toHaveLength(6)
      expect(metadata).toContainEqual({ name: 'master', id: 'compare-master' })
      expect(metadata).toContainEqual({ name: 'nixos-unstable', id: 'compare-nixos-unstable' })
      expect(metadata).toContainEqual({ name: 'nixos-unstable-small', id: 'compare-nixos-unstable-small' })
      expect(metadata).toContainEqual({ name: 'staging', id: 'compare-staging' })
    })
  })

  describe('isCommitInBranch with mock comparison responses', () => {
    it('should return true for ahead status', () => {
      expect(isCommitInBranch(mockBranchComparisons.ahead.status)).toBe(true)
    })

    it('should return true for identical status', () => {
      expect(isCommitInBranch(mockBranchComparisons.identical.status)).toBe(true)
    })

    it('should return false for behind status', () => {
      expect(isCommitInBranch(mockBranchComparisons.behind.status)).toBe(false)
    })

    it('should return false for diverged status', () => {
      expect(isCommitInBranch(mockBranchComparisons.diverged.status)).toBe(false)
    })
  })

  describe('mock PR data structure validation', () => {
    it('should have all required fields for a merged PR', () => {
      expect(mockPR484788.merged).toBe(true)
      expect(mockPR484788.merge_commit_sha).toBeDefined()
      expect(mockPR484788.merged_at).toBeDefined()
      expect(mockPR484788.state).toBe('closed')
    })

    it('should have all required fields for an open PR', () => {
      expect(mockOpenPR.merged).toBe(false)
      expect(mockOpenPR.merge_commit_sha).toBeDefined() // GitHub provides this even for open PRs
      expect(mockOpenPR.merged_at).toBeNull()
      expect(mockOpenPR.state).toBe('open')
    })
  })
})

/**
 * Tests using realistic branch status data from January 28, 2026.
 *
 * Based on the CLI output from nixpkgs-branch-tracker-cli.md:
 * - master:              commit present (ahead)
 * - staging:             commit present (ahead)
 * - staging-next:        commit present (ahead)
 * - nixos-unstable-small: not yet propagated (behind)
 * - nixos-unstable:       not yet propagated (behind)
 * - nixpkgs-unstable:     not yet propagated (behind)
 */
describe('PR #484788 branch propagation status (January 28, 2026)', () => {
  describe('mockPR484788BranchStatus structure', () => {
    it('should have the correct merge commit SHA', () => {
      expect(mockPR484788BranchStatus.mergeCommitSha).toBe('3f96296da66f5ecf3d8106c61281b823949a56c0')
    })

    it('should have status for all tracked branches', () => {
      const branchNames = Object.keys(mockPR484788BranchStatus.branches)
      expect(branchNames).toContain('master')
      expect(branchNames).toContain('staging')
      expect(branchNames).toContain('staging-next')
      expect(branchNames).toContain('nixos-unstable-small')
      expect(branchNames).toContain('nixos-unstable')
      expect(branchNames).toContain('nixpkgs-unstable')
    })

    it('should have correct summary of present branches', () => {
      expect(mockPR484788BranchStatus.summary.present).toEqual(['master', 'staging', 'staging-next'])
    })

    it('should have correct summary of not-present branches', () => {
      expect(mockPR484788BranchStatus.summary.notPresent).toEqual([
        'nixos-unstable-small',
        'nixos-unstable',
        'nixpkgs-unstable',
      ])
    })
  })

  describe('isCommitInBranch with realistic branch status', () => {
    it('should return true for master (commit is present)', () => {
      const masterStatus = mockPR484788BranchStatus.branches.master.response.status
      expect(isCommitInBranch(masterStatus)).toBe(true)
      expect(mockPR484788BranchStatus.branches.master.isPresent).toBe(true)
    })

    it('should return true for staging-next (commit is present)', () => {
      const stagingNextStatus = mockPR484788BranchStatus.branches['staging-next'].response.status
      expect(isCommitInBranch(stagingNextStatus)).toBe(true)
      expect(mockPR484788BranchStatus.branches['staging-next'].isPresent).toBe(true)
    })

    it('should return false for nixos-unstable-small (not yet propagated)', () => {
      const status = mockPR484788BranchStatus.branches['nixos-unstable-small'].response.status
      expect(isCommitInBranch(status)).toBe(false)
      expect(mockPR484788BranchStatus.branches['nixos-unstable-small'].isPresent).toBe(false)
    })

    it('should return false for nixos-unstable (not yet propagated)', () => {
      const status = mockPR484788BranchStatus.branches['nixos-unstable'].response.status
      expect(isCommitInBranch(status)).toBe(false)
      expect(mockPR484788BranchStatus.branches['nixos-unstable'].isPresent).toBe(false)
    })

    it('should return false for nixpkgs-unstable (not yet propagated)', () => {
      const status = mockPR484788BranchStatus.branches['nixpkgs-unstable'].response.status
      expect(isCommitInBranch(status)).toBe(false)
      expect(mockPR484788BranchStatus.branches['nixpkgs-unstable'].isPresent).toBe(false)
    })
  })

  describe('checking all branches with isCommitInBranch', () => {
    it('should correctly identify present vs not-present branches', () => {
      const results = {}
      for (const [branchName, branchData] of Object.entries(mockPR484788BranchStatus.branches)) {
        results[branchName] = isCommitInBranch(branchData.response.status)
      }

      // Verify branches where commit is present
      expect(results.master).toBe(true)
      expect(results.staging).toBe(true)
      expect(results['staging-next']).toBe(true)

      // Verify branches where commit is not present
      expect(results['nixos-unstable-small']).toBe(false)
      expect(results['nixos-unstable']).toBe(false)
      expect(results['nixpkgs-unstable']).toBe(false)
    })

    it('should match the summary.present list', () => {
      const presentBranches = Object.entries(mockPR484788BranchStatus.branches)
        .filter(([_, data]) => isCommitInBranch(data.response.status))
        .map(([name, _]) => name)

      expect(presentBranches).toEqual(mockPR484788BranchStatus.summary.present)
    })

    it('should match the summary.notPresent list', () => {
      const notPresentBranches = Object.entries(mockPR484788BranchStatus.branches)
        .filter(([_, data]) => !isCommitInBranch(data.response.status))
        .map(([name, _]) => name)

      expect(notPresentBranches).toEqual(mockPR484788BranchStatus.summary.notPresent)
    })
  })

  describe('getMockBranchResponses helper', () => {
    it('should return responses for all branches', () => {
      const responses = getMockBranchResponses()

      expect(Object.keys(responses)).toHaveLength(6)
      expect(responses.master).toBeDefined()
      expect(responses.staging).toBeDefined()
      expect(responses['staging-next']).toBeDefined()
      expect(responses['nixos-unstable-small']).toBeDefined()
      expect(responses['nixos-unstable']).toBeDefined()
      expect(responses['nixpkgs-unstable']).toBeDefined()
    })

    it('should return valid API response objects', () => {
      const responses = getMockBranchResponses()

      for (const [branchName, response] of Object.entries(responses)) {
        expect(response).toHaveProperty('url')
        expect(response).toHaveProperty('status')
        expect(response).toHaveProperty('ahead_by')
        expect(response).toHaveProperty('behind_by')
        expect(['ahead', 'behind', 'identical', 'diverged']).toContain(response.status)
      }
    })
  })

  describe('branch descriptions', () => {
    it('should have descriptions for all branches', () => {
      for (const branchData of Object.values(mockPR484788BranchStatus.branches)) {
        expect(branchData.description).toBeDefined()
        expect(branchData.description.length).toBeGreaterThan(0)
      }
    })

    it('should have accurate descriptions', () => {
      expect(mockPR484788BranchStatus.branches.master.description).toBe(
        'Main development branch where PRs are merged first'
      )
      expect(mockPR484788BranchStatus.branches['nixpkgs-unstable'].description).toBe(
        'Continuously updated from master after CI passes (for general packages)'
      )
    })
  })
})

// ============================================================================
// Mock Test Fixtures (fetched January 29, 2026)
// ============================================================================

/**
 * Mock test: Open PR #485005 (forgejo: 14.0.1 -> 14.0.2)
 * https://github.com/NixOS/nixpkgs/pull/485005
 *
 * Tests that unmerged PRs are handled correctly and do not display
 * merge commit information.
 */
describe('mock test: open PR #485005 (forgejo update)', () => {
  describe('PR state validation', () => {
    it('should be an open PR', () => {
      expect(mockOpenPR485005.state).toBe('open')
      expect(mockOpenPR485005.merged).toBe(false)
      expect(mockOpenPR485005.merged_at).toBeNull()
    })

    it('should have a merge_commit_sha even though not merged', () => {
      // GitHub provides this for open PRs, but we should NOT display it
      expect(mockOpenPR485005.merge_commit_sha).toBeDefined()
      expect(mockOpenPR485005.merge_commit_sha).toBe('813f9a83177c6bcde1cec294b1fe9b7c46dbca6c')
    })

    it('should have correct PR metadata', () => {
      expect(mockOpenPR485005.number).toBe(485005)
      expect(mockOpenPR485005.title).toBe('forgejo: 14.0.1 -> 14.0.2')
      expect(mockOpenPR485005.user.login).toBe('emilylange')
    })
  })

  describe('isPRMerged with open PR', () => {
    it('should return false for open PR', () => {
      expect(isPRMerged(mockOpenPR485005)).toBe(false)
    })
  })

  describe('shouldShowMergeCommit with open PR', () => {
    it('should return false even though merge_commit_sha exists', () => {
      // This is the key test: we should NOT show merge commit for open PRs
      expect(mockOpenPR485005.merge_commit_sha).toBeDefined()
      expect(shouldShowMergeCommit(mockOpenPR485005)).toBe(false)
    })
  })

  describe('URL parsing with live PR', () => {
    it('should parse the live PR URL correctly', () => {
      const result = parsePRUrl(mockOpenPR485005Derived.prUrl)
      expect(result).toEqual({
        repoPath: 'NixOS/nixpkgs',
        prNumber: '485005',
      })
    })
  })

  describe('commit hash handling', () => {
    it('should shorten head commit hash correctly', () => {
      expect(shortenCommitHash(mockOpenPR485005.head.sha)).toBe('80cd3ad')
    })

    it('should match derived short hash', () => {
      expect(shortenCommitHash(mockOpenPR485005.head.sha)).toBe(mockOpenPR485005Derived.headCommitShort)
    })
  })
})

/**
 * Mock test: Merged PR #484965 (opencode: 1.1.36 -> 1.1.41)
 * https://github.com/NixOS/nixpkgs/pull/484965
 *
 * Tests that merged PRs display merge commit and branch status correctly.
 */
describe('mock test: merged PR #484965 (opencode update)', () => {
  describe('PR state validation', () => {
    it('should be a merged PR', () => {
      expect(mockMergedPR484965.state).toBe('closed')
      expect(mockMergedPR484965.merged).toBe(true)
      expect(mockMergedPR484965.merged_at).toBe('2026-01-29T07:01:18Z')
    })

    it('should have a valid merge_commit_sha', () => {
      expect(mockMergedPR484965.merge_commit_sha).toBe('1b0767ac55a8b394f01290ba40116a70eb7d7ccd')
    })

    it('should have correct PR metadata', () => {
      expect(mockMergedPR484965.number).toBe(484965)
      expect(mockMergedPR484965.title).toBe('opencode: 1.1.36 -> 1.1.41')
      expect(mockMergedPR484965.user.login).toBe('r-ryantm')
    })
  })

  describe('isPRMerged with merged PR', () => {
    it('should return true for merged PR', () => {
      expect(isPRMerged(mockMergedPR484965)).toBe(true)
    })
  })

  describe('shouldShowMergeCommit with merged PR', () => {
    it('should return true for merged PR with valid merge_commit_sha', () => {
      expect(shouldShowMergeCommit(mockMergedPR484965)).toBe(true)
    })
  })

  describe('URL parsing with live PR', () => {
    it('should parse the live PR URL correctly', () => {
      const result = parsePRUrl(mockMergedPR484965Derived.prUrl)
      expect(result).toEqual({
        repoPath: 'NixOS/nixpkgs',
        prNumber: '484965',
      })
    })
  })

  describe('commit hash handling', () => {
    it('should shorten merge commit hash correctly', () => {
      expect(shortenCommitHash(mockMergedPR484965.merge_commit_sha)).toBe('1b0767a')
    })

    it('should match derived short hash', () => {
      expect(shortenCommitHash(mockMergedPR484965.merge_commit_sha)).toBe(mockMergedPR484965Derived.mergeCommitShort)
    })
  })

  describe('URL generation', () => {
    it('should generate correct commit URL', () => {
      const result = getCommitUrl(
        mockMergedPR484965Derived.repoPath,
        mockMergedPR484965Derived.mergeCommitSha
      )
      expect(result).toBe(mockMergedPR484965Derived.commitUrl)
    })

    it('should generate correct API URL', () => {
      const result = getPRApiUrl(
        mockMergedPR484965Derived.repoPath,
        mockMergedPR484965Derived.prNumber
      )
      expect(result).toBe(mockMergedPR484965Derived.apiUrl)
    })
  })

  describe('branch propagation status', () => {
    it('should show commit is in master', () => {
      const status = mockMergedPR484965BranchStatus.branches.master.response.status
      expect(isCommitInBranch(status)).toBe(true)
    })

    it('should show commit is in staging', () => {
      const status = mockMergedPR484965BranchStatus.branches.staging.response.status
      expect(isCommitInBranch(status)).toBe(true)
    })

    it('should show commit is NOT in nixos-unstable', () => {
      const status = mockMergedPR484965BranchStatus.branches['nixos-unstable'].response.status
      expect(isCommitInBranch(status)).toBe(false)
    })

    it('should show commit is NOT in nixpkgs-unstable', () => {
      const status = mockMergedPR484965BranchStatus.branches['nixpkgs-unstable'].response.status
      expect(isCommitInBranch(status)).toBe(false)
    })

    it('should handle diverged status for staging-next', () => {
      const status = mockMergedPR484965BranchStatus.branches['staging-next'].response.status
      expect(status).toBe('diverged')
      expect(isCommitInBranch(status)).toBe(false)
    })

    it('should have correct summary of present branches', () => {
      expect(mockMergedPR484965BranchStatus.summary.present).toEqual(['master', 'staging'])
    })

    it('should have correct summary of not-present branches', () => {
      expect(mockMergedPR484965BranchStatus.summary.notPresent).toContain('staging-next')
      expect(mockMergedPR484965BranchStatus.summary.notPresent).toContain('nixos-unstable')
      expect(mockMergedPR484965BranchStatus.summary.notPresent).toContain('nixpkgs-unstable')
    })
  })
})

/**
 * Comparison tests between open and merged PRs.
 */
describe('comparison: open vs merged PR behavior', () => {
  it('should correctly differentiate merged state', () => {
    expect(isPRMerged(mockOpenPR485005)).toBe(false)
    expect(isPRMerged(mockMergedPR484965)).toBe(true)
  })

  it('should only show merge commit for merged PR', () => {
    expect(shouldShowMergeCommit(mockOpenPR485005)).toBe(false)
    expect(shouldShowMergeCommit(mockMergedPR484965)).toBe(true)
  })

  it('both PRs have merge_commit_sha but only merged should display it', () => {
    // Both have the field populated by GitHub
    expect(mockOpenPR485005.merge_commit_sha).toBeDefined()
    expect(mockMergedPR484965.merge_commit_sha).toBeDefined()

    // But only merged PR should show it
    expect(shouldShowMergeCommit(mockOpenPR485005)).toBe(false)
    expect(shouldShowMergeCommit(mockMergedPR484965)).toBe(true)
  })

  it('should confirm both are NixOS/nixpkgs PRs', () => {
    expect(isSubscribedRepo(mockOpenPR485005Derived.repoPath)).toBe(true)
    expect(isSubscribedRepo(mockMergedPR484965Derived.repoPath)).toBe(true)
  })
})

/**
 * Tests for smart branch filtering based on PR base.ref.
 *
 * The script should only show branches relevant to the PR's target branch:
 * - master PRs: hide staging and staging-next
 * - staging PRs: show all branches
 * - staging-next PRs: hide staging
 */
describe('smart branch filtering with mock PRs', () => {
  const allBranches = subscribedRepos['NixOS/nixpkgs']

  describe('master-targeted PRs (PR #484788, PR #484965)', () => {
    it('PR #484788 targets master', () => {
      expect(mockPR484788.base.ref).toBe('master')
    })

    it('PR #484965 targets master', () => {
      expect(mockMergedPR484965.base.ref).toBe('master')
    })

    it('should filter out staging and staging-next for PR #484788', () => {
      const relevant = getRelevantBranches(mockPR484788.base.ref, allBranches)
      expect(relevant).not.toContain('staging')
      expect(relevant).not.toContain('staging-next')
      expect(relevant).toHaveLength(4)
    })

    it('should filter out staging and staging-next for PR #484965', () => {
      const relevant = getRelevantBranches(mockMergedPR484965.base.ref, allBranches)
      expect(relevant).not.toContain('staging')
      expect(relevant).not.toContain('staging-next')
      expect(relevant).toHaveLength(4)
    })
  })

  describe('staging-targeted PR (mockStagingPR)', () => {
    it('mock staging PR targets staging', () => {
      expect(mockStagingPR.base.ref).toBe('staging')
    })

    it('should show all 6 branches for staging PR', () => {
      const relevant = getRelevantBranches(mockStagingPR.base.ref, allBranches)
      expect(relevant).toHaveLength(6)
      expect(relevant).toContain('staging')
      expect(relevant).toContain('staging-next')
      expect(relevant).toContain('master')
    })

    it('staging PR should be merged', () => {
      expect(isPRMerged(mockStagingPR)).toBe(true)
    })
  })

  describe('staging-next-targeted PR (mockStagingNextPR)', () => {
    it('mock staging-next PR targets staging-next', () => {
      expect(mockStagingNextPR.base.ref).toBe('staging-next')
    })

    it('should hide staging but show staging-next for staging-next PR', () => {
      const relevant = getRelevantBranches(mockStagingNextPR.base.ref, allBranches)
      expect(relevant).not.toContain('staging')
      expect(relevant).toContain('staging-next')
      expect(relevant).toContain('master')
      expect(relevant).toHaveLength(5)
    })

    it('staging-next PR should be merged', () => {
      expect(isPRMerged(mockStagingNextPR)).toBe(true)
    })
  })

  describe('open PR #485005 targets master', () => {
    it('should target master', () => {
      expect(mockOpenPR485005.base.ref).toBe('master')
    })

    it('should filter out staging and staging-next', () => {
      const relevant = getRelevantBranches(mockOpenPR485005.base.ref, allBranches)
      expect(relevant).not.toContain('staging')
      expect(relevant).not.toContain('staging-next')
    })
  })

  describe('createBranchMetadata with filtered branches', () => {
    it('should create metadata only for relevant master PR branches', () => {
      const relevant = getRelevantBranches('master', allBranches)
      const metadata = createBranchMetadata(relevant)
      expect(metadata).toHaveLength(4)
      expect(metadata.map(m => m.name)).not.toContain('staging')
      expect(metadata.map(m => m.name)).not.toContain('staging-next')
    })

    it('should create metadata for all branches for staging PR', () => {
      const relevant = getRelevantBranches('staging', allBranches)
      const metadata = createBranchMetadata(relevant)
      expect(metadata).toHaveLength(6)
    })

    it('should create metadata for 5 branches for staging-next PR', () => {
      const relevant = getRelevantBranches('staging-next', allBranches)
      const metadata = createBranchMetadata(relevant)
      expect(metadata).toHaveLength(5)
      expect(metadata.map(m => m.name)).not.toContain('staging')
      expect(metadata.map(m => m.name)).toContain('staging-next')
    })
  })
})
