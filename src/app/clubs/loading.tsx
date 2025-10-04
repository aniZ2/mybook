export default function ClubsLoading() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="panel overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-200" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-16 bg-gray-200 rounded mb-4" />
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}