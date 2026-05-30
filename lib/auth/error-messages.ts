export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  "We could not reach the authentication service. Please try again in a moment.";

export const LOGIN_INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export const LOGIN_UNEXPECTED_ERROR_MESSAGE =
  "Something went wrong while signing in. Please try again.";

export const SIGNUP_UNEXPECTED_ERROR_MESSAGE =
  "Something went wrong while creating your account. Please try again.";

export const SIGNUP_DETAILS_ERROR_MESSAGE =
  "Unable to create account. Please check your details and try again.";

const toLowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : "";

const authErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      code: "",
      message: "",
      name: "",
      status: undefined,
    };
  }

  const record = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  };

  return {
    code: toLowerString(record.code),
    message: toLowerString(record.message),
    name: toLowerString(record.name),
    status: typeof record.status === "number" ? record.status : undefined,
  };
};

const isInvalidCredentialsError = (error: unknown) => {
  const { code, message, name } = authErrorDetails(error);

  return (
    name === "authinvalidcredentialserror" ||
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  );
};

const isServiceSideAuthError = (error: unknown) => {
  const { code, message, name, status } = authErrorDetails(error);
  const serviceErrorFragments = [
    "fetch failed",
    "failed to fetch",
    "network",
    "timeout",
    "econn",
    "enotfound",
    "service unavailable",
    "missing supabase environment",
    "supabase environment",
    "invalid api key",
    "api key",
    "jwt",
  ];

  return (
    name === "authretryablefetcherror" ||
    name === "authunknownerror" ||
    code === "unexpected_failure" ||
    code === "request_timeout" ||
    status === 0 ||
    (typeof status === "number" && status >= 500) ||
    serviceErrorFragments.some((fragment) => message.includes(fragment))
  );
};

export const getLoginErrorMessage = (error: unknown) => {
  if (isServiceSideAuthError(error)) {
    return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
  }

  if (isInvalidCredentialsError(error)) {
    return LOGIN_INVALID_CREDENTIALS_MESSAGE;
  }

  return LOGIN_UNEXPECTED_ERROR_MESSAGE;
};

export const getSignupErrorMessage = (error: unknown) => {
  if (isServiceSideAuthError(error)) {
    return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
  }

  const { message } = authErrorDetails(error);

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("weak password") ||
    message.includes("password")
  ) {
    return SIGNUP_DETAILS_ERROR_MESSAGE;
  }

  return SIGNUP_UNEXPECTED_ERROR_MESSAGE;
};
