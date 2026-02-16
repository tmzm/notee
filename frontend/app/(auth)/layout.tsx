export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <footer className="w-full text-center pb-4 text-xs text-gray-400 mt-auto">
        Made by{' '}
        <a
          href="https://tareq-mozayek-portfolio.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          Tareq Al-Mozayek
        </a>{' '}
        &copy; {currentYear}
      </footer>
    </div>
  )
}
