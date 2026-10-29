import React, { useMemo, useState, useEffect } from "react";
import { cafeService } from "../services/cafeService";
import { orderService } from "../services/orderService";
import { sanitizeMobileInput } from "../common/phoneUtils";
import { dialogService } from "../context/DialogContext";
import {
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  ChefHat,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckCircle2,
  X,
  Download,
  Printer,
  Share2,
  Settings2,
  FileText,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type OrderType = "DINE_IN" | "TAKEAWAY";

type PaymentMethod =
  | "UPI"
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  orderType: OrderType;
  table: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  gst: number;
  gstRate: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "PAID";
  createdAt: string;
}

/* =========================================================
   MENU DATA
========================================================= */

const MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    name: "Hazelnut Cold Coffee",
    category: "BEVERAGES",
    description: "Rich espresso blended with hazelnut and cream milk",
    price: 180,
  },
  {
    id: 2,
    name: "Paneer Tikka Grilled Sandwich",
    category: "SNACKS",
    description: "Charcoal grilled cottage cheese in artisan sourdough",
    price: 160,
  },
  {
    id: 3,
    name: "Artisan Cappuccino",
    category: "HOT COFFEE",
    description: "Double shot espresso with silky microfoam foam art",
    price: 140,
  },
  {
    id: 4,
    name: "Butter Croissant",
    category: "BAKERY",
    description: "Flaky golden French butter pastry",
    price: 120,
  },
  {
    id: 5,
    name: "Peri Peri French Fries",
    category: "SIDES",
    description: "Crispy salted potato fries tossed in spicy peri-peri dust",
    price: 110,
  },
  {
    id: 6,
    name: "Espresso",
    category: "HOT COFFEE",
    description: "Bold, rich espresso with crema",
    price: 120,
  },
  {
    id: 7,
    name: "Cappuccino",
    category: "HOT COFFEE",
    description: "Velvety microfoam and rich espresso",
    price: 180,
  },
  {
    id: 8,
    name: "Latte",
    category: "HOT COFFEE",
    description: "Smooth, creamy milk with espresso",
    price: 210,
  },
  {
    id: 9,
    name: "Americano",
    category: "HOT COFFEE",
    description: "Hot or iced classic americano",
    price: 140,
  },
  {
    id: 10,
    name: "Cold Brew",
    category: "BEVERAGES",
    description: "18hr slow steep cold brew",
    price: 240,
  },
  {
    id: 11,
    name: "Veg Burger",
    category: "SNACKS",
    description: "Crispy veg patty with fresh vegetables",
    price: 220,
  },
  {
    id: 12,
    name: "Chocolate Brownie",
    category: "DESSERTS",
    description: "Rich chocolate brownie with soft center",
    price: 150,
  },
];

/* =========================================================
   TABLE DATA
========================================================= */

const TABLES = [
  "Table T1",
  "Table T2",
  "Table T3",
  "Table T4",
  "Table T5",
  "Table T6",
  "Table T7",
  "Table T8",
];

/* =========================================================
   COMPONENT
========================================================= */

export const NewOrder: React.FC = () => {
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTable, setSelectedTable] = useState("Table T4");

  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [tables, setTables] = useState<string[]>(TABLES);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedTables, fetchedMenu] = await Promise.all([
          cafeService.getTables(),
          cafeService.getMenuItems(),
        ]);
        if (fetchedTables && fetchedTables.length > 0) {
          const names = fetchedTables.map((t: any) => t.tableNumber || t.name || `Table T${t.id}`);
          setTables(names);
          if (names.length > 0) setSelectedTable(names[0]);
        }
        if (fetchedMenu && fetchedMenu.length > 0) {
          setMenuItems(
            fetchedMenu.map((m: any) => ({
              id: m.id,
              name: m.name,
              category: m.category || "GENERAL",
              description: m.description || "",
              price: Number(m.price || 0),
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to load tables or menu from backend", err);
      }
    };
    fetchData();
  }, []);

  // Category dropdown
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("");

  const [showPayment, setShowPayment] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceData, setInvoiceData] =
    useState<InvoiceData | null>(null);

  const [showCustomize, setShowCustomize] = useState(false);

  const [customHotelName, setCustomHotelName] =
    useState("ANNAPURNA RESTAURANT");

  const [customGstin, setCustomGstin] =
    useState("TAX INVOICE RECEIPT");

  const [customAddress, setCustomAddress] =
    useState("");

  const [customPhone, setCustomPhone] =
    useState("");

  const [customFooter, setCustomFooter] =
    useState("Thank you for visiting us.");

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const categories = [
    "ALL",
    ...Array.from(
      new Set(menuItems.map((item) => item.category))
    ),
  ];

  /* =========================================================
     FILTER MENU
  ========================================================= */

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const categoryMatch =
        selectedCategory === "ALL" ||
        item.category === selectedCategory;

      const searchMatch =
        item.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, search, menuItems]);

  /* =========================================================
     CART
  ========================================================= */

  const addToCart = (item: MenuItem) => {
    setCart((previous) => {
      const existing = previous.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existing) {
        return previous.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...previous,
        {
          ...item,
          quantity: 1,
        },
      ];
    });

    setOrderSent(false);
    setPaymentCompleted(false);
  };

  const updateQuantity = (
    id: number,
    quantity: number
  ) => {
    if (Number.isNaN(quantity)) return;

    setCart((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );

    setOrderSent(false);
    setPaymentCompleted(false);
  };

  const removeFromCart = (id: number) => {
    setCart((previous) =>
      previous.filter((item) => item.id !== id)
    );

    setOrderSent(false);
    setPaymentCompleted(false);
  };

  const clearOrder = () => {
    setCart([]);
    setPaymentMethod("");
    setShowPayment(false);
    setOrderSent(false);
    setPaymentCompleted(false);
    setInvoiceNumber("");
    setInvoiceData(null);
  };

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  /* =========================================================
     SEND TO KITCHEN
  ========================================================= */

  const sendToKitchen = async () => {
    if (cart.length === 0) {
      dialogService.alert({
        type: "warning",
        title: "Warning",
        message: "Please select at least one menu item."
      });
      return;
    }

    const validItems = cart.filter(
      (item) => item.quantity > 0
    );

    if (validItems.length === 0) {
      dialogService.alert({
        type: "warning",
        title: "Warning",
        message: "Please enter a valid quantity."
      });
      return;
    }

    try {
      await orderService.createOrder({
        guestName: orderType === "DINE_IN" ? selectedTable : "Takeaway Guest",
        items: validItems.map((item) => ({
          menuItemId: item.id && item.id < 1000000000 ? item.id : undefined,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      });
    } catch (e) {
      console.warn("Backend order sync failed", e);
    }

    const existingKots = JSON.parse(
      localStorage.getItem("pending_kots") || "[]"
    );

    const completedKots = JSON.parse(
      localStorage.getItem("completed_kots") || "[]"
    );

    const totalCount =
      existingKots.length + completedKots.length;

    const lastKotSeq = Number(
      localStorage.getItem("mess_kot_sequence") ||
        (1000 + totalCount)
    );

    const nextKotSeq = lastKotSeq + 1;

    localStorage.setItem(
      "mess_kot_sequence",
      String(nextKotSeq)
    );

    const lastOrderSeq = Number(
      localStorage.getItem("mess_order_sequence") ||
        (5000 + totalCount)
    );

    const nextOrderSeq = lastOrderSeq + 1;

    localStorage.setItem(
      "mess_order_sequence",
      String(nextOrderSeq)
    );

    const kot = {
      id: nextOrderSeq,

      kotNumber: `KOT-${nextKotSeq}`,

      orderType,

      table:
        orderType === "DINE_IN"
          ? selectedTable
          : "Takeaway",

      items: validItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        amount: item.price * item.quantity,
      })),

      subtotal,

      discountType: "AMOUNT",

      // No discount is applied in New Order.
      // Discount will be handled in Order History.
      discountValue: "",

      discount: 0,

      // No GST is applied in New Order.
      // GST will be handled in Order History.
      gstRate: "",

      gst: 0,

      total: subtotal,

      status: "ACTIVE",

      paymentMethod: "",

      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "pending_kots",
      JSON.stringify([
        ...existingKots,
        kot,
      ])
    );

    window.dispatchEvent(
      new CustomEvent("kot-created", {
        detail: kot,
      })
    );

    setOrderSent(true);

    dialogService.alert({
      type: "success",
      title: "Success",
      message: "KOT created successfully!"
    });
  };

  /* =========================================================
     PAYMENT
  ========================================================= */

  const completePayment = () => {
    if (cart.length === 0) {
      dialogService.alert({
        type: "warning",
        title: "Warning",
        message: "Please add items to the order."
      });
      return;
    }

    if (!paymentMethod) {
      dialogService.alert({
        type: "warning",
        title: "Warning",
        message: "Please select a payment method."
      });
      return;
    }

    const validItems = cart.filter(
      (item) => item.quantity > 0
    );

    if (validItems.length === 0) {
      dialogService.alert({
        type: "warning",
        title: "Warning",
        message: "Please enter a valid quantity."
      });
      return;
    }

    const generatedInvoiceNumber =
      `INV-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-5)}`;

    const createdAt =
      new Date().toISOString();

    const discountAmount = 0;

    const gstRate = 5;

    const gstAmount =
      (subtotal * 5) / 100;

    const grandTotal =
      subtotal + gstAmount;

    const invoice: InvoiceData = {
      id: Date.now(),

      invoiceNumber:
        generatedInvoiceNumber,

      orderType,

      table:
        orderType === "DINE_IN"
          ? selectedTable
          : "Takeaway",

      items: validItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        amount:
          item.price * item.quantity,
      })),

      subtotal,

      discount: discountAmount,

      gst: gstAmount,

      gstRate,

      total: grandTotal,

      paidAmount: grandTotal,

      paymentMethod,

      paymentStatus: "PAID",

      createdAt,
    };

    const existingInvoices =
      JSON.parse(
        localStorage.getItem(
          "mess_invoices"
        ) || "[]"
      );

    localStorage.setItem(
      "mess_invoices",
      JSON.stringify([
        ...existingInvoices,
        invoice,
      ])
    );

    const existingPayments =
      JSON.parse(
        localStorage.getItem(
          "mess_payments"
        ) || "[]"
      );

    const payment = {
      id: Date.now() + 1,

      invoiceNumber:
        generatedInvoiceNumber,

      amount: grandTotal,

      paymentMethod,

      status: "PAID",

      createdAt,
    };

    localStorage.setItem(
      "mess_payments",
      JSON.stringify([
        ...existingPayments,
        payment,
      ])
    );

    window.dispatchEvent(
      new CustomEvent(
        "invoice-payment-created",
        {
          detail: {
            invoice,
            payment,
          },
        }
      )
    );

    setInvoiceNumber(
      generatedInvoiceNumber
    );

    setInvoiceData(invoice);

    setShowPayment(false);

    setPaymentCompleted(true);
  };

  /* =========================================================
     PAYMENT LABEL
  ========================================================= */

  const paymentMethodLabel = (
    method: PaymentMethod
  ) => {
    if (method === "BANK_TRANSFER") {
      return "Bank Transfer";
    }

    return method || "-";
  };

  /* =========================================================
     PRINT INVOICE
  ========================================================= */

  const printInvoice = () => {
    if (!invoiceData) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!printWindow) {
      dialogService.alert({
        type: "warning",
        title: "Print Blocked",
        message: "Please allow pop-ups to print the invoice."
      });

      return;
    }

    printWindow.document.write(
      `<!doctype html>
      <html>
        <head>
          <title>${invoiceData.invoiceNumber}</title>
          <style>
            @page {
              size: A4;
              margin: 16mm;
            }

            body {
              margin: 0;
            }
          </style>
        </head>

        <body>
          ${invoiceHtml(invoiceData)}
        </body>
      </html>`
    );

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  /* =========================================================
     INVOICE HTML
  ========================================================= */

  const invoiceHtml = (
    invoice: InvoiceData
  ) => `
    <div
      style="
        font-family:Arial,sans-serif;
        color:#17143b;
        background:#fff;
        padding:28px;
        max-width:820px;
        margin:0 auto;
        border:1px solid #222
      "
    >

      <div
        style="
          text-align:center;
          border-bottom:2px solid #17143b;
          padding-bottom:12px;
          margin-bottom:14px
        "
      >
        <div
          style="
            font-size:25px;
            font-weight:800;
            letter-spacing:.4px
          "
        >
          ${
            customHotelName ||
            "ANNAPURNA RESTAURANT"
          }
        </div>

        <div
          style="
            font-size:11px;
            color:#b87968;
            font-weight:800;
            margin-top:3px
          "
        >
          ${
            customGstin ||
            "TAX INVOICE RECEIPT"
          }
        </div>

        ${
          customAddress
            ? `
              <div
                style="
                  font-size:11px;
                  color:#71809d;
                  margin-top:4px
                "
              >
                ${customAddress}
              </div>
            `
            : ""
        }

        ${
          customPhone
            ? `
              <div
                style="
                  font-size:11px;
                  color:#71809d;
                  margin-top:2px
                "
              >
                Phone: ${customPhone}
              </div>
            `
            : ""
        }
      </div>

      <div
        style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          font-size:12px;
          margin-bottom:15px
        "
      >
        <div>
          <b>Invoice No:</b>
          ${invoice.invoiceNumber}
        </div>

        <div>
          <b>Date & Time:</b>
          ${new Date(
            invoice.createdAt
          ).toLocaleString("en-IN")}
        </div>

        <div>
          <b>Order Type:</b>
          ${
            invoice.orderType === "DINE_IN"
              ? "Dine In"
              : "Takeaway"
          }
        </div>

        <div>
          <b>Table No:</b>
          ${invoice.table}
        </div>
      </div>

      <table
        style="
          width:100%;
          border-collapse:collapse;
          font-size:12px
        "
      >

        <thead>
          <tr
            style="
              border-top:2px solid #17143b;
              border-bottom:2px solid #17143b
            "
          >
            <th
              style="
                text-align:left;
                padding:8px 5px
              "
            >
              Item Description
            </th>

            <th
              style="
                text-align:center;
                padding:8px 5px
              "
            >
              Qty
            </th>

            <th
              style="
                text-align:right;
                padding:8px 5px
              "
            >
              Price
            </th>

            <th
              style="
                text-align:right;
                padding:8px 5px
              "
            >
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          ${invoice.items
            .map(
              (item) => `
                <tr
                  style="
                    border-bottom:1px solid #e6e1df
                  "
                >
                  <td
                    style="
                      padding:7px 5px
                    "
                  >
                    ${item.name}
                  </td>

                  <td
                    style="
                      text-align:center;
                      padding:7px 5px
                    "
                  >
                    ${item.quantity}
                  </td>

                  <td
                    style="
                      text-align:right;
                      padding:7px 5px
                    "
                  >
                    ₹${item.price.toFixed(2)}
                  </td>

                  <td
                    style="
                      text-align:right;
                      padding:7px 5px
                    "
                  >
                    ₹${item.amount.toFixed(2)}
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>

      <div
        style="
          margin-left:auto;
          width:330px;
          margin-top:14px;
          font-size:12px
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:6px 0
          "
        >
          <span>Subtotal</span>
          <b>
            ₹${invoice.subtotal.toFixed(2)}
          </b>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:6px 0
          "
        >
          <span>Discount</span>
          <b>
            - ₹${invoice.discount.toFixed(2)}
          </b>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:6px 0
          "
        >
          <span>
            GST (${invoice.gstRate}%)
          </span>

          <b>
            ₹${invoice.gst.toFixed(2)}
          </b>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:10px 0;
            border-top:2px solid #17143b;
            border-bottom:2px solid #17143b;
            font-size:16px
          "
        >
          <strong>Grand Total</strong>

          <strong>
            ₹${invoice.total.toFixed(2)}
          </strong>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:7px 0
          "
        >
          <span>Paid Amount</span>

          <b>
            ₹${invoice.paidAmount.toFixed(2)}
          </b>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            padding:7px 0
          "
        >
          <span>Payment Method</span>

          <b>
            ${paymentMethodLabel(
              invoice.paymentMethod
            )}
          </b>
        </div>
      </div>

      <div
        style="
          border-top:1px dashed #cfc8c4;
          margin-top:18px;
          padding-top:10px;
          text-align:center;
          font-size:10px;
          color:#71809d
        "
      >
        ${
          customFooter ||
          "Thank you for visiting us."
        }
      </div>

    </div>
  `;

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPDF = async () => {
    if (!invoiceData) return;

    const element = document.getElementById(
      "invoice-preview-print"
    );

    if (!element) return;

    try {
      const html2pdfModule =
        await import("html2pdf.js");

      const html2pdfFn =
        (html2pdfModule.default ||
          html2pdfModule) as any;

      await html2pdfFn()
        .set({
          margin: 8,

          filename:
            `${invoiceData.invoiceNumber}.pdf`,

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
        .from(element)
        .save();

    } catch (error) {
      console.error(error);

      dialogService.alert({
        type: "error",
        title: "Error",
        message: "PDF download failed."
      });
    }
  };

  /* =========================================================
     WHATSAPP
  ========================================================= */

  const shareWhatsApp = () => {
    if (!invoiceData) return;

    const text = [
      customHotelName ||
        "ANNAPURNA RESTAURANT",

      `Invoice: ${invoiceData.invoiceNumber}`,

      `Order: ${
        invoiceData.orderType === "DINE_IN"
          ? "Dine In"
          : "Takeaway"
      }`,

      `Table: ${invoiceData.table}`,

      `Grand Total: ₹${invoiceData.total.toFixed(
        2
      )}`,

      `Paid Amount: ₹${invoiceData.paidAmount.toFixed(
        2
      )}`,

      `Payment Method: ${paymentMethodLabel(
        invoiceData.paymentMethod
      )}`,

      "Items:",

      ...invoiceData.items.map(
        (item) =>
          `${item.name} × ${item.quantity} = ₹${item.amount.toFixed(
            2
          )}`
      ),
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`,
      "_blank"
    );
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f6",
        padding: "24px",
        fontFamily:
          "Inter, system-ui, sans-serif",
        color: "#17143b",
        boxSizing: "border-box",
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
              color: "#17143b",
            }}
          >
            New Order
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#71809d",
              fontSize: "14px",
            }}
          >
            Create order, send to kitchen and
            process payment
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#ffffff",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid #e6e1df",
          }}
        >
          <ShoppingCart size={18} />

          <span
            style={{
              fontWeight: 700,
            }}
          >
            {
              cart.filter(
                (item) =>
                  item.quantity > 0
              ).length
            }{" "}
            Items
          </span>
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr) 400px",
          gap: "22px",
          alignItems: "start",
        }}
      >

        {/* ===================================================
            LEFT SIDE
        =================================================== */}

        <div>

          {/* ORDER TYPE */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e1df",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >

              <button
                onClick={() => {
                  setOrderType("DINE_IN");
                  setOrderSent(false);
                }}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "10px",
                  border:
                    orderType === "DINE_IN"
                      ? "1px solid #b87968"
                      : "1px solid #e5e1df",
                  background:
                    orderType === "DINE_IN"
                      ? "#f5e8e3"
                      : "#ffffff",
                  color:
                    orderType === "DINE_IN"
                      ? "#8f594b"
                      : "#6f7890",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Dine In
              </button>

              <button
                onClick={() => {
                  setOrderType("TAKEAWAY");
                  setOrderSent(false);
                }}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "10px",
                  border:
                    orderType === "TAKEAWAY"
                      ? "1px solid #b87968"
                      : "1px solid #e5e1df",
                  background:
                    orderType === "TAKEAWAY"
                      ? "#f5e8e3"
                      : "#ffffff",
                  color:
                    orderType === "TAKEAWAY"
                      ? "#8f594b"
                      : "#6f7890",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Takeaway
              </button>

            </div>

            {orderType === "DINE_IN" && (
              <div
                style={{
                  marginTop: "14px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#66718a",
                    marginBottom: "7px",
                  }}
                >
                  Select Table
                </label>

                <select
                  value={selectedTable}
                  onChange={(e) =>
                    setSelectedTable(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border:
                      "1px solid #ded9d6",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#17143b",
                    outline: "none",
                  }}
                >
                  {tables.map((table) => (
                    <option
                      key={table}
                      value={table}
                    >
                      {table}
                    </option>
                  ))}
                </select>

              </div>
            )}

          </div>

          {/* SEARCH */}

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
            }}
          >

            <div
              style={{
                flex: 1,
                position: "relative",
              }}
            >

              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: "#929aaa",
                }}
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search menu..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding:
                    "13px 14px 13px 42px",
                  borderRadius: "12px",
                  border:
                    "1px solid #e4dfdc",
                  background: "#ffffff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />

            </div>

          </div>

          {/* =================================================
              CATEGORY DROPDOWN
          ================================================= */}

          <div
            style={{
              marginBottom: "16px",
              background: "#ffffff",
              border:
                "1px solid #e4dfdc",
              borderRadius: "12px",
              padding: "12px 14px",
            }}
          >

            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 800,
                color: "#66718a",
                marginBottom: "7px",
              }}
            >
              Category
            </label>

            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "9px",
                border:
                  "1px solid #ded9d6",
                background: "#ffffff",
                color: "#17143b",
                fontSize: "14px",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category === "ALL"
                      ? "All Categories"
                      : category}
                  </option>
                )
              )}

            </select>

          </div>

          {/* =================================================
              MENU ITEMS
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "16px",
            }}
          >

            {filteredMenu.map(
              (item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    border:
                      "1px solid #e5e1df",
                    borderRadius: "16px",
                    padding: "18px",
                    minHeight: "175px",
                    display: "flex",
                    flexDirection:
                      "column",
                    justifyContent:
                      "space-between",
                    boxSizing:
                      "border-box",
                    boxShadow:
                      "0 2px 8px rgba(40,30,20,0.03)",
                  }}
                >

                  <div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginBottom:
                          "12px",
                      }}
                    >

                      <span
                        style={{
                          width: "17px",
                          height: "17px",
                          borderRadius: "4px",
                          border:
                            "2px solid #10b981",
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          boxSizing:
                            "border-box",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius:
                              "50%",
                            background:
                              "#10b981",
                          }}
                        />
                      </span>

                      <span
                        style={{
                          color: "#91a0ba",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {item.category}
                      </span>

                    </div>

                    <h3
                      style={{
                        margin:
                          "0 0 7px",
                        fontSize: "17px",
                        lineHeight: 1.3,
                        color: "#17143b",
                      }}
                    >
                      {item.name}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        color: "#71809d",
                        fontSize: "13px",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.description}
                    </p>

                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #eee9e6",
                      marginTop: "15px",
                      paddingTop: "11px",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                    }}
                  >

                    <strong
                      style={{
                        fontSize: "21px",
                        color: "#17143b",
                      }}
                    >
                      ₹{item.price}
                    </strong>

                    <button
                      onClick={() =>
                        addToCart(item)
                      }
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius:
                          "50%",
                        border: "none",
                        background:
                          "#b87968",
                        color: "#ffffff",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        cursor: "pointer",
                        boxShadow:
                          "0 4px 10px rgba(150,90,75,0.22)",
                      }}
                    >
                      <Plus size={20} />
                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

        {/* ===================================================
            ORDER SUMMARY
        =================================================== */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e4dfdc",
            borderRadius: "18px",
            overflow: "hidden",
            position: "sticky",
            top: "20px",
          }}
        >

          <div
            style={{
              padding: "18px",
              borderBottom:
                "1px solid #ece8e5",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >

            <div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "#17143b",
                }}
              >
                Order Summary
              </h2>

              <span
                style={{
                  fontSize: "12px",
                  color: "#8a94a8",
                }}
              >
                {orderType === "DINE_IN"
                  ? selectedTable
                  : "Takeaway"}
              </span>

            </div>

            <button
              onClick={clearOrder}
              style={{
                border: "none",
                background:
                  "transparent",
                color: "#b87968",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>

          </div>

          <div
            style={{
              maxHeight: "370px",
              overflowY: "auto",
              padding: "6px 18px",
            }}
          >

            {cart.length === 0 ? (

              <div
                style={{
                  textAlign: "center",
                  padding: "50px 10px",
                  color: "#9aa2b2",
                }}
              >

                <ShoppingCart
                  size={35}
                  style={{
                    marginBottom: "10px",
                    opacity: 0.5,
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  No items added
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  Select items from the
                  menu
                </div>

              </div>

            ) : (

              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "15px 0",
                    borderBottom:
                      "1px solid #eee9e6",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >

                      <div
                        style={{
                          fontWeight: 800,
                          color:
                            "#17143b",
                          fontSize:
                            "14px",
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "#8b94a7",
                          marginTop:
                            "3px",
                        }}
                      >
                        ₹{item.price} per
                        item
                      </div>

                    </div>

                    <strong
                      style={{
                        color:
                          "#17143b",
                        fontSize:
                          "14px",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      ₹
                      {(
                        item.price *
                        item.quantity
                      ).toFixed(2)}
                    </strong>

                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      marginTop: "11px",
                    }}
                  >

                    <button
                      onClick={() =>
                        removeFromCart(
                          item.id
                        )
                      }
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        color:
                          "#b87968",
                        cursor:
                          "pointer",
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "5px",
                        fontSize:
                          "12px",
                        padding: 0,
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "8px",
                      }}
                    >

                      <span
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "#71809d",
                          fontWeight:
                            700,
                        }}
                      >
                        Qty
                      </span>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: "#F5F5F4",
                          borderRadius: "8px",
                          border: "1px solid #ded8d5",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: "6px 10px",
                            cursor: item.quantity > 0 ? "pointer" : "default",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: item.quantity > 0 ? "#17143b" : "#A8A29E",
                          }}
                          disabled={item.quantity <= 0}
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity ?? 0}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              updateQuantity(item.id, 0);
                              return;
                            }
                            const q = parseInt(val, 10);
                            if (!Number.isNaN(q) && q >= 0) {
                              updateQuantity(item.id, q);
                            }
                          }}
                          style={{
                            width: "48px",
                            height: "32px",
                            border: "none",
                            background: "#ffffff",
                            textAlign: "center",
                            outline: "none",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#17143b",
                          }}
                        />
                        <button
                          type="button"
                          style={{
                            border: "none",
                            background: "#E96500",
                            color: "#ffffff",
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "1rem",
                          }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                    </div>

                  </div>

                </div>
              ))

            )}

          </div>

          {/* =================================================
              BILL SUMMARY
          ================================================= */}

          <div
            style={{
              borderTop:
                "1px solid #e7e2df",
              padding: "18px",
            }}
          >

            <h3
              style={{
                margin:
                  "0 0 14px",
                fontSize: "15px",
                color:
                  "#17143b",
              }}
            >
              Bill Summary
            </h3>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom:
                  "14px",
                fontSize:
                  "13px",
                color:
                  "#707b92",
              }}
            >

              <span>Subtotal</span>

              <strong
                style={{
                  color:
                    "#17143b",
                }}
              >
                ₹{subtotal.toFixed(2)}
              </strong>

            </div>

            <div
              style={{
                background:
                  "#f7eee9",
                borderRadius:
                  "12px",
                padding:
                  "15px",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "15px",
              }}
            >

              <span
                style={{
                  fontWeight: 800,
                  color:
                    "#17143b",
                }}
              >
                Grand Total
              </span>

              <strong
                style={{
                  fontSize:
                    "22px",
                  color:
                    "#8f594b",
                }}
              >
                ₹{subtotal.toFixed(2)}
              </strong>

            </div>

            {/* =================================================
                SEND TO KITCHEN
            ================================================= */}

            <button
              onClick={sendToKitchen}
              disabled={
                cart.length === 0 ||
                orderSent
              }
              style={{
                width: "100%",
                padding: "14px",
                borderRadius:
                  "10px",
                border: "none",
                background:
                  orderSent
                    ? "#e5f5ec"
                    : "#17143b",
                color:
                  orderSent
                    ? "#16804a"
                    : "#ffffff",
                fontWeight: 800,
                cursor:
                  cart.length === 0 ||
                  orderSent
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                gap: "8px",
                fontSize:
                  "14px",
              }}
            >

              {orderSent ? (
                <>
                  <CheckCircle2
                    size={18}
                  />
                  KOT Created
                </>
              ) : (
                <>
                  <FileText
                    size={18}
                  />
                  Create KOT
                </>
              )}

            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          INVOICE PREVIEW
      ===================================================== */}

      {paymentCompleted &&
        invoiceData && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(23,20,59,0.42)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "20px",
              zIndex: 1100,
              overflowY:
                "auto",
            }}
          >

            <div
              style={{
                width: "100%",
                maxWidth:
                  "1050px",
                maxHeight:
                  "94vh",
                overflowY:
                  "auto",
                background:
                  "#faf8f6",
                borderRadius:
                  "20px",
                boxShadow:
                  "0 25px 80px rgba(0,0,0,0.25)",
              }}
            >

              <div
                style={{
                  position:
                    "sticky",
                  top: 0,
                  zIndex: 5,
                  background:
                    "#ffffff",
                  borderBottom:
                    "1px solid #e6e1df",
                  padding:
                    "17px 20px",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                }}
              >

                <div>

                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#b87968",
                      fontWeight:
                        800,
                      letterSpacing:
                        ".6px",
                    }}
                  >
                    PAYMENT SUCCESSFUL
                  </div>

                  <h2
                    style={{
                      margin:
                        "3px 0 0",
                      fontSize:
                        "22px",
                      color:
                        "#17143b",
                    }}
                  >
                    Invoice Preview
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setPaymentCompleted(
                      false
                    )
                  }
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "none",
                    borderRadius:
                      "50%",
                    background:
                      "#f3efed",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                  aria-label="Close invoice preview"
                >
                  <X size={18} />
                </button>

              </div>

              <div
                style={{
                  padding: "20px",
                }}
              >

                <div
                  id="invoice-preview-print"
                  style={{
                    background:
                      "#ffffff",
                    border:
                      "1px solid #d8d4d1",
                    maxWidth:
                      "850px",
                    margin:
                      "0 auto",
                    padding:
                      "30px",
                    color:
                      "#17143b",
                    fontFamily:
                      "Arial, Helvetica, sans-serif",
                  }}
                >

                  <div
                    style={{
                      textAlign:
                        "center",
                      borderBottom:
                        "2px solid #17143b",
                      paddingBottom:
                        "12px",
                      marginBottom:
                        "15px",
                    }}
                  >

                    <div
                      style={{
                        fontSize:
                          "26px",
                        fontWeight:
                          900,
                        letterSpacing:
                          ".5px",
                      }}
                    >
                      {
                        customHotelName ||
                        "ANNAPURNA RESTAURANT"
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          "11px",
                        color:
                          "#b87968",
                        fontWeight:
                          900,
                        marginTop:
                          "3px",
                      }}
                    >
                      {
                        customGstin ||
                        "TAX INVOICE RECEIPT"
                      }
                    </div>

                    {customAddress && (
                      <div
                        style={{
                          fontSize:
                            "11px",
                          color:
                            "#71809d",
                          marginTop:
                            "4px",
                        }}
                      >
                        {customAddress}
                      </div>
                    )}

                    {customPhone && (
                      <div
                        style={{
                          fontSize:
                            "11px",
                          color:
                            "#71809d",
                          marginTop:
                            "2px",
                        }}
                      >
                        Phone:{" "}
                        {customPhone}
                      </div>
                    )}

                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap:
                        "7px 25px",
                      fontSize:
                        "12px",
                      marginBottom:
                        "15px",
                    }}
                  >

                    <div>
                      <b>
                        Invoice No:
                      </b>{" "}
                      {
                        invoiceData.invoiceNumber
                      }
                    </div>

                    <div>
                      <b>
                        Date & Time:
                      </b>{" "}
                      {new Date(
                        invoiceData.createdAt
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </div>

                    <div>
                      <b>
                        Order Type:
                      </b>{" "}
                      {
                        invoiceData.orderType ===
                        "DINE_IN"
                          ? "Dine In"
                          : "Takeaway"
                      }
                    </div>

                    <div>
                      <b>
                        Table No:
                      </b>{" "}
                      {
                        invoiceData.table
                      }
                    </div>

                  </div>

                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >

                    <table
                      style={{
                        width:
                          "100%",
                        borderCollapse:
                          "collapse",
                        fontSize:
                          "12px",
                      }}
                    >

                      <thead>
                        <tr
                          style={{
                            borderTop:
                              "2px solid #17143b",
                            borderBottom:
                              "2px solid #17143b",
                          }}
                        >

                          <th
                            style={{
                              textAlign:
                                "left",
                              padding:
                                "8px 5px",
                            }}
                          >
                            Item Description
                          </th>

                          <th
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "8px 5px",
                            }}
                          >
                            Qty
                          </th>

                          <th
                            style={{
                              textAlign:
                                "right",
                              padding:
                                "8px 5px",
                            }}
                          >
                            Price
                          </th>

                          <th
                            style={{
                              textAlign:
                                "right",
                              padding:
                                "8px 5px",
                            }}
                          >
                            Amount
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {invoiceData.items.map(
                          (item) => (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom:
                                  "1px solid #e8e3e0",
                              }}
                            >

                              <td
                                style={{
                                  padding:
                                    "8px 5px",
                                }}
                              >
                                {item.name}
                              </td>

                              <td
                                style={{
                                  textAlign:
                                    "center",
                                  padding:
                                    "8px 5px",
                                }}
                              >
                                {
                                  item.quantity
                                }
                              </td>

                              <td
                                style={{
                                  textAlign:
                                    "right",
                                  padding:
                                    "8px 5px",
                                }}
                              >
                                ₹
                                {item.price.toFixed(
                                  2
                                )}
                              </td>

                              <td
                                style={{
                                  textAlign:
                                    "right",
                                  padding:
                                    "8px 5px",
                                }}
                              >
                                ₹
                                {item.amount.toFixed(
                                  2
                                )}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>
                    </table>

                  </div>

                  <div
                    style={{
                      marginLeft:
                        "auto",
                      width:
                        "360px",
                      maxWidth:
                        "100%",
                      marginTop:
                        "15px",
                      fontSize:
                        "12px",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "6px 0",
                      }}
                    >
                      <span>
                        Subtotal
                      </span>

                      <b>
                        ₹
                        {invoiceData.subtotal.toFixed(
                          2
                        )}
                      </b>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "6px 0",
                      }}
                    >
                      <span>
                        Discount
                      </span>

                      <b>
                        - ₹
                        {invoiceData.discount.toFixed(
                          2
                        )}
                      </b>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "6px 0",
                      }}
                    >

                      <span>
                        GST (
                        {
                          invoiceData.gstRate
                        }
                        %)
                      </span>

                      <b>
                        ₹
                        {invoiceData.gst.toFixed(
                          2
                        )}
                      </b>

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "10px 0",
                        borderTop:
                          "2px solid #17143b",
                        borderBottom:
                          "2px solid #17143b",
                        fontSize:
                          "17px",
                      }}
                    >

                      <strong>
                        Grand Total
                      </strong>

                      <strong>
                        ₹
                        {invoiceData.total.toFixed(
                          2
                        )}
                      </strong>

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "7px 0",
                      }}
                    >

                      <span>
                        Paid Amount
                      </span>

                      <b
                        style={{
                          color:
                            "#16804a",
                        }}
                      >
                        ₹
                        {invoiceData.paidAmount.toFixed(
                          2
                        )}
                      </b>

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        padding:
                          "7px 0",
                      }}
                    >

                      <span>
                        Payment Method
                      </span>

                      <b>
                        {
                          paymentMethodLabel(
                            invoiceData.paymentMethod
                          )
                        }
                      </b>

                    </div>

                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px dashed #d2cdca",
                      marginTop:
                        "18px",
                      paddingTop:
                        "10px",
                      textAlign:
                        "center",
                      color:
                        "#71809d",
                      fontSize:
                        "10px",
                    }}
                  >
                    {
                      customFooter ||
                      "Thank you for visiting us."
                    }
                  </div>

                </div>

                {/* =================================================
                    INVOICE ACTIONS
                ================================================= */}

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    justifyContent:
                      "center",
                    gap: "10px",
                    marginTop:
                      "18px",
                  }}
                >

                  <button
                    onClick={printInvoice}
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      padding:
                        "11px 16px",
                      borderRadius:
                        "9px",
                      border:
                        "1px solid #ddd7d4",
                      background:
                        "#ffffff",
                      color:
                        "#17143b",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    <Printer
                      size={16}
                    />
                    Print
                  </button>

                  <button
                    onClick={
                      downloadPDF
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      padding:
                        "11px 16px",
                      borderRadius:
                        "9px",
                      border:
                        "1px solid #ddd7d4",
                      background:
                        "#ffffff",
                      color:
                        "#17143b",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    <Download
                      size={16}
                    />
                    Download PDF
                  </button>

                  <button
                    onClick={
                      shareWhatsApp
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      padding:
                        "11px 16px",
                      borderRadius:
                        "9px",
                      border:
                        "1px solid #ddd7d4",
                      background:
                        "#ffffff",
                      color:
                        "#17143b",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    <Share2
                      size={16}
                    />
                    WhatsApp
                  </button>

                  {/* EDIT HEADER REMOVED
                      BUTTON IS NOW CUSTOMIZE */}

                  <button
                    onClick={() =>
                      setShowCustomize(
                        true
                      )
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      padding:
                        "11px 16px",
                      borderRadius:
                        "9px",
                      border:
                        "1px solid #ddd7d4",
                      background:
                        "#ffffff",
                      color:
                        "#17143b",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                    }}
                  >
                    <Settings2
                      size={16}
                    />
                    Customize
                  </button>

                  <button
                    onClick={() => {
                      setPaymentCompleted(
                        false
                      );

                      clearOrder();
                    }}
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "7px",
                      padding:
                        "11px 18px",
                      borderRadius:
                        "9px",
                      border: "none",
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
                    New Order
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          CUSTOMIZE MODAL
      ===================================================== */}

      {showCustomize &&
        invoiceData && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background:
                "rgba(23,20,59,0.48)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "20px",
            }}
            onClick={() =>
              setShowCustomize(false)
            }
          >

            <div
              style={{
                width: "100%",
                maxWidth:
                  "480px",
                background:
                  "#ffffff",
                borderRadius:
                  "18px",
                padding:
                  "24px",
                boxShadow:
                  "0 25px 70px rgba(0,0,0,.22)",
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "18px",
                }}
              >

                <div>

                  <div
                    style={{
                      color:
                        "#b87968",
                      fontSize:
                        "11px",
                      fontWeight:
                        800,
                    }}
                  >
                    INVOICE SETTINGS
                  </div>

                  <h3
                    style={{
                      margin:
                        "4px 0 0",
                      fontSize:
                        "21px",
                      color:
                        "#17143b",
                    }}
                  >
                    Customize Invoice
                  </h3>

                </div>

                <button
                  onClick={() =>
                    setShowCustomize(
                      false
                    )
                  }
                  style={{
                    border:
                      "none",
                    width:
                      "34px",
                    height:
                      "34px",
                    borderRadius:
                      "50%",
                    background:
                      "#f3efed",
                    cursor:
                      "pointer",
                  }}
                >
                  <X size={17} />
                </button>

              </div>

              {[
                [
                  "Restaurant Name",
                  customHotelName,
                  setCustomHotelName,
                  "ANNAPURNA RESTAURANT",
                ],

                [
                  "GST / Header Text",
                  customGstin,
                  setCustomGstin,
                  "TAX INVOICE RECEIPT",
                ],

                [
                  "Address",
                  customAddress,
                  setCustomAddress,
                  "Restaurant address",
                ],

                [
                  "Phone Number",
                  customPhone,
                  setCustomPhone,
                  "Phone number",
                ],

                [
                  "Footer Message",
                  customFooter,
                  setCustomFooter,
                  "Thank you for visiting us.",
                ],
              ].map(
                ([
                  label,
                  value,
                  setter,
                  placeholder,
                ]) => (
                  <label
                    key={label as string}
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "12px",
                      fontSize:
                        "12px",
                      color:
                        "#66718a",
                      fontWeight:
                        800,
                    }}
                  >

                    {label as string}

                    <input
                      maxLength={label === "Phone Number" ? 10 : undefined}
                      inputMode={label === "Phone Number" ? "numeric" : undefined}
                      value={
                        value as string
                      }
                      onChange={(e) =>
                        (
                          setter as React.Dispatch<
                            React.SetStateAction<string>
                          >
                        )(
                          label === "Phone Number"
                            ? sanitizeMobileInput(e.target.value)
                            : e.target.value
                        )
                      }
                      placeholder={
                        label === "Phone Number"
                          ? "10 digit mobile (starts with 6-9)"
                          : (placeholder as string)
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        marginTop:
                          "6px",
                        padding:
                          "11px 12px",
                        border:
                          "1px solid #ded9d6",
                        borderRadius:
                          "9px",
                        outline:
                          "none",
                        color:
                          "#17143b",
                        background:
                          "#ffffff",
                      }}
                    />

                  </label>
                )
              )}

              <button
                onClick={() =>
                  setShowCustomize(
                    false
                  )
                }
                style={{
                  width:
                    "100%",
                  marginTop:
                    "5px",
                  padding:
                    "13px",
                  border:
                    "none",
                  borderRadius:
                    "9px",
                  background:
                    "#b87968",
                  color:
                    "#ffffff",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                Save & Update Invoice
              </button>

            </div>

          </div>
        )}

    </div>
  );
};

export default NewOrder;