import React from 'react';
import { formatBusinessNumber } from '@/utils/format';

interface BusinessNumberProps {
  value: string;
  className?: string;
}

export default function BusinessNumber({ value, className = "" }: BusinessNumberProps) {
  if (!value) return null;

  const digits = value.replace(/\D/g, '');
  const isValid = digits.length === 10;

  if (isValid) {
    return <span className={className}>{formatBusinessNumber(value)}</span>;
  } else {
    return (
      <span className={`text-red-500 font-semibold ${className}`} title="사업자등록번호는 10자리여야 합니다.">
        {value}
      </span>
    );
  }
}
