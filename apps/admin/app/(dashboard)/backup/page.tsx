'use client';

import { useState, useRef } from 'react';
import { backupApi, adminApi } from '../../../lib/api';
import { Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface BackupData {
  settings?: Array<{ key: string; value: string }>;
  exportedAt?: string;
  version?: string;
}

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupPreview, setBackupPreview] = useState<BackupData | null>(null);
  const [backupFileName, setBackupFileName] = useState('');

  const lastBackupDate =
    typeof window !== 'undefined' ? localStorage.getItem('lastBackupDate') : null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await backupApi.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const now = new Date().toLocaleString();
      localStorage.setItem('lastBackupDate', now);
      toast.success('Backup downloaded successfully!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to export backup');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid .json backup file');
      return;
    }
    setBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed: BackupData = JSON.parse(ev.target?.result as string);
        setBackupPreview(parsed);
      } catch {
        toast.error('Invalid backup file. Could not parse JSON.');
        setBackupPreview(null);
        setBackupFileName('');
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!backupPreview?.settings?.length) {
      toast.error('No settings found in the backup file');
      return;
    }
    if (!confirm('This will overwrite current settings. Are you sure?')) return;

    setRestoring(true);
    let successCount = 0;
    let errorCount = 0;

    for (const setting of backupPreview.settings) {
      try {
        await adminApi.updateSetting(setting.key, setting.value);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setRestoring(false);
    if (errorCount === 0) {
      toast.success(`Restored ${successCount} settings successfully!`);
    } else {
      toast.error(`Restored ${successCount} settings, ${errorCount} failed.`);
    }

    setBackupPreview(null);
    setBackupFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
        <p className="text-gray-500 mt-1">Export your app data or restore from a previous backup</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Backup */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Download Backup</h2>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Export a full backup of your app configuration as a JSON file.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What&apos;s included
            </p>
            <ul className="space-y-1.5">
              {['Settings', 'Banners', 'Categories', 'Active Coupons'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {lastBackupDate && (
            <p className="text-xs text-gray-400 mb-4">Last backup: {lastBackupDate}</p>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 w-full justify-center"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Exporting...' : 'Download Backup'}
          </button>
        </div>

        {/* Restore from Backup */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Restore from Backup</h2>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 font-medium">
              This will overwrite current settings with the data from the backup file.
            </p>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 mb-4 cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Database className="w-8 h-8 text-gray-300" />
            {backupFileName ? (
              <p className="text-sm font-semibold text-primary">{backupFileName}</p>
            ) : (
              <p className="text-sm text-gray-400">Click to select a .json backup file</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            aria-label="Select backup file"
            onChange={handleFileSelect}
          />

          {backupPreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">Preview</p>
              <ul className="text-xs text-blue-700 space-y-1">
                {backupPreview.exportedAt && (
                  <li>Exported: {new Date(backupPreview.exportedAt).toLocaleString()}</li>
                )}
                {backupPreview.version && <li>Version: {backupPreview.version}</li>}
                {backupPreview.settings && (
                  <li>{backupPreview.settings.length} settings will be restored</li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring || !backupPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            {restoring ? 'Restoring...' : 'Restore Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
