import { Injectable } from "@nestjs/common";
import { AdminApiClient } from "../../shared/admin-api-client.service";

@Injectable()
export class ConfigurationService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getPlatformConfig() {
    return this.apiClient.call("GET", "/admin/configuration/platform");
  }
  updatePlatformConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call("PUT", "/admin/configuration/platform", {
      updates,
      adminUser,
    });
  }

  getCfdiConfig() {
    return this.apiClient.call("GET", "/admin/configuration/cfdi");
  }
  updateCfdiConfig(
    data: Record<string, string | boolean | undefined>,
    adminUser: string,
  ) {
    return this.apiClient.call("PUT", "/admin/configuration/cfdi", {
      ...data,
      adminUser,
    });
  }

  getPaymentConfig() {
    return this.apiClient.call("GET", "/admin/system/payment-config");
  }
  updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    return this.apiClient.call("PUT", "/admin/system/payment-config", {
      providers,
      primaryCardProvider,
    });
  }

  // PT-191 (AUD-027) — `getSmtpConfig` / `updateSmtpConfig` retirados: el mailer nunca leyo esas claves.
  // El correo se configura por `MAIL_*` en el entorno. Motivo completo en `system-config.service.ts`.

  getStorageConfig() {
    return this.apiClient.call("GET", "/admin/configuration/storage");
  }
  updateStorageConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call("PUT", "/admin/configuration/storage", {
      updates,
      adminUser,
    });
  }
}
