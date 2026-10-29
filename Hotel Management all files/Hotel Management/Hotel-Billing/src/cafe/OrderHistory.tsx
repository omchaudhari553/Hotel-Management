import React, { useEffect, useMemo, useState } from "react";
import { orderService } from "../services/orderService";
import { sanitizeMobileInput } from "../common/phoneUtils";
import { dialogService } from "../context/DialogContext";
import {
  CheckCircle2,
  ShoppingBag,
  X,
  Utensils,
  Clock,
  Search,
  FileText,
  Calendar,
  Smartphone,
  Banknote,
  CreditCard,
  Building2,
  Printer,
  Download,
  Share2,
  Settings,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type OrderType = "DINE_IN" | "TAKEAWAY";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

interface OrderRecord {
  id: number;
  kotNumber: string;
  orderType: OrderType;
  table: string;
  items: OrderItem[];
  subtotal: number;

  discountType?: "AMOUNT" | "PERCENTAGE";
  discountValue?: number | "";

  discount: number;

  gstRate?: number | "";
  gst: number;

  total: number;

  status: string;
  paymentMethod?: string;
  createdAt: string;
}

type TabType = "ACTIVE" | "COMPLETED";

/* =========================================================
   HELPERS
========================================================= */

const getOrders = (key: string): OrderRecord[] => {
  try {
    const storedData = localStorage.getItem(key);

    if (!storedData) {
      return [];
    }

    const parsedData = JSON.parse(storedData);

    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return [];
  }
};

const formatMoney = (value: number | undefined | null) => {
  return `₹${Number(value || 0).toFixed(2)}`;
};

const getTimeAgo = (dateString: string) => {
  const created = new Date(dateString).getTime();

  if (Number.isNaN(created)) {
    return "";
  }

  const now = Date.now();
  const difference = Math.max(0, now - created);

  const minutes = Math.floor(difference / (1000 * 60));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
};

const getKotDisplayNumber = (kotNumber: string) => {
  if (!kotNumber) {
    return "";
  }

  return kotNumber.replace(/^KOT-/i, "");
};

const getStatusLabel = (status: string) => {
  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "PAID") {
    return "Paid";
  }

  return "Active";
};

/* =========================================================
   COMPONENT
========================================================= */

export const OrderHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");

  const [activeOrders, setActiveOrders] = useState<OrderRecord[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderRecord[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<OrderRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<"UPI" | "CASH" | "CARD" | "BANK_TRANSFER">("UPI");

  const [showBillPreview, setShowBillPreview] = useState(false);

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const [customHotelName, setCustomHotelName] =
    useState("ANNAPURNA RESTAURANT");

  const [customGstin, setCustomGstin] =
    useState("GSTIN: 27AABCA1234F1Z5");

  const [customAddress, setCustomAddress] =
    useState("Main Street, City Center");

  const [customPhone, setCustomPhone] =
    useState("+91 98765 43210");

  const [customFooter, setCustomFooter] =
    useState("Thank you for dining with us!");

  /* =======================================================
     INVOICE HTML
  ======================================================= */

  const getInvoiceHtml = (
    order: OrderRecord,
    method: string
  ) => `
    <div style="font-family:Arial,sans-serif;color:#2d1e15;background:#fff;padding:28px;max-width:820px;margin:0 auto;border:1px solid #e8ded6">

      <div style="text-align:center;border-bottom:2px solid #5a4436;padding-bottom:12px;margin-bottom:14px">
        <div style="font-size:24px;font-weight:800">
          ${customHotelName}
        </div>

        <div style="font-size:12px;color:#9a7324;font-weight:800;margin-top:3px">
          ${customGstin}
        </div>

        <div style="font-size:11px;color:#6b584c;margin-top:4px">
          ${customAddress}
        </div>

        <div style="font-size:11px;color:#6b584c;margin-top:2px">
          Phone: ${customPhone}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:15px">

        <div>
          <b>KOT No:</b> #${getKotDisplayNumber(order.kotNumber)}
        </div>

        <div>
          <b>Order ID:</b> ${order.id}
        </div>

        <div>
          <b>Date & Time:</b>
          ${
            order.createdAt
              ? new Date(order.createdAt).toLocaleString("en-IN")
              : "-"
          }
        </div>

        <div>
          <b>Order Type:</b>
          ${
            order.orderType === "DINE_IN"
              ? "Dine In (" + (order.table || "-") + ")"
              : "Takeaway"
          }
        </div>

        <div>
          <b>Payment Method:</b>
          ${method || order.paymentMethod || "Unpaid"}
        </div>

      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:15px">

        <thead>
          <tr style="border-top:2px solid #5a4436;border-bottom:2px solid #5a4436">

            <th style="text-align:left;padding:8px 5px">
              Item Description
            </th>

            <th style="text-align:center;padding:8px 5px">
              Qty
            </th>

            <th style="text-align:right;padding:8px 5px">
              Price
            </th>

            <th style="text-align:right;padding:8px 5px">
              Amount
            </th>

          </tr>
        </thead>

        <tbody>

          ${(order.items || [])
            .map(
              (item) => `
                <tr style="border-bottom:1px solid #f2ece6">

                  <td style="padding:7px 5px">
                    ${item.name}
                  </td>

                  <td style="text-align:center;padding:7px 5px">
                    ${item.quantity}
                  </td>

                  <td style="text-align:right;padding:7px 5px">
                    ₹${item.price.toFixed(2)}
                  </td>

                  <td style="text-align:right;padding:7px 5px">
                    ₹${item.amount.toFixed(2)}
                  </td>

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

      <div style="margin-left:auto;width:300px;font-size:12px">

        <div style="display:flex;justify-content:space-between;padding:5px 0">
          <span>Subtotal</span>
          <b>₹${(order.subtotal || 0).toFixed(2)}</b>
        </div>

        <div style="display:flex;justify-content:space-between;padding:5px 0">
          <span>Discount</span>
          <b>- ₹${(order.discount || 0).toFixed(2)}</b>
        </div>

        <div style="display:flex;justify-content:space-between;padding:5px 0">
          <span>GST / Tax</span>
          <b>₹${(order.gst || 0).toFixed(2)}</b>
        </div>

        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #5a4436;border-bottom:2px solid #5a4436;font-size:15px">

          <strong>Grand Total</strong>

          <strong>
            ₹${(order.total || 0).toFixed(2)}
          </strong>

        </div>

      </div>

      <div style="border-top:1px dashed #dcd0c4;margin-top:20px;padding-top:10px;text-align:center;font-size:11px;color:#6b584c">
        ${customFooter}
      </div>

    </div>
  `;

  /* =======================================================
     PRINT
  ======================================================= */

  const handlePrint = (
    order: OrderRecord,
    method: string
  ) => {
    const w = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!w) {
      dialogService.alert({
        type: "warning",
        title: "Print Blocked",
        message: "Please allow pop-ups to print the bill."
      });
      return;
    }

    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>
            Bill #${getKotDisplayNumber(order.kotNumber)}
          </title>

          <style>
            @page {
              size: A4;
              margin: 15mm;
            }

            body {
              margin: 0;
            }
          </style>
        </head>

        <body>
          ${getInvoiceHtml(order, method)}
        </body>
      </html>
    `);

    w.document.close();
    w.focus();

    setTimeout(() => {
      w.print();
    }, 350);
  };

  /* =======================================================
     DOWNLOAD PDF
  ======================================================= */

  const handleDownloadPDF = async (
    order: OrderRecord,
    method: string
  ) => {
    const el = document.getElementById(
      "bill-preview-box"
    );

    if (!el) {
      return;
    }

    try {
      const html2pdfModule = await import("html2pdf.js");

      const html2pdfFn = (
        html2pdfModule.default || html2pdfModule
      ) as any;

      await html2pdfFn()
        .set({
          margin: 8,
          filename: `KOT-${getKotDisplayNumber(
            order.kotNumber
          )}-Bill.pdf`,
          image: {
            type: "jpeg",
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error(err);
      dialogService.alert({
        type: "error",
        title: "Error",
        message: "Failed to download PDF."
      });
    }
  };

  /* =======================================================
     SHARE
  ======================================================= */

  const handleShare = (
    order: OrderRecord,
    method: string
  ) => {
    const text = `${customHotelName}
Bill for KOT #${getKotDisplayNumber(order.kotNumber)}
Total: ₹${order.total.toFixed(2)}
Payment: ${method}
Thank you!`;

    if (navigator.share) {
      navigator
        .share({
          title: `Bill KOT #${getKotDisplayNumber(
            order.kotNumber
          )}`,
          text,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      dialogService.alert({
        type: "success",
        title: "Copied",
        message: "Bill summary copied to clipboard!"
      });
    }
  };

  /* =======================================================
     RESET PAGINATION
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedDate]);

  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders = async () => {
    try {
      const backendOrders = await orderService.getOrders();
      if (backendOrders && backendOrders.length > 0) {
        const mappedOrders: OrderRecord[] = backendOrders.map((o: any) => ({
          id: o.id,
          kotNumber: `KOT-${o.id}`,
          orderType: o.tableId ? "DINE_IN" : "TAKEAWAY",
          table: o.tableName || (o.tableId ? `Table T${o.tableId}` : "Takeaway"),
          items: (o.items || []).map((it: any, idx: number) => ({
            id: it.id || idx + 1,
            name: it.name,
            quantity: it.quantity,
            price: it.unitPrice,
            amount: it.quantity * it.unitPrice,
          })),
          subtotal: Number(o.totalAmount || 0),
          discount: Number(o.discount || 0),
          gstRate: o.taxRate || 0,
          gst: Number(o.taxAmount || 0),
          total: Number(o.netAmount || o.totalAmount || 0),
          status: o.status || "ACTIVE",
          createdAt: o.createdAt || new Date().toISOString(),
        }));

        const pending = mappedOrders.filter(
          (o) => o.status !== "COMPLETED" && o.status !== "PAID"
        );
        const completed = mappedOrders.filter(
          (o) => o.status === "COMPLETED" || o.status === "PAID"
        );

        setActiveOrders(pending);
        setCompletedOrders(completed);
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch orders from backend", e);
      setActiveOrders([]);
      setCompletedOrders([]);
    }

    const pending: OrderRecord[] = [];
    const completed: OrderRecord[] = [];
    const sortByCreatedAt = (
      orders: OrderRecord[]
    ) =>
      [...orders].sort((a, b) => {
        const timeA = new Date(
          a.createdAt || 0
        ).getTime();

        const timeB = new Date(
          b.createdAt || 0
        ).getTime();

        return timeA - timeB;
      });

    const newPending = sortByCreatedAt(pending);

    /*
      For already completed history records that have a successful
      payment method, show their final payment status as PAID.
      Unpaid records can continue to show COMPLETED.
    */
    const newCompleted = sortByCreatedAt(
      completed.map((order) => {
        if (
          order.status === "COMPLETED" &&
          order.paymentMethod
        ) {
          return {
            ...order,
            status: "PAID",
          };
        }

        return order;
      })
    );

    localStorage.setItem(
      "pending_kots",
      JSON.stringify(newPending)
    );

    localStorage.setItem(
      "completed_kots",
      JSON.stringify(newCompleted)
    );

    setActiveOrders(newPending);
    setCompletedOrders(newCompleted);

    setSelectedOrder((currentSelected) => {
      if (!currentSelected) {
        return null;
      }

      const allOrders = [
        ...newPending,
        ...newCompleted,
      ];

      const updatedSelected = allOrders.find(
        (order) => order.id === currentSelected.id
      );

      return updatedSelected || null;
    });
  };

  /* =======================================================
     EFFECTS & LISTENERS
  ======================================================= */

  useEffect(() => {
    loadOrders();

    const handleKotCreated = () => {
      loadOrders();
    };

    const handleKotCompleted = () => {
      loadOrders();
    };

    const handleStorage = () => {
      loadOrders();
    };

    window.addEventListener(
      "kot-created",
      handleKotCreated
    );

    window.addEventListener(
      "kot-completed",
      handleKotCompleted
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "kot-created",
        handleKotCreated
      );

      window.removeEventListener(
        "kot-completed",
        handleKotCompleted
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  /* =======================================================
     DISPLAYED ORDERS
  ======================================================= */

  const displayedOrders = useMemo(() => {
    let list =
      activeTab === "ACTIVE"
        ? activeOrders
        : completedOrders;

    if (searchQuery.trim()) {
      const q = searchQuery
        .toLowerCase()
        .trim();

      list = list.filter((order) => {
        const kot = (
          order.kotNumber || ""
        ).toLowerCase();

        const idStr = String(
          order.id || ""
        ).toLowerCase();

        const tableStr = (
          order.table || ""
        ).toLowerCase();

        const typeStr = (
          order.orderType || ""
        ).toLowerCase();

        const hasItem = (
          order.items || []
        ).some((item) =>
          (item.name || "")
            .toLowerCase()
            .includes(q)
        );

        return (
          kot.includes(q) ||
          idStr.includes(q) ||
          tableStr.includes(q) ||
          typeStr.includes(q) ||
          hasItem
        );
      });
    }

    if (selectedDate) {
      list = list.filter((order) => {
        if (!order.createdAt) {
          return false;
        }

        const orderDate = new Date(
          order.createdAt
        )
          .toISOString()
          .split("T")[0];

        return orderDate === selectedDate;
      });
    }

    return list;
  }, [
    activeTab,
    activeOrders,
    completedOrders,
    searchQuery,
    selectedDate,
  ]);

  const itemsPerPage = 10;

  const totalPages = Math.ceil(
    displayedOrders.length / itemsPerPage
  );

  const renderedOrders = useMemo(() => {
    if (activeTab === "ACTIVE") {
      return displayedOrders;
    }

    const start =
      (currentPage - 1) * itemsPerPage;

    return displayedOrders.slice(
      start,
      start + itemsPerPage
    );
  }, [
    displayedOrders,
    activeTab,
    currentPage,
  ]);

  /* =======================================================
     DISCOUNT + GST
  ======================================================= */

  const updateOrderDiscountAndGst = (
    order: OrderRecord,
    discountType: "AMOUNT" | "PERCENTAGE",
    discountValue: number | "",
    gstRate: number | ""
  ) => {
    const subtotal = order.subtotal || 0;

    const dVal =
      discountValue === ""
        ? 0
        : Math.max(Number(discountValue), 0);

    let discountAmount = 0;

    if (discountType === "AMOUNT") {
      discountAmount = Math.min(
        dVal,
        subtotal
      );
    } else {
      discountAmount = Math.min(
        (subtotal * dVal) / 100,
        subtotal
      );
    }

    const taxable = Math.max(
      subtotal - discountAmount,
      0
    );

    const gRate =
      gstRate === ""
        ? 0
        : Math.max(Number(gstRate), 0);

    const gstAmount =
      (taxable * gRate) / 100;

    const total =
      taxable + gstAmount;

    const updated: OrderRecord = {
      ...order,

      discountType,

      /*
        Keep the actual input blank if
        the user cleared the field.
      */
      discountValue,

      discount: discountAmount,

      gstRate,

      gst: gstAmount,

      total,
    };

    setSelectedOrder(updated);

    const currentActive =
      getOrders("pending_kots");

    const updatedActive =
      currentActive.map((item) =>
        item.id === order.id
          ? updated
          : item
      );

    localStorage.setItem(
      "pending_kots",
      JSON.stringify(updatedActive)
    );

    setActiveOrders(updatedActive);
  };

  /* =======================================================
     PAYMENT
  ======================================================= */

  const handleSelectPaymentMethod = (
    method:
      | "UPI"
      | "CASH"
      | "CARD"
      | "BANK_TRANSFER"
  ) => {
    setSelectedPaymentMethod(method);

    if (!selectedOrder) {
      return;
    }

    /*
      IMPORTANT:
      Payment changes status to PAID only.
      It does NOT complete the order.
    */

    const updated: OrderRecord = {
      ...selectedOrder,

      paymentMethod: method,

      status: "PAID",
    };

    try {
      orderService.updateOrderStatus(selectedOrder.id, "PAID").catch(() => {});
    } catch (e) {}

    setSelectedOrder(updated);

    const currentActive =
      getOrders("pending_kots");

    const updatedActive =
      currentActive.map((item) =>
        item.id === selectedOrder.id
          ? updated
          : item
      );

    localStorage.setItem(
      "pending_kots",
      JSON.stringify(updatedActive)
    );

    setActiveOrders(updatedActive);

    setShowPaymentModal(false);

    setShowBillPreview(true);
  };

  /* =======================================================
     WHATSAPP
  ======================================================= */

  const handleWhatsAppShare = (
    order: OrderRecord,
    method: string
  ) => {
    const text = encodeURIComponent(
      `*${customHotelName}*
Bill for KOT #${getKotDisplayNumber(
        order.kotNumber
      )}
Order ID: ${order.id}
Type: ${
        order.orderType === "DINE_IN"
          ? "Dine In (" +
            (order.table || "-") +
            ")"
          : "Takeaway"
      }

Items:
` +
        (order.items || [])
          .map(
            (i) =>
              `• ${i.name} x ${i.quantity} = ₹${i.amount.toFixed(
                2
              )}`
          )
          .join("\n") +
        `

Subtotal: ₹${order.subtotal.toFixed(2)}
Discount: -₹${order.discount.toFixed(2)}
GST${
          order.gstRate !== ""
            ? ` (${order.gstRate || 0}%)`
            : ""
        }: ₹${order.gst.toFixed(2)}
*Grand Total: ₹${order.total.toFixed(2)}*
Payment Method: ${
          method ||
          order.paymentMethod ||
          "Unpaid"
        }

${customFooter}`
    );

    window.open(
      `https://api.whatsapp.com/send?text=${text}`,
      "_blank"
    );
  };

  /* =======================================================
     MARK COMPLETE
  ======================================================= */

  const markComplete = (
    order: OrderRecord
  ) => {
    try {
      try {
        orderService.updateOrderStatus(order.id, "COMPLETED").catch(() => {});
      } catch (e) {}

      /*
        Only this function moves the order
        from Active -> Completed.
      */

      const currentActive =
        getOrders("pending_kots");

      const updatedActive =
        currentActive.filter(
          (item) => item.id !== order.id
        );

      localStorage.setItem(
        "pending_kots",
        JSON.stringify(updatedActive)
      );

      const currentCompleted =
        getOrders("completed_kots");

      /*
        Preserve PAID after successful payment.

        Moving an order to Completed History should not overwrite
        its payment status. Unpaid orders can still remain COMPLETED.
      */
      const completedOrder: OrderRecord = {
        ...order,
        status:
          order.status === "PAID" ||
          Boolean(order.paymentMethod)
            ? "PAID"
            : "COMPLETED",
      };

      const updatedCompleted = [
        completedOrder,
        ...currentCompleted.filter(
          (item) => item.id !== order.id
        ),
      ];

      localStorage.setItem(
        "completed_kots",
        JSON.stringify(updatedCompleted)
      );

      setActiveOrders(updatedActive);

      setCompletedOrders(
        updatedCompleted
      );

      setSelectedOrder(null);

      window.dispatchEvent(
        new CustomEvent("kot-completed", {
          detail: completedOrder,
        })
      );
    } catch (error) {
      console.error(
        "Error marking order complete:",
        error
      );
    }
  };

  /* =======================================================
     CLOSE DETAILS
  ======================================================= */

  const closeDetails = () => {
    setSelectedOrder(null);
  };

  /* =======================================================
     OPEN BILL PREVIEW
  ======================================================= */

  const openBillPreview = (
    order: OrderRecord
  ) => {
    setSelectedPaymentMethod(
      (order.paymentMethod as
        | "UPI"
        | "CASH"
        | "CARD"
        | "BANK_TRANSFER") || "UPI"
    );

    setShowBillPreview(true);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fefaf6",
        color: "#2d1e15",
        fontFamily:
          "Inter, Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          padding: "24px 32px",
          borderBottom:
            "1px solid #e8ded6",
          background: "#ffffff",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 800,
              color: "#2d1e15",
            }}
          >
            Order & KOT Records
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#6b584c",
            }}
          >
            Kitchen Order Tickets sent from
            New Order module
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#f7f1ec",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#5a4436",
              border:
                "1px solid #e8ded6",
            }}
          >
            Active KOTs:{" "}
            {activeOrders.length}
          </div>

          <div
            style={{
              background: "#f7f1ec",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#5a4436",
              border:
                "1px solid #e8ded6",
            }}
          >
            Completed:{" "}
            {completedOrders.length}
          </div>
        </div>
      </div>

      {/* =================================================
          MAIN LAYOUT
      ================================================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedOrder
            ? "minmax(0, 1fr) 440px"
            : "1fr",
          minHeight:
            "calc(100vh - 101px)",
          background: "#fefaf6",
          transition:
            "all 0.2s ease",
        }}
      >
        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div
          style={{
            borderRight: selectedOrder
              ? "1px solid #e8ded6"
              : "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* =================================================
              TABS + SEARCH
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "16px 24px",
              borderBottom:
                "1px solid #e8ded6",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              {/* ACTIVE */}

              <button
                onClick={() =>
                  setActiveTab("ACTIVE")
                }
                style={{
                  border:
                    activeTab === "ACTIVE"
                      ? "1px solid #d4ad65"
                      : "1px solid #e8ded6",
                  background:
                    activeTab === "ACTIVE"
                      ? "#fbf3e4"
                      : "#ffffff",
                  color:
                    activeTab === "ACTIVE"
                      ? "#7c5a1a"
                      : "#6b584c",
                  padding:
                    "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow:
                    activeTab === "ACTIVE"
                      ? "0 1px 3px rgba(0,0,0,0.05)"
                      : "none",
                }}
              >
                <Utensils size={15} />

                Active Orders (KOT)

                <span
                  style={{
                    background:
                      activeTab === "ACTIVE"
                        ? "#d4ad65"
                        : "#e8ded6",
                    color:
                      activeTab === "ACTIVE"
                        ? "#2d1e15"
                        : "#5a4436",
                    borderRadius:
                      "12px",
                    padding:
                      "2px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {activeOrders.length}
                </span>
              </button>

              {/* COMPLETED */}

              <button
                onClick={() =>
                  setActiveTab(
                    "COMPLETED"
                  )
                }
                style={{
                  border:
                    activeTab ===
                    "COMPLETED"
                      ? "1px solid #d4ad65"
                      : "1px solid #e8ded6",
                  background:
                    activeTab ===
                    "COMPLETED"
                      ? "#fbf3e4"
                      : "#ffffff",
                  color:
                    activeTab ===
                    "COMPLETED"
                      ? "#7c5a1a"
                      : "#6b584c",
                  padding:
                    "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow:
                    activeTab ===
                    "COMPLETED"
                      ? "0 1px 3px rgba(0,0,0,0.05)"
                      : "none",
                }}
              >
                <CheckCircle2
                  size={15}
                />

                Completed History

                <span
                  style={{
                    background:
                      activeTab ===
                      "COMPLETED"
                        ? "#d4ad65"
                        : "#e8ded6",
                    color:
                      activeTab ===
                      "COMPLETED"
                        ? "#2d1e15"
                        : "#5a4436",
                    borderRadius:
                      "12px",
                    padding:
                      "2px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {completedOrders.length}
                </span>
              </button>
            </div>

            {/* SEARCH + DATE */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems:
                  "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  position:
                    "relative",
                  display: "flex",
                  alignItems:
                    "center",
                }}
              >
                <Search
                  size={15}
                  style={{
                    position:
                      "absolute",
                    left: "12px",
                    color: "#8c786a",
                  }}
                />

                <input
                  type="text"
                  placeholder="Search KOT, ID, item, table..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  style={{
                    padding:
                      "9px 14px 9px 36px",
                    borderRadius: "8px",
                    border:
                      "1px solid #e8ded6",
                    background:
                      "#fefaf6",
                    color:
                      "#2d1e15",
                    fontSize:
                      "13px",
                    outline: "none",
                    width: "240px",
                  }}
                />

                {searchQuery && (
                  <button
                    onClick={() =>
                      setSearchQuery(
                        ""
                      )
                    }
                    style={{
                      position:
                        "absolute",
                      right: "10px",
                      background:
                        "none",
                      border: "none",
                      cursor:
                        "pointer",
                      color:
                        "#8c786a",
                      display:
                        "flex",
                      alignItems:
                        "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div
                style={{
                  position:
                    "relative",
                  display: "flex",
                  alignItems:
                    "center",
                }}
              >
                <Calendar
                  size={15}
                  style={{
                    position:
                      "absolute",
                    left: "12px",
                    color:
                      "#8c786a",
                    pointerEvents:
                      "none",
                  }}
                />

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                  style={{
                    padding:
                      "9px 14px 9px 36px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #e8ded6",
                    background:
                      "#fefaf6",
                    color:
                      "#2d1e15",
                    fontSize:
                      "13px",
                    outline: "none",
                  }}
                />

                {selectedDate && (
                  <button
                    onClick={() =>
                      setSelectedDate(
                        ""
                      )
                    }
                    title="Clear date filter"
                    style={{
                      marginLeft:
                        "6px",
                      background:
                        "#f7f1ec",
                      border:
                        "1px solid #e8ded6",
                      borderRadius:
                        "6px",
                      padding:
                        "7px 10px",
                      fontSize:
                        "11px",
                      fontWeight: 700,
                      color:
                        "#6b584c",
                      cursor:
                        "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* =================================================
              LIST
          ================================================= */}

          <div
            style={{
              padding: "24px",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {displayedOrders.length ===
            0 ? (
              <div
                style={{
                  padding:
                    "80px 20px",
                  textAlign:
                    "center",
                  color:
                    "#8c786a",
                }}
              >
                <ShoppingBag
                  size={48}
                  style={{
                    opacity: 0.3,
                    marginBottom:
                      "14px",
                    color:
                      "#6b584c",
                  }}
                />

                <div
                  style={{
                    fontSize:
                      "16px",
                    fontWeight: 700,
                    color:
                      "#4a382d",
                  }}
                >
                  No{" "}
                  {activeTab.toLowerCase()}{" "}
                  orders found
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",
                    fontSize:
                      "13px",
                    color:
                      "#8c786a",
                  }}
                >
                  {searchQuery ||
                  selectedDate
                    ? "Try adjusting your search query or date filter."
                    : activeTab ===
                      "ACTIVE"
                    ? "Orders sent from New Order using 'Send to KOT' will appear here."
                    : "Completed orders will appear here once marked as complete."}
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background:
                      "#ffffff",
                    border:
                      "1px solid #e8ded6",
                    borderRadius:
                      "12px",
                    overflowX:
                      "auto",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* TABLE HEADER */}

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(8, minmax(0, 1fr))",
                      gap: "0",
                      padding:
                        "14px 18px",
                      background:
                        "#f9f5f0",
                      borderBottom:
                        "1px solid #e8ded6",
                      fontSize:
                        "12px",
                      fontWeight: 800,
                      color:
                        "#5a4436",
                      alignItems:
                        "center",
                      width: "100%",
                      minWidth:
                        "1080px",
                    }}
                  >
                    <span>KOT #</span>
                    <span>Order ID</span>
                    <span>Date & Time</span>
                    <span>
                      Type / Location
                    </span>
                    <span>Items</span>
                    <span>Payment</span>
                    <span
                      style={{
                        textAlign: "center",
                        justifySelf: "stretch",
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        textAlign: "center",
                        justifySelf: "stretch",
                      }}
                    >
                      Status
                    </span>
                  </div>

                  {/* TABLE ROWS */}

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      width: "100%",
                      minWidth:
                        "1080px",
                    }}
                  >
                    {renderedOrders.map(
                      (order) => {
                        const isSelected =
                          selectedOrder?.id ===
                          order.id;

                        const formattedDate =
                          order.createdAt
                            ? new Date(
                                order.createdAt
                              ).toLocaleString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                  hour12:
                                    true,
                                }
                              )
                            : "-";

                        return (
                          <div
                            key={`${order.id}-${order.kotNumber}`}
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(8, minmax(0, 1fr))",
                              gap: "0",
                              padding:
                                "16px 18px",
                              borderBottom:
                                "1px solid #f2ece6",
                              alignItems:
                                "center",
                              cursor:
                                "pointer",
                              background:
                                isSelected
                                  ? "#fbf3e4"
                                  : "#ffffff",
                              transition:
                                "background 0.15s ease",
                            }}
                          >
                            {/* KOT */}

                            <div
                              style={{
                                color:
                                  "#9a7324",
                                fontWeight:
                                  800,
                                fontSize:
                                  "14px",
                              }}
                            >
                              #
                              {getKotDisplayNumber(
                                order.kotNumber
                              )}
                            </div>

                            {/* ID */}

                            <div
                              style={{
                                color:
                                  "#6b584c",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  600,
                              }}
                            >
                              {order.id}
                            </div>

                            {/* DATE */}

                            <div
                              style={{
                                color:
                                  "#6b584c",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  600,
                              }}
                            >
                              {formattedDate}
                            </div>

                            {/* TYPE */}

                            <div>
                              <div
                                style={{
                                  color:
                                    "#2d1e15",
                                  fontSize:
                                    "13px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {order.orderType ===
                                "DINE_IN"
                                  ? "Dine In"
                                  : "Takeaway"}
                              </div>

                              <div
                                style={{
                                  color:
                                    "#8c786a",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {order.table ||
                                  "-"}
                              </div>
                            </div>

                            {/* ITEMS */}

                            <div
                              style={{
                                color:
                                  "#6b584c",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  600,
                              }}
                            >
                              {order.items
                                ?.length ||
                                0}{" "}
                              item(s)
                            </div>

                            {/* PAYMENT */}

                            <div
                              style={{
                                color:
                                  "#6b584c",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  700,
                              }}
                            >
                              {order.paymentMethod
                                ? order.paymentMethod ===
                                  "BANK_TRANSFER"
                                  ? "Bank Trf"
                                  : order.paymentMethod
                                : "-"}
                            </div>

                            {/* TOTAL */}

                            <div
                              style={{
                                textAlign: "center",
                                justifySelf: "stretch",
                                color:
                                  "#2d1e15",
                                fontSize:
                                  "14px",
                                fontWeight:
                                  800,
                              }}
                            >
                              {formatMoney(
                                order.total
                              )}
                            </div>

                            {/* STATUS */}

                            <div
                              style={{
                                textAlign: "center",
                                justifySelf: "stretch",
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "4px 8px",
                                  borderRadius:
                                    "6px",

                                  background:
                                    order.status ===
                                    "COMPLETED"
                                      ? "#eef6f2"
                                      : order.status ===
                                        "PAID"
                                      ? "#eef2ff"
                                      : "#fbf3e4",

                                  color:
                                    order.status ===
                                    "COMPLETED"
                                      ? "#2f7c56"
                                      : order.status ===
                                        "PAID"
                                      ? "#4f46a5"
                                      : "#8c6517",

                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    700,

                                  border:
                                    order.status ===
                                    "COMPLETED"
                                      ? "1px solid #cce5d8"
                                      : order.status ===
                                        "PAID"
                                      ? "1px solid #d7d8ff"
                                      : "1px solid #f2dfbd",
                                }}
                              >
                                {getStatusLabel(
                                  order.status
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* PAGINATION */}

                {activeTab ===
                  "COMPLETED" &&
                  displayedOrders.length >
                    0 && (
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginTop:
                          "16px",
                        padding:
                          "12px 16px",
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e8ded6",
                        borderRadius:
                          "10px",
                        flexWrap:
                          "wrap",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            "13px",
                          color:
                            "#6b584c",
                          fontWeight:
                            600,
                        }}
                      >
                        Showing{" "}
                        {Math.min(
                          (currentPage -
                            1) *
                            itemsPerPage +
                            1,
                          displayedOrders.length
                        )}{" "}
                        to{" "}
                        {Math.min(
                          currentPage *
                            itemsPerPage,
                          displayedOrders.length
                        )}{" "}
                        of{" "}
                        {
                          displayedOrders.length
                        }{" "}
                        entries
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            setCurrentPage(
                              (p) =>
                                Math.max(
                                  p - 1,
                                  1
                                )
                            )
                          }
                          disabled={
                            currentPage ===
                            1
                          }
                          style={{
                            padding:
                              "6px 12px",
                            borderRadius:
                              "6px",
                            border:
                              "1px solid #e8ded6",
                            background:
                              currentPage ===
                              1
                                ? "#f9f5f0"
                                : "#ffffff",
                            color:
                              currentPage ===
                              1
                                ? "#b8a99f"
                                : "#2d1e15",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                            cursor:
                              currentPage ===
                              1
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Previous
                        </button>

                        <span
                          style={{
                            fontSize:
                              "13px",
                            fontWeight:
                              700,
                            color:
                              "#5a4436",
                            padding:
                              "0 6px",
                          }}
                        >
                          Page{" "}
                          {
                            currentPage
                          }{" "}
                          of{" "}
                          {totalPages ||
                            1}
                        </span>

                        <button
                          onClick={() =>
                            setCurrentPage(
                              (p) =>
                                Math.min(
                                  p + 1,
                                  totalPages
                                )
                            )
                          }
                          disabled={
                            currentPage >=
                              totalPages ||
                            totalPages ===
                              0
                          }
                          style={{
                            padding:
                              "6px 12px",
                            borderRadius:
                              "6px",
                            border:
                              "1px solid #e8ded6",
                            background:
                              currentPage >=
                                  totalPages ||
                              totalPages ===
                                0
                                ? "#f9f5f0"
                                : "#ffffff",
                            color:
                              currentPage >=
                                  totalPages ||
                              totalPages ===
                                0
                                ? "#b8a99f"
                                : "#2d1e15",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                            cursor:
                              currentPage >=
                                  totalPages ||
                              totalPages ===
                                0
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {/* =================================================
            RIGHT SIDE - DETAILS
        ================================================= */}

        {selectedOrder && (
          <div
            style={{
              background:
                "#ffffff",
              borderLeft:
                "1px solid #e8ded6",
              display: "flex",
              flexDirection:
                "column",
              height:
                "calc(100vh - 101px)",
              position:
                "sticky",
              top: "101px",
            }}
          >
            {/* PANEL HEADER */}

            <div
              style={{
                padding:
                  "20px 24px",
                borderBottom:
                  "1px solid #e8ded6",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                background:
                  "#fefaf6",
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "#9a7324",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                    letterSpacing:
                      "0.5px",
                  }}
                >
                  ORDER DETAILS
                </div>

                <h2
                  style={{
                    margin:
                      "4px 0 0",
                    fontSize:
                      "20px",
                    fontWeight:
                      800,
                    color:
                      "#2d1e15",
                  }}
                >
                  KOT #
                  {getKotDisplayNumber(
                    selectedOrder.kotNumber
                  )}
                </h2>
              </div>

              <button
                onClick={
                  closeDetails
                }
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius:
                    "50%",
                  border:
                    "1px solid #e8ded6",
                  background:
                    "#ffffff",
                  color:
                    "#6b584c",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* META */}

            <div
              style={{
                padding:
                  "16px 24px",
                borderBottom:
                  "1px solid #e8ded6",
                background:
                  "#f9f5f0",
                fontSize:
                  "13px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "8px",
                }}
              >
                <span
                  style={{
                    color:
                      "#6b584c",
                  }}
                >
                  Order ID
                </span>

                <strong
                  style={{
                    color:
                      "#2d1e15",
                  }}
                >
                  {selectedOrder.id}
                </strong>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "8px",
                }}
              >
                <span
                  style={{
                    color:
                      "#6b584c",
                  }}
                >
                  Order Type
                </span>

                <strong
                  style={{
                    color:
                      "#2d1e15",
                  }}
                >
                  {selectedOrder.orderType ===
                  "DINE_IN"
                    ? "Dine In"
                    : "Takeaway"}
                </strong>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "8px",
                }}
              >
                <span
                  style={{
                    color:
                      "#6b584c",
                  }}
                >
                  Table / Location
                </span>

                <strong
                  style={{
                    color:
                      "#2d1e15",
                  }}
                >
                  {selectedOrder.table ||
                    "-"}
                </strong>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "8px",
                }}
              >
                <span
                  style={{
                    color:
                      "#6b584c",
                  }}
                >
                  Status
                </span>

                <strong
                  style={{
                    color:
                      selectedOrder.status ===
                      "COMPLETED"
                        ? "#2f7c56"
                        : selectedOrder.status ===
                          "PAID"
                        ? "#4f46a5"
                        : "#b8860b",
                  }}
                >
                  {getStatusLabel(
                    selectedOrder.status
                  )}
                </strong>
              </div>

              {selectedOrder.paymentMethod && (
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginBottom:
                      "8px",
                  }}
                >
                  <span
                    style={{
                      color:
                        "#6b584c",
                    }}
                  >
                    Payment Method
                  </span>

                  <strong
                    style={{
                      color:
                        "#2d1e15",
                    }}
                  >
                    {selectedOrder.paymentMethod ===
                    "BANK_TRANSFER"
                      ? "Bank Transfer"
                      : selectedOrder.paymentMethod}
                  </strong>
                </div>
              )}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span
                  style={{
                    color:
                      "#6b584c",
                  }}
                >
                  Order Time
                </span>

                <strong
                  style={{
                    color:
                      "#2d1e15",
                  }}
                >
                  {selectedOrder.createdAt
                    ? new Date(
                        selectedOrder.createdAt
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "-"}
                </strong>
              </div>
            </div>

            {/* ITEMS */}

            <div
              style={{
                padding:
                  "20px 24px",
                flex: 1,
                overflowY:
                  "auto",
              }}
            >
              <div
                style={{
                  color:
                    "#5a4436",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "0.5px",
                  marginBottom:
                    "12px",
                  textTransform:
                    "uppercase",
                }}
              >
                Ordered Items (
                {selectedOrder.items
                  ?.length || 0}
                )
              </div>

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "10px",
                }}
              >
                {(selectedOrder.items ||
                  []).map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.id}-${index}`}
                      style={{
                        padding:
                          "12px",
                        background:
                          "#fefaf6",
                        border:
                          "1px solid #e8ded6",
                        borderRadius:
                          "8px",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color:
                              "#2d1e15",
                            fontSize:
                              "13px",
                            fontWeight:
                              700,
                          }}
                        >
                          {item.name}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "2px",
                            color:
                              "#6b584c",
                            fontSize:
                              "11px",
                          }}
                        >
                          Qty:{" "}
                          {
                            item.quantity
                          }{" "}
                          ×{" "}
                          {formatMoney(
                            item.price
                          )}
                        </div>
                      </div>

                      <strong
                        style={{
                          color:
                            "#2d1e15",
                          fontSize:
                            "13px",
                          fontWeight:
                            800,
                        }}
                      >
                        {formatMoney(
                          item.amount
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>

              {/* =================================================
                  BILL SUMMARY
              ================================================= */}

              <div
                style={{
                  marginTop:
                    "24px",
                  background:
                    "#f9f5f0",
                  borderRadius:
                    "10px",
                  padding:
                    "16px",
                  border:
                    "1px solid #e8ded6",
                }}
              >
                {/* SUBTOTAL */}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginBottom:
                      "10px",
                    fontSize:
                      "12px",
                    color:
                      "#6b584c",
                  }}
                >
                  <span>
                    Subtotal
                  </span>

                  <strong
                    style={{
                      color:
                        "#2d1e15",
                    }}
                  >
                    {formatMoney(
                      selectedOrder.subtotal
                    )}
                  </strong>
                </div>

                {/* =================================================
                    DISCOUNT
                ================================================= */}

                <div
                  style={{
                    marginBottom:
                      "12px",
                    paddingBottom:
                      "10px",
                    borderBottom:
                      "1px dashed #e8ded6",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      marginBottom:
                        "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#6b584c",
                      }}
                    >
                      Discount
                    </span>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: "4px",
                      }}
                    >
                      <button
                        onClick={() =>
                          updateOrderDiscountAndGst(
                            selectedOrder,
                            "AMOUNT",
                            selectedOrder.discountValue ??
                              "",
                            selectedOrder.gstRate ??
                              ""
                          )
                        }
                        style={{
                          padding:
                            "3px 8px",
                          fontSize:
                            "10px",
                          fontWeight:
                            700,
                          borderRadius:
                            "4px",
                          border:
                            "1px solid #dcd0c4",
                          background:
                            (selectedOrder.discountType ||
                              "AMOUNT") ===
                            "AMOUNT"
                              ? "#17143b"
                              : "#fff",
                          color:
                            (selectedOrder.discountType ||
                              "AMOUNT") ===
                            "AMOUNT"
                              ? "#fff"
                              : "#6b584c",
                          cursor:
                            "pointer",
                        }}
                      >
                        ₹ Fixed
                      </button>

                      <button
                        onClick={() =>
                          updateOrderDiscountAndGst(
                            selectedOrder,
                            "PERCENTAGE",
                            selectedOrder.discountValue ??
                              "",
                            selectedOrder.gstRate ??
                              ""
                          )
                        }
                        style={{
                          padding:
                            "3px 8px",
                          fontSize:
                            "10px",
                          fontWeight:
                            700,
                          borderRadius:
                            "4px",
                          border:
                            "1px solid #dcd0c4",
                          background:
                            selectedOrder.discountType ===
                            "PERCENTAGE"
                              ? "#17143b"
                              : "#fff",
                          color:
                            selectedOrder.discountType ===
                            "PERCENTAGE"
                              ? "#fff"
                              : "#6b584c",
                          cursor:
                            "pointer",
                        }}
                      >
                        % Perc
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        selectedOrder.discountValue ??
                        ""
                      }
                      onChange={(e) => {
                        const raw =
                          e.target
                            .value;

                        const val =
                          raw === ""
                            ? ""
                            : Math.max(
                                Number(
                                  raw
                                ),
                                0
                              );

                        updateOrderDiscountAndGst(
                          selectedOrder,
                          selectedOrder.discountType ||
                            "AMOUNT",
                          val,
                          selectedOrder.gstRate ??
                            ""
                        );
                      }}
                      placeholder={
                        selectedOrder.discountType ===
                        "PERCENTAGE"
                          ? "e.g. 10%"
                          : "e.g. 100"
                      }
                      style={{
                        flex: 1,
                        padding:
                          "6px 10px",
                        borderRadius:
                          "6px",
                        border:
                          "1px solid #dcd0c4",
                        fontSize:
                          "12px",
                        background:
                          "#ffffff",
                        fontWeight:
                          700,
                        outline:
                          "none",
                      }}
                    />

                    <span
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#b87968",
                      }}
                    >
                      -{" "}
                      {formatMoney(
                        selectedOrder.discount ||
                          0
                      )}
                    </span>
                  </div>
                </div>

                {/* =================================================
                    GST
                ================================================= */}

                <div
                  style={{
                    marginBottom:
                      "12px",
                    paddingBottom:
                      "10px",
                    borderBottom:
                      "1px dashed #e8ded6",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      marginBottom:
                        "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#6b584c",
                      }}
                    >
                      GST Rate (%)
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        selectedOrder.gstRate ??
                        ""
                      }
                      onChange={(e) => {
                        const raw =
                          e.target
                            .value;

                        const val =
                          raw === ""
                            ? ""
                            : Math.max(
                                Number(
                                  raw
                                ),
                                0
                              );

                        updateOrderDiscountAndGst(
                          selectedOrder,
                          selectedOrder.discountType ||
                            "AMOUNT",
                          selectedOrder.discountValue ??
                            "",
                          val
                        );
                      }}
                      placeholder="e.g. 5"
                      style={{
                        flex: 1,
                        padding:
                          "6px 10px",
                        borderRadius:
                          "6px",
                        border:
                          "1px solid #dcd0c4",
                        fontSize:
                          "12px",
                        background:
                          "#ffffff",
                        fontWeight:
                          700,
                        outline:
                          "none",
                      }}
                    />

                    <span
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#2d1e15",
                      }}
                    >
                      {formatMoney(
                        selectedOrder.gst ||
                          0
                      )}
                    </span>
                  </div>
                </div>

                {/* GRAND TOTAL */}

                <div
                  style={{
                    borderTop:
                      "1px solid #dcd0c4",
                    paddingTop:
                      "12px",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#2d1e15",
                      fontSize:
                        "14px",
                    }}
                  >
                    Grand Total
                  </strong>

                  <strong
                    style={{
                      color:
                        "#b8860b",
                      fontSize:
                        "18px",
                      fontWeight:
                        800,
                    }}
                  >
                    {formatMoney(
                      selectedOrder.total
                    )}
                  </strong>
                </div>
              </div>
            </div>

            {/* =================================================
                ACTION FOOTER
            ================================================= */}

            {selectedOrder.status ===
            "COMPLETED" ? (
              <div
                style={{
                  borderTop:
                    "1px solid #e8ded6",
                  padding:
                    "16px 24px",
                  background:
                    "#eef6f2",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: "8px",
                  color:
                    "#2f7c56",
                  fontSize:
                    "13px",
                  fontWeight:
                    700,
                }}
              >
                <CheckCircle2
                  size={16}
                />

                Order Completed Successfully
              </div>
            ) : selectedOrder.status ===
              "PAID" ? (
              <div
                style={{
                  borderTop:
                    "1px solid #e8ded6",
                  padding:
                    "16px 24px",
                  background:
                    "#fefaf6",
                  display:
                    "flex",
                  gap: "10px",
                }}
              >
                <button
                  onClick={
                    closeDetails
                  }
                  style={{
                    flex: 1,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #dcd0c4",
                    background:
                      "#ffffff",
                    color:
                      "#6b584c",
                    fontWeight:
                      700,
                    fontSize:
                      "13px",
                    cursor:
                      "pointer",
                  }}
                >
                  Close
                </button>

                <button
                  onClick={() =>
                    openBillPreview(
                      selectedOrder
                    )
                  }
                  style={{
                    flex: 1.2,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #17143b",
                    background:
                      "#ffffff",
                    color:
                      "#17143b",
                    fontWeight:
                      800,
                    fontSize:
                      "13px",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                    gap: "7px",
                  }}
                >
                  <FileText
                    size={16}
                  />

                  View Bill
                </button>

                <button
                  onClick={() =>
                    markComplete(
                      selectedOrder
                    )
                  }
                  style={{
                    flex: 1.4,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "none",
                    background:
                      "#2f7c56",
                    color:
                      "#ffffff",
                    fontWeight:
                      800,
                    fontSize:
                      "13px",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                    gap: "7px",
                  }}
                >
                  <CheckCircle2
                    size={16}
                  />

                  Mark Complete
                </button>
              </div>
            ) : (
              <div
                style={{
                  borderTop:
                    "1px solid #e8ded6",
                  padding:
                    "16px 24px",
                  background:
                    "#fefaf6",
                  display:
                    "flex",
                    gap: "12px",
                }}
              >
                <button
                  onClick={
                    closeDetails
                  }
                  style={{
                    flex: 1,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #dcd0c4",
                    background:
                      "#ffffff",
                    color:
                      "#6b584c",
                    fontWeight:
                      700,
                    fontSize:
                      "13px",
                    cursor:
                      "pointer",
                  }}
                >
                  Close
                </button>

                <button
                  onClick={() =>
                    setShowPaymentModal(
                      true
                    )
                  }
                  style={{
                    flex: 1.5,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "none",
                    background:
                      "#17143b",
                    color:
                      "#ffffff",
                    fontWeight:
                      800,
                    fontSize:
                      "13px",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                    gap: "8px",
                    boxShadow:
                      "0 2px 4px rgba(23, 20, 59, 0.3)",
                  }}
                >
                  <CreditCard
                    size={16}
                  />

                  Proceed to Payment
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================
            PAYMENT MODAL
        ================================================= */}

        {showPaymentModal &&
          selectedOrder && (
            <div
              style={{
                position:
                  "fixed",
                inset: 0,
                background:
                  "rgba(23,20,59,0.4)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "20px",
                zIndex: 1100,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth:
                    "480px",
                  background:
                    "#ffffff",
                  borderRadius:
                    "20px",
                  padding:
                    "24px",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginBottom:
                      "20px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize:
                          "20px",
                        color:
                          "#17143b",
                      }}
                    >
                      Select Payment Method
                    </h2>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color:
                          "#7b8498",
                        fontSize:
                          "12px",
                      }}
                    >
                      KOT #
                      {getKotDisplayNumber(
                        selectedOrder.kotNumber
                      )}{" "}
                      •{" "}
                      {formatMoney(
                        selectedOrder.total
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setShowPaymentModal(
                        false
                      )
                    }
                    style={{
                      width:
                        "32px",
                      height:
                        "32px",
                      borderRadius:
                        "50%",
                      border: "none",
                      background:
                        "#f5f2f0",
                      cursor:
                        "pointer",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* PAYMENT OPTIONS */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "10px",
                    marginBottom:
                      "20px",
                  }}
                >
                  {/* UPI */}

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "UPI"
                      )
                    }
                    style={{
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      border:
                        selectedPaymentMethod ===
                        "UPI"
                          ? "2px solid #b87968"
                          : "1px solid #e1dcd9",
                      background:
                        selectedPaymentMethod ===
                        "UPI"
                          ? "#f7eee9"
                          : "#ffffff",
                      color:
                        selectedPaymentMethod ===
                        "UPI"
                          ? "#8f594b"
                          : "#66718a",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                      cursor:
                        "pointer",
                      fontWeight:
                        800,
                    }}
                  >
                    <Smartphone
                      size={20}
                    />

                    UPI
                  </button>

                  {/* CASH */}

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "CASH"
                      )
                    }
                    style={{
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      border:
                        selectedPaymentMethod ===
                        "CASH"
                          ? "2px solid #b87968"
                          : "1px solid #e1dcd9",
                      background:
                        selectedPaymentMethod ===
                        "CASH"
                          ? "#f7eee9"
                          : "#ffffff",
                      color:
                        selectedPaymentMethod ===
                        "CASH"
                          ? "#8f594b"
                          : "#66718a",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                      cursor:
                        "pointer",
                      fontWeight:
                        800,
                    }}
                  >
                    <Banknote
                      size={20}
                    />

                    Cash
                  </button>

                  {/* CARD */}

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "CARD"
                      )
                    }
                    style={{
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      border:
                        selectedPaymentMethod ===
                        "CARD"
                          ? "2px solid #b87968"
                          : "1px solid #e1dcd9",
                      background:
                        selectedPaymentMethod ===
                        "CARD"
                          ? "#f7eee9"
                          : "#ffffff",
                      color:
                        selectedPaymentMethod ===
                        "CARD"
                          ? "#8f594b"
                          : "#66718a",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                      cursor:
                        "pointer",
                      fontWeight:
                        800,
                    }}
                  >
                    <CreditCard
                      size={20}
                    />

                    Card
                  </button>

                  {/* BANK */}

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "BANK_TRANSFER"
                      )
                    }
                    style={{
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      border:
                        selectedPaymentMethod ===
                        "BANK_TRANSFER"
                          ? "2px solid #b87968"
                          : "1px solid #e1dcd9",
                      background:
                        selectedPaymentMethod ===
                        "BANK_TRANSFER"
                          ? "#f7eee9"
                          : "#ffffff",
                      color:
                        selectedPaymentMethod ===
                        "BANK_TRANSFER"
                          ? "#8f594b"
                          : "#66718a",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                      cursor:
                        "pointer",
                      fontWeight:
                        800,
                    }}
                  >
                    <Building2
                      size={20}
                    />

                    Bank Transfer
                  </button>
                </div>

                <button
                  onClick={() =>
                    handleSelectPaymentMethod(
                      selectedPaymentMethod
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "14px",
                    borderRadius:
                      "10px",
                    border: "none",
                    background:
                      "#17143b",
                    color:
                      "#ffffff",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                    fontSize:
                      "14px",
                  }}
                >
                  Continue to Bill Preview
                </button>
              </div>
            </div>
          )}

        {/* =================================================
            BILL PREVIEW
        ================================================= */}

        {showBillPreview &&
          selectedOrder && (
            <div
              style={{
                position:
                  "fixed",
                inset: 0,
                background:
                  "rgba(23,20,59,0.45)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "20px",
                zIndex: 1200,
                overflowY:
                  "auto",
              }}
            >
              <div
                style={{
                  width:
                    "100%",
                  maxWidth:
                    "780px",
                  background:
                    "#ffffff",
                  borderRadius:
                    "20px",
                  padding:
                    "24px",
                  boxShadow:
                    "0 25px 60px rgba(0,0,0,0.25)",
                  maxHeight:
                    "90vh",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginBottom:
                      "16px",
                    paddingBottom:
                      "12px",
                    borderBottom:
                      "1px solid #e8ded6",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize:
                          "20px",
                        color:
                          "#17143b",
                      }}
                    >
                      Bill Preview & Actions
                    </h2>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color:
                          "#7b8498",
                        fontSize:
                          "12px",
                      }}
                    >
                      Review bill and complete order
                    </p>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                      alignItems:
                        "center",
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowBillPreview(
                          false
                        )
                      }
                      style={{
                        width:
                          "32px",
                        height:
                          "32px",
                        borderRadius:
                          "50%",
                        border:
                          "none",
                        background:
                          "#f5f2f0",
                        cursor:
                          "pointer",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* BILL */}

                <div
                  style={{
                    overflowY:
                      "auto",
                    flex: 1,
                    marginBottom:
                      "16px",
                    background:
                      "#fcf8f5",
                    padding:
                      "12px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <div
                    id="bill-preview-box"
                    dangerouslySetInnerHTML={{
                      __html:
                        getInvoiceHtml(
                          selectedOrder,
                          selectedOrder.paymentMethod ||
                            selectedPaymentMethod
                        ),
                    }}
                  />
                </div>

                {/* ACTION BUTTONS */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4, 1fr)",
                    gap: "10px",
                    marginBottom:
                      "16px",
                  }}
                >
                  <button
                    onClick={() =>
                      handleDownloadPDF(
                        selectedOrder,
                        selectedOrder.paymentMethod ||
                          selectedPaymentMethod
                      )
                    }
                    style={{
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      background:
                        "#ffffff",
                      color:
                        "#2d1e15",
                      fontWeight:
                        700,
                      fontSize:
                        "12px",
                      cursor:
                        "pointer",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "6px",
                    }}
                  >
                    <Download
                      size={15}
                    />

                    Download PDF
                  </button>

                  <button
                    onClick={() =>
                      handleWhatsAppShare(
                        selectedOrder,
                        selectedOrder.paymentMethod ||
                          selectedPaymentMethod
                      )
                    }
                    style={{
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      background:
                        "#ffffff",
                      color:
                        "#2d1e15",
                      fontWeight:
                        700,
                      fontSize:
                        "12px",
                      cursor:
                        "pointer",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "6px",
                    }}
                  >
                    <Share2
                      size={15}
                    />

                    Share WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      handlePrint(
                        selectedOrder,
                        selectedOrder.paymentMethod ||
                          selectedPaymentMethod
                      )
                    }
                    style={{
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      background:
                        "#ffffff",
                      color:
                        "#2d1e15",
                      fontWeight:
                        700,
                      fontSize:
                        "12px",
                      cursor:
                        "pointer",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "6px",
                    }}
                  >
                    <Printer
                      size={15}
                    />

                    Print
                  </button>

                  {/* CUSTOMIZE */}

                  <button
                    onClick={() =>
                      setShowCustomizeModal(
                        true
                      )
                    }
                    style={{
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      background:
                        "#ffffff",
                      color:
                        "#2d1e15",
                      fontWeight:
                        700,
                      fontSize:
                        "12px",
                      cursor:
                        "pointer",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "6px",
                    }}
                  >
                    <Settings
                      size={15}
                    />

                    Customize
                  </button>
                </div>

                {/* MARK COMPLETE */}

                {selectedOrder.status !==
                  "COMPLETED" && (
                  <button
                    onClick={() => {
                      markComplete(
                        selectedOrder
                      );

                      setShowBillPreview(
                        false
                      );
                    }}
                    style={{
                      width:
                        "100%",
                      padding:
                        "14px",
                      borderRadius:
                        "10px",
                      border:
                        "none",
                      background:
                        "#2f7c56",
                      color:
                        "#ffffff",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                      fontSize:
                        "14px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "8px",
                      boxShadow:
                        "0 4px 12px rgba(47,124,86,0.3)",
                    }}
                  >
                    <CheckCircle2
                      size={18}
                    />

                    Mark Complete & Move to History
                  </button>
                )}
              </div>
            </div>
          )}

        {/* =================================================
            CUSTOMIZE MODAL
        ================================================= */}

        {showCustomizeModal && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              background:
                "rgba(23,20,59,0.4)",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "20px",
              zIndex: 1300,
            }}
          >
            <div
              style={{
                width:
                  "100%",
                maxWidth:
                  "450px",
                background:
                  "#ffffff",
                borderRadius:
                  "20px",
                padding:
                  "24px",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "18px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize:
                      "18px",
                    color:
                      "#17143b",
                  }}
                >
                  Customize Bill Header
                </h3>

                <button
                  onClick={() =>
                    setShowCustomizeModal(
                      false
                    )
                  }
                  style={{
                    width:
                      "30px",
                    height:
                      "30px",
                    borderRadius:
                      "50%",
                    border:
                      "none",
                    background:
                      "#f5f2f0",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "12px",
                  marginBottom:
                    "20px",
                }}
              >
                {/* RESTAURANT */}

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#6b584c",
                      display:
                        "block",
                      marginBottom:
                        "4px",
                    }}
                  >
                    Restaurant Name
                  </label>

                  <input
                    value={
                      customHotelName
                    }
                    onChange={(e) =>
                      setCustomHotelName(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      fontSize:
                        "13px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {/* GSTIN */}

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#6b584c",
                      display:
                        "block",
                      marginBottom:
                        "4px",
                    }}
                  >
                    GSTIN / Tax Label
                  </label>

                  <input
                    value={
                      customGstin
                    }
                    onChange={(e) =>
                      setCustomGstin(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      fontSize:
                        "13px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {/* ADDRESS */}

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#6b584c",
                      display:
                        "block",
                      marginBottom:
                        "4px",
                    }}
                  >
                    Address
                  </label>

                  <input
                    value={
                      customAddress
                    }
                    onChange={(e) =>
                      setCustomAddress(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      fontSize:
                        "13px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {/* PHONE */}

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#6b584c",
                      display:
                        "block",
                      marginBottom:
                        "4px",
                    }}
                  >
                    Phone
                  </label>

                  <input
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="10 digit mobile (starts with 6-9)"
                    value={
                      customPhone
                    }
                    onChange={(e) =>
                      setCustomPhone(
                        sanitizeMobileInput(e.target.value)
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      fontSize:
                        "13px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {/* FOOTER */}

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#6b584c",
                      display:
                        "block",
                      marginBottom:
                        "4px",
                    }}
                  >
                    Footer Note
                  </label>

                  <input
                    value={
                      customFooter
                    }
                    onChange={(e) =>
                      setCustomFooter(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #dcd0c4",
                      fontSize:
                        "13px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  setShowCustomizeModal(
                    false
                  )
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "12px",
                  borderRadius:
                    "8px",
                  border:
                    "none",
                  background:
                    "#17143b",
                  color:
                    "#ffffff",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;