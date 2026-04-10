"use client";

import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";
import React from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

export function AdminBarChart({ labels, data, label }: { labels: string[]; data: number[]; label: string }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: "rgba(34,211,238,0.6)",
            borderColor: "rgba(34,211,238,1)",
            borderWidth: 1,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
          y: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
        },
      }}
    />
  );
}

export function AdminLineChart({ labels, data, label }: { labels: string[]; data: number[]; label: string }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            fill: false,
            borderColor: "rgba(34,211,238,1)",
            backgroundColor: "rgba(34,211,238,0.3)",
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
          y: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
        },
      }}
    />
  );
}

export function AdminPieChart({ labels, data, label }: { labels: string[]; data: number[]; label: string }) {
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: [
              "rgba(34,211,238,0.7)",
              "rgba(251,191,36,0.7)",
              "rgba(239,68,68,0.7)",
              "rgba(16,185,129,0.7)",
              "rgba(168,85,247,0.7)",
            ],
            borderColor: "#0f172a",
            borderWidth: 1,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { labels: { color: "#94a3b8" } },
          title: { display: false },
        },
      }}
    />
  );
}
