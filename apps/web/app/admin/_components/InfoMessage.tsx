export default function InfoMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="small">{message}</p>;
}
