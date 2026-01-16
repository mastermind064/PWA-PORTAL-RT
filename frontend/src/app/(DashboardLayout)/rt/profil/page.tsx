"use client";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";

const RtProfilPage = () => {
  return (
    <PageContainer title="Profil RT" description="Informasi dasar RT">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <DashboardCard title="Profil RT">
              <Stack spacing={2}>
                <CustomTextField
                  id="rtName"
                  variant="outlined"
                  fullWidth
                  placeholder="Nama RT"
                />
                <CustomTextField
                  id="rtRw"
                  variant="outlined"
                  fullWidth
                  placeholder="RW"
                />
                <CustomTextField
                  id="rtAddress"
                  variant="outlined"
                  fullWidth
                  placeholder="Alamat RT"
                />
                <Button variant="contained">Simpan perubahan</Button>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardCard title="Status RT">
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Typography variant="h6">ACTIVE</Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  Approval terakhir
                </Typography>
                <Typography variant="body2">2026-01-10</Typography>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default RtProfilPage;
