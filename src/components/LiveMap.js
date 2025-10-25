import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LiveMap = ({ 
  driverLocation, 
  passengerLocation, 
  pickupLocation, 
  destinationLocation, 
  eta,
  isDriver = false,
  rideId = ""
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const passengerMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Debugging logs
  useEffect(() => {
    console.log("LiveMap Props:");
    console.log("Driver:", driverLocation);
    console.log("Passenger:", passengerLocation);
    console.log("Pickup:", pickupLocation);
    console.log("Destination:", destinationLocation);
    console.log("ETA:", eta);
  }, [driverLocation, passengerLocation, pickupLocation, destinationLocation, eta]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([5.3299, 103.1370], 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    if (!isDriver) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (window.onMapClick) window.onMapClick(lat, lng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isDriver]);

  const addMarker = (location, ref, iconConfig, popupText) => {
    if (!mapInstanceRef.current || !location?.lat || !location?.lng) return;

    if (ref.current) mapInstanceRef.current.removeLayer(ref.current);

    const marker = L.marker([location.lat, location.lng], { icon: iconConfig })
      .addTo(mapInstanceRef.current)
      .bindPopup(popupText);

    ref.current = marker;
  };

  // Driver marker
  useEffect(() => {
    const loc = driverLocation;
    if (!loc?.lat || !loc?.lng) return;

    const driverIcon = L.divIcon({
      className: 'driver-marker',
      html: `<div style="
        width: 20px; height: 20px; background: #22c55e;
        border: 3px solid white; border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const popupText = `<div style="text-align:center;"><strong>🚗 Driver Location</strong><br/>
      Lat: ${loc.lat.toFixed(5)}<br/>Lng: ${loc.lng.toFixed(5)}<br/>
      ${eta ? `ETA: ${eta} min` : ''}</div>`;

    addMarker(loc, driverMarkerRef, driverIcon, popupText);

    if (isDriver) mapInstanceRef.current.setView([loc.lat, loc.lng], 15);

  }, [driverLocation, eta, isDriver]);

  // Passenger marker
  useEffect(() => {
    const loc = passengerLocation;
    if (!loc?.lat || !loc?.lng) return;

    const passengerIcon = L.divIcon({
      className: 'passenger-marker',
      html: `<div style="
        width: 16px; height: 16px; background: #3b82f6;
        border: 2px solid white; border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const popupText = `<div style="text-align:center;"><strong>👤 You</strong><br/>
      Lat: ${loc.lat.toFixed(5)}<br/>Lng: ${loc.lng.toFixed(5)}</div>`;

    addMarker(loc, passengerMarkerRef, passengerIcon, popupText);

  }, [passengerLocation]);

  // Pickup marker
  useEffect(() => {
    const loc = pickupLocation;
    if (!loc?.lat || !loc?.lng) return;

    const pickupIcon = L.divIcon({
      className: 'pickup-marker',
      html: `<div style="
        width: 18px; height: 18px; background: #f59e0b;
        border: 2px solid white; border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    const popupText = `<div style="text-align:center;"><strong>📍 Pickup</strong><br/>
      Lat: ${loc.lat.toFixed(5)}<br/>Lng: ${loc.lng.toFixed(5)}</div>`;

    addMarker(loc, pickupMarkerRef, pickupIcon, popupText);

  }, [pickupLocation]);

  // Destination marker
  useEffect(() => {
    const loc = destinationLocation;
    if (!loc?.lat || !loc?.lng) return;

    const destIcon = L.divIcon({
      className: 'destination-marker',
      html: `<div style="
        width: 18px; height: 18px; background: #ef4444;
        border: 2px solid white; border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    const popupText = `<div style="text-align:center;"><strong>🏁 Destination</strong><br/>
      Lat: ${loc.lat.toFixed(5)}<br/>Lng: ${loc.lng.toFixed(5)}</div>`;

    addMarker(loc, destinationMarkerRef, destIcon, popupText);

  }, [destinationLocation]);

  // Route line between driver and pickup
  useEffect(() => {
    if (!mapInstanceRef.current || !driverLocation?.lat || !driverLocation?.lng || !pickupLocation?.lat || !pickupLocation?.lng) return;

    if (routeLineRef.current) mapInstanceRef.current.removeLayer(routeLineRef.current);

    const routeLine = L.polyline([
      [driverLocation.lat, driverLocation.lng],
      [pickupLocation.lat, pickupLocation.lng]
    ], {
      color: '#22c55e',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,10'
    }).addTo(mapInstanceRef.current);

    routeLineRef.current = routeLine;

    const group = new L.featureGroup([routeLine]);
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));

  }, [driverLocation, pickupLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />

      {eta && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(0,0,0,0.8)', color: 'white',
          padding: '8px 12px', borderRadius: '8px', fontSize: '14px',
          fontWeight: 'bold', zIndex: 1000
        }}>
          🚗 ETA: {eta} min
        </div>
      )}

      {rideId && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          background: 'rgba(0,0,0,0.8)', color: 'white',
          padding: '6px 10px', borderRadius: '6px', fontSize: '12px', zIndex: 1000
        }}>
          Ride: {rideId}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LiveMap;
