import { apiRequest } from './client.js'

export async function login({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}

export async function register({ email, password, confirmPassword }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword })
  })
}