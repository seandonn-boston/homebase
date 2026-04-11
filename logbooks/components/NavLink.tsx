import Link from "next/link";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="nav-link">
      {children}
    </Link>
  );
}
