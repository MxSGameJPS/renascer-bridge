const { randomUUID } = require("node:crypto");

class BridgeApiError extends Error {
  constructor(message, { status = 0, code = "BRIDGE_API_ERROR", retryable = false } = {}) {
    super(message);
    this.name = "BridgeApiError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function normalizeReferenceCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^C[1-9][0-9]{0,11}$/.test(code) && !/^DV[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)) {
    throw new BridgeApiError("Código inválido. Use C... para comanda ou DV... para delivery.", {
      status: 400,
      code: "INVALID_BRIDGE_CODE",
    });
  }
  return code;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function validateDispatch(data, requestedCode) {
  if (!data || typeof data !== "object" || !data.dispatch_id || data.reference_code !== requestedCode) {
    throw new BridgeApiError("A API Renascer retornou uma resposta inesperada.", {
      code: "INVALID_API_RESPONSE",
      retryable: false,
    });
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new BridgeApiError("O pedido não possui itens disponíveis para envio ao GeMaster.", {
      code: "EMPTY_DISPATCH",
      retryable: false,
    });
  }

  for (const item of data.items) {
    if (!item || !String(item.external_code || "").trim()) {
      throw new BridgeApiError(`Item sem código GeMaster: ${item?.product_name || "produto desconhecido"}.`, {
        code: "MISSING_EXTERNAL_CODE",
        retryable: false,
      });
    }
  }

  return data;
}

class BridgeApiClient {
  constructor(configStore) {
    this.configStore = configStore;
    this.pendingOperations = new Map();
  }

  getOperation(code) {
    const now = Date.now();
    for (const [key, pending] of this.pendingOperations.entries()) {
      if (now - pending.createdAt > 10 * 60 * 1000) this.pendingOperations.delete(key);
    }

    const existing = this.pendingOperations.get(code);
    if (existing) return existing.id;

    const operation = { id: randomUUID(), createdAt: now };
    this.pendingOperations.set(code, operation);
    return operation.id;
  }

  async request(path, { method = "GET", body } = {}) {
    const { apiUrl, token } = this.configStore.getCredentials();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await parseJsonResponse(response);
      if (!response.ok) {
        const message = payload?.error?.message || `Falha HTTP ${response.status} ao acessar o Renascer.`;
        throw new BridgeApiError(message, {
          status: response.status,
          code: payload?.error?.code || "HTTP_ERROR",
          retryable: response.status >= 500,
        });
      }
      return payload;
    } catch (error) {
      if (error instanceof BridgeApiError) throw error;
      if (error?.name === "AbortError") {
        throw new BridgeApiError("A API Renascer demorou demais para responder.", {
          code: "API_TIMEOUT",
          retryable: true,
        });
      }
      throw new BridgeApiError("Não foi possível conectar à API Renascer. Verifique internet e URL configurada.", {
        code: "API_UNREACHABLE",
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async resolveReference(value) {
    const code = normalizeReferenceCode(value);
    const operationId = this.getOperation(code);

    try {
      const payload = await this.request("/api/integrations/bridge/resolve", {
        method: "POST",
        body: { code, operationId },
      });
      const data = validateDispatch(payload?.data, code);
      this.pendingOperations.delete(code);
      return { ...data, operation_id: operationId };
    } catch (error) {
      if (!error.retryable) this.pendingOperations.delete(code);
      throw error;
    }
  }
}

module.exports = { BridgeApiClient, BridgeApiError, normalizeReferenceCode, validateDispatch };
