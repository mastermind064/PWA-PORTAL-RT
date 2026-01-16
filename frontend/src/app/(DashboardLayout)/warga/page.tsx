"use client";
import Link from "next/link";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const wargaList = [
  {
    id: "1",
    name: "Rudi Hartono",
    phone: "0812-3456-7812",
    status: "PENDING",
    createdAt: "2026-01-10",
  },
  {
    id: "2",
    name: "Sinta Prameswari",
    phone: "0812-7777-1212",
    status: "PENDING",
    createdAt: "2026-01-11",
  },
  {
    id: "3",
    name: "Ahmad Fauzi",
    phone: "0821-9900-1122",
    status: "APPROVED",
    createdAt: "2026-01-09",
  },
];

const statusColor = (status: string) => {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "error";
  return "warning";
};

const WargaPage = () => {
  return (
    <PageContainer title="Pendaftaran Warga" description="Tahap 1">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <DashboardCard title="Filter Status">
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="Semua" color="primary" variant="outlined" />
                <Chip label="PENDING" color="warning" />
                <Chip label="APPROVED" color="success" />
                <Chip label="REJECTED" color="error" />
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DashboardCard
              title="Daftar Warga"
              subtitle="Registrasi dan status verifikasi"
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nama</TableCell>
                    <TableCell>No HP</TableCell>
                    <TableCell>Tanggal</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wargaList.map((warga) => (
                    <TableRow key={warga.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {warga.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{warga.phone}</TableCell>
                      <TableCell>{warga.createdAt}</TableCell>
                      <TableCell>
                        <Chip
                          label={warga.status}
                          color={statusColor(warga.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={Link}
                          href={`/warga/${warga.id}`}
                          variant="outlined"
                          size="small"
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default WargaPage;
