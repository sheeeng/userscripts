/**
 * Mock fixtures for testing the Nixpkgs PR Branch Tracker userscript.
 *
 * These fixtures are based on real data from GitHub PR #484788:
 * https://github.com/NixOS/nixpkgs/pull/484788
 *
 * PR: _3cpio: 0.13.0 -> 0.13.1
 * Author: r-ryantm (automated update)
 * Merged: January 28, 2026
 */

/**
 * Mock PR API response for a merged pull request.
 * Based on: https://api.github.com/repos/NixOS/nixpkgs/pulls/484788
 */
export const mockPR484788 = {
  url: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/484788',
  id: 3219657083,
  node_id: 'PR_kwDOAEVQ_M6_6BF7',
  html_url: 'https://github.com/NixOS/nixpkgs/pull/484788',
  diff_url: 'https://github.com/NixOS/nixpkgs/pull/484788.diff',
  patch_url: 'https://github.com/NixOS/nixpkgs/pull/484788.patch',
  issue_url: 'https://api.github.com/repos/NixOS/nixpkgs/issues/484788',
  commits_url: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/484788/commits',
  number: 484788,
  state: 'closed',
  locked: false,
  title: '_3cpio: 0.13.0 -> 0.13.1',
  user: {
    login: 'r-ryantm',
    id: 37933096,
    node_id: 'MDQ6VXNlcjM3OTMzMDk2',
    avatar_url: 'https://avatars.githubusercontent.com/u/37933096?v=4',
    html_url: 'https://github.com/r-ryantm',
    type: 'User',
  },
  labels: [
    {
      id: 290122819,
      name: '8.has: package (update)',
      description: 'This PR updates a package to a newer version',
      color: '009800',
    },
    {
      id: 731733923,
      name: '10.rebuild-linux: 1-10',
      description: 'This PR causes between 1 and 10 packages to rebuild on Linux.',
      color: 'eeffee',
    },
    {
      id: 737642262,
      name: '10.rebuild-darwin: 0',
      description: 'This PR does not cause any packages to rebuild on Darwin.',
      color: 'eeffee',
    },
    {
      id: 9566775675,
      name: '2.status: merge-bot eligible',
      description: 'This PR can be merged by commenting "@NixOS/nixpkgs-merge-bot merge".',
      color: '006b75',
    },
  ],
  created_at: '2026-01-28T16:58:45Z',
  updated_at: '2026-01-29T00:42:06Z',
  closed_at: '2026-01-28T17:46:11Z',
  merged_at: '2026-01-28T17:46:11Z',
  merge_commit_sha: '3f96296da66f5ecf3d8106c61281b823949a56c0',
  merged: true,
  mergeable: null,
  mergeable_state: 'unknown',
  merged_by: {
    login: 'nixpkgs-ci',
    id: 487568,
    type: 'Bot',
  },
  base: {
    label: 'NixOS:master',
    ref: 'master',
    sha: 'abc123def456789',
    repo: {
      id: 1234567,
      name: 'nixpkgs',
      full_name: 'NixOS/nixpkgs',
      html_url: 'https://github.com/NixOS/nixpkgs',
    },
  },
  head: {
    label: 'r-ryantm:auto-update/_3cpio',
    ref: 'auto-update/_3cpio',
    sha: 'f36ef91309dd6faf7127736dcfdf2a12303924be',
    repo: {
      id: 9876543,
      name: 'nixpkgs',
      full_name: 'r-ryantm/nixpkgs',
      html_url: 'https://github.com/r-ryantm/nixpkgs',
    },
  },
}

/**
 * Mock PR API response for an unmerged (open) pull request.
 */
export const mockOpenPR = {
  url: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/999999',
  id: 9999999999,
  number: 999999,
  state: 'open',
  locked: false,
  title: 'example-package: 1.0.0 -> 2.0.0',
  user: {
    login: 'test-user',
    id: 12345678,
    type: 'User',
  },
  created_at: '2026-01-28T12:00:00Z',
  updated_at: '2026-01-28T12:00:00Z',
  closed_at: null,
  merged_at: null,
  merge_commit_sha: 'abc123def456789012345678901234567890abcd',
  merged: false,
  mergeable: true,
  mergeable_state: 'clean',
  base: {
    label: 'NixOS:master',
    ref: 'master',
    sha: 'def456abc789',
    repo: {
      name: 'nixpkgs',
      full_name: 'NixOS/nixpkgs',
    },
  },
  head: {
    label: 'test-user:feature-branch',
    ref: 'feature-branch',
    sha: 'abc123def456',
    repo: {
      name: 'nixpkgs',
      full_name: 'test-user/nixpkgs',
    },
  },
}

/**
 * Mock branch comparison API responses.
 * Used when checking if a commit has propagated to various branches.
 */
export const mockBranchComparisons = {
  /**
   * Commit is ahead of branch (commit has propagated).
   */
  ahead: {
    url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296...master',
    status: 'ahead',
    ahead_by: 150,
    behind_by: 0,
    total_commits: 150,
    commits: [],
    files: [],
  },

  /**
   * Commit is behind branch (commit has not propagated yet).
   */
  behind: {
    url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296...nixpkgs-unstable',
    status: 'behind',
    ahead_by: 0,
    behind_by: 50,
    total_commits: 0,
    commits: [],
    files: [],
  },

  /**
   * Commit is identical to branch head.
   */
  identical: {
    url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296...staging-next',
    status: 'identical',
    ahead_by: 0,
    behind_by: 0,
    total_commits: 0,
    commits: [],
    files: [],
  },

  /**
   * Branches have diverged.
   */
  diverged: {
    url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/abc123...feature',
    status: 'diverged',
    ahead_by: 10,
    behind_by: 5,
    total_commits: 10,
    commits: [],
    files: [],
  },
}

/**
 * Mock branch status for PR #484788 as of January 28, 2026.
 *
 * Based on the CLI output from nixpkgs-branch-tracker-cli.md:
 * - master:              ✅ commit present (ahead)
 * - staging-next:        ✅ commit present (ahead)
 * - nixos-unstable-small: ⚠️ not yet propagated (behind)
 * - nixos-unstable:       ⚠️ not yet propagated (behind)
 * - nixpkgs-unstable:     ⚠️ not yet propagated (behind)
 */
export const mockPR484788BranchStatus = {
  mergeCommitSha: '3f96296da66f5ecf3d8106c61281b823949a56c0',
  checkedAt: '2026-01-28T18:00:00Z',

  branches: {
    master: {
      name: 'master',
      status: 'ahead',
      isPresent: true,
      description: 'Main development branch where PRs are merged first',
      compareUrl: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...master',
      response: {
        url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...master',
        status: 'ahead',
        ahead_by: 247,
        behind_by: 0,
        total_commits: 247,
        commits: [],
        files: [],
      },
    },

    'staging-next': {
      name: 'staging-next',
      status: 'ahead',
      isPresent: true,
      description: 'Staging area for large rebuilds before merging to master',
      compareUrl: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...staging-next',
      response: {
        url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...staging-next',
        status: 'ahead',
        ahead_by: 89,
        behind_by: 0,
        total_commits: 89,
        commits: [],
        files: [],
      },
    },

    'nixos-unstable-small': {
      name: 'nixos-unstable-small',
      status: 'behind',
      isPresent: false,
      description: 'Fast-track channel for small, critical updates',
      compareUrl: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable-small',
      response: {
        url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable-small',
        status: 'behind',
        ahead_by: 0,
        behind_by: 312,
        total_commits: 0,
        commits: [],
        files: [],
      },
    },

    'nixos-unstable': {
      name: 'nixos-unstable',
      status: 'behind',
      isPresent: false,
      description: 'Like nixpkgs-unstable but includes NixOS tests',
      compareUrl: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable',
      response: {
        url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable',
        status: 'behind',
        ahead_by: 0,
        behind_by: 428,
        total_commits: 0,
        commits: [],
        files: [],
      },
    },

    'nixpkgs-unstable': {
      name: 'nixpkgs-unstable',
      status: 'behind',
      isPresent: false,
      description: 'Continuously updated from master after CI passes (for general packages)',
      compareUrl: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixpkgs-unstable',
      response: {
        url: 'https://api.github.com/repos/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixpkgs-unstable',
        status: 'behind',
        ahead_by: 0,
        behind_by: 385,
        total_commits: 0,
        commits: [],
        files: [],
      },
    },
  },

  /**
   * Summary of branch propagation status.
   */
  summary: {
    present: ['master', 'staging-next'],
    notPresent: ['nixos-unstable-small', 'nixos-unstable', 'nixpkgs-unstable'],
  },
}

/**
 * Helper to get all branch comparison responses for mocking fetch calls.
 * Returns an object mapping branch names to their API responses.
 */
export const getMockBranchResponses = () => {
  const responses = {}
  for (const [branchName, branchData] of Object.entries(mockPR484788BranchStatus.branches)) {
    responses[branchName] = branchData.response
  }
  return responses
}

/**
 * Mock data derived from PR #484788 for use in tests.
 */
export const mockPR484788Derived = {
  prUrl: 'https://github.com/NixOS/nixpkgs/pull/484788',
  repoPath: 'NixOS/nixpkgs',
  prNumber: '484788',
  mergeCommitSha: '3f96296da66f5ecf3d8106c61281b823949a56c0',
  mergeCommitShort: '3f96296',
  headCommitSha: 'f36ef91309dd6faf7127736dcfdf2a12303924be',
  headCommitShort: 'f36ef91',
  commitUrl: 'https://github.com/NixOS/nixpkgs/commit/3f96296da66f5ecf3d8106c61281b823949a56c0',
  apiUrl: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/484788',
  compareUrls: {
    master: 'https://github.com/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...master',
    'nixos-unstable': 'https://github.com/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable',
    'nixpkgs-unstable': 'https://github.com/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixpkgs-unstable',
    'nixos-unstable-small': 'https://github.com/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...nixos-unstable-small',
    'staging-next': 'https://github.com/NixOS/nixpkgs/compare/3f96296da66f5ecf3d8106c61281b823949a56c0...staging-next',
  },
}

/**
 * Helper function to create a mock fetch response.
 *
 * @param {Object} data - The data to return in the response.
 * @param {number} status - HTTP status code (default 200).
 * @returns {Object} A mock Response-like object.
 */
export const createMockResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Map([['content-type', 'application/json']]),
  text: async () => JSON.stringify(data),
  json: async () => data,
})

/**
 * Helper function to create a mock fetch that returns different responses based on URL.
 *
 * @param {Object} urlResponses - Map of URL patterns to response data.
 * @returns {Function} A mock fetch function.
 */
export const createMockFetch = (urlResponses) => {
  return async (url, options) => {
    for (const [pattern, response] of Object.entries(urlResponses)) {
      if (url.includes(pattern)) {
        return createMockResponse(response)
      }
    }
    return createMockResponse({ message: 'Not Found' }, 404)
  }
}

// ============================================================================
// Mock Fixtures Based on Real PRs (fetched January 29, 2026)
// ============================================================================

/**
 * Mock stub: Open PR #485005 (forgejo: 14.0.1 -> 14.0.2)
 * https://github.com/NixOS/nixpkgs/pull/485005
 *
 * Based on real open PR data fetched on January 29, 2026.
 * Used to test that unmerged PRs do not display merge commit information.
 */
export const mockOpenPR485005 = {
  url: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/485005',
  id: 3222612820,
  node_id: 'PR_kwDOAEVQ_M7AFStU',
  html_url: 'https://github.com/NixOS/nixpkgs/pull/485005',
  number: 485005,
  state: 'open',
  locked: false,
  title: 'forgejo: 14.0.1 -> 14.0.2',
  user: {
    login: 'emilylange',
    id: 55066419,
    type: 'User',
  },
  created_at: '2026-01-29T09:46:39Z',
  updated_at: '2026-01-29T09:48:18Z',
  closed_at: null,
  merged_at: null,
  // Note: GitHub provides merge_commit_sha even for open PRs.
  // This should NOT be displayed to users since the PR is not merged.
  merge_commit_sha: '813f9a83177c6bcde1cec294b1fe9b7c46dbca6c',
  merged: false,
  mergeable: true,
  mergeable_state: 'blocked',
  base: {
    label: 'NixOS:master',
    ref: 'master',
    sha: 'aea86a71ccb9c1c0003507988271015397953833',
    repo: {
      name: 'nixpkgs',
      full_name: 'NixOS/nixpkgs',
    },
  },
  head: {
    label: 'emilylange:forgejo',
    ref: 'forgejo',
    sha: '80cd3adab00437b69c03feeabb22b868ab75acbc',
    repo: {
      name: 'nixpkgs',
      full_name: 'emilylange/nixpkgs',
    },
  },
}

/**
 * Derived data for mock open PR #485005.
 */
export const mockOpenPR485005Derived = {
  prUrl: 'https://github.com/NixOS/nixpkgs/pull/485005',
  repoPath: 'NixOS/nixpkgs',
  prNumber: '485005',
  // These should NOT be used/displayed since PR is not merged
  mergeCommitSha: '813f9a83177c6bcde1cec294b1fe9b7c46dbca6c',
  mergeCommitShort: '813f9a8',
  headCommitSha: '80cd3adab00437b69c03feeabb22b868ab75acbc',
  headCommitShort: '80cd3ad',
}

/**
 * Mock stub: Merged PR #484965 (opencode: 1.1.36 -> 1.1.41)
 * https://github.com/NixOS/nixpkgs/pull/484965
 *
 * Based on real merged PR data fetched on January 29, 2026.
 * Used to test that merged PRs display merge commit and branch status correctly.
 */
export const mockMergedPR484965 = {
  url: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/484965',
  id: 3221772950,
  node_id: 'PR_kwDOAEVQ_M7ACFqW',
  html_url: 'https://github.com/NixOS/nixpkgs/pull/484965',
  number: 484965,
  state: 'closed',
  locked: false,
  title: 'opencode: 1.1.36 -> 1.1.41',
  user: {
    login: 'r-ryantm',
    id: 37933096,
    type: 'User',
  },
  created_at: '2026-01-29T04:48:27Z',
  updated_at: '2026-01-29T07:01:18Z',
  closed_at: '2026-01-29T07:01:18Z',
  merged_at: '2026-01-29T07:01:18Z',
  merge_commit_sha: '1b0767ac55a8b394f01290ba40116a70eb7d7ccd',
  merged: true,
  mergeable: null,
  mergeable_state: 'unknown',
  base: {
    label: 'NixOS:master',
    ref: 'master',
    sha: '640da2aa539ac85ccebda6d013cfefadd0d40c5e',
    repo: {
      name: 'nixpkgs',
      full_name: 'NixOS/nixpkgs',
    },
  },
  head: {
    label: 'r-ryantm:auto-update/opencode',
    ref: 'auto-update/opencode',
    sha: '6375202eea2dd8301740c50c09845d625b64d5a5',
    repo: {
      name: 'nixpkgs',
      full_name: 'r-ryantm/nixpkgs',
    },
  },
}

/**
 * Derived data for mock merged PR #484965.
 */
export const mockMergedPR484965Derived = {
  prUrl: 'https://github.com/NixOS/nixpkgs/pull/484965',
  repoPath: 'NixOS/nixpkgs',
  prNumber: '484965',
  mergeCommitSha: '1b0767ac55a8b394f01290ba40116a70eb7d7ccd',
  mergeCommitShort: '1b0767a',
  headCommitSha: '6375202eea2dd8301740c50c09845d625b64d5a5',
  headCommitShort: '6375202',
  commitUrl: 'https://github.com/NixOS/nixpkgs/commit/1b0767ac55a8b394f01290ba40116a70eb7d7ccd',
  apiUrl: 'https://api.github.com/repos/NixOS/nixpkgs/pulls/484965',
}

/**
 * Branch status for live merged PR #484965 as of January 29, 2026.
 *
 * Status checked at approximately 10:00 UTC:
 * - master:              ✅ commit present (ahead)
 * - staging-next:        ⚠️ diverged
 * - nixos-unstable-small: ⚠️ not yet propagated (behind)
 * - nixos-unstable:       ⚠️ not yet propagated (behind)
 * - nixpkgs-unstable:     ⚠️ not yet propagated (behind)
 */
export const mockMergedPR484965BranchStatus = {
  mergeCommitSha: '1b0767ac55a8b394f01290ba40116a70eb7d7ccd',
  checkedAt: '2026-01-29T10:00:00Z',

  branches: {
    master: {
      name: 'master',
      status: 'ahead',
      isPresent: true,
      response: {
        status: 'ahead',
      },
    },

    'staging-next': {
      name: 'staging-next',
      status: 'diverged',
      isPresent: false, // diverged means commit path is not in branch
      response: {
        status: 'diverged',
      },
    },

    'nixos-unstable-small': {
      name: 'nixos-unstable-small',
      status: 'behind',
      isPresent: false,
      response: {
        status: 'behind',
      },
    },

    'nixos-unstable': {
      name: 'nixos-unstable',
      status: 'behind',
      isPresent: false,
      response: {
        status: 'behind',
      },
    },

    'nixpkgs-unstable': {
      name: 'nixpkgs-unstable',
      status: 'behind',
      isPresent: false,
      response: {
        status: 'behind',
      },
    },
  },

  summary: {
    present: ['master'],
    notPresent: ['staging-next', 'nixos-unstable-small', 'nixos-unstable', 'nixpkgs-unstable'],
  },
}
