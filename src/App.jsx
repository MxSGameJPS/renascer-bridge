import { useEffect, useRef, useState } from "react";
import { classifyBridgeCode } from "./shared/code-parser";
import styles from "./App.module.css";

export default function App() {
  const inputRef = useRef(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState({ shortcut: "F8", shortcutRegistered: false });

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function validate(event) {
    event?.preventDefault();
    const parsed = classifyBridgeCode(code);
    setResult(parsed);
    if (parsed.recognized) setCode(parsed.code);
  }

  async function closeOverlay() {
    setCode("");
    setResult(null);
    await window.renascer.bridge.hide();
  }

  useEffect(() => {
    window.renascer.bridge.status().then(setBridgeStatus);
    const unsubscribe = window.renascer.bridge.onActivated(() => {
      setCode("");
      setResult(null);
      focusInput();
    });

    function onKeyDown(event) {
      if (event.key === "Escape") closeOverlay();
    }

    window.addEventListener("keydown", onKeyDown);
    focusInput();

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
        <button type="button" className={styles.close} onClick={closeOverlay} aria-label="Fechar">×</button>
      </header>

      <div className={styles.statusLine}>
        <span className={bridgeStatus.shortcutRegistered ? styles.online : styles.offline} />
        <span>
          Atalho {bridgeStatus.shortcut}: {bridgeStatus.shortcutRegistered ? "ativo" : "indisponível"}
        </span>
      </div>

      <form onSubmit={validate} className={styles.form}>
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
          />
          <button type="submit">Validar</button>
        </div>
      </form>

      {!result && (
        <section className={styles.instructions}>
          <strong>Fase segura de diagnóstico</strong>
          <p>Nesta versão o Bridge apenas identifica códigos do Renascer. Nenhum item é enviado ao GeMaster ainda.</p>
        </section>
      )}

      {result?.recognized && (
        <section className={styles.result} data-state="recognized">
          <small>{result.type === "command" ? "COMANDA RENASCER" : "DELIVERY RENASCER"}</small>
          <strong>{result.code}</strong>
          <p>Código válido. A consulta à API e o envio ao GeMaster serão habilitados na próxima fase.</p>
        </section>
      )}

      {result && !result.recognized && (
        <section className={styles.result} data-state="external">
          <small>CÓDIGO EXTERNO</small>
          <strong>{result.code || "(vazio)"}</strong>
          <p>Não pertence ao Renascer. Nenhuma ação será executada pelo Bridge.</p>
        </section>
      )}

      <footer className={styles.footer}>ESC fecha o Bridge · códigos normais continuam no GeMaster</footer>
    </main>
  );
}
