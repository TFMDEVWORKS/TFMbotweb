"use client";

const BASE = "/api/manage";
export type MerchantStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
export type OrderStatus =
  | "CART"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
export type Store = {
  id: string;
  storeName: string;
  category: string | null;
  whatsappPhone: string;
  status: MerchantStatus;
  suspendedByAdmin: boolean;
  subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED" | null;
  productCount: number;
  orderCount: number;
  createdAt: string;
};
export type Page<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

let token: string | null = null;
export function getToken() {
  if (typeof window !== "undefined" && token === null)
    token = localStorage.getItem("wm_admin_token");
  return token;
}
export function setToken(value: string | null) {
  token = value;
  if (typeof window !== "undefined")
    value
      ? localStorage.setItem("wm_admin_token", value)
      : localStorage.removeItem("wm_admin_token");
}
async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const accessToken = getToken();
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(init.body !== undefined
        ? { "content-type": "application/json" }
        : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) setToken(null);
  if (!response.ok || payload?.status !== "success") {
    const retry = Number(response.headers.get("retry-after"));
    const message =
      response.status === 404 && path === "/login"
        ? "Admin API login route was not found. Check that ADMIN_API_ORIGIN points to your deployed backend host (without /api/manage), and redeploy the web app."
        : (payload?.message ?? `Request failed (${response.status})`);
    throw new ApiError(response.status, message, retry > 0 ? retry : undefined);
  }
  return payload.data as T;
}
const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString();
};
export const adminApi = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      expiresAt: string;
      admin: { id: string; email: string; name: string };
    }>(
      "/login",

      { method: "POST", body: { email, password } },
    ),
  me: () =>
    request<{
      admin: {
        id: string;
        email: string;
        name: string;
      };
    }>("/me"),

  logout: () =>
    request<null>("/logout", {
      method: "POST",
    }),
  dashboard: () =>
    request<{
      stores: {
        total: number;
        active: number;
        pending: number;
        suspended: number;
      };
      customers: { total: number };
      orders: { total: number; pendingPayment: number };
      revenueMinorUnits: number;
      recentStores: {
        id: string;
        name: string;
        status: MerchantStatus;
        createdAt: string;
      }[];
      recentOrders: {
        id: string;
        orderCode: string;
        storeName: string;
        customerPhone: string;
        status: OrderStatus;
        totalMinorUnits: number;
        createdAt: string;
      }[];
    }>("/dashboard"),

  stores: (
    params: {
      page?: number;
      pageSize?: number;
      status?: MerchantStatus;
      search?: string;
    } = {},
  ) => request<Page<Store>>(`/stores?${query(params)}`),
  setStoreStatus: (id: string, active: boolean, reason?: string) =>
    request<null>(
      `/stores/${encodeURIComponent(id)}/${active ? "activate" : "suspend"}`,

      { method: "POST", ...(active ? {} : { body: { reason } }) },
    ),
  exportStores: async () => {
    const response = await fetch(`${BASE}/stores/export?status=ALL`, {
      headers: getToken() ? { authorization: `Bearer ${getToken()}` } : {},
    });
    if (!response.ok)
      throw new ApiError(response.status, "Could not export stores");
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `stores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
