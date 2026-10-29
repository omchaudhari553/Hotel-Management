import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { tableService } from "../services/tableService";
import { orderService } from "../services/orderService";
import { billingService } from "../services/billingService";
import { paymentService } from "../services/paymentService";
import { kotService } from "../services/kotService";
import { sanitizeMobileInput } from "../common/phoneUtils";
import { useBranch } from "../context/BranchContext";
import { useLanguage } from "../context/LanguageContext";
import { dialogService } from "../context/DialogContext";
import { LocalizedDatePicker } from "../common/LocalizedDatePicker";

/* =========================================================
   TABLE MANAGEMENT MODULE
   =========================================================
   Single-file implementation.

   IMPORTANT:
   PART 1 + PART 2 = ONE Tables.tsx FILE

   Do not add another import between the two parts.
   Do not remove the continuation marker.
   ========================================================= */


/* =========================================================
   TYPES
   ========================================================= */

type Status =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RESERVED"
  | "BILLING"
  | "CLEANING"
  | "OUT_OF_SERVICE";

type OrderStatus =
  | "OPEN"
  | "BILL_REQUESTED"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED";

type ReservationStatus =
  | "CONFIRMED"
  | "SEATED"
  | "CANCELLED"
  | "NO_SHOW";

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI";

type ModalType =
  | "details"
  | "add"
  | "edit"
  | "reserve"
  | "start-order"
  | "order"
  | "add-item"
  | "add-menu-item"
  | "transfer"
  | "merge"
  | "split-bill"
  | "payment"
  | "payment-success"
  | "reservation"
  | "confirm"
  | null;

type ConfirmAction =
  | "delete"
  | "out-of-service"
  | "activate"
  | "cancel-reservation"
  | "clear-table"
  | "complete-bill"
  | "cancel-order"
  | "generate-kot"
  | null;


/* =========================================================
   DATA MODELS
   ========================================================= */

type Table = {
  id: number;
  name: string;
  tableNumber?: string;
  capacity: number;
  area: string;
  status: Status;

  guest?: string;
  guestCount?: number;

  time?: string;
  bill?: number;

  orderId?: number;

  seatedAt?: string;

  reservationId?: number;

  note?: string;
};


type OrderItem = {
  id: number;
  name: string;
  qty: number;
  price: number;
  customization?: string;
  taxRate?: number;
  hsnCode?: string;
};


type Order = {
  id: number;

  tableId: number;
  tableName?: string;
  tableNumber?: string;

  guestName: string;

  guestCount: number;

  items: OrderItem[];

  status: OrderStatus;

  discount: number;

  taxRate: number;

  createdAt: string;

  updatedAt: string;

  sentToKitchen?: boolean;
};

export const formatTableNumber = (
  table?: { name?: string; tableNumber?: string; id?: number } | null
): string => {
  if (!table) return "";
  const raw = (table.tableNumber || table.name || "").trim();
  if (!raw) {
    const idNum = table.id ? String(table.id) : "";
    return idNum ? `Table ${idNum.length === 1 ? "0" + idNum : idNum}` : "Table";
  }
  let clean = raw;
  while (/^(table|टेबल|no[:.]?|#)+/i.test(clean)) {
    clean = clean.replace(/^(table|टेबल|no[:.]?|#)\s*[:.-]?\s*/i, "").trim();
  }
  if (!clean) {
    const idNum = table.id ? String(table.id) : "";
    return idNum ? `Table ${idNum.length === 1 ? "0" + idNum : idNum}` : "Table";
  }
  if (/^t-?\s*\d+/i.test(clean)) {
    const digits = clean.replace(/\D/g, "");
    return `Table ${digits.length === 1 ? "0" + digits : digits}`;
  }
  if (/^\d+$/.test(clean)) {
    return `Table ${clean.length === 1 ? "0" + clean : clean}`;
  }
  return `Table ${clean}`;
};


type Reservation = {
  id: number;

  tableId: number;

  guestName: string;

  guestCount: number;

  date: string;

  time: string;

  phone: string;

  notes: string;

  status: ReservationStatus;

  createdAt: string;
};


type MenuItem = {
  id: number;

  name: string;

  category: string;

  price: number;

  description?: string;

  taxGroupId?: number;

  taxRate?: number;

  hsnCode?: string;
};


/* =========================================================
   CONSTANTS
   ========================================================= */

const statusName: Record<Status, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  BILLING: "Billing",
  CLEANING: "Cleaning",
  OUT_OF_SERVICE: "Out of Service",
};


const statusDescription: Record<Status, string> = {
  AVAILABLE: "Ready for new guests",
  OCCUPIED: "Guests are currently dining",
  RESERVED: "Reserved for an upcoming guest",
  BILLING: "Bill requested / payment pending",
  CLEANING: "Table is being prepared",
  OUT_OF_SERVICE: "Unavailable for service",
};


const areas = [
  "All Areas",
  "Main Dining",
  "Terrace",
  "Private Dining",
];


const tableAreas = [
  "Main Dining",
  "Terrace",
  "Private Dining",
];


const paymentMethods: PaymentMethod[] = [
  "CASH",
  "CARD",
  "UPI",
];


/* =========================================================
   MENU
   ========================================================= */

const initialMenuItems: MenuItem[] = [
  {
    id: 1,
    name: "Paneer Tikka",
    category: "Starters",
    price: 280,
    description: "Char-grilled cottage cheese with spices",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 2,
    name: "Chicken Tikka",
    category: "Starters",
    price: 340,
    description: "Classic tandoori chicken tikka",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 3,
    name: "Veg Spring Rolls",
    category: "Starters",
    price: 220,
    description: "Crispy rolls with mixed vegetables",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 4,
    name: "Butter Chicken",
    category: "Main Course",
    price: 420,
    description: "Creamy tomato-based chicken curry",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 5,
    name: "Paneer Butter Masala",
    category: "Main Course",
    price: 360,
    description: "Paneer in rich tomato gravy",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 6,
    name: "Dal Tadka",
    category: "Main Course",
    price: 240,
    description: "Yellow lentils finished with tempering",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 7,
    name: "Veg Biryani",
    category: "Rice",
    price: 320,
    description: "Fragrant basmati rice and vegetables",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 8,
    name: "Chicken Biryani",
    category: "Rice",
    price: 390,
    description: "Aromatic basmati chicken biryani",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 9,
    name: "Steamed Rice",
    category: "Rice",
    price: 160,
    description: "Long grain steamed basmati rice",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 10,
    name: "Butter Naan",
    category: "Breads",
    price: 70,
    description: "Soft tandoori naan with butter",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 11,
    name: "Garlic Naan",
    category: "Breads",
    price: 90,
    description: "Garlic finished tandoori naan",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 12,
    name: "Tandoori Roti",
    category: "Breads",
    price: 45,
    description: "Traditional clay oven roti",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 13,
    name: "Masala Papad",
    category: "Sides",
    price: 90,
    description: "Papad topped with onion and tomato",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 14,
    name: "French Fries",
    category: "Sides",
    price: 180,
    description: "Crispy salted fries",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 15,
    name: "Gulab Jamun",
    category: "Desserts",
    price: 140,
    description: "Warm syrup-soaked dumplings",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 16,
    name: "Brownie",
    category: "Desserts",
    price: 190,
    description: "Warm chocolate brownie",
    taxGroupId: 2,
    taxRate: 5,
    hsnCode: "996331",
  },
  {
    id: 17,
    name: "Fresh Lime Soda",
    category: "Beverages",
    price: 110,
    description: "Fresh lime with soda",
    taxGroupId: 4,
    taxRate: 18,
    hsnCode: "2202",
  },
  {
    id: 18,
    name: "Cold Coffee",
    category: "Beverages",
    price: 180,
    description: "Chilled creamy coffee",
    taxGroupId: 4,
    taxRate: 18,
    hsnCode: "2202",
  },
];


/* =========================================================
   INITIAL TABLE DATA
   ========================================================= */

const initialTables: Table[] = [];

/* =========================================================
   INITIAL ORDERS
   ========================================================= */

const initialOrders: Order[] = [];

/* =========================================================
   INITIAL RESERVATIONS
   ========================================================= */

const initialReservations: Reservation[] = [];


/* =========================================================
   HELPERS
   ========================================================= */

const currency = (value: number) => {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};


const pad = (value: number) => {
  return String(value).padStart(2, "0");
};


const getToday = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
};


const getCurrentTime = () => {
  const date = new Date();

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


const getInitials = (name?: string) => {
  if (!name) {
    return "—";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
};


const formatDate = (value: string) => {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


const formatDateTime = (value: string) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};


const statusClass = (status: Status) => {
  return status
    .toLowerCase()
    .replace(/_/g, "-");
};


const nextId = (
  values: Array<{ id: number }>
) => {
  if (!values.length) {
    return 1;
  }

  return (
    Math.max(...values.map((item) => item.id)) +
    1
  );
};


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const Tables: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBranchId, selectedBranch } = useBranch();
  const {
    t,
    translateStatus,
    formatDate,
    currentLanguage,
    toDevanagari,
    formatNumber,
    localizeGuestName,
    formatTableName,
    getLocalizedMenuItemName,
    getLocalizedMenuDescription,
  } = useLanguage();

  const [cleaningRemaining, setCleaningRemaining] = useState<Record<number, number>>({});

  const formatCountdown = (seconds: number) => {
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    const str = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return toDevanagari(str);
  };

  const getStatusLabel = (st: Status | string, tableId?: number) => {
    if (st === "CLEANING" && tableId && cleaningRemaining[tableId] !== undefined) {
      return `${translateStatus("CLEANING")} (${formatCountdown(cleaningRemaining[tableId])})`;
    }
    return translateStatus(st) || statusName[st as Status] || st;
  };


  /* =======================================================
     CORE DATA STATE
     ======================================================= */

  const [tables, setTables] =
    useState<Table[]>(initialTables);

  const [orders, setOrders] =
    useState<Order[]>(initialOrders);

  const [reservations, setReservations] =
    useState<Reservation[]>(initialReservations);

  const [menuItems, setMenuItems] =
    useState<MenuItem[]>(initialMenuItems);


  /* =======================================================
     FILTER STATE
     ======================================================= */

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<Status | "ALL">("ALL");

  const [areaFilter, setAreaFilter] =
    useState("All Areas");


  /* =======================================================
     SELECTION STATE
     ======================================================= */

  const [selected, setSelected] =
    useState<Table | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);


  /* =======================================================
     MODAL STATE
     ======================================================= */

  const [modal, setModal] =
    useState<ModalType>(null);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction>(null);


  /* =======================================================
     FORM STATE
     ======================================================= */

  const [guest, setGuest] =
    useState("");

  const [guestCount, setGuestCount] =
    useState("2");

  const [time, setTime] =
    useState("");

  const [capacity, setCapacity] =
    useState("4");

  const [area, setArea] =
    useState("Main Dining");

  const [note, setNote] =
    useState("");


  /* =======================================================
     RESERVATION FORM
     ======================================================= */

  const [reservationDate, setReservationDate] =
    useState(getToday());

  const [reservationTime, setReservationTime] =
    useState("19:30");

  const [reservationPhone, setReservationPhone] =
    useState("");

  const [reservationNotes, setReservationNotes] =
    useState("");


  /* =======================================================
     ORDER FORM
     ======================================================= */

  const [menuSearch, setMenuSearch] =
    useState("");

  const [menuCategory, setMenuCategory] =
    useState("All");

  const [customization, setCustomization] =
    useState("");

  const [newMenuItemName, setNewMenuItemName] =
    useState("");

  const [newMenuItemPrice, setNewMenuItemPrice] =
    useState("");

  const [discountInput, setDiscountInput] =
    useState("0");

  // Temporary items selected inside Add Items.
  // These are committed only when the user clicks Confirm Items.
  const [draftItems, setDraftItems] =
    useState<OrderItem[]>([]);


  /* =======================================================
     TRANSFER / MERGE
     ======================================================= */

  const [transferTargetId, setTransferTargetId] =
    useState("");

  const [mergeTableIds, setMergeTableIds] =
    useState<number[]>([]);


  /* =======================================================
     SPLIT BILL
     ======================================================= */

  const [splitCount, setSplitCount] =
    useState("2");


  /* =======================================================
     PAYMENT
     ======================================================= */

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("UPI");

  const [paymentAmount, setPaymentAmount] =
    useState("");


  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  });

  const fetchTablesAndOrders = useCallback(async () => {
    try {
      const [res, oRes, invRes] = await Promise.all([
        tableService.getTables({ branchId: selectedBranchId }).catch(() => null),
        orderService.getOrders(selectedBranchId).catch(() => null),
        billingService.getInvoices(selectedBranchId ? { branchId: selectedBranchId } : undefined).catch(() => []),
      ]);

      const invoicesList = Array.isArray(invRes) ? invRes : [];

      let backendOrders: Order[] = [];
      if (oRes) {
        backendOrders = oRes.map((o) => {
          const isInvPaid = invoicesList.some(
            (inv: any) => Number(inv.orderId) === Number(o.id) && inv.status === "PAID"
          );
          const computedStatus = isInvPaid ? ("COMPLETED" as OrderStatus) : ((o.status as OrderStatus) || "OPEN");

          return {
            id: o.id,
            tableId: o.tableId ? Number(o.tableId) : undefined,
            tableName: o.tableName || o.tableNumber || (o.tableId ? `Table ${o.tableId}` : ""),
            tableNumber: o.tableNumber || o.tableName || (o.tableId ? `Table ${o.tableId}` : ""),
            guestName: o.guestName || "Guest",
            guestCount: o.guestCount || 1,
            items: (o.items || []).map((it, idx) => ({
              id: it.id || idx + 1,
              name: it.name,
              qty: it.quantity || 1,
              price: it.unitPrice || 0,
              customization: it.customization || "",
            })),
            status: computedStatus,
            discount: o.discount || 0,
            taxRate: o.taxRate || 5,
            createdAt: o.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sentToKitchen: true,
          };
        });
        setOrders(backendOrders);
      }

      if (res) {
        // Collect active orders (OPEN or BILL_REQUESTED) by tableId
        const activeOrdersByTable = new Map<number, Order>();
        backendOrders.forEach((o) => {
          if (o.tableId && (o.status === "OPEN" || o.status === "BILL_REQUESTED")) {
            const existing = activeOrdersByTable.get(o.tableId);
            if (!existing || o.id > existing.id) {
              activeOrdersByTable.set(o.tableId, o);
            }
          }
        });

        const nowMs = Date.now();
        const backendTables: Table[] = res.map((t: any) => {
          const tId = Number(t.id);
          const cleaningKey = `table_cleaning_start_${tId}`;
          const cleaningStart = Number(localStorage.getItem(cleaningKey));

          // 1. Check if user recently generated a bill for this table (active cleaning session <= 5 min)
          if (cleaningStart && !isNaN(cleaningStart)) {
            const elapsed = nowMs - cleaningStart;
            if (elapsed < 300000) {
              return {
                id: tId,
                name: t.name || (t.tableNumber ? formatTableNumber(t) : `Table ${tId}`),
                tableNumber: formatTableNumber(t),
                capacity: t.capacity,
                area: t.area,
                status: "CLEANING" as Status,
                guest: undefined,
                guestCount: undefined,
                note: t.note,
                orderId: undefined,
                bill: undefined,
              };
            } else {
              // 5 minutes elapsed, cleaning complete!
              localStorage.removeItem(cleaningKey);
              localStorage.removeItem(cleaningKey);
              tableService.updateTableStatus(tId, "AVAILABLE").catch(() => {});
            }
          }

          // 2. Active order check
          const activeOrd = activeOrdersByTable.get(tId);
          if (activeOrd) {
            const subtotal = activeOrd.items.reduce((s, it) => s + it.price * it.qty, 0);
            const disc = activeOrd.discount || 0;
            const taxable = Math.max(0, subtotal - disc);
            const tax = taxable * ((activeOrd.taxRate || 5) / 100);
            const total = taxable + tax;
            const newStatus: Status = activeOrd.status === "BILL_REQUESTED" ? "BILLING" : "OCCUPIED";

            return {
              id: tId,
              name: t.name || (t.tableNumber ? formatTableNumber(t) : `Table ${tId}`),
              tableNumber: formatTableNumber(t),
              capacity: t.capacity,
              area: t.area,
              status: newStatus,
              guest: activeOrd.guestName || t.guest || "Guest",
              guestCount: activeOrd.guestCount || t.guestCount || 1,
              note: t.note,
              orderId: activeOrd.id,
              bill: total,
            };
          }

          // 3. No active order and no active cleaning session:
          // Table MUST be AVAILABLE (or RESERVED / OUT_OF_SERVICE if manually set).
          // If backend had stale CLEANING or OCCUPIED without active order, reset to AVAILABLE!
          const rawStatus = (t.status as Status) || "AVAILABLE";
          if (rawStatus === "CLEANING" || rawStatus === "OCCUPIED" || rawStatus === "BILLING") {
            tableService.updateTableStatus(tId, "AVAILABLE").catch(() => {});
            localStorage.removeItem(cleaningKey);
            localStorage.removeItem(cleaningKey);
            return {
              id: tId,
              name: t.name || (t.tableNumber ? formatTableNumber(t) : `Table ${tId}`),
              tableNumber: formatTableNumber(t),
              capacity: t.capacity,
              area: t.area,
              status: "AVAILABLE" as Status,
              guest: undefined,
              guestCount: undefined,
              note: t.note,
              orderId: undefined,
              bill: undefined,
            };
          }

          return {
            id: tId,
            name: t.name || (t.tableNumber ? formatTableNumber(t) : `Table ${tId}`),
            tableNumber: formatTableNumber(t),
            capacity: t.capacity,
            area: t.area,
            status: rawStatus,
            guest: t.guest,
            guestCount: t.guestCount,
            note: t.note,
            orderId: t.orderId ? Number(t.orderId) : undefined,
            bill: t.bill != null ? Number(t.bill) : undefined,
          };
        });

        setTables(backendTables);
      }
    } catch (err) {
      console.warn("Could not load backend tables/orders:", err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    // Active cleaning countdowns (5 mins) persist in localStorage until expired

    fetchTablesAndOrders();

    const handleTableStatusChanged = (e: any) => {
      if (e?.detail?.tableId && e?.detail?.status) {
        setTables((prev) =>
          prev.map((t) =>
            t.id === e.detail.tableId
              ? {
                  ...t,
                  status: e.detail.status as Status,
                  guest: e.detail.status === "AVAILABLE" ? undefined : t.guest,
                  guestCount: e.detail.status === "AVAILABLE" ? undefined : t.guestCount,
                  bill: e.detail.status === "AVAILABLE" ? undefined : t.bill,
                  orderId: e.detail.status === "AVAILABLE" ? undefined : t.orderId,
                }
              : t
          )
        );
      }
      fetchTablesAndOrders();
    };

    const handleRefresh = () => {
      fetchTablesAndOrders();
    };

    const handlePaymentCompleted = () => {
      fetchTablesAndOrders();
    };

    window.addEventListener("table-status-changed", handleTableStatusChanged);
    window.addEventListener("payment-completed", handlePaymentCompleted);
    window.addEventListener("order-updated", handleRefresh);
    window.addEventListener("kot-updated", handleRefresh);
    window.addEventListener("focus", fetchTablesAndOrders);

    const interval = setInterval(fetchTablesAndOrders, 4000);

    return () => {
      window.removeEventListener("table-status-changed", handleTableStatusChanged);
      window.removeEventListener("payment-completed", handlePaymentCompleted);
      window.removeEventListener("order-updated", handleRefresh);
      window.removeEventListener("kot-updated", handleRefresh);
      window.removeEventListener("focus", fetchTablesAndOrders);
      clearInterval(interval);
    };
  }, [fetchTablesAndOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const updatedRemaining: Record<number, number> = {};

      tables.forEach((t) => {
        if (t.status === "CLEANING") {
          const key = `table_cleaning_start_${t.id}`;
          const started = Number(localStorage.getItem(key));
          
          // If no active bill generation recorded, do NOT start cleaning countdown, immediately set AVAILABLE
          if (!started || isNaN(started)) {
            localStorage.removeItem(key);
            localStorage.removeItem(key);
            tableService.updateTableStatus(t.id, "AVAILABLE").catch(() => {});
            updateStatus(t.id, "AVAILABLE");
            return;
          }

          const elapsedSec = Math.floor((now - started) / 1000);
          const rem = Math.max(0, 300 - elapsedSec); // 5 minutes (300s)
          updatedRemaining[t.id] = rem;

          if (rem <= 0) {
            localStorage.removeItem(key);
            localStorage.removeItem(key);
            tableService.updateTableStatus(t.id, "AVAILABLE").catch(() => {});
            updateStatus(t.id, "AVAILABLE");
            window.dispatchEvent(
              new CustomEvent("table-status-changed", {
                detail: { tableId: t.id, status: "AVAILABLE" },
              })
            );
          }
        }
      });

      setCleaningRemaining(updatedRemaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [tables]);


  /* =======================================================
     BASIC LOOKUPS
     ======================================================= */

  const getTable = (
    tableId: number
  ) => {
    return tables.find(
      (table) => table.id === tableId
    );
  };


  const getOrderForTable = (
    tableId: number
  ) => {
    const tableObj = tables.find((t) => t.id === tableId);
    if (tableObj?.orderId) {
      const match = orders.find(
        (order) =>
          order.id === tableObj.orderId &&
          (order.status === "OPEN" || order.status === "BILL_REQUESTED")
      );
      if (match) return match;
    }
    return orders.find(
      (order) =>
        order.tableId === tableId &&
        (order.status === "OPEN" || order.status === "BILL_REQUESTED")
    );
  };


  const getReservationForTable = (
    tableId: number
  ) => {
    return reservations.find(
      (reservation) =>
        reservation.tableId === tableId &&
        reservation.status === "CONFIRMED"
    );
  };


  /* =======================================================
     ORDER TOTALS
     ======================================================= */

  const calculateOrderTotals = (
    order: Order
  ) => {
    const subtotal = order.items.reduce(
      (sum, item) =>
        sum + item.price * item.qty,
      0
    );

    const discount = Math.max(
      0,
      Math.min(order.discount, subtotal)
    );

    const taxableAmount =
      subtotal - discount;

    const tax =
      taxableAmount *
      (order.taxRate / 100);

    const total =
      taxableAmount + tax;

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  };


  /* =======================================================
     STATUS COUNTS
     ======================================================= */

  const count = (
    status: Status
  ) => {
    return tables.filter(
      (table) =>
        table.status === status
    ).length;
  };


  const totalGuests = useMemo(() => {
    return tables.reduce(
      (total, table) =>
        total + (table.guestCount || 0),
      0
    );
  }, [tables]);


  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === "OPEN" ||
        order.status === "BILL_REQUESTED"
    ).length;
  }, [orders]);


  /* =======================================================
     FILTERED TABLES
     ======================================================= */

  const filteredTables = useMemo(() => {
    const query =
      search
        .toLowerCase()
        .trim();

    return tables.filter((table) => {
      const statusMatch =
        statusFilter === "ALL" ||
        table.status === statusFilter;

      const areaMatch =
        areaFilter === "All Areas" ||
        table.area === areaFilter;

      const searchMatch =
        !query ||
        table.name
          .toLowerCase()
          .includes(query) ||
        table.area
          .toLowerCase()
          .includes(query) ||
        table.status
          .toLowerCase()
          .includes(query) ||
        table.guest
          ?.toLowerCase()
          .includes(query);

      return (
        statusMatch &&
        areaMatch &&
        searchMatch
      );
    });
  }, [
    tables,
    search,
    statusFilter,
    areaFilter,
  ]);


  /* =======================================================
     MENU FILTERING
     ======================================================= */

  const menuCategories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          menuItems.map(
            (item) => item.category
          )
        )
      ),
    ];
  }, [menuItems]);


  const filteredMenuItems =
    useMemo(() => {
      const query =
        menuSearch
          .toLowerCase()
          .trim();

      return menuItems.filter(
        (item) => {
          const categoryMatch =
            menuCategory === "All" ||
            item.category ===
              menuCategory;

          const searchMatch =
            !query ||
            item.name
              .toLowerCase()
              .includes(query) ||
            item.category
              .toLowerCase()
              .includes(query);

          return (
            categoryMatch &&
            searchMatch
          );
        }
      );
    }, [
      menuSearch,
      menuCategory,
    ]);


  /* =======================================================
     AVAILABLE TABLES
     ======================================================= */

  const availableTransferTables =
    useMemo(() => {
      return tables.filter(
        (table) =>
          table.status ===
            "AVAILABLE" &&
          table.id !== selected?.id
      );
    }, [
      tables,
      selected,
    ]);


  /* =======================================================
     OCCUPIED TABLES FOR MERGE
     ======================================================= */

  const mergeCandidates =
    useMemo(() => {
      return tables.filter(
        (table) =>
          table.status ===
            "OCCUPIED" &&
          table.id !== selected?.id
      );
    }, [
      tables,
      selected,
    ]);


  /* =======================================================
     MODAL HELPERS
     ======================================================= */

  const closeModal = () => {
    setModal(null);

    setConfirmAction(null);

    setSelected(null);

    setSelectedOrder(null);

    setSelectedReservation(null);

    setMenuSearch("");

    setMenuCategory("All");

    setCustomization("");
    setDraftItems([]);

    setNewMenuItemName("");

    setNewMenuItemPrice("");

    setTransferTargetId("");

    setMergeTableIds([]);

    setPaymentMethod("UPI");

    setPaymentAmount("");
  };


  const openTableDetails = (
    table: Table
  ) => {
    setSelected(table);

    setModal("details");
  };


  const openOrder = (
    table: Table
  ) => {
    const order =
      getOrderForTable(table.id);

    if (!order) {
      setSelected(table);
      setGuest(table.guest || "");
      setGuestCount(String(table.guestCount || Math.min(table.capacity, 2)));
      setDraftItems([]);
      setModal("start-order");
      return;
    }

    setSelected(table);
    setSelectedOrder(order);
    setGuest(order.guestName || table.guest || "Guest");
    setGuestCount(String(order.guestCount || table.guestCount || 2));
    setDraftItems(order.items || []);
    setDiscountInput(String(order.discount || 0));
    setMenuCategory("All");
    setMenuSearch("");
    setModal("order");
  };

  const handleItemStepperChange = (menuItem: MenuItem, delta: number) => {
    if (!selectedOrder) return;
    const existing = selectedOrder.items.find((it) => it.name === menuItem.name);
    let updatedItems: OrderItem[];
    if (!existing) {
      if (delta > 0) {
        updatedItems = [
          ...selectedOrder.items,
          {
            id: nextId(selectedOrder.items),
            name: menuItem.name,
            qty: delta,
            price: menuItem.price,
          },
        ];
      } else {
        return;
      }
    } else {
      const nextQty = existing.qty + delta;
      if (nextQty <= 0) {
        updatedItems = selectedOrder.items.filter((it) => it.name !== menuItem.name);
      } else {
        updatedItems = selectedOrder.items.map((it) =>
          it.name === menuItem.name ? { ...it, qty: nextQty } : it
        );
      }
    }
    const updatedOrder: Order = {
      ...selectedOrder,
      guestName: guest.trim() || selectedOrder.guestName,
      guestCount: Number(guestCount) || selectedOrder.guestCount,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    setSelectedOrder(updatedOrder);
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    const totals = calculateOrderTotals(updatedOrder);
    if (selected) {
      updateTable(selected.id, { bill: totals.total, guest: updatedOrder.guestName, guestCount: updatedOrder.guestCount });
    }
  };

  const getItemQtyInOrder = (menuItem: MenuItem): number => {
    if (!selectedOrder) return 0;
    const found = selectedOrder.items.find((it) => it.name === menuItem.name);
    return found ? found.qty : 0;
  };


  /* =======================================================
     TABLE UPDATE
     ======================================================= */

  const updateTable = (
    id: number,
    changes: Partial<Table>
  ) => {
    setTables((previous) =>
      previous.map((table) =>
        table.id === id
          ? {
              ...table,
              ...changes,
            }
          : table
      )
    );
  };


  /* =======================================================
     STATUS UPDATE
     ======================================================= */

  const updateStatus = (
    id: number,
    status: Status
  ) => {
    setTables((previous) =>
      previous.map((table) => {
        if (table.id !== id) {
          return table;
        }

        if (status === "AVAILABLE") {
          return {
            ...table,
            status,
            guest: undefined,
            guestCount: undefined,
            time: undefined,
            bill: undefined,
            orderId: undefined,
            seatedAt: undefined,
            reservationId: undefined,
            note: undefined,
          };
        }

        return {
          ...table,
          status,
        };
      })
    );

    tableService
      .updateTableStatus(id, status)
      .catch((err) => console.warn("Failed to sync table status to backend:", err));
  };


  /* =======================================================
     ADD TABLE
     ======================================================= */

  const addTable = async () => {
    const numericCapacity =
      Number(capacity);

    if (
      !numericCapacity ||
      numericCapacity < 1
    ) {
      return;
    }

    try {
      const created = await tableService.createTable({
        branchId: selectedBranchId || 1,
        name: `Table ${String(tables.length + 1).padStart(2, "0")}`,
        capacity: numericCapacity,
        area,
        note: note.trim() || undefined,
      });

      const newTable: Table = {
        id: created?.id || nextId(tables),
        name: created?.name || `Table ${String(created?.id || tables.length + 1).padStart(2, "0")}`,
        capacity: created?.capacity || numericCapacity,
        area: created?.area || area,
        status: (created?.status as any) || "AVAILABLE",
        note: created?.note || note.trim() || undefined,
      };

      setTables((previous) => [
        ...previous,
        newTable,
      ]);

      setCapacity("4");
      setArea("Main Dining");
      setNote("");
      closeModal();
    } catch (err: any) {
      console.error("Failed to sync created table to backend:", err);
      dialogService.alert({
        title: currentLanguage === "mr" ? "टेबल जतन करण्यात अयशस्वी" : currentLanguage === "hi" ? "टेबल सहेजने में विफल" : "Failed to Save Table",
        message: err?.response?.data?.message || err.message || (currentLanguage === "mr" ? "बॅकएंडवर टेबल जतन करताना त्रुटी" : currentLanguage === "hi" ? "बैकएंड पर टेबल सहेजने में त्रुटि" : "Error saving table to backend"),
        confirmText: currentLanguage === "mr" ? "ठीक आहे" : currentLanguage === "hi" ? "ठीक है" : "OK",
        type: "error",
      });
    }
  };


  /* =======================================================
     EDIT TABLE
     ======================================================= */

  const editTable = async () => {
    if (!selected) {
      return;
    }

    const numericCapacity =
      Number(capacity);

    if (
      !numericCapacity ||
      numericCapacity < 1
    ) {
      return;
    }

    try {
      if (selected.id && selected.id < 1000000000) {
        await tableService.updateTable(selected.id, {
          branchId: selectedBranchId || 1,
          name: selected.name,
          capacity: numericCapacity,
          area,
          note: note.trim() || undefined,
        });
      }

      updateTable(
        selected.id,
        {
          capacity: numericCapacity,
          area,
          note: note.trim() || undefined,
        }
      );

      closeModal();
    } catch (err: any) {
      console.error("Failed to update table in backend:", err);
      dialogService.alert({
        title: currentLanguage === "mr" ? "टेबल अपडेट करण्यात अयशस्वी" : currentLanguage === "hi" ? "टेबल अपडेट करने में विफल" : "Failed to Update Table",
        message: err?.response?.data?.message || err.message || (currentLanguage === "mr" ? "बॅकएंडवर टेबल अपडेट करताना त्रुटी" : currentLanguage === "hi" ? "बैकएंड पर टेबल अपडेट करने में त्रुटि" : "Error updating table in backend"),
        confirmText: currentLanguage === "mr" ? "ठीक आहे" : currentLanguage === "hi" ? "ठीक है" : "OK",
        type: "error",
      });
    }
  };


  /* =======================================================
     DELETE TABLE
     ======================================================= */

  const deleteTable = async () => {
    if (!selected) {
      return;
    }

    const table =
      getTable(selected.id);

    if (!table) {
      return;
    }

    if (
      table.status === "OCCUPIED" ||
      table.status === "BILLING"
    ) {
      const formattedTable = formatTableName(selected.name, currentLanguage);
      const localizedStatus = translateStatus(table.status);
      dialogService.alert({
        title: currentLanguage === "mr" ? "टेबल हटवता येत नाही" : currentLanguage === "hi" ? "टेबल नहीं हटा सकते" : "Cannot Delete Table",
        message: currentLanguage === "mr"
          ? `${formattedTable} हे सध्या ${localizedStatus} स्थितीत आहे. फक्त उपलब्ध किंवा स्वच्छता स्थितीतील टेबल हटवले जाऊ शकतात.`
          : currentLanguage === "hi"
          ? `${formattedTable} वर्तमान में ${localizedStatus} स्थिति में है। केवल उपलब्ध या सफाई स्थिति वाली टेबल हटाई जा सकती हैं।`
          : `Table "${selected.name}" is currently ${table.status}. Only Available or Cleaning tables can be deleted.`,
        confirmText: currentLanguage === "mr" ? "ठीक आहे" : currentLanguage === "hi" ? "ठीक है" : "OK",
        type: "warning",
      });
      return;
    }

    const formattedTable = formatTableName(selected.name, currentLanguage);
    const confirmed = await dialogService.confirm({
      title: currentLanguage === "mr" ? "टेबल हटवा" : currentLanguage === "hi" ? "टेबल हटाएं" : "Delete Table",
      message: currentLanguage === "mr"
        ? `तुम्हाला खात्री आहे की आपण "${formattedTable}" टेबल हटवू इच्छिता? ही क्रिया पूर्ववत केली जाऊ शकत नाही.`
        : currentLanguage === "hi"
        ? `क्या आप वाकई "${formattedTable}" टेबल हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।`
        : `Are you sure you want to delete Table "${selected.name}"? This action cannot be undone.`,
      confirmVariant: "danger",
      confirmText: currentLanguage === "mr" ? "टेबल हटवा" : currentLanguage === "hi" ? "टेबल हटाएं" : "Delete Table",
      cancelText: currentLanguage === "mr" ? "रद्द करा" : currentLanguage === "hi" ? "रद्द करें" : "Cancel",
    });
    if (!confirmed) {
      return;
    }

    try {
      if (selected.id && selected.id < 1000000000) {
        await tableService.deleteTable(selected.id);
      }

      setTables((previous) =>
        previous.filter(
          (item) =>
            item.id !== selected.id
        )
      );

      setReservations((previous) =>
        previous.filter(
          (reservation) =>
            reservation.tableId !==
            selected.id
        )
      );

      closeModal();
    } catch (err: any) {
      console.error("Failed to delete table from backend:", err);
      dialogService.alert({
        title: currentLanguage === "mr" ? "टेबल हटवण्यात अयशस्वी" : currentLanguage === "hi" ? "टेबल हटाने में विफल" : "Failed to Delete Table",
        message: err?.response?.data?.message || err.message || (currentLanguage === "mr" ? "बॅकएंडवरून टेबल हटवताना त्रुटी" : currentLanguage === "hi" ? "बैकएंड से टेबल हटाने में त्रुटि" : "Error deleting table from backend"),
        confirmText: currentLanguage === "mr" ? "ठीक आहे" : currentLanguage === "hi" ? "ठीक है" : "OK",
        type: "error",
      });
    }
  };


  /* =======================================================
     OPEN ADD TABLE MODAL
     ======================================================= */

  const openAddTable = () => {
    setCapacity("4");

    setArea("Main Dining");

    setNote("");

    setSelected(null);

    setModal("add");
  };


  /* =======================================================
     OPEN EDIT MODAL
     ======================================================= */

  const openEditTable = (
    table: Table
  ) => {
    setSelected(table);

    setCapacity(
      String(table.capacity)
    );

    setArea(table.area);

    setNote(
      table.note || ""
    );

    setModal("edit");
  };


  /* =======================================================
     RESERVATION MODAL
     ======================================================= */

  const openReserve = (
    table: Table
  ) => {
    setSelected(table);

    setGuest("");

    setGuestCount(
      String(
        Math.min(
          table.capacity,
          2
        )
      )
    );

    setReservationDate(
      getToday()
    );

    setReservationTime(
      "19:30"
    );

    setReservationPhone("");

    setReservationNotes("");

    setModal("reserve");
  };


  /* =======================================================
     CREATE RESERVATION
     ======================================================= */

  const reserveTable = () => {
    if (!selected) {
      return;
    }

    if (!guest.trim()) {
      return;
    }

    const numericGuests =
      Number(guestCount);

    if (
      numericGuests < 1 ||
      numericGuests >
        selected.capacity
    ) {
      return;
    }

    const reservationId =
      nextId(reservations);

    const reservation: Reservation = {
      id:
        reservationId,

      tableId:
        selected.id,

      guestName:
        guest.trim(),

      guestCount:
        numericGuests,

      date:
        reservationDate,

      time:
        reservationTime,

      phone:
        reservationPhone.trim(),

      notes:
        reservationNotes.trim(),

      status:
        "CONFIRMED",

      createdAt:
        new Date().toISOString(),
    };

    setReservations(
      (previous) => [
        ...previous,
        reservation,
      ]
    );

    updateTable(
      selected.id,
      {
        status:
          "RESERVED",

        guest:
          guest.trim(),

        guestCount:
          numericGuests,

        time:
          reservationTime,

        reservationId:
          reservationId,
      }
    );

    closeModal();
  };


  /* =======================================================
     SEAT RESERVED GUEST
     ======================================================= */

  const seatReservedGuest = (
    table: Table
  ) => {
    const reservation =
      getReservationForTable(
        table.id
      );

    if (!reservation) {
      updateStatus(
        table.id,
        "OCCUPIED"
      );

      return;
    }

    setReservations(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            reservation.id
              ? {
                  ...item,
                  status:
                    "SEATED",
                }
              : item
        )
    );

    const orderId =
      nextId(orders);

    const now =
      new Date().toISOString();

    const newOrder: Order = {
      id:
        orderId,

      tableId:
        table.id,

      guestName:
        reservation.guestName,

      guestCount:
        reservation.guestCount,

      items: [],

      status:
        "OPEN",

      discount:
        0,

      taxRate:
        5,

      createdAt:
        now,

      updatedAt:
        now,
    };

    setOrders(
      (previous) => [
        ...previous,
        newOrder,
      ]
    );

    updateTable(
      table.id,
      {
        status:
          "OCCUPIED",

        guest:
          reservation.guestName,

        guestCount:
          reservation.guestCount,

        orderId,

        seatedAt:
          getCurrentTime(),

        time:
          undefined,

        reservationId:
          undefined,
      }
    );

    setSelected(table);

    setSelectedOrder(
      newOrder
    );

    setModal("order");
  };


  /* =======================================================
     START NEW ORDER
     ======================================================= */

  const startOrder = async () => {
    if (!selected) {
      return;
    }

    const existingOrder = getOrderForTable(selected.id);
    if (existingOrder) {
      setSelectedOrder(existingOrder);
      setGuest(existingOrder.guestName || selected.guest || "Guest");
      setGuestCount(String(existingOrder.guestCount || selected.guestCount || 1));
      setDraftItems(existingOrder.items || []);
      setDiscountInput(String(existingOrder.discount || 0));
      setMenuCategory("All");
      setMenuSearch("");
      setModal("order");
      return;
    }

    const guestName = guest.trim() || "Guest";
    const numericGuests = Math.min(
      Math.max(1, Number(guestCount) || 1),
      Math.max(selected.capacity, 1)
    );

    const now =
      new Date().toISOString();

    let backendOrderId = nextId(orders);
    try {
      const res = await orderService.createOrder({
        branchId: selectedBranchId || 1,
        tableId: selected.id,
        guestName: guestName,
        guestCount: numericGuests,
        discount: 0,
        taxRate: 5,
        items: [],
      });
      if (res?.id) {
        backendOrderId = res.id;
      }
      await tableService.updateTableStatus(selected.id, "OCCUPIED").catch(() => {});
    } catch (err) {
      console.warn("Could not save start order to backend:", err);
    }

    const newOrder: Order = {
      id:
        backendOrderId,

      tableId:
        selected.id,

      tableName:
        formatTableNumber(selected),

      tableNumber:
        formatTableNumber(selected),

      guestName:
        guest.trim(),

      guestCount:
        numericGuests,

      items: [],

      status:
        "OPEN",

      discount:
        0,

      taxRate:
        5,

      createdAt:
        now,

      updatedAt:
        now,
      sentToKitchen: false,
    };

    setOrders(
      (previous) => [
        ...previous.filter((o) => o.tableId !== selected.id),
        newOrder,
      ]
    );

    updateTable(
      selected.id,
      {
        status:
          "OCCUPIED",

        guest:
          guestName,

        guestCount:
          numericGuests,

        orderId: backendOrderId,

        seatedAt:
          getCurrentTime(),

        bill:
          0,
      }
    );

    setSelected((prev) =>
      prev && prev.id === selected.id
        ? {
            ...prev,
            status: "OCCUPIED",
            guest: guestName,
            guestCount: numericGuests,
            orderId: backendOrderId,
            seatedAt: getCurrentTime(),
            bill: 0,
          }
        : prev
    );

    window.dispatchEvent(
      new CustomEvent("table-status-changed", {
        detail: { tableId: selected.id, status: "OCCUPIED" },
      })
    );

    setDraftItems([]);
    setSelectedOrder(
      newOrder
    );

    setDiscountInput("0");
    setMenuCategory("All");
    setMenuSearch("");

    // After guest confirmation, show VIEW ORDER.
    // The user can then add food items and continue the order workflow.
    setModal("order");
  };


  /* =======================================================
     ADD ITEM TO DRAFT
     ======================================================= */

  const addItemToOrder = (
    item: MenuItem
  ) => {
    const existing = draftItems.find(
      (orderItem) =>
        orderItem.name === item.name &&
        orderItem.customization ===
          (customization.trim() || undefined)
    );

    if (existing) {
      setDraftItems((previous) =>
        previous.map((orderItem) =>
          orderItem.id === existing.id
            ? { ...orderItem, qty: orderItem.qty + 1 }
            : orderItem
        )
      );
    } else {
      setDraftItems((previous) => [
        ...previous,
        {
          id: nextId(previous),
          name: item.name,
          qty: 1,
          price: item.price,
          customization: customization.trim() || undefined,
          taxRate: item.taxRate || 5,
          hsnCode: item.hsnCode || "996331",
        },
      ]);
    }

    // IMPORTANT: stay on Add Items screen.
    // Do not return to the order screen after selecting one item.
    setCustomization("");
  };

  const getDraftItemQty = (item: MenuItem): number => {
    const existing = draftItems.find((orderItem) => orderItem.name === item.name);
    return existing ? existing.qty : 0;
  };

  const changeDraftItemQty = (item: MenuItem, delta: number) => {
    const existing = draftItems.find((orderItem) => orderItem.name === item.name);
    if (!existing) {
      if (delta > 0) {
        setDraftItems((prev) => [
          ...prev,
          {
            id: nextId(prev),
            name: item.name,
            qty: delta,
            price: item.price,
            customization: customization.trim() || undefined,
            taxRate: item.taxRate || 5,
            hsnCode: item.hsnCode || "996331",
          },
        ]);
      }
      return;
    }

    const nextQty = existing.qty + delta;
    if (nextQty <= 0) {
      setDraftItems((prev) => prev.filter((orderItem) => orderItem.name !== item.name));
    } else {
      setDraftItems((prev) =>
        prev.map((orderItem) =>
          orderItem.name === item.name ? { ...orderItem, qty: nextQty } : orderItem
        )
      );
    }
  };


  /* =======================================================
     CONFIRM ITEMS
     ======================================================= */

  const confirmItems = async () => {
    if (!selectedOrder) {
      return;
    }

    const updatedOrder: Order = {
      ...selectedOrder,
      items: draftItems,
      updatedAt: new Date().toISOString(),
    };

    const totals = calculateOrderTotals(updatedOrder);

    setSelectedOrder(updatedOrder);
    setOrders((previous) =>
      previous.map((order) =>
        order.id === updatedOrder.id
          ? updatedOrder
          : order
      )
    );

    updateTable(updatedOrder.tableId, {
      bill: totals.total,
    });

    if (updatedOrder.id && updatedOrder.id < 1000000000 && selected) {
      try {
        await orderService.updateOrder(updatedOrder.id, {
          branchId: selectedBranchId || 1,
          tableId: selected.id,
          guestName: updatedOrder.guestName,
          guestCount: updatedOrder.guestCount,
          discount: updatedOrder.discount || 0,
          taxRate: updatedOrder.taxRate || 5,
          items: draftItems.map((it) => ({
            name: it.name,
            quantity: it.qty,
            unitPrice: it.price,
            customization: it.customization || "",
          })),
        });
        window.dispatchEvent(new CustomEvent("order-updated", { detail: { orderId: updatedOrder.id } }));
        window.dispatchEvent(new CustomEvent("kot-updated"));
      } catch (err) {
        console.warn("Could not sync items to backend:", err);
      }
    }

    setDraftItems([]);
    setModal("order");
  };


  /* =======================================================
     CHANGE ITEM QUANTITY
     ======================================================= */

  const changeItemQuantity = (
    itemId: number,
    amount: number
  ) => {
    if (!selectedOrder) {
      return;
    }

    const updatedItems =
      selectedOrder.items
        .map((item) => {
          if (
            item.id !== itemId
          ) {
            return item;
          }

          return {
            ...item,
            qty:
              item.qty + amount,
          };
        })
        .filter(
          (item) =>
            item.qty > 0
        );

    const updatedOrder: Order = {
      ...selectedOrder,

      items:
        updatedItems,

      updatedAt:
        new Date().toISOString(),
    };

    setSelectedOrder(
      updatedOrder
    );

    setOrders(
      (previous) =>
        previous.map(
          (order) =>
            order.id ===
            updatedOrder.id
              ? updatedOrder
              : order
        )
    );

    const totals =
      calculateOrderTotals(
        updatedOrder
      );

    updateTable(
      updatedOrder.tableId,
      {
        bill:
          totals.total,
      }
    );
  };


  /* =======================================================
     REMOVE ORDER ITEM
     ======================================================= */

  const removeOrderItem = (
    itemId: number
  ) => {
    if (!selectedOrder) {
      return;
    }

    const updatedOrder: Order = {
      ...selectedOrder,

      items:
        selectedOrder.items.filter(
          (item) =>
            item.id !== itemId
        ),

      updatedAt:
        new Date().toISOString(),
    };

    setSelectedOrder(
      updatedOrder
    );

    setOrders(
      (previous) =>
        previous.map(
          (order) =>
            order.id ===
            updatedOrder.id
              ? updatedOrder
              : order
        )
    );

    const totals =
      calculateOrderTotals(
        updatedOrder
      );

    updateTable(
      updatedOrder.tableId,
      {
        bill:
          totals.total,
      }
    );
  };


  /* =======================================================
     UPDATE ORDER DISCOUNT
     ======================================================= */

  const updateOrderDiscount = (
    value: string
  ) => {
    setDiscountInput(value);

    if (!selectedOrder) {
      return;
    }

    const numericDiscount =
      Math.max(
        0,
        Number(value) || 0
      );

    const updatedOrder: Order = {
      ...selectedOrder,

      discount:
        numericDiscount,

      updatedAt:
        new Date().toISOString(),
    };

    setSelectedOrder(
      updatedOrder
    );

    setOrders(
      (previous) =>
        previous.map(
          (order) =>
            order.id ===
            updatedOrder.id
              ? updatedOrder
              : order
        )
    );

    const totals =
      calculateOrderTotals(
        updatedOrder
      );

    updateTable(
      updatedOrder.tableId,
      {
        bill:
          totals.total,
      }
    );
  };


  /* =======================================================
     SEND ORDER TO KITCHEN
     ======================================================= */

  const sendOrderToKitchen = async () => {
    if (!selectedOrder || !selected) {
      return;
    }

    if (selectedOrder.items.length === 0) {
      return;
    }

    let backendOrderId = selectedOrder.id;
    try {
      const payload = {
        branchId: selectedBranchId || 1,
        tableId: selected.id,
        guestName: selectedOrder.guestName || selected.guest || "Guest",
        guestCount: selectedOrder.guestCount || selected.guestCount || 1,
        discount: selectedOrder.discount || 0,
        taxRate: selectedOrder.taxRate || 5,
        items: selectedOrder.items.map((it) => ({
          name: it.name,
          quantity: it.qty,
          unitPrice: it.price,
          customization: it.customization || "",
        })),
      };

      if (selectedOrder.id && selectedOrder.id < 1000000000) {
        const res = await orderService.updateOrder(selectedOrder.id, payload);
        if (res?.id) backendOrderId = res.id;
      } else {
        const res = await orderService.createOrder(payload);
        if (res?.id) backendOrderId = res.id;
      }

      await tableService.updateTableStatus(selected.id, "OCCUPIED").catch(() => {});

      if (backendOrderId) {
        try {
          await kotService.createKot({
            branchId: selectedBranchId || 1,
            orderId: backendOrderId,
            instructions: `Table No: ${formatTableNumber(selected)} - ${selectedOrder.guestName || selected.guest || "Guest"}`
          });
        } catch (kotErr) {
          console.warn("Could not create backend KOT entity:", kotErr);
        }

        try {
          const existingRaw = localStorage.getItem("pending_kots");
          const existingPending = existingRaw ? JSON.parse(existingRaw) : [];
          const newKotEntry = {
            id: backendOrderId,
            kotNumber: `KOT-${backendOrderId}`,
            orderId: backendOrderId,
            customerId: 1,
            customerName: selectedOrder.guestName || selected.guest || "Guest",
            tableId: selected.id,
            tableName: formatTableNumber(selected),
            tableNumber: formatTableNumber(selected),
            status: "PENDING",
            createdAt: new Date().toISOString(),
            items: selectedOrder.items.map((it, idx) => ({
              id: idx + 1,
              itemName: it.name,
              quantity: it.qty,
              price: it.price,
            }))
          };
          const updatedList = [newKotEntry, ...existingPending.filter((p: any) => p.orderId !== backendOrderId && p.id !== backendOrderId)];
          localStorage.setItem("pending_kots", JSON.stringify(updatedList));
        } catch (e) {
          console.warn("Could not sync pending_kots to localStorage:", e);
        }
      }
    } catch (err) {
      console.warn("Could not save order directly to backend:", err);
    }

    const updatedOrder: Order = {
      ...selectedOrder,
      id: backendOrderId,
      tableName: formatTableNumber(selected),
      tableNumber: formatTableNumber(selected),
      sentToKitchen: true,
      updatedAt: new Date().toISOString(),
    };

    setOrders((previous) =>
      previous.map((order) =>
        order.id === selectedOrder.id
          ? updatedOrder
          : order
      )
    );

    setSelectedOrder(updatedOrder);

    const totals = calculateOrderTotals(updatedOrder);
    const updatedTable: Table = {
      ...selected,
      status: "OCCUPIED",
      orderId: backendOrderId,
      guest: updatedOrder.guestName,
      guestCount: updatedOrder.guestCount,
      bill: totals.total,
    };

    updateTable(selected.id, {
      status: "OCCUPIED",
      orderId: backendOrderId,
      guest: updatedOrder.guestName,
      guestCount: updatedOrder.guestCount,
      bill: totals.total,
    });

    window.dispatchEvent(
      new CustomEvent("table-status-changed", {
        detail: { tableId: selected.id, status: "OCCUPIED" },
      })
    );
    window.dispatchEvent(new CustomEvent("order-updated", { detail: { orderId: backendOrderId } }));
    window.dispatchEvent(new CustomEvent("kot-updated"));

    closeModal();
    const formattedTable = formatTableName(formatTableNumber(selected), currentLanguage);
    const orderTitle =
      currentLanguage === "mr"
        ? "ऑर्डर यशस्वीरित्या दिली"
        : currentLanguage === "hi"
        ? "ऑर्डर सफलतापूर्वक दर्ज की गई"
        : "Order Placed Successfully";

    const orderMsg =
      currentLanguage === "mr"
        ? `${formattedTable} साठी ऑर्डर यशस्वीरित्या तयार केली! टेबल आता ${translateStatus("OCCUPIED")} आहे.`
        : currentLanguage === "hi"
        ? `${formattedTable} के लिए ऑर्डर सफलतापूर्वक बनाया गया! टेबल अब ${translateStatus("OCCUPIED")} है.`
        : `Order successfully created for Table No: ${formatTableNumber(selected)}! Table is now OCCUPIED.`;

    await dialogService.alert({
      title: orderTitle,
      message: orderMsg,
      confirmText: currentLanguage === "mr" ? "ठीक आहे" : currentLanguage === "hi" ? "ठीक है" : "OK",
      type: "success",
    });

    navigate("/hotel/kot");
  };


  /* =======================================================
     OPEN PAYMENT
     ======================================================= */

  const openPayment = (
    table: Table
  ) => {
    const order =
      getOrderForTable(
        table.id
      );

    if (!order) {
      return;
    }

    const totals =
      calculateOrderTotals(
        order
      );

    setSelected(table);

    setSelectedOrder(order);

    setPaymentAmount(
      String(
        Math.round(
          totals.total
        )
      )
    );

    setPaymentMethod("UPI");

    setModal("payment");
  };


  /* =======================================================
     COMPLETE PAYMENT
     ======================================================= */

  const completePayment = async () => {
    if (
      !selected ||
      !selectedOrder
    ) {
      return;
    }

    const totals =
      calculateOrderTotals(
        selectedOrder
      );

    const paid =
      Number(
        paymentAmount
      );

    if (
      !paid ||
      paid < totals.total
    ) {
      return;
    }

    try {
      const invoices = await billingService.getInvoices().catch(() => []);
      let matchingInvoice = invoices.find(
        (inv: any) =>
          inv.orderId === selectedOrder.id ||
          inv.tableNumber === selected.name ||
          inv.tableName === selected.name
      );

      let invoiceId = matchingInvoice?.id;
      if (!invoiceId) {
        const inv = await billingService.createInvoice({
          branchId: selectedBranchId || 1,
          orderId: selectedOrder.id,
          discountAmount: totals.discount || 0,
          items: selectedOrder.items.map((it) => ({
            description: it.name,
            quantity: it.qty,
            unitPrice: it.price,
            taxRate: it.taxRate || 5,
            hsnCode: it.hsnCode || "996331",
          })),
        });
        invoiceId = inv?.id;
      }

      if (invoiceId) {
        await paymentService.recordPayment({
          invoiceId,
          amount: paid,
          paymentMethod: (paymentMethod as any) || "UPI",
          transactionRef: `TXN-INV-${invoiceId}`,
          paymentDate: new Date().toISOString().split("T")[0],
          notes: `Settled Table ${selected.name}`,
        });
      }
    } catch (err) {
      console.error("Failed to record payment in backend:", err);
    }

    const updatedOrder: Order = {
      ...selectedOrder,
      status: "PAID",
      updatedAt: new Date().toISOString(),
    };

    setOrders(
      (previous) =>
        previous.map(
          (order) =>
            order.id ===
            updatedOrder.id
              ? updatedOrder
              : order
        )
    );

    localStorage.setItem(`table_cleaning_start_${selected.id}`, String(Date.now()));
    updateTable(
      selected.id,
      {
        status: "CLEANING",
        bill: 0,
        guest: undefined,
        guestCount: undefined,
        orderId: undefined,
        note: undefined,
      }
    );

    tableService.updateTableStatus(selected.id, "CLEANING").catch(() => {});
    window.dispatchEvent(
      new CustomEvent("table-status-changed", {
        detail: { tableId: selected.id, status: "CLEANING" },
      })
    );

    setModal("payment-success");
  };


  /* =======================================================
     MARK TABLE AVAILABLE
     ======================================================= */

  const markTableAvailable = async (
    table: Table
  ) => {
    try {
      await tableService.updateTableStatus(table.id, "AVAILABLE");
    } catch (err) {
      console.warn("Failed to set table available in backend:", err);
    }

    updateStatus(
      table.id,
      "AVAILABLE"
    );

    closeModal();
  };


  /* =======================================================
     OUT OF SERVICE
     ======================================================= */

  const setOutOfService = (
    table: Table
  ) => {
    if (
      table.status ===
        "OCCUPIED" ||
      table.status ===
        "BILLING"
    ) {
      return;
    }

    updateTable(
      table.id,
      {
        status:
          "OUT_OF_SERVICE",
      }
    );

    closeModal();
  };


  /* =======================================================
     ACTIVATE TABLE
     ======================================================= */

  const activateTable = (
    table: Table
  ) => {
    updateTable(
      table.id,
      {
        status:
          "AVAILABLE",
        note:
          undefined,
      }
    );

    closeModal();
  };


  /* =======================================================
     CLEANING → AVAILABLE
     ======================================================= */

  const completeCleaning = (
    table: Table
  ) => {
    if (
      table.status !==
      "CLEANING"
    ) {
      return;
    }

    localStorage.removeItem(`table_cleaning_start_${table.id}`);
    tableService.updateTableStatus(table.id, "AVAILABLE").catch(() => {});
    updateStatus(
      table.id,
      "AVAILABLE"
    );
    window.dispatchEvent(
      new CustomEvent("table-status-changed", {
        detail: { tableId: table.id, status: "AVAILABLE" },
      })
    );
    closeModal();
  };


  /* =======================================================
     TRANSFER TABLE
     ======================================================= */

  const transferTable = () => {
    if (
      !selected ||
      !transferTargetId
    ) {
      return;
    }

    const targetId =
      Number(
        transferTargetId
      );

    const target =
      getTable(targetId);

    if (!target) {
      return;
    }

    if (
      target.status !==
      "AVAILABLE"
    ) {
      return;
    }

    const order =
      getOrderForTable(
        selected.id
      );

    if (!order) {
      return;
    }

    const updatedOrder: Order = {
      ...order,

      tableId:
        target.id,

      updatedAt:
        new Date().toISOString(),
    };

    setOrders(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            order.id
              ? updatedOrder
              : item
        )
    );

    const totals =
      calculateOrderTotals(
        updatedOrder
      );

    updateTable(
      target.id,
      {
        status:
          selected.status,

        guest:
          selected.guest,

        guestCount:
          selected.guestCount,

        bill:
          totals.total,

        orderId:
          updatedOrder.id,

        seatedAt:
          selected.seatedAt,
      }
    );

    updateTable(
      selected.id,
      {
        status:
          "CLEANING",

        guest:
          undefined,

        guestCount:
          undefined,

        bill:
          undefined,

        orderId:
          undefined,

        seatedAt:
          undefined,
      }
    );

    closeModal();
  };


  /* =======================================================
     MERGE TABLE SELECTION
     ======================================================= */

  const toggleMergeTable = (
    tableId: number
  ) => {
    setMergeTableIds(
      (previous) =>
        previous.includes(tableId)
          ? previous.filter(
              (id) =>
                id !== tableId
            )
          : [
              ...previous,
              tableId,
            ]
    );
  };


  /* =======================================================
     MERGE TABLES
     ======================================================= */

  const mergeTables = () => {
    if (
      !selected ||
      mergeTableIds.length === 0
    ) {
      return;
    }

    const selectedTable =
      getTable(
        selected.id
      );

    if (!selectedTable) {
      return;
    }

    const allIds = [
      selected.id,
      ...mergeTableIds,
    ];

    const selectedOrders =
      orders.filter(
        (order) =>
          allIds.includes(
            order.tableId
          ) &&
          order.status !==
            "PAID" &&
          order.status !==
            "CANCELLED"
      );

    if (
      selectedOrders.length ===
      0
    ) {
      return;
    }

    const primaryOrder =
      selectedOrders.find(
        (order) =>
          order.tableId ===
          selected.id
      );

    if (!primaryOrder) {
      return;
    }

    const secondaryOrders =
      selectedOrders.filter(
        (order) =>
          order.id !==
          primaryOrder.id
      );

    let mergedItems =
      [
        ...primaryOrder.items,
      ];

    secondaryOrders.forEach(
      (order) => {
        order.items.forEach(
          (item) => {
            const existing =
              mergedItems.find(
                (mergedItem) =>
                  mergedItem.name ===
                    item.name &&
                  mergedItem.customization ===
                    item.customization
              );

            if (existing) {
              mergedItems =
                mergedItems.map(
                  (mergedItem) =>
                    mergedItem.id ===
                    existing.id
                      ? {
                          ...mergedItem,
                          qty:
                            mergedItem.qty +
                            item.qty,
                        }
                      : mergedItem
                );
            } else {
              mergedItems.push({
                ...item,
                id:
                  nextId(
                    mergedItems
                  ),
              });
            }
          }
        );
      }
    );

    const mergedGuestCount =
      allIds.reduce(
        (sum, id) =>
          sum +
          (getTable(id)
            ?.guestCount || 0),
        0
      );

    const updatedPrimaryOrder:
      Order = {
        ...primaryOrder,

        items:
          mergedItems,

        guestCount:
          mergedGuestCount,

        updatedAt:
          new Date().toISOString(),
      };

    setOrders(
      (previous) =>
        previous
          .filter(
            (order) =>
              !secondaryOrders.some(
                (secondary) =>
                  secondary.id ===
                  order.id
              )
          )
          .map(
            (order) =>
              order.id ===
              updatedPrimaryOrder.id
                ? updatedPrimaryOrder
                : order
          )
    );

    const totals =
      calculateOrderTotals(
        updatedPrimaryOrder
      );

    const primaryGuest =
      selectedTable.guest ||
      primaryOrder.guestName;

    updateTable(
      selected.id,
      {
        status:
          "OCCUPIED",

        guest:
          primaryGuest,

        guestCount:
          mergedGuestCount,

        bill:
          totals.total,

        orderId:
          updatedPrimaryOrder.id,
      }
    );

    mergeTableIds.forEach(
      (tableId) => {
        updateTable(
          tableId,
          {
            status:
              "CLEANING",

            guest:
              undefined,

            guestCount:
              undefined,

            bill:
              undefined,

            orderId:
              undefined,

            seatedAt:
              undefined,
          }
        );
      }
    );

    closeModal();
  };


  /* =======================================================
     SPLIT BILL TOTAL
     ======================================================= */

  const splitBillDetails =
    useMemo(() => {
      if (!selectedOrder) {
        return {
          total: 0,
          count: 1,
          each: 0,
        };
      }

      const totals =
        calculateOrderTotals(
          selectedOrder
        );

      const count =
        Math.max(
          1,
          Number(splitCount) ||
            1
        );

      return {
        total:
          totals.total,

        count,

        each:
          totals.total /
          count,
      };
    }, [
      selectedOrder,
      splitCount,
    ]);


  /* =======================================================
     OPEN SPLIT BILL
     ======================================================= */

  const openSplitBill = (
    table: Table
  ) => {
    const order =
      getOrderForTable(
        table.id
      );

    if (!order) {
      return;
    }

    setSelected(table);

    setSelectedOrder(order);

    setSplitCount(
      String(
        Math.max(
          2,
          order.guestCount
        )
      )
    );

    setModal(
      "split-bill"
    );
  };


  /* =======================================================
     RESERVATION DETAILS
     ======================================================= */

  const openReservationDetails = (
    reservation: Reservation
  ) => {
    setSelectedReservation(
      reservation
    );

    const table =
      getTable(
        reservation.tableId
      );

    if (table) {
      setSelected(table);
    }

    setModal(
      "reservation"
    );
  };


  /* =======================================================
     CANCEL RESERVATION
     ======================================================= */

  const cancelReservation = (
    reservation: Reservation
  ) => {
    setReservations(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            reservation.id
              ? {
                  ...item,
                  status:
                    "CANCELLED",
                }
              : item
        )
    );

    const table =
      getTable(
        reservation.tableId
      );

    if (
      table &&
      table.status ===
        "RESERVED"
    ) {
      updateTable(
        table.id,
        {
          status:
            "AVAILABLE",

          guest:
            undefined,

          guestCount:
            undefined,

          time:
            undefined,

          reservationId:
            undefined,
        }
      );
    }

    closeModal();
  };


  /* =======================================================
     GENERIC ACTION
     ======================================================= */

  const action = (
    table: Table
  ) => {
    switch (table.status) {

      case "AVAILABLE":
        // AVAILABLE starts the required guest-count flow.
        openOrder(table);
        break;

      case "RESERVED":
        seatReservedGuest(table);
        break;

      case "OCCUPIED":
        // Always enter TABLE DETAILS first.
        // The next step is VIEW ORDER or REQUEST BILL.
        openTableDetails(table);
        break;

      case "BILLING":
        openTableDetails(table);
        break;

      case "CLEANING":
        completeCleaning(table);
        break;

      case "OUT_OF_SERVICE":
        activateTable(table);
        break;

      default:
        break;
    }
  };


  /* =======================================================
     PRIMARY ACTION LABEL
     ======================================================= */

  const actionLabel = (
    table: Table
  ) => {
    switch (table.status) {

      case "AVAILABLE":
        return t("startOrder", "Start Order");

      case "RESERVED":
        return t("seatGuest", "Seat Guest");

      case "OCCUPIED":
        return t("viewDetails", "View Details");

      case "BILLING":
        return t("proceedToPayment", "Proceed to Payment");

      case "CLEANING":
        return t("markAvailable", "Mark Available");

      case "OUT_OF_SERVICE":
        return t("activate", "Activate");

      default:
        return t("open", "Open");
    }
  };


  /* =======================================================
     OPEN TRANSFER
     ======================================================= */

  const openTransfer = (
    table: Table
  ) => {
    const order =
      getOrderForTable(
        table.id
      );

    if (!order) {
      return;
    }

    setSelected(table);

    setSelectedOrder(order);

    setTransferTargetId("");

    setModal("transfer");
  };


  /* =======================================================
     OPEN MERGE
     ======================================================= */

  const openMerge = (
    table: Table
  ) => {
    if (
      table.status !==
      "OCCUPIED"
    ) {
      return;
    }

    setSelected(table);

    setMergeTableIds([]);

    setModal("merge");
  };


  /* =======================================================
     OPEN OUT OF SERVICE
     ======================================================= */

  const openOutOfService =
    (
      table: Table
    ) => {
      setSelected(table);

      setConfirmAction(
        "out-of-service"
      );

      setModal("confirm");
    };


  /* =======================================================
     CONFIRM ACTION HANDLER
     ======================================================= */

  const executeConfirmAction =
    () => {
      if (
        !selected &&
        !selectedReservation
      ) {
        return;
      }

      switch (
        confirmAction
      ) {

        case "delete":
          deleteTable();
          break;

        case "out-of-service":
          if (selected) {
            setOutOfService(
              selected
            );
          }
          break;

        case "activate":
          if (selected) {
            activateTable(
              selected
            );
          }
          break;

        case "cancel-reservation":
          if (
            selectedReservation
          ) {
            cancelReservation(
              selectedReservation
            );
          }
          break;

        case "clear-table":
          if (selected) {
            markTableAvailable(
              selected
            );
          }
          break;

        case "complete-bill":
          if (selected) {
            openPayment(
              selected
            );
          }
          break;

        case "generate-kot":
          sendOrderToKitchen();
          closeModal();
          break;

        case "cancel-order":
          if (
            selectedOrder
          ) {
            const tableId =
              selectedOrder.tableId;

            setOrders(
              (previous) =>
                previous.map(
                  (order) =>
                    order.id ===
                    selectedOrder.id
                      ? {
                          ...order,
                          status:
                            "CANCELLED",
                        }
                      : order
                )
            );

            updateTable(
              tableId,
              {
                status:
                  "AVAILABLE",
              }
            );

            closeModal();
          }
          break;

        default:
          break;
      }
    };


  /* =======================================================
     OPEN CONFIRM
     ======================================================= */

  const openConfirm = (
    actionType: ConfirmAction
  ) => {
    setConfirmAction(
      actionType
    );

    setModal("confirm");
  };


  /* =======================================================
     CONFIRM TITLE
     ======================================================= */

  const confirmTitle =
    useMemo(() => {
      switch (
        confirmAction
      ) {
        case "delete":
          return t("deleteTable", "Delete Table");

        case "out-of-service":
          return t("setOutOfService", "Set Out of Service");

        case "activate":
          return t("activateTable", "Activate Table");

        case "cancel-reservation":
          return t("cancelReservation", "Cancel Reservation");

        case "clear-table":
          return t("clearTable", "Clear Table");

        case "complete-bill":
          return t("completeBill", "Complete Bill");

        case "cancel-order":
          return t("cancelOrder", "Cancel Order");

        case "generate-kot":
          return t("sendOrderToBillingQ", "Send Order to Billing?");

        default:
          return t("confirmAction", "Confirm Action");
      }
    }, [
      confirmAction,
      t,
    ]);


  /* =======================================================
     CONFIRM DESCRIPTION
     ======================================================= */

  const confirmDescription =
    useMemo(() => {
      switch (
        confirmAction
      ) {
        case "delete":
          return t("deleteTableDesc", "This table will be permanently removed from the table layout.");

        case "out-of-service":
          return t("outOfServiceDesc", "This table will no longer be available for new orders.");

        case "activate":
          return t("activateTableDesc", "This table will become available for service.");

        case "cancel-reservation":
          return t("cancelReservationDesc", "The reservation will be cancelled and the table will become available.");

        case "clear-table":
          return t("clearTableDesc", "The table will be cleared and returned to Available.");

        case "complete-bill":
          return t("completeBillDesc", "Continue to the payment screen to complete the bill.");

        case "cancel-order":
          return t("cancelOrderDesc", "This order will be cancelled and the table will be released.");

        case "generate-kot":
          return t("generateKotDesc", "Send this order to Billing. Table will remain Occupied until bill is generated.");

        default:
          return t("pleaseConfirmAction", "Please confirm this action.");
      }
    }, [
      confirmAction,
      t,
    ]);


  /* =======================================================
     TABLE CLASS
     ======================================================= */

  const tableCardClass = (
    table: Table
  ) => {
    return [
      "table-card",
      statusClass(
        table.status
      ),
    ].join(" ");
  };


  /* =======================================================
     TABLE VISUAL SHAPE
     ======================================================= */

  const tableShapeClass = (
    capacityValue: number
  ) => {
    if (
      capacityValue >= 8
    ) {
      return "table-shape large";
    }

    if (
      capacityValue >= 6
    ) {
      return "table-shape medium";
    }

    return "table-shape";
  };


  /* =======================================================
     OPEN EDIT FROM DETAILS
     ======================================================= */

  const editSelectedTable =
    () => {
      if (!selected) {
        return;
      }

      openEditTable(
        selected
      );
    };


  /* =======================================================
     RESERVATION FOR SELECTED
     ======================================================= */

  const reserveSelected =
    () => {
      if (!selected) {
        return;
      }

      openReserve(
        selected
      );
    };


  /* =======================================================
     ORDER FOR SELECTED
     ======================================================= */

  const openSelectedOrder =
    () => {
      if (!selected) {
        return;
      }

      openOrder(
        selected
      );
    };


  /* =======================================================
     TABLE ACTION VALIDATION
     ======================================================= */

  const canEditTable = (
    table: Table
  ) => {
    return (
      table.status !==
        "OCCUPIED" &&
      table.status !==
        "BILLING"
    );
  };


  const canDeleteTable = (
    table: Table
  ) => {
    return (
      table.status !==
        "OCCUPIED" &&
      table.status !==
        "BILLING" &&
      table.status !==
        "RESERVED"
    );
  };


  /* =======================================================
     SELECT TABLE + PREPARE DETAILS
     ======================================================= */

  const selectTable = (
    table: Table
  ) => {
    setSelected(
      table
    );
  };


  /* =======================================================
     RESET FILTERS
     ======================================================= */

  const resetFilters = () => {
    setSearch("");

    setStatusFilter(
      "ALL"
    );

    setAreaFilter(
      "All Areas"
    );
  };


  /* =======================================================
     ACTIVE FILTER LABEL
     ======================================================= */

  const activeFilterCount =
    useMemo(() => {
      let total = 0;

      if (search.trim()) {
        total += 1;
      }

      if (
        statusFilter !==
        "ALL"
      ) {
        total += 1;
      }

      if (
        areaFilter !==
        "All Areas"
      ) {
        total += 1;
      }

      return total;
    }, [
      search,
      statusFilter,
      areaFilter,
    ]);


  /* =======================================================
     ORDER STATUS LABEL
     ======================================================= */

  const orderStatusName: Record<
    OrderStatus,
    string
  > = {
    OPEN: translateStatus("OPEN") || t("open", "Open"),
    BILL_REQUESTED:
      translateStatus("BILLING") || t("billRequested", "Bill Requested"),
    PAID: translateStatus("PAID") || t("paid", "Paid"),
    COMPLETED: translateStatus("COMPLETED") || t("completed", "Completed"),
    CANCELLED:
      translateStatus("CANCELLED") || t("cancelled", "Cancelled"),
  };


  /* =======================================================
     RESERVATION STATUS LABEL
     ======================================================= */

  const reservationStatusName:
    Record<
      ReservationStatus,
      string
    > = {
      CONFIRMED:
        "Confirmed",
      SEATED:
        "Seated",
      CANCELLED:
        "Cancelled",
      NO_SHOW:
        "No Show",
    };


  /* =======================================================
     CURRENT SELECTED TOTAL
     ======================================================= */

  const selectedOrderTotals =
    selectedOrder
      ? calculateOrderTotals(
          selectedOrder
        )
      : {
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
        };


  /* =======================================================
     RESERVATION COUNT
     ======================================================= */

  const confirmedReservations =
    useMemo(() => {
      return reservations.filter(
        (reservation) =>
          reservation.status ===
          "CONFIRMED"
      ).length;
    }, [
      reservations,
    ]);


  /* =======================================================
     FLOOR CAPACITY
     ======================================================= */

  const totalCapacity =
    useMemo(() => {
      return tables.reduce(
        (total, table) =>
          total +
          table.capacity,
        0
      );
    }, [tables]);


  /* =======================================================
     OCCUPANCY PERCENTAGE
     ======================================================= */

  const occupancyPercent =
    useMemo(() => {
      if (
        !tables.length
      ) {
        return 0;
      }

      return Math.round(
        (count("OCCUPIED") /
          tables.length) *
          100
      );
    }, [tables]);


  /* =======================================================
     OPEN ADD ITEM MODAL
     ======================================================= */

  const openAddItem =
    () => {
      setMenuSearch("");

      setMenuCategory(
        "All"
      );

      setCustomization("");

      // Start with a copy of the current order. Changes remain
      // inside this screen until Confirm Items is clicked.
      setDraftItems(
        selectedOrder?.items.map((item) => ({ ...item })) || []
      );

      setModal(
        "add-item"
      );
    };


  /* =======================================================
     ADD MENU ITEM MANUALLY
     ======================================================= */

  const openAddMenuItem = () => {
    setNewMenuItemName("");
    setNewMenuItemPrice("");
    setModal("add-menu-item");
  };


  const addMenuItemManually = () => {
    const name = newMenuItemName.trim();
    const price = Number(newMenuItemPrice);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return;
    }

    const newItem: MenuItem = {
      id: nextId(menuItems),
      name,
      category: "Custom",
      price,
    };

    setMenuItems((previous) => [
      ...previous,
      newItem,
    ]);

    setMenuSearch("");
    setMenuCategory("All");
    setNewMenuItemName("");
    setNewMenuItemPrice("");
    setModal("add-item");
  };


  /* =======================================================
     OPEN RESERVATION DETAILS FROM TABLE
     ======================================================= */

  const viewTableReservation =
    (
      table: Table
    ) => {
      const reservation =
        getReservationForTable(
          table.id
        );

      if (!reservation) {
        return;
      }

      openReservationDetails(
        reservation
      );
    };


  /* =======================================================
     START ORDER FROM DETAILS
     ======================================================= */

  const startOrderFromDetails =
    () => {
      if (!selected) {
        return;
      }

      const existingOrder = getOrderForTable(selected.id);
      if (existingOrder) {
        setSelectedOrder(existingOrder);
        setGuest(existingOrder.guestName || selected.guest || "Guest");
        setGuestCount(String(existingOrder.guestCount || selected.guestCount || 1));
        setDraftItems(existingOrder.items || []);
        setDiscountInput(String(existingOrder.discount || 0));
        setMenuCategory("All");
        setMenuSearch("");
        setModal("order");
        return;
      }

      setGuest(
        selected.guest ||
          ""
      );

      setGuestCount(
        String(
          selected.guestCount ||
            Math.min(
              selected.capacity,
              2
            )
        )
      );

      setDraftItems([]);
      setDiscountInput("0");
      setMenuCategory("All");
      setMenuSearch("");
      setModal(
        "start-order"
      );
    };


  /* =======================================================
     OPEN PAYMENT FROM DETAILS
     ======================================================= */

  const paymentFromDetails =
    () => {
      if (!selected) {
        return;
      }

      openPayment(
        selected
      );
    };


  /* =======================================================
     OPEN TRANSFER FROM DETAILS
     ======================================================= */

  const transferFromDetails =
    () => {
      if (!selected) {
        return;
      }

      openTransfer(
        selected
      );
    };


  /* =======================================================
     OPEN MERGE FROM DETAILS
     ======================================================= */

  const mergeFromDetails =
    () => {
      if (!selected) {
        return;
      }

      openMerge(
        selected
      );
    };


  /* =======================================================
     OPEN SPLIT BILL FROM DETAILS
     ======================================================= */

  const splitFromDetails =
    () => {
      if (!selected) {
        return;
      }

      openSplitBill(
        selected
      );
    };


  /* =======================================================
     CURRENT TABLE ACTION DESCRIPTION
     ======================================================= */

  const currentActionDescription =
    selected
      ? t(statusDescription[selected.status], statusDescription[selected.status])
      : "";


  /* =======================================================
     CONTINUE INTO PART 2
     ======================================================= */

  return (
    <>
      <style>{`

        /* =====================================================
           GLOBAL
           ===================================================== */

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }


        /* =====================================================
           PAGE
           ===================================================== */

        .tables-page {
          min-height: 100vh;
          width: 100%;
          background: #fbf8f3;
          color: #251b16;
          padding: 8px 0 32px;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .tables-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;

          gap: 21.2px;

          margin-bottom: 28.62px;
        }

        .tables-header-left {
          min-width: 0;
        }

        .eyebrow {
          color: #a64c0c;

          font-size: 10.6px;
          font-weight: 800;

          letter-spacing: 1.91px;

          margin-bottom: 7.42px;
        }

        .tables-header h1 {
          margin: 0;

          font-size: 38.16px;
          line-height: 1;

          font-weight: 800;

          letter-spacing: -1.38px;
        }

        .tables-header p {
          margin: 9.54px 0 0;

          color: #887970;

          font-size: 13.78px;

          line-height: 1.5;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 10.6px;

          margin-top: 12.72px;
        }

        .header-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6.36px;

          color: #89786e;

          font-size: 10.6px;
          font-weight: 650;
        }

        .header-meta-dot {
          width: 6.36px;
          height: 6.36px;

          border-radius: 50%;

          background: #a84d0d;
        }


        /* =====================================================
           BUTTONS
           ===================================================== */

        .primary-btn {
          height: 46.64px;

          padding: 0 19.08px;

          border: 0;
          border-radius: 10.6px;

          background: #a84d0d;
          color: white;

          font-weight: 700;
          font-size: 12.72px;

          cursor: pointer;

          box-shadow:
            0 5.3px 15.9px
            rgba(168, 77, 13, .18);

          transition:
            background .18s ease,
            transform .18s ease,
            box-shadow .18s ease;
        }

        .primary-btn:hover {
          background: #903e08;

          transform: translateY(-1.06px);

          box-shadow:
            0 8.48px 19.08px
            rgba(168, 77, 13, .22);
        }

        .primary-btn:active {
          transform: translateY(0);
        }

        .primary-btn:disabled {
          opacity: .5;

          cursor: not-allowed;

          transform: none;
          box-shadow: none;
        }

        .secondary-btn {
          height: 44.52px;

          padding: 0 15.9px;

          border: 1.06px solid #e2d2c4;
          border-radius: 9.54px;

          background: #fffaf5;
          color: #62493a;

          cursor: pointer;

          font-size: 10.6px;
          font-weight: 700;

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .secondary-btn:hover {
          background: #f6e8db;
          border-color: #d6bca9;
        }

        .secondary-btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .danger-btn {
          height: 44.52px;

          padding: 0 15.9px;

          border: 1.06px solid #e4c7c1;
          border-radius: 9.54px;

          background: #fff9f7;
          color: #9d3d2e;

          cursor: pointer;

          font-size: 10.6px;
          font-weight: 700;
        }

        .danger-btn:hover {
          background: #faece9;
        }


        /* =====================================================
           SUMMARY
           ===================================================== */

        .summary-grid {
          display: grid;

          grid-template-columns:
            repeat(6, 1fr);

          gap: 12.72px;

          margin-bottom: 21.2px;
        }

        .summary {
          border: 1.06px solid #e9dbce;

          background: #fffdf9;

          border-radius: 13.78px;

          padding: 15.9px;

          min-height: 111.3px;

          cursor: pointer;

          text-align: left;

          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .summary:hover {
          transform: translateY(-2.12px);

          box-shadow:
            0 9.54px 23.32px
            rgba(75, 45, 27, .07);
        }

        .summary.active {
          border-color: #ad5718;

          box-shadow:
            inset 0 0 0 1.06px #ad5718;
        }

        .summary-label {
          display: flex;

          align-items: center;

          gap: 7.42px;

          color: #806e63;

          font-size: 11.66px;

          font-weight: 650;
        }

        .summary-number {
          display: block;

          margin-top: 14.84px;

          font-size: 28.62px;

          line-height: 1;

          font-weight: 800;
        }

        .summary-sub {
          display: block;

          margin-top: 7.42px;

          color: #a18f84;

          font-size: 8.48px;
        }

        .dot {
          width: 8.48px;
          height: 8.48px;

          display: inline-block;

          flex: 0 0 8.48px;

          border-radius: 50%;
        }

        .green {
          background: #39936d;
        }

        .orange {
          background: #bb5b28;
        }

        .purple {
          background: #7869a9;
        }

        .yellow {
          background: #bb8427;
        }

        .blue {
          background: #548b9e;
        }

        .gray {
          background: #81756e;
        }


        /* =====================================================
           CONTROLS
           ===================================================== */

        .controls {
          display: flex;

          gap: 10.6px;

          margin-bottom: 12.72px;
        }

        .search {
          height: 46.64px;

          flex: 1;

          display: flex;

          align-items: center;

          gap: 9.54px;

          background: #fffdf9;

          border: 1.06px solid #e5d5c6;

          border-radius: 10.6px;

          padding: 0 13.78px;
        }

        .search-icon {
          font-size: 20.14px;

          color: #9a8172;

          line-height: 1;
        }

        .search input {
          width: 100%;

          border: 0;

          outline: 0;

          background: transparent;

          font-size: 12.72px;

          color: #3c2d25;
        }

        .search input::placeholder {
          color: #ae9d93;
        }

        .select {
          height: 46.64px;

          min-width: 174.9px;

          border: 1.06px solid #e5d5c6;

          border-radius: 10.6px;

          padding: 0 12.72px;

          background: #fffdf9;

          color: #59453a;

          outline: none;

          cursor: pointer;

          font-size: 11.66px;
        }

        .select:focus {
          border-color: #bc7040;

          box-shadow:
            0 0 0 3.18px
            rgba(188, 112, 64, .1);
        }

        .reset {
          height: 46.64px;

          padding: 0 16.96px;

          border: 1.06px solid #e5d5c6;

          border-radius: 10.6px;

          background: #fffdf9;

          color: #654b3c;

          cursor: pointer;

          font-weight: 650;

          font-size: 11.66px;
        }

        .reset:hover {
          background: #f7eee7;
        }

        .reset-count {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          min-width: 18.02px;

          height: 18.02px;

          margin-left: 5.3px;

          padding: 0 4.24px;

          border-radius: 104.94px;

          background: #f0dfd0;

          color: #91430c;

          font-size: 8.48px;
        }


        /* =====================================================
           STATUS FILTERS
           ===================================================== */

        .filters {
          display: flex;

          flex-wrap: wrap;

          gap: 7.42px;

          margin-bottom: 28.62px;
        }

        .filter {
          min-height: 36.04px;

          padding: 0 12.72px;

          border: 1.06px solid #e8dbd0;

          border-radius: 8.48px;

          background: #fffdf9;

          color: #725f55;

          cursor: pointer;

          font-size: 11.66px;

          font-weight: 650;

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .filter:hover {
          background: #f8eee6;
        }

        .filter.active {
          color: #91430c;

          background: #f3dfce;

          border-color: #c07a49;
        }

        .filter-count {
          margin-left: 4.24px;

          color: #a18f84;

          font-size: 11px;
        }


        /* =====================================================
           SECTION HEADER
           ===================================================== */

        .section-head {
          display: flex;

          justify-content: space-between;

          align-items: flex-end;

          gap: 21.2px;

          margin-bottom: 14.84px;
        }

        .section-head h2 {
          margin: 0;

          font-size: 20.14px;

          letter-spacing: -.3px;
        }

        .section-head p {
          margin: 4.24px 0 0;

          color: #96867c;

          font-size: 11.66px;
        }

        .section-head-right {
          display: flex;

          align-items: center;

          gap: 14.84px;
        }

        .section-stat {
          color: #8f7f74;

          font-size: 12px;

          font-weight: 650;
        }


        /* =====================================================
           LEGEND
           ===================================================== */

        .legend {
          display: flex;

          gap: 18.02px;

          font-size: 12px;

          color: #7c6d64;
        }

        .legend span {
          display: flex;

          align-items: center;

          gap: 5.3px;

          white-space: nowrap;
        }


        /* =====================================================
           TABLE GRID
           ===================================================== */

        .table-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(250px, 1fr)
            );

          gap: 16px;
        }


        /* =====================================================
           TABLE CARD
           ===================================================== */

        .table-card {
          position: relative;

          background: #fffdf9;

          border: 1.06px solid #e8dbcf;

          border-top: 3.18px solid #39936d;

          border-radius: 15.9px;

          padding: 15.9px;

          cursor: pointer;

          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;

          overflow: hidden;
        }

        .table-card:hover {
          transform:
            translateY(-3.18px);

          box-shadow:
            0 13.78px 29.68px
            rgba(66, 42, 29, .09);
        }

        .table-card.selected-card {
          border-color:
            #bc7040;

          box-shadow:
            0 0 0 2.12px
            rgba(188, 112, 64, .16);
        }

        .table-card.available {
          border-top-color:
            #39936d;
        }

        .table-card.occupied {
          border-top-color:
            #bb5b28;
        }

        .table-card.reserved {
          border-top-color:
            #7869a9;
        }

        .table-card.billing {
          border-top-color:
            #bb8427;
        }

        .table-card.cleaning {
          border-top-color:
            #548b9e;
        }

        .table-card.out-of-service {
          border-top-color:
            #81756e;

          opacity: .72;
        }


        /* =====================================================
           CARD TOP
           ===================================================== */

        .card-top {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 7.42px;
        }

        .table-name {
          font-size: 14.84px;

          font-weight: 800;

          letter-spacing: -.15px;
        }

        .table-area {
          margin-top: 3.18px;

          color: #a08e84;

          font-size: 11px;

          font-weight: 650;
        }

        .status {
          padding: 5.3px 8px;

          border-radius: 7.42px;

          font-size: 11px;

          font-weight: 800;

          text-transform:
            uppercase;

          letter-spacing: .2px;

          white-space: nowrap;
        }

        .status.available {
          color: #327d5e;

          background: #e5f2eb;
        }

        .status.occupied {
          color: #a64f23;

          background: #fae8dc;
        }

        .status.reserved {
          color: #665691;

          background: #eee9f7;
        }

        .status.billing {
          color: #9c701c;

          background: #f7edd8;
        }

        .status.cleaning {
          color: #47798b;

          background: #e4eff3;
        }

        .status.out-of-service {
          color: #6d625c;

          background: #eeeae7;
        }


        /* =====================================================
           TABLE VISUAL
           ===================================================== */

        .table-visual {
          height: 127.2px;

          position: relative;

          display: flex;

          justify-content: center;

          align-items: center;
        }

        .table-shape {
          width: 82.68px;

          height: 58.3px;

          display: flex;

          justify-content: center;

          align-items: center;

          border: 2.12px solid #c98d62;

          border-radius: 13.78px;

          background: #f8eee5;

          color: #9d531e;

          font-size: 16.96px;

          font-weight: 800;

          transition:
            width .18s ease,
            height .18s ease;
        }

        .table-shape.medium {
          width: 97.52px;
          height: 61.48px;
        }

        .table-shape.large {
          width: 111.3px;
          height: 66.78px;
        }

        .chair {
          position: absolute;

          width: 22.26px;

          height: 13.78px;

          border: 1.06px solid #cbb2a1;

          border-radius: 4.24px;

          background: #fffaf5;
        }

        .chair.top {
          top: 10.6px;

          left:
            calc(50% - 10.6px);
        }

        .chair.bottom {
          bottom: 10.6px;

          left:
            calc(50% - 10.6px);
        }

        .chair.left {
          left:
            calc(50% - 61.48px);

          top:
            calc(50% - 7.42px);
        }

        .chair.right {
          right:
            calc(50% - 61.48px);

          top:
            calc(50% - 7.42px);
        }

        .table-shape.medium
        ~ .chair.left {
          left:
            calc(50% - 72.08px);
        }

        .table-shape.medium
        ~ .chair.right {
          right:
            calc(50% - 72.08px);
        }

        .table-shape.large
        ~ .chair.left {
          left:
            calc(50% - 81.62px);
        }

        .table-shape.large
        ~ .chair.right {
          right:
            calc(50% - 81.62px);
        }


        /* =====================================================
           CARD INFO
           ===================================================== */

        .info {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          border-top:
            1.06px solid #eee5dd;

          padding-top: 11.66px;

          gap: 10.6px;
        }

        .info small {
          display: block;

          color: #9b8a80;

          font-size: 11px;

          text-transform:
            uppercase;

          margin-bottom: 4.24px;
        }

        .info strong {
          font-size: 13px;

          color: #49372d;
        }


        /* =====================================================
           GUEST
           ===================================================== */

        .guest {
          display: flex;

          align-items: center;

          gap: 8.48px;

          margin-top: 10.6px;

          padding: 8.48px;

          border:
            1.06px solid #f0e3d7;

          border-radius: 8.48px;

          background: #faf4ee;
        }

        .avatar {
          width: 28.62px;

          height: 28.62px;

          flex: 0 0 28.62px;

          border-radius: 50%;

          display: grid;

          place-items: center;

          background: #a84d0d;

          color: white;

          font-size: 12px;

          font-weight: 800;
        }

        .guest-info {
          min-width: 0;
        }

        .guest-info small,
        .guest-info strong {
          display: block;
        }

        .guest-info small {
          color: #a18f84;

          font-size: 11px;

          margin-bottom: 2.12px;
        }

        .guest-info strong {
          font-size: 12px;

          white-space: nowrap;

          overflow: hidden;

          text-overflow:
            ellipsis;
        }

        .guest-time {
          margin-left: auto;

          font-size: 11px;

          color: #96603c;

          font-weight: 700;

          white-space: nowrap;
        }


        /* =====================================================
           BILL
           ===================================================== */

        .bill {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          margin-top: 8.48px;

          padding: 8.48px;

          border-radius: 7.42px;

          background: #fbf2e2;

          color: #876c3d;

          font-size: 12px;
        }

        .bill strong {
          color: #825716;
        }


        /* =====================================================
           CARD BUTTONS
           ===================================================== */

        .card-buttons {
          display: flex;

          gap: 7.42px;

          margin-top: 11.66px;
        }

        .card-buttons button {
          flex: 1;

          height: 34px;

          border:
            1.06px solid #e2d2c4;

          border-radius: 8.48px;

          background: #fffaf5;

          color: #8d4515;

          cursor: pointer;

          font-size: 11px;

          font-weight: 750;

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .card-buttons button:hover {
          background: #f6e8db;

          border-color:
            #d7bda9;
        }

        .card-buttons .view {
          flex:
            0 0 64px;

          color: #77675e;
        }

        .card-buttons .quick-action {
          background:
            #a84d0d;

          border-color:
            #a84d0d;

          color: white;
        }

        .card-buttons .quick-action:hover {
          background:
            #903e08;
        }


        /* =====================================================
           EMPTY STATE
           ===================================================== */

        .empty {
          text-align: center;

          padding: 74.2px 21.2px;

          background: #fffdf9;

          border:
            1.06px dashed #dfcfc1;

          border-radius: 15.9px;

          grid-column:
            1 / -1;
        }

        .empty-icon {
          width: 50.88px;

          height: 50.88px;

          margin: 0 auto;

          display: grid;

          place-items: center;

          border-radius: 13.78px;

          background: #f4e8dd;

          color: #9c5b2f;

          font-size: 22.26px;
        }

        .empty h3 {
          margin: 10.6px 0 5.3px;

          font-size: 16.96px;
        }

        .empty p {
          margin: 0 0 15.9px;

          color: #95857b;

          font-size: 12.72px;
        }


        /* =====================================================
           SMALL STATUS BAR
           ===================================================== */

        .status-bar {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15.9px;

          margin-bottom: 15.9px;

          padding: 10.6px 12.72px;

          border:
            1.06px solid #eadfd5;

          border-radius: 10.6px;

          background:
            rgba(255, 253, 249, .75);
        }

        .status-bar-left {
          display: flex;

          align-items: center;

          gap: 10.6px;
        }

        .live-indicator {
          width: 7.42px;
          height: 7.42px;

          border-radius: 50%;

          background: #39936d;
        }

        .status-bar-text {
          color: #7d6d63;

          font-size: 11px;

          font-weight: 650;
        }

        .status-bar-time {
          color: #5c473b;

          font-size: 12px;

          font-weight: 750;
        }


        /* =====================================================
           MODAL OVERLAY
           ===================================================== */

        .overlay {
          position: fixed;

          inset: 0;

          z-index: 99999;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 21.2px;

          background:
            rgba(35, 23, 16, .45);

          backdrop-filter:
            blur(4.24px);

          overflow-y: auto;
        }


        /* =====================================================
           MODAL
           ===================================================== */

        .modal {
          position: relative;

          width:
            min(593.6px, 100%);

          max-height:
            calc(100vh - 42.4px);

          overflow-y: auto;

          padding: 26.5px;

          border-radius: 18.02px;

          border:
            1.06px solid #e4d5c8;

          background: #fffdf9;

          box-shadow:
            0 26.5px 84.8px
            rgba(38, 25, 17, .25);

          animation:
            modalIn .18s ease;
        }

        .modal.wide {
          width:
            min(954px, 100%);
        }

        .modal.large {
          width:
            min(1113px, 100%);
        }

        @keyframes modalIn {
          from {
            opacity: 0;

            transform:
              translateY(12.72px)
              scale(.98);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }


        /* =====================================================
           CLOSE BUTTON
           ===================================================== */

        .close {
          position: absolute;

          right: 15.9px;

          top: 15.9px;

          width: 32.86px;

          height: 32.86px;

          border: 0;

          border-radius: 8.48px;

          background: #f6eee8;

          color: #765f52;

          font-size: 21.2px;

          line-height: 1;

          cursor: pointer;

          display: grid;

          place-items: center;
        }

        .close:hover {
          background:
            #eddfd5;
        }


        /* =====================================================
           MODAL HEADER
           ===================================================== */

        .modal-head {
          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-start;

          gap: 15.9px;

          padding-right: 37.1px;
        }

        .modal-kicker {
          color: #a95112;

          font-size: 11px;

          font-weight: 800;

          letter-spacing: 1.48px;

          text-transform:
            uppercase;
        }

        .modal h2 {
          margin: 5.3px 0 0;

          font-size: 24.38px;

          line-height: 1.15;
        }

        .modal-description {
          margin-top: 7.42px;

          color: #95857b;

          font-size: 12px;

          line-height: 1.5;
        }

        .modal-status {
          flex: 0 0 auto;

          margin-top: 2.12px;
        }


        /* =====================================================
           DETAILS
           ===================================================== */

        .details {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 9.54px;

          margin-top: 23.32px;
        }

        .detail {
          padding: 12.72px;

          border-radius: 9.54px;

          border:
            1.06px solid #eee3da;

          background: #fffaf6;
        }

        .detail.full {
          grid-column:
            1 / -1;
        }

        .detail span {
          display: block;

          color: #6f5b50;

          font-size: 11px;

          text-transform:
            uppercase;

          margin-bottom: 5.3px;
        }

        .detail strong {
          font-size: 13.78px;
        }

        .detail-value-large {
          font-size: 18.02px !important;

          font-weight: 800;
        }


        /* =====================================================
           MODAL DIVIDER
           ===================================================== */

        .modal-divider {
          margin: 21.2px 0;

          border-top:
            1.06px solid #eee3da;
        }


        /* =====================================================
           ACTION GRID
           ===================================================== */

        .actions {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8.48px;
        }

        .modal-action {
          min-height: 42.4px;

          border:
            1.06px solid #e2d2c4;

          border-radius: 9.54px;

          background: #fffaf6;

          color: #62493a;

          cursor: pointer;

          font-size: 12px;

          font-weight: 700;

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .modal-action:hover {
          background:
            #f5e9df;

          border-color:
            #d7bda9;
        }

        .modal-action.primary {
          background:
            #a94d0d;

          color: white;

          border-color:
            #a94d0d;
        }

        .modal-action.primary:hover {
          background:
            #913e08;
        }

        .modal-action.danger {
          color:
            #9d3d2e;

          border-color:
            #e4c7c1;
        }

        .modal-action.danger:hover {
          background:
            #faece9;
        }

        .modal-action:disabled {
          opacity: .45;

          cursor: not-allowed;
        }


        /* =====================================================
           FORM
           ===================================================== */

        .form {
          display: grid;

          gap: 14.84px;

          margin-top: 23.32px;
        }

        .form-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 12.72px;
        }

        .form label {
          display: grid;

          align-content: start;

          gap: 6.36px;

          color: #3e2e26;

          font-size: 12.72px;

          font-weight: 750;
        }

        .form label.full {
          grid-column:
            1 / -1;
        }

        .form input,
        .form select,
        .form textarea {
          width: 100%;

          border:
            1.06px solid #e1d0c1;

          border-radius: 9.54px;

          padding: 0 12.72px;

          background: #fffaf6;

          outline: none;

          color: #251b16;

          font-size: 13.78px;
        }

        .form input,
        .form select {
          height: 45.58px;
        }

        .form textarea {
          min-height: 90.1px;

          padding-top: 11.66px;

          padding-bottom: 11.66px;

          resize: vertical;
        }

        .form input:focus,
        .form select:focus,
        .form textarea:focus {
          border-color:
            #bc7040;

          box-shadow:
            0 0 0 3.18px
            rgba(188, 112, 64, .1);
        }

        .form-help {
          color: #9b8a80;

          font-size: 11px;

          font-weight: 500;

          line-height: 1.4;
        }


        /* =====================================================
           MODAL FOOTER
           ===================================================== */

        .modal-footer {
          display: flex;

          justify-content:
            flex-end;

          gap: 8.48px;

          margin-top: 23.32px;
        }

        .modal-footer button {
          height: 43.46px;

          padding: 0 16.96px;

          border-radius: 9.54px;

          cursor: pointer;

          font-weight: 700;

          font-size: 13px;
        }

        .cancel {
          border:
            1.06px solid #e2d2c4;

          background: white;

          color: #62493a;
        }

        .cancel:hover {
          background:
            #f8eee7;
        }

        .submit {
          border:
            1.06px solid #a94d0d;

          background:
            #a94d0d;

          color: white;
        }

        .submit:hover {
          background:
            #913e08;
        }


        /* =====================================================
           ORDER LAYOUT
           ===================================================== */

        .order-layout {
          display: grid;

          grid-template-columns:
            minmax(0, 1.3fr)
            minmax(296.8px, .7fr);

          gap: 15.9px;

          margin-top: 21.2px;
        }

        .order-panel {
          border:
            1.06px solid #eaded4;

          border-radius: 12.72px;

          background: #fffaf6;

          overflow: hidden;
        }

        .order-panel-head {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 10.6px;

          padding: 12.72px 13.78px;

          border-bottom:
            1.06px solid #eee3da;
        }

        .order-panel-title {
          font-size: 13px;

          font-weight: 800;
        }

        .order-panel-subtitle {
          margin-top: 3.18px;

          color: #a18f84;

          font-size: 11px;
        }


        /* =====================================================
           ORDER ITEMS
           ===================================================== */

        .order-items {
          display: grid;

          gap: 7.42px;

          padding: 10.6px;
        }

        .order-item {
          display: grid;

          grid-template-columns:
            1fr
            auto
            auto;

          align-items: center;

          gap: 9.54px;

          padding: 10.6px;

          border:
            1.06px solid #eee3da;

          border-radius: 9.54px;

          background: #fffdf9;
        }

        .order-item-name {
          min-width: 0;

          font-size: 12px;

          font-weight: 750;
        }

        .order-item-customization {
          margin-top: 3.18px;

          color: #a18f84;

          font-size: 11px;
        }

        .quantity-control {
          display: flex;

          align-items: center;

          gap: 5.3px;
        }

        .quantity-control button {
          width: 26.5px;

          height: 26.5px;

          border:
            1.06px solid #e0d0c2;

          border-radius: 6.36px;

          background: #fffaf5;

          color: #674d3e;

          cursor: pointer;

          font-size: 12.72px;

          line-height: 1;
        }

        .quantity-control button:hover {
          background:
            #f4e7dc;
        }

        .quantity-value {
          min-width: 19.08px;

          text-align: center;

          font-size: 9.54px;

          font-weight: 750;
        }

        .order-item-price {
          min-width: 68.9px;

          text-align: right;

          color: #6c4f3e;

          font-size: 10.6px;

          font-weight: 750;
        }

        .remove-item {
          width: 26.5px;

          height: 26.5px;

          border:
            1.06px solid #ead1cb;

          border-radius: 6.36px;

          background: #fff8f6;

          color: #9d3d2e;

          cursor: pointer;
        }


        /* =====================================================
           ORDER SUMMARY
           ===================================================== */

        .order-summary {
          padding: 13.78px;

          border-top:
            1.06px solid #eee3da;

          background:
            #fffdf9;
        }

        .summary-row {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 12.72px;

          margin-bottom: 8.48px;

          color: #806e63;

          font-size: 9.54px;
        }

        .summary-row strong {
          color: #4a372d;

          font-size: 10.6px;
        }

        .summary-row.total {
          margin-top: 11.66px;

          padding-top: 11.66px;

          border-top:
            1.06px solid #e8dbd0;

          color: #5b4335;

          font-size: 11.66px;
        }

        .summary-row.total strong {
          color: #9a470c;

          font-size: 16.96px;
        }


        /* =====================================================
           MENU
           ===================================================== */

        .menu-tools {
          display: flex;

          gap: 7.42px;

          padding: 10.6px;

          border-bottom:
            1.06px solid #eee3da;
        }

        .menu-search {
          height: 38.16px;

          flex: 1;

          border:
            1.06px solid #e1d0c1;

          border-radius: 8.48px;

          padding: 0 10.6px;

          background: #fffdf9;

          outline: none;

          font-size: 10.6px;
        }

        .menu-category {
          height: 38.16px;

          max-width: 137.8px;

          border:
            1.06px solid #e1d0c1;

          border-radius: 8.48px;

          padding: 0 8.48px;

          background: #fffdf9;

          outline: none;

          color: #654b3c;

          font-size: 9.54px;
        }

        .draft-order-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12.72px;
          margin: 14.84px 0 10.6px;
          padding: 12.72px 14.84px;
          border: 1.06px solid #e4d5c8;
          border-radius: 10.6px;
          background: #f8eee5;
          color: #49372d;
        }

        .draft-order-bar > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 3.18px;
        }

        .draft-order-bar strong {
          font-size: 11.66px;
        }

        .draft-order-bar span {
          color: #95857b;
          font-size: 9.54px;
        }

        .draft-order-total {
          color: #8d4515;
          font-size: 13.78px;
          font-weight: 800;
        }

        .menu-list {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 7.42px;

          padding: 10.6px;

          max-height: 445.2px;

          overflow-y: auto;
        }

        .menu-item {
          display: flex;

          flex-direction:
            column;

          justify-content:
            space-between;

          gap: 8.48px;

          min-height: 111.3px;

          padding: 10.6px;

          border:
            1.06px solid #eee3da;

          border-radius: 9.54px;

          background: #fffdf9;
        }

        .menu-item:hover {
          border-color:
            #d8bba6;

          background:
            #fffaf5;
        }

        .menu-item-category {
          color: #a95112;

          font-size: 7.42px;

          font-weight: 800;

          text-transform:
            uppercase;

          letter-spacing: .6px;
        }

        .menu-item-name {
          margin-top: 3.18px;

          color: #49372d;

          font-size: 10.6px;

          font-weight: 800;
        }

        .menu-item-description {
          margin-top: 3.18px;

          color: #9b8a80;

          font-size: 7.42px;

          line-height: 1.35;
        }

        .menu-item-bottom {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 6.36px;
        }

        .menu-item-price {
          color: #8e481a;

          font-size: 10.6px;

          font-weight: 800;
        }

        .add-menu-item {
          height: 28.62px;

          padding: 0 9.54px;

          border:
            1.06px solid #dcbda6;

          border-radius: 7.42px;

          background: #f9eee5;

          color: #8e481a;

          cursor: pointer;

          font-size: 8.48px;

          font-weight: 750;
        }

        .add-menu-item:hover {
          background:
            #f2dfcf;
        }


        /* =====================================================
           ORDER TOOLBAR
           ===================================================== */

        .order-toolbar {
          display: flex;

          flex-wrap: wrap;

          gap: 7.42px;

          padding: 10.6px 13.78px;

          border-bottom:
            1.06px solid #eee3da;

          background:
            #fffdf9;
        }

        .order-toolbar button {
          height: 32.86px;

          padding: 0 10.6px;

          border:
            1.06px solid #e2d2c4;

          border-radius: 7.42px;

          background: #fffaf5;

          color: #735b4d;

          cursor: pointer;

          font-size: 8.48px;

          font-weight: 750;
        }

        .order-toolbar button:hover {
          background:
            #f5e8dd;
        }


        /* =====================================================
           CHECKBOX / SELECTION
           ===================================================== */

        .merge-list {
          display: grid;

          gap: 7.42px;

          margin-top: 19.08px;
        }

        .merge-option {
          display: flex;

          align-items: center;

          gap: 10.6px;

          padding: 11.66px;

          border:
            1.06px solid #eaded4;

          border-radius: 9.54px;

          background: #fffaf6;

          cursor: pointer;
        }

        .merge-option:hover {
          background:
            #f9eee6;
        }

        .merge-option input {
          accent-color:
            #a84d0d;
        }

        .merge-option-info {
          flex: 1;
        }

        .merge-option-name {
          font-size: 10.6px;

          font-weight: 800;
        }

        .merge-option-meta {
          margin-top: 3.18px;

          color: #99887e;

          font-size: 8.48px;
        }


        /* =====================================================
           SPLIT BILL
           ===================================================== */

        .split-preview {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 8.48px;

          margin-top: 21.2px;
        }

        .split-box {
          padding: 13.78px;

          border:
            1.06px solid #eaded4;

          border-radius: 9.54px;

          background:
            #fffaf6;

          text-align: center;
        }

        .split-box span {
          display: block;

          color: #99887e;

          font-size: 8.48px;

          text-transform:
            uppercase;

          margin-bottom: 5.3px;
        }

        .split-box strong {
          color: #49372d;

          font-size: 15.9px;
        }


        /* =====================================================
           PAYMENT
           ===================================================== */

        .payment-total {
          padding: 19.08px;

          margin-top: 21.2px;

          border:
            1.06px solid #e8d6c7;

          border-radius: 12.72px;

          background:
            #fbf1e7;

          text-align: center;
        }

        .payment-total span {
          display: block;

          color: #957b6d;

          font-size: 8.48px;

          text-transform:
            uppercase;

          letter-spacing: .7px;
        }

        .payment-total strong {
          display: block;

          margin-top: 5.3px;

          color: #92460e;

          font-size: 28.62px;

          font-weight: 850;
        }

        .payment-methods {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 8.48px;

          margin-top: 16.96px;
        }

        .payment-method {
          min-height: 63.6px;

          border:
            1.06px solid #e2d2c4;

          border-radius: 9.54px;

          background: #fffaf6;

          color: #735b4d;

          cursor: pointer;

          font-size: 9.54px;

          font-weight: 750;
        }

        .payment-method.active {
          border-color:
            #b96836;

          background:
            #f4e0d0;

          color:
            #8f430c;
        }


        /* =====================================================
           RESERVATION DETAILS
           ===================================================== */

        .reservation-banner {
          display: flex;

          align-items: center;

          gap: 11.66px;

          margin-top: 21.2px;

          padding: 12.72px;

          border:
            1.06px solid #e4d8ef;

          border-radius: 10.6px;

          background:
            #f4f0fa;
        }

        .reservation-icon {
          width: 36.04px;

          height: 36.04px;

          flex: 0 0 36.04px;

          display: grid;

          place-items: center;

          border-radius: 9.54px;

          background:
            #e7e0f2;

          color:
            #665691;

          font-size: 14.84px;
        }

        .reservation-banner strong {
          display: block;

          color:
            #665691;

          font-size: 10.6px;
        }

        .reservation-banner span {
          display: block;

          margin-top: 3.18px;

          color:
            #8b7b9e;

          font-size: 8.48px;
        }


        /* =====================================================
           CONFIRMATION
           ===================================================== */

        .confirm-icon {
          width: 50.88px;

          height: 50.88px;

          display: grid;

          place-items: center;

          margin: 3.18px auto 16.96px;

          border-radius: 14.84px;

          background: #111111;

          color: #ffffff;

          font-size: 23.32px;

          font-weight: 800;
        }

        .confirm-content {
          text-align: center;
        }

        .confirm-content h2 {
          margin-top: 0;
        }

        .confirm-content p {
          margin: 8.48px auto 0;

          max-width: 413.4px;

          color: #96867c;

          font-size: 10.6px;

          line-height: 1.5;
        }


        /* =====================================================
           TOAST / NOTICE
           ===================================================== */

        .inline-notice {
          display: flex;

          align-items: center;

          gap: 8.48px;

          padding: 9.54px 10.6px;

          border:
            1.06px solid #eaded4;

          border-radius: 8.48px;

          background:
            #fffaf6;

          color: #806e63;

          font-size: 8.48px;
        }


        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 1272px) {
          .summary-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .table-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .order-layout {
            grid-template-columns:
              1fr;
          }
        }


        @media (max-width: 954px) {
          .tables-page {
            padding:
              26.5px 21.2px;
          }

          .table-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .controls {
            flex-wrap: wrap;
          }

          .search {
            flex-basis:
              100%;
          }

          .order-layout {
            grid-template-columns:
              1fr;
          }
        }


        @media (max-width: 689px) {
          .tables-page {
            padding:
              21.2px 14.84px;
          }

          .tables-header {
            flex-direction:
              column;

            align-items:
              flex-start;
          }

          .tables-header h1 {
            font-size: 31.8px;
          }

          .summary-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .table-grid {
            grid-template-columns:
              1fr;
          }

          .section-head {
            flex-direction:
              column;

            align-items:
              flex-start;

            gap: 12.72px;
          }

          .section-head-right {
            width: 100%;

            justify-content:
              space-between;
          }

          .details {
            grid-template-columns:
              1fr;
          }

          .detail.full {
            grid-column:
              auto;
          }

          .actions {
            grid-template-columns:
              1fr;
          }

          .form-grid {
            grid-template-columns:
              1fr;
          }

          .form label.full {
            grid-column:
              auto;
          }

          .payment-methods {
            grid-template-columns:
              1fr;
          }

          .split-preview {
            grid-template-columns:
              1fr;
          }

          .menu-list {
            grid-template-columns:
              1fr;
          }
        }

        /* =====================================================
           FINAL REFERENCE THEME OVERRIDES
           ===================================================== */

        .tables-page {
          background: #f8f6f3 !important;
          color: #2f211b !important;
        }

        .tables-page h1,
        .tables-page h2,
        .tables-page h3,
        .tables-page strong {
          color: #2f211b;
        }

        .tables-page .eyebrow,
        .tables-page .section-kicker,
        .tables-page .modal-kicker {
          color: #8a5b47 !important;
        }

        .tables-page .summary-card,
        .tables-page .table-section,
        .tables-page .table-card,
        .tables-page .order-panel,
        .tables-page .detail,
        .tables-page .order-item,
        .tables-page .order-summary,
        .tables-page .draft-order-bar {
          background: #fffdfa !important;
          border-color: #e8ddd5 !important;
          box-shadow: 0 1.06px 3.18px rgba(64, 42, 31, .04);
        }

        .tables-page .summary-card:first-child {
          border-color: #cfa27f !important;
        }

        .tables-page input,
        .tables-page select,
        .tables-page textarea,
        .tables-page .search,
        .tables-page .table-search {
          background: #fffdfa !important;
          color: #4b382e !important;
          border-color: #e3d6cc !important;
        }

        .tables-page input::placeholder,
        .tables-page textarea::placeholder {
          color: #a5968c !important;
        }

        .tables-page .submit,
        .tables-page .modal-action.primary,
        .tables-page .primary {
          background: #7b4b39 !important;
          color: #fffdfa !important;
          border-color: #7b4b39 !important;
        }

        .tables-page .submit:hover,
        .tables-page .modal-action.primary:hover,
        .tables-page .primary:hover {
          background: #673b2d !important;
        }

        .tables-page .cancel,
        .tables-page .modal-action,
        .tables-page .order-toolbar button,
        .tables-page .quantity-control button {
          background: #fffdfa !important;
          color: #62483b !important;
          border-color: #dfd0c5 !important;
        }

        .tables-page .cancel:hover,
        .tables-page .modal-action:hover,
        .tables-page .order-toolbar button:hover,
        .tables-page .quantity-control button:hover {
          background: #f5eee8 !important;
          border-color: #cdb6a7 !important;
        }

        .tables-page .table-card {
          color: #34251e;
        }

        .tables-page .table-card:hover {
          box-shadow: 0 5.3px 16.96px rgba(70, 45, 33, .08);
        }

        .tables-page .table-card.available {
          border-color: #61b88b !important;
        }

        .tables-page .table-card.occupied {
          border-color: #79a9df !important;
        }

        .tables-page .table-card.billing {
          border-color: #b58ad2 !important;
        }

        .tables-page .table-card.cleaning {
          border-color: #69b8bb !important;
        }

        .tables-page .table-card.out-of-service {
          border-color: #aaa7a4 !important;
        }

        .tables-page .order-panel-head,
        .tables-page .order-summary {
          border-color: #e8ddd5 !important;
        }

        .tables-page .order-item {
          background: #fffdfa !important;
        }

        .tables-page .draft-order-bar {
          background: #f7f0ea !important;
        }

        .tables-page .overlay {
          background: rgba(49, 34, 27, .32) !important;
          backdrop-filter: blur(3.18px);
        }

        .tables-page .modal {
          background: #fffdfa !important;
          border-color: #e4d8cf !important;
          box-shadow: 0 23.32px 63.6px rgba(52, 35, 26, .18) !important;
        }

        .tables-page .close {
          background: #f4ece6 !important;
          color: #725446 !important;
        }

        .tables-page .close:hover {
          background: #eaded5 !important;
        }

        .tables-page .inline-notice {
          background: #fbf5ef !important;
          border-color: #eaded4 !important;
          color: #7b685d !important;
        }

      `}</style>

      {/* =====================================================
          PART 2 CONTINUES HERE
          ===================================================== */}
            {/* =====================================================
          PART 2 — PAGE UI + MODALS
          ===================================================== */}

      <div className="tables-page">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <div className="tables-header">
          <div className="tables-header-left">
            <div className="eyebrow">
              {t("restaurantFloorManagement", "RESTAURANT FLOOR MANAGEMENT")}
            </div>

            <h1>{t("tables", "Tables")}</h1>

            <p>
              {t("tablesDesc", "Manage tables, guests, orders, reservations and payments from one place.")}
            </p>

            <div className="header-meta">
              <span className="header-meta-item">
                <span className="header-meta-dot" />
                {t("liveFloorStatus", "Live floor status")}
              </span>

              <span className="header-meta-item">
                •
              </span>

              <span className="header-meta-item">
                {toDevanagari(tables.length)} {t("tables", "tables").toLowerCase()}
              </span>

              <span className="header-meta-item">
                •
              </span>

              <span className="header-meta-item">
                {toDevanagari(totalCapacity)} {t("seats", "seats")}
              </span>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={openAddTable}
          >
            {t("addTable", "+ Add Table")}
          </button>
        </div>

        {/* =====================================================
            SUMMARY CARDS
            ===================================================== */}
        <div className="summary-grid">
          <button
            className={`summary ${
              statusFilter === "ALL"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setStatusFilter("ALL");
              setAreaFilter("All Areas");
            }}
          >
            <span className="summary-label">
              <span className="dot gray" />
              {t("totalTables", "Total Tables")}
            </span>

            <strong className="summary-number">
              {toDevanagari(tables.length)}
            </strong>

            <span className="summary-sub">
              {t("allFloorTables", "All floor tables")}
            </span>
          </button>

          <button
            className={`summary ${
              statusFilter === "AVAILABLE"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setStatusFilter("AVAILABLE")
            }
          >
            <span className="summary-label">
              <span className="dot green" />
              {t("available", "Available")}
            </span>

            <strong className="summary-number">
              {toDevanagari(count("AVAILABLE"))}
            </strong>

            <span className="summary-sub">
              {t("readyForGuests", "Ready for guests")}
            </span>
          </button>

          <button
            className={`summary ${
              statusFilter === "OCCUPIED"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setStatusFilter("OCCUPIED")
            }
          >
            <span className="summary-label">
              <span className="dot orange" />
              {t("occupied", "Occupied")}
            </span>

            <strong className="summary-number">
              {toDevanagari(count("OCCUPIED"))}
            </strong>

            <span className="summary-sub">
              {t("guestsDining", "Guests dining")}
            </span>
          </button>

          <button
            className={`summary ${
              statusFilter === "RESERVED"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setStatusFilter("RESERVED")
            }
          >
            <span className="summary-label">
              <span className="dot purple" />
              {t("reserved", "Reserved")}
            </span>

            <strong className="summary-number">
              {toDevanagari(count("RESERVED"))}
            </strong>

            <span className="summary-sub">
              {t("upcomingBookings", "Upcoming bookings")}
            </span>
          </button>

          <button
            className={`summary ${
              statusFilter === "BILLING"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setStatusFilter("BILLING")
            }
          >
            <span className="summary-label">
              <span className="dot yellow" />
              {t("billed", "Billing")}
            </span>

            <strong className="summary-number">
              {toDevanagari(count("BILLING"))}
            </strong>

            <span className="summary-sub">
              {t("paymentPending", "Payment pending")}
            </span>
          </button>

          <button
            className="summary"
            onClick={() =>
              setStatusFilter("CLEANING")
            }
          >
            <span className="summary-label">
              <span className="dot blue" />
              {t("occupancy", "Occupancy")}
            </span>

            <strong className="summary-number">
              {toDevanagari(occupancyPercent)}%
            </strong>

            <span className="summary-sub">
              {t("currentFloorOccupancy", "Current floor occupancy")}
            </span>
          </button>
        </div>

        {/* =====================================================
            SEARCH / FILTER CONTROLS
            ===================================================== */}
        <div className="controls">
          <div className="search">
            <span className="search-icon">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t("searchTablePlaceholder", "Search table, guest, area or status...")}
            />
          </div>

          <select
            className="select"
            value={areaFilter}
            onChange={(event) =>
              setAreaFilter(event.target.value)
            }
          >
            {areas.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item === "All Areas" ? t("allAreas", "All Areas") : t(item, item)}
              </option>
            ))}
          </select>

          <button
            className="reset"
            onClick={resetFilters}
          >
            {t("reset", "Reset")}
            {activeFilterCount > 0 && (
              <span className="reset-count">
                {toDevanagari(activeFilterCount)}
              </span>
            )}
          </button>
        </div>

        {/* =====================================================
            STATUS FILTERS
            ===================================================== */}
        <div className="filters">
          {(
            [
              "ALL",
              "AVAILABLE",
              "OCCUPIED",
              "RESERVED",
              "BILLING",
              "CLEANING",
            ] as const
          ).map((status) => {
            const filterCount =
              status === "ALL"
                ? tables.length
                : count(status);

            return (
              <button
                key={status}
                className={`filter ${
                  statusFilter === status
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(status)
                }
              >
                {status === "ALL"
                  ? t("all", "All")
                  : getStatusLabel(status)}

                <span className="filter-count">
                  {toDevanagari(filterCount)}
                </span>
              </button>
            );
          })}
        </div>

        {/* =====================================================
            SECTION HEADER
            ===================================================== */}
        <div className="section-head">
          <div>
            <h2>
              {t("floorTables", "Floor tables")}
            </h2>

            <p>
              {t("selectTableDesc", "Select a table to view details or perform an action.")}
            </p>
          </div>

          <div className="section-head-right">
            <div className="legend">
              <span>
                <span className="dot green" />
                {t("available", "Available")}
              </span>

              <span>
                <span className="dot orange" />
                {t("occupied", "Occupied")}
              </span>

              <span>
                <span className="dot purple" />
                {t("reserved", "Reserved")}
              </span>

              <span>
                <span className="dot yellow" />
                {t("billed", "Billing")}
              </span>

              <span>
                <span className="dot blue" />
                {t("cleaning", "Cleaning")}
              </span>
            </div>

            <span className="section-stat">
              {t("showingTables", "Showing")} {toDevanagari(filteredTables.length)} {t("ofTables", "of")}{" "}
              {toDevanagari(tables.length)}
            </span>
          </div>
        </div>

        {/* =====================================================
            TABLE GRID
            ===================================================== */}
        <div className="table-grid">
          {filteredTables.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                ⌕
              </div>

              <h3>
                {t("noTablesFound", "No tables found")}
              </h3>

              <p>
                {t("tryChangingSearch", "Try changing your search or filters.")}
              </p>

              <button
                className="secondary-btn"
                onClick={resetFilters}
              >
                {t("resetFilters", "Reset Filters")}
              </button>
            </div>
          ) : (
            filteredTables.map((table) => {
              const reservation =
                getReservationForTable(
                  table.id
                );

              const order =
                getOrderForTable(
                  table.id
                );

              const isSelected =
                selected?.id === table.id;

              return (
                <div
                  key={table.id}
                  id={`table-card-${table.id}`}
                  className={`${tableCardClass(
                    table
                  )} ${
                    isSelected
                      ? "selected-card"
                      : ""
                  }`}
                  onClick={() =>
                    selectTable(table)
                  }
                >
                  {/* CARD TOP */}
                  <div className="card-top">
                    <div>
                      <div className="table-name">
                        {formatTableName(table.name)}
                      </div>

                      <div className="table-area">
                        {t(table.area, table.area)}
                      </div>
                    </div>

                    <span
                      className={`status ${statusClass(
                        table.status
                      )}`}
                    >
                      {getStatusLabel(table.status, table.id)}
                    </span>
                  </div>

                  {/* TABLE VISUAL */}
                  <div className="table-visual">
                    <span className="chair top" />

                    <span className="chair bottom" />

                    <span className="chair left" />

                    <span className="chair right" />

                    <div
                      className={tableShapeClass(
                        table.capacity
                      )}
                    >
                      {toDevanagari(table.capacity)}
                    </div>
                  </div>

                  {/* CARD INFO */}
                  <div className="info">
                    <div>
                      <small>
                        {t("capacity", "Capacity")}
                      </small>

                      <strong>
                        {toDevanagari(table.capacity)} {t("seats", "seats")}
                      </strong>
                    </div>

                    <div>
                      <small>
                        {t("section", "Area")}
                      </small>

                      <strong>
                        {t(table.area, table.area)}
                      </strong>
                    </div>
                  </div>

                  {/* GUEST */}
                  {table.guest && (
                    <div className="guest">
                      <div className="avatar">
                        {getInitials(
                          table.guest
                        )}
                      </div>

                      <div className="guest-info">
                        <small>
                          {t("currentGuest", "Current guest")}
                        </small>

                        <strong>
                          {localizeGuestName(table.guest)}
                        </strong>
                      </div>

                      <div className="guest-time">
                        {toDevanagari(table.guestCount || 0)}{" "}
                        {t("guestsCount", "guests")}
                      </div>
                    </div>
                  )}

                  {/* RESERVATION */}
                  {table.status ===
                    "RESERVED" &&
                    reservation && (
                      <div className="guest">
                        <div className="avatar">
                          {getInitials(
                            reservation.guestName
                          )}
                        </div>

                        <div className="guest-info">
                          <small>
                            {t("reservation", "Reservation")}
                          </small>

                          <strong>
                            {localizeGuestName(
                              reservation.guestName
                            )}
                          </strong>
                        </div>

                        <div className="guest-time">
                          {toDevanagari(reservation.time)}
                        </div>
                      </div>
                    )}

                  {/* BILL */}
                  {typeof table.bill ===
                    "number" && (
                    <div className="bill">
                      <span>
                        {t("currentBill", "Current bill")}
                      </span>

                      <strong>
                        ₹
                        {toDevanagari(table.bill.toLocaleString(
                          "en-IN"
                        ))}
                      </strong>
                    </div>
                  )}

                  {/* CARD BUTTONS */}
                  <div
                    className="card-buttons"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <button
                      className="view"
                      onClick={() =>
                        openTableDetails(
                          table
                        )
                      }
                    >
                      {t("view", "View")}
                    </button>

                    <button
                      className="quick-action"
                      onClick={() =>
                        action(table)
                      }
                    >
                      {actionLabel(
                        table
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =====================================================
            DETAILS MODAL
            ===================================================== */}
        {modal === "details" &&
          selected && (
            <div
              className="overlay"
              onMouseDown={(event) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeModal();
                }
              }}
            >
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("tableDetails", "TABLE DETAILS")}
                    </div>

                    <h2>
                      {formatTableName(selected.name)}
                    </h2>

                    <div className="modal-description">
                      {currentActionDescription}
                    </div>
                  </div>

                  <div className="modal-status">
                    <span
                      className={`status ${statusClass(
                        selected.status
                      )}`}
                    >
                      {
                        getStatusLabel(
                          selected.status,
                          selected.id
                        )
                      }
                    </span>
                  </div>
                </div>

                <div className="details">
                  <div className="detail">
                    <span>
                      {t("tables", "Table")}
                    </span>

                    <strong>
                      {formatTableName(selected.name)}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("capacity", "Capacity")}
                    </span>

                    <strong>
                      {toDevanagari(selected.capacity)} {t("seats", "seats")}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("section", "Area")}
                    </span>

                    <strong>
                      {t(selected.area, selected.area)}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("guestCount", "Guest count")}
                    </span>

                    <strong>
                      {selected.guestCount ? toDevanagari(selected.guestCount) : "—"}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("customerGuest", "Guest")}
                    </span>

                    <strong>
                      {selected.guest ? localizeGuestName(selected.guest) : t("noGuest", "No guest")}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("seatedAt", "Seated at")}
                    </span>

                    <strong>
                      {selected.seatedAt ? toDevanagari(selected.seatedAt) : "—"}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("currentBill", "Current bill")}
                    </span>

                    <strong className="detail-value-large">
                      {typeof selected.bill ===
                      "number"
                        ? `₹${toDevanagari(selected.bill.toLocaleString(
                            "en-IN"
                          ))}`
                        : "—"}
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("orderNo", "Order")}
                    </span>

                    <strong>
                      {selected.orderId
                        ? `#${toDevanagari(selected.orderId)}`
                        : t("noActiveOrder", "No active order")}
                    </strong>
                  </div>

                  {selected.note && (
                    <div className="detail full">
                      <span>
                        {t("note", "Note")}
                      </span>

                      <strong>
                        {selected.note}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="modal-divider" />

                <div className="actions">
                  {selected.status ===
                    "AVAILABLE" && (
                    <>
                      <button
                        className="modal-action primary"
                        onClick={
                          startOrderFromDetails
                        }
                      >
                        {t("startOrder", "Start Order")}
                      </button>

                      <button
                        className="modal-action"
                        onClick={
                          reserveSelected
                        }
                      >
                        {t("reserveTable", "Reserve Table")}
                      </button>
                    </>
                  )}

                  {selected.status ===
                    "OCCUPIED" && (
                    <>
                      {(() => {
                        const tableOrder = getOrderForTable(selected.id);

                        return (
                          <>
                            <button
                              className="modal-action primary"
                              onClick={async () => {
                                let orderToUse = tableOrder;
                                if (!orderToUse && selected.orderId) {
                                  try {
                                    const res = await orderService.getOrderById(selected.orderId);
                                    if (res && res.status !== "PAID" && res.status !== "COMPLETED" && res.status !== "CANCELLED") {
                                      orderToUse = {
                                        id: res.id,
                                        tableId: selected.id,
                                        guestName: res.guestName || selected.guest || "Guest",
                                        guestCount: res.guestCount || selected.guestCount || 1,
                                        items: (res.items || []).map((it: any) => ({
                                          id: it.id,
                                          name: it.name,
                                          qty: it.quantity,
                                          price: it.unitPrice,
                                          customization: it.customization || "",
                                        })),
                                        status: (res.status as OrderStatus) || "OPEN",
                                        discount: res.discount || 0,
                                        taxRate: res.taxRate || 5,
                                        createdAt: res.createdAt || new Date().toISOString(),
                                        updatedAt: (res as any).updatedAt || new Date().toISOString(),
                                        sentToKitchen: true,
                                      };
                                      setOrders((prev) => [...prev.filter((o) => o.tableId !== selected.id), orderToUse!]);
                                    }
                                  } catch (e) {
                                    console.warn("Failed to fetch order by id:", e);
                                  }
                                }
                                if (!orderToUse) {
                                  // No active order found for this table: reset table to AVAILABLE and prompt to start new order
                                  await tableService.updateTableStatus(selected.id, "AVAILABLE").catch(() => {});
                                  updateStatus(selected.id, "AVAILABLE");
                                  updateTable(selected.id, { guest: undefined, guestCount: undefined, bill: 0, orderId: undefined });
                                  setSelected((prev) => prev ? { ...prev, status: "AVAILABLE", guest: undefined, guestCount: undefined, bill: 0, orderId: undefined } : prev);
                                  setGuest("");
                                  setGuestCount(String(Math.min(selected.capacity, 2)));
                                  setDraftItems([]);
                                  setDiscountInput("0");
                                  setMenuCategory("All");
                                  setMenuSearch("");
                                  setModal("start-order");
                                  return;
                                }
                                setSelectedOrder(orderToUse);
                                setGuest(orderToUse.guestName || selected.guest || "Guest");
                                setGuestCount(String(orderToUse.guestCount || selected.guestCount || 1));
                                setDraftItems(orderToUse.items || []);
                                setDiscountInput(String(orderToUse.discount || 0));
                                setMenuCategory("All");
                                setMenuSearch("");
                                setModal("order");
                              }}
                            >
                              {t("viewEditOrder", "View / Edit Order")}
                            </button>

                            <button
                              className="modal-action"
                              style={{
                                background: "#C25E00",
                                color: "#FFFFFF",
                                borderColor: "#C25E00",
                                fontWeight: 600,
                              }}
                              onClick={() => {
                                const oId = tableOrder?.id || selected.orderId;
                                const currentOrder = tableOrder || (oId ? orders.find((o) => o.id === oId) : null);
                                if (currentOrder) {
                                  try {
                                    const raw = localStorage.getItem("pending_kots");
                                    const list = raw ? JSON.parse(raw) : [];
                                    const newKotEntry = {
                                      id: currentOrder.id,
                                      kotNumber: `KOT-${currentOrder.id}`,
                                      orderId: currentOrder.id,
                                      customerId: 1,
                                      customerName: currentOrder.guestName || selected.guest || "Guest",
                                      tableId: selected.id,
                                      tableName: formatTableNumber(selected),
                                      tableNumber: formatTableNumber(selected),
                                      status: "READY",
                                      createdAt: currentOrder.createdAt || new Date().toISOString(),
                                      items: (currentOrder.items || []).map((it: any, idx: number) => ({
                                        id: it.id || idx + 1,
                                        itemName: it.name || it.itemName || "Item",
                                        quantity: it.qty || it.quantity || 1,
                                        price: it.price || it.unitPrice || 0,
                                      })),
                                    };
                                    const updatedList = [newKotEntry, ...list.filter((k: any) => k.orderId !== currentOrder.id && k.id !== currentOrder.id)];
                                    localStorage.setItem("pending_kots", JSON.stringify(updatedList));
                                  } catch (_) {}
                                }
                                closeModal();
                                navigate(oId ? `/hotelbilling?orderId=${oId}&tableId=${selected.id}` : `/hotelbilling?tableId=${selected.id}`);
                              }}
                            >
                              {t("goToBillingInvoices", "Go to Billing / Invoices")}
                            </button>


                            <button
                              className="modal-action"
                              onClick={
                                transferFromDetails
                              }
                            >
                              {t("transferTable", "Transfer Table")}
                            </button>

                            <button
                              className="modal-action"
                              onClick={
                                mergeFromDetails
                              }
                            >
                              {t("mergeTable", "Merge Tables")}
                            </button>

                          </>
                        );
                      })()}
                    </>
                  )}



                  {selected.status ===
                    "RESERVED" && (
                    <>
                      <button
                        className="modal-action primary"
                        onClick={() =>
                          viewTableReservation(
                            selected
                          )
                        }
                      >
                        {t("viewReservation", "View Reservation")}
                      </button>

                      <button
                        className="modal-action"
                        onClick={() =>
                          openOrder(selected)
                        }
                      >
                        {t("seatGuest", "Seat Guest")}
                      </button>

                      <button
                        className="modal-action danger"
                        onClick={() =>
                          openConfirm(
                            "cancel-reservation"
                          )
                        }
                      >
                        {t("cancelReservation", "Cancel Reservation")}
                      </button>
                    </>
                  )}

                  {selected.status ===
                    "CLEANING" && (
                    <button
                      className="modal-action primary"
                      onClick={() =>
                        completeCleaning(
                          selected
                        )
                      }
                    >
                      {t("markAvailable", "Mark Available")}
                    </button>
                  )}

                  {canEditTable(
                    selected
                  ) && (
                    <button
                      className="modal-action"
                      onClick={
                        editSelectedTable
                      }
                    >
                      {t("editTable", "Edit Table")}
                    </button>
                  )}

                  {canDeleteTable(
                    selected
                  ) && (
                    <button
                      className="modal-action danger"
                      onClick={() =>
                        openConfirm(
                          "delete"
                        )
                      }
                    >
                      {t("deleteTable", "Delete Table")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            ADD / EDIT TABLE MODAL
            ===================================================== */}
        {(modal === "add" ||
          modal === "edit") && (
          <div className="overlay">
            <div className="modal">
              <button
                className="close"
                onClick={closeModal}
              >
                ×
              </button>

              <div className="modal-head">
                <div>
                  <div className="modal-kicker">
                    {t("tableSetup", "TABLE SETUP")}
                  </div>

                  <h2>
                    {modal === "add"
                      ? t("addTable", "Add Table")
                      : t("editTable", "Edit Table")}
                  </h2>

                  <div className="modal-description">
                    {t("configureTableDesc", "Configure the table capacity, area and internal note.")}
                  </div>
                </div>
              </div>

              <div className="form">
                <div className="form-grid">
                  <label>
                    {t("capacity", "Capacity")}
                    <input
                      type="number"
                      min="1"
                      value={capacity}
                      onChange={(event) =>
                        setCapacity(
                          event.target.value
                        )
                      }
                      placeholder="e.g. 4"
                    />
                  </label>

                  <label>
                    {t("section", "Area")}
                    <select
                      value={area}
                      onChange={(event) =>
                        setArea(
                          event.target.value
                        )
                      }
                    >
                      {tableAreas.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {t(item, item)}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="full">
                    {t("note", "Note")}
                    <textarea
                      value={note}
                      onChange={(event) =>
                        setNote(
                          event.target.value
                        )
                      }
                      placeholder={t("optionalTableNote", "Optional table note...")}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="cancel"
                  onClick={closeModal}
                >
                  {t("cancel", "Cancel")}
                </button>

                <button
                  className="submit"
                  onClick={
                    modal === "add"
                      ? addTable
                      : editTable
                  }
                >
                  {modal === "add"
                    ? t("addTable", "Add Table")
                    : t("saveChanges", "Save Changes")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            RESERVE TABLE MODAL
            ===================================================== */}
        {modal === "reserve" &&
          selected && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("reservationUpper", "RESERVATION")}
                    </div>

                    <h2>
                      {t("reserveTable", "Reserve Table")} —{" "}
                      {formatTableName(selected.name)}
                    </h2>

                    <div className="modal-description">
                      {t("addGuestReservationDetailsDesc", "Add the guest and reservation details.")}
                    </div>
                  </div>
                </div>

                <div className="form">
                  <div className="form-grid">
                    <label>
                      {t("guestName", "Guest name")}
                      <input
                        value={guest}
                        onChange={(event) =>
                          setGuest(
                            event.target.value
                          )
                        }
                        placeholder={t("guestName", "Guest name")}
                      />
                    </label>

                    <label>
                      {t("guestCount", "Guest count")}
                      <input
                        type="number"
                        min="1"
                        max={selected.capacity}
                        value={guestCount}
                        onChange={(event) =>
                          setGuestCount(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      {t("date", "Date")}
                      <LocalizedDatePicker
                        value={reservationDate}
                        onChange={setReservationDate}
                      />
                    </label>

                    <label>
                      {t("time", "Time")}
                      <input
                        type="time"
                        value={
                          reservationTime
                        }
                        onChange={(event) =>
                          setReservationTime(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="full">
                      {t("phone", "Phone")}
                      <input
                        maxLength={10}
                        inputMode="numeric"
                        value={
                          reservationPhone
                        }
                        onChange={(event) =>
                          setReservationPhone(
                            sanitizeMobileInput(event.target.value)
                          )
                        }
                        placeholder={t("phonePlaceholder", "10 digit mobile (starts with 6-9)")}
                      />
                    </label>

                    <label className="full">
                      {t("notes", "Notes")}
                      <textarea
                        value={
                          reservationNotes
                        }
                        onChange={(event) =>
                          setReservationNotes(
                            event.target.value
                          )
                        }
                        placeholder={t("reservationNotesPlaceholder", "Reservation notes...")}
                      />
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("cancel", "Cancel")}
                  </button>

                  <button
                    className="submit"
                    onClick={reserveTable}
                  >
                    {t("confirmReservation", "Confirm Reservation")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            START ORDER MODAL
            ===================================================== */}
        {modal === "start-order" &&
          selected && (
            <div
              className="overlay"
              onMouseDown={(event) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeModal();
                }
              }}
            >
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("newOrderUpper", "NEW ORDER")} • {t("tableNoUpper", "TABLE NO")}: {formatTableName(selected.name).toUpperCase()}
                    </div>

                    <h2>
                      {t("startOrder", "Start Order")} — {t("tableNo", "Table No")}: {formatTableName(selected.name)}
                    </h2>

                    <div className="modal-description">
                      {t("seatTheGuestAndBegin", "Seat the guest and begin the table order for")} <strong>{t("tableNo", "Table No")}: {formatTableName(selected.name)}</strong> ({t(selected.area, selected.area)} • {t("capacity", "Capacity")}: {toDevanagari(selected.capacity)}).
                    </div>
                  </div>
                </div>

                <div className="form">
                  <div className="form-grid">
                    <label>
                      {t("tableNo", "Table No")}
                      <input
                        type="text"
                        value={`${t("tableNo", "Table No")}: ${formatTableName(selected.name)}`}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f5ede6",
                          color: "#8b3e16",
                          fontWeight: 700,
                          cursor: "not-allowed",
                          border: "1px solid #dcbda6",
                        }}
                      />
                      <span className="form-help">
                        {t("selectedTable", "Selected table")} (ID: #{toDevanagari(selected.id)} • {t(selected.area, selected.area)})
                      </span>
                    </label>


                    <label>
                      {t("guestCount", "Guest count")}
                      <input
                        type="number"
                        min="1"
                        max={selected.capacity}
                        maxLength={25}
                        value={guestCount}
                        onChange={(event) =>
                          setGuestCount(
                            event.target.value.slice(0, 25)
                          )
                        }
                      />

                      <span className="form-help">
                        {t("maximumChars", "Maximum 25 characters")} • {t("capacity", "Capacity")}: {toDevanagari(selected.capacity)}
                      </span>

                      <span className="form-help">
                        {t("maxCapacity", "Maximum capacity")}:{" "}
                        {toDevanagari(selected.capacity)}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("cancel", "Cancel")}
                  </button>

                  <button
                    className="submit"
                    onClick={startOrder}
                  >
                    {t("startOrder", "Start Order")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            ORDER MODAL
            ===================================================== */}
        {modal === "order" &&
          selected &&
          selectedOrder && (
            <div className="overlay">
              <div className="modal wide">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {selectedOrder.status === "BILL_REQUESTED"
                        ? `${t("billInvoiceUpper", "BILL / INVOICE")} • ${t("tableNoUpper", "TABLE NO")}: ${formatTableName(selected.name).toUpperCase()}`
                        : `${t("tableOrderUpper", "TABLE ORDER")} • ${t("tableNoUpper", "TABLE NO")}: ${formatTableName(selected.name).toUpperCase()}`}
                    </div>

                    <h2>
                      {selectedOrder.status === "BILL_REQUESTED"
                        ? `${t("billInvoiceUpper", "Bill / Invoice")} — ${t("tableNo", "Table No")}: ${formatTableName(selected.name)}`
                        : <>{t("orderNo", "Order #")}{toDevanagari(selectedOrder.id)} • {t("tableNo", "Table No")}: {formatTableName(selected.name)}</>}
                    </h2>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#8E481A", background: "#f5ede6", padding: "4px 10px", borderRadius: "6px", border: "1px solid #dcbda6" }}>
                        <span>{t("tableNo", "Table No")}: {formatTableName(selected.name)}</span>
                      </div>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#8E481A" }}>
                        {t("guest", "Guest")}:
                        <input
                          type="text"
                          value={guest}
                          placeholder={t("guestName", "Guest name")}
                          onChange={(event) => {
                            const val = event.target.value;
                            setGuest(val);
                            if (selectedOrder) {
                              const updated = { ...selectedOrder, guestName: val };
                              setSelectedOrder(updated);
                              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
                              updateTable(selected.id, { guest: val });
                            }
                          }}
                          style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #E5DCD5", fontSize: "12px", width: "130px" }}
                        />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#8E481A" }}>
                        {t("count", "Count")}:
                        <input
                          type="number"
                          min="1"
                          max={selected.capacity}
                          value={guestCount}
                          onChange={(event) => {
                            const val = event.target.value;
                            setGuestCount(val);
                            if (selectedOrder) {
                              const updated = { ...selectedOrder, guestCount: Number(val) || 1 };
                              setSelectedOrder(updated);
                              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
                              updateTable(selected.id, { guestCount: Number(val) || 1 });
                            }
                          }}
                          style={{ width: "55px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #E5DCD5", fontSize: "12px" }}
                        />
                      </label>
                      <span style={{ fontSize: "11px", color: "#887970", background: "#F5EDE6", padding: "4px 8px", borderRadius: "6px" }}>
                        {t(selected.area, selected.area)} • {t("maxCapacity", "Max Capacity")}: {toDevanagari(selected.capacity)}
                      </span>
                    </div>
                  </div>

                  <div className="modal-status">
                    <span className="status">
                      {orderStatusName[selectedOrder.status]}
                    </span>
                  </div>
                </div>

                <div className="order-layout">
                  {/* LEFT COLUMN: MENU ITEMS SELECTION */}
                  <div className="order-panel" style={{ display: "flex", flexDirection: "column" }}>
                    <div className="order-panel-head">
                      <div>
                        <div className="order-panel-title">
                          {t("selectMenuItems", "Select Menu Items")}
                        </div>
                        <div className="order-panel-subtitle">
                          {t("tapToAddItems", "Tap + or − on items to add directly to order")}
                        </div>
                      </div>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={openAddMenuItem}
                      >
                        {t("addCustomItem", "+ Add Custom Item")}
                      </button>
                    </div>

                    <div className="menu-tools" style={{ padding: "10px 14px", borderBottom: "1px solid #eee3da", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        className="menu-search"
                        value={menuSearch}
                        onChange={(event) => setMenuSearch(event.target.value)}
                        placeholder={t("searchMenuItems", "Search menu items...")}
                        style={{ flex: "1 1 180px", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid #dcbda6", fontSize: "12px" }}
                      />

                      <select
                        className="menu-category"
                        value={menuCategory}
                        onChange={(event) => setMenuCategory(event.target.value)}
                        style={{ height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid #dcbda6", fontSize: "12px", background: "#fffdf9" }}
                      >
                        {menuCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === "All" ? t("all", "All") : t(cat, cat)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="menu-list" style={{ flex: 1, padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px", maxHeight: "480px", overflowY: "auto" }}>
                      {filteredMenuItems.map((item) => {
                        const qty = getItemQtyInOrder(item);
                        return (
                          <div
                            key={item.id}
                            className="menu-item"
                            style={{
                              border: qty > 0 ? "1.5px solid #EA580C" : "1.06px solid #eee3da",
                              background: qty > 0 ? "#FFF9F5" : "#fffdf9",
                              borderRadius: "10px",
                              padding: "10px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "8px",
                              minHeight: "115px",
                            }}
                          >
                            <div>
                              <div className="menu-item-category" style={{ fontSize: "10px", fontWeight: 800, color: "#a95112", textTransform: "uppercase" }}>
                                {t(item.category, item.category)}
                              </div>
                              <div className="menu-item-name" style={{ fontSize: "13px", fontWeight: 800, color: "#251b16", marginTop: "2px" }}>
                                {getLocalizedMenuItemName(item.name, currentLanguage)}
                              </div>
                              {item.description && (
                                <div className="menu-item-description" style={{ fontSize: "11px", color: "#887970", marginTop: "2px", lineHeight: "1.3" }}>
                                  {getLocalizedMenuDescription(item.description, currentLanguage)}
                                </div>
                              )}
                            </div>

                            <div className="menu-item-bottom" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                              <span className="menu-item-price" style={{ fontSize: "14px", fontWeight: 800, color: "#8e481a" }}>
                                ₹{toDevanagari(item.price.toLocaleString("en-IN"))}
                              </span>

                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  background: qty > 0 ? "#FFEDD5" : "#F5F5F4",
                                  borderRadius: "8px",
                                  border: qty > 0 ? "1px solid #FB923C" : "1px solid #E7E5E4",
                                  overflow: "hidden",
                                }}
                              >
                                <button
                                  type="button"
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    padding: "5px 10px",
                                    cursor: qty > 0 ? "pointer" : "default",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    color: qty > 0 ? "#1C1917" : "#A8A29E",
                                  }}
                                  disabled={qty <= 0}
                                  onClick={() => handleItemStepperChange(item, -1)}
                                >
                                  −
                                </button>
                                <span
                                  style={{
                                    minWidth: "24px",
                                    textAlign: "center",
                                    fontWeight: 800,
                                    fontSize: "13px",
                                    color: qty > 0 ? "#EA580C" : "#78716C",
                                  }}
                                >
                                  {toDevanagari(qty)}
                                </span>
                                <button
                                  type="button"
                                  style={{
                                    border: "none",
                                    background: "#EA580C",
                                    color: "#FFFFFF",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                  }}
                                  onClick={() => handleItemStepperChange(item, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredMenuItems.length === 0 && (
                        <div className="empty" style={{ gridColumn: "1 / -1", padding: "30px", textAlign: "center" }}>
                          <p style={{ color: "#887970" }}>{t("noMenuItemsFound", "No menu items found. Try another search or category.")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: ORDER SUMMARY & CART */}
                  <div className="order-panel" style={{ display: "flex", flexDirection: "column" }}>
                    <div className="order-panel-head">
                      <div>
                        <div className="order-panel-title">
                          {t("orderSummary", "Order Summary")}
                        </div>
                        <div className="order-panel-subtitle">
                          {formatTableName(selected.name)} • {toDevanagari(selectedOrder.items.length)} {selectedOrder.items.length === 1 ? t("item", "item") : t("items", "items")} {t("selected", "selected")}
                        </div>
                      </div>
                    </div>

                    <div className="order-items" style={{ flex: 1, maxHeight: "240px", overflowY: "auto", padding: "10px 14px" }}>
                      {selectedOrder.items.length === 0 ? (
                        <div className="empty" style={{ padding: "30px 15px", textAlign: "center" }}>
                          <div className="empty-icon" style={{ fontSize: "24px", color: "#a94d0d" }}>+</div>
                          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "6px 0" }}>{t("noItemsInOrder", "No items in order")}</h3>
                          <p style={{ fontSize: "12px", color: "#887970" }}>{t("tapOnMenuItemsToAdd", "Tap + on menu items to add to this table.")}</p>
                        </div>
                      ) : (
                        selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="order-item"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                              borderBottom: "1px solid #f3ece4",
                              gap: "8px",
                            }}
                          >
                            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                              <div className="order-item-name" style={{ fontSize: "13px", fontWeight: 700, color: "#251b16" }}>
                                {getLocalizedMenuItemName(item.name, currentLanguage)}
                              </div>
                              <div style={{ fontSize: "11px", color: "#887970" }}>
                                ₹{toDevanagari(item.price)} {t("each", "each")}
                              </div>
                            </div>

                            <div className="quantity-control" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <button
                                style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #ddd", background: "#f8f8f8", cursor: "pointer", fontWeight: 700 }}
                                onClick={() => changeItemQuantity(item.id, -1)}
                              >
                                −
                              </button>
                              <span className="quantity-value" style={{ minWidth: "20px", textAlign: "center", fontWeight: 700, fontSize: "12px" }}>
                                {toDevanagari(item.qty)}
                              </span>
                              <button
                                style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid #a94d0d", background: "#a94d0d", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                                onClick={() => changeItemQuantity(item.id, 1)}
                              >
                                +
                              </button>
                            </div>

                            <div className="order-item-price" style={{ minWidth: "60px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#8e481a" }}>
                              ₹{toDevanagari((item.price * item.qty).toLocaleString("en-IN"))}
                            </div>

                            <button
                              className="remove-item"
                              style={{ background: "transparent", border: "none", color: "#999", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
                              onClick={() => removeOrderItem(item.id)}
                              title={t("removeItem", "Remove item")}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="order-summary" style={{ padding: "12px 14px", borderTop: "1px solid #eee3da", background: "#fffdf9" }}>
                      <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#777" }}>{t("subtotal", "Subtotal")}</span>
                        <strong>₹{toDevanagari(selectedOrderTotals.subtotal.toLocaleString("en-IN"))}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#777" }}>{t("discountRs", "Discount (₹)")}</span>
                        <input
                          type="number"
                          min="0"
                          value={discountInput}
                          onChange={(e) => updateOrderDiscount(e.target.value)}
                          style={{ width: "70px", padding: "2px 6px", borderRadius: "4px", border: "1px solid #ddd", textAlign: "right", fontSize: "12px" }}
                        />
                      </div>

                      <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                        <span style={{ color: "#777" }}>{t("tax", "Tax")} ({toDevanagari(selectedOrder.taxRate)}%)</span>
                        <strong>₹{toDevanagari(selectedOrderTotals.tax.toLocaleString("en-IN"))}</strong>
                      </div>

                      <div className="summary-row total" style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, color: "#8B3E16", paddingTop: "6px", borderTop: "1px dashed #dcbda6" }}>
                        <span>{t("payableTotal", "Payable Total")}</span>
                        <strong>₹{toDevanagari(selectedOrderTotals.total.toLocaleString("en-IN"))}</strong>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                        <button
                          type="button"
                          className="submit"
                          style={{
                            width: "100%",
                            height: "42px",
                            borderRadius: "8px",
                            cursor: selectedOrder.items.length > 0 ? "pointer" : "not-allowed",
                            fontWeight: 700,
                            fontSize: "13px",
                            opacity: selectedOrder.items.length > 0 ? 1 : 0.55,
                            background: "#8B3E16",
                            color: "#fff",
                            border: "none",
                          }}
                          onClick={sendOrderToKitchen}
                          disabled={selectedOrder.items.length === 0}
                        >
                          {selectedOrder.sentToKitchen ? t("updateAndSaveOrder", "Update & Save Order") : t("sendOrder", "Send Order")}
                        </button>

                        {selectedOrder.items.length > 0 && (
                          <button
                            type="button"
                            className="submit"
                            style={{
                              width: "100%",
                              height: "38px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: "12px",
                              background: "#C25E00",
                              color: "#fff",
                              border: "none",
                            }}
                            onClick={() => {
                              if (selectedOrder) {
                                try {
                                  const raw = localStorage.getItem("pending_kots");
                                  const list = raw ? JSON.parse(raw) : [];
                                  const newKotEntry = {
                                    id: selectedOrder.id,
                                    kotNumber: `KOT-${selectedOrder.id}`,
                                    orderId: selectedOrder.id,
                                    customerId: 1,
                                    customerName: selectedOrder.guestName || selected?.guest || "Guest",
                                    tableId: selected?.id || 1,
                                    tableName: selected ? formatTableNumber(selected) : "Table 1",
                                    tableNumber: selected ? formatTableNumber(selected) : "Table 1",
                                    status: "READY",
                                    createdAt: selectedOrder.createdAt || new Date().toISOString(),
                                    items: (selectedOrder.items || []).map((it: any, idx: number) => ({
                                      id: it.id || idx + 1,
                                      itemName: it.name || it.itemName || "Item",
                                      quantity: it.qty || it.quantity || 1,
                                      price: it.price || it.unitPrice || 0,
                                    })),
                                  };
                                  const updatedList = [newKotEntry, ...list.filter((k: any) => k.orderId !== selectedOrder.id && k.id !== selectedOrder.id)];
                                  localStorage.setItem("pending_kots", JSON.stringify(updatedList));
                                } catch (_) {}
                              }
                              closeModal();
                              navigate(`/hotelbilling?orderId=${selectedOrder.id}&tableId=${selected?.id}`);
                            }}
                          >
                            {t("proceedToBillingInvoices", "Proceed to Billing / Invoices")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            ADD ITEM MODAL
            ===================================================== */}
        {modal === "add-item" &&
          selectedOrder && (
            <div className="overlay">
              <div className="modal wide">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("menuUpper", "MENU")}
                    </div>

                    <h2>
                      {t("addFoodItems", "Add Food Items")}
                    </h2>

                    <div className="modal-description">
                      {t("selectRequiredItemsDesc", "Select all required items, adjust quantities, then confirm. Your order will not change until you click Confirm Items.")}
                    </div>
                  </div>
                </div>

                <div className="menu-tools">
                  <input
                    className="menu-search"
                    value={menuSearch}
                    onChange={(event) =>
                      setMenuSearch(
                        event.target.value
                      )
                    }
                    placeholder={t("searchMenu", "Search menu...")}
                  />

                  <select
                    className="menu-category"
                    value={menuCategory}
                    onChange={(event) =>
                      setMenuCategory(
                        event.target.value
                      )
                    }
                  >
                    {menuCategories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category === "All" ? t("all", "All") : t(category, category)}
                        </option>
                      )
                    )}
                  </select>
                  <button
                    className="add-menu-item"
                    onClick={openAddMenuItem}
                    type="button"
                  >
                    {t("addMenuItem", "+ Add Menu Item")}
                  </button>
                </div>

                <div className="menu-list">
                  {filteredMenuItems.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="menu-item"
                      >
                        <div>
                          <div className="menu-item-category">
                            {t(item.category, item.category)}
                          </div>

                          <div className="menu-item-name">
                            {getLocalizedMenuItemName(item.name, currentLanguage)}
                          </div>

                          <div className="menu-item-description">
                            {
                              getLocalizedMenuDescription(item.description, currentLanguage)
                            }
                          </div>
                        </div>

                        <div className="menu-item-bottom">
                          <span className="menu-item-price">
                            ₹
                            {toDevanagari(item.price.toLocaleString(
                              "en-IN"
                            ))}
                          </span>

                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "#F5F5F4",
                              borderRadius: "8px",
                              border: "1px solid #E7E5E4",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: "6px 12px",
                                cursor: getDraftItemQty(item) > 0 ? "pointer" : "default",
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: getDraftItemQty(item) > 0 ? "#1C1917" : "#A8A29E",
                              }}
                              disabled={getDraftItemQty(item) <= 0}
                              onClick={() => changeDraftItemQty(item, -1)}
                            >
                              −
                            </button>
                            <span
                              style={{
                                minWidth: "28px",
                                textAlign: "center",
                                fontWeight: 800,
                                fontSize: "0.9rem",
                                color: getDraftItemQty(item) > 0 ? "#EA580C" : "#78716C",
                              }}
                            >
                              {toDevanagari(getDraftItemQty(item))}
                            </span>
                            <button
                              type="button"
                              style={{
                                border: "none",
                                background: "#EA580C",
                                color: "#FFFFFF",
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: "1rem",
                              }}
                              onClick={() => changeDraftItemQty(item, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {filteredMenuItems.length ===
                    0 && (
                    <div className="empty">
                      <div className="empty-icon">
                        ⌕
                      </div>

                      <h3>
                        {t("noMenuItemsFound", "No menu items found")}
                      </h3>

                      <p>
                        {t("tryAnotherSearchOrCategory", "Try another search or category.")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={() => setModal("order")}
                    type="button"
                  >
                    {t("back", "Back")}
                  </button>

                  <button
                    className="submit"
                    onClick={confirmItems}
                    type="button"
                  >
                    {t("confirmItems", "Confirm Items")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            ADD MENU ITEM MODAL
            ===================================================== */}
        {modal === "add-menu-item" && (
          <div className="overlay">
            <div className="modal">
              <button
                className="close"
                onClick={closeModal}
              >
                ×
              </button>

              <div className="modal-head">
                <div>
                  <div className="modal-kicker">
                    {t("menuUpper", "MENU")}
                  </div>

                  <h2>
                    {t("addMenuItem", "Add Menu Item")}
                  </h2>

                  <div className="modal-description">
                    {t("addMenuItemDesc", "Add a new item and its price manually.")}
                  </div>
                </div>
              </div>

              <div className="form">
                <label>
                  {t("itemName", "Item Name")}
                  <input
                    type="text"
                    value={newMenuItemName}
                    onChange={(event) =>
                      setNewMenuItemName(event.target.value)
                    }
                    placeholder={t("enterItemName", "Enter item name")}
                    autoFocus
                  />
                </label>

                <label>
                  {t("price", "Price")}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newMenuItemPrice}
                    onChange={(event) =>
                      setNewMenuItemPrice(event.target.value)
                    }
                    placeholder={t("enterPrice", "Enter price")}
                  />
                </label>

                <button
                  className="submit"
                  onClick={addMenuItemManually}
                  type="button"
                  disabled={!newMenuItemName.trim() || Number(newMenuItemPrice) <= 0}
                >
                  {t("saveMenuItem", "Save Menu Item")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TRANSFER MODAL
            ===================================================== */}
        {modal === "transfer" &&
          selected && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("transferTableUpper", "TRANSFER TABLE")}
                    </div>

                    <h2>
                      {t("moveTable", "Move")}{" "}
                      {formatTableName(selected.name)}
                    </h2>

                    <div className="modal-description">
                      {t("selectAvailableTableDesc", "Select an available table for the active order.")}
                    </div>
                  </div>
                </div>

                <div className="form">
                  <label>
                    {t("availableTable", "Available table")}
                    <select
                      value={
                        transferTargetId
                      }
                      onChange={(event) =>
                        setTransferTargetId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {t("selectTable", "Select table")}
                      </option>

                      {availableTransferTables.map(
                        (table) => (
                          <option
                            key={table.id}
                            value={table.id}
                          >
                            {formatTableName(table.name)} •{" "}
                            {toDevanagari(table.capacity)} {t("seats", "seats")} •{" "}
                            {t(table.area, table.area)}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("cancel", "Cancel")}
                  </button>

                  <button
                    className="submit"
                    onClick={
                      transferTable
                    }
                    disabled={
                      !transferTargetId
                    }
                  >
                    {t("transfer", "Transfer")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            MERGE MODAL
            ===================================================== */}
        {modal === "merge" &&
          selected && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("mergeTables", "MERGE TABLES")}
                    </div>

                    <h2>
                      {t("mergeWith", "Merge with")}{" "}
                      {formatTableName(selected.name)}
                    </h2>

                    <div className="modal-description">
                      {t("selectMergeDesc", "Select one or more occupied tables to combine their orders.")}
                    </div>
                  </div>
                </div>

                <div className="merge-list">
                  {mergeCandidates.length ===
                  0 ? (
                    <div className="inline-notice">
                      {t("noOccupiedMerge", "No other occupied tables are available for merging.")}
                    </div>
                  ) : (
                    mergeCandidates.map(
                      (table) => (
                        <label
                          key={table.id}
                          className="merge-option"
                        >
                          <input
                            type="checkbox"
                            checked={mergeTableIds.includes(
                              table.id
                            )}
                            onChange={() =>
                              toggleMergeTable(
                                table.id
                              )
                            }
                          />

                          <div className="merge-option-info">
                            <div className="merge-option-name">
                              {formatTableName(table.name)}
                            </div>

                            <div className="merge-option-meta">
                              {table.guest ?
                                localizeGuestName(table.guest) :
                                t("guest", "Guest")}{" "}
                              •{" "}
                              {toDevanagari(table.guestCount ||
                                0)}{" "}
                              {t("guests", "guests")} • ₹
                              {toDevanagari((
                                table.bill ||
                                0
                              ).toLocaleString(
                                "en-IN"
                              ))}
                            </div>
                          </div>
                        </label>
                      )
                    )
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("cancel", "Cancel")}
                  </button>

                  <button
                    className="submit"
                    onClick={mergeTables}
                    disabled={
                      mergeTableIds.length ===
                      0
                    }
                  >
                    {t("mergeTables", "Merge Tables")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            SPLIT BILL MODAL
            ===================================================== */}
        {modal === "split-bill" &&
          selectedOrder && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("splitBill", "SPLIT BILL")}
                    </div>

                    <h2>
                      {t("splitOrder", "Split Order")} #
                      {toDevanagari(selectedOrder.id)}
                    </h2>

                    <div className="modal-description">
                      {t("splitBillDesc", "Divide the final bill equally between guests.")}
                    </div>
                  </div>
                </div>

                <div className="form">
                  <label>
                    {t("numberOfPeople", "Number of people")}
                    <input
                      type="number"
                      min="2"
                      value={splitCount}
                      onChange={(event) =>
                        setSplitCount(
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>

                <div className="split-preview">
                  <div className="split-box">
                    <span>
                      {t("totalBill", "Total bill")}
                    </span>

                    <strong>
                      ₹
                      {toDevanagari(splitBillDetails.total.toLocaleString(
                        "en-IN"
                      ))}
                    </strong>
                  </div>

                  <div className="split-box">
                    <span>
                      {t("people", "People")}
                    </span>

                    <strong>
                      {toDevanagari(splitBillDetails.count)}
                    </strong>
                  </div>

                  <div className="split-box">
                    <span>
                      {t("eachPerson", "Each person")}
                    </span>

                    <strong>
                      ₹
                      {toDevanagari(splitBillDetails.each.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits: 2,
                        }
                      ))}
                    </strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("close", "Close")}
                  </button>

                  <button
                    className="submit"
                    onClick={closeModal}
                  >
                    {t("done", "Done")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            PAYMENT MODAL
            ===================================================== */}
        {modal === "payment" &&
          selectedOrder && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("payments", "PAYMENT")}
                    </div>

                    <h2>
                      {t("completePayment", "Complete Payment")}
                    </h2>

                    <div className="modal-description">
                      {t("orderNo", "Order #")}{" "}
                      {toDevanagari(selectedOrder.id)} •{" "}
                      {localizeGuestName(selectedOrder.guestName)}
                    </div>
                  </div>
                </div>

                <div className="payment-total">
                  <span>
                    {t("amountDue", "Amount due")}
                  </span>

                  <strong>
                    ₹
                    {toDevanagari(selectedOrderTotals.total.toLocaleString(
                      "en-IN"
                    ))}
                  </strong>
                </div>

                <div className="payment-methods">
                  {paymentMethods.map(
                    (method) => (
                      <button
                        key={method}
                        className={`payment-method ${
                          paymentMethod ===
                          method
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setPaymentMethod(
                            method
                          )
                        }
                      >
                        {method === "CASH"
                          ? `💵 ${t("cash", "Cash")}`
                          : method === "CARD"
                          ? `💳 ${t("card", "Card")}`
                          : `📱 ${t("upi", "UPI")}`}
                      </button>
                    )
                  )}
                </div>

                <div className="form">
                  <label>
                    {t("amountToPay", "Payment amount")}
                    <input
                      type="number"
                      min="0"
                      value={
                        paymentAmount
                      }
                      onChange={(event) =>
                        setPaymentAmount(
                          event.target.value
                        )
                      }
                      placeholder={String(
                        selectedOrderTotals.total
                      )}
                    />
                  </label>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("cancel", "Cancel")}
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() => splitFromDetails()}
                  >
                    {t("splitBill", "Split Bill")}
                  </button>

                  <button
                    className="submit"
                    onClick={completePayment}
                  >
                    {t("confirmPayment", "Confirm Payment")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            PAYMENT SUCCESS MODAL
            ===================================================== */}
        {modal === "payment-success" &&
          selected &&
          selectedOrder && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="confirm-content" style={{ textAlign: "center" }}>
                  <div
                    className="confirm-icon"
                    style={{ margin: "0 auto 12px" }}
                  >
                    ✓
                  </div>

                  <div className="modal-kicker">
                    {t("paymentSuccessful", "PAYMENT SUCCESSFUL")}
                  </div>

                  <h2>{t("paymentSuccessful", "Payment Successful")}</h2>

                  <p>
                    {t("paymentSuccessDescClean", "Payment for order has been confirmed. The table is now ready for cleaning.")}
                  </p>

                  <div className="payment-total">
                    <span>{t("amountPaid", "Amount Paid")}</span>
                    <strong>
                      ₹
                      {toDevanagari(calculateOrderTotals(selectedOrder).total.toLocaleString(
                        "en-IN"
                      ))}
                    </strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="submit"
                    onClick={closeModal}
                  >
                    {t("continueToCleaning", "Continue to Cleaning")}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            RESERVATION DETAILS MODAL
            ===================================================== */}
        {modal === "reservation" &&
          selectedReservation && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="modal-head">
                  <div>
                    <div className="modal-kicker">
                      {t("reservation", "RESERVATION")}
                    </div>

                    <h2>
                      {
                        localizeGuestName(selectedReservation.guestName)
                      }
                    </h2>

                    <div className="modal-description">
                      {t("reservation", "Reservation")} #
                      {
                        toDevanagari(selectedReservation.id)
                      }
                    </div>
                  </div>

                  <div className="modal-status">
                    <span className="status reserved">
                      {
                        t(reservationStatusName[
                          selectedReservation
                            .status
                        ].toLowerCase(), reservationStatusName[
                          selectedReservation
                            .status
                        ])
                      }
                    </span>
                  </div>
                </div>

                <div className="reservation-banner">
                  <div className="reservation-icon">
                    ◷
                  </div>

                  <div>
                    <strong>
                      {
                        toDevanagari(selectedReservation.date)
                      }{" "}
                      {t("at", "at")}{" "}
                      {
                        toDevanagari(selectedReservation.time)
                      }
                    </strong>

                    <span>
                      {t("tableNo", "Table #")}{" "}
                      {
                        toDevanagari(selectedReservation
                          .tableId)
                      }{" "}
                      •{" "}
                      {
                        toDevanagari(selectedReservation
                          .guestCount)
                      }{" "}
                      {t("guests", "guests")}
                    </span>
                  </div>
                </div>

                <div className="details">
                  <div className="detail">
                    <span>
                      {t("guest", "Guest")}
                    </span>

                    <strong>
                      {
                        localizeGuestName(selectedReservation.guestName)
                      }
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("guests", "Guests")}
                    </span>

                    <strong>
                      {
                        toDevanagari(selectedReservation.guestCount)
                      }
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("date", "Date")}
                    </span>

                    <strong>
                      {
                        toDevanagari(selectedReservation.date)
                      }
                    </strong>
                  </div>

                  <div className="detail">
                    <span>
                      {t("time", "Time")}
                    </span>

                    <strong>
                      {
                        toDevanagari(selectedReservation.time)
                      }
                    </strong>
                  </div>

                  <div className="detail full">
                    <span>
                      {t("phone", "Phone")}
                    </span>

                    <strong>
                      {
                        selectedReservation.phone
                          ? toDevanagari(selectedReservation.phone)
                          : "—"
                      }
                    </strong>
                  </div>

                  <div className="detail full">
                    <span>
                      {t("notes", "Notes")}
                    </span>

                    <strong>
                      {
                        selectedReservation.notes ||
                        "—"
                      }
                    </strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("close", "Close")}
                  </button>

                  {selectedReservation.status ===
                    "CONFIRMED" && (
                    <button
                      className="danger-btn"
                      onClick={() =>
                        openConfirm(
                          "cancel-reservation"
                        )
                      }
                    >
                      {t("cancelReservation", "Cancel Reservation")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}



        {/* =====================================================
            CONFIRMATION MODAL
            ===================================================== */}
        {modal === "confirm" &&
          confirmAction && (
            <div className="overlay">
              <div className="modal">
                <button
                  className="close"
                  onClick={closeModal}
                >
                  ×
                </button>

                <div className="confirm-content">
                  <div
                    className="confirm-icon"
                    style={
                      confirmAction === "generate-kot"
                        ? {
                            width: "50px",
                            height: "50px",
                            borderRadius: "12px",
                            background: "#000000",
                            color: "#ffffff",
                            fontSize: "25px",
                            fontWeight: 900,
                          }
                        : undefined
                    }
                  >
                    {confirmAction === "generate-kot" ? "✓" : "!"}
                  </div>

                  <div className="modal-kicker">
                    {t("confirmAction", "CONFIRM ACTION")}
                  </div>

                  <h2>
                    {confirmTitle}
                  </h2>

                  <p>
                    {confirmDescription}
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    className="cancel"
                    onClick={closeModal}
                  >
                    {t("goBack", "Go Back")}
                  </button>

                  <button
                    className={
                      confirmAction ===
                        "delete" ||
                      confirmAction ===
                        "cancel-order" ||
                      confirmAction ===
                        "cancel-reservation"
                        ? "danger-btn"
                        : "submit"
                    }
                    onClick={
                      executeConfirmAction
                    }
                  >
                    {t("confirm", "Confirm")}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </>
  );
};

export { Tables, Tables as TableLayout };
export default Tables;