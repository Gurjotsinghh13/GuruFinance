const MIN_SECRET_LENGTH = 32;

export function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`
    );
  }

  return new TextEncoder().encode(secret);
}
