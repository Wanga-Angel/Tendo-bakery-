"use strict";

(() => {
  const categories = [
    "Cakes",
    "Cupcakes",
    "Muffins",
    "Cinnamon rolls"
  ];

  const flavors = [
    "Vanilla",
    "chocolate",
    "chocolate chipped",
    "caramel",
    "raspberries"
  ];

  const byId = (id) => document.getElementById(id);

  const isRecord = (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

  let selectedCategory = "";
  let chosenItem = "";

  // Feedback messages
  function notify(message, error = false) {
    const status = byId("toast");
    if (!status) return;

    status.textContent = message;
    status.className = error
      ? "message message-error"
      : "message";

    status.hidden = false;
  }

  // Browser storage
  function readData(key) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) return {};

      const value = JSON.parse(raw);

      if (!isRecord(value)) {
        throw new Error("Invalid saved data");
      }

      return value;
    } catch {
      notify(
        "Saved information could not be loaded. " +
        "Browser storage may be disabled or contain invalid data.",
        true
      );

      return {};
    }
  }

  function saveData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      notify(
        "Changes could not be saved. " +
        "Browser storage may be full or disabled.",
        true
      );

      return false;
    }
  }

  // Validate saved category selections.
  function categoryOrders() {
    const raw = readData("categoryOrders");
    const clean = {};

    categories.forEach((category) => {
      clean[category] = {};

      const saved = isRecord(raw[category])
        ? raw[category]
        : {};

      flavors.forEach((flavor) => {
        const quantity = saved[flavor];

        if (
          Number.isInteger(quantity) &&
          quantity >= 0 &&
          quantity <= 4
        ) {
          clean[category][flavor] = quantity;
        }
      });
    });

    return clean;
  }

  // Validate saved custom instructions.
  function customOrders() {
    const raw = readData("customOrders");
    const clean = {};

    categories.forEach((category) => {
      if (typeof raw[category] === "string") {
        const text = raw[category].trim();

        if (text && text.length <= 500) {
          clean[category] = text;
        }
      }
    });

    return clean;
  }

  function setExpanded(selector, attribute, selected) {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        String(button.dataset[attribute] === selected)
      );
    });
  }

  // CATEGORY PAGE
  function openCategory(category, focusHeading = true) {
    if (
      !categories.includes(category) ||
      !byId("flavors-tbody")
    ) {
      return;
    }

    selectedCategory = category;

    const orders = categoryOrders();
    const tbody = byId("flavors-tbody");

    byId("active-cat-label").textContent = category;
    tbody.replaceChildren();

    flavors.forEach((flavor) => {
      const row = document.createElement("tr");
      const flavorCell = document.createElement("th");
      const quantityCell = document.createElement("td");
      const select = document.createElement("select");

      flavorCell.scope = "row";
      flavorCell.textContent = flavor;

      select.setAttribute(
        "aria-label",
        `Quantity of ${flavor} ${category}`
      );

      for (let number = 0; number <= 4; number++) {
        const option = document.createElement("option");

        option.value = String(number);
        option.textContent = String(number);

        select.append(option);
      }

      select.value = String(orders[category][flavor] || 0);

      let previous = select.value;

      select.addEventListener("change", () => {
        const updated = categoryOrders();
        const quantity = Number(select.value);

        if (
          !Number.isInteger(quantity) ||
          quantity < 0 ||
          quantity > 4
        ) {
          return;
        }

        updated[category][flavor] = quantity;

        if (saveData("categoryOrders", updated)) {
          previous = select.value;

          notify(
            `${category}: ${flavor} quantity saved as ${quantity}.`
          );
        } else {
          select.value = previous;
        }
      });

      quantityCell.append(select);
      row.append(flavorCell, quantityCell);
      tbody.append(row);
    });

    byId("category-sub-panel").hidden = false;

    setExpanded("[data-category]", "category", category);

    if (focusHeading) {
      byId("flavour-heading").focus();
    }
  }

  // CUSTOM PAGE
  function openCustom(category) {
    if (!categories.includes(category)) return;

    chosenItem = category;

    byId("item-title").textContent = `Custom ${category}`;
    byId("note-box").value = customOrders()[category] || "";
    byId("form-area").hidden = false;

    setExpanded("[data-custom]", "custom", category);

    byId("note-box").focus();
  }

  // CHECKOUT PAGE
  function orderLines() {
    const lines = [];
    const orders = categoryOrders();
    const custom = customOrders();

    categories.forEach((category) => {
      flavors.forEach((flavor) => {
        const quantity = orders[category][flavor];

        if (quantity > 0) {
          lines.push({
            type: "category",
            text: `${category} — ${flavor}: ${quantity}`
          });
        }
      });

      if (custom[category]) {
        lines.push({
          type: "custom",
          text: `${category}: ${custom[category]}`
        });
      }
    });

    return lines;
  }

  function showData() {
    if (!byId("category-data")) return;

    const lines = orderLines();

    ["category", "custom"].forEach((type) => {
      const container = byId(`${type}-data`);
      container.replaceChildren();

      const matching = lines.filter(
        (line) => line.type === type
      );

      if (!matching.length) {
        const empty = document.createElement("p");

        empty.textContent = type === "category"
          ? "No items selected."
          : "No custom instructions saved.";

        container.append(empty);
      }

      matching.forEach((line) => {
        const paragraph = document.createElement("p");

        // Display customer input as text, never HTML.
        paragraph.textContent = line.text;

        container.append(paragraph);
      });
    });
  }

  // Remove passwords saved by the original account code.
  function cleanLegacyProfile() {
    try {
      const raw = localStorage.getItem("userProfile");

      if (!raw) return;

      let profile;

      try {
        profile = JSON.parse(raw);
      } catch {
        localStorage.removeItem("userProfile");
        return;
      }

      if (!isRecord(profile)) {
        localStorage.removeItem("userProfile");
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(profile, "password")
      ) {
        localStorage.removeItem("userProfile");

        if (typeof profile.gmail === "string") {
          saveData("userProfile", {
            gmail: profile.gmail
          });
        }
      }
    } catch {
      notify(
        "Browser storage is unavailable. Any previously saved " +
        "password could not be checked or removed. " +
        "Clear this site's data in your browser settings.",
        true
      );
    }
  }

  cleanLegacyProfile();

  // Highlight the current navigation link.
  const current =
    location.pathname.split("/").pop() || "Homepage.html";

  document.querySelectorAll("nav a").forEach((link) => {
    const linkedPage = new URL(link.href)
      .pathname.split("/")
      .pop();

    if (linkedPage === current) {
      link.setAttribute("aria-current", "page");
    }
  });

  // Category buttons
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      openCategory(button.dataset.category);
    });
  });

  // Custom category buttons
  document.querySelectorAll("[data-custom]").forEach((button) => {
    button.addEventListener("click", () => {
      openCustom(button.dataset.custom);
    });
  });

  // Custom form submission
  byId("form-area")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const note = byId("note-box");
    const text = note.value.trim();

    if (!categories.includes(chosenItem)) return;

    if (text.length > 500) {
      notify("Please use no more than 500 characters.", true);
      note.focus();
      return;
    }

    const saved = customOrders();

    if (text) {
      saved[chosenItem] = text;
    } else {
      delete saved[chosenItem];
    }

    if (saveData("customOrders", saved)) {
      notify(
        `${chosenItem} instructions ${text ? "saved" : "removed"}.`
      );
    }
  });

  // Account profile toggle
  byId("profile-toggle")?.addEventListener("click", () => {
    const form = byId("invoice-box");
    const expanded = form.hidden;

    form.hidden = !expanded;

    byId("profile-toggle").setAttribute(
      "aria-expanded",
      String(expanded)
    );

    if (expanded) {
      const profile = readData("userProfile");

      byId("acc-gmail").value =
        typeof profile.gmail === "string"
          ? profile.gmail
          : "";

      byId("acc-gmail").focus();
    }
  });

  // Save email only, not a password.
  byId("invoice-box")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = byId("acc-gmail");
    email.value = email.value.trim();

    if (!event.currentTarget.reportValidity()) return;

    if (saveData("userProfile", { gmail: email.value })) {
      location.href = "Homepage.html";
    }
  });

  // Clear an order.
  byId("cancel-order")?.addEventListener("click", () => {
    if (!orderLines().length) {
      notify("Your order is already empty.");
      return;
    }

    const confirmed = window.confirm(
      "Clear all selected items and custom instructions?"
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem("categoryOrders");
      localStorage.removeItem("customOrders");

      showData();
      notify("Your order has been cleared.");
    } catch {
      showData();

      notify(
        "Your order could not be fully cleared. " +
        "Please check browser storage settings.",
        true
      );
    }
  });

  // Confirm a demonstration summary.
  byId("confirm-order")?.addEventListener("click", () => {
    if (!orderLines().length) {
      notify(
        "Select an item or save custom instructions before confirming.",
        true
      );
      return;
    }

    byId("checkout-box").hidden = true;
    byId("thanks-box").hidden = false;
    byId("thanks-heading").focus();
  });

  // Return to the order summary.
  byId("review-order")?.addEventListener("click", () => {
    byId("thanks-box").hidden = true;
    byId("checkout-box").hidden = false;

    showData();
    byId("confirm-order").focus();
  });

  showData();

  // Update the displayed order when another tab changes storage.
  window.addEventListener("storage", (event) => {
    if (
      event.key === null ||
      ["categoryOrders", "customOrders"].includes(event.key)
    ) {
      showData();

      if (selectedCategory) {
        openCategory(selectedCategory, false);
      }

      if (
        byId("thanks-box") &&
        !byId("thanks-box").hidden
      ) {
        byId("thanks-box").hidden = true;
        byId("checkout-box").hidden = false;
      }

      if (chosenItem) {
        notify(
          "Saved order information changed in another tab. " +
          "Your unsaved instructions have not been overwritten."
        );
      }
    }
  });

  // Homepage animation, respecting reduced-motion preferences.
  const hero = document.querySelector(".welcome-hero");

  if (
    hero &&
    typeof hero.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    hero.animate(
      [
        { opacity: 0, transform: "translateY(15px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      {
        duration: 500,
        easing: "ease-out"
      }
    );
  }
})();