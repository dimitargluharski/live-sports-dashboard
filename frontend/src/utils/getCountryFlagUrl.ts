import { COUNTRY_CODES } from '../constants/countries';

export function getCountryFlagUrl(country: string | null): string | null {
  const code = country ? COUNTRY_CODES[country] : null;
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}
