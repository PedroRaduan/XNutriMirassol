import type { User } from "next-auth";

export function fallbackProfile(user: User) {
  return {
    id: user.id ?? "demo-user",
    name: user.name ?? "Cliente XNutri",
    email: user.email ?? "cliente@xnutri.com.br",
    phone: "",
    document: "",
  };
}

export const fallbackAddresses = [
  {
    id: "demo-address",
    label: "Endereco demo",
    recipient: "Cliente XNutri",
    zipCode: "15130-000",
    street: "Rua 9 de Julho",
    number: "1250",
    complement: "",
    district: "Centro",
    city: "Mirassol",
    state: "SP",
    reference: "",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
