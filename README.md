# Renascer Bridge

Aplicativo Windows do ecossistema Renascer para integrar **Comandas** e **Delivery** ao GeMaster sem substituir nem interferir na frente de caixa existente.

## Responsabilidade

O Bridge reconhece somente identificadores operacionais do Renascer:

- número puro de comanda, por exemplo `105`, convertido localmente para `C105`;
- `C...` para comandas, por exemplo `C105`;
- `DV...` para Delivery, por exemplo `DV7K3M9Q2X`.

Códigos normais de produtos (EAN/PLU/etiquetas da padaria) continuam sendo responsabilidade exclusiva do GeMaster.

```text
EAN / PLU normal
  -> GeMaster diretamente

105 / C105 / DV...
  -> Renascer Bridge
  -> API Renascer
  -> snapshot dos itens + códigos GeMaster
  -> prévia no Bridge
```

Nesta fase a consulta real à API já está habilitada, mas **a injeção automática de teclado no GeMaster ainda não está habilitada**.

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

O atalho global padrão no Windows é **`Ctrl + Alt + R`**.

## Operação no caixa

O Bridge fica residente no Windows. No executável instalado ele é configurado para iniciar com o Windows e permanecer na bandeja do sistema.

Fluxo rápido:

```text
GeMaster em primeiro plano
  -> Ctrl + Alt + R
  -> janela rápida do Renascer Bridge
  -> digita 105
  -> Enter
  -> Bridge converte para C105
  -> consulta o backend Renascer
  -> exibe a prévia da comanda
```

Também é possível digitar `C105` diretamente ou um código `DV...` de Delivery.

`Esc` esconde a janela. Um duplo clique no ícone da bandeja também abre o Bridge caso o atalho global esteja ocupado por outro programa.

## Configuração do computador

Na primeira execução, abra o Bridge com `Ctrl + Alt + R` e informe:

1. URL pública do sistema Renascer;
2. token `rbg_...` gerado para aquele computador.

O token é armazenado pelo processo principal do Electron usando `safeStorage` do Electron/DPAPI no Windows. O renderer não recebe o token de volta depois de salvo.

Também é possível configurar por variáveis de ambiente durante desenvolvimento:

```text
RENASCER_API_URL=http://localhost:3000
RENASCER_BRIDGE_TOKEN=rbg_...
RENASCER_BRIDGE_SHORTCUT=Control+Alt+R
```

Fora do computador local, a configuração exige HTTPS.

## Fluxo atual

```text
Ctrl + Alt + R
  -> digita 105, C105 ou DV...
  -> valida e normaliza localmente
  -> POST /api/integrations/bridge/resolve
  -> backend valida pedido e mapeamentos
  -> retorna snapshot idempotente
  -> Bridge mostra prévia dos itens e códigos GeMaster
```

Um EAN de 13 dígitos, como `7891234567890`, continua sendo classificado como externo e **não gera requisição à API**.

Produtos pesados aparecem destacados na prévia. A forma exata de lançar esses itens no GeMaster será definida depois do teste real do PDV/Filizola.

## Testes

```bash
npm test
```

## Executável Windows

```bash
npm run dist:win
```

A pasta `release/` terá instalador NSIS e versão portátil `.exe`.

## Segurança e confiabilidade

- `contextIsolation` habilitado;
- `nodeIntegration` desabilitado;
- DevTools desabilitado no executável de produção;
- token do Bridge protegido pelo armazenamento seguro do Windows;
- nenhuma `SUPABASE_SECRET_KEY` ou service role no Electron;
- chamadas à API feitas no processo principal, não diretamente pelo React;
- timeout e tratamento de falha de rede;
- `operationId` idempotente reutilizado em retries de rede;
- somente uma instância do Bridge pode permanecer ativa;
- nenhum pagamento é registrado na etapa de prévia;
- o GeMaster continua funcionando normalmente sem o Bridge;
- ainda não existe captura global do scanner;
- ainda não existe injeção automática de teclado.

Consulte [`docs/TESTE_GEMASTER.md`](docs/TESTE_GEMASTER.md).
