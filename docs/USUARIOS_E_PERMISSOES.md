# Usuários e permissões

`UserRole.CLIENT` representa cliente. Funcionários possuem `UserRole.ADMIN` e perfil `AdminUser` ativo.

| Perfil interno | Acesso |
| --- | --- |
| `ADMIN` | Todos os módulos, configurações, auditoria e ações críticas. |
| `MANAGER` | Dashboard, produtos, estoque, pedidos e relatórios definidos em código. |
| `CASHIER` | Somente PDV e próprio caixa. |
| `VIEWER` | Leitura de dashboard, pedidos, relatórios e financeiro permitido. |

A matriz está em `src/lib/auth/permissions.ts`. Esconder botão não é permissão: `requireAdmin` e `requirePOS` verificam sessão, perfil ativo e módulo no servidor.
