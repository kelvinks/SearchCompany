/**
 * 사업자등록번호를 XXX-XX-XXXXXX 형식으로 포맷합니다.
 * 이미 하이픈이 포함된 값도 정상 처리합니다.
 *
 * 예) "1234567890"   → "123-45-67890"
 *     "123-45-67890" → "123-45-67890"
 *     "12345-678-90" → "123-45-67890"
 */
export function formatBusinessNumber(value: string): string {
  if (!value) return '';
  // 숫자 이외 모든 문자(하이픈 포함)를 제거한 뒤 재포맷
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return value;
}

/**
 * 주소 문자열에서 시/군 토큰을 추출합니다.
 * 예) "경기도 성남시 분당구 판교로 1" → "성남시"
 *     "경기도 양평군 양평읍" → "양평군"
 *     "서울특별시 강남구 ..." → "서울특별시"
 */
export function extractSiGun(address: string): string {
  if (!address || !address.trim()) return '';
  const tokens = address.trim().split(/\s+/);
  const sidoSuffixes = ['특별시', '광역시', '특별자치시', '특별자치도'];
  for (const token of tokens) {
    const isSido = sidoSuffixes.some((s) => token.endsWith(s));
    if (!isSido && (token.endsWith('시') || token.endsWith('군'))) {
      return token;
    }
  }
  for (const token of tokens) {
    if (token.endsWith('시') || token.endsWith('군')) return token;
  }
  return tokens[0] || '';
}
