export const DEFAULT_WELCOME_SUBJECT = "Welcome to Opportunities"
export const DEFAULT_RESET_SUBJECT = "Your Opportunities password has been reset"

const CREDENTIAL_INSTRUCTIONS = [
  "Sign in: {{loginUrl}}",
  "Email (username): {{email}}",
  "Temporary password: {{password}}",
  "",
  "Sign in within 48 hours. You will be asked to choose a new password before opening the portal.",
].join("\n")

export const DEFAULT_WELCOME_BODY = "Your Opportunities account has been created.\n\n" + CREDENTIAL_INSTRUCTIONS
export const DEFAULT_RESET_BODY = "An administrator reset your Opportunities password.\n\n" + CREDENTIAL_INSTRUCTIONS
