// Carry only known internal destinations through login/registration.
export function safeReturnTo(value?: string) {
  if (!value) return "/experiencias";
  if (
    [
      "/experiencias",
      "/experiencias/nueva",
      "/salas",
      "/reservas",
      "/admin",
      "/moderacion",
    ].includes(value)
  )
    return value;
  if (/^\/unirse\/[a-f0-9]{20}$/.test(value)) return value;
  const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
  if (
    new RegExp(
      `^/(?:salas/${uuid}|gestionar/${uuid}|experiencias/${uuid}/editar)$`,
    ).test(value)
  )
    return value;
  return "/experiencias";
}
