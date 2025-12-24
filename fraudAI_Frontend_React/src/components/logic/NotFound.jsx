import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white-900 text-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Page not found</h1>
        <p className="mb-6 text-gray-400">The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-md">Go to Home</Link>
      </div>
    </div>
  )
}
