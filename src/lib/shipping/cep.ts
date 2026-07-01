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

async function fetchCepProvider<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_500);

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function lookupCep(value: string): Promise<CepAddress | null> {
  const cep = validateCep(value);
  if (!cep) return null;

  const viaCep = await fetchCepProvider<{
    erro?: boolean;
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  }>(`https://viacep.com.br/ws/${cep}/json/`);

  if (viaCep && !viaCep.erro) {
    return {
      zipCode: viaCep.cep,
      street: viaCep.logradouro,
      district: viaCep.bairro,
      city: viaCep.localidade,
      state: viaCep.uf,
    };
  }

  const brasilApi = await fetchCepProvider<{
    cep: string;
    state: string;
    city: string;
    neighborhood?: string;
    street?: string;
  }>(`https://brasilapi.com.br/api/cep/v1/${cep}`);

  if (!brasilApi) return null;

  return {
    zipCode: brasilApi.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
    street: brasilApi.street ?? "",
    district: brasilApi.neighborhood ?? "",
    city: brasilApi.city,
    state: brasilApi.state,
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
      message: "CEP inválido. Informe os 8 números do CEP.",
      address: null,
    };
  }

  const address = await lookupCep(cep);

  if (!address) {
    return {
      ok: false,
      message: "CEP não encontrado ou consulta indisponível. Confira o número e tente novamente.",
      address,
    };
  }

  if (normalizeAddressPart(address.state).toUpperCase() !== normalizeAddressPart(input.state).toUpperCase()) {
    return { ok: false, message: "CEP não confere com a UF informada.", address };
  }

  if (!addressPartMatches(address.city, input.city)) {
    return { ok: false, message: "CEP não confere com a cidade informada.", address };
  }

  return { ok: true, address };
}
