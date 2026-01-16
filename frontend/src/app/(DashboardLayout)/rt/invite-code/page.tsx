"use client";
import { Box, Grid, Stack, Typography, Button, Chip } from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

const InviteCodePage = () => {
  return (
    <PageContainer title="Kode Undangan" description="Invite code untuk warga">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <DashboardCard title="Kode Aktif">
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  Kode undangan
                </Typography>
                <Chip label="RT006-AB12" color="primary" sx={{ width: "fit-content" }} />
                <Typography variant="caption" color="textSecondary">
                  Bagikan kode ini ke warga untuk registrasi.
                </Typography>
                <Button variant="contained">Generate kode baru</Button>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <DashboardCard title="Panduan Singkat">
              <Stack spacing={2}>
                <Typography variant="body2">
                  1. Warga membuka halaman registrasi.
                </Typography>
                <Typography variant="body2">
                  2. Masukkan kode undangan RT.
                </Typography>
                <Typography variant="body2">
                  3. Admin RT melakukan approval.
                </Typography>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default InviteCodePage;
