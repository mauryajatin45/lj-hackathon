// src/api/auth.js
import { apiRequest } from './client.js';

export async function login({ email, password }) {
  // Backend route: POST /api/auth/login
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function register({ email, password, confirmPassword }) {
  // Backend requires all three fields
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword })
  });
}