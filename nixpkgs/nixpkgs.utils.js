/**
 * Testable utility functions extracted from the Nixpkgs PR Branch Tracker userscript.
 *
 * This module exports pure functions that can be unit tested independently
 * of the browser environment and DOM manipulation.
 */

/**
 * Configuration object defining which repositories and branches to track.
 */
export const subscribedRepos = {
  'NixOS/nixpkgs': [
    'master',
    'nixos-unstable-small',
    'nixos-unstable',
    'nixpkgs-unstable',
    'staging',
    'staging-next',
  ],
}

/**
 * Parses a GitHub PR URL to extract the repository path and pull request number.
 *
 * @param {string} url - The GitHub PR URL to parse.
 * @returns {{ repoPath: string, prNumber: string } | null} The parsed components, or null if invalid.
 */
export const parsePRUrl = (url) => {
  const match = url.match(/^.*github\.com\/([\w-]+\/[\w-]+)\/pull\/(\d+).*$/)
  if (!match) {
    return null
  }
  return {
    repoPath: match[1],
    prNumber: match[2],
  }
}

/**
 * Normalizes the repository name by performing a case-insensitive comparison
 * against the subscribed repositories.
 *
 * @param {string} prRepoURL - The repository path extracted from the URL.
 * @param {Object} repos - The subscribed repositories object (defaults to subscribedRepos).
 * @returns {string} The normalized repository name if found, otherwise the original prRepoURL.
 */
export const normalizeRepoName = (prRepoURL, repos = subscribedRepos) => {
  const localesUndefined = undefined
  for (const prRepo in repos) {
    if (prRepo.localeCompare(prRepoURL, localesUndefined, { sensitivity: 'accent' }) === 0) {
      return prRepo
    }
  }
  return prRepoURL
}

/**
 * Generates the GitHub API URL for a pull request.
 *
 * @param {string} repo - The repository path (e.g., "NixOS/nixpkgs").
 * @param {string} prNumber - The pull request number.
 * @returns {string} The API URL for the pull request.
 */
export const getPRApiUrl = (repo, prNumber) => {
  return `https://api.github.com/repos/${repo}/pulls/${prNumber}`
}

/**
 * Generates the GitHub commit URL.
 *
 * @param {string} repo - The repository path.
 * @param {string} commitHash - The full commit hash.
 * @returns {string} The commit URL.
 */
export const getCommitUrl = (repo, commitHash) => {
  return `https://github.com/${repo}/commit/${commitHash}`
}

/**
 * Shortens a commit hash to the first 7 characters.
 *
 * @param {string} commitHash - The full commit hash.
 * @returns {string} The shortened commit hash.
 */
export const shortenCommitHash = (commitHash) => {
  return commitHash ? commitHash.slice(0, 7) : ''
}

/**
 * Sanitizes a branch name for use as a DOM element ID.
 *
 * @param {string} branchName - The branch name to sanitize.
 * @returns {string} The sanitized ID string.
 */
export const sanitizeBranchId = (branchName) => {
  return `compare-${branchName.replace(/[.\s]/g, '-')}`
}

/**
 * Creates branch metadata objects for tracking and UI updates.
 *
 * @param {string[]} branchNames - Array of branch names.
 * @returns {Array<{ name: string, id: string }>} Array of branch objects with name and id.
 */
export const createBranchMetadata = (branchNames) => {
  return branchNames.map(branchName => ({
    name: branchName,
    id: sanitizeBranchId(branchName),
  }))
}

/**
 * Determines if a commit has propagated to a branch based on the compare status.
 *
 * @param {string} status - The comparison status from GitHub API ('ahead', 'behind', 'identical', 'diverged').
 * @returns {boolean} True if the commit is in the branch, false otherwise.
 */
export const isCommitInBranch = (status) => {
  return status === 'ahead' || status === 'identical'
}

/**
 * Generates a comparison URL between a commit and a branch.
 *
 * @param {string} repo - The repository path.
 * @param {string} commitHash - The commit hash.
 * @param {string} branchName - The branch name.
 * @param {boolean} reversed - If true, compare branch to commit instead of commit to branch.
 * @returns {string} The comparison URL.
 */
export const getCompareUrl = (repo, commitHash, branchName, reversed = false) => {
  const base = `https://github.com/${repo}/compare`
  if (reversed) {
    return `${base}/${branchName}...${commitHash}`
  }
  return `${base}/${commitHash}...${branchName}`
}

/**
 * Generates the branch status API URL with pagination optimization.
 *
 * Uses a pagination trick to minimize response payload.
 *
 * @param {string} repo - The repository path.
 * @param {string} commitHash - The commit hash to compare.
 * @param {string} branchName - The branch name to check.
 * @returns {string} The comparison API URL.
 */
export const getBranchStatusApiUrl = (repo, commitHash, branchName) => {
  return `https://api.github.com/repos/${repo}/compare/${commitHash}...${branchName}?per_page=1000000&page=100`
}

/**
 * Checks if a repository is in the subscribed list.
 *
 * @param {string} repo - The repository path.
 * @param {Object} repos - The subscribed repositories object.
 * @returns {boolean} True if the repository is subscribed.
 */
export const isSubscribedRepo = (repo, repos = subscribedRepos) => {
  return repo in repos
}

/**
 * Gets the branches to track for a given repository.
 *
 * @param {string} repo - The repository path.
 * @param {Object} repos - The subscribed repositories object.
 * @returns {string[]} Array of branch names to track, or empty array if not subscribed.
 */
export const getSubscribedBranches = (repo, repos = subscribedRepos) => {
  return repos[repo] || []
}

/**
 * Filters the list of branches to only those relevant for the PR's base (target) branch.
 *
 * The nixpkgs branching model determines which branches a commit will propagate through:
 *
 * - PRs targeting `master`: Propagate master → channel branches only.
 *   Staging and staging-next are irrelevant since master PRs don't flow through them.
 *
 * - PRs targeting `staging`: Propagate staging → staging-next → master → channels.
 *   All branches are relevant since the commit must traverse the full pipeline.
 *
 * - PRs targeting `staging-next`: Propagate staging-next → master → channels.
 *   The `staging` branch is irrelevant since the commit enters at staging-next.
 *
 * - Unknown base branch: Returns all branches as a safe default.
 *
 * @param {string} baseBranch - The PR's base (target) branch name (e.g., 'master', 'staging').
 * @param {string[]} allBranches - The full list of subscribed branch names.
 * @returns {string[]} The filtered list of relevant branch names.
 */
export const getRelevantBranches = (baseBranch, allBranches) => {
  if (!baseBranch || !allBranches || allBranches.length === 0) {
    return allBranches || []
  }

  switch (baseBranch) {
    case 'master':
      // master PRs: hide staging and staging-next (commit doesn't flow through them)
      return allBranches.filter(b => b !== 'staging' && b !== 'staging-next')

    case 'staging-next':
      // staging-next PRs: hide staging (commit enters at staging-next, not staging)
      return allBranches.filter(b => b !== 'staging')

    case 'staging':
      // staging PRs: show all branches (full pipeline)
      return allBranches

    default:
      // Unknown base branch: show all branches as safe default
      return allBranches
  }
}

/**
 * Checks if a PR response indicates the PR has been merged.
 *
 * Important: GitHub provides a merge_commit_sha even for unmerged PRs,
 * representing what the merge commit would be if merged. This function
 * should be used to determine if the PR is actually merged before
 * displaying merge commit information.
 *
 * @param {Object} prResponse - The GitHub PR API response.
 * @returns {boolean} True if the PR has been merged.
 */
export const isPRMerged = (prResponse) => {
  return Boolean(prResponse && prResponse.merged === true)
}

/**
 * Checks if merge commit information should be displayed for a PR.
 *
 * Only returns true if the PR is merged and has a valid merge commit SHA.
 *
 * @param {Object} prResponse - The GitHub PR API response.
 * @returns {boolean} True if merge commit info should be displayed.
 */
export const shouldShowMergeCommit = (prResponse) => {
  return isPRMerged(prResponse) && Boolean(prResponse.merge_commit_sha)
}

// Storage key for the GitHub token.
export const GITHUB_TOKEN_STORAGE_KEY = 'github_api_token'

/**
 * CSS selector for the current GitHub React-based PR header summary container (2025+).
 *
 * GitHub uses CSS Modules with hashed class names, so we match by the stable prefix
 * "PullRequestHeaderSummary-module__summaryContainer" using an attribute substring selector.
 *
 * @type {string}
 */
export const PR_SUMMARY_SELECTOR = '[class*="PullRequestHeaderSummary-module__summaryContainer"]'

/**
 * CSS selector for the legacy GitHub PR header metadata area.
 *
 * @type {string}
 */
export const PR_LEGACY_SELECTOR = '.gh-header-meta div:last-child'
