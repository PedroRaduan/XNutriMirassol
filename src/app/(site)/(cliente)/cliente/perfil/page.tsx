import { updateProfile } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div>
      <h1 className="text-4xl font-black">Perfil</h1>
      <form action={updateProfile} className="surface mt-6 grid max-w-2xl gap-4 p-6">
        <label className="text-sm font-black">Nome<input className="field mt-2" name="name" defaultValue={user.name ?? ""} /></label>
        <label className="text-sm font-black">E-mail<input className="field mt-2" value={user.email} disabled /></label>
        <label className="text-sm font-black">WhatsApp<input className="field mt-2" name="phone" defaultValue={user.phone ?? ""} /></label>
        <label className="text-sm font-black">CPF/CNPJ<input className="field mt-2" name="document" defaultValue={user.document ?? ""} /></label>
        <button className="btn btn-primary justify-self-start">Salvar perfil</button>
      </form>
    </div>
  );
}
