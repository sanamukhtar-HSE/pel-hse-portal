import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

function IncidentTypeChart({ data }) {
  // Sort from highest to lowest
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Highest value (to highlight in gold)
  const maxValue = Math.max(...sortedData.map((item) => item.value), 0);

  return (
    <div className="chart-card">
      <h2>📊 Incident Types</h2>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "#555", fontSize: 12 }}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fill: "#333", fontSize: 13 }}
          />

          <Tooltip
            cursor={{ fill: "#F3F4F6" }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
            }}
          />

          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.value === maxValue
                    ? "#EAA840" // Gold (highest)
                    : "#111827" // Navy
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default IncidentTypeChart;