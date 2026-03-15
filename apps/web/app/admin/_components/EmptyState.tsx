type EmptyStateProps = {
  message: string;
  colSpan?: number;
};

export default function EmptyState({ message, colSpan }: EmptyStateProps) {
  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="small">
          {message}
        </td>
      </tr>
    );
  }

  return <p className="small">{message}</p>;
}
