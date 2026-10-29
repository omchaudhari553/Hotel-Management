import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OrderLocationInfo {
  id?: string;
  orderNumber?: string;
  customer?: string;
  customerName?: string;
  address?: string;
  assignedRider?: string | null;
  staffName?: string | null;
  status?: string;
  storePos?: { lat: number; lng: number } | null;
  custPos?: { lat: number; lng: number } | null;
  branchName?: string;
  branchCode?: string;
}

interface DeliveryInteractiveMapProps {
  order?: OrderLocationInfo | null;
  branch?: {
    id?: number;
    name?: string;
    code?: string;
    address?: string;
  } | null;
  height?: string;
  isLive?: boolean;
}

// Fallback known coordinates for cities/branches
const getBranchBaseCoords = (branchName?: string, branchCode?: string, address?: string): [number, number] => {
  const text = `${branchName || ''} ${branchCode || ''} ${address || ''}`.toLowerCase();
  if (text.includes('nashik') || text.includes('nsk') || text.includes('nas')) {
    if (text.includes('trimbak')) return [19.9325, 73.5308];
    return [19.9975, 73.7898];
  }
  if (text.includes('mumbai') || text.includes('andheri') || text.includes('bandra') || text.includes('mum')) {
    return [19.0760, 72.8777];
  }
  if (text.includes('karve')) {
    return [18.4900, 73.8180];
  }
  // Default: Pune Main Branch
  return [18.5204, 73.8567];
};

const getCustomerCoords = (
  order?: OrderLocationInfo | null,
  storeCoords: [number, number] = [18.5204, 73.8567]
): [number, number] => {
  if (order?.custPos?.lat && order?.custPos?.lng) {
    return [order.custPos.lat, order.custPos.lng];
  }
  const addr = (order?.address || '').toLowerCase();
  if (addr.includes('andheri')) return [19.1136, 72.8697];
  if (addr.includes('bandra')) return [19.0596, 72.8295];
  if (addr.includes('kothrud')) return [18.5074, 73.8077];
  if (addr.includes('viman nagar')) return [18.5679, 73.9143];
  if (addr.includes('panchavati')) return [20.0090, 73.7990];
  if (addr.includes('college road')) return [20.0020, 73.7650];

  // Deterministic offset based on order id/hash (around 1.5 - 3.5 km away)
  const seed = (order?.id || 'ORD101').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = 0.012 + ((seed % 17) * 0.001);
  const lngOffset = 0.015 + ((seed % 19) * 0.001);
  return [storeCoords[0] + latOffset, storeCoords[1] + lngOffset];
};

export const DeliveryInteractiveMap: React.FC<DeliveryInteractiveMapProps> = ({
  order,
  branch,
  height = '240px',
  isLive = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const branchName = branch?.name || order?.branchName || 'Main Branch (Pune)';
  const branchCode = branch?.code || order?.branchCode || 'MB-1';
  const customerName = order?.customer || order?.customerName || 'Customer';
  const deliveryAddress = order?.address || 'Delivery Address';
  const riderName = order?.assignedRider || order?.staffName;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy prior map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const storeCoords = (order?.storePos?.lat && order?.storePos?.lng)
      ? [order.storePos.lat, order.storePos.lng] as [number, number]
      : getBranchBaseCoords(branchName, branchCode, branch?.address);

    const custCoords = getCustomerCoords(order, storeCoords);

    // Rider position halfway or along the route
    const hasRider = Boolean(riderName);
    const riderCoords: [number, number] = [
      storeCoords[0] + (custCoords[0] - storeCoords[0]) * 0.55,
      storeCoords[1] + (custCoords[1] - storeCoords[1]) * 0.55,
    ];

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Store / Kitchen Icon
    const storeIcon = L.divIcon({
      className: 'custom-store-pin',
      html: `
        <div style="background:#5B2312;color:#ffffff;padding:5px 9px;border-radius:14px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;white-space:nowrap;">
          <span>🏪</span> <span>${branchName}</span>
        </div>
      `,
      iconSize: [120, 30],
      iconAnchor: [60, 15],
    });

    // Customer Icon
    const custIcon = L.divIcon({
      className: 'custom-cust-pin',
      html: `
        <div style="background:#16a34a;color:#ffffff;padding:5px 9px;border-radius:14px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;white-space:nowrap;">
          <span>📍</span> <span>${customerName}</span>
        </div>
      `,
      iconSize: [110, 30],
      iconAnchor: [55, 15],
    });

    const storeMarker = L.marker(storeCoords, { icon: storeIcon }).addTo(map);
    storeMarker.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;">
        <strong style="color:#5B2312;">🏪 Pickup Branch:</strong><br/>
        <b>${branchName}</b> (${branchCode})<br/>
        <span style="color:#666;">Ready for dispatch</span>
      </div>
    `);

    const custMarker = L.marker(custCoords, { icon: custIcon }).addTo(map);
    custMarker.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;">
        <strong style="color:#16a34a;">📍 Delivery Destination:</strong><br/>
        <b>${customerName}</b><br/>
        <span style="color:#666;">${deliveryAddress}</span>
      </div>
    `);

    // Route Polyline
    const routePoints: [number, number][] = [storeCoords];
    if (hasRider) {
      routePoints.push(riderCoords);
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div style="background:#ea580c;color:#ffffff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #fff;animation:${isLive ? 'pulse 1.5s infinite' : 'none'};white-space:nowrap;">
            <span>🛵</span> <span>${riderName}</span>
          </div>
        `,
        iconSize: [100, 28],
        iconAnchor: [50, 14],
      });
      const riderMarker = L.marker(riderCoords, { icon: riderIcon }).addTo(map);
      riderMarker.bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;">
          <strong style="color:#ea580c;">🛵 Assigned Rider:</strong><br/>
          <b>${riderName}</b><br/>
          <span style="color:#666;">Status: In Transit</span>
        </div>
      `);
    }
    routePoints.push(custCoords);

    // Primary path
    const routeLine = L.polyline(routePoints, {
      color: '#5B2312',
      weight: 4,
      opacity: 0.85,
      dashArray: hasRider ? '6, 8' : undefined,
    }).addTo(map);

    // Fit map bounds
    const bounds = L.latLngBounds(routePoints);
    map.fitBounds(bounds, { padding: [40, 40] });

    // Invalidate size to handle tab rendering properly
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.id, order?.address, order?.assignedRider, branch?.id, branch?.code, height, isLive]);

  return (
    <div style={{ width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          borderRadius: '12px 12px 0 0',
          zIndex: 1,
        }}
      />
      <div style={{
        padding: '10px 14px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#475569',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLive ? '#22c55e' : '#3b82f6' }} />
          <span><b>Branch:</b> {branchName}</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span><b>Destination:</b> {customerName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {riderName ? (
            <span style={{ color: '#ea580c', fontWeight: 600 }}>🛵 {riderName}</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>Awaiting Rider</span>
          )}
          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
            ~2.4 km · 15 mins
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryInteractiveMap;
