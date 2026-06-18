import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Task, Habit } from '../types';
import { subDays, format } from 'date-fns';

interface ProductivityChartProps {
  tasks: Task[];
  habits: Habit[];
}

export function ProductivityChart({ tasks, habits }: ProductivityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Clear previous
    d3.select(chartRef.current).selectAll('*').remove();

    // Prepare data
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        dateStr: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE'), // Mon, Tue...
        tasksDone: 0,
        habitsDone: 0,
      };
    });

    tasks.forEach(t => {
      if (t.status === 'done') {
        const dStr = t.due_date; // Assuming completed around due date for simplicity
        const day = last7Days.find(d => d.dateStr === dStr);
        if (day) day.tasksDone++;
      }
    });

    habits.forEach(h => {
      h.completedDates.forEach(dateStr => {
        const day = last7Days.find(d => d.dateStr === dateStr);
        if (day) day.habitsDone++;
      });
    });

    const margin = { top: 20, right: 0, bottom: 30, left: 30 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(last7Days.map(d => d.label))
      .range([0, width])
      .padding(0.3);

    const maxY = d3.max(last7Days, d => Math.max(d.tasksDone, d.habitsDone)) || 5;
    const y = d3.scaleLinear()
      .domain([0, maxY + 1]) // Add some padding on top
      .range([height, 0]);

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .select(".domain").remove();
      
    svg.selectAll(".tick text")
       .attr("fill", "#64748b")
       .style("font-family", "JetBrains Mono");

    // Y Axis (Gridlines)
    const yAxis = d3.axisLeft(y).ticks(4).tickSize(-width).tickPadding(10);
    const gy = svg.append("g")
      .call(yAxis);
      
    gy.select(".domain").remove();
    gy.selectAll(".tick text")
       .attr("fill", "#64748b")
       .style("font-family", "JetBrains Mono");
    gy.selectAll(".tick line")
      .attr("stroke", "rgba(255, 255, 255, 0.05)");

    // Animation transition
    const t = svg.transition().duration(750);

    // Bars: Habits
    svg.selectAll(".bar-habit")
      .data(last7Days)
      .enter()
      .append("rect")
      .attr("class", "bar-habit")
      .attr("x", d => x(d.label)! + 2)
      .attr("width", x.bandwidth() / 2 - 2)
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#75d36e")
      .attr("rx", 3)
      .transition(t as any)
      .attr("y", d => y(d.habitsDone))
      .attr("height", d => height - y(d.habitsDone));

    // Bars: Tasks
    svg.selectAll(".bar-task")
      .data(last7Days)
      .enter()
      .append("rect")
      .attr("class", "bar-task")
      .attr("x", d => x(d.label)! + x.bandwidth() / 2)
      .attr("width", x.bandwidth() / 2 - 2)
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#3b82f6")
      .attr("rx", 3)
      .transition(t as any)
      .attr("y", d => y(d.tasksDone))
      .attr("height", d => height - y(d.tasksDone));

  }, [tasks, habits]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <div className="w-3 h-3 rounded-sm bg-[#75d36e]"></div> Nawyk (Habit)
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <div className="w-3 h-3 rounded-sm bg-blue-500"></div> Zadanie (Task)
        </div>
      </div>
      <div ref={chartRef} className="w-full h-[240px] relative" />
    </div>
  );
}
