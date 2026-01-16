"use client";
import React, { useState } from "react";
import { Box, Typography, Button, Grid, Divider, Stack } from "@mui/material";
import { useRouter } from "next/navigation";

import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import { apiRequest } from "@/utils/api";

interface registerType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/register-warga", {
        method: "POST",
        body: JSON.stringify({
          inviteCode,
          fullName,
          phone,
          address,
          email,
          password,
        }),
      });
      router.push("/authentication/login");
    } catch (err: any) {
      setError(err.message || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box>
        <Stack mb={3} spacing={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Data RT
            </Typography>
            <CustomTextField
              id="inviteCode"
              variant="outlined"
              fullWidth
              placeholder="Kode undangan RT"
              value={inviteCode}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setInviteCode(event.target.value)
              }
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Data Warga
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  id="fullName"
                  variant="outlined"
                  fullWidth
                  placeholder="Nama lengkap"
                  value={fullName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setFullName(event.target.value)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  id="phone"
                  variant="outlined"
                  fullWidth
                  placeholder="No HP"
                  value={phone}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setPhone(event.target.value)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  id="address"
                  variant="outlined"
                  fullWidth
                  placeholder="Alamat domisili"
                  value={address}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setAddress(event.target.value)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  id="email"
                  variant="outlined"
                  fullWidth
                  placeholder="Email"
                  value={email}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(event.target.value)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField
                  id="password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  placeholder="Kata sandi"
                  value={password}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(event.target.value)
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
        {error ? (
          <Typography color="error" variant="body2" mb={2}>
            {error}
          </Typography>
        ) : null}
        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={loading}
        >
          {loading ? "Memproses..." : "Daftar akun"}
        </Button>
      </Box>
      {subtitle}
    </form>
  );
};

export default AuthRegister;
