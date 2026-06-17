import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadStatement } from '../api';

interface UploadAreaProps {
  onSessionCreated?: (sessionId: string) => void;
}

export function UploadArea({ onSessionCreated }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setStatus('idle');
    setErrorMessage('');
    const isCsv = selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv');
    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isCsv && !isPdf) {
      setStatus('error');
      setErrorMessage('Please upload a valid CSV or PDF file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds 10MB limit.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    try {
      const result = await uploadStatement(file);
      setStatus('success');
      if (onSessionCreated) onSessionCreated(result.session_id);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`border-2 border-dashed rounded-xl p-10 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.pdf" className="hidden" />
        <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
          {status === 'success' ? (
             <CheckCircle className="w-16 h-16 text-green-500" />
          ) : status === 'error' ? (
             <AlertCircle className="w-16 h-16 text-red-500" />
          ) : (
             <UploadCloud className={`w-16 h-16 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          )}
          <div className="text-center">
            {file ? (
              <p className="text-lg font-medium text-gray-900 flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                {file.name}
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900">Click or drag file to this area to upload</p>
                <p className="text-sm text-gray-500 mt-1">Supports standard CSV and PDF bank statements (Max 10MB)</p>
              </>
            )}
          </div>
        </div>
      </div>
      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center">{errorMessage}</div>
      )}
      <div className="mt-6 flex justify-center">
        <button 
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'success'}
          className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors
            ${!file || status === 'uploading' || status === 'success' ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}`}
        >
          {status === 'uploading' ? 'Uploading...' : 'Process Bank Statement'}
        </button>
      </div>
    </div>
  );
}
