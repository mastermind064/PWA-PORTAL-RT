"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  Divider,
  Alert,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import { apiRequest } from "@/utils/api";

type FamilyMember = {
  fullName: string;
  relationship: string;
  birthDate?: string;
  isLivingHere?: boolean;
};

const emptyMember = (): FamilyMember => ({
  fullName: "",
  relationship: "",
  birthDate: "",
  isLivingHere: true,
});

const LengkapiProfilPage = () => {
  const [kkNumber, setKkNumber] = useState("");
  const [kkAddress, setKkAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [ktpUrl, setKtpUrl] = useState("");
  const [kkUrl, setKkUrl] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    emptyMember(),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest("/me/profile", { auth: true });
        if (data.familyCard) {
          setKkNumber(data.familyCard.kkNumber || "");
          setKkAddress(data.familyCard.address || "");
          setNotes(data.familyCard.notes || "");
        }
        if (Array.isArray(data.familyMembers) && data.familyMembers.length > 0) {
          setFamilyMembers(data.familyMembers);
        }
        if (Array.isArray(data.documents)) {
          const ktp = data.documents.find((doc: any) => doc.type === "KTP");
          const kk = data.documents.find((doc: any) => doc.type === "KK");
          setKtpUrl(ktp ? ktp.fileUrl : "");
          setKkUrl(kk ? kk.fileUrl : "");
        }
      } catch (err: any) {
        if (err.message !== "Profil warga tidak ditemukan") {
          setError(err.message || "Gagal memuat profil");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const addMember = () => {
    setFamilyMembers([...familyMembers, emptyMember()]);
  };

  const removeMember = (index: number) => {
    const updated = familyMembers.filter((_, idx) => idx !== index);
    setFamilyMembers(updated.length ? updated : [emptyMember()]);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    const filteredMembers = familyMembers.filter(
      (member) => member.fullName && member.relationship
    );

    if (!kkNumber || !kkAddress || !ktpUrl || !kkUrl || filteredMembers.length === 0) {
      setError("Lengkapi nomor KK, alamat KK, dokumen KTP/KK, dan minimal 1 anggota keluarga.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/me/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          familyCard: {
            kkNumber,
            address: kkAddress,
            notes,
          },
          familyMembers: filteredMembers,
          documents: [
            { type: "KTP", fileUrl: ktpUrl },
            { type: "KK", fileUrl: kkUrl },
          ],
        }),
      });
      setSuccess("Profil berhasil disimpan.");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Lengkapi Profil" description="Data KK, keluarga, dokumen">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <DashboardCard title="Data KK">
              <Stack spacing={2}>
                <CustomTextField
                  id="kkNumber"
                  variant="outlined"
                  fullWidth
                  placeholder="Nomor KK"
                  value={kkNumber}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setKkNumber(event.target.value)
                  }
                />
                <CustomTextField
                  id="kkAddress"
                  variant="outlined"
                  fullWidth
                  placeholder="Alamat KK"
                  value={kkAddress}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setKkAddress(event.target.value)
                  }
                />
                <CustomTextField
                  id="kkNotes"
                  variant="outlined"
                  fullWidth
                  placeholder="Catatan tambahan"
                  value={notes}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNotes(event.target.value)
                  }
                />
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <DashboardCard title="Status">
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status profil
                </Typography>
                <Typography variant="h6">{loading ? "Memuat..." : "Siap diisi"}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Lengkapi data agar verifikasi lebih cepat.
                </Typography>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DashboardCard title="Anggota Keluarga">
              <Stack spacing={2}>
                {familyMembers.map((member, index) => (
                  <Stack key={`${member.fullName}-${index}`} spacing={2}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          variant="outlined"
                          fullWidth
                          placeholder="Nama anggota"
                          value={member.fullName}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateMember(index, "fullName", event.target.value)
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          variant="outlined"
                          fullWidth
                          placeholder="Hubungan"
                          value={member.relationship}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateMember(index, "relationship", event.target.value)
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <CustomTextField
                          variant="outlined"
                          fullWidth
                          placeholder="Tanggal lahir"
                          value={member.birthDate || ""}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateMember(index, "birthDate", event.target.value)
                          }
                        />
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={addMember}>
                        Tambah anggota
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => removeMember(index)}
                      >
                        Hapus
                      </Button>
                    </Stack>
                    <Divider />
                  </Stack>
                ))}
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DashboardCard title="Dokumen">
              <Stack spacing={2}>
                <CustomTextField
                  id="ktpUrl"
                  variant="outlined"
                  fullWidth
                  placeholder="URL dokumen KTP"
                  value={ktpUrl}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setKtpUrl(event.target.value)
                  }
                />
                <CustomTextField
                  id="kkUrl"
                  variant="outlined"
                  fullWidth
                  placeholder="URL dokumen KK"
                  value={kkUrl}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setKkUrl(event.target.value)
                  }
                />
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan profil"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default LengkapiProfilPage;
