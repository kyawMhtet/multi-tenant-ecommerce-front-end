export function ErrorState({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}
