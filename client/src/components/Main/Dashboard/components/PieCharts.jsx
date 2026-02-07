import React from "react";
import { Doughnut } from "react-chartjs-2";

export const PieCharts = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white w-full max-w-xl p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
        <div className="w-48 h-6 bg-gray-200 rounded mb-5 animate-pulse"></div>

        <div className="relative w-full h-72 md:h-80 flex items-center justify-center">
          {/* Simple spinning ring */}
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 rounded-full animate-spin"></div>
            <div className="absolute inset-8 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-sm">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.departments) return null;

  const outerLabels = [];
  const outerData = [];
  const outerColors = [];

  const innerData = [];
  const innerColors = [];

  const subColors = [
    "#af52bf",
    "#818cf8",
    "#fb7185",
    "#fb923c",
    "#fbbf24",
    "#34d399",
    "#22d3ee",
    "#8bc34a",
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

  const outerTotal = outerData.reduce((a, b) => a + b, 0);

  const finalOuterData = outerTotal === 0 ? [1] : outerData;
  const finalOuterColors = outerTotal === 0 ? ["#e5e7eb"] : outerColors;
  const finalOuterLabels = outerTotal === 0 ? ["No Data"] : outerLabels;

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
    <div className="bg-white w-full max-w-xl p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
      <h2 className="text-base md:text-lg font-semibold text-gray-700 tracking-wide mb-5">
        Sub-Department Attendance
      </h2>

      <div className="relative w-full h-72 md:h-80 flex items-center justify-center">
        <Doughnut
          data={nestedSubDeptPie}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  boxWidth: 10,
                  boxHeight: 10,
                  usePointStyle: true,
                  pointStyle: "circle",
                },
              },
              tooltip: {
                enabled: outerTotal !== 0,
              },
            },
            animation: {
              duration: 900,
              easing: "easeOutQuart",
            },
          }}
        />

        {outerTotal === 0 && (
          <div className="absolute text-gray-400 text-sm font-medium tracking-wide">
            No Attendance Data
          </div>
        )}
      </div>
    </div>
  );
};
