# Política de segurança

## Reportar problema

Não abra issue pública com senha, token, URL de banco, pedido de cliente ou prova de exploração. Envie ao responsável pelo projeto uma descrição mínima, rota afetada, impacto, passos seguros para reproduzir e horário. Credenciais potencialmente expostas devem ser revogadas antes de compartilhar evidências.

## Escopo e postura atual

O projeto valida dados no servidor, protege áreas internas por papel, recalcula checkout, usa webhook PagBank assinado, valida uploads, registra ações administrativas e define headers de segurança. Veja [GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md](GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md) e [docs/RESPOSTA_A_INCIDENTES.md](docs/RESPOSTA_A_INCIDENTES.md).

Segurança absoluta não existe. Pontos operacionais obrigatórios: MFA nos provedores, backup/restore do banco, monitoramento de erros, WAF/rate limit distribuído na Vercel conforme tráfego e testes PagBank/Cloudinary em Preview.
