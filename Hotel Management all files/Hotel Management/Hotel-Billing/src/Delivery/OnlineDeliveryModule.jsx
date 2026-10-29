import React, { useEffect, useState } from "react";
import { useBranch } from "../context/BranchContext";
import { DeliveryInteractiveMap } from "./DeliveryInteractiveMap";
import { deliveryService } from "../services/deliveryService";
import { branchService } from "../services/branchService";
import { staffService } from "../services/staffService";
import { kotService } from "../services/kotService";
import { orderService } from "../services/orderService";
import { integrationService } from "../services/integrationService";
import { sanitizeMobileInput, isValidMobile } from "../common/phoneUtils";
import { dialogService } from "../context/DialogContext";
const haversineKm = (a,b) => {
  if(!a || !b) return 0;
  const r=6371, rad=(x)=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*r*Math.asin(Math.min(1,Math.sqrt(h)));
};
const interpolatePoint = (a,b,t) => ({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
const formatEta = (minutes) => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return "Arriving now";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
};
const formatKm = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const LEGACY_DELIVERY_ORDERS = [
{
id: "SWG123456",
channel: "Swiggy",
channelColor: "#ea580c",
customer: "Rahul Sharma",
phone: "+91 98765 43210",
address: "12, Green Park Society, Andheri West, Mumbai, 400058",
itemsCount: 2,
items: [
{ name: "Veg Burger", qty: 1, price: 199 },
{ name: "Paneer Pizza", qty: 1, price: 457 },
],
amount: 656,
time: "2 min ago",
date: "10 May 2026, 11:30 AM",
status: "Out for Delivery",
assignedRider: "Rohit",
paymentStatus: "Paid",
},
{
id: "ZMD123455",
channel: "Zomato",
channelColor: "#dc2626",
customer: "Priya Patel",
phone: "+91 98111 22233",
address: "45, Link Road, Bandra West, Mumbai",
itemsCount: 1,
items: [{ name: "Cheese Burst Pizza", qty: 1, price: 450 }],
amount: 450,
time: "3 min ago",
date: "10 May 2026, 11:29 AM",
status: "Preparing",
assignedRider: null,
paymentStatus: "Pending",
},
{
id: "OND123454",
channel: "ONDC Food",
channelColor: "#2563eb",
customer: "Amit Singh",
phone: "+91 97222 33344",
address: "88, MG Road, Fort, Mumbai",
itemsCount: 3,
items: [
{ name: "Special Thali", qty: 2, price: 700 },
{ name: "Mango Lassi", qty: 1, price: 150 },
],
amount: 850,
time: "4 min ago",
date: "10 May 2026, 11:28 AM",
status: "Ready",
assignedRider: null,
paymentStatus: "Paid",
},
{
id: "EAT123453",
channel: "Eatsure",
channelColor: "#9333ea",
customer: "Karan Verma",
phone: "+91 96333 44455",
address: "10, Powai Plaza, Hiranandani, Mumbai",
itemsCount: 1,
items: [{ name: "Paneer Tikka Wrap", qty: 2, price: 380 }],
amount: 380,
time: "15 min ago",
date: "10 May 2026, 11:27 AM",
status: "Out for Delivery",
assignedRider: "Sanjay",
paymentStatus: "Paid",
},
{
id: "MPN123452",
channel: "Magicpin",
channelColor: "#a855f7",
customer: "Sneha Iyer",
phone: "+91 95444 55566",
address: "14, Juhu Beach Road, Mumbai",
itemsCount: 3,
items: [{ name: "Samosa Chat", qty: 3, price: 650 }],
amount: 650,
time: "3 min ago",
date: "10 May 2026, 11:25 AM",
status: "New",
assignedRider: null,
paymentStatus: "Pending",
},
];

const LEGACY_PLATFORM_RIDERS = [
{
id: 101,
name: "Swiggy Express 1",
phone: "+91 91111 00000",
status: "Available",
dist: "0.8 km",
},
{
id: 102,
name: "Flash Rider 2",
phone: "+91 92222 00000",
status: "Available",
dist: "1.5 km",
},
 ];
const LEGACY_OWN_RIDERS = [
{
id: 1,
name: "Rohit",
phone: "+91 90000 11111",
status: "Available",
dist: "2.1 km",
avatar: "https://i.pravatar.cc/150?img=11",
},
{
id: 2,
name: "Sanjay",
phone: "+91 90000 22222",
status: "Available",
dist: "2.8 km",
avatar: "https://i.pravatar.cc/150?img=12",
},
{
id: 3,
name: "Amit",
phone: "+91 90000 33333",
status: "Busy",
dist: "4.2 km",
avatar: "https://i.pravatar.cc/150?img=13",
},
{
id: 4,
name: "Vikas",
phone: "+91 90000 44444",
status: "Available",
dist: "1.7 km",
avatar: "https://i.pravatar.cc/150?img=14",
},
 ];

const LEGACY_CHANNEL_RECORDS = [
{
name: "Swiggy",
status: "Connected",
orders: 45,
sales: "₹25,650",
sync: "2 min ago",
apiKey: "SWG_KEY_9921",
storeId: "STR_881",
},
{
name: "Zomato",
status: "Connected",
orders: 32,
sales: "₹18,320",
sync: "5 min ago",
apiKey: "ZMD_KEY_1102",
storeId: "STR_882",
},
{
name: "ONDC Food",
status: "Connected",
orders: 12,
sales: "₹7,850",
sync: "10 min ago",
apiKey: "ONDC_KEY_3391",
storeId: "STR_883",
},
{
name: "Eatsure",
status: "Connected",
orders: 8,
sales: "₹4,250",
sync: "1 hour ago",
apiKey: "EAT_KEY_8820",
storeId: "STR_884",
},
{
name: "Magicpin",
status: "Connected",
orders: 6,
sales: "₹3,120",
sync: "2 hour ago",
apiKey: "MPN_KEY_5541",
storeId: "STR_885",
},
{
name: "Domino's",
status: "Disconnected",
orders: 0,
sales: "₹0",
sync: "-",
apiKey: "",
storeId: "",
},
 ];

const LEGACY_MENU_SYNC_RECORDS = [
{
channel: "Swiggy",
status: "Success",
syncedItems: 110,
pendingItems: 5,
failedItems: 5,
lastSync: "2 min ago",
},
{
channel: "Zomato",
status: "Success",
syncedItems: 112,
pendingItems: 3,
failedItems: 5,
lastSync: "5 min ago",
},
{
channel: "ONDC Food",
status: "Success",
syncedItems: 118,
pendingItems: 2,
failedItems: 0,
lastSync: "10 min ago",
},
{
channel: "Eatsure",
status: "Warning",
syncedItems: 100,
pendingItems: 15,
failedItems: 5,
lastSync: "1 hour ago",
},
 ];

const LEGACY_SETTLEMENT_RECORDS = [
{
ch: "Swiggy",
s: "₹25,650",
c: "₹2,565",
f: "₹820",
r: "₹150",
net: "₹22,115",
},
{
ch: "Zomato",
s: "₹18,320",
c: "₹732",
f: "₹319",
r: "₹120",
net: "₹17,149",
},
];

const LEGACY_RECONCILIATION_RECORDS = [
{
ch: "Swiggy",
p: "₹25,650",
s: "₹25,650",
b: "₹25,650",
st: "Matched",
details: "Exact match verified with Bank Statements.",
},
{
ch: "Zomato",
p: "₹18,320",
s: "₹18,070",
b: "₹18,320",
st: "Mismatched",
details: "System difference of 250 detected due to promo discount.",
},
{
ch: "ONDC Food",
p: "₹2,000",
s: "₹2,000",
b: "₹0",
st: "Pending",
details: "Payment initiated from platform, bank clearance pending.",
},
{
ch: "Eatsure",
p: "₹1,000",
s: "₹0",
b: "₹0",
st: "Missing",
details: "Missing payout record in System & Bank settlement.",
},
];


export default function OnlineDeliveryModule() {
const { selectedBranchId: contextBranchId, selectedBranch, branches: contextBranches } = useBranch();
const [activeTab, setActiveTab] = useState("1"); // Default open to Online Dashboard
// Header Controls State
const [realtime, setRealtime] = useState(true);
const [soundEnabled, setSoundEnabled] = useState(true);
const [liveNotificationsActive, setLiveNotificationsActive] = useState(true);
const [selectedOrderId, setSelectedOrderId] = useState("");
const [searchQuery, setSearchQuery] = useState("");
const [kdsFilter, setKdsFilter] = useState("All");
// Custom Alert Notification State
const [toast, setToast] = useState("");
const showToast = (msg) => {
setToast(msg);
setTimeout(() => setToast(""), 3000);
};
// Interactive Orders State


const [orders, setOrders] = useState(() => LEGACY_DELIVERY_ORDERS.map((o) => ({ ...o, isLegacyDemo: true })));
const [backendOrders, setBackendOrders] = useState([]);
const [branches, setBranches] = useState([]);
const [kots, setKots] = useState([]);
const [staff, setStaff] = useState([]);
const [integrations, setIntegrations] = useState([]);
const [selectedBranchId, setSelectedBranchId] = useState(() => contextBranchId || null);

useEffect(() => {
  if (contextBranchId) {
    setSelectedBranchId(contextBranchId);
  }
}, [contextBranchId]);
const [isTestOrderModalOpen, setIsTestOrderModalOpen] = useState(false);
const [testOrderForm, setTestOrderForm] = useState({ platform: "ZOMATO", customerName: "Test Customer", customerPhone: "9876543210", address: "Test Delivery Address", itemName: "Test Burger", quantity: 1, unitPrice: 150 });
const [isCreatingTestOrder, setIsCreatingTestOrder] = useState(false);
// Delivery Assignment Tab State
const [riderTab, setRiderTab] = useState("Own");
const [platformRiders, setPlatformRiders] = useState(() => LEGACY_PLATFORM_RIDERS.map((r) => ({ ...r, isLegacyDemo: true })));
const [ownRiders, setOwnRiders] = useState(() => LEGACY_OWN_RIDERS.map((r) => ({ ...r, isLegacyDemo: true })));
// Add Rider Modal & Validation State
const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
const [riderFormData, setRiderFormData] = useState({
name: "",
phone: "",
dist: "",
});
const [riderFormErrors, setRiderFormErrors] = useState({});
const handleCreateTestOrder = async (e) => {
  e.preventDefault();
  if (!selectedBranchId) { showToast("Select a branch before creating a test order."); return; }
  const phone = String(testOrderForm.customerPhone || "").replace(/\\D/g, "");
  if (!/^[6-9]\d{9}$/.test(phone)) { showToast("Phone number must be 10 digits and start with 6, 7, 8 or 9."); return; }
  if (!String(testOrderForm.customerName || "").trim()) { showToast("Customer name is required."); return; }
  if (!String(testOrderForm.address || "").trim()) { showToast("Delivery address is required."); return; }
  if (!String(testOrderForm.itemName || "").trim()) { showToast("Item name is required."); return; }
  if (Number(testOrderForm.quantity) < 1 || Number(testOrderForm.quantity) > 100) { showToast("Quantity must be between 1 and 100."); return; }
  if (Number(testOrderForm.unitPrice) < 0) { showToast("Unit price cannot be negative."); return; }
  setIsCreatingTestOrder(true);
  try {
    const result = await integrationService.createTestOrder({ ...testOrderForm, branchId: Number(selectedBranchId), quantity: Number(testOrderForm.quantity) || 1, unitPrice: Number(testOrderForm.unitPrice) || 0 });
    setIsTestOrderModalOpen(false);
    showToast(`${result.platform} test order created: ${result.externalOrderId}`);
    setTimeout(() => window.location.reload(), 700);
  } catch (e) {
    showToast((e && e.userFriendlyMessage) || e?.response?.data?.message || "Unable to create test order.");
  } finally { setIsCreatingTestOrder(false); }
};

const handleOpenRiderModal = () => {
setRiderFormData({ name: "", phone: "", dist: "" });
setRiderFormErrors({});
setIsRiderModalOpen(true);
};
// Prevent invalid characters while typing
const handleRiderFormChange = (e) => {
const { name, value } = e.target;
let filteredValue = value;
    if (name === "name") {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (name === "phone") {
      filteredValue = sanitizeMobileInput(value);
    } else if (name === "dist") {
      filteredValue = value.replace(/[^0-9a-z.]/g, "");
    }

    setRiderFormData((prev) => ({ ...prev, [name]: filteredValue }));

    if (riderFormErrors[name]) {
      setRiderFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
};
const validateRiderForm = () => {
let errors = {};
if (!riderFormData.name.trim()) {
errors.name = "Rider name is required";
}
const cleanPhone = riderFormData.phone.replace(/[^0-9]/g, "");
if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
errors.phone = "Phone number must be 10 digits and start with 6, 7, 8 or 9";
}
if (!riderFormData.dist.trim()) {
errors.dist = "Distance is required (e.g. 1.2 km)";
}
setRiderFormErrors(errors);
return Object.keys(errors).length === 0;
};
const handleAddRiderSubmit = async (e) => {
  e.preventDefault();
  if (!validateRiderForm()) return;
  if (!selectedBranchId) { showToast("Select a branch before adding a rider."); return; }
  try {
    const created = await staffService.createStaff({ name: riderFormData.name.trim(), phone: riderFormData.phone, address: "", designation: "DELIVERY_STAFF", joiningDate: new Date().toISOString().split("T")[0], basicSalary: 0, salaryFrequency: "MONTHLY", allowance: 0, deduction: 0, branchId: selectedBranchId, active: true });
    setOwnRiders((prev) => [...prev, created]);
    setStaff((prev) => [...prev, created]);
    setIsRiderModalOpen(false);
    showToast(`Delivery rider '${created.name}' added successfully.`);
  } catch (e) { showToast((e && e.userFriendlyMessage) || "Unable to add delivery rider."); }
};
// Delivery Tracking History State
const [trackingTimeline, setTrackingTimeline] = useState({});
// Channel Management State & Configuration Modal


const [channels, setChannels] = useState(LEGACY_CHANNEL_RECORDS);
const [configuringChannel, setConfiguringChannel] = useState(null);
const [configFormData, setConfigFormData] = useState({
apiKey: "",
storeId: "",
status: "Connected",
});
// Menu Sync State
const [syncFilter, setSyncFilter] = useState("All");
const [isSyncing, setIsSyncing] = useState(false);


const [menuSyncData, setMenuSyncData] = useState(LEGACY_MENU_SYNC_RECORDS);
// Dynamic Graph Filter States for Dashboard and Reports
const [dashSalesRange, setDashSalesRange] = useState("Daily");
const [dashCardFilter, setDashCardFilter] = useState("ALL");
const [reportsTrendRange, setReportsTrendRange] = useState("Daily");
// Payments, Settlement & Reconciliation States
const [paymentFilter, setPaymentFilter] = useState("All");
const [settlementFilter, setSettlementFilter] = useState("All");


const [reconcileFilter, setReconcileFilter] = useState("All");
const [settlements, setSettlements] = useState([]);
const [reconciliations, setReconciliations] = useState([]);
const [deliveryAnalytics, setDeliveryAnalytics] = useState(null);
const [financeLoading, setFinanceLoading] = useState(false);


/* ============================================================
[FEATURE 2] LIVE DELIVERY TRACKING — REAL-TIME STATE
============================================================ */
const [isLiveTrackOpen, setIsLiveTrackOpen] = useState(false);
const [liveTrack, setLiveTrack] = useState(null);
const [gpsStatus, setGpsStatus] = useState("");
const openLiveTracking = (order) => {
  if (!order.storePos || !order.custPos) {
    showToast("Live GPS coordinates are not available for this order.");
    return;
  }
  const delivered = order.status === "Delivered";
  const startProgress = delivered ? 1 : 0;
  setLiveTrack({
    orderId: order.id, riderName: order.assignedRider || "Not assigned",
    riderPhone: ownRiders.find((r) => r.name === order.assignedRider)?.phone || "—",
    channel: order.channel, channelColor: order.channelColor, storePos: order.storePos, custPos: order.custPos,
    riderPos: order.storePos, progress: startProgress, speedKmh: 0, distanceKm: 0, etaMin: 0, lastPing: nowTime(), isLive: false, hasRider: Boolean(order.assignedRider)
  });
  setGpsStatus("GPS tracking requires real coordinates from the backend.");
  setIsLiveTrackOpen(true);
};
const closeLiveTracking = () => {
setIsLiveTrackOpen(false);
setLiveTrack(null);
setGpsStatus("");
};

useEffect(() => {
  let cancelled = false;
  const loadBackendData = async () => {
    try {
      const activeBranchId = contextBranchId || selectedBranchId;
      const results = await Promise.allSettled([
        deliveryService.getDeliveries(activeBranchId),
        orderService.getOrders(activeBranchId),
        branchService.getBranches(),
        staffService.getStaff(activeBranchId),
        kotService.getKots(activeBranchId),
        integrationService.getConnections(),
        deliveryService.getSettlements(),
        deliveryService.getReconciliation(),
        deliveryService.getAnalytics()
      ]);
      if (cancelled) return;
      const [deliveryResult, orderResult, branchResult, staffResult, kotResult, integrationResult, settlementResult, reconciliationResult, analyticsResult] = results;
      const deliveries = deliveryResult.status === "fulfilled" ? (deliveryResult.value || []) : [];
      const ordersRes = orderResult.status === "fulfilled" ? (orderResult.value || []) : [];
      const branchRes = branchResult.status === "fulfilled" ? (branchResult.value || []) : [];
      const staffRes = staffResult.status === "fulfilled" ? (staffResult.value || []) : [];
      const kotsRes = kotResult.status === "fulfilled" ? (kotResult.value || []) : [];
      const integrationRes = integrationResult.status === "fulfilled" ? (integrationResult.value || []) : [];
      setSettlements(settlementResult.status === "fulfilled" ? (settlementResult.value || []) : []);
      setReconciliations(reconciliationResult.status === "fulfilled" ? (reconciliationResult.value || []) : []);
      setDeliveryAnalytics(analyticsResult.status === "fulfilled" ? analyticsResult.value : null);
      if (branchRes.length > 0) setBranches(branchRes);
      else if (contextBranches && contextBranches.length > 0) setBranches(contextBranches);
      setStaff(staffRes); setKots(kotsRes); setIntegrations(integrationRes); setBackendOrders(ordersRes);
      const backendRiders = staffRes.filter((x) => { const d=String(x.designation || "").toUpperCase(); return x.active !== false && (d.includes("DELIVERY") || d.includes("DRIVER") || d.includes("RIDER")); });
      setOwnRiders(backendRiders.length > 0 ? backendRiders : LEGACY_OWN_RIDERS);
      const orderMap = new Map(ordersRes.map((x) => [x.id, x]));
      const mapStatus = (status) => ({ PENDING: "New", CONFIRMED: "New", ASSIGNED: "Ready", PREPARING: "Preparing", READY: "Ready", PICKED_UP: "Out for Delivery", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled" }[status] || "New");
      const backendMappedOrders = deliveries.map((d) => {
        const o = orderMap.get(d.orderId);
        const items = (o?.items || []).map((i) => ({ name: i.name, qty: i.quantity, price: i.unitPrice }));
        return {
          id: d.externalOrderId || d.orderNumber || `DEL${d.id}`,
          backendId: d.id,
          orderBackendId: d.orderId,
          kotId: kotsRes.find((k) => k.orderId === d.orderId)?.id,
          channel: d.externalPlatform === "ZOMATO" ? "Zomato" : d.externalPlatform === "SWIGGY" ? "Swiggy" : d.externalPlatform === "ONDC" ? "ONDC" : d.externalPlatform === "MAGICPIN" ? "Magicpin" : (d.externalPlatform || "Direct Delivery"),
          channelColor: d.externalPlatform === "ZOMATO" ? "#dc2626" : d.externalPlatform === "SWIGGY" ? "#f97316" : d.externalPlatform === "ONDC" ? "#2563eb" : d.externalPlatform === "MAGICPIN" ? "#16a34a" : "#2563eb",
          customer: d.customerName || o?.guestName || "Customer",
          phone: d.customerPhone || "N/A",
          address: d.address || "Main Address",
          itemsCount: items.length || 0,
          items,
          amount: Number(o?.totalAmount || d.deliveryCharge || 0),
          time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Today",
          status: mapStatus(d.status),
          backendStatus: d.status,
          assignedRider: d.staffName || null,
          assignedStaffId: d.assignedStaffId,
          paymentStatus: d.paymentStatus || o?.externalPaymentStatus || "PENDING",
          deliveryCharge: Number(d.deliveryCharge || 0),
          deliveryMode: d.deliveryMode,
          externalOrderId: d.externalOrderId,
          branchId: d.branchId,
          branchName: d.branchName,
          branchCode: d.branchCode,
          storePos: d.storeLatitude && d.storeLongitude ? { lat: Number(d.storeLatitude), lng: Number(d.storeLongitude) } : null,
          custPos: d.customerLatitude && d.customerLongitude ? { lat: Number(d.customerLatitude), lng: Number(d.customerLongitude) } : null
        };
      });

      if (backendMappedOrders.length > 0) {
        setOrders(backendMappedOrders);
        setSelectedOrderId((prev) => (backendMappedOrders.some((x) => x.id === prev) ? prev : backendMappedOrders[0].id));
      } else {
        setOrders([]);
        setSelectedOrderId("");
      }

      const platformMeta = [{platform:"ZOMATO",name:"Zomato"},{platform:"SWIGGY",name:"Swiggy"},{platform:"ONDC",name:"ONDC"},{platform:"MAGICPIN",name:"Magicpin"}];
      setChannels(() => {
        return platformMeta.map(({platform,name}) => {
          const c = integrationRes.find((x)=>x.platform===platform && (!activeBranchId || x.branchId===activeBranchId)) || integrationRes.find((x)=>x.platform===platform);
          const ds = deliveries.filter((d)=>d.externalPlatform===platform);
          return {
            name,
            platform,
            status: c?.status || "Not Connected",
            orders: ds.length,
            sales: ds.length ? `₹${ds.reduce((a,d)=>a+Number(orderMap.get(d.orderId)?.totalAmount||0),0).toFixed(2)}` : "₹0",
            sync: c?.lastSyncAt?new Date(c.lastSyncAt).toLocaleString():"-",
            apiKey:"",
            storeId: c?.externalOutletId || ""
          };
        });
      });
    } catch (e) {
      console.error("Delivery backend load failed", e);
      showToast("Unable to load delivery data from backend.");
    }
  };
  loadBackendData();
  return () => { cancelled = true; };
}, [contextBranchId, selectedBranchId]);

useEffect(() => {
if (!isLiveTrackOpen || !liveTrack || !liveTrack.isLive) return;
    const tick = setInterval(() => {
      setLiveTrack((prev) => {
        if (!prev || !prev.isLive) return prev;

        const totalKm = Math.max(haversineKm(prev.storePos, prev.custPos), 0.05);
        const speedKmh = Math.min(
          38,
          Math.max(14, prev.speedKmh + (Math.random() * 8 - 4)),
        );

        const stepKm = (speedKmh / 3600) * 2; // 2 second tick
        const progress = Math.min(1, prev.progress + stepKm / totalKm);
        const riderPos = interpolatePoint(prev.storePos, prev.custPos, progress);
        const distanceKm = haversineKm(riderPos, prev.custPos);
        const arrived = progress >= 1 || distanceKm < 0.03;

        return {
          ...prev,
          riderPos,
          progress,
          speedKmh: arrived ? 0 : speedKmh,
          distanceKm: arrived ? 0 : distanceKm,
          etaMin: arrived ? 0 : (distanceKm / speedKmh) * 60 + 1.5,
          lastPing: nowTime(),
          isLive: !arrived,
        };
      });
    }, 2000);

    return () => clearInterval(tick);
}, [isLiveTrackOpen, liveTrack?.orderId, liveTrack?.isLive]);
const handleUseDeviceGps = () => {
if (!navigator.geolocation) {
setGpsStatus("Geolocation is not supported on this device.");
return;
}
setGpsStatus("Fetching your live location…");
navigator.geolocation.getCurrentPosition(
(pos) => {
const custPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
setLiveTrack((prev) => {
if (!prev) return prev;
const riderPos = interpolatePoint(
prev.storePos,
custPos,
prev.progress,
);
const distanceKm = haversineKm(riderPos, custPos);
return {
...prev,
custPos,
riderPos,
distanceKm,
etaMin: prev.isLive
? (distanceKm / (prev.speedKmh || AVERAGE_SPEED_KMH)) * 60 + 1.5
: 0,
lastPing: nowTime(),
};
});
setGpsStatus(`Live GPS locked (±${Math.round(pos.coords.accuracy)} m)`);
},
() => setGpsStatus("Location permission denied — using stored address."),
{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
);
};
const getTrackMapPoints = (track) => {
if (!track) return null;
const { storePos, custPos, riderPos } = track;
    const minLat = Math.min(storePos.lat, custPos.lat);
    const maxLat = Math.max(storePos.lat, custPos.lat);
    const minLng = Math.min(storePos.lng, custPos.lng);
    const maxLng = Math.max(storePos.lng, custPos.lng);

    const padLat = (maxLat - minLat) * 0.3 || 0.008;
    const padLng = (maxLng - minLng) * 0.3 || 0.008;

    const project = (p) => ({
      x:
        ((p.lng - (minLng - padLng)) /
          (maxLng + padLng - (minLng - padLng))) *
        400,
      y:
        220 -
        ((p.lat - (minLat - padLat)) /
          (maxLat + padLat - (minLat - padLat))) *
          220,
    });

    return {
      store: project(storePos),
      cust: project(custPos),
      rider: project(riderPos),
    };
};
// Curve Graph Configuration Data Map
// Curve Graph Configuration Data Map
const curveGraphData = {
Daily: {
labels: [
"01 May",
"03 May",
"05 May",
"07 May",
"09 May",
"11 May",
"13 May",
"15 May",
"17 May",
"19 May",
"21 May",
"23 May",
"25 May",
"27 May",
"29 May",
],
path: "M 0 140 C 80 120, 160 110, 240 100 C 300 80, 360 10, 410 80 C 460 60, 480 50, 500 40",
dots: [
{ cx: 50, cy: 130 },
{ cx: 120, cy: 112 },
{ cx: 210, cy: 95 },
{ cx: 330, cy: 40 },
{ cx: 410, cy: 80 },
{ cx: 470, cy: 50 },
],
title: "Revenue (This Month - Daily)",
},
Weekly: {
labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
path: "M 0 130 C 100 110, 180 80, 250 90 C 330 100, 400 30, 500 20",
dots: [
{ cx: 70, cy: 120 },
{ cx: 180, cy: 80 },
{ cx: 310, cy: 95 },
{ cx: 440, cy: 25 },
],
title: "Revenue (This Month - Weekly)",
},
Monthly: {
labels: [
"Jan",
"Feb",
"Mar",
"Apr",
"May",
"Jun",
"Jul",
"Aug",
"Sep",
"Oct",
"Nov",
"Dec",
],
path: "M 0 150 C 100 120, 180 130, 260 70 C 350 20, 420 80, 500 30",
dots: [
{ cx: 80, cy: 130 },
{ cx: 180, cy: 130 },
{ cx: 280, cy: 60 },
{ cx: 380, cy: 40 },
{ cx: 470, cy: 35 },
],
title: "Revenue (This Year - Monthly)",
},
Yearly: {
labels: ["2022", "2023", "2024", "2025", "2026"],
path: "M 0 140 C 120 120, 220 90, 320 60 C 400 30, 450 20, 500 10",
dots: [
{ cx: 80, cy: 130 },
{ cx: 200, cy: 95 },
{ cx: 320, cy: 60 },
{ cx: 450, cy: 20 },
],
title: "Revenue (Multi-Year Growth)",
},
};
// Dynamic Handlers
const refreshFinance = async () => {
  setFinanceLoading(true);
  try {
    const [s1, r1, a1] = await Promise.all([
      deliveryService.getSettlements(),
      deliveryService.getReconciliation(),
      deliveryService.getAnalytics(),
    ]);
    setSettlements(s1 || []);
    setReconciliations(r1 || []);
    setDeliveryAnalytics(a1 || null);
  } catch (e) {
    console.error("Delivery finance refresh failed", e);
  } finally {
    setFinanceLoading(false);
  }
};

const handlePaymentStatusChange = async (order, status) => {
  if (!order?.backendId) {
    showToast("Payment can be changed only for backend orders.");
    return;
  }
  try {
    await deliveryService.updatePaymentStatus(order.backendId, status);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paymentStatus: status } : o));
    await refreshFinance();
    showToast(status === "PAID" ? `Order ${order.id} marked PAID. Settlement and reconciliation updated.` : `Order ${order.id} marked ${status}.`);
  } catch (e) {
    showToast((e && e.userFriendlyMessage) || e?.response?.data?.message || "Unable to update payment status.");
  }
};

const handleOrderStatusChange = async (id, newStatus) => {
  const order = orders.find((x) => x.id === id);
  if (!order) return;
  const statusMap = {
    New: "CONFIRMED",
    Preparing: "PREPARING",
    Ready: "READY",
    "Picked Up": "PICKED_UP",
    "Out for Delivery": "OUT_FOR_DELIVERY",
    Delivered: "DELIVERED",
    Cancelled: "CANCELLED",
  };
  try {
    if (order.backendId) {
      const target = statusMap[newStatus];
      if (newStatus === "Out for Delivery" && (order.backendStatus === "READY" || order.backendStatus === "ASSIGNED")) {
        await deliveryService.updateDeliveryStatus(order.backendId, "PICKED_UP").catch(() => {});
      }
      if (newStatus === "Preparing" && order.backendStatus === "PENDING") {
        await deliveryService.updateDeliveryStatus(order.backendId, "CONFIRMED").catch(() => {});
      }
      if (newStatus === "Delivered" && order.backendStatus !== "OUT_FOR_DELIVERY") {
        await deliveryService.updateDeliveryStatus(order.backendId, "OUT_FOR_DELIVERY").catch(() => {});
      }
      if (target) {
        await deliveryService.updateDeliveryStatus(order.backendId, target).catch((err) => {
          console.warn("Could not sync delivery status to backend:", err);
        });
      }
      if (order.kotId && (newStatus === "Preparing" || newStatus === "Ready")) {
        await kotService.updateKotStatus(order.kotId, newStatus === "Preparing" ? "PREPARING" : "READY").catch(() => {});
      }
      if (order.orderBackendId && order.channel !== "Direct Delivery") {
        if (newStatus === "New") await integrationService.sendOrderStatus(order.orderBackendId, "CONFIRM").catch(() => {});
        if (newStatus === "Ready") await integrationService.sendOrderStatus(order.orderBackendId, "READY").catch(() => {});
      }
    }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus, backendStatus: targetBackendStatus(newStatus), paymentStatus: o.paymentStatus } : o));
    setTrackingTimeline((prev) => {
      const existing = prev[id] || [{ step: "Order Placed", time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), status: "completed" }];
      const labels = {
        New: "Order Confirmed",
        Preparing: "Preparing",
        Ready: "Ready",
        "Picked Up": "Picked Up",
        "Out for Delivery": "Out for Delivery",
        Delivered: "Delivered",
      };
      const label = labels[newStatus];
      return label ? { ...prev, [id]: [...existing.filter((x) => x.step !== label), { step: label, time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), status: "completed" }] } : prev;
    });
    showToast(`Order ${id} status updated to: ${newStatus}`);
  } catch (e) {
    showToast((e && e.userFriendlyMessage) || "Status update failed.");
  }
};
const targetBackendStatus = (status) => ({ New:"CONFIRMED", Preparing:"PREPARING", Ready:"READY", "Out for Delivery":"OUT_FOR_DELIVERY", Delivered:"DELIVERED", Cancelled:"CANCELLED" }[status] || status);
const handleAssignRider = async (riderName, orderId) => {
  const order = orders.find((x) => x.id === orderId);
  const rider = staff.find((x) => x.name === riderName) || ownRiders.find((x) => x.name === riderName);
  if (!order || !rider) { showToast("Select a valid order and rider."); return; }
  try {
    if (order.backendId && rider.id && Number.isFinite(Number(rider.id))) {
      await deliveryService.assignRider(order.backendId, Number(rider.id));
    }
    setOwnRiders((prev) => prev.map((r) => r.name === riderName ? { ...r, status: "Busy" } : r));
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "Ready", assignedRider: riderName, assignedStaffId: Number.isFinite(Number(rider.id)) ? rider.id : o.assignedStaffId, backendStatus: order.backendId ? "ASSIGNED" : o.backendStatus } : o));
    showToast(order.backendId ? `Order ${orderId} assigned to Rider: ${riderName}` : `Demo order ${orderId} assigned locally to Rider: ${riderName}`);
  } catch (e) { showToast((e && e.userFriendlyMessage) || "Unable to assign rider."); }
};
const openConfigModal = (channel) => {
  setConfiguringChannel(channel);
  const platform = channel.platform || ({Zomato:"ZOMATO",Swiggy:"SWIGGY",ONDC:"ONDC",Magicpin:"MAGICPIN"}[channel.name]);
  const existing = integrations.find((x) => x.platform === platform && x.branchId === (selectedBranchId || x.branchId));
  setConfigFormData({ platform, apiKey:"", storeId:existing?.externalOutletId || channel.storeId || "", status:existing?.status || "SETUP_REQUIRED", branchId:existing?.branchId || selectedBranchId || "", apiBaseUrl:existing?.apiBaseUrl || "", testEndpoint:existing?.testEndpoint || "", confirmEndpoint:existing?.confirmEndpoint || "", readyEndpoint:existing?.readyEndpoint || "", statusEndpoint:existing?.statusEndpoint || "", apiSecret:"", externalAccountId:existing?.externalAccountId || "", externalOutletName:existing?.externalOutletName || "" });
};
const handleSaveConfig = async (e) => {
  e.preventDefault();
  if (!selectedBranchId && !configFormData.branchId) { showToast("Select a branch first."); return; }
  try {
    const payload={ branchId:Number(configFormData.branchId || selectedBranchId), externalOutletId:configFormData.storeId, externalOutletName:configFormData.externalOutletName, externalAccountId:configFormData.externalAccountId, apiBaseUrl:configFormData.apiBaseUrl, testEndpoint:configFormData.testEndpoint, confirmEndpoint:configFormData.confirmEndpoint, readyEndpoint:configFormData.readyEndpoint, statusEndpoint:configFormData.statusEndpoint, apiKey:configFormData.apiKey, apiSecret:configFormData.apiSecret, authType:"API_KEY" };
    const saved = await integrationService.connect({ ...payload, platform:configFormData.platform || configuringChannel?.platform || "ZOMATO" });
    setIntegrations((prev)=>[...prev.filter((x)=>x.id!==saved.id),saved]);
    setChannels((prev)=>prev.map(c=>c.platform===saved.platform?{...c,status:saved.status,sync:saved.lastSyncAt?new Date(saved.lastSyncAt).toLocaleString():c.sync,storeId:saved.externalOutletId||c.storeId}:c));
    showToast(`${configuringChannel.name} configuration saved successfully.`); setConfiguringChannel(null);
  } catch(e) { showToast((e&&e.userFriendlyMessage)||"Unable to save integration configuration."); }
};
const handleSyncNow = async () => {
  const platform=configuringChannel?.platform || "ZOMATO"; const c=integrations.find((x)=>x.platform===platform && x.branchId===selectedBranchId) || integrations.find((x)=>x.platform===platform);
  if (!c) { showToast("Configure the integration before syncing the menu."); return; }
  setIsSyncing(true); try { await integrationService.syncMenu(c.id); showToast(`${configuringChannel?.name || platform} menu sync completed.`); } catch(e) { showToast((e&&e.userFriendlyMessage)||"Menu sync failed."); } finally { setIsSyncing(false); }
};
const handleExportReport = () => {
showToast("Exporting Report... Download started!");
const csvContent =
"data:text/csv;charset=utf-8,Channel,Sales,Commission,Fees,Refund,Net\n" +
settlementList
.map((e) => `${e.ch},${e.s},${e.c},${e.f},${e.r},${e.net}`)
.join("\n");
const encodedUri = encodeURI(csvContent);
const link = document.createElement("a");
link.setAttribute("href", encodedUri);
link.setAttribute("download", `Sales_Report_${reportsTrendRange}.csv`);
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
};
const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || { id: "", channel: "Zomato", channelColor: "#dc2626", customer: "", phone: "", address: "", itemsCount: 0, items: [], amount: 0, time: "", date: "", status: "New", assignedRider: null, paymentStatus: "PENDING", backendId: null, orderBackendId: null, kotId: null };
const filteredOrders = orders.filter(
(o) =>
o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
o.channel.toLowerCase().includes(searchQuery.toLowerCase()),
);
const dashboardCardOrders = orders.filter((o) => {
if (dashCardFilter === "ALL") return true;
if (dashCardFilter === "New") return o.status === "New";
if (dashCardFilter === "Preparing") return o.status === "Preparing";
if (dashCardFilter === "Ready") return o.status === "Ready";
if (dashCardFilter === "Out for Delivery")
return o.status === "Out for Delivery";
if (dashCardFilter === "Cancelled") return o.status === "Cancelled";
return true;
});
const paymentsList = orders.map((o) => ({
id: o.id,
title: o.channel,
cond: String(o.paymentStatus || "PENDING").toUpperCase(),
ret: o.paymentStatus,
st: String(o.paymentStatus || "PENDING").toUpperCase() === "PAID" ? "Paid" : "Pending",
dt: o.date,
amount: o.amount,
deliveryStatus: o.status,
}));
const settlementList = settlements;
const reconciliationData = reconciliations;
const paidOrderTotal = orders.filter(o => String(o.paymentStatus || "PENDING").toUpperCase() === "PAID").reduce((a,o) => a + Number(o.amount || 0), 0);
const unpaidOrderTotal = orders.filter(o => String(o.paymentStatus || "PENDING").toUpperCase() !== "PAID").reduce((a,o) => a + Number(o.amount || 0), 0);
const settlementTotals = settlementList.reduce((a, r) => ({
  gross: a.gross + Number(r.grossAmount || 0),
  commission: a.commission + Number(r.commissionAmount || 0),
  fees: a.fees + Number(r.feeAmount || 0),
  refund: a.refund + Number(r.refundAmount || 0),
  net: a.net + Number(r.netAmount || 0),
}), { gross: 0, commission: 0, fees: 0, refund: 0, net: 0 });
const reconciliationTotals = reconciliationData.reduce((a, r) => {
  const key = String(r.status || "").toLowerCase();
  if (key === "matched") a.matched += 1;
  else if (key === "mismatched") a.mismatched += 1;
  else if (key === "pending") a.pending += 1;
  return a;
}, { matched: 0, mismatched: 0, pending: 0 });
const channelSharePercent = (name) => {
  const total = orders.length;
  if (!total) return 0;
  return Math.round((orders.filter((o) => o.channel === name).length / total) * 100);
};
const channelShareGradient = (() => {
  const names = ["Swiggy", "Zomato", "ONDC", "Magicpin"];
  const vals = names.map(n => channelSharePercent(n));
  let cursor = 0;
  const colors = ["#C25E00", "#3b82f6", "#84cc16", "#06b6d4"];
  const stops = names.map((n,i) => {
    const start = cursor; cursor += vals[i];
    return `${colors[i]} ${start}% ${cursor}%`;
  });
  if (!stops.length || cursor === 0) return "#EADFD9";
  return `conic-gradient(${stops.join(", ")})`;
})();
// Theme Config
const theme = {
bgApp: "#FAFAFA",
sidebarBg: "#3D1308",
sidebarHover: "#4D1B0E",
cardBg: "#FFFFFF",
accentOrange: "#C25E00",
accentDarkOrange: "#A53600",
accentLightOrange: "#FFF3EB",
textDark: "#2B1810",
textMuted: "#786862",
border: "#EADFD9",
borderActive: "#C25E00",
success: "#16A34A",
warning: "#D97706",
danger: "#DC2626",
};
const styles = {
container: {
backgroundColor: theme.bgApp,
color: theme.textDark,
fontFamily:
"'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
minHeight: "100vh",
padding: "4px 0 24px",
boxSizing: "border-box",
},
header: {
backgroundColor: theme.cardBg,
borderRadius: "16px",
padding: "20px 28px",
marginBottom: "20px",
border: `1px solid ${theme.border}`,
display: "flex",
justifyContent: "space-between",
alignItems: "center",
boxShadow: "0 4px 20px rgba(61, 19, 8, 0.04)",
},
titleGroup: { display: "flex", flexDirection: "column" },
title: {
fontSize: "22px",
fontWeight: "800",
margin: 0,
color: theme.sidebarBg,
letterSpacing: "-0.3px",
},
subtitle: {
fontSize: "13px",
color: theme.textMuted,
marginTop: "4px",
fontWeight: "600",
},
controlsGroup: { display: "flex", gap: "12px", alignItems: "center" },
badgeBtn: (active, color) => ({
padding: "8px 16px",
borderRadius: "24px",
border: `1px solid ${active ? color : theme.border}`,
backgroundColor: active ? `${color}15` : "#ffffff",
color: active ? color : theme.textMuted,
fontSize: "13px",
fontWeight: "700",
cursor: "pointer",
display: "flex",
alignItems: "center",
gap: "8px",
transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
}),
iconBtn: (active) => ({
padding: "10px",
borderRadius: "50%",
backgroundColor: active ? theme.sidebarBg : "#F5EFEB",
color: active ? "#ffffff" : theme.textMuted,
border: "none",
cursor: "pointer",
display: "flex",
alignItems: "center",
justifyContent: "center",
transition: "all 0.2s ease",
}),
navContainer: {
display: "flex",
gap: "8px",
overflowX: "auto",
paddingBottom: "12px",
marginBottom: "20px",
borderBottom: `1px solid ${theme.border}`,
scrollbarWidth: "none",
msOverflowStyle: "none",
},
navTab: (active) => ({
padding: "10px 18px",
borderRadius: "10px",
fontSize: "13px",
fontWeight: "700",
cursor: "pointer",
whiteSpace: "nowrap",
border: active ? "none" : `1px solid ${theme.border}`,
backgroundColor: active ? theme.accentOrange : theme.cardBg,
color: active ? "#ffffff" : theme.textDark,
boxShadow: active ? "0 4px 12px rgba(194, 94, 0, 0.25)" : "none",
transition: "all 0.2s ease",
}),
mainNavContainer: {
backgroundColor: theme.cardBg,
border: `1px solid ${theme.border}`,
borderRadius: "16px",
padding: "8px",
marginBottom: "14px",
display: "flex",
flexWrap: "nowrap",
gap: "8px",
overflowX: "auto",
overflowY: "hidden",
scrollbarWidth: "thin",
WebkitOverflowScrolling: "touch",
boxShadow: "0 2px 10px rgba(61, 19, 8, 0.03)",
flexShrink: 0,
},
mainNavTab: (active) => ({
display: "flex",
alignItems: "center",
justifyContent: "center",
gap: "7px",
padding: "9px 13px",
borderRadius: "10px",
fontSize: "13px",
fontWeight: "700",
cursor: "pointer",
border: active ? "none" : `1px solid transparent`,
backgroundColor: active ? theme.sidebarBg : "#FAF5F2",
color: active ? "#ffffff" : theme.textDark,
boxShadow: active ? "0 4px 14px rgba(61, 19, 8, 0.18)" : "none",
transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
outline: "none",
whiteSpace: "nowrap",
flex: "0 0 auto",
}),
subNavContainer: {
backgroundColor: theme.cardBg,
border: `1px solid ${theme.border}`,
borderRadius: "14px",
padding: "8px 14px",
marginBottom: "22px",
display: "flex",
alignItems: "center",
justifyContent: "flex-start",
gap: "8px",
overflowX: "auto",
scrollbarWidth: "none",
boxShadow: "0 2px 8px rgba(61, 19, 8, 0.02)",
},
subTab: (active) => ({
display: "inline-flex",
alignItems: "center",
gap: "6px",
padding: "8px 16px",
borderRadius: "8px",
fontSize: "12.5px",
fontWeight: active ? "800" : "600",
cursor: "pointer",
border: active
? `1.5px solid ${theme.accentOrange}`
: "1.5px solid transparent",
backgroundColor: active ? theme.accentLightOrange : "transparent",
color: active ? theme.accentDarkOrange : theme.textMuted,
boxShadow: active ? "0 2px 8px rgba(194, 94, 0, 0.12)" : "none",
transition: "all 0.15s ease",
whiteSpace: "nowrap",
outline: "none",
}),
subTabBadge: (active) => ({
padding: "2px 7px",
borderRadius: "12px",
fontSize: "10px",
fontWeight: "900",
backgroundColor: active ? theme.accentOrange : "#EADFD9",
color: active ? "#ffffff" : theme.sidebarBg,
marginLeft: "2px",
}),
cardGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
gap: "12px",
marginBottom: "20px",
},
card: (active) => ({
backgroundColor: active ? theme.accentLightOrange : theme.cardBg,
border: active
? `2px solid ${theme.accentOrange}`
: `1px solid ${theme.border}`,
borderRadius: "12px",
padding: "12px 10px",
boxShadow: active
? "0 6px 16px rgba(194, 94, 0, 0.12)"
: "0 2px 8px rgba(0,0,0,0.02)",
textAlign: "center",
cursor: "pointer",
transition: "all 0.2s ease",
}),
cardValue: {
fontSize: "26px",
fontWeight: "800",
marginTop: "6px",
color: theme.textDark,
},
cardLabel: {
fontSize: "11px",
color: theme.textMuted,
fontWeight: "800",
textTransform: "uppercase",
letterSpacing: "0.5px",
},
sectionBox: {
backgroundColor: theme.cardBg,
border: `1px solid ${theme.border}`,
borderRadius: "16px",
padding: "20px",
marginBottom: "20px",
boxShadow: "0 4px 12px rgba(61, 19, 8, 0.03)",
},
table: {
width: "100%",
borderCollapse: "separate",
borderSpacing: "0",
fontSize: "13px",
textAlign: "left",
},
th: {
backgroundColor: "#FAF5F2",
color: theme.sidebarBg,
padding: "12px 16px",
textTransform: "uppercase",
fontSize: "11px",
fontWeight: "800",
borderBottom: `2px solid ${theme.border}`,
letterSpacing: "0.5px",
},
td: {
padding: "14px 16px",
borderBottom: `1px solid ${theme.border}`,
color: theme.textDark,
verticalAlign: "middle",
},
actionBtn: (bgColor, textColor) => ({
padding: "8px 16px",
borderRadius: "8px",
background: bgColor || theme.accentOrange,
color: textColor || "#ffffff",
border: "none",
fontWeight: "700",
fontSize: "12px",
cursor: "pointer",
marginRight: "6px",
boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
transition: "all 0.1s ease",
}),
statusTag: (status) => {
let bg = "#F5EFEB",
color = theme.textMuted;
if (status === "New" || status === "Pending" || status === "SETUP_REQUIRED") {
bg = "#FEF3C7";
color = "#D97706";
} else if (status === "Preparing" || status === "Mismatched") {
bg = "#FEE2E2";
color = "#DC2626";
} else if (
status === "Ready" ||
status === "Connected" ||
status === "CONNECTED" ||
status === "ACTIVE" ||
status === "Success" ||
status === "Delivered" ||
status === "Matched" ||
status === "Paid"
) {
bg = "#DCFCE7";
color = "#15803D";
} else if (status === "Out for Delivery") {
bg = "#F3E8FF";
color = "#7E22CE";
} else if (
status === "Cancelled" ||
status === "Disconnected" ||
status === "Failed" ||
status === "Missing"
) {
bg = "#FEF2F2";
color = "#991B1B";
}
return {
padding: "4px 12px",
borderRadius: "20px",
fontSize: "11px",
fontWeight: "800",
backgroundColor: bg,
color: color,
display: "inline-block",
};
},
/* ============================================================
[FEATURE 2] NEW STYLES — live tracking modal
============================================================ */
modalOverlay: {
position: "fixed",
inset: 0,
backgroundColor: "rgba(61, 19, 8, 0.65)",
display: "flex",
alignItems: "center",
justifyContent: "center",
zIndex: 10000,
padding: "20px",
backdropFilter: "blur(2px)",
},
modalCard: {
backgroundColor: "#ffffff",
borderRadius: "18px",
padding: "24px",
width: "100%",
maxWidth: "920px",
maxHeight: "92vh",
overflowY: "auto",
boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
boxSizing: "border-box",
},
metricTile: {
backgroundColor: "#FAF5F2",
border: `1px solid ${theme.border}`,
borderRadius: "12px",
padding: "12px 14px",
flex: 1,
minWidth: "110px",
},
metricLabel: {
fontSize: "10.5px",
fontWeight: "800",
letterSpacing: "0.6px",
textTransform: "uppercase",
color: theme.textMuted,
},
metricValue: {
fontSize: "20px",
fontWeight: "800",
color: theme.sidebarBg,
marginTop: "4px",
},
liveBadge: (isLive) => ({
display: "inline-flex",
alignItems: "center",
gap: "6px",
padding: "3px 10px",
borderRadius: "20px",
fontSize: "10.5px",
fontWeight: "900",
letterSpacing: "0.5px",
backgroundColor: isLive ? "#DCFCE7" : "#F1F5F9",
color: isLive ? "#15803D" : "#64748B",
}),
liveDot: (isLive) => ({
width: "7px",
height: "7px",
borderRadius: "50%",
backgroundColor: isLive ? theme.success : "#94A3B8",
display: "inline-block",
}),
};
const totalSyncItems = menuSyncData.reduce(
(acc, curr) =>
acc + curr.syncedItems + curr.pendingItems + curr.failedItems,
0,
);
const syncedItemsCount = menuSyncData.reduce(
(acc, curr) => acc + curr.syncedItems,
0,
);
const pendingItemsCount = menuSyncData.reduce(
(acc, curr) => acc + curr.pendingItems,
0,
);
const failedItemsCount = menuSyncData.reduce(
(acc, curr) => acc + curr.failedItems,
0,
);
// Curve Graph Component
const renderCurveGraph = (currentRange, setRangeHandler) => {
const activeData = curveGraphData[currentRange] || curveGraphData.Daily;
return (
<div>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "16px",
}}
>
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<h3
style={{
margin: 0,
fontSize: "16px",
color: theme.sidebarBg,
fontWeight: "800",
}}
>
Overview
</h3>
<span
style={{
color: theme.accentOrange,
fontWeight: "800",
fontSize: "15px",
}}
>
{activeData.title}
</span>
</div>
<select
value={currentRange}
onChange={(e) => {
setRangeHandler(e.target.value);
showToast(`Graph changed to: ${e.target.value}`);
}}
style={{
padding: "6px 14px",
borderRadius: "20px",
border: `1px solid ${theme.border}`,
fontSize: "12px",
fontWeight: "700",
outline: "none",
cursor: "pointer",
backgroundColor: "#fff",
color: theme.sidebarBg,
}}
>
<option value="Daily">Daily</option>
<option value="Weekly">Weekly</option>
<option value="Monthly">Monthly</option>
<option value="Yearly">Yearly</option>
</select>
</div>
<div
style={{
position: "relative",
height: "220px",
width: "100%",
padding: "10px 0",
}}
>
<svg
viewBox="0 0 500 180"
style={{ width: "100%", height: "100%", overflow: "visible" }}
>
<defs>
<linearGradient id="ajalkarGrad" x1="0" y1="0" x2="0" y2="1">
<stop
offset="0%"
stopColor={theme.accentOrange}
stopOpacity="0.35"
/>
<stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
</linearGradient>
</defs>
<line
x1="0"
y1="30"
x2="500"
y2="30"
stroke="#F1F5F9"
strokeDasharray="4,4"
strokeWidth="1.5"
/>
<line
x1="0"
y1="80"
x2="500"
y2="80"
stroke="#F1F5F9"
strokeDasharray="4,4"
strokeWidth="1.5"
/>
<line
x1="0"
y1="130"
x2="500"
y2="130"
stroke="#F1F5F9"
strokeDasharray="4,4"
strokeWidth="1.5"
/>
<path
d={`${activeData.path} L 500 180 L 0 180 Z`}
fill="url(#ajalkarGrad)"
/>
<path
d={activeData.path}
fill="none"
stroke={theme.accentOrange}
strokeWidth="3.5"
strokeLinecap="round"
/>
{activeData.dots.map((dot, idx) => (
<g key={idx}>
<circle
cx={dot.cx}
cy={dot.cy}
r="5"
fill={theme.accentOrange}
/>
<circle cx={dot.cx} cy={dot.cy} r="2.5" fill="#ffffff" />
</g>
))}
</svg>
{activeData.labels.length === 0 && <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: "13px", fontWeight: "700" }}>No report data available</div>}
<div
style={{
display: "flex",
justifyContent: "space-between",
marginTop: "8px",
fontSize: "11px",
color: theme.textMuted,
fontWeight: "600",
}}
>
{activeData.labels.map((lbl, idx) => (
<span key={idx}>{lbl}</span>
))}
</div>
</div>
</div>
);
};
// Definition of Main Operational Sections and their respective Sub-sections
const mainSections = [
{
id: "dashboard",
label: "Dashboard",
icon: (
<svg
width="17"
height="17"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2.2"
strokeLinecap="round"
strokeLinejoin="round"
>
<rect width="7" height="9" x="3" y="3" rx="1" />
<rect width="7" height="5" x="14" y="3" rx="1" />
<rect width="7" height="9" x="14" y="12" rx="1" />
<rect width="7" height="5" x="3" y="16" rx="1" />
</svg>
),
defaultTab: "1",
subTabs: [],
},
{
id: "orders",
label: "Order Summary",
badge:
orders.filter((o) => o.status === "New").length > 0
? `${orders.filter((o) => o.status === "New").length} New`
: null,
icon: (
<svg
width="17"
height="17"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2.2"
strokeLinecap="round"
strokeLinejoin="round"
>
<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
<path d="M3 6h18" />
<path d="M16 10a4 4 0 0 1-8 0" />
</svg>
),
defaultTab: "2",
subTabs: [
{
id: "2",
label: "New Order",
count: orders.filter((o) => o.status === "New").length,
},
{ id: "3", label: "2. Order Details" },
{
id: "4",
label: "Order Prep & Status",
count: orders.filter((o) => o.status === "Preparing").length,
},
{ id: "5", label: "4. Delivery Assignment" },
{ id: "6", label: "5. Delivery Tracking" },
],
},
{
id: "config",
label: "Configuration",
icon: (
<svg
width="17"
height="17"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2.2"
strokeLinecap="round"
strokeLinejoin="round"
>
<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
<circle cx="12" cy="12" r="3" />
</svg>
),
defaultTab: "7",
subTabs: [
{ id: "7", label: "1. Channel Management" },
{ id: "8", label: "2. Menu Sync" },
],
},
{
id: "payments",
label: "Payment Reconciliation",
icon: (
<svg
width="17"
height="17"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2.2"
strokeLinecap="round"
strokeLinejoin="round"
>
<rect width="20" height="14" x="2" y="5" rx="2" />
<line x1="2" x2="22" y1="10" y2="10" />
</svg>
),
defaultTab: "9",
subTabs: [
{ id: "9", label: "1. Payment" },
{ id: "10", label: "2. Settlement" },
{ id: "11", label: "3. Reconciliation" },
{ id: "12", label: "4. Reports & Analytics" },
],
},
{
id: "reports",
label: "Report and Analytics",
icon: (
<svg
width="17"
height="17"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2.2"
strokeLinecap="round"
strokeLinejoin="round"
>
<line x1="3" y1="3" x2="3" y2="21" />
<line x1="3" y1="21" x2="21" y2="21" />
<rect x="7" y="13" width="3" height="5" />
<rect x="12" y="9" width="3" height="9" />
<rect x="17" y="5" width="3" height="13" />
</svg>
),
defaultTab: "12",
subTabs: [],
},
];
const getActiveMainSectionId = () => {
if (["2", "3", "4", "5", "6"].includes(activeTab)) return "orders";
if (["7", "8"].includes(activeTab)) return "config";
if (["9", "10", "11"].includes(activeTab)) return "payments";
if (activeTab === "12") return "reports";
return "dashboard";
};
const activeMainSectionId = getActiveMainSectionId();
const currentMainSection =
mainSections.find((s) => s.id === activeMainSectionId) || mainSections[0];
const handleMainSectionClick = (section) => {
const subTabs = section.subTabs || [];
const hasCurrentTab = subTabs.some((t) => t.id === activeTab);
if (!hasCurrentTab) {
setActiveTab(section.defaultTab);
}
};
return (
<div style={styles.container}>
<style>{`input:focus, select:focus { border-color: ${theme.accentOrange} !important; outline: none; } @keyframes ajalkarFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .ajalkar-modal-in { animation: ajalkarFade 0.22s ease-out; }`}</style>
      {/* Toast Alert Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: theme.sidebarBg,
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "10px",
            zIndex: 9999,
            fontWeight: "700",
            boxShadow: "0 8px 24px rgba(61,19,8,0.25)",
            borderLeft: `4px solid ${theme.accentOrange}`,
          }}
        >
          {toast}
        </div>
      )}

      {/* HEADER NAVIGATION */}
      <header style={styles.header}>
        <div style={styles.titleGroup}>
          <h1 style={styles.title}>
            Online Delivery Multi-Channel POS Dashboard
          </h1>
          <span style={styles.subtitle}>
            All-in-One Live Aggregator & KDS Operational System
          </span>
        </div>
        <div style={styles.controlsGroup}>
          <button
            style={styles.badgeBtn(true, theme.accentOrange)}
            onClick={() => setIsTestOrderModalOpen(true)}
            title="Create a local test order without real platform credentials"
          >
            + Create Test Order
          </button>
          <button
            style={styles.badgeBtn(true, theme.sidebarBg)}
            onClick={() => window.location.reload()}
            title="Refresh delivery records from backend"
          >
            Refresh
          </button>
          <button
            style={styles.badgeBtn(realtime, theme.success)}
            onClick={() => {
              setRealtime(!realtime);
              showToast(`Live Sync: ${!realtime ? "ON" : "PAUSED"}`);
            }}
          >
            {realtime ? "Live Sync ON" : "Sync Paused"}
          </button>
          <button
            style={styles.badgeBtn(soundEnabled, theme.sidebarBg)}
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              showToast(`Audio: ${!soundEnabled ? "Sound On" : "Muted"}`);
            }}
          >
            {soundEnabled ? "Sound On" : "Muted"}
          </button>
        </div>
      </header>

      {/* 1. TOP-LEVEL MAIN SECTIONS BAR */}
      <div style={styles.mainNavContainer}>
        {mainSections.map((sec) => {
          const isMainActive = activeMainSectionId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => handleMainSectionClick(sec)}
              style={styles.mainNavTab(isMainActive)}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                {sec.icon}
              </span>
              <span>{sec.label}</span>
              {sec.badge && (
                <span
                  style={{
                    backgroundColor: isMainActive
                      ? theme.accentOrange
                      : theme.sidebarBg,
                    color: "#ffffff",
                    fontSize: "10.5px",
                    fontWeight: "900",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    marginLeft: "4px",
                  }}
                >
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. SECONDARY SUB-TABS BAR */}
      {currentMainSection &&
        currentMainSection.subTabs &&
        currentMainSection.subTabs.length > 0 && (
          <div style={styles.subNavContainer}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  color: theme.textMuted,
                  marginRight: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                {currentMainSection.label.replace(/^[0-9.]+\s*/, "")} Tabs:
              </span>
              {currentMainSection.subTabs.map((st) => {
                const isSubActive = activeTab === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveTab(st.id)}
                    style={styles.subTab(isSubActive)}
                  >
                    <span>{st.label}</span>
                    {typeof st.count === "number" && st.count > 0 && (
                      <span style={styles.subTabBadge(isSubActive)}>
                        {st.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* SCREEN 1: ONLINE DASHBOARD */}
      {activeTab === "1" && (
        <div>
          <div style={styles.cardGrid}>
            <div
              style={styles.card(dashCardFilter === "ALL")}
              onClick={() => {
                setDashCardFilter("ALL");
                showToast("Showing All Orders");
              }}
            >
              <div style={styles.cardLabel}>Total Orders</div>
              <div style={styles.cardValue}>{orders.length}</div>
            </div>
            <div
              style={styles.card(dashCardFilter === "New")}
              onClick={() => {
                setDashCardFilter("New");
                showToast("Filtered by Pending Orders");
              }}
            >
              <div style={styles.cardLabel}>Pending</div>
              <div style={styles.cardValue}>
                {orders.filter((o) => o.status === "New").length}
              </div>
            </div>
            <div
              style={styles.card(dashCardFilter === "Preparing")}
              onClick={() => {
                setDashCardFilter("Preparing");
                showToast("Filtered by Active KDS Orders");
              }}
            >
              <div style={styles.cardLabel}>Active KDS</div>
              <div style={{ ...styles.cardValue, color: theme.success }}>
                {orders.filter((o) => o.status === "Preparing").length}
              </div>
            </div>
            <div
              style={styles.card(dashCardFilter === "Ready")}
              onClick={() => {
                setDashCardFilter("Ready");
                showToast("Filtered by Ready Orders");
              }}
            >
              <div style={styles.cardLabel}>Ready</div>
              <div style={styles.cardValue}>
                {orders.filter((o) => o.status === "Ready").length}
              </div>
            </div>
            <div
              style={styles.card(dashCardFilter === "Out for Delivery")}
              onClick={() => {
                setDashCardFilter("Out for Delivery");
                showToast("Filtered by Dispatched Orders");
              }}
            >
              <div style={styles.cardLabel}>Dispatched</div>
              <div style={styles.cardValue}>
                {orders.filter((o) => o.status === "Out for Delivery").length}
              </div>
            </div>
            <div
              style={styles.card(dashCardFilter === "Cancelled")}
              onClick={() => {
                setDashCardFilter("Cancelled");
                showToast("Filtered by Cancelled Orders");
              }}
            >
              <div style={styles.cardLabel}>Cancelled</div>
              <div style={{ ...styles.cardValue, color: theme.danger }}>
                {orders.filter((o) => o.status === "Cancelled").length}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={styles.sectionBox}>
              {renderCurveGraph(dashSalesRange, setDashSalesRange)}
            </div>
            <div style={styles.sectionBox}>
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "15px",
                  color: theme.sidebarBg,
                  fontWeight: "800",
                }}
              >
                Channel Share
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "180px",
                }}
              >
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    background: channelShareGradient,
                  }}
                ></div>
                <div style={{ fontSize: "12px", lineHeight: "2.0" }}>
                  <div style={{ color: theme.accentOrange, fontWeight: "700" }}>
                    Swiggy
                  </div>
                  <div style={{ color: "#dc2626", fontWeight: "700" }}>
                    Zomato
                  </div>
                  <div style={{ color: "#2563eb", fontWeight: "700" }}>
                    ONDC Direct
                  </div>
                  <div style={{ color: "#10b981", fontWeight: "700" }}>
                    Others
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={styles.sectionBox}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  color: theme.sidebarBg,
                  fontWeight: "800",
                }}
              >
                Recent Orders Feed
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: theme.accentOrange,
                }}
              >
                Filter: {dashCardFilter} ({dashboardCardOrders.length})
              </span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order ID</th>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardCardOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedOrderId(ord.id);
                      setActiveTab("3");
                    }}
                  >
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: "800",
                        color: theme.accentOrange,
                      }}
                    >
                      {ord.id}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        color: ord.channelColor,
                        fontWeight: "800",
                      }}
                    >
                      {ord.channel}
                    </td>
                    <td style={styles.td}>{ord.customer}</td>
                    <td style={styles.td}>{ord.itemsCount} Items</td>
                    <td style={{ ...styles.td, fontWeight: "800" }}>
                      ₹{ord.amount}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusTag(ord.status)}>
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 2: NEW ORDERS */}
      {activeTab === "2" && (
        <div style={styles.sectionBox}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Search Order ID, Customer, Channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "#fff",
                border: `1px solid ${theme.border}`,
                padding: "10px 18px",
                borderRadius: "10px",
                color: theme.textDark,
                width: "320px",
                outline: "none",
                fontWeight: "500",
              }}
            />
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Order ID</th>
                <th style={styles.th}>Channel</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Delivery</th>
                <th style={styles.th}>Payment</th>
                <th style={styles.th}>Time</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => (
                <tr key={ord.id}>
                  <td
                    style={{
                      ...styles.td,
                      fontWeight: "800",
                      color: theme.accentOrange,
                    }}
                  >
                    {ord.id}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{ color: ord.channelColor, fontWeight: "800" }}
                    >
                      {ord.channel}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: "600" }}>
                    {ord.customer}
                  </td>
                  <td style={styles.td}>{ord.itemsCount}</td>
                  <td
                    style={{
                      ...styles.td,
                      fontWeight: "800",
                      color: theme.sidebarBg,
                    }}
                  >
                    ₹{ord.amount}
                  </td>
                  <td style={styles.td}><span style={styles.statusTag(ord.status)}>{ord.status}</span></td>
                  <td style={styles.td}><span style={styles.statusTag(String(ord.paymentStatus || "PENDING").toUpperCase() === "PAID" ? "Ready" : "New")}>{String(ord.paymentStatus || "PENDING").toUpperCase() === "PAID" ? "PAID" : "PENDING"}</span></td>
                  <td style={{ ...styles.td, color: theme.textMuted }}>
                    {ord.time}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedOrderId(ord.id);
                          setActiveTab("3");
                          showToast(`Opening Order ${ord.id}`);
                        }}
                        style={{
                          ...styles.actionBtn(
                            theme.accentLightOrange,
                            theme.accentDarkOrange,
                          ),
                          marginRight: 0,
                          border: `1px solid ${theme.accentOrange}`,
                          boxShadow: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.accentOrange;
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            theme.accentLightOrange;
                          e.currentTarget.style.color = theme.accentDarkOrange;
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SCREEN 3: ORDER DETAILS */}
      {activeTab === "3" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  color: theme.sidebarBg,
                  fontWeight: "800",
                }}
              >
                Order ID: {selectedOrder.id}
              </h2>
            </div>
          </div>
          <div>
            {/* CUSTOMER DETAILS */}
            <div style={styles.sectionBox}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h4
                  style={{
                    color: theme.textMuted,
                    margin: "0 0 12px 0",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  CUSTOMER DETAILS
                </h4>
                <span style={styles.statusTag(selectedOrder.status)}>
                  {selectedOrder.status}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: theme.accentLightOrange,
                    color: theme.accentOrange,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                  }}
                >
                  {selectedOrder.customer.charAt(0)}
                </div>
                <div></div>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "15px" }}>
                    {selectedOrder.customer}
                  </div>
                  <div style={{ fontSize: "12px", color: theme.textMuted }}>
                    {selectedOrder.phone}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: theme.textDark,
                  lineHeight: "1.5",
                  padding: "12px",
                  backgroundColor: "#FAF5F2",
                  borderRadius: "8px",
                  border: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                {/* --- LOCATION ICON NOW OPENS LIVE TRACKING --- */}
                <button
                  type="button"
                  title="Live Track Delivery"
                  onClick={() => openLiveTracking(selectedOrder)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px",
                    margin: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.accentOrange,
                    flexShrink: 0,
                    transition: "transform 0.15s ease, color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.15)";
                    e.currentTarget.style.color = theme.accentDarkOrange;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.color = theme.accentOrange;
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </button>
                <span style={{ flex: 1 }}>{selectedOrder.address}</span>
              </div>
            </div>

            {/* PAYMENT & TIME */}
            <div style={styles.sectionBox}>
              <h4
                style={{
                  color: theme.textMuted,
                  margin: "0 0 12px 0",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                PAYMENT & TIME
              </h4>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                <span>Payment Mode:</span>
                <span
                  style={{
                    fontWeight: "700",
                    color:
                      String(selectedOrder.paymentStatus || "").toUpperCase() === "PAID"
                        ? theme.success
                        : theme.warning,
                  }}
                >
                  {String(selectedOrder.paymentStatus || "").toUpperCase() === "PAID"
                    ? "Online Paid"
                    : "Pending"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span>Order Time:</span>
                <span style={{ fontWeight: "600" }}>{selectedOrder.date}</span>
              </div>
              {selectedOrder.backendId && (
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>Payment Status</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="button"
                      disabled={String(selectedOrder.paymentStatus || "").toUpperCase() === "PAID"}
                      onClick={() => handlePaymentStatusChange(selectedOrder, "PAID")}
                      style={{ ...styles.actionBtn(theme.success, "#fff"), marginRight: 0, opacity: String(selectedOrder.paymentStatus || "").toUpperCase() === "PAID" ? .55 : 1 }}>
                      Mark Paid
                    </button>
                    <button type="button"
                      disabled={String(selectedOrder.paymentStatus || "").toUpperCase() !== "PAID"}
                      onClick={() => handlePaymentStatusChange(selectedOrder, "PENDING")}
                      style={{ ...styles.actionBtn("#F59E0B", "#fff"), marginRight: 0, opacity: String(selectedOrder.paymentStatus || "").toUpperCase() !== "PAID" ? .55 : 1 }}>
                      Mark Unpaid
                    </button>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: theme.textMuted }}>
                    Delivery status and payment status are independent. Delivered does not automatically mean Paid.
                  </div>
                </div>
              )}
            </div>

            {/* ORDER SUMMARY */}
            <div style={styles.sectionBox}>
              <h4
                style={{
                  color: theme.textMuted,
                  margin: "0 0 14px 0",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                ORDER SUMMARY
              </h4>
              {selectedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  <span style={{ fontWeight: "600" }}>
                    {item.qty}x {item.name}
                  </span>
                  <span style={{ fontWeight: "800" }}>₹{item.price}</span>
                </div>
              ))}
              <div
                style={{
                  marginTop: "14px",
                  fontSize: "13px",
                  lineHeight: "2.0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: theme.textMuted,
                  }}
                >
                  <span>Item Total</span>
                  <span>₹{selectedOrder.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: theme.textMuted,
                  }}
                >
                  <span>Delivery Fee</span>
                  <span>₹{Number(selectedOrder.deliveryCharge || 0).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: theme.textMuted,
                  }}
                >
                  <span>Platform Fee</span>
                  <span>—</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    fontSize: "16px",
                    borderTop: `2px solid ${theme.border}`,
                    paddingTop: "8px",
                    marginTop: "8px",
                    color: theme.sidebarBg,
                  }}
                >
                  <span>Grand Total</span>
                  <span>₹{selectedOrder.amount}</span>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  handleOrderStatusChange(selectedOrder.id, "New");
                  setKdsFilter("New");
                  setActiveTab("4");
                }}
                style={{
                  ...styles.actionBtn(theme.success),
                  flex: 1,
                  padding: "14px",
                  fontSize: "14px",
                  marginRight: 0,
                }}
              >
                Accept Order
              </button>
              <button
                onClick={() =>
                  handleOrderStatusChange(selectedOrder.id, "Cancelled")
                }
                style={{
                  ...styles.actionBtn(theme.danger),
                  flex: 1,
                  padding: "14px",
                  fontSize: "14px",
                  marginRight: 0,
                }}
              >
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: KITCHEN KDS */}
      {activeTab === "4" && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {["All", "New", "Preparing", "Ready"].map((filter) => (
              <button
                key={filter}
                onClick={() => setKdsFilter(filter)}
                style={styles.badgeBtn(
                  kdsFilter === filter,
                  theme.accentOrange,
                )}
              >
                {filter} Orders (
                {
                  orders.filter((o) =>
                    filter === "All" ? true : o.status === filter,
                  ).length
                }
                )
              </button>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                kdsFilter === "All" ? "repeat(3, 1fr)" : "1fr",
              gap: "20px",
            }}
          >
            {(kdsFilter === "All" || kdsFilter === "New") && (
              <div style={styles.sectionBox}>
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    borderBottom: `2px solid ${theme.border}`,
                    paddingBottom: "10px",
                    fontSize: "15px",
                    fontWeight: "800",
                    color: theme.sidebarBg,
                  }}
                >
                  New Orders ({orders.filter((o) => o.status === "New").length})
                </h3>
                {orders
                  .filter((o) => o.status === "New")
                  .map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        backgroundColor: "#FAF5F2",
                        border: `1px solid ${theme.border}`,
                        padding: "14px",
                        borderRadius: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{ fontWeight: "800", color: theme.sidebarBg }}
                      >
                        {ord.id}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: ord.channelColor,
                          fontWeight: "700",
                        }}
                      >
                        {ord.channel}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          marginTop: "4px",
                        }}
                      >
                        {ord.customer}
                      </div>
                      <div style={{ fontSize: "12px", color: theme.textMuted }}>
                        {ord.itemsCount} Items
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          style={{ fontSize: "11px", color: theme.textMuted }}
                        >
                          {ord.time}
                        </span>
                        <button
                          onClick={() =>
                            handleOrderStatusChange(ord.id, "Preparing")
                          }
                          style={styles.actionBtn(theme.success)}
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {(kdsFilter === "All" || kdsFilter === "Preparing") && (
              <div style={styles.sectionBox}>
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    borderBottom: `2px solid ${theme.border}`,
                    paddingBottom: "10px",
                    fontSize: "15px",
                    fontWeight: "800",
                    color: theme.sidebarBg,
                  }}
                >
                  Preparing Orders (
                  {orders.filter((o) => o.status === "Preparing").length})
                </h3>
                {orders
                  .filter((o) => o.status === "Preparing")
                  .map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        backgroundColor: "#FAF5F2",
                        border: `1px solid ${theme.border}`,
                        padding: "14px",
                        borderRadius: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{ fontWeight: "800", color: theme.sidebarBg }}
                      >
                        {ord.id}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: ord.channelColor,
                          fontWeight: "700",
                        }}
                      >
                        {ord.channel}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          marginTop: "4px",
                        }}
                      >
                        {ord.customer}
                      </div>
                      <div style={{ fontSize: "12px", color: theme.textMuted }}>
                        {ord.itemsCount} Items
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          style={{ fontSize: "11px", color: theme.textMuted }}
                        >
                          {ord.time}
                        </span>
                        <button
                          onClick={() =>
                            handleOrderStatusChange(ord.id, "Ready")
                          }
                          style={styles.actionBtn(theme.success)}
                        >
                          Ready
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {(kdsFilter === "All" || kdsFilter === "Ready") && (
              <div style={styles.sectionBox}>
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    borderBottom: `2px solid ${theme.border}`,
                    paddingBottom: "10px",
                    fontSize: "15px",
                    fontWeight: "800",
                    color: theme.sidebarBg,
                  }}
                >
                  Ready Orders (
                  {orders.filter((o) => o.status === "Ready").length})
                </h3>
                {orders
                  .filter((o) => o.status === "Ready")
                  .map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        backgroundColor: "#FAF5F2",
                        border: `1px solid ${theme.border}`,
                        padding: "14px",
                        borderRadius: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{ fontWeight: "800", color: theme.sidebarBg }}
                      >
                        {ord.id}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: ord.channelColor,
                          fontWeight: "700",
                        }}
                      >
                        {ord.channel}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          marginTop: "4px",
                        }}
                      >
                        {ord.customer}
                      </div>
                      <div style={{ fontSize: "12px", color: theme.textMuted }}>
                        {ord.itemsCount} Items
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          style={{ fontSize: "11px", color: theme.textMuted }}
                        >
                          {ord.time}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab("5");
                          }}
                          style={styles.actionBtn(theme.accentOrange)}
                        >
                          Assign Rider
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 5: DELIVERY ASSIGNMENT */}
      {activeTab === "5" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            5. Delivery Assignment
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr",
              gap: "20px",
            }}
          >
            <div style={styles.sectionBox}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setRiderTab("Platform")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      backgroundColor:
                        riderTab === "Platform"
                          ? theme.accentOrange
                          : "#F5EFEB",
                      color: riderTab === "Platform" ? "#fff" : theme.textMuted,
                    }}
                  >
                    Platform Rider
                  </button>
                  <button
                    onClick={() => setRiderTab("Own")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      backgroundColor:
                        riderTab === "Own" ? theme.sidebarBg : "#F5EFEB",
                      color: riderTab === "Own" ? "#fff" : theme.textMuted,
                    }}
                  >
                    Own Rider
                  </button>
                </div>
                <button
                  onClick={handleOpenRiderModal}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    backgroundColor:
                      riderTab === "Own" ? theme.sidebarBg : theme.accentOrange,
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <span style={{ fontSize: "16px", lineHeight: "0" }}>+</span>
                  Add {riderTab === "Own" ? "Own" : "Platform"} Rider
                </button>
              </div>

              {riderTab === "Own" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {ownRiders.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <img
                          src={r.avatar}
                          alt={r.name}
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "15px" }}>
                            {r.name}
                          </div>
                          <div
                            style={{ fontSize: "13px", color: theme.textMuted }}
                          >
                            {r.phone}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "24px",
                        }}
                      >
                        <span
                          style={styles.statusTag(
                            r.status === "Available" ? "Ready" : "Cancelled",
                          )}
                        >
                          {r.status}
                        </span>
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "13px",
                            color: theme.sidebarBg,
                          }}
                        >
                          {r.dist}
                        </span>
                        <button
                          onClick={() => {
                            handleAssignRider(r.name, selectedOrder.id);
                            setActiveTab("6");
                          }}
                          style={{
                            padding: "8px 22px",
                            borderRadius: "8px",
                            backgroundColor: theme.accentOrange,
                            color: "#fff",
                            border: "none",
                            fontWeight: "700",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {riderTab === "Platform" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {platformRiders.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "15px" }}>
                          {r.name}
                        </div>
                        <div
                          style={{ fontSize: "13px", color: theme.textMuted }}
                        >
                          {r.phone}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "24px",
                        }}
                      >
                        <span style={styles.statusTag("Ready")}>
                          {r.status}
                        </span>
                        <span style={{ fontWeight: "700", fontSize: "13px" }}>
                          {r.dist}
                        </span>
                        <button
                          onClick={() => {
                            showToast("Platform rider assignment is managed by the delivery platform. Use Own Rider for internal assignment.");
                          }}
                          style={{
                            padding: "8px 22px",
                            borderRadius: "8px",
                            backgroundColor: theme.accentOrange,
                            color: "#fff",
                            border: "none",
                            fontWeight: "700",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={styles.sectionBox}>
                <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
                  <div>
                    <b>Order ID:</b> {selectedOrder.id}
                  </div>
                  <div
                    style={{
                      fontWeight: "800",
                      fontSize: "16px",
                      marginTop: "4px",
                    }}
                  >
                    {selectedOrder.customer}
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: "13px" }}>
                    {selectedOrder.itemsCount} items - ₹{selectedOrder.amount}
                  </div>
                  {selectedOrder.assignedRider && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        color: theme.success,
                        fontWeight: "700",
                      }}
                    >
                      Rider Assigned: {selectedOrder.assignedRider}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: "12px",
                      fontWeight: "800",
                      fontSize: "14px",
                    }}
                  >
                    Delivery Address
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: theme.textMuted,
                      marginTop: "2px",
                    }}
                  >
                    {selectedOrder.address}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <DeliveryInteractiveMap order={selectedOrder} branch={selectedBranch} height="230px" />
              </div>
            </div>
          </div>

          {/* ADD RIDER MODAL FORM WITH VALIDATIONS */}
          {isRiderModalOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(61, 19, 8, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "28px",
                  width: "420px",
                  boxShadow: "0 20px 25px 5px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: "800",
                      color: theme.sidebarBg,
                    }}
                  >
                    Add New {riderTab === "Own" ? "Own" : "Platform"} Rider
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsRiderModalOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: theme.textMuted,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddRiderSubmit} noValidate>
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: theme.textMuted,
                        marginBottom: "6px",
                      }}
                    >
                      Rider Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Ramesh Kumar"
                      value={riderFormData.name}
                      onChange={handleRiderFormChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: `1px solid ${riderFormErrors.name ? theme.danger : theme.border}`,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {riderFormErrors.name && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: theme.danger,
                          fontWeight: "600",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {riderFormErrors.name}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: theme.textMuted,
                        marginBottom: "6px",
                      }}
                    >
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="e.g. 9876543210"
                      value={riderFormData.phone}
                      onChange={handleRiderFormChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: `1px solid ${riderFormErrors.phone ? theme.danger : theme.border}`,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {riderFormErrors.phone && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: theme.danger,
                          fontWeight: "600",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {riderFormErrors.phone}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: theme.textMuted,
                        marginBottom: "6px",
                      }}
                    >
                      Initial Distance (km) *
                    </label>
                    <input
                      type="text"
                      name="dist"
                      placeholder="e.g. 1.8 km"
                      value={riderFormData.dist}
                      onChange={handleRiderFormChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: `1px solid ${riderFormErrors.dist ? theme.danger : theme.border}`,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {riderFormErrors.dist && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: theme.danger,
                          fontWeight: "600",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {riderFormErrors.dist}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsRiderModalOpen(false)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#EADFD9",
                        color: theme.sidebarBg,
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: theme.accentOrange,
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      Save Rider
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCREEN 6: DELIVERY TRACKING */}
      {activeTab === "6" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            6. Delivery Tracking
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr",
              gap: "20px",
            }}
          >
            <div style={styles.sectionBox}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: theme.textMuted }}>
                    Order ID: <b>{selectedOrder.id}</b>
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: theme.accentOrange,
                      marginTop: "2px",
                    }}
                  >
                    {selectedOrder.status}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: selectedOrder.channelColor,
                    fontWeight: "800",
                    fontSize: "18px",
                  }}
                >
                  <span>{selectedOrder.channel}</span>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <DeliveryInteractiveMap order={selectedOrder} branch={selectedBranch} height="260px" isLive={true} />
              </div>
              <div style={{ display: "flex", gap: "40px", fontSize: "14px" }}>
                <div>
                  <span
                    style={{
                      color: theme.textMuted,
                      fontSize: "12px",
                      display: "block",
                    }}
                  >
                    ETA
                  </span>
                  <b>—</b>
                </div>
                <div>
                  <span
                    style={{
                      color: theme.textMuted,
                      fontSize: "12px",
                      display: "block",
                    }}
                  >
                    Distance
                  </span>
                  <b>—</b>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={styles.sectionBox}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {(trackingTimeline[selectedOrder.id] || [{ step: "Order Placed", time: selectedOrder.date || "-", status: "completed" }]).map((st, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor:
                              st.status === "completed"
                                ? theme.success
                                : st.status === "active"
                                  ? theme.accentOrange
                                  : "#cbd5e1",
                            display: "inline-block",
                          }}
                        ></span>
                        <span
                          style={{
                            fontWeight:
                              st.status === "active" ||
                              st.status === "completed"
                                ? "700"
                                : "500",
                            color:
                              st.status === "completed"
                                ? theme.textDark
                                : st.status === "active"
                                  ? theme.accentOrange
                                  : theme.textMuted,
                            fontSize: "13px",
                          }}
                        >
                          {st.step}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: theme.textMuted,
                          fontWeight: "600",
                        }}
                      >
                        {st.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedOrder.status !== "Delivered" && selectedOrder.status !== "Out for Delivery" && (
                  <button
                    onClick={() => {
                      handleOrderStatusChange(selectedOrder.id, "Out for Delivery");
                    }}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      backgroundColor: theme.accentOrange,
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(234, 117, 0, 0.25)",
                    }}
                  >
                    Start / Out for Delivery
                  </button>
                )}
                <button
                  onClick={() => {
                    handleOrderStatusChange(selectedOrder.id, "Delivered");
                    setActiveTab("9");
                  }}
                  disabled={selectedOrder.status === "Delivered"}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    backgroundColor:
                      selectedOrder.status === "Delivered"
                        ? "#94a3b8"
                        : theme.success,
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "16px",
                    cursor:
                      selectedOrder.status === "Delivered"
                        ? "not-allowed"
                        : "pointer",
                    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {selectedOrder.status === "Delivered"
                    ? "Order Delivered"
                    : "Complete & Mark Delivered"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 7: CHANNEL MANAGEMENT */}
      {activeTab === "7" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            7. Channel Management
          </h2>
          <div style={styles.sectionBox}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Orders</th>
                  <th style={styles.th}>Sales</th>
                  <th style={styles.th}>Last Sync</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Status</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...styles.td, fontWeight: "800" }}>
                      {c.name}
                    </td>
                    <td style={styles.td}>{c.orders}</td>
                    <td style={{ ...styles.td, fontWeight: "700" }}>
                      {c.sales}
                    </td>
                    <td style={{ ...styles.td, color: theme.textMuted }}>
                      {c.sync}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span style={styles.statusTag(c.status)}>{c.status}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <button
                        onClick={() => openConfigModal(c)}
                        style={{
                          padding: "6px 18px",
                          borderRadius: "8px",
                          backgroundColor: "#ffffff",
                          color: theme.accentOrange,
                          border: `1px solid ${theme.accentOrange}`,
                          fontWeight: "700",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Configure
                      </button>
                      {(() => {
                        const integration = integrations.find((x) => x.platform === c.platform && x.branchId === selectedBranchId) || integrations.find((x) => x.platform === c.platform);
                        if (!integration) return null;
                        return (
                          <>
                            <button onClick={async () => { try { const r=await integrationService.test(integration.id); setIntegrations((p)=>p.map(x=>x.id===r.id?r:x)); showToast(`${c.name} connection test successful.`); } catch(e) { showToast((e&&e.userFriendlyMessage)||`${c.name} connection test failed.`); } }} style={{ marginLeft:"6px",padding:"6px 12px",borderRadius:"8px",background:"#fff",color:theme.success,border:`1px solid ${theme.success}`,fontWeight:"700",cursor:"pointer" }}>Test</button>
                            {integration.status === "CONNECTED" && <button onClick={async () => { try { const r=await integrationService.activate(integration.id); setIntegrations((p)=>p.map(x=>x.id===r.id?r:x)); setChannels((p)=>p.map(x=>x.platform===c.platform?{...x,status:r.status}:x)); showToast(`${c.name} integration activated.`); } catch(e) { showToast((e&&e.userFriendlyMessage)||"Activation failed."); } }} style={{ marginLeft:"6px",padding:"6px 12px",borderRadius:"8px",background:theme.accentOrange,color:"#fff",border:"none",fontWeight:"700",cursor:"pointer" }}>Activate</button>}
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {configuringChannel && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(61, 19, 8, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "28px",
                  width: "420px",
                  boxShadow: "0 20px 25px 5px rgba(0,0,0,0.2)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "800",
                    color: theme.sidebarBg,
                  }}
                >
                  Configure {configuringChannel.name}
                </h3>
                <form onSubmit={handleSaveConfig}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>Branch</label>
                      <select value={configFormData.branchId || ""} onChange={(e) => setConfigFormData({ ...configFormData, branchId: e.target.value })} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                        <option value="">Select branch</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>{configuringChannel?.name || "Platform"} Outlet / Store ID</label>
                      <input value={configFormData.storeId || ""} onChange={(e) => setConfigFormData({ ...configFormData, storeId: e.target.value })} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>{configuringChannel?.name || "Platform"} Outlet / Store Name</label>
                    <input value={configFormData.externalOutletName || ""} onChange={(e) => setConfigFormData({ ...configFormData, externalOutletName: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>External Account / POS ID</label>
                    <input value={configFormData.externalAccountId || ""} onChange={(e) => setConfigFormData({ ...configFormData, externalAccountId: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>{configuringChannel?.name || "Platform"} API Base URL</label>
                    <input value={configFormData.apiBaseUrl || ""} onChange={(e) => setConfigFormData({ ...configFormData, apiBaseUrl: e.target.value })} placeholder="Provided by the approved platform integration team" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[["testEndpoint","Test Endpoint"],["confirmEndpoint","Confirm Endpoint"],["readyEndpoint","Ready Endpoint"],["statusEndpoint","Status Endpoint"]].map(([key,label]) => (
                      <div key={key} style={{ marginBottom: "12px" }}><label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: theme.textMuted, marginBottom: "5px" }}>{label}</label><input value={configFormData[key] || ""} onChange={(e) => setConfigFormData({ ...configFormData, [key]: e.target.value })} placeholder="Path provided by the approved platform integration team" style={{ width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${theme.border}` }} /></div>
                    ))}
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>API Key</label>
                    <input type="password" value={configFormData.apiKey || ""} onChange={(e) => setConfigFormData({ ...configFormData, apiKey: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: theme.textMuted, marginBottom: "6px" }}>API Secret</label>
                    <input type="password" value={configFormData.apiSecret || ""} onChange={(e) => setConfigFormData({ ...configFormData, apiSecret: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}` }} />
                  </div>
                  <div style={{ marginBottom: "16px", padding: "10px", background: "#FAF5F2", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}>Connection Status: {configFormData.status || "SETUP_REQUIRED"}</div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setConfiguringChannel(null)} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#EADFD9", color: theme.sidebarBg, cursor: "pointer", fontWeight: "700" }}>Cancel</button>
                    <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: theme.accentOrange, color: "#fff", cursor: "pointer", fontWeight: "700" }}>Save Settings</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCREEN 8: MENU SYNC */}
      {activeTab === "8" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "800",
                margin: 0,
                color: theme.sidebarBg,
              }}
            >
              8. Menu Sync
            </h2>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                backgroundColor: theme.accentOrange,
                color: "#ffffff",
                border: "none",
                fontWeight: "700",
                fontSize: "14px",
                cursor: isSyncing ? "not-allowed" : "pointer",
              }}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: theme.textMuted,
              marginBottom: "12px",
            }}
          >
            Menu Sync Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              onClick={() => setSyncFilter("All")}
              style={styles.card(syncFilter === "All")}
            >
              <div style={styles.cardLabel}>Total Items</div>
              <div style={styles.cardValue}>{totalSyncItems}</div>
            </div>
            <div
              onClick={() => setSyncFilter("Synced")}
              style={styles.card(syncFilter === "Synced")}
            >
              <div style={styles.cardLabel}>Synced</div>
              <div style={{ ...styles.cardValue, color: theme.success }}>
                {syncedItemsCount}
              </div>
            </div>
            <div
              onClick={() => setSyncFilter("Pending")}
              style={styles.card(syncFilter === "Pending")}
            >
              <div style={styles.cardLabel}>Pending</div>
              <div style={{ ...styles.cardValue, color: theme.warning }}>
                {pendingItemsCount}
              </div>
            </div>
            <div
              onClick={() => setSyncFilter("Failed")}
              style={styles.card(syncFilter === "Failed")}
            >
              <div style={styles.cardLabel}>Failed</div>
              <div style={{ ...styles.cardValue, color: theme.danger }}>
                {failedItemsCount}
              </div>
            </div>
          </div>
          <div style={styles.sectionBox}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Synced Items</th>
                  <th style={styles.th}>Pending Items</th>
                  <th style={styles.th}>Failed Items</th>
                  <th style={styles.th}>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {menuSyncData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...styles.td, fontWeight: "800" }}>
                      {row.channel}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusTag(row.status)}>
                        {row.status}
                      </span>
                    </td>
                    <td style={styles.td}>{row.syncedItems}</td>
                    <td style={styles.td}>{row.pendingItems}</td>
                    <td
                      style={{
                        ...styles.td,
                        color:
                          row.failedItems > 0 ? theme.danger : theme.textDark,
                        fontWeight: "700",
                      }}
                    >
                      {row.failedItems}
                    </td>
                    <td style={{ ...styles.td, color: theme.textMuted }}>
                      {row.lastSync}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 9: PAYMENTS */}
      {activeTab === "9" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            9. Payments
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={styles.card(paymentFilter === "PAID")}
              onClick={() => setPaymentFilter(paymentFilter === "PAID" ? "All" : "PAID")}>
              <div style={styles.cardLabel}>Paid</div>
              <div style={{ ...styles.cardValue, color: theme.success }}>₹{paidOrderTotal.toFixed(2)}</div>
              <div style={{ fontSize: "11px", color: theme.textMuted }}>
                {orders.filter(o => String(o.paymentStatus || "PENDING").toUpperCase() === "PAID").length} Orders
              </div>
            </div>
            <div style={styles.card(paymentFilter === "PENDING")}
              onClick={() => setPaymentFilter(paymentFilter === "PENDING" ? "All" : "PENDING")}>
              <div style={styles.cardLabel}>Unpaid / Pending</div>
              <div style={{ ...styles.cardValue, color: theme.warning }}>₹{unpaidOrderTotal.toFixed(2)}</div>
              <div style={{ fontSize: "11px", color: theme.textMuted }}>
                {orders.filter(o => String(o.paymentStatus || "PENDING").toUpperCase() !== "PAID").length} Orders
              </div>
            </div>
            <div style={styles.card(paymentFilter === "All")} onClick={() => setPaymentFilter("All")}>
              <div style={styles.cardLabel}>Total Orders</div>
              <div style={{ ...styles.cardValue, color: theme.accentOrange }}>₹{(paidOrderTotal + unpaidOrderTotal).toFixed(2)}</div>
              <div style={{ fontSize: "11px", color: theme.textMuted }}>{orders.length} Orders</div>
            </div>
          </div>
          <div style={styles.sectionBox}>
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                fontWeight: "800",
                color: theme.sidebarBg,
              }}
            >
              Recent Payments ({paymentFilter} View)
            </h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order ID</th>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Payment Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList
                  .filter(
                    (p) => paymentFilter === "All" || p.cond === paymentFilter,
                  )
                  .map((p, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          ...styles.td,
                          fontWeight: "700",
                          color: theme.accentOrange,
                        }}
                      >
                        {p.id}
                      </td>
                      <td style={{ ...styles.td, fontWeight: "700" }}>
                        {p.title}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            fontWeight: "700",
                            color:
                              p.cond === "PAID"
                                ? theme.success
                                : theme.warning,
                          }}
                        >
                          {p.cond === "PAID" ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: "700" }}>
                        ₹{p.amount}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={styles.statusTag(
                            p.st === "Paid" ? "Ready" : "New",
                          )}
                        >
                          {p.st}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: theme.textMuted }}>
                        {p.dt}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 10: SETTLEMENT */}
      {activeTab === "10" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            10. Settlement
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={styles.card(settlementFilter === "Gross Sales")}
              onClick={() => {
                setSettlementFilter("Gross Sales");
                showToast("Highlighted: Gross Sales");
              }}
            >
              <div style={styles.cardLabel}>Gross Sales</div>
              <div style={styles.cardValue}>₹{settlementTotals.gross.toFixed(2)}</div>
            </div>
            <div
              style={styles.card(settlementFilter === "Commission")}
              onClick={() => {
                setSettlementFilter("Commission");
                showToast("Highlighted: Commission Charges");
              }}
            >
              <div style={styles.cardLabel}>Commission</div>
              <div style={{ ...styles.cardValue, color: theme.danger }}>
                ₹{settlementTotals.commission.toFixed(2)}
              </div>
            </div>
            <div
              style={styles.card(settlementFilter === "Fees")}
              onClick={() => {
                setSettlementFilter("Fees");
                showToast("Highlighted: Platform Fees");
              }}
            >
              <div style={styles.cardLabel}>Fees</div>
              <div style={{ ...styles.cardValue, color: theme.danger }}>
                ₹{settlementTotals.fees.toFixed(2)}
              </div>
            </div>
            <div
              style={styles.card(settlementFilter === "Refund")}
              onClick={() => {
                setSettlementFilter("Refund");
                showToast("Highlighted: Refund Deductions");
              }}
            >
              <div style={styles.cardLabel}>Refund</div>
              <div style={{ ...styles.cardValue, color: theme.warning }}>
                ₹{settlementTotals.refund.toFixed(2)}
              </div>
            </div>
            <div
              style={styles.card(
                settlementFilter === "Net Settlement" ||
                  settlementFilter === "All",
              )}
              onClick={() => {
                setSettlementFilter("All");
                showToast("Showing Net Settlement Breakdown");
              }}
            >
              <div style={styles.cardLabel}>Net Settlement</div>
              <div style={{ ...styles.cardValue, color: theme.success }}>
                ₹{settlementTotals.net.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={styles.sectionBox}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor:
                        settlementFilter === "Gross Sales"
                          ? "#FFE8D6"
                          : "#FAF5F2",
                    }}
                  >
                    Sales
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor:
                        settlementFilter === "Commission"
                          ? "#FEE2E2"
                          : "#FAF5F2",
                    }}
                  >
                    Commission
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor:
                        settlementFilter === "Fees" ? "#FEE2E2" : "#FAF5F2",
                    }}
                  >
                    Fees
                  </th>
                  <th
                    style={{
                      ...styles.th,
                      backgroundColor:
                        settlementFilter === "Refund" ? "#FEF3C7" : "#FAF5F2",
                    }}
                  >
                    Refund
                  </th>
                  <th style={styles.th}>Net</th>
                </tr>
              </thead>
              <tbody>
                {settlementList.map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...styles.td, fontWeight: "800" }}>
                      {row.platform}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight:
                          settlementFilter === "Gross Sales" ? "800" : "400",
                      }}
                    >
                      ₹{Number(row.grossAmount || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        color: theme.danger,
                        fontWeight:
                          settlementFilter === "Commission" ? "800" : "400",
                      }}
                    >
                      ₹{Number(row.commissionAmount || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        color: theme.danger,
                        fontWeight: settlementFilter === "Fees" ? "800" : "400",
                      }}
                    >
                      ₹{Number(row.feeAmount || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        color: theme.warning,
                        fontWeight:
                          settlementFilter === "Refund" ? "800" : "400",
                      }}
                    >
                      ₹{Number(row.refundAmount || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: "800",
                        color: theme.success,
                      }}
                    >
                      ₹{Number(row.netAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 11: RECONCILIATION */}
      {activeTab === "11" && (
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              marginBottom: "16px",
              color: theme.sidebarBg,
            }}
          >
            11. Reconciliation
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={styles.card(reconcileFilter === "Matched")}
              onClick={() => {
                setReconcileFilter(
                  reconcileFilter === "Matched" ? "All" : "Matched",
                );
                showToast("Filtered: Matched Payouts");
              }}
            >
              <div style={styles.cardLabel}>Matched</div>
              <div style={{ ...styles.cardValue, color: theme.success }}>
                {reconciliationTotals.matched} matched
              </div>
            </div>
            <div
              style={styles.card(reconcileFilter === "Mismatched")}
              onClick={() => {
                setReconcileFilter(
                  reconcileFilter === "Mismatched" ? "All" : "Mismatched",
                );
                showToast("Filtered: Mismatched Payouts");
              }}
            >
              <div style={styles.cardLabel}>Mismatched</div>
              <div style={{ ...styles.cardValue, color: theme.danger }}>
                {reconciliationTotals.mismatched} mismatched
              </div>
            </div>
            <div
              style={styles.card(reconcileFilter === "Pending")}
              onClick={() => {
                setReconcileFilter(
                  reconcileFilter === "Pending" ? "All" : "Pending",
                );
                showToast("Filtered: Pending Reconciliation");
              }}
            >
              <div style={styles.cardLabel}>Pending</div>
              <div style={{ ...styles.cardValue, color: theme.warning }}>
                {reconciliationTotals.pending} pending
              </div>
            </div>
            <div
              style={styles.card(reconcileFilter === "Missing")}
              onClick={() => {
                setReconcileFilter(
                  reconcileFilter === "Missing" ? "All" : "Missing",
                );
                showToast("Filtered: Missing Records");
              }}
            >
              <div style={styles.cardLabel}>Missing</div>
              <div style={{ ...styles.cardValue, color: theme.textMuted }}>
                {reconciliationData.filter(r => String(r.status || "").toUpperCase() === "MISSING").length} missing
              </div>
            </div>
          </div>
          <div style={styles.sectionBox}>
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                fontWeight: "800",
                color: theme.sidebarBg,
              }}
            >
              Reconciliation Details ({reconcileFilter} Filter Active)
            </h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Platform Amount</th>
                  <th style={styles.th}>System Amount</th>
                  <th style={styles.th}>Bank Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Live Remark / Details</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationData
                  .filter(
                    (r) =>
                      reconcileFilter === "All" || r.status === reconcileFilter,
                  )
                  .map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: "800" }}>
                        {r.platform}
                      </td>
                      <td style={styles.td}>₹{Number(r.platformAmount || 0).toFixed(2)}</td>
                      <td style={styles.td}>₹{Number(r.systemAmount || 0).toFixed(2)}</td>
                      <td style={styles.td}>{r.bankAmount == null ? "Pending" : `₹${Number(r.bankAmount).toFixed(2)}`}</td>
                      <td style={styles.td}>
                        <span style={styles.statusTag(r.status)}>{r.status}</span>
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          fontSize: "12px",
                          color: theme.textMuted,
                          fontStyle: "italic",
                        }}
                      >
                        {r.remark || "—"}
                      </td>
                      <td style={styles.td}>
                        {String(r.status).toUpperCase() === "PENDING" && (
                          <button type="button" onClick={() => handleManualReconcile(r)}
                            style={{ ...styles.actionBtn(theme.accentOrange, "#fff"), marginRight: 0, padding: "7px 10px" }}>
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 12: REPORTS & ANALYTICS */}
      {activeTab === "12" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "800",
                margin: 0,
                color: theme.sidebarBg,
              }}
            >
              12. Reports & Analytics
            </h2>
            <button
              onClick={handleExportReport}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                backgroundColor: theme.accentOrange,
                color: "#fff",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Export Report
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "16px" }}>
            {[
              ["Orders", deliveryAnalytics?.totalOrders ?? 0],
              ["Delivered", deliveryAnalytics?.deliveredOrders ?? 0],
              ["Not Delivered", deliveryAnalytics?.notDeliveredOrders ?? 0],
              ["Paid", deliveryAnalytics?.paidOrders ?? 0],
              ["Unpaid", deliveryAnalytics?.unpaidOrders ?? 0],
              ["Settlement", `₹${Number(deliveryAnalytics?.settlementNet ?? 0).toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} style={styles.card(false)}>
                <div style={styles.cardLabel}>{label}</div>
                <div style={{ ...styles.cardValue, fontSize: "18px" }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "10px", background: "#F8FAFC", border: `1px solid ${theme.border}`, fontSize: "12px", color: theme.textMuted }}>
            Delivery and payment are measured independently. Only PAID orders create settlement records; reconciliation is driven from those settlement records.
            {financeLoading ? " Refreshing finance data…" : ""}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
            }}
          >
            <div style={styles.sectionBox}>
              {renderCurveGraph(reportsTrendRange, setReportsTrendRange)}
            </div>
            <div style={styles.sectionBox}>
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontWeight: "800",
                  fontSize: "15px",
                  color: theme.sidebarBg,
                }}
              >
                Top Channels
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "220px",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: channelShareGradient,
                  }}
                ></div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: theme.accentOrange,
                      }}
                    ></span>
                    <span>Swiggy</span>
                    <b style={{ marginLeft: "auto" }}>{channelSharePercent("Swiggy")}%</b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                      }}
                    ></span>
                    <span>Zomato</span>
                    <b style={{ marginLeft: "auto" }}>{channelSharePercent("Zomato")}%</b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#84cc16",
                      }}
                    ></span>
                    <span>ONDC Food</span>
                    <b style={{ marginLeft: "auto" }}>{channelSharePercent("ONDC")}%</b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#06b6d4",
                      }}
                    ></span>
                    <span>Magicpin</span>
                    <b style={{ marginLeft: "auto" }}>{channelSharePercent("Magicpin")}%</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          [FEATURE 2] LIVE DELIVERY TRACKING MODAL
      ============================================================ */}
      {isTestOrderModalOpen && (
        <div style={styles.modalOverlay} onClick={() => !isCreatingTestOrder && setIsTestOrderModalOpen(false)}>
          <div style={{ ...styles.modalCard, maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h2 style={{ margin: 0, color: theme.sidebarBg, fontSize: "20px" }}>Create Test Order</h2>
                <p style={{ margin: "5px 0 0", color: theme.textMuted, fontSize: "12px" }}>Creates a sandbox order through the same platform → HotelOrder → KOT → DeliveryOrder pipeline. No real platform order is placed.</p>
              </div>
              <button style={styles.iconBtn(false)} onClick={() => setIsTestOrderModalOpen(false)} disabled={isCreatingTestOrder}>×</button>
            </div>
            <form onSubmit={handleCreateTestOrder}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800" }}>Platform
                  <select value={testOrderForm.platform} onChange={(e) => setTestOrderForm({ ...testOrderForm, platform: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px" }}><option value="ZOMATO">Zomato</option><option value="SWIGGY">Swiggy</option><option value="ONDC">ONDC</option><option value="MAGICPIN">Magicpin</option></select>
                </label>
                <label style={{ fontSize: "12px", fontWeight: "800" }}>Branch
                  <select value={selectedBranchId || ""} onChange={(e) => setSelectedBranchId(Number(e.target.value))} required style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px" }}><option value="" disabled>Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                </label>
                <label style={{ fontSize: "12px", fontWeight: "800" }}>Customer Name<input value={testOrderForm.customerName} onChange={(e) => setTestOrderForm({ ...testOrderForm, customerName: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label>
                <label style={{ fontSize: "12px", fontWeight: "800" }}>Phone<input value={testOrderForm.customerPhone} onChange={(e) => setTestOrderForm({ ...testOrderForm, customerPhone: sanitizeMobileInput(e.target.value) })} maxLength={10} placeholder="10 digits (6-9)" style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label>
                <label style={{ fontSize: "12px", fontWeight: "800", gridColumn: "1 / -1" }}>Delivery Address<input value={testOrderForm.address} onChange={(e) => setTestOrderForm({ ...testOrderForm, address: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label>
                <label style={{ fontSize: "12px", fontWeight: "800" }}>Item<input value={testOrderForm.itemName} onChange={(e) => setTestOrderForm({ ...testOrderForm, itemName: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}><label style={{ fontSize: "12px", fontWeight: "800" }}>Qty<input type="number" min="1" value={testOrderForm.quantity} onChange={(e) => setTestOrderForm({ ...testOrderForm, quantity: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label><label style={{ fontSize: "12px", fontWeight: "800" }}>Unit Price<input type="number" min="0" step="0.01" value={testOrderForm.unitPrice} onChange={(e) => setTestOrderForm({ ...testOrderForm, unitPrice: e.target.value })} style={{ width: "100%", marginTop: "6px", padding: "10px", border: `1px solid ${theme.border}`, borderRadius: "8px", boxSizing: "border-box" }} /></label></div>
              </div>
              <div style={{ marginTop: "18px", padding: "12px", borderRadius: "10px", background: "#FFF7ED", color: "#9A3412", fontSize: "12px" }}>Test mode automatically creates/uses a <b>TEST_MODE</b> platform connection and creates one HotelOrder, one KOT and one linked DeliveryOrder.</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}><button type="button" style={styles.actionBtn("#F1F5F9", theme.textDark)} onClick={() => setIsTestOrderModalOpen(false)} disabled={isCreatingTestOrder}>Cancel</button><button type="submit" style={styles.actionBtn(theme.accentOrange, "#fff")} disabled={isCreatingTestOrder}>{isCreatingTestOrder ? "Creating..." : "Create Test Order"}</button></div>
            </form>
          </div>
        </div>
      )}

      {isLiveTrackOpen &&
        liveTrack &&
        (() => {
          const pts = getTrackMapPoints(liveTrack);
          const progressPct = Math.round(liveTrack.progress * 100);
          const arrived = !liveTrack.isLive && liveTrack.progress >= 1;

          return (
            <div style={styles.modalOverlay} onClick={closeLiveTracking}>
              <div
                className="ajalkar-modal-in"
                style={styles.modalCard}
                onClick={(e) => e.stopPropagation()}
              >
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "800",
                          color: theme.sidebarBg,
                        }}
                      >
                        Live Delivery Tracking
                      </h3>
                      <span style={styles.liveBadge(liveTrack.isLive)}>
                        <span style={styles.liveDot(liveTrack.isLive)} />
                        {liveTrack.isLive ? "LIVE" : "COMPLETED"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: theme.textMuted,
                        marginTop: "5px",
                        fontWeight: "600",
                      }}
                    >
                      Order <b>{liveTrack.orderId}</b> ·{" "}
                      <span
                        style={{
                          color: liveTrack.channelColor,
                          fontWeight: "800",
                        }}
                      >
                        {liveTrack.channel}
                      </span>{" "}
                      · Last GPS ping: <b>{liveTrack.lastPing}</b>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeLiveTracking}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: theme.textMuted,
                      lineHeight: "1",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* NO RIDER WARNING */}
                {!liveTrack.hasRider && (
                  <div
                    style={{
                      backgroundColor: "#FEF3C7",
                      border: "1px solid #FCD34D",
                      color: "#92400E",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      marginBottom: "16px",
                    }}
                  >
                    ⚠ No rider has been assigned to this order yet. Assign one
                    from <b>Delivery Assignment</b> to start live tracking.
                  </div>
                )}

                {/* ARRIVED BANNER */}
                {arrived && (
                  <div
                    style={{
                      backgroundColor: "#DCFCE7",
                      border: "1px solid #86EFAC",
                      color: "#15803D",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: "12.5px",
                      fontWeight: "800",
                      marginBottom: "16px",
                    }}
                  >
                    ✓ Rider has reached the customer location.
                  </div>
                )}

                {/* BODY GRID */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr",
                    gap: "18px",
                    alignItems: "start",
                  }}
                >
                  {/* LEFT: LIVE MAP */}
                  <div>
                    <div
                      style={{
                        position: "relative",
                        height: "270px",
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: `1px solid ${theme.border}`,
                        background:
                          "linear-gradient(160deg, #EEF4F8 0%, #E2ECF3 100%)",
                      }}
                    >
                      <svg
                        viewBox="0 0 400 220"
                        style={{ width: "100%", height: "100%" }}
                      >
                        {/* fake roads */}
                        <path
                          d="M 0 55 L 400 55 M 0 130 L 400 130 M 90 0 L 90 220 M 300 0 L 300 220"
                          stroke="#D7E3EC"
                          strokeWidth="14"
                        />
                        <path
                          d="M 0 55 L 400 55 M 0 130 L 400 130 M 90 0 L 90 220 M 300 0 L 300 220"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          strokeDasharray="10 12"
                        />

                        {/* remaining route (dashed) */}
                        <line
                          x1={pts.store.x}
                          y1={pts.store.y}
                          x2={pts.cust.x}
                          y2={pts.cust.y}
                          stroke="#C9B7AE"
                          strokeWidth="3.5"
                          strokeDasharray="7 7"
                          strokeLinecap="round"
                        />

                        {/* covered route (solid) */}
                        <line
                          x1={pts.store.x}
                          y1={pts.store.y}
                          x2={pts.rider.x}
                          y2={pts.rider.y}
                          stroke={theme.accentOrange}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                        />

                        {/* store marker */}
                        <circle
                          cx={pts.store.x}
                          cy={pts.store.y}
                          r="9"
                          fill={theme.sidebarBg}
                        />
                        <circle
                          cx={pts.store.x}
                          cy={pts.store.y}
                          r="3.5"
                          fill="#FFFFFF"
                        />
                        <text
                          x={pts.store.x}
                          y={pts.store.y - 15}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="800"
                          fill={theme.sidebarBg}
                        >
                          Restaurant
                        </text>

                        {/* customer marker */}
                        <circle
                          cx={pts.cust.x}
                          cy={pts.cust.y}
                          r="14"
                          fill="#16A34A"
                          opacity="0.18"
                        />
                        <circle
                          cx={pts.cust.x}
                          cy={pts.cust.y}
                          r="7"
                          fill="#16A34A"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        <text
                          x={pts.cust.x}
                          y={pts.cust.y + 24}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="800"
                          fill="#15803D"
                        >
                          Customer
                        </text>

                        {/* rider marker with live pulse */}
                        {liveTrack.isLive && (
                          <circle
                            cx={pts.rider.x}
                            cy={pts.rider.y}
                            r="9"
                            fill={theme.accentOrange}
                            opacity="0.35"
                          >
                            <animate
                              attributeName="r"
                              values="9;24;9"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.35;0;0.35"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                        <circle
                          cx={pts.rider.x}
                          cy={pts.rider.y}
                          r="9"
                          fill={theme.accentOrange}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        <text
                          x={pts.rider.x}
                          y={pts.rider.y + 25}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill={theme.accentDarkOrange}
                        >
                          {liveTrack.riderName}
                        </text>
                      </svg>

                      {/* legend */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "10px",
                          display: "flex",
                          gap: "12px",
                          background: "rgba(255,255,255,0.94)",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "10.5px",
                          fontWeight: "800",
                          color: theme.sidebarBg,
                        }}
                      >
                        <span>● Restaurant</span>
                        <span style={{ color: theme.accentOrange }}>
                          ● Rider
                        </span>
                        <span style={{ color: theme.success }}>
                          ● Customer
                        </span>
                      </div>
                    </div>

                    {/* progress bar */}
                    <div style={{ marginTop: "14px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          color: theme.textMuted,
                          marginBottom: "6px",
                        }}
                      >
                        <span>Delivery Progress</span>
                        <span style={{ color: theme.accentOrange }}>
                          {progressPct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: "9px",
                          borderRadius: "20px",
                          backgroundColor: "#F1E7E1",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            borderRadius: "20px",
                            background: `linear-gradient(90deg, ${theme.accentOrange}, ${theme.success})`,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: METRICS + RIDER */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={styles.metricTile}>
                        <div style={styles.metricLabel}>Distance Left</div>
                        <div style={styles.metricValue}>
                          {formatKm(liveTrack.distanceKm)}
                        </div>
                      </div>
                      <div style={styles.metricTile}>
                        <div style={styles.metricLabel}>Est. Time</div>
                        <div
                          style={{
                            ...styles.metricValue,
                            color: theme.accentOrange,
                          }}
                        >
                          {formatEta(liveTrack.etaMin)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={styles.metricTile}>
                        <div style={styles.metricLabel}>Rider Speed</div>
                        <div style={styles.metricValue}>
                          {Math.round(liveTrack.speedKmh)}{" "}
                          <span
                            style={{ fontSize: "12px", fontWeight: "700" }}
                          >
                            km/h
                          </span>
                        </div>
                      </div>
                      <div style={styles.metricTile}>
                        <div style={styles.metricLabel}>Total Route</div>
                        <div style={styles.metricValue}>
                          {formatKm(
                            haversineKm(liveTrack.storePos, liveTrack.custPos),
                          )}
                        </div>
                      </div>
                    </div>

                    {/* rider card */}
                    <div
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: "12px",
                        padding: "14px",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <div style={styles.metricLabel}>Assigned Rider</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginTop: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: theme.accentLightOrange,
                            color: theme.accentOrange,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: "16px",
                          }}
                        >
                          {liveTrack.riderName.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{ fontWeight: "800", fontSize: "14.5px" }}
                          >
                            {liveTrack.riderName}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: theme.textMuted,
                            }}
                          >
                            {liveTrack.riderPhone}
                          </div>
                        </div>
                        {liveTrack.riderPhone !== "—" && (
                          <a
                            href={`tel:${liveTrack.riderPhone.replace(
                              /\s/g,
                              "",
                            )}`}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              backgroundColor: theme.success,
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: "800",
                              textDecoration: "none",
                            }}
                          >
                            Call
                          </a>
                        )}
                      </div>
                    </div>

                    {/* GPS status */}
                    {gpsStatus && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: theme.textMuted,
                          backgroundColor: "#FAF5F2",
                          border: `1px solid ${theme.border}`,
                          borderRadius: "10px",
                          padding: "9px 12px",
                        }}
                      >
                        {gpsStatus}
                      </div>
                    )}

                    {/* actions */}
                    <button
                      type="button"
                      onClick={handleUseDeviceGps}
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        backgroundColor: theme.accentLightOrange,
                        color: theme.accentDarkOrange,
                        border: `1px solid ${theme.accentOrange}`,
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      Use My Live GPS
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const id = liveTrack.orderId;
                        closeLiveTracking();
                        setSelectedOrderId(id);
                        setActiveTab("6");
                      }}
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        backgroundColor: theme.sidebarBg,
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      Open Full Tracking View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
);


const handleManualReconcile = async (record) => {
  const raw = await dialogService.prompt({
    title: "Manual Reconciliation",
    message: "Enter bank/platform settled amount:",
    promptDefaultValue: record.bankAmount == null ? String(record.systemAmount || 0) : String(record.bankAmount),
    promptPlaceholder: "e.g. 1500.00",
    promptInputType: "number",
    confirmText: "Reconcile",
  });
  if (raw === null) return;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    showToast("Enter a valid non-negative settlement amount.");
    return;
  }
  try {
    await deliveryService.reconcile(record.id, amount, "Manual reconciliation from Delivery module.");
    await refreshFinance();
    showToast("Reconciliation completed.");
  } catch (e) {
    showToast((e && e.userFriendlyMessage) || e?.response?.data?.message || "Reconciliation failed.");
  }
};}