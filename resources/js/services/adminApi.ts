/**
 * BACOVET Admin API Service
 *
 * Handles administrative tasks like job monitoring and execution.
 */

const BASE_URL = "";

const fetchWithToken = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch all background jobs and their statuses
 */
export const fetchAllJobs = async () => {
  const result = await fetchWithToken(`${BASE_URL}/admin/jobs`);
  return result.data || result;
};

/**
 * Manually trigger a job execution
 * @param jobId The ID of the job to run
 */
export const runJobManually = async (jobId: string | number) => {
  return fetchWithToken(`${BASE_URL}/admin/jobs/${jobId}/run`);
};

/**
 * Fetch all users
 */
export const fetchAllUsers = async () => {
  return fetchWithToken(`${BASE_URL}/admin/users`);
};

/**
 * Create a new user
 */
export const createUser = async (userData: Record<string, unknown>) => {
  return fetchWithToken(`${BASE_URL}/admin/users`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

/**
 * Update an existing user
 */
export const updateUser = async (userId: string | number, userData: Record<string, unknown>) => {
  return fetchWithToken(`${BASE_URL}/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (userId: string | number) => {
  return fetchWithToken(`${BASE_URL}/admin/users/${userId}/toggle`, {
    method: "PATCH",
  });
};

/**
 * Fetch all screens
 */
export const fetchAllScreens = async () => {
  return fetchWithToken(`${BASE_URL}/admin/screens`);
};

/**
 * Update a screen
 */
export const updateScreen = async (screenId: string | number, screenData: Record<string, unknown>) => {
  return fetchWithToken(`${BASE_URL}/admin/screens/${screenId}`, {
    method: "PUT",
    body: JSON.stringify(screenData),
  });
};

