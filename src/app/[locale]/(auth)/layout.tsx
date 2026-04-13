export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#060D18] flex">
      {children}
    </div>
  );
}
