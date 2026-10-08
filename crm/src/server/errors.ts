/** Erreur métier dont le message est affichable tel quel à l'utilisateur. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {}
