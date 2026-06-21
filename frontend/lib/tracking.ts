/** Carrier list and tracking URL builder */

export interface Carrier {
  name: string;
  trackingUrl: (trackingNumber: string) => string;
}

export const CARRIERS: Carrier[] = [
  {
    name: "FedEx",
    trackingUrl: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  },
  {
    name: "DHL",
    trackingUrl: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
  },
  {
    name: "USPS",
    trackingUrl: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  },
  {
    name: "UPS",
    trackingUrl: (n) => `https://www.ups.com/track?tracknum=${n}`,
  },
  {
    name: "SF-Express",
    trackingUrl: (n) => `https://www.sf-express.com/we/ewaybill/enquiry?trackingNumber=${n}`,
  },
  {
    name: "Amazon Logistics",
    trackingUrl: (n) => `https://track.amazon.com/tracking/${n}`,
  },
  {
    name: "YunExpress",
    trackingUrl: (n) => `https://www.yuntrack.com/Track/Detail/${n}`,
  },
  {
    name: "4PX",
    trackingUrl: (n) => `https://track.4px.com/#/result/0/${n}`,
  },
  {
    name: "Yanwen",
    trackingUrl: (n) => `https://track.yw56.com.cn/en-US/${n}`,
  },
  {
    name: "Cainiao",
    trackingUrl: (n) => `https://global.cainiao.com/detail.htm?mailNoList=${n}`,
  },
  {
    name: "Other",
    trackingUrl: () => "",
  },
];

export const CARRIER_NAMES = CARRIERS.map((c) => c.name);

export function getTrackingUrl(
  carrier: string,
  trackingNumber: string
): string | null {
  const c = CARRIERS.find(
    (c) => c.name.toLowerCase() === carrier.toLowerCase()
  );
  if (!c) return null;
  const url = c.trackingUrl(trackingNumber);
  return url || null;
}
