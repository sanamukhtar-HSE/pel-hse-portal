import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";


function SeverityChart({ data }) {

  const COLORS = [
    "#4CAF50",
    "#ff9800",
    "#E53935",
    "#8e24aa"
  ];

  return (
    <div className="chart-card">

      <h2>⚠ Severity Distribution</h2>

      <ResponsiveContainer width="100%" height={300}>

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label
          >

            {data.map((entry,index)=>(
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}

          </Pie>

          <Tooltip />

          <Legend />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
}


export default SeverityChart;