import { useEffect, useRef, useState } from "react";
import { classifyBridgeCode } from "./shared/code-parser";
import styles from "./App.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function App() {
  const inputRef = useRef(null);
  const [code, setCode] = useState("");
  const [localResult, setLocalResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState({ configured: false, apiUrl: "", tokenConfigured: false });
  const [configForm, setConfigForm] = useState({ apiUrl: "", token: "" });
  const [bridgeStatus, setBridgeStatus] = useState({ shortcut: "F8", shortcutRegistered: false });

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }

  async function refreshStatus() {
    const status = await window.renascer.bridge.status();
    setBridgeStatus(status);
    setConfigStatus(status.config);
    setConfigForm((current) => ({ ...current, apiUrl: status.config?.apiUrl || current.apiUrl }));
    return status;
  }

  async function openConfig() {
    setError("");
    setShowConfig(true);
    await window.renascer.bridge.resize("config");
  }

  async function closeConfig() {
    setShowConfig(false);
    await window.renascer.bridge.resize(preview ? "expanded" : "compact");
    focusInput();
  }

  async function saveConfig(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await window.renascer.bridge.saveConfig({
        apiUrl: configForm.apiUrl,
        token: configForm.token || undefined,
      });
      if (!response.ok) {
        setError(response.error?.message || "Não foi possível salvar a configuração.");
        return;
      }
      setConfigStatus(response.data);
      setBridgeStatus((current) => ({ ...current, config: response.data }));
      setConfigForm((current) => ({ ...current, token: "", apiUrl: response.data.apiUrl || current.apiUrl }));
      setShowConfig(false);
      await window.renascer.bridge.resize(preview ? "expanded" : "compact");
      focusInput();
    } finally {
      setBusy(false);
    }
  }

  async function resolveCode(event) {
    event?.preventDefault();
    setError("");
    setPreview(null);

    const parsed = classifyBridgeCode(code);
    setLocalResult(parsed);

    if (!parsed.recognized) {
      await window.renascer.bridge.resize("compact");
      return;
    }

    setCode(parsed.code);
    if (!configStatus.configured) {
      setError("Configure a URL e o token deste Bridge antes de consultar o Renascer.");
      await openConfig();
      return;
    }

    setBusy(true);
    try {
      const response = await window.renascer.bridge.resolve(parsed.code);
      if (!response.ok) {
        setError(response.error?.message || "Não foi possível consultar o Renascer.");
        if (response.error?.status === 401) await openConfig();
        return;
      }
      setPreview(response.data);
      setLocalResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function resetOverlay() {
    setCode("");
    setLocalResult(null);
    setPreview(null);
    setError("");
    setShowConfig(false);
    await window.renascer.bridge.resize("compact");
    focusInput();
  }

  async function closeOverlay() {
    await resetOverlay();
    await window.renascer.bridge.hide();
  }

  useEffect(() => {
    refreshStatus().then((status) => {
      if (!status.config?.configured) openConfig();
      else focusInput();
    });

    const unsubscribe = window.renascer.bridge.onActivated(async () => {
      const status = await refreshStatus();
      setCode("");
      setLocalResult(null);
      setPreview(null);
      setError("");
      if (!status.config?.configured) await openConfig();
      else {
        setShowConfig(false);
        focusInput();
      }
    });

    function onKeyDown(event) {
      if (event.key === "Escape") closeOverlay();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.overlay}>
      <header className={styles.header}>
        <div>
          <small>RENASCER PADARIA E CONFEITARIA</small>
          <h1>Bridge</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.settings} onClick={openConfig} aria-label="Configurar Bridge">⚙</button>
          <button type="button" className={styles.close} onClick={closeOverlay} aria-label="Fechar">×</button>
        </div>
      </header>

      <div className={styles.statusLine}>
        <span className={bridgeStatus.shortcutRegistered ? styles.online : styles.offline} />
        <span>Atalho {bridgeStatus.shortcut}: {bridgeStatus.shortcutRegistered ? "ativo" : "indisponível"}</span>
        <span className={configStatus.configured ? styles.online : styles.offline} />
        <span>API: {configStatus.configured ? "configurada" : "não configurada"}</span>
      </div>

      {showConfig ? (
        <form className={styles.configCard} onSubmit={saveConfig}>
          <div className={styles.configTitle}>
            <div>
              <small>CONFIGURAÇÃO LOCAL</small>
              <h2>Conexão com o Renascer</h2>
            </div>
            {configStatus.configured && <button type="button" onClick={closeConfig}>Voltar</button>}
          </div>

          <label>
            <span>URL do sistema</span>
            <input
              value={configForm.apiUrl}
              onChange={(event) => setConfigForm((current) => ({ ...current, apiUrl: event.target.value }))}
              placeholder="https://seu-dominio.com.br"
              autoComplete="off"
            />
          </label>

          <label>
            <span>Token do Bridge</span>
            <input
              type="password"
              value={configForm.token}
              onChange={(event) => setConfigForm((current) => ({ ...current, token: event.target.value }))}
              placeholder={configStatus.tokenConfigured ? "Token já salvo — deixe vazio para manter" : "rbg_..."}
              autoComplete="new-password"
            />
          </label>

          <p className={styles.securityNote}>
            O token é protegido pelo armazenamento seguro do Windows e não é salvo em texto puro.
          </p>

          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar configuração"}</button>
        </form>
      ) : (
        <>
          <form onSubmit={resolveCode} className={styles.form}>
            <label htmlFor="bridge-code">Comanda ou Delivery</label>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                id="bridge-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="C105 ou DV7K3M9Q2X"
                autoComplete="off"
                spellCheck="false"
                disabled={busy}
              />
              <button type="submit" disabled={busy}>{busy ? "Consultando..." : "Carregar"}</button>
            </div>
          </form>

          {error && <div className={styles.error}>{error}</div>}

          {!localResult && !preview && !error && (
            <section className={styles.instructions}>
              <strong>Consulta segura habilitada</strong>
              <p>O Bridge consulta a API e mostra a prévia dos itens. Nesta fase nenhum código é digitado automaticamente no GeMaster.</p>
            </section>
          )}

          {localResult && !localResult.recognized && (
            <section className={styles.result} data-state="external">
              <small>CÓDIGO EXTERNO</small>
              <strong>{localResult.code || "(vazio)"}</strong>
              <p>Não pertence ao Renascer. Nenhuma requisição à API e nenhuma ação no GeMaster foram executadas.</p>
            </section>
          )}

          {preview && (
            <section className={styles.preview}>
              <div className={styles.previewHeader}>
                <div>
                  <small>{preview.reference_type === "comanda" ? "COMANDA RENASCER" : "DELIVERY RENASCER"}</small>
                  <strong>{preview.reference_code}</strong>
                  <span>Pedido #{preview.order_number} · {preview.items.length} item(ns)</span>
                </div>
                <div className={styles.total}>
                  <small>TOTAL RENASCER</small>
                  <strong>{money.format(Number(preview.total || 0))}</strong>
                </div>
              </div>

              <div className={styles.items}>
                {preview.items.map((item) => (
                  <article className={styles.item} key={item.item_id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>Qtd. {item.quantity} · {money.format(Number(item.subtotal || 0))}</span>
                      {item.requires_weight_handling && (
                        <em>Produto pesado: a forma de lançamento será definida no teste com o GeMaster.</em>
                      )}
                    </div>
                    <div className={styles.codeBox}>
                      <small>CÓDIGO GEMASTER</small>
                      <strong>{item.external_code}</strong>
                      {item.external_ean && <span>EAN {item.external_ean}</span>}
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.safeNotice}>
                <strong>Prévia somente</strong>
                <span>Despacho {preview.dispatch_id}. Nenhum item foi injetado no GeMaster e nenhum pagamento foi registrado.</span>
              </div>

              <button type="button" className={styles.secondaryButton} onClick={resetOverlay}>Consultar outro código</button>
            </section>
          )}
        </>
      )}

      <footer className={styles.footer}>ESC fecha o Bridge · EAN/PLU normal continua exclusivo do GeMaster</footer>
    </main>
  );
}
