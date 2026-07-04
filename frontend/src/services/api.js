/**
 * services/api.js
 * ---------------
 * Axios instance pre-configured for the Flask backend.
 *
 * Features
 * - baseURL from VITE_API_BASE_URL env variable
 * - request interceptor: automatically attaches the JWT access token
 * - response interceptor: attempts silent refresh on 401 once before logging out
 *
 * Security Note:
 * Storing access and refresh tokens in localStorage makes them vulnerable to XSS
 * exfiltration if a third-party script is successfully injected. In production,
 * httpOnly cookies are preferred for token storage to prevent javascript access.
 * localStorage is chosen here for stateless client-side simplicity and speed of scaffold.
 */

import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// Variables to handle queuing during silent token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// ---------------------------------------------------------------------------
// Request interceptor — attach access token if it exists in localStorage
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — normalise errors & silent refresh on 401
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    // If 401 Unauthorized and not already retrying or logging in
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        isRefreshing = false
        // No refresh token: clear state and redirect
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        toast.error('Session expired. Please log in again.')
        window.location.href = '/login'
        return Promise.reject({ ...error, message })
      }

      try {
        // Request a new access token using the refresh token (interceptor-free call)
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        )

        if (refreshResponse.data?.success) {
          const newAccessToken = refreshResponse.data.data.access_token
          localStorage.setItem('access_token', newAccessToken)
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          processQueue(null, newAccessToken)
          isRefreshing = false
          
          return api(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        // Refresh token failed/expired: clean storage and logout
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        toast.error('Session expired. Please log in again.')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject({ ...error, message })
  },
)

export default api

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------
export const checkHealth = () => api.get('/health')
