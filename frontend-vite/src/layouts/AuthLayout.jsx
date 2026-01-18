import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";

const AuthLayout = () => {
  const location = useLocation();
  const isRegister = location.pathname.includes("register");
  const mask = isRegister
    ? "/template/img/illustrations/auth-basic-register-mask-light.png"
    : "/template/img/illustrations/auth-basic-login-mask-light.png";

  const stylesheetLinks = useMemo(
    () => [
      {
        id: "template-fonts",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      },
      { id: "template-core", href: "/template/css/core.css" },
      { id: "template-demo", href: "/template/css/demo.css" },
      { id: "template-auth", href: "/template/css/page-auth.css" }
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

  return (
    <div className="position-relative">
      <div className="authentication-wrapper authentication-basic container-p-y p-4 p-sm-0">
        <div className="authentication-inner py-6">
          <div className="card p-md-7 p-1">
            <div className="app-brand justify-content-center mt-5">
              <a href="/" className="app-brand-link gap-2">
                <span className="app-brand-logo demo">
                  <span className="text-primary">
                    <svg
                      width="32"
                      height="18"
                      viewBox="0 0 38 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M30.0944 2.22569C29.0511 0.444187 26.7508 -0.172113 24.9566 0.849138C23.1623 1.87039 22.5536 4.14247 23.5969 5.92397L30.5368 17.7743C31.5801 19.5558 33.8804 20.1721 35.6746 19.1509C37.4689 18.1296 38.0776 15.8575 37.0343 14.076L30.0944 2.22569Z"
                        fill="currentColor"
                      />
                      <path
                        d="M22.9676 2.22569C24.0109 0.444187 26.3112 -0.172113 28.1054 0.849138C29.8996 1.87039 30.5084 4.14247 29.4651 5.92397L22.5251 17.7743C21.4818 19.5558 19.1816 20.1721 17.3873 19.1509C15.5931 18.1296 14.9843 15.8575 16.0276 14.076L22.9676 2.22569Z"
                        fill="currentColor"
                      />
                      <path
                        d="M14.9558 2.22569C13.9125 0.444187 11.6122 -0.172113 9.818 0.849138C8.02377 1.87039 7.41502 4.14247 8.45833 5.92397L15.3983 17.7743C16.4416 19.5558 18.7418 20.1721 20.5361 19.1509C22.3303 18.1296 22.9391 15.8575 21.8958 14.076L14.9558 2.22569Z"
                        fill="currentColor"
                      />
                      <path
                        d="M7.82901 2.22569C8.87231 0.444187 11.1726 -0.172113 12.9668 0.849138C14.7611 1.87039 15.3698 4.14247 14.3265 5.92397L7.38656 17.7743C6.34325 19.5558 4.04298 20.1721 2.24875 19.1509C0.454514 18.1296 -0.154233 15.8575 0.88907 14.076L7.82901 2.22569Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </span>
                <span className="app-brand-text demo text-heading fw-semibold">
                  Portal RT
                </span>
              </a>
            </div>
            <div className="card-body mt-1">
              <Outlet />
            </div>
          </div>
          <img
            alt="mask"
            src={mask}
            className="authentication-image d-none d-lg-block"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
