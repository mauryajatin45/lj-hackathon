import { apiRequest } from './client.js'

export async function submitText({ channel, content, sender, subject }) {
  return apiRequest('/submissions/text', {
    method: 'POST',
    body: JSON.stringify({ channel, content, sender, subject })
  })
}

export async function submitFile(file, type) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  return apiRequest('/submissions/file', {
    method: 'POST',
    body: formData
    // Removed explicit 'Content-Type' header to let browser set it automatically
  })
}

export async function getSubmissions(params = {}) {
  const queryString = new URLSearchParams()
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== '') {
      queryString.append(key, params[key])
    }
  })
  
  const endpoint = `/submissions${queryString.toString() ? '?' + queryString.toString() : ''}`
  return apiRequest(endpoint)
}

export async function getSubmission(id) {
  return apiRequest(`/submissions/${id}`)
}