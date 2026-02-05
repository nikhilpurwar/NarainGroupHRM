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
