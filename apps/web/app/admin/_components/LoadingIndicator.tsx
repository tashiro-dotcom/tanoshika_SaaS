export default function LoadingIndicator({ text = '読み込み中...' }: { text?: string }) {
  return <p className="small">{text}</p>;
}
