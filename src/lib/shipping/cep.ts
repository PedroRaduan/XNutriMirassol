import { onlyDigits } from "@/lib/utils";

export type CepAddress = {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export type CheckoutAddressInput = {
  zipCode?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
};

export type AddressValidationResult =
  | { ok: true; address: CepAddress }
  | { ok: false; message: string; address?: CepAddress | null };

export function validateCep(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 8 ? digits : null;
}

export async function lookupCep(value: string): Promise<CepAddress | null> {
  const cep = validateCep(value);
  if (!cep) return null;

  let response: Response;

  try {
    response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
  } catch {
    return null;
  }

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

function normalizeAddressPart(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function addressPartMatches(expected: string, received?: string | null) {
  const normalizedExpected = normalizeAddressPart(expected);
  const normalizedReceived = normalizeAddressPart(received);

  if (!normalizedExpected) return true;
  if (!normalizedReceived) return false;

  return (
    normalizedExpected === normalizedReceived ||
    normalizedExpected.includes(normalizedReceived) ||
    normalizedReceived.includes(normalizedExpected)
  );
}

export async function validateAddressAgainstCep(input: CheckoutAddressInput): Promise<AddressValidationResult> {
  const cep = validateCep(input.zipCode ?? "");

  if (!cep) {
    return {
      ok: false,
      message: "CEP invalido. Informe os 8 numeros do CEP.",
      address: null,
    };
  }

  const address = await lookupCep(cep);

  if (!address) {
    return {
      ok: false,
      message: "CEP nao encontrado ou consulta indisponivel. Confira o numero e tente novamente.",
      address,
    };
  }

  if (normalizeAddressPart(address.state).toUpperCase() !== normalizeAddressPart(input.state).toUpperCase()) {
    return { ok: false, message: "CEP nao confere com a UF informada.", address };
  }

  if (!addressPartMatches(address.city, input.city)) {
    return { ok: false, message: "CEP nao confere com a cidade informada.", address };
  }

  return { ok: true, address };
}
