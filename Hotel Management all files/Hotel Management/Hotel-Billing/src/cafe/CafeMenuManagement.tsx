import React, { useMemo, useState, useEffect } from "react";
import { cafeService } from "../services/cafeService";

type MenuItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  available: boolean;
};

type ToastType = "success" | "error" | "info";

const initialMenuItems: MenuItem[] = [
  {
    id: 1,
    name: "Espresso",
    description: "Double shot, rich crema",
    category: "Espresso",
    price: 120,
    image:
      "https://images.unsplash.com/photo-1510707577719-ae7c14805e32?w=100&h=100&fit=crop",
    available: false,
  },
  {
    id: 2,
    name: "Cappuccino",
    description: "Velvety microfoam, 6oz",
    category: "Espresso",
    price: 180,
    image:
      "https://images.unsplash.com/photo-1534778101976-62847782c213?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 3,
    name: "Flat White",
    description: "Ristretto, silky texture",
    category: "Espresso",
    price: 200,
    image:
      "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 4,
    name: "Latte",
    description: "Smooth, creamy 12oz",
    category: "Espresso",
    price: 210,
    image:
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 5,
    name: "Americano",
    description: "Hot or iced",
    category: "Espresso",
    price: 140,
    image:
      "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 6,
    name: "Cortado",
    description: "Equal parts espresso & milk",
    category: "Espresso",
    price: 160,
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 7,
    name: "Pour Over",
    description: "V60, Ethiopian Yirgacheffe",
    category: "Filter",
    price: 220,
    image:
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=100&h=100&fit=crop",
    available: false,
  },
  {
    id: 8,
    name: "Aeropress",
    description: "Full immersion, bold",
    category: "Filter",
    price: 200,
    image:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 9,
    name: "Cold Brew",
    description: "18hr slow steep",
    category: "Cold Brew",
    price: 240,
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 10,
    name: "Nitro Cold Brew",
    description: "Nitrogen-infused, creamy",
    category: "Cold Brew",
    price: 280,
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 11,
    name: "Mocha",
    description: "Chocolate, espresso & milk",
    category: "Espresso",
    price: 230,
    image:
      "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 12,
    name: "Macchiato",
    description: "Espresso with milk foam",
    category: "Espresso",
    price: 170,
    image:
      "https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 13,
    name: "Iced Latte",
    description: "Cold, smooth & creamy",
    category: "Cold Brew",
    price: 230,
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 14,
    name: "Filter Coffee",
    description: "Freshly brewed coffee",
    category: "Filter",
    price: 150,
    image:
      "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=100&h=100&fit=crop",
    available: true,
  },
  {
    id: 15,
    name: "Affogato",
    description: "Espresso over vanilla ice cream",
    category: "Espresso",
    price: 260,
    image:
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=100&h=100&fit=crop",
    available: false,
  },
];

const categories = [
  "All",
  "Espresso",
  "Filter",
  "Cold Brew",
  "Pastry",
  "Food",
  "Merchandise",
];

const emptyItem = {
  name: "",
  description: "",
  price: "",
  category: "Espresso",
  image: "",
  available: true,
};

const CaffeMenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  /* ================= CATEGORY DROPDOWN ================= */

  const [showCategoryDropdown, setShowCategoryDropdown] =
    useState(false);

  /* ================= ADD FORM ================= */

  const [showAddForm, setShowAddForm] = useState(false);

  const [newItem, setNewItem] = useState({
    ...emptyItem,
  });

  /* ================= EDIT FORM ================= */

  const [editingItem, setEditingItem] =
    useState<MenuItem | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  /* ================= TOAST ================= */

  const [toast, setToast] = useState<{
    show: boolean;
    type: ToastType;
    message: string;
  }>({
    show: false,
    type: "info",
    message: "",
  });

  const showToast = (
    message: string,
    type: ToastType = "info"
  ) => {
    setToast({
      show: true,
      type,
      message,
    });

    window.setTimeout(() => {
      setToast((current) => ({
        ...current,
        show: false,
      }));
    }, 2800);
  };

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const data = await cafeService.getMenuItems();
      if (data) {
        setMenuItems(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description || "",
            category: d.category || "Espresso",
            price: Number(d.price || 0),
            image:
              d.imageUrl ||
              d.image ||
              "https://images.unsplash.com/photo-1510707577719-ae7c14805e32?w=100&h=100&fit=crop",
            available: d.available !== undefined ? d.available : true,
          }))
        );
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to load menu items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  /* ================= ADD FORM CHANGE ================= */

  const handleAddFormChange = (
    field: string,
    value: string | boolean
  ) => {
    setNewItem((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* ================= OPEN ADD FORM ================= */

  const addItem = () => {
    setShowAddForm(true);
  };

  /* ================= CLOSE ADD FORM ================= */

  const closeAddForm = () => {
    setShowAddForm(false);

    setNewItem({
      ...emptyItem,
    });
  };

  /* ================= VALIDATION ================= */

  const validateNewItem = () => {
    const name = newItem.name.trim();
    const description = newItem.description.trim();
    const price = Number(newItem.price);
    const image = newItem.image.trim();

    if (!name) {
      showToast("Item name is required.", "error");
      return false;
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      showToast(
        "Item name can contain only letters and spaces.",
        "error"
      );
      return false;
    }

    if (name.length < 2) {
      showToast(
        "Item name must contain at least 2 characters.",
        "error"
      );
      return false;
    }

    const duplicate = menuItems.some(
      (item) =>
        item.name.trim().toLowerCase() ===
        name.toLowerCase()
    );

    if (duplicate) {
      showToast(
        "An item with this name already exists.",
        "error"
      );
      return false;
    }

    if (!description) {
      showToast("Description is required.", "error");
      return false;
    }

    if (!/^[A-Za-z\s]+$/.test(description)) {
      showToast(
        "Description can contain only letters and spaces.",
        "error"
      );
      return false;
    }

    if (description.length < 5) {
      showToast(
        "Description must contain at least 5 characters.",
        "error"
      );
      return false;
    }

    if (!newItem.price.trim()) {
      showToast("Price is required.", "error");
      return false;
    }

    if (!/^[0-9]+$/.test(newItem.price)) {
      showToast(
        "Price can contain only numbers.",
        "error"
      );
      return false;
    }

    if (!Number.isFinite(price)) {
      showToast("Please enter a valid price.", "error");
      return false;
    }

    if (price <= 0) {
      showToast(
        "Price must be greater than ₹0.",
        "error"
      );
      return false;
    }

    if (price > 100000) {
      showToast(
        "Price cannot be greater than ₹100000.",
        "error"
      );
      return false;
    }

    if (!image) {
      showToast("Image URL is required.", "error");
      return false;
    }

    if (
      !image.startsWith("http://") &&
      !image.startsWith("https://")
    ) {
      showToast(
        "Please enter a valid image URL.",
        "error"
      );
      return false;
    }

    if (!newItem.category) {
      showToast("Please select a category.", "error");
      return false;
    }

    return true;
  };

  /* ================= SUBMIT NEW ITEM ================= */

  const submitNewItem = async () => {
    if (!validateNewItem()) return;

    try {
      const created = await cafeService.createMenuItem({
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        category: newItem.category,
        price: Number(newItem.price),
        imageUrl: newItem.image.trim(),
        available: newItem.available,
      } as any);

      const item: MenuItem = {
        id: created.id || Date.now(),
        name: created.name || newItem.name.trim(),
        description: created.description || newItem.description.trim(),
        category: created.category || newItem.category,
        price: Number(created.price || newItem.price),
        image: created.imageUrl || newItem.image.trim(),
        available: created.available !== undefined ? created.available : newItem.available,
      };

      setMenuItems((items) => [...items, item]);
      closeAddForm();
      showToast(`"${item.name}" added to menu successfully.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to create menu item", "error");
    }
  };

  /* ================= AVAILABILITY ================= */

  const toggleAvailability = async (id: number) => {
    const item = menuItems.find(
      (menuItem) => menuItem.id === id
    );

    if (!item) return;

    const nextAvailable = !item.available;

    try {
      await cafeService.updateAvailability(id, nextAvailable);
      setMenuItems((items) =>
        items.map((menuItem) =>
          menuItem.id === id
            ? {
                ...menuItem,
                available: nextAvailable,
              }
            : menuItem
        )
      );

      showToast(
        `${item.name} is now ${
          nextAvailable
            ? "Available"
            : "Unavailable"
        }.`,
        "info"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to update availability", "error");
    }
  };

  /* ================= DELETE ================= */

  const deleteItem = async (id: number) => {
    const item = menuItems.find(
      (menuItem) => menuItem.id === id
    );

    if (!item) return;

    try {
      await cafeService.deleteMenuItem(id);
      setMenuItems((items) =>
        items.filter(
          (menuItem) => menuItem.id !== id
        )
      );

      showToast(
        `"${item.name}" removed from menu.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to delete menu item", "error");
    }
  };

  /* ================= OPEN EDIT ================= */

  const editItem = (item: MenuItem) => {
    setEditingItem(item);

    setEditName(item.name);
    setEditDescription(item.description);
    setEditPrice(String(item.price));
  };

  /* ================= CLOSE EDIT ================= */

  const closeEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditDescription("");
    setEditPrice("");
  };

  /* ================= SAVE EDIT ================= */

  const saveEdit = async () => {
    if (!editingItem) return;

    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();
    const trimmedPrice = editPrice.trim();

    if (!trimmedName) {
      showToast(
        "Item name cannot be empty.",
        "error"
      );
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      showToast(
        "Item name can contain only letters and spaces.",
        "error"
      );
      return;
    }

    if (trimmedName.length < 2) {
      showToast(
        "Item name must contain at least 2 characters.",
        "error"
      );
      return;
    }

    if (!trimmedDescription) {
      showToast(
        "Description cannot be empty.",
        "error"
      );
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(trimmedDescription)) {
      showToast(
        "Description can contain only letters and spaces.",
        "error"
      );
      return;
    }

    if (trimmedDescription.length < 5) {
      showToast(
        "Description must contain at least 5 characters.",
        "error"
      );
      return;
    }

    if (!trimmedPrice) {
      showToast(
        "Price cannot be empty.",
        "error"
      );
      return;
    }

    if (!/^[0-9]+$/.test(trimmedPrice)) {
      showToast(
        "Price can contain only numbers.",
        "error"
      );
      return;
    }

    const numericPrice = Number(trimmedPrice);

    if (!Number.isFinite(numericPrice)) {
      showToast(
        "Please enter a valid price.",
        "error"
      );
      return;
    }

    if (numericPrice <= 0) {
      showToast(
        "Price must be greater than ₹0.",
        "error"
      );
      return;
    }

    if (numericPrice > 100000) {
      showToast(
        "Price cannot be greater than ₹100000.",
        "error"
      );
      return;
    }

    const duplicate = menuItems.some(
      (menuItem) =>
        menuItem.id !== editingItem.id &&
        menuItem.name
          .trim()
          .toLowerCase() ===
        trimmedName.toLowerCase()
    );

    if (duplicate) {
      showToast(
        "Another item already has this name.",
        "error"
      );
      return;
    }

    try {
      await cafeService.updateMenuItem(editingItem.id, {
        name: trimmedName,
        description: trimmedDescription,
        price: numericPrice,
        category: editingItem.category,
        imageUrl: editingItem.image,
        available: editingItem.available,
      } as any);

      setMenuItems((items) =>
        items.map((menuItem) =>
          menuItem.id === editingItem.id
            ? {
                ...menuItem,
                name: trimmedName,
                description: trimmedDescription,
                price: numericPrice,
              }
            : menuItem
        )
      );

      closeEdit();

      showToast(
        `"${trimmedName}" updated successfully.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to update menu item", "error");
    }
  };

  /* ================= FILTER ================= */

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const categoryMatch =
        activeCategory === "All" ||
        item.category === activeCategory;

      const searchMatch =
        item.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [menuItems, activeCategory, search]);

  const totalItems = menuItems.length;

  const availableItems = menuItems.filter(
    (item) => item.available
  ).length;

  const unavailableItems =
    menuItems.filter(
      (item) => !item.available
    ).length;

  return (
    <div style={styles.page}>

      {/* ================= HEADER ================= */}

      <div style={styles.header}>

        <div style={styles.title}>
          Menu
        </div>

        {/* ================= CATEGORY DROPDOWN ================= */}

        <div style={styles.categoryDropdownWrapper}>

          <button
            type="button"
            onClick={() =>
              setShowCategoryDropdown(
                (current) => !current
              )
            }
            style={styles.categoryDropdownButton}
          >
            <span>
              Category
            </span>

            <span style={styles.categoryArrow}>
              {showCategoryDropdown ? "⌃" : "⌄"}
            </span>
          </button>

          {showCategoryDropdown && (
            <div style={styles.categoryDropdownMenu}>

              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                  style={{
                    ...styles.categoryDropdownOption,
                    ...(activeCategory === category
                      ? styles.activeCategoryOption
                      : {}),
                  }}
                >
                  {category}
                </button>
              ))}

            </div>
          )}

        </div>

        {/* ================= SEARCH ================= */}

        <div style={styles.searchWrapper}>

          <span style={styles.searchIcon}>
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;

              if (/^[A-Za-z\s]*$/.test(value)) {
                setSearch(value);
              }
            }}
            style={styles.searchInput}
          />

        </div>

        <button
          onClick={addItem}
          style={styles.addButton}
        >
          + Add Item
        </button>

      </div>

      {/* ================= SUMMARY ================= */}

      <div style={styles.summary}>

        <span>
          {totalItems} total items
        </span>

        <span style={styles.availableSummary}>
          {availableItems} available
        </span>

        <span style={styles.unavailableSummary}>
          {unavailableItems} unavailable
        </span>

      </div>

      {/* ================= TABLE ================= */}

      <div style={styles.tableContainer}>

        <div style={styles.tableHeader}>

          <div>
            ITEM
          </div>

          <div>
            CATEGORY
          </div>

          <div>
            PRICE
          </div>

          <div>
            STATUS
          </div>

          <div />

        </div>

        {filteredItems.map((item) => (

          <div
            key={item.id}
            style={styles.tableRow}
          >

            {/* ITEM */}

            <div style={styles.itemCell}>

              <img
                src={item.image}
                alt={item.name}
                style={styles.itemImage}
              />

              <div>

                <div style={styles.itemName}>
                  {item.name}
                </div>

                <div style={styles.itemDescription}>
                  {item.description}
                </div>

              </div>

            </div>

            {/* CATEGORY */}

            <div style={styles.categoryCell}>
              {item.category}
            </div>

            {/* PRICE */}

            <div style={styles.priceCell}>
              ₹{item.price}
            </div>

            {/* STATUS */}

            <div>

              <button
                onClick={() =>
                  toggleAvailability(item.id)
                }
                style={{
                  ...styles.statusButton,
                  ...(item.available
                    ? styles.availableButton
                    : styles.unavailableButton),
                }}
              >

                <span
                  style={{
                    ...styles.statusDot,
                    ...(item.available
                      ? styles.availableDot
                      : styles.unavailableDot),
                  }}
                />

                {item.available
                  ? "Available"
                  : "Unavailable"}

              </button>

            </div>

            {/* ACTIONS */}

            <div style={styles.actions}>

              <button
                onClick={() => editItem(item)}
                style={styles.actionButton}
              >
                Edit
              </button>

              <button
                onClick={() =>
                  deleteItem(item.id)
                }
                style={styles.actionButton}
              >
                Remove
              </button>

            </div>

          </div>

        ))}

        {filteredItems.length === 0 && (
          <div style={styles.empty}>
            No menu items found
          </div>
        )}

      </div>

      {/* ================= ADD ITEM DRAWER ================= */}

      {showAddForm && (
        <div style={styles.drawerOverlay}>

          <div
            style={styles.drawerBackdrop}
            onClick={closeAddForm}
          />

          <div style={styles.addDrawer}>

            <div style={styles.drawerHeader}>

              <div>

                <div style={styles.formTitle}>
                  Add Item
                </div>

                <div style={styles.formSubtitle}>
                  Add a new item to your café menu
                </div>

              </div>

              <button
                onClick={closeAddForm}
                style={styles.formCloseButton}
              >
                ×
              </button>

            </div>

            <div style={styles.drawerBody}>

              {/* NAME */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Name
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="e.g. Cortado"
                  value={newItem.name}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[A-Za-z\s]*$/.test(value)) {
                      handleAddFormChange(
                        "name",
                        value
                      );
                    }
                  }}
                  style={styles.formInput}
                />

              </div>

              {/* DESCRIPTION */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Description
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <textarea
                  placeholder="Short description"
                  value={newItem.description}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[A-Za-z\s]*$/.test(value)) {
                      handleAddFormChange(
                        "description",
                        value
                      );
                    }
                  }}
                  style={styles.formTextareaDrawer}
                />

              </div>

              {/* PRICE */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Price (₹)
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={newItem.price}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[0-9]*$/.test(value)) {
                      handleAddFormChange(
                        "price",
                        value
                      );
                    }
                  }}
                  style={styles.formInput}
                />

              </div>

              {/* CATEGORY */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Category
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <select
                  value={newItem.category}
                  onChange={(e) =>
                    handleAddFormChange(
                      "category",
                      e.target.value
                    )
                  }
                  style={styles.formSelect}
                >
                  {categories
                    .filter(
                      (category) =>
                        category !== "All"
                    )
                    .map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                </select>

              </div>

              {/* IMAGE URL */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Image URL
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  placeholder="https://..."
                  value={newItem.image}
                  onChange={(e) =>
                    handleAddFormChange(
                      "image",
                      e.target.value
                    )
                  }
                  style={styles.formInput}
                />

              </div>

              {/* IMAGE PREVIEW */}

              {newItem.image.trim() && (
                <div style={styles.imagePreviewBox}>

                  <img
                    src={newItem.image}
                    alt="Preview"
                    style={styles.imagePreview}
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />

                </div>
              )}

              {/* AVAILABILITY */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Availability
                </label>

                <button
                  type="button"
                  onClick={() =>
                    handleAddFormChange(
                      "available",
                      !newItem.available
                    )
                  }
                  style={{
                    ...styles.formAvailability,
                    ...(newItem.available
                      ? styles.formAvailable
                      : styles.formUnavailable),
                  }}
                >

                  <span
                    style={{
                      ...styles.formStatusDot,
                      ...(newItem.available
                        ? styles.formAvailableDot
                        : styles.formUnavailableDot),
                    }}
                  />

                  {newItem.available
                    ? "Available"
                    : "Unavailable"}

                </button>

              </div>

            </div>

            <div style={styles.drawerFooter}>

              <button
                type="button"
                onClick={closeAddForm}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitNewItem}
                style={styles.submitButton}
              >
                Add to Menu
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ================= EDIT ITEM POPUP ================= */}

      {editingItem && (
        <div style={styles.modalOverlay}>

          <div style={styles.editModal}>

            {/* HEADER */}

            <div style={styles.editModalHeader}>

              <div>

                <div style={styles.editModalTitle}>
                  Edit Item
                </div>

                <div style={styles.editModalSubtitle}>
                  Update your menu item details
                </div>

              </div>

              <button
                onClick={closeEdit}
                style={styles.modalCloseButton}
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div style={styles.editModalBody}>

              {/* ITEM NAME */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Item Name
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  autoFocus
                  type="text"
                  value={editName}
                  placeholder="Item name"
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[A-Za-z\s]*$/.test(value)) {
                      setEditName(value);
                    }
                  }}
                  style={styles.formInput}
                />

              </div>

              {/* DESCRIPTION */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Description
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <textarea
                  value={editDescription}
                  placeholder="Item description"
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[A-Za-z\s]*$/.test(value)) {
                      setEditDescription(value);
                    }
                  }}
                  style={styles.editTextarea}
                />

              </div>

              {/* PRICE */}

              <div style={styles.formField}>

                <label style={styles.formLabel}>
                  Price (₹)
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={editPrice}
                  placeholder="0"
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^[0-9]*$/.test(value)) {
                      setEditPrice(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveEdit();
                    }
                  }}
                  style={styles.formInput}
                />

              </div>

            </div>

            {/* FOOTER */}

            <div style={styles.editModalFooter}>

              <button
                onClick={closeEdit}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                style={styles.submitButton}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ================= TOAST ================= */}

      {toast.show && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "success"
              ? styles.successToast
              : toast.type === "error"
              ? styles.errorToast
              : styles.infoToast),
          }}
        >

          <div
            style={{
              ...styles.toastIcon,
              ...(toast.type === "success"
                ? styles.successIcon
                : toast.type === "error"
                ? styles.errorIcon
                : styles.infoIcon),
            }}
          >
            {toast.type === "success"
              ? "✓"
              : toast.type === "error"
              ? "!"
              : "i"}
          </div>

          <div style={styles.toastMessage}>
            {toast.message}
          </div>

          <button
            onClick={() =>
              setToast((current) => ({
                ...current,
                show: false,
              }))
            }
            style={styles.toastClose}
          >
            ×
          </button>

        </div>
      )}

    </div>
  );
};

/* =========================================================
   INLINE CSS ONLY
========================================================= */

const styles: {
  [key: string]: React.CSSProperties;
} = {

  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#F8F6F3",
    color: "#100842",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "14px",
    boxSizing: "border-box",
    position: "relative",
  },

  header: {
    minHeight: "58px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 18px 0 20px",
    background: "#FFFFFF",
    borderBottom: "1px solid #E7E3DF",
    boxSizing: "border-box",
  },

  title: {
    minWidth: "35px",
    color: "#100842",
    fontSize: "15px",
    fontWeight: 800,
    lineHeight: "1",
  },

  /* ================= CATEGORY DROPDOWN ================= */

  categoryDropdownWrapper: {
    position: "relative",
    flexShrink: 0,
  },

  categoryDropdownButton: {
    height: "29px",
    minWidth: "105px",
    padding: "0 10px",
    border: "1px solid #DCE2EA",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#100842",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    boxSizing: "border-box",
  },

  categoryArrow: {
    color: "#71809A",
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: "1",
  },

  categoryDropdownMenu: {
    position: "absolute",
    top: "34px",
    left: 0,
    width: "145px",
    padding: "5px",
    background: "#FFFFFF",
    border: "1px solid #DDE4EC",
    borderRadius: "8px",
    boxShadow:
      "0 8px 22px rgba(16,8,66,0.12)",
    zIndex: 500,
    boxSizing: "border-box",
  },

  categoryDropdownOption: {
    width: "100%",
    height: "30px",
    padding: "0 9px",
    border: "none",
    borderRadius: "5px",
    background: "transparent",
    color: "#71809A",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
  },

  activeCategoryOption: {
    background: "#F4F1EF",
    color: "#100842",
    fontWeight: 800,
  },

  searchWrapper: {
    marginLeft: "auto",
    width: "235px",
    height: "32px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    background: "#FFFFFF",
    border: "1px solid #DCE2EA",
    borderRadius: "8px",
    boxSizing: "border-box",
    boxShadow:
      "0 1px 3px rgba(16,8,66,0.04)",
  },

  searchIcon: {
    color: "#70809A",
    fontSize: "18px",
    lineHeight: "1",
    marginRight: "6px",
  },

  searchInput: {
    width: "100%",
    height: "100%",
    padding: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#18224F",
    fontSize: "12px",
    boxSizing: "border-box",
  },

  addButton: {
    height: "32px",
    flexShrink: 0,
    padding: "0 13px",
    borderRadius: "8px",
    border: "1px solid #A97567",
    background: "#B17A6B",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  },

  drawerOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
  },

  drawerBackdrop: {
    position: "absolute",
    inset: 0,
    background:
      "rgba(16,8,66,0.16)",
    backdropFilter: "blur(1px)",
  },

  addDrawer: {
    position: "relative",
    width: "390px",
    maxWidth: "92vw",
    maxHeight: "88vh",
    background: "#FFFFFF",
    boxShadow:
      "0 12px 40px rgba(16,8,66,0.18)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden",
    transform: "translateY(-4%)",
  },

  drawerHeader: {
    minHeight: "76px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    background: "#FFFFFF",
    borderBottom: "1px solid #E6E9ED",
    boxSizing: "border-box",
  },

  drawerBody: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    background: "#FCFBFA",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "17px",
  },

  drawerFooter: {
    minHeight: "70px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "9px",
    padding: "12px 20px",
    background: "#FFFFFF",
    borderTop: "1px solid #E6E9ED",
    boxSizing: "border-box",
  },

  formTitle: {
    color: "#100842",
    fontSize: "17px",
    fontWeight: 800,
    marginBottom: "4px",
  },

  formSubtitle: {
    color: "#7A879B",
    fontSize: "12px",
  },

  formCloseButton: {
    width: "30px",
    height: "30px",
    border: "none",
    borderRadius: "50%",
    background: "#F4F1EF",
    color: "#7B6A62",
    fontSize: "21px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
  },

  formLabel: {
    color: "#100842",
    fontSize: "12px",
    fontWeight: 700,
  },

  required: {
    color: "#D85B53",
    marginLeft: "3px",
  },

  formInput: {
    width: "100%",
    height: "40px",
    padding: "0 11px",
    border: "1px solid #D9DFE7",
    borderRadius: "7px",
    outline: "none",
    background: "#FFFFFF",
    color: "#18224F",
    fontSize: "12px",
    boxSizing: "border-box",
  },

  formTextareaDrawer: {
    width: "100%",
    minHeight: "86px",
    padding: "10px 11px",
    border: "1px solid #D9DFE7",
    borderRadius: "7px",
    outline: "none",
    background: "#FFFFFF",
    color: "#18224F",
    fontSize: "12px",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },

  editTextarea: {
    width: "100%",
    minHeight: "80px",
    padding: "10px 11px",
    border: "1px solid #D9DFE7",
    borderRadius: "7px",
    outline: "none",
    background: "#FFFFFF",
    color: "#18224F",
    fontSize: "12px",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },

  formSelect: {
    width: "100%",
    height: "40px",
    padding: "0 10px",
    border: "1px solid #D9DFE7",
    borderRadius: "7px",
    outline: "none",
    background: "#FFFFFF",
    color: "#18224F",
    fontSize: "12px",
    boxSizing: "border-box",
  },

  formAvailability: {
    width: "fit-content",
    minWidth: "100px",
    height: "34px",
    padding: "0 11px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 600,
  },

  formAvailable: {
    color: "#299B68",
    background: "#EFF9F3",
    border: "1px solid #C8E8D6",
  },

  formUnavailable: {
    color: "#D45C55",
    background: "#FFF2F1",
    border: "1px solid #F0CFCC",
  },

  formStatusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block",
  },

  formAvailableDot: {
    background: "#32B675",
  },

  formUnavailableDot: {
    background: "#DF5A52",
  },

  imagePreviewBox: {
    width: "100%",
    height: "130px",
    borderRadius: "8px",
    border: "1px solid #DDE4EC",
    background: "#F7F8FA",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  cancelButton: {
    height: "36px",
    padding: "0 18px",
    border: "1px solid #D9DFE7",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#71809A",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  submitButton: {
    height: "36px",
    padding: "0 22px",
    border: "1px solid #A97567",
    borderRadius: "7px",
    background: "#B17A6B",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 2px 5px rgba(16,8,66,0.08)",
  },

  summary: {
    height: "40px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "0 20px",
    background: "#F8F6F3",
    borderBottom: "1px solid #E4E0DC",
    color: "#71809A",
    fontSize: "11px",
    fontWeight: 500,
    boxSizing: "border-box",
  },

  availableSummary: {
    color: "#299B68",
    fontWeight: 600,
  },

  unavailableSummary: {
    color: "#D95B51",
    fontWeight: 600,
  },

  tableContainer: {
    width: "100%",
    margin: "0",
    background: "#FFFFFF",
    border: "1px solid #DDE4EC",
    borderTop: "none",
    boxSizing: "border-box",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    borderRadius: "0 0 10px 10px",
  },

  tableHeader: {
    height: "38px",
    width: "100%",
    minWidth: "780px",
    display: "grid",
    gridTemplateColumns:
      "2.1fr 1fr 0.65fr 1fr 0.75fr",
    alignItems: "center",
    padding: "0 12px",
    background: "#F7F8FA",
    borderBottom: "1px solid #E2E7ED",
    color: "#8A96A8",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.35px",
    boxSizing: "border-box",
  },

  tableRow: {
    minHeight: "64px",
    width: "100%",
    minWidth: "780px",
    display: "grid",
    gridTemplateColumns:
      "2.1fr 1fr 0.65fr 1fr 0.75fr",
    alignItems: "center",
    padding: "0 12px",
    background: "#FFFFFF",
    borderBottom: "1px solid #E9EDF1",
    boxSizing: "border-box",
  },

  itemCell: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingRight: "10px",
    boxSizing: "border-box",
  },

  itemImage: {
    width: "40px",
    height: "40px",
    flexShrink: 0,
    objectFit: "cover",
    borderRadius: "7px",
    background: "#F0F2F5",
    border: "1px solid #E2E6EB",
    boxSizing: "border-box",
  },

  itemName: {
    marginBottom: "3px",
    color: "#100842",
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  itemDescription: {
    maxWidth: "260px",
    color: "#71809A",
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: "15px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  categoryCell: {
    color: "#71809A",
    fontSize: "12px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  priceCell: {
    color: "#100842",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  statusButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    minHeight: "26px",
    padding: "4px 9px",
    borderRadius: "5px",
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: "1",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  availableButton: {
    color: "#299B68",
    background: "#EFF9F3",
    border: "1px solid #C8E8D6",
  },

  unavailableButton: {
    color: "#D45C55",
    background: "#FFF2F1",
    border: "1px solid #F0CFCC",
  },

  statusDot: {
    width: "5px",
    height: "5px",
    display: "inline-block",
    borderRadius: "50%",
    flexShrink: 0,
  },

  availableDot: {
    background: "#32B675",
  },

  unavailableDot: {
    background: "#DF5A52",
  },

  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "8px",
    whiteSpace: "nowrap",
  },

  actionButton: {
    padding: "3px 2px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#71809A",
    fontSize: "10px",
    fontWeight: 500,
    cursor: "pointer",
    lineHeight: "1",
  },

  empty: {
    height: "100px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#71809A",
    fontSize: "13px",
    background: "#FFFFFF",
    boxSizing: "border-box",
  },

  /* ================= EDIT MODAL ================= */

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background:
      "rgba(16,8,66,0.18)",
    backdropFilter: "blur(2px)",
    boxSizing: "border-box",
  },

  editModal: {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "390px",
    maxWidth: "100%",
    background: "#FFFFFF",
    borderRadius: "12px",
    border: "1px solid #DDE4EC",
    boxShadow:
      "0 12px 40px rgba(16,8,66,0.18)",
    overflow: "hidden",
    boxSizing: "border-box",
  },

  editModalHeader: {
    minHeight: "68px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    borderBottom: "1px solid #E6E9ED",
    boxSizing: "border-box",
  },

  editModalTitle: {
    color: "#100842",
    fontSize: "16px",
    fontWeight: 800,
    marginBottom: "3px",
  },

  editModalSubtitle: {
    color: "#7A879B",
    fontSize: "11px",
  },

  modalCloseButton: {
    width: "28px",
    height: "28px",
    border: "none",
    borderRadius: "50%",
    background: "#F4F1EF",
    color: "#7B6A62",
    fontSize: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  editModalBody: {
    padding: "18px",
    background: "#FCFBFA",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  editModalFooter: {
    minHeight: "62px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "9px",
    padding: "10px 18px",
    background: "#FFFFFF",
    borderTop: "1px solid #E6E9ED",
    boxSizing: "border-box",
  },

  /* ================= TOAST ================= */

  toast: {
    position: "fixed",
    right: "24px",
    top: "24px",
    minWidth: "290px",
    maxWidth: "420px",
    minHeight: "58px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#FFFFFF",
    border: "1px solid #DDE4EC",
    boxShadow:
      "0 8px 28px rgba(16,8,66,0.16)",
    zIndex: 9999,
    boxSizing: "border-box",
  },

  successToast: {
    borderLeft: "4px solid #32B675",
  },

  errorToast: {
    borderLeft: "4px solid #DF5A52",
  },

  infoToast: {
    borderLeft: "4px solid #B17A6B",
  },

  toastIcon: {
    width: "27px",
    height: "27px",
    flexShrink: 0,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: 800,
  },

  successIcon: {
    background: "#EFF9F3",
    color: "#299B68",
  },

  errorIcon: {
    background: "#FFF2F1",
    color: "#D45B51",
  },

  infoIcon: {
    background: "#F5EFEC",
    color: "#A06D5E",
  },

  toastMessage: {
    flex: 1,
    color: "#18224F",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "15px",
  },

  toastClose: {
    width: "22px",
    height: "22px",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#8A96A8",
    fontSize: "19px",
    cursor: "pointer",
  },
};

export default CaffeMenuManagement;