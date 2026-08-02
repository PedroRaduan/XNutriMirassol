# Login com Google

O projeto usa Auth.js com o adaptador Prisma. A conta Google é salva na tabela `accounts` e vinculada ao registro da tabela `users`. O login por e-mail e senha continua funcionando normalmente.

## 1. Criar as credenciais no Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Crie ou selecione um projeto.
3. Configure a tela de consentimento OAuth com o nome XNutri.
4. Em **Credenciais**, escolha **Criar credenciais > ID do cliente OAuth**.
5. Selecione **Aplicativo da Web**.
6. Adicione as URLs de redirecionamento autorizadas:

```text
http://localhost:3000/api/auth/callback/google
https://SEU-DOMINIO.com.br/api/auth/callback/google
```

Troque `SEU-DOMINIO.com.br` pelo domínio definitivo, sem barra no final.

## 2. Configurar localmente

No `.env.local`, adicione:

```env
GOOGLE_CLIENT_ID="cole-o-client-id"
GOOGLE_CLIENT_SECRET="cole-o-client-secret"
```

Reinicie o projeto:

```powershell
npm run dev
```

## 3. Configurar na hospedagem

Cadastre `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nas variáveis de ambiente da Vercel, Hostinger ou outra hospedagem. Depois faça um novo deploy.

O domínio também precisa estar correto nestas variáveis:

```env
NEXT_PUBLIC_APP_URL="https://SEU-DOMINIO.com.br"
AUTH_URL="https://SEU-DOMINIO.com.br"
NEXTAUTH_URL="https://SEU-DOMINIO.com.br"
```

## 4. Como o vínculo funciona

- Usuários novos recebem a função `CLIENT`.
- Se já existir uma conta com o mesmo e-mail, o Auth.js vincula o Google ao mesmo usuário em vez de criar uma duplicação.
- O vínculo automático é aceito somente para o provedor Google e o login exige `email_verified=true`.
- Senhas, tokens e o `GOOGLE_CLIENT_SECRET` nunca são enviados ao navegador.

## 5. Testar

1. Abra `/login`.
2. Clique em **Continuar com Google**.
3. Autorize o aplicativo.
4. Confirme o redirecionamento para `/cliente`.
5. Verifique no banco se existe apenas um usuário para o e-mail e uma conta com `provider = google`.

Se o botão não aparecer, as duas variáveis do Google não chegaram ao processo. Se aparecer `redirect_uri_mismatch`, confira se a URL cadastrada no Google termina exatamente com `/api/auth/callback/google`.
