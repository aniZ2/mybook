export default function AuthorsLoading() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-200 rounded mt-2 animate-pulse" />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="panel animate-pulse">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-[120px] h-[120px] bg-gray-200 rounded-full" />
              <div className="w-32 h-6 bg-gray-200 rounded mt-4" />
              <div className="w-24 h-4 bg-gray-200 rounded mt-2" />
              <div className="w-full h-16 bg-gray-200 rounded mt-3" />
              <div className="w-20 h-4 bg-gray-200 rounded mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}