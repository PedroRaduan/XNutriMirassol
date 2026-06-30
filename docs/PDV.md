# Guia do PDV XNutri

Este guia explica o sistema de caixa presencial da XNutri em `/pdv`.

O PDV e o e-commerce usam o mesmo banco de dados. Isso significa:

- produto cadastrado no admin aparece no site e no PDV;
- estoque vendido no PDV diminui no site;
- estoque vendido no site diminui para o PDV;
- clientes, custos, relatorios e auditoria ficam centralizados.

## Rotas

- Loja publica: `/`
- Painel administrativo: `/admin`
- Caixa presencial: `/pdv`
- Login do caixa: `/pdv/login`
- Relatorios do caixa: `/pdv/relatorios`

## Permissoes

- `ADMIN`: acessa tudo.
- `MANAGER`: acessa PDV, produtos, estoque, pedidos, financeiro e relatorios.
- `CASHIER`: acessa o PDV e suas vendas.

Cliente comum nao ve link do PDV e nao consegue acessar `/pdv`.

## Instalacao do zero

1. Instale dependencias:

```bash
npm install
```

2. Copie o ambiente:

```bash
copy .env.example .env
```

3. Configure o PostgreSQL em `DATABASE_URL`.

4. Gere o Prisma Client:

```bash
npm run db:generate
```

5. Rode migrations:

```bash
npm run db:migrate
```

6. Rode o seed:

```bash
npm run db:seed
```

7. Inicie:

```bash
npm run dev
```

8. Acesse:

- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- PDV: `http://localhost:3000/pdv`

## Contas do seed

- Admin: `admin@xnutri.com.br` / `Admin@12345`
- Caixa: `caixa@xnutri.com.br` / `Caixa@12345`
- Cliente: `cliente@xnutri.com.br` / `Cliente@12345`

Troque as senhas antes de producao.

## Como cadastrar produto para aparecer no PDV

1. Entre em `/admin`.
2. Abra `Produtos`.
3. Cadastre ou edite um produto.
4. Preencha:
   - nome;
   - categoria;
   - SKU;
   - codigo de barras;
   - EAN;
   - codigo interno;
   - preco de venda;
   - custo do produto;
   - custo de embalagem;
   - estoque.
5. Em variacoes, cadastre tamanho/sabor/cor com SKU e codigo de barras proprios.

Exemplos:

- Whey Chocolate 900g: SKU `XN-WHEY-CHOC-900`
- Whey Morango 900g: SKU `XN-WHEY-MOR-900`
- Legging Preta M: SKU `XN-LEGGING-PRETA-M`

Cada variacao pode ter preco, custo e estoque diferentes.

## Leitor de codigo de barras

Leitores comuns funcionam como teclado.

No PDV:

1. Clique no campo grande de busca.
2. Escaneie o produto.
3. Se o codigo bater com SKU, barcode, EAN ou codigo interno, o item entra no carrinho.

Atalho util: `F2` volta o foco para a busca.

## Abrir caixa

1. Entre em `/pdv`.
2. Informe o valor inicial em dinheiro.
3. Clique em `Abrir caixa`.

Sem caixa aberto, o sistema nao finaliza venda real.

## Fazer uma venda

1. Busque ou escaneie o produto.
2. Ajuste quantidade.
3. Aplique desconto por item, se precisar.
4. Aplique desconto geral, se precisar.
5. Escolha cliente ou venda sem cliente.
6. Escolha pagamento.
7. Clique em `Finalizar venda`.

Atalhos:

- `F2`: buscar produto.
- `F4`: desconto geral.
- `F8`: finalizar venda.
- `Esc`: limpar busca/fechar aviso.

## Pagamentos

O PDV permite:

- dinheiro;
- Pix;
- cartao de debito;
- cartao de credito;
- Mercado Pago;
- pagamento misto.

Para pagamento misto:

1. Clique em `Pagamento misto`.
2. Informe uma linha para cada forma.
3. A soma precisa bater com o total.

Exemplo:

- Total: R$ 200,00
- Pix: R$ 100,00
- Credito: R$ 100,00

Para dinheiro:

1. Informe o valor da venda em dinheiro.
2. Informe `valor recebido`.
3. O PDV calcula o troco.

## Estoque

Ao finalizar venda:

- o estoque da variacao/produto baixa automaticamente;
- uma movimentacao `STOCK_OUT` e registrada;
- o produto pode ficar indisponivel no site se acabar;
- o admin ve o mesmo estoque.

Se o produto nao tiver estoque, o PDV bloqueia a venda, a menos que o admin permita estoque negativo em `Admin > Financeiro`.

## Descontos e margem

O PDV salva uma fotografia financeira da venda:

- preco vendido;
- custo do produto;
- custo de embalagem;
- desconto;
- taxa estimada;
- lucro estimado;
- margem estimada.

Assim, se o custo do produto mudar depois, os relatorios antigos continuam coerentes.

## Taxas do PDV

Configure em `/admin/financeiro`:

- taxa dinheiro;
- taxa Pix;
- taxa debito;
- taxa credito;
- taxa Mercado Pago;
- taxa fixa por pedido;
- imposto estimado;
- custo padrao de embalagem;
- margem minima;
- alerta de margem baixa;
- permissao para estoque negativo.

## Cliente no PDV

Voce pode vender:

- sem cliente identificado;
- com cliente existente;
- com cadastro rapido.

Busca de cliente:

- nome;
- telefone;
- CPF;
- e-mail.

Cadastro rapido:

- nome;
- telefone;
- CPF opcional;
- e-mail opcional.

## Comprovante

Depois de vender, abra o comprovante.

Ele mostra:

- XNutri;
- data;
- numero da venda;
- funcionario;
- cliente;
- produtos;
- quantidade;
- preco;
- desconto;
- total;
- forma de pagamento;
- troco.

Opcoes:

- imprimir;
- salvar como PDF pelo dialogo de impressao do navegador;
- enviar resumo por WhatsApp;
- enviar por e-mail quando o cliente tiver e-mail.

## Cancelamento e devolucao

Cancelamento total:

1. Em `/pdv`, abra `Ultimas vendas`.
2. Clique em `Cancelar`.
3. Informe o motivo.
4. Confirme.

O estoque volta integralmente.

Devolucao parcial:

1. Abra o comprovante da venda.
2. Em um item, clique em `Registrar devolucao deste item`.
3. Informe quantidade e motivo.
4. Confirme.

O estoque volta somente da quantidade devolvida.

## Sangria e reforco

Com caixa aberto:

- `Reforco`: entrada extra de dinheiro.
- `Sangria`: retirada de dinheiro.

Registre sempre o motivo para auditoria.

## Fechar caixa

1. Conte o dinheiro fisico.
2. Informe o valor contado.
3. Clique em `Fechar caixa`.

O sistema calcula:

- valor esperado;
- valor informado;
- diferenca.

## Relatorios do PDV

Acesse `/pdv/relatorios`.

Filtros:

- hoje;
- ultimos 7 dias;
- ultimos 30 dias;
- mes atual;
- mes passado;
- ano atual;
- periodo personalizado.

Metricas:

- vendas;
- faturamento;
- lucro estimado;
- ticket medio;
- descontos;
- taxas;
- CMV;
- margem media;
- vendas por funcionario;
- vendas por forma de pagamento;
- produtos mais vendidos;
- produtos mais lucrativos;
- produtos com menor margem.

## Relatorio geral da empresa

O PDV salva vendas em tabelas proprias (`pos_sales`, `pos_sale_items`, `pos_payments`) usando os mesmos produtos, clientes e estoque.

Para uma visao gerencial completa, some:

- pedidos online (`orders`);
- vendas presenciais (`pos_sales`);
- movimentacoes de estoque online e PDV (`inventory_movements`).

## Mercado Pago

No e-commerce, Mercado Pago processa Pix/cartao online.

No PDV, a forma `Mercado Pago` registra venda presencial feita em maquininha/link/QR externo. A taxa configurada entra no lucro estimado.

Para integrar captura automatica futura:

1. configure credenciais no `.env`;
2. crie webhook para confirmacao presencial;
3. salve referencia externa em `POSPayment.externalReference`;
4. atualize `POSPayment.status`.

## Nota fiscal

O projeto nao emite NFC-e/NF-e automaticamente.

A estrutura deixa preparado para integrar no futuro com:

- Bling;
- Tiny;
- Focus NFe;
- NFe.io;
- outro emissor fiscal.

Emissao fiscal real depende de:

- certificado digital;
- CNPJ e inscricao estadual;
- regime tributario;
- contador;
- configuracao de NFC-e/NF-e por UF.

Nao invente dados fiscais.

## PWA

O projeto possui `manifest.ts` com `start_url` em `/pdv`.

No celular ou tablet:

1. abra o site no navegador;
2. acesse `/pdv`;
3. faca login;
4. use a opcao do navegador `Adicionar a tela inicial`.

Isso cria um atalho instalado sem app nativo.

## Deploy

Checklist:

1. configure `DATABASE_URL` de producao;
2. configure `AUTH_SECRET`;
3. configure URL publica em `NEXT_PUBLIC_APP_URL`;
4. configure Mercado Pago;
5. configure Cloudinary;
6. rode:

```bash
npm run db:deploy
npm run db:seed
npm run build
```

7. crie usuarios reais;
8. troque senhas do seed;
9. teste venda pequena no PDV.

## Checklist de testes do PDV

- Login em `/pdv/login`.
- Acesso bloqueado para cliente comum.
- Abertura de caixa.
- Busca por nome.
- Busca por SKU.
- Busca por codigo de barras.
- Produto com variacao.
- Roupa fitness com tamanho.
- Venda em dinheiro.
- Calculo de troco.
- Venda em Pix.
- Venda em debito.
- Venda em credito.
- Venda com Mercado Pago.
- Pagamento misto.
- Desconto por item.
- Desconto geral.
- Bloqueio por estoque insuficiente.
- Baixa de estoque.
- Comprovante.
- Impressao/salvar PDF.
- Cancelamento total.
- Devolucao parcial.
- Sangria.
- Reforco.
- Fechamento de caixa.
- Relatorio diario.
- Produto vendido no PDV indisponivel no site quando estoque acaba.
- Produto vendido online reduz estoque no PDV.

## Erros comuns

### Banco offline

Mensagem: banco offline ou erro Prisma.

Resolva:

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

### Produto nao aparece no PDV

Confira:

- produto esta `ACTIVE`;
- variacao esta ativa;
- existe estoque;
- SKU/codigo foi salvo;
- migration foi executada.

### Venda nao finaliza

Confira:

- caixa esta aberto;
- carrinho tem produto;
- pagamento soma o total;
- estoque e suficiente;
- usuario tem permissao `CASHIER`, `MANAGER` ou `ADMIN`.

### Leitor nao adiciona produto

Confira:

- o leitor esta digitando no campo de busca;
- o codigo escaneado e igual ao `barcode`, `EAN`, `SKU` ou codigo interno;
- o produto esta ativo.
