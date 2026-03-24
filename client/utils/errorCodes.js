/**
 * @fileoverview Maps server-side error codes to i18n translation keys.
 * Used by the client to display localized, user-friendly error messages
 * instead of raw error codes returned by the API.
 */


const ERROR_CODE_MAP = {

  EMAIL_PASSWORD_REQUIRED: "serverErrors.emailPasswordRequired",
  EMAIL_ALREADY_EXISTS: "serverErrors.emailAlreadyExists",
  EMAIL_ALREADY_IN_USE: "serverErrors.emailAlreadyInUse",
  INVALID_CREDENTIALS: "serverErrors.invalidCredentials",
  REGISTER_FAILED: "serverErrors.registerFailed",
  LOGIN_FAILED: "serverErrors.loginFailed",
  PROFILE_UPDATE_FAILED: "serverErrors.profileUpdateFailed",
  BOTH_PASSWORDS_REQUIRED: "serverErrors.bothPasswordsRequired",
  PASSWORD_TOO_SHORT: "serverErrors.passwordTooShort",
  CURRENT_PASSWORD_INCORRECT: "serverErrors.currentPasswordIncorrect",
  PASSWORD_CHANGE_FAILED: "serverErrors.passwordChangeFailed",
  TOKEN_MISSING: "serverErrors.tokenMissing",
  TOKEN_EXPIRED_OR_INVALID: "serverErrors.tokenExpiredOrInvalid",


  BANK_CONNECTION_NOT_FOUND: "serverErrors.bankConnectionNotFound",
  ACTIVE_CONNECTION_NOT_FOUND: "serverErrors.activeConnectionNotFound",
  BT_REGISTER_CLIENT_FAILED: "serverErrors.btRegisterClientFailed",
  BT_INIT_CONSENT_FAILED: "serverErrors.btInitConsentFailed",
  BT_TOKEN_EXCHANGE_FAILED: "serverErrors.btTokenExchangeFailed",
  BT_GET_ACCOUNTS_FAILED: "serverErrors.btGetAccountsFailed",
  BT_GET_TRANSACTIONS_FAILED: "serverErrors.btGetTransactionsFailed",
  BT_GET_BALANCES_FAILED: "serverErrors.btGetBalancesFailed",
  BT_SESSION_EXPIRED: "serverErrors.btSessionExpired",
  BT_RATE_LIMITED: "serverErrors.tooManyRequests",
  BT_TIMEOUT: "serverErrors.internalServerError",
  BANKING_PROVIDER_DEGRADED: "serverErrors.internalServerError",


  BRD_INIT_CONSENT_FAILED: "serverErrors.internalServerError",
  BRD_TOKEN_EXCHANGE_FAILED: "serverErrors.internalServerError",
  BRD_GET_CONNECTION_DATA_FAILED: "serverErrors.internalServerError",
  BRD_RATE_LIMITED: "serverErrors.tooManyRequests",
  BRD_TIMEOUT: "serverErrors.internalServerError",


  IDEMPOTENCY_KEY_REQUIRED: "serverErrors.internalServerError",
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD:
  "serverErrors.internalServerError",
  IDEMPOTENCY_REQUEST_IN_PROGRESS: "serverErrors.internalServerError",


  ADVISOR_TIMEOUT: "serverErrors.internalServerError",
  AI_PROVIDER_DEGRADED: "serverErrors.internalServerError",


  INTERNAL_SERVER_ERROR: "serverErrors.internalServerError",
  TOO_MANY_REQUESTS: "serverErrors.tooManyRequests"
};









export function getErrorKey(code, fallback = "common.error") {
  return ERROR_CODE_MAP[code] || fallback;
}