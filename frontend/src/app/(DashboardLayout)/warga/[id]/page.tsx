"use client";
import Link from "next/link";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const WargaDetailPage = () => {
  return (
    <PageContainer title="Detail Warga" description="Verifikasi data warga">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <DashboardCard title="Data Warga">
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Nama</Typography>
                  <Typography variant="subtitle1">Rudi Hartono</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">No HP</Typography>
                  <Typography variant="subtitle1">0812-3456-7812</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Alamat</Typography>
                  <Typography variant="subtitle1">
                    Jl. Kenanga No. 7, Depok
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip label="PENDING" color="warning" />
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardCard title="Aksi Verifikasi">
              <Stack spacing={2}>
                <Button variant="contained" color="success">
                  Approve
                </Button>
                <Button variant="outlined" color="error">
                  Reject
                </Button>
                <Button component={Link} href="/warga" variant="text">
                  Kembali ke daftar
                </Button>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <DashboardCard title="Data KK">
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Nomor KK</Typography>
                  <Typography variant="subtitle1">3173-0012-9988</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">Alamat KK</Typography>
                  <Typography variant="subtitle1">
                    Jl. Kenanga No. 7, Depok
                  </Typography>
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <DashboardCard title="Dokumen">
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">KTP</Typography>
                  <Button variant="outlined" size="small">
                    Lihat dokumen
                  </Button>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">KK</Typography>
                  <Button variant="outlined" size="small">
                    Lihat dokumen
                  </Button>
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DashboardCard title="Anggota Keluarga">
              <Stack spacing={2} divider={<Divider flexItem />}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Sri Hartono</Typography>
                  <Typography variant="subtitle2">Istri</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Dika Hartono</Typography>
                  <Typography variant="subtitle2">Anak</Typography>
                </Stack>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default WargaDetailPage;
