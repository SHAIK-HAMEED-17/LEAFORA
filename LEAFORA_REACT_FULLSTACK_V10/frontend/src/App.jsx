import React, { useMemo, useState } from "react";
import { getUnitPrice, products } from "./products";
import { login, registerAccount, sendOtp, verifyOtp } from "./api";

function App() {
  const [page, setPage] = useState("auth");
  const [authMode, setAuthMode] = useState("register");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "", mobile: "", otp: "" });
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", city: "", pincode: "" });
  const [payment, setPayment] = useState("cod");
  const [orders, setOrders] = useState([]);
  const [orderMessage, setOrderMessage] = useState("");

  const matchesSearch = (product) => product.name.toLowerCase().includes(search.toLowerCase());
  const trees = useMemo(() => products.filter((p) => p.type === "tree" && matchesSearch(p)), [search]);
  const fruits = useMemo(() => products.filter((p) => p.type === "fruit" && matchesSearch(p)), [search]);
  const vegetables = useMemo(() => products.filter((p) => p.type === "vegetable" && matchesSearch(p)), [search]);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function validateCaptcha() {
    return captchaChecked;
  }

  async function handleRegisterStart(event) {
    event.preventDefault();
    setMessage("");
    if (!form.username.trim()) return setMessage("Please enter your username.");
    if (form.password.length < 6) return setMessage("Password must contain at least 6 characters.");
    if (form.password !== form.confirmPassword) return setMessage("Password and confirm password do not match.");
    if (!/^[0-9]{10}$/.test(form.mobile)) return setMessage("Enter a valid 10-digit mobile number.");
    if (!validateCaptcha()) return setMessage("Please tick I'm not a robot before continuing.");
    try {
      await registerAccount({ username: form.username.trim(), password: form.password, mobile: form.mobile });
      const otpResult = await sendOtp({ mobile: form.mobile });
      setDemoOtp(otpResult.demoOtp || "");
      setStep(2);
      setMessage("Demo OTP generated. Enter the code shown below.");
    } catch (error) { setMessage(error.message); }
  }

  async function resendDemoOtp() {
    try {
      const otpResult = await sendOtp({ mobile: form.mobile });
      setDemoOtp(otpResult.demoOtp || "");
      setForm((current) => ({ ...current, otp: "" }));
      setMessage("A new demo OTP was generated.");
    } catch (error) { setMessage(error.message); }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setMessage("");
    if (!/^[0-9]{4,10}$/.test(form.otp)) return setMessage("Enter the OTP shown below.");
    try {
      await verifyOtp({ mobile: form.mobile, code: form.otp });
      setCustomer((current) => ({ ...current, phone: form.mobile, name: form.username }));
      setPage("store");
      setMessage("");
    } catch (error) { setMessage(error.message); }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    if (!validateCaptcha()) return setMessage("Please tick I'm not a robot before continuing.");
    try {
      await login({ identifier: form.username.trim(), password: form.password });
      setCustomer((current) => ({ ...current, phone: /^[0-9]{10}$/.test(form.username) ? form.username : current.phone, name: current.name || form.username }));
      setPage("store");
    } catch (error) { setMessage(error.message); }
  }

  function addToCart(product) {
    const step = product.step || 1;
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      if (found) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + step, product.stock) } : item);
      }
      return [...current, { product, quantity: step }];
    });
  }

  function changeQuantity(id, amount) {
    setCart((current) => current.map((item) => item.product.id === id ? {
      ...item,
      quantity: Math.max(0, Math.min(item.quantity + amount * (item.product.step || 1), item.product.stock))
    } : item).filter((item) => item.quantity > 0));
  }

  const cartTotal = cart.reduce((total, item) => total + getUnitPrice(item.product, item.quantity) * item.quantity, 0);
  const savings = cart.reduce((total, item) => {
    const regular = item.product.price * item.quantity;
    const actual = getUnitPrice(item.product, item.quantity) * item.quantity;
    return total + Math.max(0, regular - actual);
  }, 0);

  function updateCustomer(event) {
    setCustomer({ ...customer, [event.target.name]: event.target.value });
  }

  function placeOrder(event) {
    event.preventDefault();
    setOrderMessage("");
    if (!cart.length) return setOrderMessage("Add products to your cart first.");
    if (!customer.name.trim() || !/^[0-9]{10}$/.test(customer.phone) || !customer.address.trim() || !customer.city.trim() || !/^\d{6}$/.test(customer.pincode)) {
      return setOrderMessage("Please fill name, 10-digit phone, address, city and 6-digit pincode.");
    }
    const order = {
      id: `LF${Date.now().toString().slice(-7)}`,
      date: new Date().toLocaleString("en-IN"),
      items: cart.map((item) => ({ name: item.product.name, quantity: item.quantity, unit: item.product.unit, total: getUnitPrice(item.product, item.quantity) * item.quantity })),
      total: cartTotal,
      payment: payment === "cod" ? "Cash on Delivery" : payment === "phonepe" ? "PhonePe" : "Google Pay",
      customer: { ...customer }
    };
    setOrders((current) => [order, ...current]);
    setCart([]);
    setOrderMessage(`Order ${order.id} placed successfully. ${order.payment === "Cash on Delivery" ? "Pay when your delivery arrives." : "Online payment selected for demo checkout."}`);
    document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
  }

  if (page === "store") {
    return <Store
      search={search} setSearch={setSearch} trees={trees} fruits={fruits} vegetables={vegetables}
      cart={cart} addToCart={addToCart} changeQuantity={changeQuantity} cartTotal={cartTotal} savings={savings}
      customer={customer} updateCustomer={updateCustomer} payment={payment} setPayment={setPayment}
      placeOrder={placeOrder} orders={orders} orderMessage={orderMessage}
      onLogout={() => { setPage("auth"); setAuthMode("login"); setStep(1); setDemoOtp(""); setForm({ username: "", password: "", confirmPassword: "", mobile: "", otp: "" }); }}
    />;
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="hero-leaf-orbit">🌿</div>
        <p className="eyebrow">WELCOME TO</p>
        <h1>LEAFORA</h1>
        <h2>Grow Green.<br />Live Fresh.</h2>
        <p className="hero-text">A greener marketplace for nursery plants, fresh fruits and everyday vegetables.</p>
        <div className="hero-pills"><span>🌳 Trees</span><span>🍎 Fruits</span><span>🥕 Vegetables</span></div>
      </div>

      <div className="auth-panel">
        <div className="auth-top"><p className="eyebrow">LEAFORA ACCOUNT</p><h2>{authMode === "register" ? step === 1 ? "Create your account" : "Verify your mobile" : "Sign in to LEAFORA"}</h2><p className="muted">{authMode === "register" ? step === 1 ? "One mobile number can create one account." : <>Enter the demo OTP shown below.<br />It changes whenever you send a new OTP.</> : "Login with your username or mobile number."}</p></div>
        <div className="auth-switch">
          <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setStep(1); setDemoOtp(""); setMessage(""); }}>Login</button>
          <button className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setStep(1); setDemoOtp(""); setMessage(""); }}>Create Account</button>
        </div>

        {authMode === "register" && step === 2 ? (
          <form onSubmit={handleVerifyOtp} className="form">
            <div className="step-label">STEP 2 OF 2</div>
            <div className="verified-user"><span>Username</span><strong>{form.username}</strong></div>
            <label>Mobile Number</label><div className="mobile-display"><span>+91</span><strong>{form.mobile}</strong></div>
            <label>OTP</label><input name="otp" value={form.otp} onChange={updateField} placeholder="Enter demo OTP" inputMode="numeric" maxLength="6" autoFocus />
            <div className="demo-otp-card"><span>DEMO OTP</span><strong>{demoOtp || "------"}</strong><small>New code every send • expires after 5 minutes • one-time use</small><button type="button" className="secondary-button" onClick={resendDemoOtp}>Send New Demo OTP</button></div>
            <button className="primary-button" type="submit">Verify OTP & Create Account</button>
            <button className="link-button" type="button" onClick={() => setStep(1)}>Change details</button>
          </form>
        ) : (
          <form onSubmit={authMode === "register" ? handleRegisterStart : handleLogin} className="form">
            <label>{authMode === "register" ? "Username" : "Username or Mobile Number"}</label>
            <input name="username" value={form.username} onChange={updateField} placeholder={authMode === "register" ? "Enter username" : "Enter username or mobile"} />
            <label>Password</label><input type="password" name="password" value={form.password} onChange={updateField} placeholder="Enter password" />
            {authMode === "register" && <><label>Confirm Password</label><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} placeholder="Re-enter password" /><label>Mobile Number</label><div className="phone-input"><span>+91</span><input name="mobile" value={form.mobile} onChange={updateField} placeholder="10-digit mobile number" inputMode="numeric" maxLength="10" /></div></>}
            <div className="robot-box"><input type="checkbox" checked={captchaChecked} onChange={(event) => setCaptchaChecked(event.target.checked)} /><div><strong>I'm not a robot</strong><small>Demo security check</small></div><span className="robot-icon">✓</span></div>
            <button className="primary-button" type="submit">{authMode === "register" ? "Continue & Send OTP" : "Login"}</button>
            {authMode === "login" && <button type="button" className="forgot-button" onClick={() => setMessage("Forgot password: mobile OTP reset can be connected to a real SMS provider later.")}>Forgot Password?</button>}
          </form>
        )}
        {message && <div className="message">{message}</div>}
        <p className="security-note">🔒 Secure account • Demo OTP mode for local testing</p>
      </div>
    </div>
  );
}

function Store({ search, setSearch, trees, fruits, vegetables, cart, addToCart, changeQuantity, cartTotal, savings, customer, updateCustomer, payment, setPayment, placeOrder, orders, orderMessage, onLogout }) {
  const cartItemCount = cart.reduce((total, item) => total + (item.product.unit === "kg" ? item.quantity : 1), 0);
  return (
    <div className="store-page">
      <header className="store-header">
        <a className="store-brand" href="#top"><span>🌱</span><div><strong>LEAFORA</strong><small>Grow Green. Live Fresh.</small></div></a>
        <div className="search-wrap"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fruits, vegetables, trees..." /></div>
        <nav className="top-links"><a href="#trees">Trees</a><a href="#fruits">Fruits</a><a href="#vegetables">Vegetables</a><a href="#support">Support</a></nav>
        <div className="header-actions"><a className="cart-top-button" href="#checkout">🛒 Cart <span>{cartItemCount}</span><small>₹{cartTotal.toFixed(0)}</small></a><button className="logout-button" onClick={onLogout}>Logout</button></div>
      </header>

      <main id="top">
        <section className="nature-hero">
          <div className="hero-copy"><p className="eyebrow">🌿 FRESH FROM NATURE</p><h1>Bring a little more<br /><span>green</span> into your life.</h1><p>Healthy plants for your home, fresh produce for your kitchen and simple quantity savings on every order.</p><div className="hero-actions"><a href="#trees" className="hero-button">Shop Plants</a><a href="#fruits" className="hero-button light">Fresh Fruits</a></div></div>
          <div className="hero-stat-card"><div>🌱</div><strong>LEAFORA MARKET</strong><span>Plants • Fruits • Vegetables</span><small>Market reference prices updated for September 2026.</small></div>
        </section>

        <section className="quick-nav"><a href="#trees">🌳 Nursery Plants</a><a href="#fruits">🍎 Fresh Fruits</a><a href="#vegetables">🥕 Fresh Vegetables</a><a href="#support">📞 Customer Support</a></section>

        <ProductSection id="trees" title="Nursery Trees & Plants" subtitle="Healthy-looking plants for gardens, balconies and home greenery." products={trees} onAdd={addToCart} />
        <ProductSection id="fruits" title="Fresh Fruits" subtitle="Everyday fruit prices kept close to current southern-market retail references." products={fruits} onAdd={addToCart} />
        <ProductSection id="vegetables" title="Fresh Vegetables" subtitle="Current Andhra Pradesh retail references are used as a practical price guide; local prices can vary by market and day." products={vegetables} onAdd={addToCart} />

        <section id="checkout" className="checkout-section">
          <div className="section-heading"><div><p className="eyebrow">YOUR ORDER</p><h2>Cart & Delivery</h2><p>Items stay in your cart until you remove them or place the order.</p></div><div className="cart-total-badge">₹{cartTotal.toFixed(0)}<small>cart total</small></div></div>
          <div className="checkout-grid">
            <div className="cart-box">
              <h3>🛒 Cart Items</h3>
              {!cart.length ? <div className="empty-cart">Your cart is empty. Add products from the sections above.</div> : cart.map((item) => <div className="cart-line" key={item.product.id}><div><strong>{item.product.name}</strong><small>{item.product.unit === "kg" ? `${item.quantity} kg` : `${item.quantity} ${item.product.unit}`}</small></div><div className="quantity"><button onClick={() => changeQuantity(item.product.id, -1)}>−</button><strong>{item.quantity}{item.product.unit === "kg" ? " kg" : ""}</strong><button onClick={() => changeQuantity(item.product.id, 1)}>+</button></div><strong>₹{(getUnitPrice(item.product, item.quantity) * item.quantity).toFixed(0)}</strong></div>)}
              {cart.length > 0 && <div className="cart-savings">Bulk savings: ₹{savings.toFixed(0)} • Total: ₹{cartTotal.toFixed(0)}</div>}
            </div>

            <form className="customer-box" onSubmit={placeOrder}>
              <h3>📦 Customer & Delivery</h3>
              <div className="two-inputs"><input name="name" value={customer.name} onChange={updateCustomer} placeholder="Full name" /><input name="phone" value={customer.phone} onChange={updateCustomer} placeholder="10-digit phone" maxLength="10" inputMode="numeric" /></div>
              <input name="address" value={customer.address} onChange={updateCustomer} placeholder="House / street / area" />
              <div className="two-inputs"><input name="city" value={customer.city} onChange={updateCustomer} placeholder="City / town" /><input name="pincode" value={customer.pincode} onChange={updateCustomer} placeholder="6-digit pincode" maxLength="6" inputMode="numeric" /></div>
              <h3 className="payment-title">💳 Payment Options</h3>
              <div className="payment-options"><label className={payment === "cod" ? "selected" : ""}><input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")} /> <span>Cash on Delivery<small>Pay when your order arrives</small></span></label><label className={payment === "phonepe" ? "selected" : ""}><input type="radio" checked={payment === "phonepe"} onChange={() => setPayment("phonepe")} /> <span>PhonePe<small>Online payment • demo checkout</small></span></label><label className={payment === "gpay" ? "selected" : ""}><input type="radio" checked={payment === "gpay"} onChange={() => setPayment("gpay")} /> <span>Google Pay<small>Online payment • demo checkout</small></span></label></div>
              <button className="place-order" type="submit">Place Order • ₹{cartTotal.toFixed(0)}</button>
              {orderMessage && <div className="order-message">{orderMessage}</div>}
            </form>
          </div>
        </section>

        <section id="orders" className="orders-section"><div className="section-heading"><div><p className="eyebrow">ORDER HISTORY</p><h2>My Orders</h2></div></div>{orders.length === 0 ? <p className="muted">Your completed orders will appear here.</p> : <div className="orders-grid">{orders.map((order) => <article className="order-card" key={order.id}><div><strong>{order.id}</strong><span>{order.date}</span></div><p>{order.items.map((item) => `${item.name} × ${item.quantity}${item.unit === "kg" ? " kg" : ""}`).join(" • ")}</p><strong>₹{order.total.toFixed(0)} • {order.payment}</strong></article>)}</div>}</section>

        <section id="support" className="support-section"><div><p className="eyebrow">NEED HELP?</p><h2>Customer Support</h2><p>Questions about plants, produce, delivery or your order? Contact LEAFORA directly.</p></div><div className="support-links"><a href="tel:6300292352">📞 Call: 6300292352</a><a href="mailto:hameedsk1718@gmail.com">✉️ Email: hameedsk1718@gmail.com</a><a href="https://wa.me/916300292352" target="_blank" rel="noreferrer">💬 WhatsApp Support</a></div></section>
      </main>
      <footer>© 2026 LEAFORA • Grow Green. Live Fresh. • Prices are market references and may change by location/day.</footer>
    </div>
  );
}

function ProductSection({ id, title, subtitle, products, onAdd }) {
  return <section id={id} className="product-section"><div className="section-heading"><div><p className="eyebrow">LEAFORA COLLECTION</p><h2>{title}</h2><p>{subtitle}</p></div><span className="count-pill">{products.length} items</span></div>{products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => onAdd(product)} />)}</div> : <div className="no-results">No matching items in this section. Try another search.</div>}</section>;
}

function ProductCard({ product, onAdd }) {
  const step = product.step || 1;
  const hasDiscount = Boolean(product.discount);
  return <article className="product-card"><div className="product-image-wrap"><img src={product.image} alt={product.name} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement.classList.add("image-missing"); }} /><span className="product-tag">{product.tag}</span></div><div className="product-body"><h3>{product.name}</h3><p className="stock">{product.unit === "kg" ? `₹${product.price}/kg market reference` : `${product.stock} ${product.unit} available`}</p><div className="price-row"><strong>₹{product.price}<small> / {product.unit}</small></strong>{hasDiscount && <span>Buy {product.discount.min}+ → ₹{product.discount.price}</span>}</div>{hasDiscount && <div className="discount-line">Save ₹{product.price - product.discount.price} each on bulk quantity</div>}<div className="card-actions"><button className="add-button" onClick={onAdd}>Add to Cart</button><div className="quick-quantity"><span>{product.unit === "kg" ? `${step} kg` : "1"}</span><button onClick={onAdd}>+</button></div></div></div></article>;
}

export default App;
