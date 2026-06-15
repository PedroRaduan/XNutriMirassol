import { onlyDigits } from "@/lib/utils";

export type CepAddress = {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export function validateCep(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 8 ? digits : null;
}

export async function lookupCep(value: string): Promise<CepAddress | null> {
  const cep = validateCep(value);
  if (!cep) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    erro?: boolean;
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };

  if (data.erro) return null;

  return {
    zipCode: data.cep,
    street: data.logradouro,
    district: data.bairro,
    city: data.localidade,
    state: data.uf,
  };
}
