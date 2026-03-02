export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith('replace-this-')) {
    throw new Error(`${name} is required`);
  }
  return value;
}
