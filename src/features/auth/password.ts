import "server-only";
import bcrypt from "bcrypt";

export const PASSWORD_COST = 12;
// Hash válido para manter a comparação bcrypt também quando a conta não existe.
const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export function hashPassword(password: string) { return bcrypt.hash(password, PASSWORD_COST); }
export function verifyPassword(password: string, hash: string | undefined) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
