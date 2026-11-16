/** A send that failed; `retryable` says whether trying again later can help. */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}
