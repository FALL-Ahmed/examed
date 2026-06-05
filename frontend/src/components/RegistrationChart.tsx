'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function RegistrationChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !data.length) {
    return <div className="h-72 bg-secondary rounded-lg animate-pulse" />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: any, name: string) => [value, name === 'count' ? 'Inscrits/jour' : 'Cumulatif']}
          labelFormatter={(l) => `📅 ${l}`}
        />
        <Legend formatter={(v) => v === 'count' ? 'Inscrits/jour' : 'Cumulatif'} />
        <Bar yAxisId="left" dataKey="count" name="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Line yAxisId="right" type="monotone" dataKey="cumul" name="cumul" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
