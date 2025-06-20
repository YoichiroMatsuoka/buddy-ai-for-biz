import ProtectedRoute from '@/components/ProtectedRoute'

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}