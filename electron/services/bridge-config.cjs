const fs = require("node:fs");
const path = require("node:path");

const TOKEN_PATTERN = /^rbg_[A-Za-z0-9_-]{40,80}$/;

function normalizeApiUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Informe a URL do sistema Renascer.");

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL do sistema Renascer inválida.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("A API deve usar HTTP ou HTTPS.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (url.protocol !== "https:" && !localHosts.has(url.hostname)) {
    throw new Error("Use HTTPS para conectar ao Renascer fora do computador local.");
  }

  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

function validateToken(value) {
  const token = String(value || "").trim();
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Token do Bridge inválido. Use o token rbg_... gerado pelo Renascer.");
  }
  return token;
}

class BridgeConfigStore {
  constructor({ app, safeStorage }) {
    this.safeStorage = safeStorage;
    this.filePath = path.join(app.getPath("userData"), "bridge-config.json");
  }

  readFile() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch {
      return {};
    }
  }

  writeFile(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, this.filePath);
  }

  decryptStoredToken(stored) {
    if (!stored?.tokenEncrypted) return null;
    if (!this.safeStorage.isEncryptionAvailable()) return null;

    try {
      const token = this.safeStorage.decryptString(Buffer.from(stored.tokenEncrypted, "base64"));
      return TOKEN_PATTERN.test(token) ? token : null;
    } catch {
      return null;
    }
  }

  getToken(stored = this.readFile()) {
    if (process.env.RENASCER_BRIDGE_TOKEN) {
      return validateToken(process.env.RENASCER_BRIDGE_TOKEN);
    }
    return this.decryptStoredToken(stored);
  }

  getApiUrl(stored = this.readFile()) {
    const candidate = process.env.RENASCER_API_URL || stored.apiUrl;
    if (!candidate) return null;
    try {
      return normalizeApiUrl(candidate);
    } catch {
      return null;
    }
  }

  getStatus() {
    const stored = this.readFile();
    const apiUrl = this.getApiUrl(stored);
    const token = this.getToken(stored);
    return {
      configured: Boolean(apiUrl && token),
      apiUrl,
      tokenConfigured: Boolean(token),
      tokenSource: process.env.RENASCER_BRIDGE_TOKEN ? "environment" : token ? "windows" : null,
      secureStorageAvailable: this.safeStorage.isEncryptionAvailable(),
    };
  }

  getCredentials() {
    const stored = this.readFile();
    const apiUrl = this.getApiUrl(stored);
    const token = this.getToken(stored);
    if (!apiUrl) throw new Error("URL da API Renascer não configurada.");
    if (!token) throw new Error("Token do Renascer Bridge não configurado.");
    return { apiUrl, token };
  }

  save({ apiUrl, token }) {
    const stored = this.readFile();
    const nextApiUrl = normalizeApiUrl(apiUrl || stored.apiUrl || process.env.RENASCER_API_URL);
    const next = {
      apiUrl: nextApiUrl,
      tokenEncrypted: stored.tokenEncrypted || null,
      updatedAt: new Date().toISOString(),
    };

    if (token !== undefined && token !== null && String(token).trim()) {
      const normalizedToken = validateToken(token);
      if (!this.safeStorage.isEncryptionAvailable()) {
        throw new Error("Armazenamento seguro do Windows indisponível. Configure RENASCER_BRIDGE_TOKEN no ambiente.");
      }
      next.tokenEncrypted = this.safeStorage.encryptString(normalizedToken).toString("base64");
    }

    if (!next.tokenEncrypted && !process.env.RENASCER_BRIDGE_TOKEN) {
      throw new Error("Informe o token rbg_... deste computador.");
    }

    this.writeFile(next);
    return this.getStatus();
  }
}

module.exports = { BridgeConfigStore, normalizeApiUrl, validateToken };
