import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Sessions } from "../types/api.types";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const common = {
  baseURL,
  withCredentials: true, // sends/receives the refresh cookie
  headers: { "X-Requested-With": "fetch" }, // needed by the API's csrfGuard
};

export const authApi = axios.create(common);
export const api = axios.create(common);

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

let refreshing: Promise<Sessions | null> | null = null;

export function refreshSession(): Promise<Sessions | null> {
  refreshing ??= authApi
    .post<Sessions>("/auth/refresh")
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

type Retryable = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as Retryable | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const session = await refreshSession();
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(original); // retry once with the new token
      }
    }
    return Promise.reject(error);
  },
);

// Turn any issue into something that a form can show
type Issue = { path: (string | number)[]; message: string };

export function parseError(err: unknown): {
  message: string;
  fields: Record<string, string>;
} {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string; issues?: Issue[] }
      | undefined;
    const fields: Record<string, string> = {};
    data?.issues?.forEach((i) => {
      const key = String(i.path[0]);
      if (key && !fields[key]) fields[key] = i.message;
    });
    return {
      message:
        data?.error ??
        (err.response ? "Request failed" : "Cannot reach the server"),
      fields,
    };
  }
  return { message: "Something went wrong. Please try again.", fields: {} };
}
