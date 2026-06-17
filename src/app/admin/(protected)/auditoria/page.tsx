import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AuditSearchParams = Promise<{ q?: string; entity?: string }>;

function preview(value: unknown) {
  if (!value) return "Sem detalhes";
  const text = JSON.stringify(value);
  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: AuditSearchParams }) {
  await requireAdmin("audit");
  const params = await searchParams;
  const entity = params.entity ?? "ALL";
  const q = params.q?.trim();

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entity !== "ALL" ? { entity } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entity: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
              { adminUser: { user: { email: { contains: q, mode: "insensitive" } } } },
              { adminUser: { user: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: { adminUser: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entities = await prisma.auditLog.groupBy({ by: ["entity"], _count: { id: true }, orderBy: { entity: "asc" } });

  return (
    <div>
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Seguranca</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Auditoria</h1>
        <p className="mt-2 text-sm text-white/60">Historico das acoes administrativas importantes feitas no painel.</p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="field" name="q" defaultValue={q} placeholder="Buscar por acao, entidade, usuario ou ID" />
        <select className="field" name="entity" defaultValue={entity}>
          <option value="ALL">Todas entidades</option>
          {entities.map((item) => <option key={item.entity} value={item.entity}>{item.entity} ({item._count.id})</option>)}
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#f7f7f8] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Acao</th>
                <th className="px-5 py-3">Entidade</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="admin-row border-t border-[var(--line)] align-top">
                  <td className="px-5 py-4 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-5 py-4">
                    <strong>{log.adminUser?.user.name ?? "Sistema"}</strong>
                    <span className="block text-xs text-[var(--muted)]">{log.adminUser?.user.email}</span>
                  </td>
                  <td className="px-5 py-4 font-black">{log.action}</td>
                  <td className="px-5 py-4">
                    {log.entity}
                    <span className="block text-xs text-[var(--muted)]">{log.entityId}</span>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{log.ipAddress ?? "nao informado"}</td>
                  <td className="px-5 py-4">
                    <code className="block max-w-lg whitespace-pre-wrap rounded-md bg-[#f7f7f8] p-2 text-xs text-[var(--muted)]">{preview(log.metadata)}</code>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--muted)]">Nenhum log encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
