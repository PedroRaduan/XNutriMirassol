import "server-only";

// Hash bcrypt válido usado somente para igualar o custo de tentativas contra
// contas inexistentes. Ele não corresponde a uma credencial utilizável.
export const DUMMY_PASSWORD_HASH =
  "$2b$12$grj3cjj2YFUb0EuKhKTmAOgjgyZZUyrr9DnXJt/TLHEepZDVyedbq";
