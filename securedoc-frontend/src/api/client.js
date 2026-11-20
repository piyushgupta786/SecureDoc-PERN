import axios from 'axios'

const rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const urlMatch = rawUrl.match(/https?:\/\/[^\s\])"']+/)
const API_BASE_URL = (
  urlMatch ? urlMatch[0] : (import.meta.env.PROD ? 'https://securedoc-pern.onrender.com' : '')
).replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('securedoc_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('securedoc_token')
      localStorage.removeItem('securedoc_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/users', data),
}

export const usersApi = {
  getByUsername: (username) => api.get(`/users/username/${username}`),
  updateRole: (username, role) => api.put(`/users/${username}/role`, { role }),
}

export const casesApi = {
  getAll: () => api.get('/cases'),
  getByNumber: (caseNumber) => api.get(`/cases/${caseNumber}`),
  create: (data) => api.post('/cases', data),
}

export const documentsApi = {
  upload: (formData) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  search: (query) => api.get('/documents/search', { params: { query } }),
  getByCase: (caseNumber) => api.get(`/documents/case/${caseNumber}`),
  getById: (id) => api.get(`/documents/${id}`),
  verify: (id) => api.get(`/documents/${id}/verify`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  blockchainVerify: (id) => api.get(`/documents/${id}/blockchain-verify`),
  blockchainVerifyUpload: (id, formData) =>
    api.post(`/documents/${id}/blockchain-verify-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
}

export const auditApi = {
  getForDocument: (documentId) => api.get(`/audit/document/${documentId}`),
  getSystem: () => api.get('/audit'),
}

export const healthApi = {
  check: () => axios.get(`${API_BASE_URL}/health`, { timeout: 15000 }),
}

export default api
