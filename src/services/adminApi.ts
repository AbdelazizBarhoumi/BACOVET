/**
 * BACOVET Admin API Service
 *
 * Handles administrative tasks like job monitoring and execution.
 * Requires Bearer JWT authentication.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Fetch all background jobs and their statuses
 * @param token Bearer JWT token
 */
export const fetchAllJobs = async (token: string) => {
  const response = await fetch(`${BASE_URL}/api/admin/jobs`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // Return data.data for consistency with main api service if it exists
  return result.data || result;
};

/**
 * Manually trigger a job execution
 * @param jobId The ID of the job to run
 * @param token Bearer JWT token
 */
export const runJobManually = async (jobId: string | number, token: string) => {
  const response = await fetch(`${BASE_URL}/api/admin/jobs/${jobId}/run`, {
    method: "GET", // Specified as GET in Sprints.md 0.3
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || result;
};
