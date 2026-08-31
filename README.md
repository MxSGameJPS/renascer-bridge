# Renascer Bridge

Aplicativo Windows do ecossistema Renascer para integrar **Comandas** e **Delivery** ao GeMaster sem substituir nem interferir na frente de caixa existente.

## Responsabilidade

O Bridge reconhece somente identificadores operacionais do Renascer:

- `C...` para comandas, por exemplo `C105`;
- `DV...` para Delivery, por exemplo `DV7K3M9Q2X`.

Códigos normais de produtos (EAN/PLU/etiquetas da padaria) continuam sendo responsabilidade exclusiva do GeMaster.

```text
Código normal / EAN / PLU
  -> GeMaster diretamente

C...
  -> Renascer Bridge
  -> API Renascer
  -> itens da comanda
  -> GeMaster

DV...
  -> Renascer Bridge
  -> API Renascer
  -> itens do delivery
  -> GeMaster
```

## Princípio de contingência

O GeMaster deve continuar funcionando normalmente mesmo se o Bridge, a internet ou o Renascer estiverem indisponíveis. O Bridge é uma integração complementar e nunca uma dependência da frente de caixa.

## Stack

- Electron
- React 19
- Vite
- JavaScript
- CSS Modules

## Desenvolvimento

```bash
npm install
npm run dev
```

O atalho global padrão é `F8`. Para usar outro durante desenvolvimento:

```bash
RENASCER_BRIDGE_SHORTCUT=F9 npm run dev
```

No Windows/PowerShell:

```powershell
$env:RENASCER_BRIDGE_SHORTCUT="F9"
npm run dev
```

## Testes

```bash
npm test
```

## Executável Windows

```bash
npm run dist:win
```

A pasta `release/` terá instalador NSIS e versão portátil `.exe`.

## Segurança

- `contextIsolation` habilitado.
- `nodeIntegration` desabilitado.
- O renderer recebe somente uma API limitada via `preload`.
- Não armazenar `SUPABASE_SECRET_KEY`, service role ou outros segredos do Supabase.
- O Bridge conversará apenas com endpoints protegidos do backend Renascer.
- Nenhuma venda será marcada como paga apenas porque os itens foram enviados ao GeMaster.
- Toda futura baixa externa deverá ser idempotente e auditável.
- Nesta fase **não existe captura global de scanner** e **não existe injeção de teclado no GeMaster**.

## Status

Fase 1: overlay F8 + validação segura de códigos Renascer. A integração com a API e a automação real do GeMaster serão implementadas depois do diagnóstico no caixa.

Consulte [`docs/TESTE_GEMASTER.md`](docs/TESTE_GEMASTER.md).
