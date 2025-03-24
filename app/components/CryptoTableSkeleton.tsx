import React from 'react';

const CryptoTableSkeleton: React.FC = () => {
  // Create an array of 10 items to represent rows
  const skeletonRows = Array(10).fill(null);

  return (
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="grid grid-cols-5 bg-gray-50 p-4 rounded-t-lg">
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
        <div className="h-6 w-32 bg-gray-200 rounded"></div>
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
        <div className="h-6 w-28 bg-gray-200 rounded"></div>
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
      </div>

      {/* Table body skeleton */}
      <div className="divide-y divide-gray-100">
        {skeletonRows.map((_, index) => (
          <div key={index} className="grid grid-cols-5 p-4 items-center">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTableSkeleton;
