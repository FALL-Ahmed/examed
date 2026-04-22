'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import {
  CheckCircle, XCircle, Clock, Loader2, FileImage,
  X, ExternalLink, CreditCard, User, Calendar, MessageSquare,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

function ReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <span className="font-semibold text-sm text-slate-700">Reçu de paiement</span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium transition text-slate-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir dans un onglet
            </a>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full hover:bg-slate-200 flex items-center justify-center transition text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-6">
          {isPdf ? (
            <iframe src={url} className="w-full h-[70vh] rounded-xl border shadow" title="Reçu PDF" />
          ) : (
            <img
              src={url}
              alt="Reçu"
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}

const OPERATOR_COLORS: Record<string, string> = {
  BANKILY: 'bg-green-100 text-green-700 border-green-200',
  MASRIVI: 'bg-blue-100 text-blue-700 border-blue-200',
  SEDAD:   'bg-purple-100 text-purple-700 border-purple-200',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await adminApi.pendingPayments();
    setPayments(data);
    setLoading(false);
  }

  async function validate(id: string) {
    setProcessing(id);
    await adminApi.validatePayment(id).catch(() => {});
    await load();
    setProcessing(null);
  }

  async function reject(id: string) {
    const reason = prompt('Raison du rejet (optionnel)');
    if (reason === null) return;
    setProcessing(id);
    await adminApi.rejectPayment(id, reason).catch(() => {});
    await load();
    setProcessing(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements en attente</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {payments.length === 0
              ? 'Aucun paiement à traiter'
              : `${payments.length} paiement${payments.length > 1 ? 's' : ''} à valider`}
          </p>
        </div>
        {payments.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{payments.length} en attente</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="font-semibold text-slate-700">Tout est à jour !</p>
          <p className="text-sm text-slate-400 mt-1">Aucun paiement en attente de validation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p: any) => {
            const receiptUrl = p.receiptUrl
              ? (p.receiptUrl.startsWith('http') ? p.receiptUrl : `${API_URL}${p.receiptUrl}`)
              : null;
            const isImage = receiptUrl && !receiptUrl.toLowerCase().endsWith('.pdf');
            const opColor = OPERATOR_COLORS[p.operator] ?? 'bg-slate-100 text-slate-600 border-slate-200';

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

                <div className="p-6 flex flex-col lg:flex-row gap-6">

                  {/* Receipt */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    {receiptUrl ? (
                      <button
                        onClick={() => setPreviewUrl(receiptUrl)}
                        className="group relative w-28 h-28 rounded-xl overflow-hidden border-2 border-slate-100 hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
                      >
                        {isImage ? (
                          <img
                            src={receiptUrl}
                            alt="Reçu"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-1">
                            <FileImage className="w-8 h-8 text-red-400" />
                            <span className="text-xs text-red-400 font-bold">PDF</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                        <FileImage className="w-8 h-8 text-slate-300" />
                        <span className="text-xs text-slate-400">Pas de reçu</span>
                      </div>
                    )}
                    {receiptUrl && (
                      <span className="text-[11px] text-slate-400 font-medium">Cliquer pour voir</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-3">

                    {/* Amount + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-black text-slate-900">{p.amount} MRU</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                        En attente
                      </span>
                      {p.operator && (
                        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${opColor}`}>
                          {p.operator}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                        Mobile Money
                      </span>
                    </div>

                    {/* User info */}
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.user.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{p.user.fullName}</p>
                        <p className="text-slate-500 text-xs">{p.user.email}</p>
                        {p.user.phone && <p className="text-slate-400 text-xs">{p.user.phone}</p>}
                      </div>
                    </div>

                    {/* Group invites */}
                    {p.planType === 'GROUP' && p.groupInvites?.length > 0 && (
                      <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                        <p className="text-xs font-bold text-violet-700 mb-2">
                          Membres invités ({p.groupInvites.filter((i: any) => i.isUsed).length}/{p.groupInvites.length} inscrits)
                        </p>
                        <div className="space-y-1">
                          {p.groupInvites.map((inv: any) => (
                            <div key={inv.email} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.isUsed ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                              <span className="text-xs text-violet-800 font-mono">{inv.email}</span>
                              {inv.isUsed && <span className="text-xs text-emerald-600 font-semibold">✓ inscrit</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {p.notes && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">{p.notes}</p>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Soumis le {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-3 flex-shrink-0 items-center lg:items-stretch lg:justify-center">
                    <button
                      onClick={() => validate(p.id)}
                      disabled={!!processing}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm hover:shadow-md shadow-emerald-100"
                    >
                      {processing === p.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle className="w-4 h-4" />}
                      Valider
                    </button>
                    <button
                      onClick={() => reject(p.id)}
                      disabled={!!processing}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && <ReceiptModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
