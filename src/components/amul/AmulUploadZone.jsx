import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, RotateCcw, AlertCircle, CheckCircle2, Sparkles, Trash2 } from 'lucide-react';
import { parseAmulRawData } from './amulDataProcessor';

export default function AmulUploadZone({ onDataLoaded, onResetBaseline, onClearData, currentRecordCount, showToast }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      if (showToast) showToast('Please upload a valid Excel (.xlsx, .xls) or CSV file.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      
      // Allow UI to render loading state
      setTimeout(() => {
        try {
          const processed = parseAmulRawData(buffer);
          onDataLoaded(processed, file.name);
          if (showToast) {
            showToast('Successfully processed ' + processed.records.length.toLocaleString('en-IN') + ' records from ' + file.name + '!', 'success');
          }
        } catch (err) {
          console.error(err);
          if (showToast) showToast('Error processing file: ' + err.message, 'error');
        } finally {
          setIsProcessing(false);
        }
      }, 50);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error reading file: ' + err.message, 'error');
      setIsProcessing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div style={{
      background: 'var(--bg-panel, #FFFFFF)',
      border: isDragging ? '2px dashed #E31E24' : '2px dashed var(--border-color, #CBD5E1)',
      borderRadius: '16px',
      padding: '28px',
      textAlign: 'center',
      marginBottom: '24px',
      position: 'relative',
      transition: 'all 0.2s ease',
      backgroundColor: isDragging ? 'rgba(227, 30, 36, 0.04)' : 'var(--bg-panel, #FFFFFF)',
      boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05))'
    }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(227, 30, 36, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E31E24'
        }}>
          {isProcessing ? (
            <RotateCcw size={28} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <UploadCloud size={28} />
          )}
        </div>

        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
            {isProcessing ? 'Processing Raw Data...' : 'Upload Amul THR Raw Data File'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #475569)', maxWidth: '540px', lineHeight: '1.5' }}>
            Drag and drop your FarEye dispatch export (.xlsx, .csv). Supports any data volume from 15 to 50,000+ rows with auto KPI generation!
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isProcessing}
            style={{
              background: '#E31E24',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(227, 30, 36, 0.25)'
            }}
          >
            <FileSpreadsheet size={16} /> Choose File (.xlsx / .csv)
          </button>

          <button
            onClick={onResetBaseline}
            disabled={isProcessing}
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              color: 'var(--text-main, #0F172A)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reload baseline sample dataset with 1,247 records"
          >
            <Sparkles size={15} color="#0284C7" /> Load Master Baseline Data
          </button>

          {currentRecordCount > 0 && onClearData && (
            <button
              onClick={onClearData}
              disabled={isProcessing}
              style={{
                background: 'rgba(239, 68, 68, 0.06)',
                color: '#DC2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Clear loaded records and reset to blank"
            >
              <Trash2 size={15} /> Clear Data
            </button>
          )}
        </div>

        {currentRecordCount > 0 ? (
          <div style={{
            marginTop: '8px',
            fontSize: '0.82rem',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600'
          }}>
            <CheckCircle2 size={16} />
            <span>Active Dataset: <strong>{Number(currentRecordCount).toLocaleString('en-IN')} rows loaded</strong> {fileName && `(${fileName})`}</span>
          </div>
        ) : (
          <div style={{
            marginTop: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #64748B)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={15} />
            <span>By default blank data is active (0 rows). Please upload a file to begin or load baseline data.</span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
