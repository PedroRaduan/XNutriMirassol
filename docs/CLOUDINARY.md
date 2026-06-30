# Tutorial Cloudinary da XNutri

Este tutorial explica onde colocar as chaves do Cloudinary e como testar upload de imagens no projeto.

## 1. Qual arquivo devo abrir?

O Cloudinary não usa um arquivo chamado `cloudinary`.

As chaves devem ficar neste arquivo:

```text
.env.local
```

Esse arquivo fica na raiz do projeto:

```text
C:\Users\Sharif\Downloads\xnutri\.env.local
```

O código que usa essas chaves está aqui:

```text
src/lib/cloudinary.ts
src/app/api/admin/uploads/cloudinary/route.ts
```

Mas você normalmente não precisa mexer nesses dois arquivos. Eles só leem as variáveis do `.env.local`.

## 2. Abrir o arquivo `.env.local`

No PowerShell:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
notepad .env.local
```

Se o arquivo não existir, crie copiando o exemplo:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
Copy-Item .env.example .env.local
notepad .env.local
```

## 3. O que colocar no `.env.local`

Procure esta parte:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=xnutri
```

Preencha assim:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=xnutri
```

Exemplo fictício:

```env
CLOUDINARY_CLOUD_NAME=lojaxnutri
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789
CLOUDINARY_FOLDER=xnutri
```

Não copie esse exemplo fictício. Use os dados reais da sua conta Cloudinary.

## 4. Onde achar esses dados no Cloudinary

1. Acesse:

```text
https://cloudinary.com/
```

2. Faça login.
3. Entre no dashboard.
4. Procure a área de API keys ou Product Environment Credentials.
5. Copie:

```text
Cloud name
API key
API secret
```

Depois coloque no `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=valor-do-cloud-name
CLOUDINARY_API_KEY=valor-da-api-key
CLOUDINARY_API_SECRET=valor-do-api-secret
CLOUDINARY_FOLDER=xnutri
```

## 5. Atenção importante

Nunca coloque `NEXT_PUBLIC_` no `CLOUDINARY_API_SECRET`.

Errado:

```env
NEXT_PUBLIC_CLOUDINARY_API_SECRET=...
```

Certo:

```env
CLOUDINARY_API_SECRET=...
```

O `API_SECRET` é senha privada do servidor.

## 6. Reiniciar o site depois de salvar

Depois de salvar o `.env.local`, pare o servidor com:

```powershell
Ctrl + C
```

Depois rode de novo:

```powershell
npm run dev
```

## 7. Testar se funcionou

Abra:

```text
http://localhost:3000/admin
```

Entre no admin e vá para:

```text
Banners e home
```

Teste:

1. Escolha uma imagem.
2. Faça upload.
3. Salve o banner.
4. Volte para a home.
5. Veja se a imagem apareceu.

Também teste em:

```text
Admin > Produtos
```

Se tiver campo de imagem/upload, tente enviar uma imagem de produto.

## 8. Erros comuns

### Upload falhou

Confira se essas três variáveis estão preenchidas:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Depois reinicie:

```powershell
npm run dev
```

### Imagem não aparece

Confira se:

- o upload terminou sem erro;
- a URL da imagem foi salva no admin;
- o banner/produto está ativo;
- a imagem não foi apagada no painel do Cloudinary.

### Erro 401 ou Unauthorized

Normalmente é `API_KEY` ou `API_SECRET` errado.

Copie de novo do painel do Cloudinary e salve no `.env.local`.

### Erro "Cloudinary não configurado"

Significa que uma dessas variáveis está vazia:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 9. Checklist final

Antes de testar upload, confira:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
notepad .env.local
```

O arquivo precisa ter:

```env
CLOUDINARY_CLOUD_NAME=preenchido
CLOUDINARY_API_KEY=preenchido
CLOUDINARY_API_SECRET=preenchido
CLOUDINARY_FOLDER=xnutri
```

Depois:

```powershell
npm run dev
```

E teste no admin:

```text
http://localhost:3000/admin
```

Pronto. O Cloudinary estará conectado ao upload de banners/produtos.
