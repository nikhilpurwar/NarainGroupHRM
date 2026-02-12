// SkeletonRows.jsx
import React from "react";

// Single skeleton block
const SkeletonBlock = ({ className, style }) => (
  <div className={`skeleton bg-gray-200 animate-pulse ${className}`} style={style} />
);

// Single skeleton row with dynamic columns
const SkeletonRow = ({ coln = 4 }) => {
  const cols = Array.from({ length: coln });
  return (
    <tr className="border-b last:border-none hover:bg-gray-50">
      {cols.map((_, idx) => (
        <td key={idx} className="px-4 py-3 border-t">
          {idx === coln - 1 ? (
            // last column as action buttons
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <SkeletonBlock className="h-6 w-6 rounded-full" />
            </div>
          ) : (
            <SkeletonBlock style={{ width: 80, height: 20 }} />
          )}
        </td>
      ))}
    </tr>
  );
};

// Multiple skeleton rows
const SkeletonRows = ({ rows = 5, coln = 4 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} coln={coln} />
      ))}
    </>
  );
};

export default SkeletonRows; 
