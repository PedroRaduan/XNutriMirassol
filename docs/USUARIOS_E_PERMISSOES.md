# Usuários e permissões

`UserRole.CLIENT` representa cliente. Funcionários possuem `UserRole.ADMIN` e perfil `AdminUser` ativo.

| Perfil interno | Acesso |
| --- | --- |
| `ADMIN` | Todos os módulos, configurações, auditoria, ações críticas e PWA Administração. |
| `MANAGER` | Dashboard, produtos, estoque, pedidos e relatórios definidos em código. |
| `CASHIER` | Somente PDV, próprio caixa e PWA PDV. |
| `VIEWER` | Leitura de dashboard, pedidos, relatórios e financeiro permitido. |

A matriz está em `src/lib/auth/permissions.ts`. Esconder botão não é permissão: `requireAdmin` e `requirePOS` verificam sessão, perfil ativo e módulo no servidor.

O comando `npm run cashier:create -- "email" $SENHA_CAIXA "nome"` provisiona uma funcionária sem permitir que a conta do dono seja rebaixada. Admin e PDV devem ser instalados em aparelhos ou perfis de navegador separados porque compartilham a sessão do domínio.
