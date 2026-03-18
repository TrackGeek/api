import axios from "axios";
import type { ClientIpType } from "../decorators/client-ip.decorator";
import { DEFAULT_CURRENCY } from "../constants/payment";

export function formatValue(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100);
}

export async function getUserCurrency(clientIp?: ClientIpType) {
  // if (!clientIp || !clientIp?.isLocal) return DEFAULT_CURRENCY;

  // return axios
  //   .get(`https://ipapi.co/${clientIp.address}/json/`)
  //   .then((response) =>
  //     response.data ? String(response.data?.currency ?? DEFAULT_CURRENCY).toLowerCase() : DEFAULT_CURRENCY,
  //   )
  //   .catch(() => DEFAULT_CURRENCY);
  
  return 'brl'
}
