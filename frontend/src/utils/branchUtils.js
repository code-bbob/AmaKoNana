// Branch management utilities for localStorage
export const BRANCH_STORAGE_KEY = 'selectedBranch';

/**
 * Save selected branch to localStorage
 * @param {Object} branch - Branch object with id, name, enterprise_name
 */
export const saveSelectedBranch = (branch) => {
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branch));
  } catch (error) {
    console.error('Error saving branch to localStorage:', error);
  }
};

/**
 * Get selected branch from localStorage
 * @returns {Object|null} - Branch object or null if not found
 */
export const getSelectedBranch = () => {
  try {
    const branchData = localStorage.getItem(BRANCH_STORAGE_KEY);
    console.log(branchData)
    return branchData ? JSON.parse(branchData) : null;
  } catch (error) {
    console.error('Error getting branch from localStorage:', error);
    return null;
  }
};

/**
 * Clear selected branch from localStorage
 */
export const clearSelectedBranch = () => {
  try {
    localStorage.removeItem(BRANCH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing branch from localStorage:', error);
  }
};

/**
 * Check if user has selected a branch
 * @returns {boolean}
 */
export const hasBranchSelected = () => {
  return getSelectedBranch() !== null;
};

/**
 * Get the branch ID for URL routing
 * @returns {string|null}
 */
export const getSelectedBranchId = () => {
  const branch = getSelectedBranch();
  return branch ? branch.id.toString() : null;
};
