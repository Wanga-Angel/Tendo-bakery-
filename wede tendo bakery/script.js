"use strict";

(() => {
  const config = window.TENDO_CONFIG;
  if (!config) return;

  const byId = (id) => document.getElementById(id);

  const isRecord = (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

  const products = [
    {
      name: "Cakes",
      image: "cakes.jpeg",
      description:
        "Choose flavours and quantities, or add custom cake instructions."
    },
    {
      name: "Cupcakes",
      image: "cupcakes.jpeg",
      description:
        "Choose cupcake flavours and save your preferred quantities."
    },
    {
      name: "Muffins",
      image: "muffins.jpeg",
      description:
        "Explore muffin flavours and prepare your order summary."
    },
    {
      name: "Cinnamon rolls",
      image: "cinnamon rolls.jpeg",
      description:
        "Select cinnamon roll flavours or add special instructions."
    }
  ];

  const categories = products.map((product) => product.name);

  const flavors = [
    "Vanilla",
    "chocolate",
    "chocolate chipped",
    "caramel",
    "raspberries"
  ];

  let selectedCategory = "";
  let chosenItem = "";

  // --------------------------------------------------
  // Messages and browser storage
  // --------------------------------------------------

  function notify(message, error = false, id = "toast") {
    const status = byId(id) || byId("toast");
    if (!status) return;

    status.textContent = message;
    status.className = error
      ? "message message-error"
      : "message";

    status.hidden = false;
  }

  function readData(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};

      const value = JSON.parse(raw);

      if (!isRecord(value)) {
        throw new Error("Invalid saved data");
      }

      return value;
    } catch {
      notify(
        "Saved information could not be read. Browser storage " +
        "may be disabled or contain invalid data.",
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
        "Changes could not be saved. Browser storage " +
        "may be full or disabled.",
        true
      );

      return false;
    }
  }

  function categoryOrders() {
    const raw = readData("categoryOrders");
    const clean = {};

    categories.forEach((category) => {
      clean[category] = {};

      const values = isRecord(raw[category])
        ? raw[category]
        : {};

      flavors.forEach((flavor) => {
        const quantity = values[flavor];

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

  function orderLines() {
    const lines = [];
    const orders = categoryOrders();
    const notes = customOrders();

    categories.forEach((category) => {
      flavors.forEach((flavor) => {
        const quantity = orders[category][flavor];

        if (quantity > 0) {
          lines.push({
            type: "category",
            quantity,
            text: `${category} — ${flavor}: ${quantity}`
          });
        }
      });

      if (notes[category]) {
        lines.push({
          type: "custom",
          text: `${category}: ${notes[category]}`
        });
      }
    });

    return lines;
  }

  function orderSummary() {
    const lines = orderLines();

    return lines.length
      ? lines.map((line) => line.text).join("\n")
      : "No saved selections.";
  }

  function setExpanded(selector, attribute, selected) {
    document.querySelectorAll(selector).forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        String(button.dataset[attribute] === selected)
      );
    });
  }

  // --------------------------------------------------
  // Categories: dynamic content, search and sorting
  // --------------------------------------------------

  function renderCategories() {
    const container = byId("category-grid");
    if (!container) return;

    const query = (byId("product-search")?.value || "")
      .trim()
      .toLowerCase();

    const direction =
      byId("product-sort")?.value === "za" ? -1 : 1;

    const visible = products.filter((product) => {
      const searchable =
        `${product.name} ${product.description} ${flavors.join(" ")}`;

      return searchable.toLowerCase().includes(query);
    });

    visible.sort(
      (a, b) => direction * a.name.localeCompare(b.name)
    );

    container.replaceChildren();

    visible.forEach((product) => {
      const article = document.createElement("article");
      article.className = "card category-card";

      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      image.width = 400;
      image.height = 300;
      image.className = "product-image";
      image.decoding = "async";

      const heading = document.createElement("h3");
      heading.textContent = product.name;

      const description = document.createElement("p");
      description.textContent = product.description;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent =
        `Choose ${product.name.toLowerCase()}`;

      button.dataset.category = product.name;

      button.setAttribute(
        "aria-controls",
        "category-sub-panel"
      );

      button.setAttribute(
        "aria-expanded",
        String(selectedCategory === product.name)
      );

      button.addEventListener("click", () => {
        openCategory(product.name);
      });

      article.append(image, heading, description, button);
      container.append(article);
    });

    byId("search-results").textContent =
      `${visible.length} ` +
      `${visible.length === 1 ? "category" : "categories"} found.`;
  }

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

      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = flavor;

      const cell = document.createElement("td");
      const select = document.createElement("select");

      select.setAttribute(
        "aria-label",
        `Quantity of ${flavor} ${category}`
      );

      for (let quantity = 0; quantity <= 4; quantity++) {
        const option = document.createElement("option");

        option.value = String(quantity);
        option.textContent = String(quantity);

        select.append(option);
      }

      select.value = String(orders[category][flavor] || 0);

      let previous = select.value;

      select.addEventListener("change", () => {
        const quantity = Number(select.value);

        if (
          !Number.isInteger(quantity) ||
          quantity < 0 ||
          quantity > 4
        ) {
          return;
        }

        const updated = categoryOrders();
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

      cell.append(select);
      row.append(heading, cell);
      tbody.append(row);
    });

    byId("category-sub-panel").hidden = false;
    setExpanded("[data-category]", "category", category);

    if (focusHeading) {
      byId("flavour-heading").focus();
    }
  }

  // --------------------------------------------------
  // Custom instructions and order draft
  // --------------------------------------------------

  function openCustom(category) {
    if (!categories.includes(category)) return;

    chosenItem = category;

    byId("item-title").textContent = `Custom ${category}`;
    byId("note-box").value = customOrders()[category] || "";
    byId("form-area").hidden = false;

    setExpanded("[data-custom]", "custom", category);

    byId("note-box").focus();
  }

  function renderOrder() {
    if (!byId("category-data")) return;

    const lines = orderLines();

    ["category", "custom"].forEach((type) => {
      const container = byId(`${type}-data`);
      container.replaceChildren();

      const matching = lines.filter(
        (line) => line.type === type
      );

      if (!matching.length) {
        const text = document.createElement("p");

        text.textContent = type === "category"
          ? "No items selected."
          : "No custom instructions saved.";

        container.append(text);
      }

      matching.forEach((line) => {
        const paragraph = document.createElement("p");

        // Customer text is never interpreted as HTML.
        paragraph.textContent = line.text;

        container.append(paragraph);
      });
    });
  }

  // --------------------------------------------------
  // Profile cleanup and validation
  // --------------------------------------------------

  function cleanLegacyProfile() {
    try {
      const raw = localStorage.getItem("userProfile");
      if (!raw) return;

      let value;

      try {
        value = JSON.parse(raw);
      } catch {
        localStorage.removeItem("userProfile");
        return;
      }

      if (
        !isRecord(value) ||
        Object.prototype.hasOwnProperty.call(value, "password") ||
        value.consent !== true
      ) {
        localStorage.removeItem("userProfile");
      }
    } catch {
      notify(
        "Browser storage is unavailable. Old saved credentials " +
        "could not be checked. Clear this site's data in browser " +
        "settings if necessary.",
        true
      );
    }
  }

  function readProfile() {
    const value = readData("userProfile");

    if (value.consent !== true) return {};

    return {
      name: typeof value.name === "string"
        ? value.name.slice(0, 100)
        : "",

      email: typeof value.email === "string"
        ? value.email.slice(0, 254)
        : "",

      phone: typeof value.phone === "string"
        ? value.phone.slice(0, 30)
        : "",

      preferredCategory:
        categories.includes(value.preferredCategory)
          ? value.preferredCategory
          : "",

      consent: true
    };
  }

  function renderProfileSummary() {
    if (!byId("profile-summary")) return;

    const profile = readProfile();

    byId("profile-summary").textContent = profile.name
      ? `Welcome, ${profile.name}. Your profile is saved ` +
        "in this browser only."
      : "No profile is saved. Add your details below to reuse " +
        "them in enquiry and contact forms.";

    const lines = orderLines();

    const units = lines.reduce(
      (total, line) => total + (line.quantity || 0),
      0
    );

    const notes = lines.filter(
      (line) => line.type === "custom"
    ).length;

    byId("saved-order-summary").textContent =
      `${units} selected items and ${notes} saved custom ` +
      `${notes === 1 ? "note" : "notes"}. ` +
      "This is a draft, not purchase history.";
  }

  function validateForm(form) {
    form.querySelectorAll(
      'input[type="text"], input[type="email"], ' +
      'input[type="tel"], textarea'
    ).forEach((field) => {
      field.value = field.value.trim();
      field.setCustomValidity("");

      if (field.required && !field.value) {
        field.setCustomValidity("Please complete this field.");
      }
    });

    form.querySelectorAll('input[type="tel"]').forEach((field) => {
      const digits = field.value.replace(/\D/g, "");

      if (
        field.value &&
        (
          !/^[+\d\s().-]+$/.test(field.value) ||
          digits.length < 7 ||
          digits.length > 15
        )
      ) {
        field.setCustomValidity(
          "Enter a phone number with 7–15 digits. " +
          "Spaces, +, brackets and hyphens are allowed."
        );
      }
    });

    const date = form.querySelector(
      'input[name="desiredDate"]'
    );

    if (date) {
      const now = new Date();

      const today =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}`;

      date.min = today;

      date.setCustomValidity(
        date.value && date.value < today
          ? "Choose today or a future date."
          : ""
      );
    }

    const valid = form.reportValidity();

    if (!valid) {
      notify(
        "Please correct the highlighted field before continuing.",
        true
      );
    }

    return valid;
  }

  // --------------------------------------------------
  // Configurable AJAX submission
  // --------------------------------------------------

  function usableEndpoint(raw) {
    if (
      config.submissionMode !== "live" ||
      typeof raw !== "string" ||
      !raw.trim()
    ) {
      return "";
    }

    try {
      const url = new URL(raw, location.href);

      const localHttp =
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname);

      if (url.protocol === "https:" || localHttp) {
        return url.href;
      }
    } catch {
      // Invalid endpoints remain disabled.
    }

    return "";
  }

  async function postForm(form, endpoint, button, kind) {
    if (!endpoint || config.submissionMode !== "live") {
      notify(
        "Demo mode: nothing was sent online. " +
        "Configure and test a real submission service first.",
        true
      );
      return;
    }

    const body = new FormData(form);
    body.set("formType", kind);

    if (body.get("includeOrder") === "yes") {
      body.set("orderSummary", orderSummary());
    }

    body.delete("includeOrder");

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs
    );

    button.disabled = true;
    form.setAttribute("aria-busy", "true");

    notify("Sending your details…");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body,
        signal: controller.signal,
        credentials: "omit"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      notify(
        "The configured server accepted your submission. " +
        "Email delivery, prices, account creation and availability " +
        "are not confirmed. Your form has been kept for reference."
      );
    } catch (error) {
      notify(
        error.name === "AbortError"
          ? "The request timed out. Delivery status is unknown; " +
            "check before trying again."
          : "Submission could not be confirmed. Check your " +
            "connection or use an email draft. Do not assume " +
            "the details were delivered.",
        true
      );
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  }

  // --------------------------------------------------
  // Account page
  // --------------------------------------------------

  function syncProfileHidden(form) {
    if (!form) return;

    const selected = form.elements
      .namedItem("preferredCategory").value;

    byId("customerPrefs").value = JSON.stringify({
      preferredCategory: categories.includes(selected)
        ? selected
        : ""
    });

    byId("orderSummaryData").value = JSON.stringify({
      items: categoryOrders(),
      customInstructions: customOrders()
    });
  }

  function initProfile() {
    const form = byId("bakeryOrderForm");
    if (!form) return;

    const profile = readProfile();

    const fieldNames = {
      name: "customer_name",
      email: "email",
      phone: "phone_number",
      preferredCategory: "preferredCategory"
    };

    Object.entries(fieldNames).forEach(([key, field]) => {
      form.elements.namedItem(field).value = profile[key] || "";
    });

    form.elements.namedItem("remember").checked =
      profile.consent === true;

    const endpoint = usableEndpoint(config.profileEndpoint);

    const onlineButton = form.querySelector(
      "[data-profile-send-online]"
    );

    onlineButton.disabled = !endpoint;

    byId("profile-service-status").textContent = endpoint
      ? "An online profile endpoint is configured. Submitting " +
        "details does not create a secure login or confirm an order."
      : "Demo mode: details can be saved locally only. " +
        "The website root is not a verified processing service, " +
        "so online sending is disabled.";

    renderProfileSummary();
    syncProfileHidden(form);

    form.addEventListener("change", () => {
      syncProfileHidden(form);
    });

    form.addEventListener("submit", async (event) => {
      // Always stop normal submission to the website root.
      event.preventDefault();

      if (!validateForm(form)) return;

      syncProfileHidden(form);

      const onlineRequested =
        event.submitter?.hasAttribute(
          "data-profile-send-online"
        ) === true;

      if (onlineRequested) {
        await postForm(form, endpoint, onlineButton, "profile");
        return;
      }

      const data = new FormData(form);

      if (data.get("remember") !== "yes") return;

      const preferred = data.get("preferredCategory");

      const next = {
        name: data.get("customer_name"),
        email: data.get("email"),
        phone: data.get("phone_number"),
        preferredCategory: categories.includes(preferred)
          ? preferred
          : "",
        consent: true
      };

      if (saveData("userProfile", next)) {
        renderProfileSummary();

        notify(
          "Profile saved in this browser only. " +
          "It has not been sent to the bakery."
        );
      }
    });

    form.querySelector("[data-save-profile]").disabled = false;

    byId("clear-profile").addEventListener("click", () => {
      const confirmed = window.confirm(
        "Remove your saved profile from this browser? " +
        "Your draft order will remain."
      );

      if (!confirmed) return;

      try {
        localStorage.removeItem("userProfile");
        form.reset();
        form.elements.namedItem("remember").checked = false;

        syncProfileHidden(form);
        renderProfileSummary();

        notify(
          "Saved profile removed. Your draft order has not been cleared."
        );
      } catch {
        notify(
          "The saved profile could not be removed. " +
          "Check browser storage settings.",
          true
        );
      }
    });
  }

  // --------------------------------------------------
  // Image gallery and lightbox
  // --------------------------------------------------

  function initGallery() {
    const dialog = byId("lightbox");
    if (!dialog) return;

    let index = 0;
    let opener = null;

    function showImage(next) {
      index = (next + products.length) % products.length;

      byId("lightbox-image").src = products[index].image;
      byId("lightbox-image").alt = products[index].name;

      byId("lightbox-caption").textContent =
        `${products[index].name} — image ` +
        `${index + 1} of ${products.length}`;
    }

    document.querySelectorAll("[data-gallery]").forEach((button) => {
      button.addEventListener("click", () => {
        opener = button;
        showImage(Number(button.dataset.gallery));

        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          location.href = products[index].image;
        }
      });
    });

    byId("lightbox-close").addEventListener("click", () => {
      dialog.close();
    });

    byId("lightbox-prev").addEventListener("click", () => {
      showImage(index - 1);
    });

    byId("lightbox-next").addEventListener("click", () => {
      showImage(index + 1);
    });

    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showImage(index + 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showImage(index - 1);
      }
    });

    dialog.addEventListener("close", () => {
      opener?.focus();
    });
  }

  // --------------------------------------------------
  // Interactive Leaflet map
  // --------------------------------------------------

  function initMap() {
    if (!byId("map")) return;

    if (!window.L) {
      byId("map-status").textContent =
        "The interactive map could not load. " +
        "The address and external map link remain available.";
      return;
    }

    try {
      const map = window.L.map("map", {
        scrollWheelZoom: false
      }).setView(
        [config.latitude, config.longitude],
        14
      );

      window.L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            "OpenStreetMap</a> contributors"
        }
      ).addTo(map);

      const text = document.createElement("p");

      text.textContent =
        `${config.businessName}: ${config.address}`;

      window.L.marker([
        config.latitude,
        config.longitude
      ])
        .addTo(map)
        .bindPopup(text)
        .openPopup();

      byId("map-status").textContent =
        "Use the controls to zoom or drag to explore. " +
        "The map uses the coordinates supplied for this project.";
    } catch {
      byId("map-status").textContent =
        "The map is unavailable. Use the address or external map link.";
    }
  }

  // --------------------------------------------------
  // Enquiry preview and email drafts
  // --------------------------------------------------

  function prepareEnquiry(form) {
    const values = new FormData(form);

    const parts = [
      `Enquiry about ${values.get("product")} ` +
      `for a requested quantity of ${values.get("quantity")}.`,

      "Price, availability and collection arrangements must be " +
      "confirmed by the bakery. No quote or reservation has been made."
    ];

    if (values.get("desiredDate")) {
      parts.push(
        `Requested date: ${values.get("desiredDate")}. ` +
        "This is not confirmed."
      );
    }

    notify(parts.join(" "), false, "enquiry-result");
  }

  function emailDraft(form, kind) {
    if (!validateForm(form)) return;

    if (kind === "enquiry") {
      prepareEnquiry(form);
    }

    const data = new FormData(form);

    const subject = kind === "enquiry"
      ? `Tendo Bakery enquiry: ${data.get("product")}`
      : `Tendo Bakery: ${data.get("messageType")}`;

    const labels = {
      name: "Name",
      email: "Email",
      phone: "Phone",
      product: "Product",
      quantity: "Requested quantity",
      desiredDate: "Requested date (not confirmed)",
      messageType: "Message type",
      message: "Message"
    };

    const lines = [];

    Object.entries(labels).forEach(([key, label]) => {
      if (data.get(key)) {
        lines.push(`${label}: ${data.get(key)}`);
      }
    });

    if (data.get("includeOrder") === "yes") {
      lines.push(
        `\nSaved draft selections:\n${orderSummary()}`
      );
    }

    lines.push(
      "\nThis is an enquiry, not a confirmed order or payment."
    );

    notify(
      "Opening an email draft. Review it and press Send in your " +
      "email app. This website has not sent the message."
    );

    location.href =
      `mailto:${config.contactEmail}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(lines.join("\n\n"))}`;
  }

  function initMessageForms() {
    document.querySelectorAll("[data-ajax-kind]").forEach((form) => {
      const kind = form.dataset.ajaxKind;

      const endpoint = usableEndpoint(
        kind === "enquiry"
          ? config.enquiryEndpoint
          : config.contactEndpoint
      );

      const send = form.querySelector("[data-send-online]");
      send.disabled = !endpoint;

      form.querySelector("[data-service-status]").textContent =
        endpoint
          ? "Online submission is configured. Server acceptance " +
            "does not confirm an order."
          : "Demo mode: online sending is disabled. Prepare an " +
            "email draft and send it yourself in your email app.";

      if (endpoint) {
        form.action = endpoint;
      }

      const profile = readProfile();

      ["name", "email", "phone"].forEach((key) => {
        const field = form.elements.namedItem(key);

        if (field && profile[key]) {
          field.value = profile[key];
        }
      });

      const product = form.elements.namedItem("product");

      if (
        product &&
        categories.includes(profile.preferredCategory)
      ) {
        product.value = profile.preferredCategory;
      }

      const date = form.elements.namedItem("desiredDate");

      if (date) {
        const now = new Date();

        date.min =
          `${now.getFullYear()}-` +
          `${String(now.getMonth() + 1).padStart(2, "0")}-` +
          `${String(now.getDate()).padStart(2, "0")}`;
      }

      form.querySelector("[data-email-draft]")
        .addEventListener("click", () => {
          emailDraft(form, kind);
        });

      form.querySelector("[data-preview-enquiry]")
        ?.addEventListener("click", () => {
          if (validateForm(form)) {
            prepareEnquiry(form);
            notify("Enquiry preview prepared. Nothing has been sent.");
          }
        });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(form)) return;

        if (kind === "enquiry") {
          prepareEnquiry(form);
        }

        await postForm(form, endpoint, send, kind);
      });
    });
  }

  // --------------------------------------------------
  // Initialise the page
  // --------------------------------------------------

  cleanLegacyProfile();

  const current =
    location.pathname.split("/").pop() || "Homepage.html";

  document.querySelectorAll("nav a").forEach((link) => {
    const page = new URL(link.href).pathname.split("/").pop();

    if (page === current) {
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      field.setCustomValidity("");
    });
  });

  renderCategories();

  byId("product-search")?.addEventListener(
    "input",
    renderCategories
  );

  byId("product-sort")?.addEventListener(
    "change",
    renderCategories
  );

  document.querySelectorAll("[data-custom]").forEach((button) => {
    button.addEventListener("click", () => {
      openCustom(button.dataset.custom);
    });
  });

  byId("form-area")?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (
      !validateForm(event.currentTarget) ||
      !categories.includes(chosenItem)
    ) {
      return;
    }

    const text = byId("note-box").value.trim();

    if (text.length > 500) {
      notify("Please use no more than 500 characters.", true);
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

  byId("cancel-order")?.addEventListener("click", () => {
    if (!orderLines().length) {
      notify("Your draft order is already empty.");
      return;
    }

    const confirmed = window.confirm(
      "Clear all selected items and custom instructions? " +
      "Your profile will remain."
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem("categoryOrders");
      localStorage.removeItem("customOrders");

      renderOrder();
      notify("Draft order cleared.");
    } catch {
      renderOrder();

      notify(
        "The order could not be fully cleared. " +
        "Check browser storage settings.",
        true
      );
    }
  });

  byId("confirm-order")?.addEventListener("click", () => {
    if (!orderLines().length) {
      notify(
        "Select items or save custom instructions " +
        "before reviewing a summary.",
        true
      );
      return;
    }

    byId("checkout-box").hidden = true;
    byId("thanks-box").hidden = false;
    byId("thanks-heading").focus();
  });

  byId("review-order")?.addEventListener("click", () => {
    byId("thanks-box").hidden = true;
    byId("checkout-box").hidden = false;

    renderOrder();
    byId("confirm-order").focus();
  });

  renderOrder();
  initProfile();
  initGallery();
  initMap();
  initMessageForms();

  window.addEventListener("storage", (event) => {
    if (
      event.key === null ||
      ["categoryOrders", "customOrders"].includes(event.key)
    ) {
      renderOrder();
      renderProfileSummary();
      syncProfileHidden(byId("bakeryOrderForm"));

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
          "Saved selections changed in another tab. " +
          "Your unsaved instructions were not overwritten."
        );
      }
    }

    if (
      event.key === "userProfile" ||
      event.key === null
    ) {
      renderProfileSummary();
    }
  });

  const hero = document.querySelector(".welcome-hero");

  if (
    hero &&
    typeof hero.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    hero.animate(
      [
        {
          opacity: 0,
          transform: "translateY(15px)"
        },
        {
          opacity: 1,
          transform: "translateY(0)"
        }
      ],
      {
        duration: 500,
        easing: "ease-out"
      }
    );
  }
})();