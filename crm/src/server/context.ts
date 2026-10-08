import "server-only";
import { cache } from "react";
import { config } from "./config";
import { ensureLocalUser } from "./data/users";

/**
 * Utilisateur courant.
 *
 * V1 (mono-utilisateur, sans authentification) : l'utilisateur local défini par
 * LOCAL_USER_EMAIL, créé au premier appel. Ses id alimentent createdById / updatedById.
 *
 * Avec une authentification (Auth.js, OIDC...), seule cette fonction changera :
 * elle lira la session et renverra l'utilisateur connecté (ou lèvera une erreur 401).
 */
export const getCurrentUser = cache(async () => {
  const { LOCAL_USER_EMAIL, LOCAL_USER_NAME } = config();
  return ensureLocalUser(LOCAL_USER_EMAIL, LOCAL_USER_NAME);
});

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
