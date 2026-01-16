import React from 'react';
import { Doughnut } from 'react-chartjs-2';

export const PieCharts = ({ data }) => {
  if (!data || !data.departments) return null;

  const outerLabels = [];
  const outerData = [];
  const outerColors = [];

  const innerData = [];
  const innerColors = [];

  const subColors = ["#60a5fa", "#818cf8", "#fb7185", "#fb923c", "#fbbf24", "#34d399", "#22d3ee"];
  let colorIndex = 0;

  data.departments.forEach((head) => {
    head.subDepartments.forEach((sub) => {
      outerLabels.push(sub.name);
      outerData.push(sub.present);
      outerColors.push(subColors[colorIndex % subColors.length]);

      innerData.push(sub.absent);
      innerColors.push(subColors[colorIndex % subColors.length]);

      colorIndex++;
    });
  });

  const nestedSubDeptPie = {
    labels: outerLabels,
    datasets: [
      {
        label: "SubDept Present",
        data: outerData,
        backgroundColor: outerColors,
        radius: "90%",
        cutout: "60%",
      },
      {
        label: "SubDept Absent",
        data: innerData,
        backgroundColor: innerColors,
        radius: "55%",
        cutout: "45%",
      },
    ],
  };
 return (
  <div className="bg-white w-full max-w-xl p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center">
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
              labels: {
                boxWidth: 12,
                padding: 15,
                color: "#374151",
                font: {
                  size: 12,
                  weight: "500",
                },
              },
            },
            tooltip: {
              backgroundColor: "#111827",
              titleColor: "#fff",
              bodyColor: "#e5e7eb",
              padding: 10,
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label} - ${context.label}: ${context.raw}`;
                },
              },
            },
          },
          animation: {
            duration: 1000,
            easing: "easeOutQuart",
          },
          animations: {
            radius: {
              duration: 1000,
              easing: "easeOutQuart",
              from: 0,
            },
            rotation: {
              duration: 1000,
              easing: "easeOutQuart",
              from: -90,
            },
          },
        }}
      />
    </div>
  </div>
  );
};
