import React, { useEffect, useState } from "react";
import { Check, X, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DriverDashboard() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("accept-ride");
  const [notification, setNotification] = useState(null);
  const [confirmPopup, setConfirmPopup] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const driverEmail = localStorage.getItem("driver_email");

  // ✅ Profile form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    licenseNumber: "",
    vehicleType: "",
    vehicleNumber: "",
    experience: "",
    languages: [],
    emergencyContact: "",
    emergencyPhone: "",
    availability: "",
    icPhoto: null,
    selfiePhoto: null,
    licensePhoto: null,
    vehiclePhoto: null,
  });

  // Driver Details modal state and loaded profile
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [driverStatus, setDriverStatus] = useState(null);

  useEffect(() => {
    if (!driverEmail) navigate("/login");
  }, [driverEmail, navigate]);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const res = await fetch("http://localhost/first-project1/backend/getAllBooking.php");
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error(err);
      setNotification("⚠️ Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "accept-ride") fetchBookings();
  }, [activeTab]);

  // Fetch driver profile for Details modal and prefill form
  const fetchDriverProfile = async () => {
    try {
      if (!driverEmail) return;
      const res = await fetch("http://localhost/first-project1/backend/getDrivers.php");
      const data = await res.json();
      const all = [
        ...(data.pending || []),
        ...(data.approved || []),
        ...(data.rejected || [])
      ];
      const driver = all.find((d) => d.email === driverEmail);
      if (driver) {
        const status = (data.approved || []).some((d) => d.email === driverEmail)
          ? 'Approved'
          : (data.rejected || []).some((d) => d.email === driverEmail)
          ? 'Rejected'
          : 'Pending';
        setDriverStatus(status);
        setCurrentProfile({ ...driver, status });
        setFormData((prev) => ({
          ...prev,
          name: driver.name || "",
          phone: driver.phone || driver.phoneNum || "",
          address: driver.address || "",
          licenseNumber: driver.licenseNumber || "",
          vehicleType: driver.vehicleType || "",
          vehicleNumber: driver.vehicleNumber || "",
          experience: driver.experience || "",
          languages: driver.languages
            ? Array.isArray(driver.languages)
              ? driver.languages
              : driver.languages.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          emergencyContact: driver.emergencyContact || "",
          emergencyPhone: driver.emergencyPhone || "",
          availability: driver.availability || "",
        }));
      }
    } catch (err) {
      console.error("Failed to fetch driver profile", err);
    }
  };

  useEffect(() => {
    fetchDriverProfile();
  }, [activeTab, driverEmail]);

  // Confirm and handle accept
  const confirmAccept = (booking) => {
    if (driverStatus !== 'Approved') {
      setNotification("❌ You cannot accept bookings until admin approves your profile.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setConfirmPopup(booking);
  };

  const handleAccept = async (booking) => {
    setConfirmPopup(null);
    if (!navigator.geolocation)
      return setNotification("⚠️ Geolocation not supported.");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch("http://localhost/first-project1/backend/acceptBooking.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ride_id: booking.ride_id,
              passenger_email: booking.email,
              date: booking.date,
              time: booking.time,
              driver_email: driverEmail,
              latitude, 
              longitude,
            }),
          });
          const result = await response.json();
          if (result.success) {
            setBookings((prev) =>
              prev.filter((b) => b.ride_id !== booking.ride_id)
            );
            setNotification("✅ Booking accepted successfully!");
          } else setNotification("❌ " + (result.message || "Update failed"));
        } catch {
          setNotification("⚠️ Something went wrong.");
        } finally {
          setTimeout(() => setNotification(null), 3000);
        }
      },
      () => setNotification("⚠️ Unable to get location.")
    );
  };

  const getCurrentAddress = async () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
      );
      const data = await res.json();
      if (data.results?.length) {
        setFormData((prev) => ({
          ...prev,
          address: data.results[0].formatted_address,
        }));
      } else alert("Unable to detect address.");
    });
  };

  // Handle inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        languages: checked
          ? [...prev.languages, value]
          : prev.languages.filter((l) => l !== value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        driverEmail,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        licenseNumber: formData.licenseNumber,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        experience: formData.experience,
        languages: Array.isArray(formData.languages)
          ? formData.languages.join(", ")
          : formData.languages,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        availability: formData.availability,
      };

      const resp = await fetch("http://localhost/first-project1/backend/updateDriver.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (json.status !== "success") throw new Error(json.message || "Update failed");

      // Upload documents if selected
      const hasFiles = ["icPhoto", "selfiePhoto", "licensePhoto", "vehiclePhoto"].some(
        (k) => !!formData[k]
      );
      if (hasFiles) {
        const fd = new FormData();
        fd.append("email", driverEmail);
        ["icPhoto", "selfiePhoto", "licensePhoto", "vehiclePhoto"].forEach((k) => {
          if (formData[k]) fd.append(k, formData[k]);
        });
        const r2 = await fetch("http://localhost/first-project1/backend/updateDriverDocs.php", {
          method: "POST",
          body: fd,
        });
        const j2 = await r2.json();
        if (j2.status !== "success") {
          alert("Profile updated, but document upload failed: " + (j2.message || ""));
        } else {
          setCurrentProfile((prev) => (prev ? { ...prev, ...j2.files } : prev));
        }
      }

      setNotification("✅ Profile setup saved successfully!");
      setTimeout(() => setNotification(null), 3000);
      fetchDriverProfile();
    } catch (err) {
      console.error(err);
      setNotification("⚠️ " + err.message);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex flex-wrap justify-between items-center shadow-md">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          🚗 Driver Dashboard
        </h1>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-gray-100 font-semibold"
            onClick={() => navigate("/")}
          >
            Home
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("driver_email");
              localStorage.removeItem("ride_id");
              navigate("/");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center mt-5 gap-3 px-4">
        <button
          onClick={() => setActiveTab("accept-ride")}
          className={`flex-1 sm:flex-none min-w-[140px] text-center px-5 py-2 rounded-lg font-medium shadow-sm ${
            activeTab === "accept-ride"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          🚘 Accept Ride
        </button>
        <button
          onClick={() => setActiveTab("setup-profile")}
          className={`flex-1 sm:flex-none min-w-[140px] text-center px-5 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm ${
            activeTab === "setup-profile"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          <UserCog size={18} /> Setup Profile
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 bg-white border shadow-lg px-6 py-3 rounded-lg text-gray-800 z-30">
          {notification}
        </div>
      )}

      {/* Confirm Popup */}
      {confirmPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-[90%] sm:w-96">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Confirm Ride Acceptance
            </h2>
            <p className="mb-4 text-gray-600">
              Accept booking for{" "}
              <span className="font-semibold">{confirmPopup.name}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={() => setConfirmPopup(null)}
              >
                <X size={16} /> Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={() => handleAccept(confirmPopup)}
              >
                <Check size={16} /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6">
        {activeTab === "accept-ride" ? (
          loading ? (
            <p className="text-center text-gray-500 mt-10">
              Loading bookings...
            </p>
          ) : bookings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-md p-5 border hover:shadow-lg transition"
                >
                  <h2 className="text-lg font-semibold">{booking.name}</h2>
                  <p className="text-sm text-gray-500">{booking.email}</p>
                  <p className="mt-2 text-gray-700">
                    📅 {booking.date} | 🕒 {booking.time}
                  </p>
                  <p className="text-blue-600 font-medium mt-1">
                    {booking.pickup} → {booking.destination}
                  </p>
                  <button
                    onClick={() => confirmAccept(booking)}
                    disabled={driverStatus !== 'Approved'}
                    className={`mt-4 w-full py-2 rounded-lg flex items-center justify-center gap-2 ${driverStatus !== 'Approved' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    <Check size={16} /> Accept Ride
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-10">
              No bookings available
            </p>
          )
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Driver Profile Setup</h2>
              <button
                type="button"
                onClick={() => setShowDetailsModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                View My Details
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  name="name"
                  placeholder="Full Name"
                  onChange={handleChange}
                  value={formData.name}
                  required
                  className="p-3 border rounded-lg"
                />
                <input
                  name="phone"
                  placeholder="Phone Number"
                  onChange={handleChange}
                  value={formData.phone}
                  required
                  className="p-3 border rounded-lg"
                />
              </div>
              <input
                name="licenseNumber"
                placeholder="License Number"
                onChange={handleChange}
                value={formData.licenseNumber}
                required
                className="w-full p-3 border rounded-lg"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  name="vehicleType"
                  placeholder="Vehicle Type"
                  onChange={handleChange}
                  value={formData.vehicleType}
                  required
                  className="p-3 border rounded-lg"
                />
                <input
                  name="vehicleNumber"
                  placeholder="Vehicle Number"
                  onChange={handleChange}
                  value={formData.vehicleNumber}
                  required
                  className="p-3 border rounded-lg"
                />
              </div>
              <input
                name="experience"
                placeholder="Years of Experience"
                onChange={handleChange}
                value={formData.experience}
                required
                className="w-full p-3 border rounded-lg"
              />

              {/* Languages */}
              <div>
                <label className="block font-medium mb-1">
                  Languages Spoken:
                </label>
                <div className="flex flex-wrap gap-3">
                  {["English", "Malay", "Chinese", "Tamil", "Arabic"].map(
                    (lang) => (
                      <label
                        key={lang}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <input
                          type="checkbox"
                          value={lang}
                          onChange={handleChange}
                          checked={Array.isArray(formData.languages) && formData.languages.includes(lang)}
                        /> {lang}
                      </label>
                    )
                  )}
                </div>
              </div>

              <textarea
                name="address"
                placeholder="Address"
                onChange={handleChange}
                value={formData.address}
                rows={3}
                required
                className="w-full p-3 border rounded-lg"
              ></textarea>
              <button
                type="button"
                onClick={getCurrentAddress}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                📍 Use My Location
              </button>

              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  name="emergencyContact"
                  placeholder="Emergency Contact Name"
                  onChange={handleChange}
                  value={formData.emergencyContact}
                  required
                  className="p-3 border rounded-lg"
                />
                <input
                  name="emergencyPhone"
                  placeholder="Emergency Contact Number"
                  onChange={handleChange}
                  value={formData.emergencyPhone}
                  required
                  className="p-3 border rounded-lg"
                />
              </div>

              <select
                name="availability"
                onChange={handleChange}
                value={formData.availability}
                required
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select Availability</option>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Flexible">Flexible</option>
              </select>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "icPhoto", label: "IC Photo" },
                  { name: "selfiePhoto", label: "Selfie Photo" },
                  { name: "licensePhoto", label: "License Photo" },
                  { name: "vehiclePhoto", label: "Vehicle Photo" },
                ].map((item) => (
                  <div key={item.name}>
                    <label className="font-medium block mb-1">
                      {item.label}
                    </label>
                    <input
                      type="file"
                      name={item.name}
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full p-2 border rounded-lg"
                    />
                    {formData[item.name] && (
                      <img
                        src={URL.createObjectURL(formData[item.name])}
                        alt={item.label}
                        className="mt-2 rounded-lg w-full h-32 object-cover border"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                💾 Save Profile
              </button>
            </form>
          </div>
        )}
      </main>
      {/* Driver Details Modal */}
      {showDetailsModal && currentProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl" style={{ height: '90vh', maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6" style={{ maxHeight: 'calc(90vh - 48px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Driver Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Name:</span> {currentProfile.name}</div>
                    <div><span className="font-medium">Email:</span> {currentProfile.email}</div>
                    <div><span className="font-medium">Phone:</span> {currentProfile.phone || currentProfile.phoneNum}</div>
                    <div><span className="font-medium">IC Number:</span> {currentProfile.icNumber}</div>
                    <div><span className="font-medium">Address:</span> {currentProfile.address}</div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Driver Information</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">License Number:</span> {currentProfile.licenseNumber}</div>
                    <div><span className="font-medium">Experience:</span> {currentProfile.experience}</div>
                    <div><span className="font-medium">Languages:</span> {Array.isArray(currentProfile.languages) ? currentProfile.languages.join(", ") : currentProfile.languages}</div>
                    <div><span className="font-medium">Availability:</span> {currentProfile.availability}</div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Vehicle Type:</span> {currentProfile.vehicleType}</div>
                    <div><span className="font-medium">Vehicle Number:</span> {currentProfile.vehicleNumber}</div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Contact Name:</span> {currentProfile.emergencyContact}</div>
                    <div><span className="font-medium">Contact Phone:</span> {currentProfile.emergencyPhone}</div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {currentProfile.icPhoto && (
                    <div className="text-center">
                      <h4 className="font-medium mb-2">IC Photo</h4>
                      <img
                        src={`http://localhost/first-project1/uploads/${currentProfile.icPhoto}`}
                        alt="IC"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {currentProfile.selfiePhoto && (
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Selfie</h4>
                      <img
                        src={`http://localhost/first-project1/uploads/${currentProfile.selfiePhoto}`}
                        alt="Selfie"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {currentProfile.licensePhoto && (
                    <div className="text-center">
                      <h4 className="font-medium mb-2">License</h4>
                      <img
                        src={`http://localhost/first-project1/uploads/${currentProfile.licensePhoto}`}
                        alt="License"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {currentProfile.vehiclePhoto && (
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Vehicle</h4>
                      <img
                        src={`http://localhost/first-project1/uploads/${currentProfile.vehiclePhoto}`}
                        alt="Vehicle"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
