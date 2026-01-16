import {
  IconLayoutDashboard,
  IconLogin,
  IconUserPlus,
  IconUsers,
  IconUserCheck,
  IconHome,
  IconKey,
  IconIdBadge
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "UTAMA",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
    navlabel: true,
    subheader: "WARGA",
  },
  {
    id: uniqueId(),
    title: "Pendaftaran Warga",
    icon: IconUserCheck,
    href: "/warga",
  },
  {
    id: uniqueId(),
    title: "Lengkapi Profil",
    icon: IconIdBadge,
    href: "/profil/lengkapi",
  },
  {
    id: uniqueId(),
    title: "Data Warga",
    icon: IconUsers,
    href: "/warga?status=APPROVED",
  },
  {
    navlabel: true,
    subheader: "RT",
  },
  {
    id: uniqueId(),
    title: "Profil RT",
    icon: IconHome,
    href: "/rt/profil",
  },
  {
    id: uniqueId(),
    title: "Kode Undangan",
    icon: IconKey,
    href: "/rt/invite-code",
  },
  {
    navlabel: true,
    subheader: "AKSES",
  },
  {
    id: uniqueId(),
    title: "Login",
    icon: IconLogin,
    href: "/authentication/login",
  },
  {
    id: uniqueId(),
    title: "Registrasi Warga",
    icon: IconUserPlus,
    href: "/authentication/register",
  },

];

export default Menuitems;


