# Teste inicial com o GeMaster

Esta fase serve para validar o comportamento do overlay e descobrir o caminho mais seguro para automação do GeMaster.

## Antes do teste

1. Abra o GeMaster normalmente.
2. Confirme qual função o `F8` executa no GeMaster, se houver.
3. Inicie o Renascer Bridge.
4. Pressione `F8` com o GeMaster em primeiro plano.

Se o overlay abrir, o atalho global foi registrado. Se `F8` conflitar com uma função importante do GeMaster, altere `RENASCER_BRIDGE_SHORTCUT` para outro atalho antes de avançar.

## Testes do parser

No overlay:

- `C105` deve ser reconhecido como Comanda Renascer;
- `DV7K3M9Q2X` deve ser reconhecido como Delivery Renascer;
- `7891234567890` deve ser classificado como código externo e nenhuma ação deve ser executada;
- `105` sem prefixo deve ser ignorado.

## Scanner normal

Com o overlay fechado, leia produtos normalmente no GeMaster. Nesta versão o Bridge **não instala hook de teclado e não captura scanner**, portanto o fluxo atual do caixa deve permanecer intacto.

## O que registrar no primeiro teste

- versão do Windows;
- versão/tela do GeMaster;
- se `F8` possui função própria no GeMaster;
- como o GeMaster recebe um código de produto digitado manualmente;
- se o código precisa de `Enter` ao final;
- um código real conhecido de produto que possa ser usado em prova de conceito.

## Próxima fase

Depois do diagnóstico:

1. criar autenticação de dispositivo para o Bridge;
2. criar endpoint seguro no Renascer para resolver `C...`/`DV...` em itens;
3. mapear produtos Renascer para os códigos reconhecidos pelo GeMaster;
4. implementar injeção somente quando o operador confirmar a carga;
5. auditar e tornar a operação idempotente;
6. nunca marcar como pago apenas por ter enviado itens ao GeMaster.
