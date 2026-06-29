import React, { useState } from 'react';
import { Company } from '@/data/mockData';
import { companyService } from '@/services/companyService';

interface EditCompanyModalProps {
  company: Company;
  onClose: () => void;
  onUpdate: (updated: Company) => void;
}

export default function EditCompanyModal({ company, onClose, onUpdate }: EditCompanyModalProps) {
  const [companyName, setCompanyName] = useState(company.companyName);
  const [businessNumber, setBusinessNumber] = useState(company.businessNumber);
  const [location, setLocation] = useState(company.location);
  const [supportField, setSupportField] = useState(company.supportField);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await companyService.updateCompany(company.id, {
        companyName,
        businessNumber,
        location,
        supportField,
      });
      if (updated) {
        onUpdate(updated);
        onClose();
      } else {
        alert('업데이트에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm pt-16">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4 text-[var(--color-gbsa-primary)]">
          기업 정보 수정
        </h2>
        <div className="grid gap-4">
          <label className="block">
            <span className="text-gray-700">기업명</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-700">사업자등록번호</span>
            <input
              type="text"
              className={`mt-1 block w-full font-mono rounded-md border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100 ${
                businessNumber && businessNumber.replace(/\D/g, '').length !== 10 ? 'text-red-500 font-semibold border-red-300 focus:border-red-500 focus:ring-red-100' : ''
              }`}
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
            />
            {businessNumber && businessNumber.replace(/\D/g, '').length !== 10 && (
              <p className="text-xs text-red-500 mt-1">사업자등록번호는 10자리 숫자여야 합니다.</p>
            )}
          </label>
          <label className="block">
            <span className="text-gray-700">주소</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-700">지원 분야</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-[var(--color-gbsa-primary)] focus:ring-2 focus:ring-blue-100"
              value={supportField}
              onChange={(e) => setSupportField(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          <button
            className="px-4 py-2 bg-[var(--color-gbsa-primary)] text-white rounded-md hover:bg-[var(--color-gbsa-secondary)] disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
