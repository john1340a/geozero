export interface JobOffer {
  id: string;
  title: string;
  type: string;
  company?: string;
  city: string;
  department: string;
  description: string;
  link: string;
  pubDate: string;
  coordinates?: [number, number]; // [lat, lng]
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category?: string;
  "dc:creator"?: string;
}
