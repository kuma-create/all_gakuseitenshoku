export default function ChatListLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32 mt-4 md:mt-0"></div>
      </div>

      <div className="mb-6">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>

      <div className="h-10 bg-gray-200 rounded w-64 mb-6"></div>

      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  )
}
