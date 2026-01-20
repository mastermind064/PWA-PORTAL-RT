import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, clearSession } from "../utils/api.js";
import { getCurrentRole, getUserEmail } from "../utils/session.js";

const AppLayout = () => {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const userEmail = getUserEmail();
  const isWarga = role === "WARGA";
  const canManageRt = role === "ADMIN_RT" || role === "BENDAHARA";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const stylesheetLinks = useMemo(
    () => [
      {
        id: "template-fonts",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      },
      { id: "template-core", href: "/template/css/core.css" },
      { id: "template-demo", href: "/template/css/demo.css" }
    ],
    []
  );

  useEffect(() => {
    const added = [];
    stylesheetLinks.forEach((linkData) => {
      if (document.getElementById(linkData.id)) {
        return;
      }
      const link = document.createElement("link");
      link.id = linkData.id;
      link.rel = "stylesheet";
      link.href = linkData.href;
      document.head.appendChild(link);
      added.push(link);
    });

    return () => {
      added.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [stylesheetLinks]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    if (!isWarga) {
      setNotifications([]);
      return;
    }
    let isActive = true;
    const loadNotifications = async () => {
      try {
        const data = await apiRequest("/me/profile", { auth: true });
        const documents = Array.isArray(data.documents) ? data.documents : [];
        const hasKtp = documents.some((doc) => doc.type === "KTP");
        const hasKk = documents.some((doc) => doc.type === "KK");
        const hasFamilyCard = !!(data.familyCard && data.familyCard.address);
        const hasFamilyMembers = Array.isArray(data.familyMembers) && data.familyMembers.length > 0;
        const nextNotifications = [];
        if (!hasKtp || !hasKk || !hasFamilyCard || !hasFamilyMembers) {
          nextNotifications.push({
            id: "profile",
            title: "Lengkapi Profil",
            message: "Lengkapi KK, keluarga, dan dokumen.",
            link: "/profil/lengkapi"
          });
        }
        const billings = await apiRequest("/fees/billings/me?status=UNPAID", {
          auth: true
        });
        (billings || []).slice(0, 5).forEach((billing) => {
          const amount =
            Number(billing.amount || 0) > 0
              ? `Rp ${Number(billing.amount).toLocaleString("id-ID")}`
              : "Nominal seikhlasnya";
          nextNotifications.push({
            id: `billing-${billing.id}`,
            title: billing.campaign_name || "Iuran",
            message: `Tagihan ${amount}.`,
            link: "/fees/billings"
          });
        });
        const rejected = await apiRequest(
          "/fees/payments/me?status=REJECTED&limit=5&page=1",
          { auth: true }
        );
        (rejected.items || []).forEach((payment) => {
          nextNotifications.push({
            id: `billing-reject-${payment.id}`,
            title: payment.campaign_name || "Iuran",
            message: "Pembayaran ditolak. Silakan upload ulang.",
            link: "/fees/billings/history"
          });
        });
        if (isActive) {
          setNotifications(nextNotifications);
        }
      } catch (err) {
        if (isActive) {
          setNotifications([]);
        }
      }
    };
    loadNotifications();
    return () => {
      isActive = false;
    };
  }, [isWarga, refreshTick]);

  useEffect(() => {
    if (!isWarga) return;
    const intervalMs = 30000;
    const timer = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isWarga]);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const displayName = userEmail
    ? userEmail.split("@")[0]
    : "Pengguna";
  const displayRole = role || "GUEST";
  const profilePath = isWarga
    ? "/profil/lengkapi"
    : canManageRt
    ? "/rt/profil"
    : "/";

  return (
    <div
      className={`app-shell ${sidebarOpen ? "sidebar-open" : ""} ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span className="brand-dot" />
            <div>
              <div className="brand-title">Portal RT</div>
              <div className="brand-subtitle">Tahap 2</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-text-secondary rounded-pill sidebar-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <nav className="nav">
          <span className="nav-label">Utama</span>
          <NavLink to="/" end>
            <span className="nav-icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="nav-text">Dashboard</span>
          </NavLink>
          {!isSuperAdmin ? (
            <>
              <span className="nav-label">Warga</span>
              {!isWarga ? (
                <NavLink to="/warga">
                  <span className="nav-text">Daftar Warga</span>
                </NavLink>
              ) : null}
              {isWarga ? (
                <NavLink to="/profil/lengkapi">
                  <span className="nav-text">Lengkapi Profil</span>
                </NavLink>
              ) : null}
            </>
          ) : null}
          {canManageRt ? (
            <>
              <span className="nav-label">RT</span>
              <NavLink to="/rt/profil">
                <span className="nav-text">Profil RT</span>
              </NavLink>
              <NavLink to="/rt/invite-code">
                <span className="nav-text">Kode Undangan</span>
              </NavLink>
            </>
          ) : null}
          {isSuperAdmin ? (
            <>
              <span className="nav-label">Super Admin</span>
              <NavLink to="/superadmin/dashboard">
                <span className="nav-text">Dashboard Superadmin</span>
              </NavLink>
              <NavLink to="/superadmin/approval">
                <span className="nav-text">Approval RT</span>
              </NavLink>
              <NavLink to="/superadmin/wa">
                <span className="nav-text">WhatsApp API</span>
              </NavLink>
            </>
          ) : null}
          <span className="nav-label">Keuangan</span>
          {isWarga ? (
            <>
              <NavLink to="/wallet">
                <span className="nav-text">Wallet Warga</span>
              </NavLink>
              <NavLink to="/fees/billings">
                <span className="nav-text">Tagihan Iuran</span>
              </NavLink>
              <NavLink to="/fees/billings/history" className="nav-submenu">
                <span className="nav-text">History Tagihan Iuran</span>
              </NavLink>
              <NavLink to="/topup">
                <span className="nav-text">Topup Deposit</span>
              </NavLink>
            </>
          ) : null}
          {canManageRt ? (
            <>
              <NavLink to="/topup/approval">
                <span className="nav-text">Approval Topup</span>
              </NavLink>
              <NavLink to="/fees/campaigns">
                <span className="nav-text">Campaign Iuran</span>
              </NavLink>
              <NavLink to="/fees/billings/admin">
                <span className="nav-text">Billing Iuran</span>
              </NavLink>
              <NavLink to="/fees/approval">
                <span className="nav-text">Approval Iuran</span>
              </NavLink>
              <NavLink to="/kas-rt" end>
                <span className="nav-text">Konfigurasi Kas RT</span>
              </NavLink>
              <NavLink to="/kas-rt/dashboard">
                <span className="nav-text">Dashboard Kas RT</span>
              </NavLink>
              <NavLink to="/billing/reminder">
                <span className="nav-text">Reminder Billing</span>
              </NavLink>
            </>
          ) : null}
          <span className="nav-label">Akses</span>
          <button
            type="button"
            className="btn btn-outline-secondary w-100 text-start"
            onClick={handleLogout}
          >
            <span className="nav-text">Keluar</span>
          </button>
        </nav>
      </aside>
      <div className="main">
        <header className="layout-navbar navbar navbar-expand-xl navbar-light bg-navbar-theme topbar">
          <div className="container-fluid d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-icon d-xl-none"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 12H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 18H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="navbar-brand d-flex flex-column">
              <h1 className="page-title mb-0">Portal RT</h1>
            </div>
            <div className="d-flex align-items-center gap-3 ms-auto">
              <div className="dropdown" ref={notifRef}>
                <button
                  type="button"
                  className="btn btn-icon btn-text-secondary rounded-pill position-relative"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-label="Notifikasi"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 17H9m8-4V9a5 5 0 10-10 0v4l-2 2h14l-2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {notifications.length > 0 ? (
                    <>
                      <span className="notification-dot" />
                      <span className="notification-badge">
                        {notifications.length > 9 ? "9+" : notifications.length}
                      </span>
                    </>
                  ) : null}
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-end notification-dropdown ${
                    notifOpen ? "show" : ""
                  }`}
                >
                  <div className="dropdown-header d-flex align-items-center justify-content-between">
                    <span>Notification</span>
                    {notifications.length > 0 ? (
                      <span className="badge bg-primary">{notifications.length} New</span>
                    ) : null}
                  </div>
                  <div className="dropdown-divider" />
                  {notifications.length === 0 ? (
                    <div className="dropdown-item text-muted">Tidak ada notifikasi.</div>
                  ) : (
                    notifications.map((item) => (
                      <NavLink
                        key={item.id}
                        className="dropdown-item"
                        to={item.link}
                        onClick={() => setNotifOpen(false)}
                      >
                        <div className="fw-semibold">{item.title}</div>
                        <small className="text-muted">{item.message}</small>
                      </NavLink>
                    ))
                  )}
                </div>
              </div>
              <div className="dropdown" ref={menuRef}>
                <button
                  type="button"
                  className="btn p-0 dropdown-toggle hide-arrow"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <div className="avatar avatar-sm">
                    <img
                      src="/template/img/avatars/1.png"
                      alt="Avatar"
                      className="rounded-circle"
                    />
                  </div>
                </button>
                <div
                  className={`dropdown-menu dropdown-menu-end user-dropdown-menu ${
                    menuOpen ? "show" : ""
                  }`}
                >
                  <div className="dropdown-item">
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar avatar-sm">
                        <img
                          src="/template/img/avatars/1.png"
                          alt="Avatar"
                          className="rounded-circle"
                        />
                      </div>
                      <div>
                        <div className="fw-semibold">{displayName}</div>
                        <small className="text-muted">{displayRole}</small>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  {isSuperAdmin ? null : (
                    <NavLink className="dropdown-item" to={profilePath}>
                      Profile
                    </NavLink>
                  )}
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>&copy; 2026, made with</span>
          <span className="footer-heart" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
          <span>
            by{" "}
            <a href="https://mastermind.id" target="_blank" rel="noreferrer">
              Mastermind
            </a>
          </span>
        </footer>
      </div>
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default AppLayout;


