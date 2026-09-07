/**
 * api.js — Thin helpers around axios for consistent API calls.
 * Axios is pre-configured in AuthContext with the Bearer token.
 *
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
 *   const res = await apiGet('/products');          // calls GET /api/products
 *   const res = await apiPost('/products', data);   // calls POST /api/products
 */

import axios from 'axios';

const BASE = '/api';

/**
 * Normalises axios errors into a plain JS Error with a useful `.message`.
 */
function normalise(err) {
  const msg =
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message ||
    'An unexpected error occurred.';
  const out = new Error(msg);
  out.statusCode = err.response?.status;
  out.code = err.response?.data?.error?.code;
  out.details = err.response?.data?.error?.details;
  return out;
}

export async function apiGet(path) {
  try {
    const res = await axios.get(`${BASE}${path}`);
    return res.data;
  } catch (err) {
    throw normalise(err);
  }
}

export async function apiPost(path, data) {
  try {
    const res = await axios.post(`${BASE}${path}`, data);
    return res.data;
  } catch (err) {
    throw normalise(err);
  }
}

export async function apiPut(path, data) {
  try {
    const res = await axios.put(`${BASE}${path}`, data);
    return res.data;
  } catch (err) {
    throw normalise(err);
  }
}

export async function apiDelete(path) {
  try {
    const res = await axios.delete(`${BASE}${path}`);
    return res.data;
  } catch (err) {
    throw normalise(err);
  }
}
