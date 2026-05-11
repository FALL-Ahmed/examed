'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

import { Download, FileText } from 'lucide-react';

export default function PdfDownloadsPage() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.pdfDownloads()
      .then((r) => setDownloads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueUsers = new Set(downloads.map((d) => d.userId)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Téléchargements PDF</h1>
          <p className="text-sm text-muted-foreground">{downloads.length} téléchargements · {uniqueUsers} utilisateurs uniques</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : downloads.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucun téléchargement enregistré.</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {downloads.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/30 transition">
                  <td className="px-4 py-3 font-medium">{d.user?.fullName || <span className="text-muted-foreground italic">Anonyme</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.user?.email || d.ipAddress || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                      ${d.source === 'facebook' ? 'bg-blue-100 text-blue-700' :
                        d.source === 'tiktok' ? 'bg-pink-100 text-pink-700' :
                        d.source === 'app' ? 'bg-violet-100 text-violet-700' :
                        'bg-secondary text-muted-foreground'}`}>
                      {d.source || 'direct'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(d.downloadedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
