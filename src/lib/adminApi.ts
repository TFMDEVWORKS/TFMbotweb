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
  [key: string]: unknown;
};
export type Customer = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  whatsappPhone?: string | null;
  createdAt: string;
  orderCount: number;
  totalSpentMinorUnits: number;
  [key: string]: unknown;
};
export type Order = {
  id: string;
  orderCode: string;
  storeName: string;
  customerName?: string | null;
  customerPhone: string;
  status: OrderStatus;
  totalMinorUnits: number;
  deliveryFeeMinorUnits?: number;
  createdAt: string;
  paidAt?: string | null;
  [key: string]: unknown;
};
export type StoreDetails = Record<string, unknown>;
export type OrderDetails = Record<string, unknown>;
export type ReviewData = Record<string, unknown>;
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
    readonly issues: string[] = [],
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
    const apiMessage = String(payload?.message ?? "");
    const rawIssues = payload?.issues ?? payload?.errors ?? payload?.details?.issues ?? payload?.data?.issues;
    const issues = Array.isArray(rawIssues)
      ? rawIssues.map((issue: unknown) => {
          if (typeof issue === "string") return issue;
          if (issue && typeof issue === "object") {
            const record = issue as Record<string, unknown>;
            return [record.path, record.field, record.message].filter((part) => typeof part === "string" && part).join(": ") || "Invalid value";
          }
          return String(issue);
        })
      : [];
    const message =
      response.status === 404 && path === "/login"
        ? "Admin API login route was not found. Check that ADMIN_API_ORIGIN points to your deployed backend host (without /api/manage), and redeploy the web app."
        : /ADMIN_JWT_SECRET/i.test(apiMessage)
          ? "Admin sign-in is temporarily unavailable because the API is missing a valid signing secret. Set ADMIN_JWT_SECRET in the admin API's application settings to a random value of at least 32 characters, then restart or redeploy the API."
          : (apiMessage || `Request failed (${response.status})`);
    throw new ApiError(response.status, message, retry > 0 ? retry : undefined, issues);
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
  store: (merchantId: string) =>
    request<StoreDetails>(`/stores/${encodeURIComponent(merchantId)}`),
  updateStore: (merchantId: string, changes: Record<string, string | number | null>) =>
    request<StoreDetails>(`/stores/${encodeURIComponent(merchantId)}`, {
      method: "PATCH",
      body: changes,
    }),
  setStoreStatus: (id: string, active: boolean, reason?: string) =>
    request<null>(
      `/stores/${encodeURIComponent(id)}/${active ? "activate" : "suspend"}`,

      { method: "POST", ...(active ? {} : { body: { reason } }) },
    ),
  deleteStore: (id: string) =>
    request<null>(`/stores/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { confirmation: "DELETE" },
    }),
  customers: (params: { page?: number; pageSize?: number; search?: string } = {}) =>
    request<Page<Customer>>(`/customers?${query(params)}`),
  orders: (
    params: { page?: number; pageSize?: number; status?: OrderStatus; search?: string } = {},
  ) => request<Page<Order>>(`/orders?${query(params)}`),
  order: (orderCode: string) =>
    request<OrderDetails>(`/orders/${encodeURIComponent(orderCode)}`),
  review: () => request<ReviewData>("/review"),
  exportStores: async () => {
    const response = await fetch(`${BASE}/stores/export?status=ALL`, {
      headers: getToken() ? { authorization: `Bearer ${getToken()}` } : {},
    });
    if (response.status === 401) setToken(null);
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
