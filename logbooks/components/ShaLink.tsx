const REPO = "https://github.com/seandonn-boston/helm/commit/";

export default function ShaLink({
  sha,
  children,
}: {
  sha: string;
  children?: React.ReactNode;
}) {
  return (
    <a className="sha-link" href={`${REPO}${sha}`}>
      {children ?? <code className="sha">{sha}</code>}
    </a>
  );
}
