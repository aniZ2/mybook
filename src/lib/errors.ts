// Centralized error handler for Firebase + generic errors

export function formatError(err: unknown): string {
  if (err instanceof Error) {
    // Firebase errors have a "code" property
    const firebaseErr = err as Error & { code?: string };

    switch (firebaseErr.code) {
      case "auth/invalid-email":
        return "The email address is invalid.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-api-key":
        return "Invalid Firebase API key configuration.";
      default:
        return firebaseErr.message;
    }
  }

  // Non-Error cases
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}
