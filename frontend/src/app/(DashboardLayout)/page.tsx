"use client";
import {
  Grid,
  Box,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const summaryCards = [
  { title: "Registrasi Menunggu", value: 12, color: "warning" },
  { title: "Warga Aktif", value: 248, color: "success" },
  { title: "Dokumen Perlu Verifikasi", value: 6, color: "info" },
  { title: "Notifikasi Tertunda", value: 4, color: "secondary" },
];

const registrations = [
  {
    name: "Rudi Hartono",
    phone: "0812-3456-7812",
    status: "PENDING",
    createdAt: "2026-01-10",
  },
  {
    name: "Sinta Prameswari",
    phone: "0812-7777-1212",
    status: "PENDING",
    createdAt: "2026-01-11",
  },
  {
    name: "Ahmad Fauzi",
    phone: "0821-9900-1122",
    status: "PENDING",
    createdAt: "2026-01-12",
  },
];

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="Ringkasan Portal RT">
      <Box>
        <Grid container spacing={3}>
          {summaryCards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, md: 6, lg: 3 }}>
              <DashboardCard>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {card.title}
                  </Typography>
                  <Typography variant="h4">{card.value}</Typography>
                </Stack>
              </DashboardCard>
            </Grid>
          ))}

          <Grid size={{ xs: 12, lg: 8 }}>
            <DashboardCard title="Pendaftaran Terbaru" subtitle="Tahap 1">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nama</TableCell>
                    <TableCell>No HP</TableCell>
                    <TableCell>Tanggal</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>
                        <Chip label={item.status} color="warning" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardCard title="Checklist Tahap 1">
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Registrasi warga</Typography>
                  <Chip label="Siap" color="success" size="small" />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Approval admin RT</Typography>
                  <Chip label="Siap" color="success" size="small" />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Dokumen KTP/KK</Typography>
                  <Chip label="Perlu upload" color="warning" size="small" />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Notifikasi WA</Typography>
                  <Chip label="Outbox" color="info" size="small" />
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
