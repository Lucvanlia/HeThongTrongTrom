import { HttpRequest } from "@azure/functions";

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/**
 * Phân giải thông tin người dùng từ Azure Static Web Apps Easy Auth header (`x-ms-client-principal`)
 */
export function getClientPrincipal(request: HttpRequest): ClientPrincipal | null {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) {
    // Nếu chạy môi trường cục bộ (dev) không có Easy Auth header, cấp quyền giả lập
    if (process.env.AZURE_FUNCTIONS_ENVIRONMENT === "Development" || !process.env.WEBSITE_INSTANCE_ID) {
      return {
        identityProvider: "local",
        userId: "dev-user-01",
        userDetails: "developer@local",
        userRoles: ["anonymous", "authenticated", "operator", "admin"]
      };
    }
    return null;
  }

  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(decoded) as ClientPrincipal;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra xem người dùng hiện tại có vai trò cần thiết không
 */
export function hasRole(principal: ClientPrincipal | null, requiredRoles: string[]): boolean {
  if (!principal) return false;
  return requiredRoles.some(role => principal.userRoles.includes(role));
}

