// ==UserScript==
// @name        Nixpkgs PR Branch Tracker
// @namespace   UserScripts
// @version     0.0.1
// @description Enhances GitHub PR pages by displaying merge commit hashes and tracking branch propagation for NixOS/nixpkgs.
// @author      Bryan Lai <bryanlais@gmail.com>
// @author      Leonard Sheng Sheng Lee <leonard.sheng.sheng.lee@gmail.com>
// @match       https://github.com/*/*/pull/*
// @include     /github\.com\/([\w-]+\/[\w-]+)\/pull\/(\d+).*$/
// @icon        https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant       none
// ==/UserScript==

/**
 * This UserScripts enhances GitHub pull request pages for the NixOS/nixpkgs repository.
 *
 * It is based on the original works of Bryan Lai<bryanlais@gmail.com>.
 * See https://github.com/bryango/userjs/blob/bc70be9932325c36e6d93dbb83ffc1e61f0bd792/src/pr-commit.user.js userscript.
 *
 * Main Features:
 * 1. Displays the merge commit hash in the PR header for easy reference.
 * 2. For merged PRs, tracks whether the commit has propagated to important branches:
 *    - master: Main development branch where PRs are merged first.
 *    - staging-next: Staging area for large rebuilds before merging to master.
 *    - nixpkgs-unstable: Continuously updated from master after CI passes (for general packages).
 *    - nixos-unstable: Like nixpkgs-unstable but includes NixOS tests.
 *    - nixos-unstable-small: Fast-track channel for small, critical updates.
 * 3. Provides visual indicators (✅/⚠️) to show merge status for each branch.
 * 4. Supports GitHub API authentication to avoid rate limits.
 */

(function () {
  'use strict'

  /**
   * Configuration object defining which repositories and branches to track.
   *
   * The script will only perform branch tracking for repositories listed here.
   * For each repository, specify an array of branch names to monitor for merge commit propagation.
   *
   * Example: The configuration below tracks five branches in the NixOS/nixpkgs repository.
   * Branch tracking only activates on merged PRs from github.com/NixOS/nixpkgs/pull/*
   */
  const subscribedRepos = {
    'NixOS/nixpkgs': [
      'master',              // Main development branch.
      'nixos-unstable-small',// Fast-track channel for small, critical updates.
      'nixos-unstable',      // Includes NixOS system tests.
      'nixpkgs-unstable',    // General package updates from master.
      'staging-next',        // Staging area for large rebuilds.
    ],
  }

  /**
   * Parse the current page URL to extract the repository path and pull request number.
   *
   * Example: For "https://github.com/NixOS/nixpkgs/pull/12345",
   * - prRepoURL will be "NixOS/nixpkgs"
   * - prNumber will be "12345"
   *
   * @type {string[]}
   */
  const [, prRepoURL, prNumber] = document.URL.match(
    /^.*github\.com\/([\w-]+\/[\w-]+)\/pull\/(\d+).*$/
  )

  /**
   * Normalizes the repository name by performing a case-insensitive comparison
   * against the subscribed repositories.
   *
   * This ensures that repository names are matched correctly regardless of case differences.
   *
   * @param {string} prRepoURL - The repository path extracted from the URL.
   * @returns {string} The normalized repository name if found in subscribedRepos, otherwise the original prRepoURL.
   */
  const normalizeRepoName = prRepoURL => {
    const localesUndefined = undefined
    for (const prRepo in subscribedRepos) {
      if (prRepo.localeCompare(prRepoURL, localesUndefined, { sensitivity: 'accent' }) === 0) {
        return prRepo
      }
    }
    return prRepoURL
  }

  const prRepo = normalizeRepoName(prRepoURL)
  const prApi = `https://api.github.com/repos/${prRepo}/pulls/${prNumber}`

  /**
   * Retrieves the GitHub Personal Access Token (PAT) from localStorage.
   *
   * If no token is found, prompts the user to enter one. The token is then stored
   * in localStorage for future use. This helps avoid GitHub API rate limits which
   * restrict unauthenticated requests to 60 per hour.
   *
   * Required token scope: public_repo (read-only access).
   *
   * @returns {string|null} The GitHub token if available, or null if the user cancels the prompt.
   */
  const getGitHubToken = () => {
    const storageKey = 'github_api_token'
    let token = localStorage.getItem(storageKey)

    if (!token) {
      token = prompt(
        'Enter your GitHub Personal Access Token (PAT) to avoid rate limits.\n' +
        'Create one at: https://github.com/settings/tokens\n' +
        'Required scope: public_repo (read-only)\n\n' +
        'Token will be stored in browser localStorage.'
      )

      if (token && token.trim()) {
        localStorage.setItem(storageKey, token.trim())
      }
    }

    return token
  }

  /**
   * Creates HTTP headers for GitHub API requests with optional authentication.
   *
   * The headers include the GitHub API version specification and, if available,
   * an authorization token to increase API rate limits from 60 to 5,000 requests per hour.
   *
   * @returns {Headers} A Headers object configured for GitHub API v3 requests.
   */
  const createHeaders = () => {
    const headers = new Headers({
      'Accept': 'application/vnd.github.v3+json'
    })

    const token = getGitHubToken()
    if (token) {
      headers.append('Authorization', `token ${token}`)
    }

    return headers
  }

  /**
   * Processes the GitHub API response for the pull request.
   *
   * This function performs two main tasks:
   * 1. Displays the merge commit hash in the PR header (only for merged PRs).
   * 2. For merged PRs in subscribed repos, checks and displays branch propagation status.
   *
   * @param {Object} json - The parsed JSON response from the GitHub API.
   */
  const processResponse = json => {
    // Only display merge commit information for merged PRs.
    // Note: GitHub provides a merge_commit_sha even for unmerged PRs,
    // but displaying it would be misleading since the commit doesn't exist
    // in the default branch yet.
    if (!json.merged) {
      return
    }

    const commitHash = json.merge_commit_sha
    const commitShort = commitHash.slice(0, 7)
    const commitLink = `https://github.com/${prRepo}/commit/${commitHash}`

    const prInfoSelector = '.gh-header-meta div:last-child'
    const prInfoLine = document.querySelector(prInfoSelector)
    prInfoLine.innerHTML +=
      `&ensp;🔏&ensp;<a href="${commitLink}"><code class="Link--primary text-bold">${commitShort}</code></a><br/>`

    // Only perform branch tracking for merged PRs in subscribed repositories.
    if (!(prRepo in subscribedRepos)) {
      return
    }

    const compareLink = `https://github.com/${prRepo}/compare`
    const compareApi = `https://api.github.com/repos/${prRepo}/compare/${commitHash}`

    const subscribedBranches = subscribedRepos[prRepo]

    // Create branch objects with metadata for tracking and UI updates.
    const branches = subscribedBranches.map(branchName => {
      return {
        name: branchName,
        id: `compare-${branchName.replace(/[.\s]/g, '-')}`, // Used internally to identify and update the DOM element.
        // ^ used internally to identify the element and decorate it
        // ... sanitize the string if it contains "."
      }
    })

    // Add clickable branch links to the PR header for each subscribed branch.
    // Note: Use 'for...of' to iterate over array values, not 'for...in' which iterates over keys.
    for (const branch of branches) {
      prInfoLine.innerHTML +=
        `&ensp;<a href="${compareLink}/${commitHash}...${branch.name}" id="${branch.id}"><b>${branch.name}</b></a><br/>`
    }

    /**
     * Updates the branch link with a visual indicator showing merge status.
     *
     * @param {boolean} success - True if the commit has been merged into the branch.
     * @param {Object} branch - The branch object containing name and id.
     *
     * Behavior:
     * - If success is true (commit is in the branch):
     *   ✅ Shows a checkmark indicator.
     *   Link shows: compare/{commit}...{branch} (what's new since the commit).
     *
     * - If success is false (commit is not in the branch):
     *   ⚠️ Shows a warning indicator.
     *   Link is reversed to: compare/{branch}...{commit} (how far behind the branch is).
     */
    const branchIndicate = (success, branch) => {
      const branchInfo = document.querySelector(`#${branch.id}`)
      let indicator = '⚠️ '
      if (success) {
        indicator = '✅ '
      } else {
        // Swap the comparison direction to show how far behind the branch is.
        branchInfo.href = `${compareLink}/${branch.name}...${commitHash}`
      }
      branchInfo.outerHTML = indicator + branchInfo.outerHTML
    }

    /**
     * Fetches the comparison status between the merge commit and a specific branch.
     *
     * Uses a clever pagination trick: by requesting an impossibly high page number
     * (page=100) with a large per_page value, the API returns no file diffs or commit details,
     * only the comparison status. This significantly reduces response payload and processing time.
     *
     * Possible status values from the API:
     * - 'ahead': The branch contains the merge commit (commit has propagated to this branch).
     * - 'behind': The branch does not contain the merge commit yet.
     * - 'identical': The branch is exactly at this commit.
     *
     * @param {Object} branch - The branch object to check.
     * @returns {Promise} A promise that resolves when the branch indicator is updated.
     */
    const fetchBranchStatus = (branch) => fetch(
      `${compareApi}...${branch.name}?per_page=1000000&page=100`,
      { headers: createHeaders() }
    )
      .then(async (response) => await response.text())
      .then((text) => JSON.parse(text))
      .then((json) => json.status === 'ahead' || json.status === 'identical')
      .then((success) => { branchIndicate(success, branch) })
      .catch((e) => { console.log(e) })

    // Fetch the comparison status for all subscribed branches in parallel.
    branches.forEach(fetchBranchStatus)
  }

  // Fetch the pull request details from the GitHub API and process the response.
  fetch(prApi, { headers: createHeaders() })
    .then(async (response) => await response.text())
    .then((text) => JSON.parse(text))
    .then((json) => { processResponse(json) })
    .catch((e) => { console.log(e) })
})()
