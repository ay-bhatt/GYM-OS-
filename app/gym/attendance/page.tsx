'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  History,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  member_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  members: { member_id: string; name: string; phone: string };
}

interface ScanResult {
  member: {
    id: string;
    member_id: string;
    name: string;
    phone: string | null;
    status: string;
  };
  attendance: {
    id: string;
    check_in_time: string;
    check_out_time: string | null;
  } | null;
  alreadyCheckedIn: boolean;
}

type TabType = 'scan' | 'history';

const statusStyles: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  expiring: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
};

export default function AttendancePage() {
  const [tab, setTab] = useState<TabType>('scan');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 lg:p-8"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Attendance</h1>
        <p className="text-sm text-zinc-500">Scan QR codes to check in members.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-lg border border-zinc-200 bg-white p-1">
        <button
          onClick={() => setTab('scan')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'scan' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <QrCode className="h-4 w-4" />
          Scan
        </button>
        <button
          onClick={() => setTab('history')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <History className="h-4 w-4" />
          History
        </button>
      </div>

      {tab === 'scan' ? <ScanTab /> : <HistoryTab />}
    </motion.div>
  );
}

function ScanTab() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (processing) return;
      setProcessing(true);
      await stopScanner();

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_token: decodedText }),
        });
        const json = await res.json();
        if (!res.ok) {
          setScanError(json.error || 'Failed to check in');
          setScanResult(null);
        } else {
          setScanResult(json.data);
          setScanError('');
        }
      } catch {
        setScanError('Network error — please try again');
        setScanResult(null);
      } finally {
        setProcessing(false);
      }
    },
    [processing, stopScanner]
  );

  const startScanner = useCallback(async () => {
    setScanResult(null);
    setScanError('');
    setScanning(true);

    // Wait for DOM element to render
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(elementId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {
            // per-frame error — ignore
          }
        );
      } catch (err) {
        setScanError('Could not access camera. Please grant camera permissions.');
        setScanning(false);
      }
    }, 100);
  }, [handleScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="max-w-2xl">
      {/* Scanner area */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col items-center">
          {/* Camera container */}
          <div className="relative w-full max-w-sm">
            <div id={elementId} className="overflow-hidden rounded-xl" />

            {/* Scanning frame overlay (visible when scanning) */}
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-56 w-56">
                  <div className="absolute inset-0 rounded-xl border-2 border-sky-500/80" />
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]"
                  />
                </div>
              </div>
            )}

            {/* Placeholder when not scanning */}
            {!scanning && !scanResult && !scanError && (
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
                <QrCode className="h-12 w-12 text-zinc-300" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex gap-3">
            {!scanning ? (
              <button
                onClick={startScanner}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </button>
            )}
          </div>

          {processing && (
            <p className="mt-3 text-sm text-zinc-500">Processing check-in...</p>
          )}
        </div>
      </div>

      {/* Scan result */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`mt-4 rounded-xl border p-5 ${
              scanResult.alreadyCheckedIn
                ? 'border-amber-200 bg-amber-50'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {scanResult.alreadyCheckedIn ? (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                </motion.div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${scanResult.alreadyCheckedIn ? 'text-amber-900' : 'text-green-900'}`}>
                  {scanResult.alreadyCheckedIn ? 'Already checked in' : 'Check-in successful'}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-zinc-700">
                    <span className="font-medium">{scanResult.member.name}</span> ({scanResult.member.member_id})
                  </p>
                  <p className="text-zinc-500">
                    Status: <span className="capitalize">{scanResult.member.status}</span>
                  </p>
                  {scanResult.attendance?.check_in_time && (
                    <p className="text-zinc-500">
                      Check-in time: {new Date(scanResult.attendance.check_in_time).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan error */}
      <AnimatePresence>
        {scanError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5"
          >
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Check-in failed</p>
                <p className="mt-1 text-sm text-red-700">{scanError}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry button after result/error */}
      {(scanResult || scanError) && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              setScanResult(null);
              setScanError('');
              startScanner();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Camera className="h-4 w-4" />
            Scan Again
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const json = await res.json();
      setRecords(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(records.length / limit));
  const paginated = records.slice((page - 1) * limit, page * limit);

  return (
    <div>
      {/* Date filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <button
          onClick={() => {
            setPage(1);
            fetchHistory();
          }}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Apply
        </button>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-sm text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Member Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Member ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Check-in</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Check-out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                      No attendance records
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {r.members?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {r.members?.member_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[r.status] || statusStyles.active}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && records.length > limit && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} · {records.length} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 enabled:hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 enabled:hover:bg-zinc-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
