// Only invitation routes can be carried across authentication.
export function invitationReturn(value?: string) {
  return value && /^\/unirse\/[a-f0-9]{20}$/.test(value)
    ? value
    : "/experiencias";
}
