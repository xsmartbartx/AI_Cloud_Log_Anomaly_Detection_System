export type Role = "owner" | "admin" | "member";
export type Action = "scan" | "history:read" | "keys:write" | "rules:write" | "settings:write" | "billing:write";

const ALLOWED: Record<Action, Role[]> = {
  scan: ["owner", "admin", "member"],
  "history:read": ["owner", "admin", "member"],
  "keys:write": ["owner", "admin"],
  "rules:write": ["owner", "admin"],
  "settings:write": ["owner", "admin"],
  "billing:write": ["owner"],
};

export class ForbiddenError extends Error {
  constructor(action: Action) { super(`Your role cannot do this (${action}).`); }
}

/** The one function that answers: can this member do this? */
export const can = (role: Role, action: Action) => ALLOWED[action].includes(role);
export function assertCan(role: Role, action: Action) { if (!can(role, action)) throw new ForbiddenError(action); }
