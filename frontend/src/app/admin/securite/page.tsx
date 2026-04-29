'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import {
  Globe, AlertTriangle, Users, ShieldCheck, ChevronDown, ChevronUp,
  RefreshCw, MapPin, ExternalLink, Monitor, Smartphone, Clock,
} from 'lucide-react';
import type { MapMarker } from './MapView';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-2xl text-muted-foreground text-sm">
    Chargement de la carte…
  </div>
)});

type Geo = { country: string; city: string; countryCode: string; lat?: number; lon?: number } | null;

type Session = {
  id: string;
  ipAddress: string;
  isPrivate: boolean;
  geo: Geo;
  deviceInfo: string;
  createdAt: string;
  lastActive: string;
  isActive: boolean;
};

type UserRow = {
  userId: string;
  fullName: string;
  email: string;
  uniqueDeviceCount: number;
  uniqueIpCount: number;
  suspicious: boolean;
  sessionCount: number;
  lastActive: string;
  uniqueIpList: { ip: string; isPrivate: boolean; geo: Geo }[];
  recentSessions: Session[];
};

type Data = { total: number; suspicious: number; users: UserRow[] };

function flag(cc?: string) {
  if (!cc || cc.length !== 2) return '🌍';
  return [...cc.toUpperCase()].map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

function parseUA(ua: string) {
  if (!ua) return { icon: Monitor, label: 'Inconnu' };
  if (ua.includes('iPhone') || ua.includes('iPad')) return { icon: Smartphone, label: 'iOS' };
  if (ua.includes('Android')) return { icon: Smartphone, label: 'Android' };
  if (ua.includes('Windows')) return { icon: Monitor, label: 'Windows' };
  if (ua.includes('Mac')) return { icon: Monitor, label: 'macOS' };
  if (ua.includes('Linux')) return { icon: Monitor, label: 'Linux' };
  return { icon: Monitor, label: ua.slice(0, 25) };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function IpBadge({ ip, geo }: { ip: string; geo: Geo }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm">
      <span className="text-lg leading-none">{flag(geo?.countryCode)}</span>
      <span className="font-mono font-semibold text-foreground">{ip}</span>
      {geo ? (
        <span className="text-xs text-muted-foreground border-l border-border pl-2">
          {geo.city}, {geo.country}
        </span>
      ) : (
        <span className="text-xs text-amber-500 border-l border-border pl-2">réseau opérateur</span>
      )}
    </div>
  );
}

function SuspectCard({ u, expanded, onToggle }: {
  u: UserRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-500/40 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-red-50/50 dark:hover:bg-red-500/5 transition"
      >
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground">{u.fullName}</p>
            <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {u.uniqueDeviceCount} appareils différents
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{u.email}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {u.uniqueIpList.slice(0, 3).map(({ ip, geo }) => (
              <span key={ip} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{flag(geo?.countryCode)}</span>
                <span className="font-mono">{ip}</span>
                {geo && <span className="text-muted-foreground/60">· {geo.city}</span>}
              </span>
            ))}
            {u.uniqueIpList.length > 3 && (
              <span className="text-xs text-muted-foreground">+{u.uniqueIpList.length - 3} autres</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href={`/admin/users/${u.userId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4 mb-3">
            Toutes les IP ({u.uniqueIpList.length})
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {u.uniqueIpList.map(({ ip, geo, isPrivate }) => (
              <IpBadge key={ip} ip={ip} geo={geo} />
            ))}
          </div>

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Historique des connexions
          </p>
          <div className="space-y-2">
            {u.recentSessions.map((s) => {
              const ua = parseUA(s.deviceInfo);
              const Icon = ua.icon;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border text-sm">
                  <span className="text-lg leading-none flex-shrink-0">{s.isPrivate ? '📡' : flag(s.geo?.countryCode)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-foreground text-xs">{s.ipAddress || '—'}</span>
                      {s.geo && <span className="text-xs text-muted-foreground">{s.geo.city}, {s.geo.country}</span>}
                      {s.isPrivate && <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">réseau opérateur (CGNAT)</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{ua.label}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{timeAgo(s.lastActive)}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {s.isActive
                      ? <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">Actif</span>
                      : <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">Expiré</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecuritePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'suspicious'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    adminApi.sessions()
      .then((r) => { setData(r.data); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 10 * 60 * 1000); // auto-refresh toutes les 10 min
    return () => clearInterval(id);
  }, [load]);

  const suspects = data?.users.filter((u) => u.suspicious) ?? [];
  const rows = data
    ? (filter === 'suspicious' ? suspects : data.users)
    : [];

  const mapMarkers: MapMarker[] = (data?.users ?? []).flatMap((u) =>
    u.uniqueIpList
      .filter((ip) => !ip.isPrivate && ip.geo?.lat && ip.geo?.lon)
      .map((ip) => ({
        lat: ip.geo!.lat!,
        lon: ip.geo!.lon!,
        label: u.fullName,
        email: u.email,
        ip: ip.ip,
        city: ip.geo!.city,
        country: ip.geo!.country,
        suspicious: u.suspicious,
        deviceCount: u.uniqueDeviceCount,
      }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sécurité — Sessions IP</h1>
            <p className="text-muted-foreground text-sm">Détection de partage de compte</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card text-muted-foreground hover:bg-muted transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Alerte rouge si suspects */}
      {!loading && suspects.length > 0 && (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-400">
              {suspects.length} compte{suspects.length > 1 ? 's' : ''} suspect{suspects.length > 1 ? 's' : ''} détecté{suspects.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-0.5">
              Ces utilisateurs se sont connectés depuis plus de 3 adresses IP différentes — partage de compte probable.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Utilisateurs suivis</p>
            </div>
            <p className="text-3xl font-black text-foreground">{data.total}</p>
          </div>
          <div className={`bg-card border rounded-2xl p-5 ${data.suspicious > 0 ? 'border-red-200 dark:border-red-500/30' : 'border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${data.suspicious > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground">Comptes suspects</p>
            </div>
            <p className={`text-3xl font-black ${data.suspicious > 0 ? 'text-red-500' : 'text-foreground'}`}>{data.suspicious}</p>
            <p className="text-xs text-muted-foreground mt-1">plus de 3 IP différentes</p>
          </div>
          <div className="bg-card border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Comptes normaux</p>
            </div>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{data.total - data.suspicious}</p>
          </div>
        </div>
      )}

      {/* Carte interactive */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <p className="font-semibold text-foreground text-sm">Carte des connexions</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Suspect
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Normal
            </span>
            {mapMarkers.length === 0 && !loading && (
              <span className="text-amber-500">Aucune IP publique géolocalisable</span>
            )}
          </div>
        </div>
        <div className="h-96">
          {!loading && <MapView markers={mapMarkers} />}
          {loading && (
            <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
              Chargement…
            </div>
          )}
        </div>
      </div>

      {/* Section suspects en cartes */}
      {!loading && suspects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-bold text-foreground">Comptes suspects</h2>
          </div>
          {suspects.map((u) => (
            <SuspectCard
              key={u.userId}
              u={u}
              expanded={expanded === u.userId}
              onToggle={() => setExpanded(expanded === u.userId ? null : u.userId)}
            />
          ))}
        </div>
      )}

      {/* Filtre + tableau complet */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-semibold text-foreground text-sm">Tous les comptes</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition
                ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}`}
            >
              Tous ({data?.total ?? 0})
            </button>
            <button
              onClick={() => setFilter('suspicious')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border transition
                ${filter === 'suspicious' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}`}
            >
              <AlertTriangle className="w-3 h-3" /> Suspects ({suspects.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            Chargement + géolocalisation des IP…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ShieldCheck className="w-10 h-10 opacity-30" />
            <p>Aucun compte à afficher</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider bg-muted/30">
                  <th className="text-left px-4 py-3">Utilisateur</th>
                  <th className="text-left px-4 py-3">Dernière IP</th>
                  <th className="text-right px-4 py-3">Appareils</th>
                  <th className="text-right px-4 py-3">Sessions</th>
                  <th className="text-right px-4 py-3">Dernière activité</th>
                  <th className="text-center px-4 py-3">Statut</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => (
                  <>
                    <tr
                      key={u.userId}
                      className={`hover:bg-muted/40 transition cursor-pointer ${u.suspicious ? 'bg-red-50/30 dark:bg-red-500/5' : ''}`}
                      onClick={() => setExpanded(expanded === u.userId ? null : u.userId)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {u.recentSessions[0] ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-base leading-none">{u.recentSessions[0].isPrivate ? '📡' : flag(u.recentSessions[0].geo?.countryCode)}</span>
                            <span className="font-mono text-foreground">{u.recentSessions[0].ipAddress}</span>
                            {u.recentSessions[0].geo && <span className="text-muted-foreground">· {u.recentSessions[0].geo.city}</span>}
                            {u.recentSessions[0].isPrivate && <span className="text-amber-500">CGNAT</span>}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-lg font-black ${
                            u.uniqueDeviceCount > 2 ? 'text-red-500'
                            : u.uniqueDeviceCount > 1 ? 'text-amber-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {u.uniqueDeviceCount}
                          </span>
                          <span className="text-xs text-muted-foreground">{u.uniqueIpCount} IP</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.sessionCount}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{timeAgo(u.lastActive)}</td>
                      <td className="px-4 py-3 text-center">
                        {u.suspicious ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Suspect
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/admin/users/${u.userId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {expanded === u.userId
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </td>
                    </tr>

                    {expanded === u.userId && (
                      <tr key={`${u.userId}-detail`}>
                        <td colSpan={7} className="px-4 pb-4 bg-muted/10">
                          <div className="mt-3 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Toutes les adresses IP ({u.uniqueIpList.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {u.uniqueIpList.map(({ ip, geo }) => (
                                  <IpBadge key={ip} ip={ip} geo={geo} />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Dernières sessions
                              </p>
                              <div className="rounded-xl border border-border overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 text-muted-foreground uppercase tracking-wider">
                                      <th className="text-left px-3 py-2">IP · Localisation</th>
                                      <th className="text-left px-3 py-2">Appareil</th>
                                      <th className="text-right px-3 py-2">Connecté le</th>
                                      <th className="text-right px-3 py-2">Activité</th>
                                      <th className="text-center px-3 py-2">État</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border bg-card">
                                    {u.recentSessions.map((s) => {
                                      const ua = parseUA(s.deviceInfo);
                                      const Icon = ua.icon;
                                      return (
                                        <tr key={s.id}>
                                          <td className="px-3 py-2">
                                            <span className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-base leading-none">{s.isPrivate ? '📡' : flag(s.geo?.countryCode)}</span>
                                              <span className="font-mono font-semibold text-foreground">{s.ipAddress || '—'}</span>
                                              {s.geo && <span className="text-muted-foreground">{s.geo.city}, {s.geo.country}</span>}
                                              {s.isPrivate && <span className="text-amber-500 text-xs bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">CGNAT</span>}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                              <Icon className="w-3 h-3" /> {ua.label}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-right text-muted-foreground">
                                            {new Date(s.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                          </td>
                                          <td className="px-3 py-2 text-right text-muted-foreground">{timeAgo(s.lastActive)}</td>
                                          <td className="px-3 py-2 text-center">
                                            {s.isActive
                                              ? <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 font-bold px-2 py-0.5 rounded-full">Actif</span>
                                              : <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Expiré</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
