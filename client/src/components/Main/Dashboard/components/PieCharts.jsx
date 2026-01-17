import React from "react";
import { Doughnut } from "react-chartjs-2";

export const PieCharts = ({ data }) => {
  if (!data || !data.departments) return null;

  const outerLabels = [];
  const outerData = [];
  const outerColors = [];

  const innerData = [];
  const innerColors = [];

  const subColors = [
    "#60a5fa",
    "#818cf8",
    "#fb7185",
    "#fb923c",
    "#fbbf24",
    "#34d399",
    "#22d3ee",
  ];

  let colorIndex = 0;

  data.departments.forEach((head) => {
    head.subDepartments.forEach((sub) => {
      outerLabels.push(sub.name);
      outerData.push(sub.present || 0);
      innerData.push(sub.absent || 0);

      const color = subColors[colorIndex % subColors.length];
      outerColors.push(color);
      innerColors.push(color);

      colorIndex++;
    });
  });

  // ✅ CHECK IF OUTER PIE HAS DATA
  const outerTotal = outerData.reduce((a, b) => a + b, 0);

  const finalOuterData =
    outerTotal === 0 ? [1] : outerData;

  const finalOuterColors =
    outerTotal === 0
      ? ["#e5e7eb"] // gray
      : outerColors;

  const finalOuterLabels =
    outerTotal === 0 ? ["No Data"] : outerLabels;

  const nestedSubDeptPie = {
    labels: finalOuterLabels,
    datasets: [
      {
        label: "SubDept Present",
        data: finalOuterData,
        backgroundColor: finalOuterColors,
        radius: "90%",
        cutout: "60%",
      },
      {
        label: "SubDept Absent",
        data: outerTotal === 0 ? [] : innerData,
        backgroundColor: innerColors,
        radius: "55%",
        cutout: "45%",
      },
    ],
  };

  return (
    <div className="bg-white w-full max-w-xl p-6 rounded-xl shadow-md border border-gray-100 flex flex-col items-center">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">
        Sub-Department Attendance
      </h2>

      <div className="relative w-full h-80 flex items-center justify-center">
        <Doughnut
          data={nestedSubDeptPie}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
              },
              tooltip: {
                enabled: outerTotal !== 0,
              },
            },
            animation: {
              duration: 1000,
              easing: "easeOutQuart",
            },
          }}
        />

        {/* CENTER TEXT WHEN EMPTY */}
        {outerTotal === 0 && (
          <div className="absolute text-gray-400 text-sm font-medium">
            No Attendance Data
          </div>
        )}
      </div>
    </div>
  );
};
