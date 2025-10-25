import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LiveMap from "../components/LiveMap";

const OKUPassengerDashboard = () => {
  const [activeTab, setActiveTab] = useState("book-ride");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [activeRideId, setActiveRideId] = useState(() => localStorage.getItem("ride_id") || "");
  const [driverLoc, setDriverLoc] = useState(null);
  const [etaMin, setEtaMin] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const pollRef = useRef(null);
  const [selectingDestination, setSelectingDestination] = useState(false);
  const [selectingPickup, setSelectingPickup] = useState(false);
  const [driverAddress, setDriverAddress] = useState(null);




  const navigate = useNavigate();

  const [bookingData, setBookingData] = useState({
    pickup: "",
    destination: "",
    date: "",
    time: "",
    specialNeeds: "",
    recurring: false,
    email: "",
    pickupLat: null,
    pickupLng: null,
    destLat: null,
    destLng: null,
  });

  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      setBookingData(prev => ({ ...prev, email: JSON.parse(userData).email }));
    }
  }, []);

  // Auto-refresh the entire dashboard every 3 seconds
  useEffect(() => {
    if (user?.email) {
      const interval = setInterval(() => {
        fetchBookings(user.email);
      }, 3000); // refresh every 3 seconds

      // Cleanup when leaving page or component unmounts
      return () => clearInterval(interval);
    }
  }, [user]);


  // Fetch bookings
  const fetchBookings = async (email) => {
    try {
      const response = await fetch(`http://localhost/first-project1/backend/getBook.php?email=${email}`);
      const data = await response.json();

      if (data.success) {
        const fetchedBookings = data.bookings || [];
        setBookings(fetchedBookings);

        // Try to get the active ride from bookings
        if (activeRideId) {
          const activeRide = fetchedBookings.find(b => b.ride_id === activeRideId);

          if (activeRide) {
            // Ensure pickup exists and is in {lat, lng} format
            let pickup = activeRide.pickup;

            // If stored as string "lat,lng", convert to object
            if (typeof pickup === "string") {
              const [lat, lng] = pickup.split(",").map(Number);
              pickup = { lat, lng };
            }

            console.log("Pickup for active ride:", pickup);
            setPickupLocation(pickup);

            // Optional: also set destination if needed
            let destination = activeRide.destination;
            if (typeof destination === "string") {
              const [lat, lng] = destination.split(",").map(Number);
              destination = { lat, lng };
            }
            setDestinationLocation(destination);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };


  useEffect(() => {
    if (user?.email) fetchBookings(user.email);
  }, [user]);

  // Set pickup location from booking table

  // Haversine formula for distance
  const haversineKm = useCallback((a, b) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }, []);

  // Compute ETA in minutes
  const computeEta = useCallback((from, to, speedMps) => {
    if (!from || !to) return null;
    const distanceKm = haversineKm(from, to);
    const kmh = speedMps && speedMps > 0 ? speedMps * 3.6 : 30; // default 30 km/h
    const etaHours = distanceKm / kmh;
    return Math.max(0, Math.round(etaHours * 60));
  }, [haversineKm]);

  // Live tracking updates
  const fetchLatest = useCallback(async () => {
    if (!activeRideId) return;
    try {
      const res = await fetch(`http://localhost/first-project1/backend/location.php?ride_id=${encodeURIComponent(activeRideId)}`);
      const json = await res.json();
      if (json?.success && json.data) {
        const d = json.data;

        // Ensure lat/lng exist and are valid numbers
        const lat = Number(d.lat);
        const lng = Number(d.lng);
        if (isNaN(lat) || isNaN(lng)) {
          console.error("Invalid driver coordinates:", d);
          return;
        }

        const loc = {
          lat,
          lng,
          speed: Number(d.speed) || null
        };

        setDriverLoc(loc);

        // Get driver address
        const addr = await getAddressFromCoords(lat, lng);
        setDriverAddress(addr);

        if (pickupLocation) {
          const eta = computeEta(loc, pickupLocation, loc.speed);
          setEtaMin(eta);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeRideId, pickupLocation, computeEta]);



  // Poll driver location every 5 seconds
  useEffect(() => {
    if (activeRideId) {
      fetchLatest(); // immediate fetch
      pollRef.current = setInterval(fetchLatest, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [activeRideId, fetchLatest]);


  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPassengerLocation({ lat: latitude, lng: longitude });
          setPickupLocation({ lat: latitude, lng: longitude });
          setPickupCoords({ latitude, longitude });


          console.log("Driver:", driverLoc);
          console.log("Passenger:", passengerLocation);
          console.log("Pickup:", pickupLocation);
          console.log("Destination:", destinationLocation);


        },
        (error) => console.error("Error getting location:", error)
      );
    }
  };

  // Handle booking submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost/first-project1/backend/book.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookingData,
          pickup_lat: pickupCoords?.lat || null,
          pickup_lng: pickupCoords?.lng || null,
          dest_lat: destinationCoords?.lat || null,
          dest_lng: destinationCoords?.lng || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Booking request submitted successfully!");
        fetchBookings(user.email);

        // Reset booking form
        setBookingData({
          pickup: "",
          destination: "",
          date: "",
          time: "",
          specialNeeds: "",
          recurring: false,
          email: user.email,
        });
        setPickupCoords(null);
        setDestinationCoords(null);
        setPickupLocation(null);
        setDestinationLocation(null);

        // Switch to Live Tracking if ride_id returned
        if (result.ride_id) {
          localStorage.setItem("ride_id", result.ride_id);
          setActiveRideId(result.ride_id);
          setActiveTab("live-tracking");
        }
      } else {
        alert("⚠️ Booking failed: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error submitting booking.");
    }
  };


  // Map click handler
  const handleMapClick = useCallback(
    async (lat, lng) => {
      if (activeTab === "book-ride") {
        if (selectingPickup) {
          const address = await getAddressFromCoords(lat, lng);
          setPickupCoords({ lat, lng }); // keep coords for DB
          setBookingData((prev) => ({
            ...prev,
            pickup: address,  // show address to user
            pickupLat: lat,   // keep raw lat
            pickupLng: lng,   // keep raw lng
          }));
          setSelectingPickup(false);
        } else if (selectingDestination) {
          const address = await getAddressFromCoords(lat, lng);
          setDestinationCoords({ lat, lng }); // keep coords for DB
          setBookingData((prev) => ({
            ...prev,
            destination: address,  // show address to user
            destLat: lat,          // keep raw lat
            destLng: lng,          // keep raw lng
          }));
          setSelectingDestination(false);
        }
      }
    },
    [activeTab, selectingPickup, selectingDestination]
  );




  useEffect(() => {
    window.onMapClick = handleMapClick;
    return () => { window.onMapClick = null; };
  }, [handleMapClick]);

  if (!user) return <div>Loading...</div>;

  async function getAddressFromCoords(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name; // full address
    } catch (err) {
      console.error("Geocoding error:", err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback to coords
    }
  }




  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ margin: 0, color: "#1f2937", fontSize: "28px", fontWeight: "bold" }}>🚗 OKU Transport Dashboard</h1>
              <p style={{ margin: "8px 0 0 0", color: "#6b7280" }}>Welcome, {user.name}! Book your accessible transport service.</p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/")} style={{ padding: "10px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>🏠 Home</button>
              <button onClick={() => alert(`Profile Information:\n\nName: ${user.name}\nEmail: ${user.email}\nUser Type: ${user.userType}\nPhone: ${user.phone || 'Not provided'}`)} style={{ padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>👤 Profile</button>
              <button onClick={() => { if (window.confirm("Are you sure you want to logout?")) { localStorage.removeItem("user"); localStorage.removeItem("ride_id"); navigate("/"); } }} style={{ padding: "10px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>🚪 Logout</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button onClick={() => setActiveTab("book-ride")} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: activeTab === "book-ride" ? "#3b82f6" : "#e5e7eb", color: activeTab === "book-ride" ? "#fff" : "#374151", fontWeight: "bold", cursor: "pointer" }}>📅 Book New Ride</button>
          <button onClick={() => setActiveTab("live-tracking")} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: activeTab === "live-tracking" ? "#3b82f6" : "#e5e7eb", color: activeTab === "live-tracking" ? "#fff" : "#374151", fontWeight: "bold", cursor: "pointer" }}>🗺️ Live Tracking</button>
          <button onClick={() => setActiveTab("history")} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: activeTab === "history" ? "#3b82f6" : "#e5e7eb", color: activeTab === "history" ? "#fff" : "#374151", fontWeight: "bold", cursor: "pointer" }}>📋 Trip History</button>
        </div>

        {/* Book Ride Tab */}
        {activeTab === "book-ride" && (
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <h2 style={{ margin: "0 0 20px 0", color: "#1f2937" }}>Book Your Ride</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#374151",
                    }}
                  >
                    Pickup Location
                  </label>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      readOnly
                      value={bookingData.pickup}
                      onChange={(e) =>
                        setBookingData((prev) => ({ ...prev, pickup: e.target.value }))
                      }
                      placeholder="Type or click button + map"
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setSelectingPickup(true);
                      }}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Set
                    </button>
                  </div>

                  {!pickupCoords && (
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      style={{
                        marginTop: "8px",
                        padding: "8px 16px",
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      📍 Use My Location
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={bookingData.destination}
                    onChange={(e) =>
                      setBookingData((prev) => ({ ...prev, destination: e.target.value }))
                    }
                    placeholder="Type destination or click button + map"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setSelectingDestination(true);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      fontWeight: "bold",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Set
                  </button>
                </div>


                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#374151" }}>Date</label>
                    <input type="date" value={bookingData.date} onChange={(e) => setBookingData(prev => ({ ...prev, date: e.target.value }))} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#374151" }}>Time</label>
                    <input type="time" value={bookingData.time} onChange={(e) => setBookingData(prev => ({ ...prev, time: e.target.value }))} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }} required />
                  </div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      color: "#374151",
                    }}
                  >
                    Special Needs (Optional)
                  </label>
                  <select
                    value={bookingData.specialNeeds}
                    onChange={(e) =>
                      setBookingData((prev) => ({ ...prev, specialNeeds: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">-- Select Special Need --</option>
                    <option value="Wheelchair-accessible ramp (side or rear)">
                      Wheelchair-accessible ramp (side or rear)
                    </option>
                    <option value="Wheelchair lift / hydraulic lift">
                      Wheelchair lift / hydraulic lift
                    </option>
                    <option value="Swivel / turning point / passenger seat / seat lift">
                      Swivel / turning point / passenger seat / seat lift
                    </option>
                    <option value="Slope (or sloper) variant">Slope (or sloper) variant</option>
                    <option value="High roof / tall cabin / large door aperture">
                      High roof / tall cabin / large door aperture
                    </option>
                    <option value="Vertical platform lift">Vertical platform lift</option>
                    <option value="Removable / roll-in van / MPV conversion">
                      Removable / roll-in van / MPV conversion
                    </option>
                  </select>
                </div>

                <button type="submit" style={{ width: "100%", padding: "16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>🚗 Submit Booking Request</button>
              </form>
            </div>

            <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>🗺️ Select Locations</h3>
              <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: "14px" }}>
                {!pickupCoords ? "Click on map to set pickup location" : !destinationCoords ? "Click on map to set destination" : "Both locations set! You can submit your booking."}
              </p>
              <LiveMap passengerLocation={passengerLocation} pickupLocation={pickupLocation} destinationLocation={destinationLocation} />
            </div>
          </div>
        )}

        {/* Live Tracking Tab */}
        {activeTab === "live-tracking" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#1f2937" }}>🚗 Live Driver Tracking</h2>
            {activeRideId ? (
              <>
                <LiveMap driverLocation={driverLoc} passengerLocation={passengerLocation} pickupLocation={pickupLocation} destinationLocation={destinationLocation} eta={etaMin} rideId={activeRideId} isDriver={false} />
                <div style={{ marginTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "#374151" }}>Ride Information</h4>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Ride ID:</strong> {activeRideId}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Status:</strong> {driverLoc ? "Driver Connected" : "Waiting for Driver"}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>ETA:</strong> {etaMin !== null ? `${etaMin} minutes` : "Calculating..."}</p>
                    </div>
                  </div>
                  {driverLoc && (
                    <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: "#374151" }}>Driver Location</h4>
                      <div style={{ margin: "4px 0", fontSize: "14px" }}>
                        Speed: {driverLoc.speed ? `${driverLoc.speed} m/s` : "N/A"}
                      </div>
                      <div style={{ margin: "4px 0", fontSize: "14px" }}>
                        <strong>Address:</strong> {driverAddress || "Fetching..."}

                      </div>
                    </div>


                  )}
                </div>
              </>
            ) : (
              <p style={{ color: "#6b7280" }}>No active ride. Book a ride first to start live tracking.</p>
            )}
          </div>
        )}

        {/* Trip History Tab */}
        {activeTab === "history" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 20px 0", color: "#1f2937" }}>📋 Trip History</h2>
            {bookings.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Ride ID</th>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Pickup</th>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Destination</th>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Date</th>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Time</th>
                    <th style={{ padding: "12px", border: "1px solid #d1d5db" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => (
                    <tr key={i}>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.ride_id}</td>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.pickup?.address || "Unknown"}</td>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.destination?.address || "Unknown"}</td>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.date}</td>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.time}</td>
                      <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#6b7280" }}>No trips found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OKUPassengerDashboard;
